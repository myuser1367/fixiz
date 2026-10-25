import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Phone, Activity, User, Lock, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Check, FileText, Wrench, Search, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendUserNotification, sendOtpSMS } from '../lib/notifications';
interface RepairRequest {
  id: string;
  tracking_code: string;
  device_info: string;
  brand: string;
  fault_description: string;
  status: string;
  created_at: string;
}

export default function HomePage() {
  const { sendCustomerOtp, verifyCustomerOtp, personnelLogin, completePersonnelFirstLogin } = useAuth();
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

  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [trackedRequest, setTrackedRequest] = useState<RepairRequest | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleOpenTrackingModal = () => {
    setTrackingModalOpen(true);
    setTrackedRequest(null);
    setSearchCode('');
  };

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return toast.error('لطفاً کد پیگیری را وارد کنید');

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .ilike('tracking_code', searchCode.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('درخواستی با این کد پیگیری یافت نشد');
        setTrackedRequest(null);
      } else {
        setTrackedRequest(data);
        toast.success('درخواست پیدا شد');
      }
    } catch (error: any) {
      toast.error('خطا در جستجوی کد پیگیری');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Activity size={14}/> ثبت اولیه</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Wrench size={14}/> در حال بررسی / پذیرش</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پذیرش شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> عدم پذیرش</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> در حال تعمیر</span>;
      case 'estimated': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> برآورد هزینه</span>;
      case 'invoiced': return <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText size={14}/> صدور فاکتور</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const renderWorkflowSteps = (currentStatus: string) => {
    const steps = [
      { id: 'registered', label: 'ثبت درخواست', desc: 'درخواست توسط مشتری ثبت شد' },
      { id: 'acceptance', label: 'پذیرش یا عدم پذیرش', desc: 'بررسی اولیه توسط واحد هماهنگی و سرپرست' },
      { id: 'repairing', label: 'در حال تعمیر', desc: 'تکنسین در حال عیب‌یابی و تعمیر دستگاه است' },
      { id: 'estimation', label: 'برآورد هزینه', desc: 'محاسبه قطعات مصرفی و اعلام قیمت' },
      { id: 'invoiced', label: 'صدور فاکتور', desc: 'آماده تحویل و تسویه حساب نهایی' },
    ];

    let activeIndex = 0;
    if (['pending_supervisor', 'accepted'].includes(currentStatus)) activeIndex = 1;
    else if (currentStatus === 'repairing') activeIndex = 2;
    else if (['estimated', 'pending_commercial', 'pending_finance'].includes(currentStatus)) activeIndex = 3;
    else if (currentStatus === 'invoiced') activeIndex = 4;
    else if (currentStatus === 'rejected') activeIndex = 1;

    return (
      <div className="space-y-6 my-6 text-right" dir="rtl">
        <h4 className="font-bold text-slate-800 text-base mb-4">مراحل زنجیره تعمیر و خدمات</h4>
        <div className="space-y-4 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;
            const isRejected = currentStatus === 'rejected' && idx === 1;

            return (
              <div key={step.id} className="relative flex items-start gap-4 pr-10">
                <div className={`absolute right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                  isRejected ? 'bg-red-500 text-white' :
                  isCompleted ? 'bg-emerald-500 text-white' : 
                  isCurrent ? 'bg-brand-primary text-white animate-pulse' : 
                  'bg-slate-200 text-slate-500'
                }`}>
                  {isRejected ? <XCircle size={14} /> : isCompleted ? <Check size={14} /> : idx + 1}
                </div>
                <div>
                  <h5 className={`font-bold text-sm ${isCurrent || isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                    {isRejected && idx === 1 ? 'درخواست رد شد (عدم پذیرش)' : step.label}
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
      
      // --- کدهای اضافه شده برای ارسال پیامک ورود ---
      await sendUserNotification({
        trackingCode: 'ورود به سیستم',
        userMobile: custPhone,
        status: 'customer_login_success'
      });
      // --------------------------------------------

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
      
      // === بخش جدید: دریافت شماره موبایل پرسنل از دیتابیس و ارسال پیامک ===
      const { data: personnelData, error } = await supabase
        .from('personnel_users')
        .select('phone')
        .eq('username', persUsername)
        .single();
        
      if (!error && personnelData?.phone) {
         // ارسال پیامک OTP (شبیه‌سازی). فعلا کد ثابت 123456 است.
         await sendOtpSMS(personnelData.phone, '123456');
         console.log(`💬 پیامک کد تایید برای پرسنل ${persUsername} به شماره ${personnelData.phone} ارسال شد.`);
      } else {
         console.warn(`⚠️ شماره موبایلی برای نام کاربری ${persUsername} یافت نشد یا خطا رخ داد.`);
      }
      // =================================================================

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
      
      // --- لاگ شبیه‌سازی ورود پرسنل ---
      console.log(`💬 [SIMULATED SMS] Personnel logged in: ${persUsername}`);
      // --------------------------------

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
      <Header onOpenTracking={handleOpenTrackingModal} />

      <main className="relative flex flex-col items-center">
        {/* بخش اصلی و تیره رنگ بالای صفحه */}
        <div className="relative bg-brand-dark w-full overflow-hidden flex flex-col pt-12 lg:pt-16 pb-32">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
          <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 relative top-[1px]">
              <path d="M0 120L1440 120V0C1440 0 1140 100 720 100C300 100 0 0 0 0V120Z" fill="currentColor" />
            </svg>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 xl:gap-16">
            
           {/* سمت راست: متن‌ها و تصویر کارگاه */}
            <div className="text-center flex-1 animate-slide-up w-full max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-10 leading-tight">
                <span className="text-brand-light text-xl md:text-2xl block mb-4 font-bold tracking-wide">سامانه فیکسیز</span>
                سامانه جامع مدیریت تعمیرات
              </h1>

              {/* تصویر محیط کارگاه با افکت */}
              {/* تغییر در خط زیر: lg:mx-0 حذف شد تا mx-auto در همه سایزها عمل کند */}
              <div className="relative w-full max-w-lg mx-auto rounded-[2.5rem] p-3 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent opacity-50 z-10 mix-blend-overlay"></div>
                <img 
                  src="/hero-image.jpg" 
                  alt="کارگاه تعمیرات فرافن" 
                  className="w-full h-auto rounded-[2rem] object-cover shadow-inner relative z-0" 
                />
              </div>
            </div>

            {/* سمت چپ: باکس ورود به سامانه */}
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-slide-up relative z-20" style={{ animationDelay: '0.1s' }}>
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
        </div>

        {/* ۳ کادر توضیحات (بخش روشن پایین صفحه) */}
        <div className="w-full max-w-7xl mx-auto px-4 -mt-16 mb-20 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 text-right hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-brand-primary" />
              </div>
              <h3 className="text-slate-800 font-black text-xl mb-3">سرعت در خدمت‌رسانی</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                تسریع در فرآیند پذیرش، عیب‌یابی و تعمیرات جهت کاهش زمان توقف تجهیزات حیاتی شما در خطوط تولید.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 text-right hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <Search className="w-7 h-7 text-brand-primary" />
              </div>
              <h3 className="text-slate-800 font-black text-xl mb-3">پیگیری آنلاین و لحظه‌ای</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                امکان استعلام آنلاین و مشاهده لحظه به لحظه وضعیت دستگاه در هر مرحله از تعمیرات تا صدور فاکتور نهایی.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 text-right hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <Wrench className="w-7 h-7 text-brand-primary" />
              </div>
              <h3 className="text-slate-800 font-black text-xl mb-3">تعمیرات فوق تخصصی</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                بهره‌گیری از به‌روزترین تجهیزات آزمایشگاهی، تکنسین‌های مجرب و استفاده از قطعات اورجینال با تضمین کیفیت.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* مدال پیگیری درخواست از طریق هدر در صفحه اصلی */}
      {trackingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-800">پیگیری آنلاین درخواست تعمیر</h3>
              <button 
                onClick={() => setTrackingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchTracking} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">کد پیگیری دستگاه</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    value={searchCode} 
                    onChange={e => setSearchCode(e.target.value)} 
                    placeholder="مثال: FIX-633141" 
                    className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary font-mono font-bold text-left uppercase" 
                    dir="ltr"
                  />
                  <button 
                    type="submit" 
                    disabled={isSearching}
                    className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : 'استعلام'}
                  </button>
                </div>
              </div>
            </form>

            {trackedRequest && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">نام دستگاه:</span>
                    <span className="font-bold text-slate-800">{trackedRequest.device_info}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">برند دستگاه:</span>
                    <span className="font-bold text-slate-700">{trackedRequest.brand || 'تعیین نشده'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">تاریخ ثبت:</span>
                    <span className="font-mono font-bold text-slate-700" dir="ltr">{new Date(trackedRequest.created_at).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">وضعیت کنونی:</span>
                    <span>{getStatusBadge(trackedRequest.status)}</span>
                  </div>
                </div>

                {renderWorkflowSteps(trackedRequest.status)}
              </div>
            )}

            <button 
              onClick={() => setTrackingModalOpen(false)} 
              className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              بستن پنجره
            </button>
          </div>
        </div>
      )}
    </div>
  );
}