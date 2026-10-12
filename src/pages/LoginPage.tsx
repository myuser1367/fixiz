import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, Activity, User, Lock, ArrowLeft, ShieldCheck, LogIn, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'customer' | 'personnel'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // کنترل نمایش رمز عبور
  
  const [custPhone, setCustPhone] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [custStep, setCustStep] = useState<'phone' | 'otp'>('phone');
  
  const [persUsername, setPersUsername] = useState('');
  const [persPassword, setPersPassword] = useState('');
  const [persStep, setPersStep] = useState<'login' | 'first_login'>('login');
  
  const [persOtp, setPersOtp] = useState('');
  const [persNewPassword, setPersNewPassword] = useState('');
  
  const { session, profile, sendCustomerOtp, verifyCustomerOtp, personnelLogin, sendPersonnelOtp, completePersonnelFirstLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session && profile) {
      if (profile.is_first_login && profile.role !== 'customer') {
        setActiveTab('personnel');
        setPersStep('first_login');
      } else if (!profile.is_first_login) {
        navigate('/panel');
      }
    }
  }, [session, profile, navigate]);

  const handleCustSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custPhone.length < 10) return toast.error('شماره موبایل معتبر نیست');
    setIsLoading(true);
    try {
      const code = await sendCustomerOtp(custPhone);
      setCustStep('otp');
      toast.success(`کد تست مشتری: ${code}`, { duration: 6000 });
    } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
  };

  const handleCustVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custOtp.length < 4) return toast.error('کد را کامل وارد کنید');
    setIsLoading(true);
    try {
      await verifyCustomerOtp(custPhone, custOtp);
      toast.success('ورود موفقیت‌آمیز');
      navigate('/panel');
    } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
  };

  const handlePersLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persUsername || !persPassword) return toast.error('نام کاربری و رمز عبور الزامی است');
    setIsLoading(true);
    try {
      const pData = await personnelLogin(persUsername, persPassword);
      if (pData.is_first_login) {
        setPersStep('first_login');
        const code = await sendPersonnelOtp();
        toast.success(`کد تست پرسنل: ${code}`, { duration: 6000 });
      } else {
        toast.success('ورود موفقیت‌آمیز');
        navigate('/panel');
      }
    } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
  };

  const handlePersFirstLoginComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persOtp.length < 4) return toast.error('کد تایید را وارد کنید');
    if (persNewPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsLoading(true);
    try {
      await completePersonnelFirstLogin(persOtp, persNewPassword);
      toast.success('رمز عبور با موفقیت تغییر کرد. در حال ورود...');
      navigate('/panel');
    } catch (error: any) { toast.error(error.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-brand-dark relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans overflow-hidden" dir="rtl">
      
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[32px] sm:px-10 relative border border-slate-100">
          
          <button onClick={() => navigate('/')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={24} />
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
              <LogIn className="text-white h-8 w-8 ml-1" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">ورود / ثبت‌نام</h2>
            <p className="text-sm text-slate-500 font-medium">
              {activeTab === 'customer' && custStep === 'phone' && 'شماره موبایل خود را وارد کنید'}
              {activeTab === 'customer' && custStep === 'otp' && 'کد پیامک شده را وارد کنید'}
              {activeTab === 'personnel' && persStep === 'login' && 'اطلاعات کاربری خود را وارد کنید'}
              {activeTab === 'personnel' && persStep === 'first_login' && 'کد تایید و رمز جدید را وارد کنید'}
            </p>
          </div>

          {persStep === 'login' && (
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8">
              <button onClick={() => { setActiveTab('customer'); setCustStep('phone'); }} className={`flex-1 py-2 text-center font-bold text-sm rounded-lg transition-all ${activeTab === 'customer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>مشتریان</button>
              <button onClick={() => setActiveTab('personnel')} className={`flex-1 py-2 text-center font-bold text-sm rounded-lg transition-all ${activeTab === 'personnel' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>پرسنل سازمان</button>
            </div>
          )}

          {activeTab === 'customer' && persStep === 'login' && (
            custStep === 'phone' ? (
              <form onSubmit={handleCustSendOtp} className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-slate-400" /></div>
                  <input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left font-bold text-lg transition-all" placeholder="09123456789" dir="ltr" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-4 px-4 text-white bg-slate-500 rounded-xl hover:bg-slate-600 font-bold flex justify-center items-center gap-2 transition-all">
                  {isLoading ? 'درحال ارسال...' : 'ارسال کد تایید'} {!isLoading && <ArrowLeft size={20} />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCustVerify} className="space-y-6">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-slate-400" /></div>
                  <input type="text" maxLength={4} value={custOtp} onChange={(e) => setCustOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-center tracking-widest text-3xl font-bold transition-all" dir="ltr" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-4 px-4 text-white bg-brand-primary rounded-xl hover:bg-brand-600 font-bold flex justify-center items-center gap-2 transition-all">
                  {isLoading ? 'درحال بررسی...' : 'ورود به سامانه'} {!isLoading && <ArrowLeft size={20} />}
                </button>
                <button type="button" onClick={() => setCustStep('phone')} className="w-full text-sm font-medium text-slate-500 hover:text-slate-800 mt-2">اصلاح شماره موبایل</button>
              </form>
            )
          )}

          {activeTab === 'personnel' && (
            persStep === 'login' ? (
              <form onSubmit={handlePersLogin} className="space-y-5">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                  <input type="text" value={persUsername} onChange={(e) => setPersUsername(e.target.value)} placeholder="نام کاربری" className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left font-medium transition-all" dir="ltr" />
                </div>
                
                {/* کادر رمز عبور همراه با دکمه نمایش/مخفی کردن (آیکون چشم) */}
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={persPassword} 
                    onChange={(e) => setPersPassword(e.target.value)} 
                    placeholder="رمز عبور" 
                    className="w-full pr-12 pl-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left transition-all" 
                    dir="ltr" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-4 px-4 text-white bg-slate-800 rounded-xl hover:bg-slate-900 font-bold flex justify-center items-center gap-2 transition-all mt-2">
                  {isLoading ? 'در حال بررسی...' : 'ورود به پنل'} {!isLoading && <ArrowLeft size={20} />}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePersFirstLoginComplete} className="space-y-5">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-2 flex">
                  <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
                  <p className="mr-3 text-xs leading-relaxed text-amber-800 font-medium">
                    اولین ورود سیستم! لطفاً کد تایید پیامک شده به موبایل خود را وارد کرده و رمز عبور جدیدی تعیین کنید.
                  </p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-slate-400" /></div>
                  <input type="text" maxLength={4} value={persOtp} onChange={(e) => setPersOtp(e.target.value)} placeholder="کد پیامک شده" className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-center tracking-widest text-2xl font-bold" dir="ltr" />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={persNewPassword} 
                    onChange={(e) => setPersNewPassword(e.target.value)} 
                    placeholder="رمز عبور جدید (حداقل ۶ حرف)" 
                    className="w-full pr-12 pl-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left" 
                    dir="ltr" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-4 px-4 text-white bg-brand-primary rounded-xl hover:bg-brand-600 font-bold flex justify-center items-center mt-2">
                  {isLoading ? 'درحال ثبت...' : 'تایید و تغییر رمز'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}