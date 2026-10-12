import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, Activity, User, Lock, ArrowLeft, ShieldCheck, LogIn, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'customer' | 'personnel'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
      await sendCustomerOtp(custPhone);
      setCustStep('otp');
      toast.success(`کد تایید ارسال شد (کد تستی: 123456)`, { duration: 6000 });
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCustVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custOtp.length < 4) return toast.error('کد را کامل وارد کنید');
    setIsLoading(true);
    try {
      await verifyCustomerOtp(custPhone, custOtp);
      toast.success('ورود موفقیت‌آمیز');
      navigate('/panel');
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setIsLoading(false); 
    }
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
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setIsLoading(false); 
    }
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
    } catch (error: any) { 
      toast.error(error.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative font-vazir" dir="rtl">
      
      {/* پس‌زمینه */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>

      {/* دکمه بازگشت به سایت */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-slate-400 hover:text-white p-2 rounded-xl transition-colors z-20"
        title="بازگشت به صفحه اصلی"
      >
        <X size={24} />
      </button>

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-slate-100 relative z-10 animate-slide-up">
        
        {/* هدر باکس لاگین */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={30} className="ml-1" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">ورود / ثبت‌نام</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {activeTab === 'customer' && custStep === 'phone' && 'شماره موبایل خود را وارد کنید'}
            {activeTab === 'customer' && custStep === 'otp' && 'کد پیامک شده را وارد کنید'}
            {activeTab === 'personnel' && persStep === 'login' && 'اطلاعات کاربری خود را وارد کنید'}
            {activeTab === 'personnel' && persStep === 'first_login' && 'کد تایید و رمز جدید را وارد کنید'}
          </p>
        </div>

        {/* انتخاب نوع ورود: مشتریان / پرسنل */}
        {persStep === 'login' && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => { setActiveTab('customer'); setCustStep('phone'); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'customer'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              مشتریان
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('personnel')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'personnel'
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              پرسنل سازمان
            </button>
          </div>
        )}

        {/* محتوای فرم بر اساس تب و مرحله */}
        {activeTab === 'customer' && persStep === 'login' && (
          custStep === 'phone' ? (
            <form onSubmit={handleCustSendOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">شماره موبایل</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left font-mono font-bold text-lg transition-all"
                    placeholder="09123456789"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ارسال کد تایید'}
                {!isLoading && <ArrowLeft size={18} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCustVerify} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">کد تایید پیامک‌شده</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Activity className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={custOtp}
                    onChange={(e) => setCustOtp(e.target.value)}
                    className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-center tracking-widest text-3xl font-mono font-bold transition-all"
                    placeholder="123456"
                    dir="ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ورود به سامانه'}
                {!isLoading && <ArrowLeft size={18} />}
              </button>

              <button
                type="button"
                onClick={() => setCustStep('phone')}
                className="w-full text-center text-xs text-slate-500 hover:text-brand-primary mt-2 font-bold transition-colors"
              >
                اصلاح شماره موبایل
              </button>
            </form>
          )
        )}

        {/* فرم پرسنل */}
        {activeTab === 'personnel' && (
          persStep === 'login' ? (
            <form onSubmit={handlePersLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">نام کاربری</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={persUsername}
                    onChange={(e) => setPersUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left font-medium transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">رمز عبور</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={persPassword}
                    onChange={(e) => setPersPassword(e.target.value)}
                    placeholder="••••••••"
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
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ورود به حساب پرسنلی'}
                {!isLoading && <ArrowLeft size={18} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePersFirstLoginComplete} className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-2 flex">
                <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0" />
                <p className="mr-3 text-xs leading-relaxed text-amber-800 font-medium">
                  اولین ورود سیستم! لطفاً کد تایید پیامک شده را وارد کرده و رمز عبور جدیدی تعیین کنید.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Activity className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={persOtp}
                  onChange={(e) => setPersOtp(e.target.value)}
                  placeholder="کد پیامک شده"
                  className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-center tracking-widest text-2xl font-bold font-mono transition-all"
                  dir="ltr"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={persNewPassword}
                  onChange={(e) => setPersNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید (حداقل ۶ حرف)"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'تایید و تغییر رمز'}
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}