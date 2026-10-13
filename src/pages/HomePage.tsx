import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Clock, ShieldCheck, CheckCircle, Phone, Activity, User, Lock, ArrowLeft, Loader2, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const navigate = useNavigate();
  const { session, profile, role, sendCustomerOtp, verifyCustomerOtp, personnelLogin } = useAuth();
  const isAdmin = role === 'admin';

  // --- Login State Management ---
  const [activeTab, setActiveTab] = useState<'customer' | 'personnel'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Customer Login State
  const [custPhone, setCustPhone] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [custStep, setCustStep] = useState<'phone' | 'otp'>('phone');
  
  // Personnel Login State
  const [persUsername, setPersUsername] = useState('');
  const [persPassword, setPersPassword] = useState('');
  const [persStep, setPersStep] = useState<'login' | 'otp'>('login');
  const [persOtp, setPersOtp] = useState('');
  const [persPhoneForOtp, setPersPhoneForOtp] = useState('');

  useEffect(() => {
    // اگر کاربر لاگین بود و در مراحل ثبت‌نام نبود، در صفحه اصلی بماند و فقط دکمه ورود مستقیم ببیند
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

  // مرحله ۱ ورود پرسنل: بررسی نام کاربری و رمز
  const handlePersLoginStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persUsername || !persPassword) return toast.error('نام کاربری و رمز عبور الزامی است');
    setIsLoading(true);
    try {
      const email = `${persUsername.toLowerCase().trim()}@fixiz.ir`;
      // لاگین اولیه فقط برای تایید رمز
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: persPassword });
      
      if (error) throw new Error('نام کاربری یا رمز عبور اشتباه است');
      
      // اگر رمز درست بود، موبایل پرسنل را از پروفایل می‌گیریم
      const { data: pData } = await supabase.from('profiles').select('phone').eq('id', data.user.id).single();
      
      if (pData?.phone) {
        setPersPhoneForOtp(pData.phone);
        // ارسال پیامک OTP به شماره پرسنل
        await sendCustomerOtp(pData.phone);
        setPersStep('otp');
        toast.success(`کد تایید به موبایل شما ارسال شد`, { duration: 6000 });
      } else {
         // اگر شماره نداشت، لاگین لغو شود و خطا بدهد
         await supabase.auth.signOut();
         throw new Error('حساب کاربری شما فاقد شماره موبایل ثبت شده است. لطفاً با مدیر سیستم تماس بگیرید.');
      }
    } catch (error: any) { 
      toast.error(error.message); 
      await supabase.auth.signOut(); // اگر مرحله اول گیر کرد سشن رو پاک کن
    } finally { 
      setIsLoading(false); 
    }
  };

  // مرحله ۲ ورود پرسنل: بررسی کد OTP
  const handlePersVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (persOtp.length < 4) return toast.error('کد را کامل وارد کنید');
    setIsLoading(true);
    try {
      await verifyCustomerOtp(persPhoneForOtp, persOtp);
      // اجرای لاگین نهایی برای گرفتن اطلاعات کامل پروفایل پرسنل
      await personnelLogin(persUsername, persPassword);
      toast.success('ورود پرسنل تایید شد');
      navigate('/panel');
    } catch (error: any) { 
      toast.error('کد تایید اشتباه است'); 
    } finally { 
      setIsLoading(false); 
    }
  };


  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Header />

      <main className="relative bg-brand-dark overflow-hidden min-h-[calc(100vh-80px)] flex flex-col justify-start pt-16 lg:pt-24 pb-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 relative top-[1px]">
            <path d="M0 120L1440 120V0C1440 0 1140 100 720 100C300 100 0 0 0 0V120Z" fill="currentColor" />
          </svg>
        </div>

        {/* تراز بندی flex-row برای قرارگیری متن و کادر لاگین در کنار هم، items-start برای قرارگیری در بالا */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 flex flex-col lg:flex-row items-start justify-between gap-12">
          
          {/* متن‌های سمت راست */}
          <div className="text-center lg:text-right flex-1 animate-slide-up mt-8 lg:mt-16">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              سامانه جامع <span className="text-brand-light text-gradient block mt-2">مدیریت تعمیرات</span>
            </h1>
            {/* متن توضیحات زیر عنوان حذف شد */}
          </div>

          {/* کادر لاگین سمت چپ */}
          <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 border border-slate-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            
            {session && profile ? (
               // اگر لاگین بود، به جای فرم این پیام رو میبینه
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <User size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">خوش آمدید!</h3>
                <p className="text-slate-500 mb-8">شما وارد حساب کاربری خود شده‌اید.</p>
                <button 
                  onClick={() => navigate('/panel')} 
                  className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={20} />
                  {isAdmin ? 'ورود به پنل مدیریت' : 'ورود به پنل کاربری'}
                </button>
              </div>
            ) : (
               // فرم لاگین
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">ورود به سامانه</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeTab === 'customer' && custStep === 'phone' && 'شماره موبایل خود را وارد کنید'}
                    {activeTab === 'customer' && custStep === 'otp' && 'کد پیامک شده را وارد کنید'}
                    {activeTab === 'personnel' && persStep === 'login' && 'اطلاعات حساب سازمانی خود را وارد کنید'}
                    {activeTab === 'personnel' && persStep === 'otp' && 'کد تایید دو مرحله‌ای را وارد کنید'}
                  </p>
                </div>

                {persStep === 'login' && (
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('customer'); setCustStep('phone'); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'customer' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      مشتریان
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('personnel')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'personnel' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      پرسنل سازمان
                    </button>
                  </div>
                )}

                {activeTab === 'customer' && (
                  custStep === 'phone' ? (
                    <form onSubmit={handleCustSendOtp} className="space-y-6">
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-slate-400" /></div>
                          <input type="tel" required value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-left font-mono font-bold text-lg transition-all" placeholder="09123456789" dir="ltr" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ارسال کد تایید'} {!isLoading && <ArrowLeft size={18} />}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCustVerify} className="space-y-6">
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-slate-400" /></div>
                          <input type="text" required autoFocus maxLength={6} value={custOtp} onChange={(e) => setCustOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-center tracking-widest text-3xl font-mono font-bold transition-all" placeholder="123456" dir="ltr" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-4 bg-brand-primary hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'ورود به سامانه'} {!isLoading && <ArrowLeft size={18} />}
                      </button>
                      <button type="button" onClick={() => setCustStep('phone')} className="w-full text-center text-xs text-slate-500 hover:text-brand-primary mt-2 font-bold transition-colors">اصلاح شماره موبایل</button>
                    </form>
                  )
                )}

                {activeTab === 'personnel' && (
                  persStep === 'login' ? (
                    <form onSubmit={handlePersLoginStart} className="space-y-5">
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-400" /></div>
                          <input type="text" required value={persUsername} onChange={(e) => setPersUsername(e.target.value)} placeholder="نام کاربری" className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left transition-all" dir="ltr" />
                        </div>
                      </div>
                      <div>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-400" /></div>
                          <input type={showPassword ? "text" : "password"} required value={persPassword} onChange={(e) => setPersPassword(e.target.value)} placeholder="رمز عبور" className="w-full pr-12 pl-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-left transition-all" dir="ltr" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-slate-700">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'بررسی و دریافت پیامک'} {!isLoading && <ArrowLeft size={18} />}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handlePersVerifyOtp} className="space-y-6">
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1.5 text-center">پیامک تایید به شماره {persPhoneForOtp} ارسال شد</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-slate-400" /></div>
                          <input type="text" required autoFocus maxLength={6} value={persOtp} onChange={(e) => setPersOtp(e.target.value)} className="w-full pr-12 py-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-brand-primary text-center tracking-widest text-3xl font-mono font-bold transition-all" placeholder="کد 6 رقمی" dir="ltr" />
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'تایید و ورود به پنل'} {!isLoading && <ArrowLeft size={18} />}
                      </button>
                       <button type="button" onClick={() => {setPersStep('login'); supabase.auth.signOut();}} className="w-full text-center text-xs text-slate-500 hover:text-slate-800 mt-2 font-bold transition-colors">بازگشت به فرم لاگین</button>
                    </form>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* بخش ویژگی‌ها */}
      <section className="max-w-7xl mx-auto px-4 py-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-8 flex flex-col items-center text-center shadow-sm bg-white rounded-3xl">
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl mb-6"><Clock size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">ثبت سریع و آسان</h3>
            <p className="text-slate-500 leading-relaxed">درخواست تعمیر خود را به سادگی و در کمتر از یک دقیقه در سامانه ثبت کنید.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center shadow-sm bg-white rounded-3xl">
            <div className="bg-brand-50 text-brand-600 p-4 rounded-2xl mb-6"><ShieldCheck size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">شفافیت در هزینه</h3>
            <p className="text-slate-500 leading-relaxed">دریافت برآورد دقیق قیمت و مشاهده قطعات مصرفی پیش از شروع فرآیند تعمیر.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center shadow-sm bg-white rounded-3xl">
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl mb-6"><CheckCircle size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">پیگیری لحظه‌ای</h3>
            <p className="text-slate-500 leading-relaxed">مشاهده وضعیت لحظه به لحظه دستگاه در تمامی مراحل از طریق پنل کاربری.</p>
          </div>
        </div>
      </section>
    </div>
  );
}