import { useState } from 'react';
//import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { ShieldCheck, Phone, Activity, User, Lock, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  //const navigate = useNavigate();
  const { session, profile, sendCustomerOtp, verifyCustomerOtp, personnelLogin, completePersonnelFirstLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<'customer' | 'personnel'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [custPhone, setCustPhone] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [custStep, setCustStep] = useState<'phone' | 'otp'>('phone');
  
  const [persUsername, setPersUsername] = useState('');
  const [persPassword, setPersPassword] = useState('');
  const [persStep, setPersStep] = useState<'login' | 'otp' | 'first_login'>('login');
  const [persOtp, setPersOtp] = useState('');
  const [persNewPassword, setPersNewPassword] = useState('');

  const handleCustSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custPhone.length < 10) return toast.error('شماره موبایل معتبر نیست');
    setIsLoading(true);
    try {
      await sendCustomerOtp(custPhone);
      setCustStep('otp');
      toast.success('کد تایید ارسال شد (کد تستی: 123456)', { duration: 6000 });
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { setIsLoading(false); }
  };

  const handleCustVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custOtp.length < 4) return toast.error('کد را کامل وارد کنید');
    setIsLoading(true);
    try {
      await verifyCustomerOtp(custPhone, custOtp);
      toast.success('ورود موفقیت‌آمیز');
      window.location.href = '/panel';
    } catch (error: any) { 
      toast.error(error.message); 
      setIsLoading(false);
    }
  };

  const handlePersLoginStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persUsername || !persPassword) return toast.error('نام کاربری و رمز عبور الزامی است');
    setIsLoading(true);
    try {
      const { isFirstLogin } = await personnelLogin(persUsername, persPassword);
      
      if (isFirstLogin) {
        setPersStep('first_login');
        toast.success('رمز پیش‌فرض تایید شد. کد تایید و رمز عبور جدید را وارد کنید (کد تستی: 123456)', { duration: 6000 });
      } else {
        setPersStep('otp');
        toast.success('کد تایید ارسال شد (کد تستی: 123456)', { duration: 6000 });
      }
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handlePersVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persOtp !== '123456') return toast.error('کد تایید اشتباه است (کد تستی 123456 می‌باشد)');
    
    setIsLoading(true);
    try {
      toast.success('ورود شما تایید شد');
      window.location.href = '/panel';
    } catch (error: any) { 
      toast.error('خطا در ورود به پنل'); 
      setIsLoading(false);
    } 
  };

  const handlePersFirstLoginComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persOtp !== '123456') return toast.error('کد تایید اشتباه است (کد تستی 123456 می‌باشد)');
    if (persNewPassword.length < 6) return toast.error('رمز عبور جدید باید حداقل ۶ کاراکتر باشد');
    if (persNewPassword === 'Aa@123456') return toast.error('رمز عبور جدید نباید مشابه رمز پیش‌فرض باشد');
    
    setIsLoading(true);
    try {
      await completePersonnelFirstLogin(persUsername, persNewPassword);
      toast.success('رمز عبور با موفقیت تغییر کرد و وارد شدید');
      window.location.href = '/panel';
    } catch (error: any) { 
      toast.error(error.message || 'خطا در ثبت اطلاعات'); 
      setIsLoading(false);
    } 
  };

  const handleCancelPersonnelOtp = () => {
    setPersStep('login');
    setPersOtp('');
    setPersNewPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <Header />

      <main className="relative bg-brand-dark overflow-hidden min-h-[calc(100vh-80px)] flex flex-col items-center lg:items-start justify-center lg:justify-start pt-12 lg:pt-24 pb-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 relative top-[1px]">
            <path d="M0 120L1440 120V0C1440 0 1140 100 720 100C300 100 0 0 0 0V120Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col lg:flex-row items-start justify-between gap-12">
          
          <div className="text-center lg:text-right flex-1 animate-slide-up mt-8 lg:mt-16">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              سامانه جامع <span className="text-brand-light text-gradient block mt-2">مدیریت تعمیرات</span>
            </h1>
            {/* اگر کاربر لاگین کرده باشد، دکمه میانبر برای رفتن به پنل را نشان می‌دهیم */}
            {session && profile && (
              <div className="mt-6">
                <button 
                  onClick={() => window.location.href = '/panel'} 
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all inline-flex items-center gap-2"
                >
                  ورود به پنل کاربری <ArrowLeft size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 border border-slate-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 mb-2">ورود به سامانه</h2>
              <p className="text-sm text-slate-500 font-medium">
                {activeTab === 'customer' && custStep === 'phone' && 'شماره موبایل خود را وارد کنید'}
                {activeTab === 'customer' && custStep === 'otp' && 'کد پیامک شده را وارد کنید'}
                {activeTab === 'personnel' && persStep === 'login' && 'اطلاعات حساب سازمانی خود را وارد کنید'}
                {activeTab === 'personnel' && persStep === 'otp' && 'کد پیامک شده را وارد کنید'}
                {activeTab === 'personnel' && persStep === 'first_login' && 'اولین ورود! رمز عبور جدید را تعیین کنید'}
              </p>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
              <button type="button" onClick={() => { setActiveTab('customer'); setCustStep('phone'); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'customer' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>مشتریان</button>
              <button type="button" onClick={() => setActiveTab('personnel')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'personnel' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>پرسنل سازمان</button>
            </div>

            {activeTab === 'customer' && (
              custStep === 'phone' ? (
                <form onSubmit={handleCustSendOtp} className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="tel" required value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left font-mono font-bold text-lg transition-all" placeholder="09123456789" dir="ltr" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ارسال کد تایید'} {!isLoading && <ArrowLeft size={18} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCustVerify} className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Activity className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="text" required autoFocus maxLength={6} value={custOtp} onChange={(e) => setCustOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-center tracking-widest text-3xl font-mono font-bold transition-all" placeholder="123456" dir="ltr" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ورود به سامانه'} {!isLoading && <ArrowLeft size={18} />}
                  </button>
                  <button type="button" onClick={() => setCustStep('phone')} className="w-full text-center text-xs text-slate-500 hover:text-brand-primary mt-2 font-bold transition-colors">
                    اصلاح شماره موبایل
                  </button>
                </form>
              )
            )}

            {activeTab === 'personnel' && (
              persStep === 'login' ? (
                <form onSubmit={handlePersLoginStart} className="space-y-5">
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="text" required value={persUsername} onChange={(e) => setPersUsername(e.target.value)} placeholder="نام کاربری" className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left transition-all" dir="ltr" />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type={showPassword ? "text" : "password"} required value={persPassword} onChange={(e) => setPersPassword(e.target.value)} placeholder="رمز عبور" className="w-full pr-12 pl-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left transition-all" dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'بررسی و دریافت پیامک'} {!isLoading && <ArrowLeft size={18} />}
                  </button>
                </form>
              ) : persStep === 'otp' ? (
                <form onSubmit={handlePersVerifyOtp} className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Activity className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="text" required autoFocus maxLength={6} value={persOtp} onChange={(e) => setPersOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-center tracking-widest text-3xl font-mono font-bold transition-all" placeholder="123456" dir="ltr" />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ورود به سامانه'} {!isLoading && <ArrowLeft size={18} />}
                  </button>
                  <button type="button" onClick={handleCancelPersonnelOtp} className="w-full text-center text-xs text-slate-500 hover:text-brand-primary mt-2 font-bold transition-colors">
                    اصلاح نام کاربری و رمز عبور
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePersFirstLoginComplete} className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-2 flex">
                    <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
                    <p className="mr-3 text-xs leading-relaxed text-amber-800 font-medium">اولین ورود سیستم! لطفاً کد پیامکی و رمز عبور جدید را تعیین کنید.</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Activity className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type="text" required autoFocus maxLength={6} value={persOtp} onChange={(e) => setPersOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-center tracking-widest text-2xl font-mono font-bold" placeholder="کد تایید پیامکی (123456)" dir="ltr" />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input type={showPassword ? "text" : "password"} required value={persNewPassword} onChange={(e) => setPersNewPassword(e.target.value)} placeholder="رمز عبور جدید (حداقل ۶ حرف)" className="w-full pr-12 pl-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left" dir="ltr" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center">
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'تایید و تغییر رمز'}
                  </button>
                  <button type="button" onClick={handleCancelPersonnelOtp} className="w-full text-center text-xs text-slate-500 hover:text-brand-primary mt-2 font-bold transition-colors">
                    اصلاح نام کاربری و رمز عبور
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}