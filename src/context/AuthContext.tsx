import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type Role = 'customer' | 'coordinator' | 'supervisor' | 'ceo' | 'commercial' | 'finance' | 'admin' | null;

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  company_name?: string;
  role: Role;
  is_first_login: boolean;
  username?: string;
}

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  isLoading: boolean;
  role: Role;
  sendCustomerOtp: (mobile: string) => Promise<string>;
  verifyCustomerOtp: (mobile: string, code: string) => Promise<void>;
  personnelLogin: (username: string, password: string) => Promise<{ isFirstLogin: boolean }>;
  completePersonnelFirstLogin: (username: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatForSupabaseAuth(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('09') && digits.length === 11) return '+98' + digits.slice(1);
  if (digits.startsWith('98') && digits.length === 12) return '+' + digits;
  if (digits.startsWith('098') && digits.length === 13) return '+' + digits.slice(1);
  if (digits.startsWith('+98') && digits.length === 13) return digits;
  if (digits.length === 10) return '+98' + digits;
  return '+' + digits;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string, phone: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) {
        setIsLoading(false);
        return;
      }
      if (data) {
        setProfile(data as UserProfile);
      } else {
        const { data: newProfile } = await supabase.from('profiles').insert({
          id: userId, phone: phone, role: 'customer', is_first_login: false
        }).select().single();
        if (newProfile) {
          setProfile(newProfile as UserProfile);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedPersonnel = localStorage.getItem('fixiz_personnel_session');
    if (savedPersonnel) {
      const parsedData = JSON.parse(savedPersonnel);
      setSession({ user: { id: parsedData.id } });
      setProfile(parsedData);
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone || '');
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('fixiz_personnel_session')) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone || '');
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendCustomerOtp = useCallback(async (mobile: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedMobile });
    if (error) throw new Error(error.message || 'خطا در ارسال کد');
    return "SENT"; 
  }, []);
  
  const verifyCustomerOtp = useCallback(async (mobile: string, code: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    const { data, error } = await supabase.auth.verifyOtp({ phone: formattedMobile, token: code, type: 'sms' });
    if (error) throw new Error(error.message || 'کد وارد شده نامعتبر است');
    if (!data.session) throw new Error('نشست ایجاد نشد');
  }, []);

  const personnelLogin = async (username: string, password: string) => {
    const cleanUsername = username.toLowerCase().trim();
    
    // بررسی ادمین اصلی
    if (cleanUsername === 'admin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email: 'admin@fixiz.ir', password });
      if (error) throw new Error('نام کاربری یا رمز عبور اشتباه است');
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (pData) {
        setProfile(pData as UserProfile);
      }
      return { isFirstLogin: false };
    }

    // سایر پرسنل سازمانی
    const { data: pUser, error } = await supabase
      .from('personnel_users')
      .select('*')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (error || !pUser) throw new Error('نام کاربری یا رمز عبور اشتباه است');
    if (pUser.password !== password) throw new Error('نام کاربری یا رمز عبور اشتباه است');

    if (!pUser.is_first_login) {
      const userData = { ...pUser, id: pUser.id };
      localStorage.setItem('fixiz_personnel_session', JSON.stringify(userData));
      setProfile(userData);
      setSession({ user: { id: pUser.id } });
    }

    return { isFirstLogin: pUser.is_first_login };
  };

  const completePersonnelFirstLogin = async (username: string, newPassword: string) => {
    const cleanUsername = username.toLowerCase().trim();
    const { data: pUser, error } = await supabase
      .from('personnel_users')
      .update({ password: newPassword, is_first_login: false })
      .eq('username', cleanUsername)
      .select()
      .single();

    if (error || !pUser) throw new Error('خطا در تغییر رمز عبور');

    const userData = { ...pUser, id: pUser.id };
    localStorage.setItem('fixiz_personnel_session', JSON.stringify(userData));
    setProfile(userData);
    setSession({ user: { id: pUser.id } });
  };

  const logout = useCallback(async () => {
    localStorage.removeItem('fixiz_personnel_session');
    await supabase.auth.signOut();
    setSession(null); 
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, role: profile?.role || null, sendCustomerOtp, verifyCustomerOtp, personnelLogin, completePersonnelFirstLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};