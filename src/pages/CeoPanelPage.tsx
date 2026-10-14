import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, FileSpreadsheet, DollarSign, Loader2, Key, BarChart3, Search, List, Activity, CheckCircle, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function CeoPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت‌های مودال قیمت‌گذاری
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت مودال تغییر رمز
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    // مدیر مرکز هم به کارتابل خودش (estimated) و هم به کل سیستم برای گزارش‌گیری دسترسی دارد
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenPricingModal = async (req: any) => {
    setSelectedRequest(req);
    setPriceInput(req.final_price?.toString() || req.estimated_price?.toString() || '');
    setPricingModalOpen(true);
    
    // دریافت لیست قطعات مصرفی برای این درخواست از جدول repair_parts
    setIsFetchingParts(true);
    const { data, error } = await supabase
      .from('repair_parts')
      .select('*')
      .eq('request_id', req.id);

    if (error) {
      toast.error('خطا در دریافت لیست قطعات');
    } else {
      setPartsList(data || []);
    }
    setIsFetchingParts(false);
  };

  const submitPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceInput) return toast.error('لطفاً قیمت نهایی را وارد کنید');

    setIsSubmitting(true);
    try {
      // ثبت قیمت نهایی و ارجاع به واحد بازرگانی طبق سناریو
      const { error } = await supabase
        .from('repair_requests')
        .update({
          final_price: parseFloat(priceInput),
          status: 'pending_commercial'
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      
      toast.success('قیمت با موفقیت ثبت و درخواست به واحد بازرگانی ارجاع داده شد');
      setPricingModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error('خطا در ثبت اطلاعات: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

 
  const exportToExcel = () => {
    const headers = ['ردیف', 'نام پروژه / ارجاع کار', 'نام تجهیز (Unit Name)', 'پارت نامبر', 'کارخانه سازنده', 'کد پیگیری (TR)', 'شماره سریال', 'نام مشتری', 'وضعیت کنونی', 'تاریخ دریافت', 'تاریخ تحویل'];
    
    const rows = requests.map((req, index) => {
      const rDate = req.received_at ? new Date(req.received_at).toLocaleDateString('fa-IR') : '---';
      const dDate = req.delivered_at ? new Date(req.delivered_at).toLocaleDateString('fa-IR') : '---';
      return [
        index + 1,
        req.project_name || '---',
        req.device_info,
        req.part_number || '---',
        req.brand || '---',
        req.tracking_code,
        req.serial_number || '---',
        req.profiles?.full_name || 'نامشخص',
        req.status,
        rDate,
        dDate
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // تنظیم راست‌چین بودن و عرض ستون‌ها
    worksheet['!views'] = [{ RTL: true, rightToLeft: true }];
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, 
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش هماهنگی');
    
    XLSX.writeFile(workbook, 'گزارش_واحد_هماهنگی.xlsx');
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
      toast.success('رمز عبور شما با موفقیت تغییر کرد');
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
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">ثبت اولیه</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">بررسی سرپرست</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">پذیرش شده</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">در حال تعمیر</span>;
      case 'estimated': return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold animate-pulse">نیازمند برآورد مدیر مرکز</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs font-bold">در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold">در انتظار مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">فاکتور شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">رد شده</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  const queueRequests = requests.filter(r => r.status === 'estimated');

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      {/* هدر پنل مدیر مرکز */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2.5 rounded-xl text-purple-700">
              <BarChart3 size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه فیکسیز</h1>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">مدیریت مرکز</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'مدیر محترم مرکز'}</span>
            
            <button onClick={() => setShowPasswordModal(true)} className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> تغییر رمز
            </button>
            <button onClick={() => { window.location.href = '/'; }} className="hidden sm:flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* تب‌های مدیریتی */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md mx-auto md:mx-0">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Activity size={18} /> کارتابل قیمت‌گذاری 
            {queueRequests.length > 0 && <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> گزارشات کل سامانه
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'queue' ? 'درخواست‌های نیازمند برآورد قیمت مدیر مرکز' : 'لیست جامع تمامی درخواست‌های سیستم'}
            </h2>
            {activeTab === 'reports' && (
              <button onClick={exportToExcel} className="flex items-center gap-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold transition-colors">
                <FileSpreadsheet size={18} /> خروجی اکسل
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">وضعیت فعلی</th>
                  <th className="pb-3 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : (activeTab === 'queue' ? queueRequests : requests).length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">موردی برای نمایش یافت نشد.</td></tr>
                ) : (
                  (activeTab === 'queue' ? queueRequests : requests).map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.profiles?.full_name || 'بدون نام'}</div>
                        <div className="text-xs text-slate-500 font-mono" dir="ltr">{req.profiles?.phone}</div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.device_info}</div>
                        <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                      </td>
                      <td className="py-4 px-3">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {req.status === 'estimated' ? (
                          <button onClick={() => handleOpenPricingModal(req)} className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5">
                            <DollarSign size={16} /> بررسی و قیمت‌گذاری
                          </button>
                        ) : (
                          <button onClick={() => handleOpenPricingModal(req)} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5">
                            <Search size={16} /> مشاهده جزئیات
                          </button>
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

      {/* مودال بررسی گزارش تعمیر و ثبت قیمت نهایی */}
      {pricingModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedRequest.status === 'estimated' ? 'تعیین برآورد هزینه نهایی' : 'جزئیات درخواست'}
                </h3>
                <p className="text-sm text-slate-500 font-mono mt-1" dir="ltr">{selectedRequest.tracking_code}</p>
              </div>
              <button onClick={() => setPricingModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-6">
              
              {/* اطلاعات دستگاه و گزارش تعمیرکار */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">دستگاه و اظهارات مشتری</span>
                  <p className="font-bold text-slate-800 text-sm mb-2">{selectedRequest.device_info} ({selectedRequest.brand || 'بدون برند'})</p>
                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-2 rounded-lg border border-slate-100">{selectedRequest.fault_description}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <span className="text-xs text-blue-400 block mb-1">گزارش فنی سرپرست تعمیر</span>
                  <p className="text-sm text-blue-900 leading-relaxed font-medium">
                    {selectedRequest.supervisor_report || 'گزارشی ثبت نشده است.'}
                  </p>
                </div>
              </div>

              {/* لیست قطعات مصرفی */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <Wrench size={16} className="text-slate-400"/> لیست قطعات مصرفی یا تعویضی
                </h4>
                {isFetchingParts ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 p-4 bg-slate-50 rounded-xl"><Loader2 className="animate-spin" size={16}/> در حال دریافت قطعات...</div>
                ) : partsList.length === 0 ? (
                  <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-100">هیچ قطعه‌ای برای این درخواست ثبت نشده است.</div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {partsList.map((part: any) => (
                      <li key={part.id} className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                        <span className="font-bold text-slate-700">{part.part_name}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono font-bold">{part.quantity} عدد</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* فرم قیمت‌گذاری */}
              {selectedRequest.status === 'estimated' ? (
                <form onSubmit={submitPricing} className="bg-purple-50 p-5 rounded-2xl border border-purple-100 mt-6">
                  <label className="block text-sm font-bold text-purple-900 mb-2">برآورد هزینه نهایی (تومان) <span className="text-red-500">*</span></label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="number" 
                      required
                      value={priceInput} 
                      onChange={e => setPriceInput(e.target.value)} 
                      placeholder="مثال: 1500000" 
                      className="flex-1 px-4 py-3 rounded-xl border border-purple-200 outline-none focus:border-purple-500 font-mono font-bold text-lg" 
                      dir="ltr"
                    />
                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex justify-center items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />} 
                      تایید و ارجاع به بازرگانی
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-600">مبلغ کل فاکتور ثبت شده:</span>
                  <span className="font-mono font-bold text-lg text-brand-primary" dir="ltr">
                    {selectedRequest.final_price ? `${selectedRequest.final_price.toLocaleString()} تومان` : 'ثبت نشده'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مدال تغییر رمز عبور */}
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
                  {isUpdatingPassword ? 'در حال ثبت...' : 'ثبت رمز جدید'}
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