import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sendOtpSMS } from '../lib/notifications';

export type Role = 'customer' | 'coordinator' | 'supervisor' | 'ceo' | 'commercial' | 'finance' | 'admin' | 'monitoring' | 'monitoring_manager' | null;

export interface UserProfile {
  id: string;
  phone: string;
  full_name?: string;
  company_name?: string;
  email?: string;
  role: Role;
  is_first_login: boolean;
  username?: string;
}

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  isLoading: boolean;
  role: Role;
  sendCustomerOtp: (mobile: string, code: string) => Promise<string>;
  verifyCustomerOtp: (mobile: string) => Promise<void>;
  personnelLogin: (username: string, password: string) => Promise<{ isFirstLogin: boolean, role: string, phone?: string }>;
  completePersonnelFirstLogin: (username: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        fetchProfile(session.user.id, session.user.phone || session.user.email?.split('@')[0] || '');
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('fixiz_personnel_session')) return;
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.phone || session.user.email?.split('@')[0] || '');
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendCustomerOtp = useCallback(async (mobile: string, code: string) => {
    await sendOtpSMS(mobile, code);
    return "SENT"; 
  }, []);
  
  const verifyCustomerOtp = useCallback(async (mobile: string) => {
    const dummyEmail = `${mobile}@fixiz.ir`;
    const dummyPassword = `FixizUser#${mobile}`;

    let { data, error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: dummyPassword,
    });

    if (error && error.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: dummyPassword,
      });
      if (signUpError) throw new Error('خطا در ساخت حساب کاربری: ' + signUpError.message);
      data = signUpData;
    } else if (error) {
      throw new Error(error.message);
    }

    if (data?.user) {
      await fetchProfile(data.user.id, mobile);
    } else {
      throw new Error('نشست ایجاد نشد. بررسی کنید Confirm Email در سوپابیس خاموش باشد.');
    }
  }, []);

 const personnelLogin = async (username: string, password: string) => {
    const cleanUsername = username.toLowerCase().trim();
    
    // جستجوی یکپارچه تمام پرسنل (از جمله ادمین) در جدول personnel_users
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

    return { isFirstLogin: pUser.is_first_login, role: pUser.role, phone: pUser.phone };
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