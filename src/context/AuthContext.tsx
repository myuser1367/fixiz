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
        console.error("Error fetching profile:", error);
        return;
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // ساخت پروفایل جدید اگر وجود نداشت
        const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
          id: userId, 
          phone: phone, 
          role: 'customer', 
          is_first_login: false
        }).select().single();
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          return;
        }
        setProfile(newProfile as UserProfile);
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err);
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

  // ---------------- توابع مشتری (با استفاده از OTP استاندارد Supabase) ----------------
  const sendCustomerOtp = useCallback(async (mobile: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedMobile,
    });

    if (error) {
      console.error("OTP Send Error:", error);
      throw new Error(error.message || 'خطا در ارسال کد. لطفاً دوباره تلاش کنید.');
    }
    
    return "SENT"; 
  }, []);
  
  const verifyCustomerOtp = useCallback(async (mobile: string, code: string) => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedMobile,
      token: code,
      type: 'sms',
    });

    if (error) {
      console.error("OTP Verify Error:", error);
      throw new Error(error.message || 'کد وارد شده نامعتبر است');
    }
    
    if (!data.session) {
      throw new Error('نشست ایجاد نشد. لطفاً دوباره تلاش کنید.');
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
    }

    setProfile(pData as UserProfile);
    return pData as UserProfile;
  };

  const sendPersonnelOtp = async () => {
    throw new Error('این بخش در حال توسعه است');
  };

  const completePersonnelFirstLogin = async (_code: string, _newPassword: string) => {
    throw new Error('این بخش در حال توسعه است');
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null); 
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      isLoading, 
      role: profile?.role || null, 
      sendCustomerOtp, 
      verifyCustomerOtp, 
      personnelLogin, 
      sendPersonnelOtp, 
      completePersonnelFirstLogin, 
      logout 
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