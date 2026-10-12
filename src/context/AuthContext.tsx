import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'fixiz_user_session';
const OTP_EXPIRY_MINUTES = 5;

// تعریف ۷ نقش دقیق پروژه
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
  sendOtp: (mobile: string) => Promise<string | undefined>;
  verifyOtp: (mobile: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// تابع استانداردسازی شماره موبایل
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

  // واکشی پروفایل کاربر از دیتابیس برای تعیین نقش
  const fetchProfile = async (userId: string, phone: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    
    if (data) {
      setProfile(data as UserProfile);
    } else {
      // اگر کاربر جدید (مشتری) است، پروفایلش را بساز
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: userId,
        phone: phone,
        role: 'customer',
        is_first_login: false
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

  // ارسال OTP برای مشتریان
  const sendOtp = useCallback(async (mobile: string): Promise<string | undefined> => {
    const formattedMobile = formatForSupabaseAuth(mobile);
    const code = Math.floor(1000 + Math.random() * 9000).toString(); // برای تست سریع. در حالت پروداکشن به کاوه‌نگار متصل می‌شود
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await supabase.from('otp_sessions').delete().eq('phone', formattedMobile);
    await supabase.from('otp_sessions').insert({ phone: formattedMobile, otp_code: code, expires_at: expiresAt.toISOString() });

    console.log(`کد تست برای ${formattedMobile} : ${code}`); // موقتا برای تست در کنسول نمایش داده می‌شود
    return code;
  }, []);
  
  // تایید OTP
  const verifyOtp = useCallback(async (mobile: string, code: string): Promise<void> => {
    const formattedMobile = formatForSupabaseAuth(mobile);

    const { data, error } = await supabase
      .from('otp_sessions')
      .select('*')
      .eq('phone', formattedMobile)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) throw new Error('کد تایید منقضی شده یا نامعتبر است');
    
    const latestOtp = data[0];
    if (latestOtp.otp_code !== code) throw new Error('کد تایید وارد شده اشتباه است');
    if (new Date(latestOtp.expires_at) < new Date()) throw new Error('کد تایید منقضی شده است');

    await supabase.from('otp_sessions').delete().eq('id', latestOtp.id);
    
    // لاگین در سوپابیس (در اینجا به جای رمز عبور، شماره موبایل با یک رمز پیش‌فرض هش شده ذخیره می‌شود تا کاربر بسازد)
    // برای پرسنل در مراحل بعدی متد ورود با نام کاربری را اضافه می‌کنیم
    const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: formattedMobile,
        password: `FxZ@${formattedMobile}` // یک رمز مجازی برای مشتریان که فقط با پیامک وارد می‌شوند
    });

    if (signInError) {
        // اگر کاربر وجود نداشت ثبت نامش می‌کنیم
        await supabase.auth.signUp({
            phone: formattedMobile,
            password: `FxZ@${formattedMobile}`
        });
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, role: profile?.role || null, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};