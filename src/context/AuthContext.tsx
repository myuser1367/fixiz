import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const OTP_EXPIRY_MINUTES = 5;
export type Role = 'customer' | 'coordinator' | 'supervisor' | 'ceo' | 'commercial' | 'finance' | 'admin' | null;

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  role: Role;
  is_first_login: boolean;
}

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  isLoading: boolean;
  role: Role;
  // توابع مشتری
  sendCustomerOtp: (mobile: string) => Promise<string>;
  verifyCustomerOtp: (mobile: string, code: string) => Promise<void>;
  // توابع پرسنل
  personnelLogin: (username: string, password: string) => Promise<UserProfile>;
  sendPersonnelOtp: () => Promise<string>;
  completePersonnelFirstLogin: (code: string, newPassword: string) => Promise<void>;
  // خروج
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatForSupabaseAuth(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) return '98' + digits.slice(1);
  if (digits.startsWith('98') && digits.length === 12) return digits;
  if (digits.startsWith('098') && digits.length === 13) return '98' + digits.slice(3);
  return digits;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, phone: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data as UserProfile);
    } else {
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: userId, phone: phone, role: 'customer', is_first_login: false
      }).select().single();
      setProfile(newProfile as UserProfile);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone || '');
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone || '').finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ---------------- توابع مشتری ----------------
  const sendCustomerOtp = useCallback(async (mobile: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await supabase.from('otp_sessions').delete().eq('phone', formattedMobile);
    await supabase.from('otp_sessions').insert({ phone: formattedMobile, otp_code: code, expires_at: expiresAt.toISOString() });
    return code;
  }, []);
  
  const verifyCustomerOtp = useCallback(async (mobile: string, code: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    const { data, error } = await supabase.from('otp_sessions').select('*').eq('phone', formattedMobile).order('created_at', { ascending: false });

    if (error || !data || data.length === 0) throw new Error('کد تایید نامعتبر است');
    if (data[0].otp_code !== code) throw new Error('کد تایید اشتباه است');
    if (new Date(data[0].expires_at) < new Date()) throw new Error('کد منقضی شده است');

    await supabase.from('otp_sessions').delete().eq('id', data[0].id);
    
    const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: formattedMobile, password: `FxZ@${formattedMobile}` 
    });
    if (signInError) {
        await supabase.auth.signUp({ phone: formattedMobile, password: `FxZ@${formattedMobile}` });
    }
  }, []);

  // ---------------- توابع پرسنل ----------------
  const personnelLogin = async (username: string, password: string) => {
    const email = `${username.toLowerCase().trim()}@fixiz.ir`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('نام کاربری یا رمز عبور اشتباه است');

    let { data: pData } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    
    if (!pData) {
      const { data: newP } = await supabase.from('profiles').insert({
        id: data.user.id,
        phone: '09123456789',
        role: username.toLowerCase().trim() === 'admin' ? 'admin' : 'coordinator',
        is_first_login: false
      }).select().single();
      pData = newP;
    } else if (username.toLowerCase().trim() === 'admin' && pData.role !== 'admin') {
      await supabase.from('profiles').update({ role: 'admin', is_first_login: false }).eq('id', data.user.id);
      pData.role = 'admin';
      pData.is_first_login = false;
    }

    setProfile(pData as UserProfile);
    return pData as UserProfile;
  };

  const sendPersonnelOtp = async () => {
    if (!profile?.phone) throw new Error('شماره موبایلی برای شما ثبت نشده است');
    const formattedMobile = formatForSupabaseAuth(profile.phone);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await supabase.from('otp_sessions').delete().eq('phone', formattedMobile);
    await supabase.from('otp_sessions').insert({ phone: formattedMobile, otp_code: code, expires_at: expiresAt.toISOString() });
    return code;
  };

  const completePersonnelFirstLogin = async (code: string, newPassword: string) => {
    if (!profile) throw new Error('پروفایل یافت نشد');
    const formattedMobile = formatForSupabaseAuth(profile.phone);
    
    const { data, error } = await supabase.from('otp_sessions').select('*').eq('phone', formattedMobile).order('created_at', { ascending: false });
    if (error || !data || data.length === 0) throw new Error('کد تایید نامعتبر است');
    if (data[0].otp_code !== code) throw new Error('کد تایید اشتباه است');
    
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
    if (authErr) throw new Error('خطا در ذخیره رمز عبور جدید');

    await supabase.from('profiles').update({ is_first_login: false }).eq('id', profile.id);
    await supabase.from('otp_sessions').delete().eq('id', data[0].id);
    
    setProfile({ ...profile, is_first_login: false });
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null); setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      session, profile, isLoading, role: profile?.role || null, 
      sendCustomerOtp, verifyCustomerOtp, 
      personnelLogin, sendPersonnelOtp, completePersonnelFirstLogin, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};