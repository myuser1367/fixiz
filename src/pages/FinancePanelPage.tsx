import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Key, FileText, CheckCircle, Loader2, CreditCard, History, Clock, Wrench, XCircle, AlertCircle, ShoppingCart, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function FinancePanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت مودال تغییر رمز
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // دریافت درخواست‌های در انتظار مالی و فاکتور شده‌ها
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .in('status', ['pending_finance', 'invoiced'])
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('خطا در دریافت اطلاعات مالی');
    } else {
      setRequests(data || []);
    }

    setIsLoading(false);
  };

  // ------------------------------------------------------------------
  // تابع شبیه‌ساز ارسال پیامک (Mock SMS)
  // ------------------------------------------------------------------
  const sendMockSms = (phone: string, trackingCode: string, price: number) => {
    // بعداً می‌توانید این بخش را با API پنل پیامکی خود (axios.post) جایگزین کنید
    const message = `کاربر گرامی، فاکتور نهایی تعمیر دستگاه شما با کد پیگیری ${trackingCode} به مبلغ ${price.toLocaleString()} تومان صادر شد. سامانه فیکسیز`;
    console.log(`[SMS SIMULATION] To: ${phone} | Message: ${message}`);
  };

  const handleIssueInvoice = async (req: any) => {
    if (!confirm(`آیا از صدور فاکتور نهایی برای قطعه "${req.device_info}" اطمینان دارید؟`)) return;
    
    setIsLoading(true);
    try {
      // 1. تغییر وضعیت به صدور فاکتور (invoiced)
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'invoiced' })
        .eq('id', req.id);

      if (error) throw error;

      // 2. ارسال پیامک به مشتری
      const customerPhone = req.profiles?.phone;
      if (customerPhone) {
        sendMockSms(customerPhone, req.tracking_code, req.final_price || 0);
        toast.success(`فاکتور صادر شد. پیامک اطلاع‌رسانی به شماره ${customerPhone} ارسال گردید.`);
      } else {
        toast.success('فاکتور با موفقیت صادر شد (شماره موبایل مشتری یافت نشد).');
      }

      fetchData();
    } catch (err: any) {
      toast.error('خطا در صدور فاکتور: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsUpdatingPassword(true);
    try {
      if (profile?.username) {
        const { error } = await supabase.from('personnel_users').update({ password: newPassword }).eq('username', profile.username);
        if (error) throw error;
      }
      toast.success('رمز عبور تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error('خطا در تغییر رمز عبور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> ثبت اولیه</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Wrench size={14}/> بررسی فنی</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پذیرش شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> رد شده</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> در حال تعمیر</span>;
      case 'estimated': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> برآورد قیمت</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShoppingCart size={14}/> در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText size={14}/> در انتظار مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> فاکتور شده</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const queueRequests = requests.filter(r => r.status === 'pending_finance');
  const historyRequests = requests.filter(r => r.status === 'invoiced');

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      {/* هدر پنل مالی */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2.5 rounded-xl text-teal-700">
              <CreditCard size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه فیکسیز</h1>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md">واحد امور مالی</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            
            <button onClick={() => setShowPasswordModal(true)} className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> تغییر رمز
            </button>
            <button onClick={() => navigate('/')} className="hidden sm:flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* تب‌های مالی */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md mx-auto md:mx-0 flex-col sm:flex-row gap-1">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <CreditCard size={18} /> کارتابل صدور فاکتور
            {queueRequests.length > 0 && <span className="bg-white text-teal-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <History size={18} /> فاکتورهای صادر شده
          </button>
        </div>

        {/* لیست درخواست‌ها */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {activeTab === 'queue' ? 'درخواست‌های در انتظار بررسی و صدور فاکتور نهایی' : 'تاریخچه فاکتورهای صادر شده و تسویه حساب‌ها'}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری و موبایل</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">مبلغ تایید شده (تومان)</th>
                  <th className="pb-3 px-3 text-center">وضعیت / عملیات مالی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto h-6 w-6 mb-2" />در حال دریافت اطلاعات...</td></tr>
                ) : (activeTab === 'queue' ? queueRequests : historyRequests).length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">موردی یافت نشد.</td></tr>
                ) : (
                  (activeTab === 'queue' ? queueRequests : historyRequests).map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.profiles?.full_name || 'بدون نام'}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">{req.profiles?.phone}</div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.device_info}</div>
                        <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-teal-700 text-lg" dir="ltr">
                        {req.final_price ? req.final_price.toLocaleString() : '---'}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {req.status === 'pending_finance' ? (
                          <button 
                            onClick={() => handleIssueInvoice(req)} 
                            className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle size={16} /> صدور فاکتور و اطلاع پیامکی
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
                            <Check size={16} /> فاکتور صادر شده
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* مدال تغییر رمز عبور پرسنل */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تغییر رمز عبور</h3>
            <p className="text-xs text-slate-500 mb-5">رمز عبور جدیدی برای ورود به پنل وارد نمایید.</p>
            <form onSubmit={handleChangePassword}>
              <div className="mb-5">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary text-left font-mono"
                  dir="ltr"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isUpdatingPassword} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors text-sm">
                  {isUpdatingPassword ? 'در حال ثبت...' : 'ثبت رمز'}
                </button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}