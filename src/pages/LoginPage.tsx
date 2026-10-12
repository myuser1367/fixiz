import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Phone, Activity, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'customer' | 'personnel'>('customer');
  const [isLoading, setIsLoading] = useState(false);
  
  // استیت‌های مشتری
  const [custPhone, setCustPhone] = useState('');
  const [custOtp, setCustOtp] = useState('');
  const [custStep, setCustStep] = useState<'phone' | 'otp'>('phone');
  
  // استیت‌های پرسنل
  const [persUsername, setPersUsername] = useState('');
  const [persPassword, setPersPassword] = useState('');
  const [persStep, setPersStep] = useState<'login' | 'first_login'>('login');
  
  // استیت‌های اولین ورود پرسنل
  const [persOtp, setPersOtp] = useState('');
  const [persNewPassword, setPersNewPassword] = useState('');
  
  // متغیر role حذف شد چون از profile.role استفاده می‌کنیم
  const { session, profile, sendCustomerOtp, verifyCustomerOtp, personnelLogin, sendPersonnelOtp, completePersonnelFirstLogin } = useAuth();
  const navigate = useNavigate();

  // کنترل هدایت کاربر در صورت لاگین بودن
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

  // ------------ توابع مشتری ------------
  const handleCustSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (custPhone.length < 10) return toast.error('شماره موبایل معتبر نیست');
    setIsLoading(true);
    try {
      const code = await sendCustomerOtp(custPhone);
      setCustStep('otp');
      toast.success(`کد تست مشتری: ${code}`, { duration: 6000 }); // پیام تستی
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ------------ توابع پرسنل ------------
  const handlePersLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persUsername || !persPassword) return toast.error('نام کاربری و رمز عبور الزامی است');
    setIsLoading(true);
    try {
      const pData = await personnelLogin(persUsername, persPassword);
      if (pData.is_first_login) {
        setPersStep('first_login');
        // در اولین ورود، بلافاصله پیامک تستی به موبایل پرسنل می‌فرستیم
        const code = await sendPersonnelOtp();
        toast.success(`کد تست پرسنل: ${code}`, { duration: 6000 });
      } else {
        toast.success('ورود موفقیت‌آمیز');
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 cursor-pointer" onClick={() => navigate('/')}>
          <Wrench size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">سامانه فیکسیز</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* تب‌ها (اگر پرسنل در مرحله اول ورود نباشد نمایش داده می‌شود) */}
          {persStep === 'login' && (
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => { setActiveTab('customer'); setCustStep('phone'); }}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'customer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ورود مشتریان
              </button>
              <button
                onClick={() => setActiveTab('personnel')}
                className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === 'personnel' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ورود پرسنل سازمانی
              </button>
            </div>
          )}

          {/* محتوای تب مشتری */}
          {activeTab === 'customer' && persStep === 'login' && (
            custStep === 'phone' ? (
              <form onSubmit={handleCustSendOtp} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">شماره موبایل</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div>
                    <input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="block w-full pr-10 py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-left font-bold" placeholder="09123456789" dir="ltr" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-bold">{isLoading ? 'درحال ارسال...' : 'دریافت کد تایید'}</button>
              </form>
            ) : (
              <form onSubmit={handleCustVerify} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">کد تایید ۴ رقمی</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-gray-400" /></div>
                    <input type="text" maxLength={4} value={custOtp} onChange={(e) => setCustOtp(e.target.value)} className="block w-full pr-10 py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-center tracking-widest text-2xl font-bold" dir="ltr" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-bold">{isLoading ? 'درحال بررسی...' : 'تایید و ورود'}</button>
                <button type="button" onClick={() => setCustStep('phone')} className="w-full text-sm text-blue-600 mt-2">اصلاح شماره موبایل</button>
              </form>
            )
          )}

          {/* محتوای تب پرسنل */}
          {activeTab === 'personnel' && (
            persStep === 'login' ? (
              <form onSubmit={handlePersLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">نام کاربری</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                    <input type="text" value={persUsername} onChange={(e) => setPersUsername(e.target.value)} className="block w-full pr-10 py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-left" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">رمز عبور</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                    <input type="password" value={persPassword} onChange={(e) => setPersPassword(e.target.value)} className="block w-full pr-10 py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-left" dir="ltr" />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 text-white bg-gray-800 rounded-md hover:bg-gray-900 font-bold">
                  {isLoading ? 'در حال ورود...' : 'ورود پرسنل'} <ArrowRight className="mr-2 h-5 w-5 mt-0.5" />
                </button>
              </form>
            ) : (
              // فرم اولین ورود پرسنل (تایید پیامک و تغییر رمز)
              <form onSubmit={handlePersFirstLoginComplete} className="space-y-6">
                <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <ShieldCheck className="h-6 w-6 text-yellow-500" />
                    <p className="mr-3 text-sm text-yellow-700 font-medium">
                      اولین ورود سیستم! لطفاً کد تایید پیامک شده به موبایل خود را وارد کرده و رمز عبور جدیدی تعیین کنید.
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">کد تایید پیامک شده</label>
                  <input type="text" maxLength={4} value={persOtp} onChange={(e) => setPersOtp(e.target.value)} className="mt-1 block w-full py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-center tracking-widest text-2xl font-bold" dir="ltr" placeholder="- - - -" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">رمز عبور جدید شما</label>
                  <input type="password" value={persNewPassword} onChange={(e) => setPersNewPassword(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:border-blue-500 text-left" dir="ltr" placeholder="حداقل ۶ کاراکتر" />
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full py-3 px-4 text-white bg-green-600 rounded-md hover:bg-green-700 font-bold">
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