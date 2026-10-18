import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, FileSpreadsheet, DollarSign, Loader2, Key, BarChart3, Search, List, Activity, CheckCircle, Wrench, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function CeoPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت‌های مودال قیمت‌گذاری و نمایش جزئیات
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);
  const [priceInput, setPriceInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // آیدی یکپارچه شده واحد بازرگانی
  const COMMERCIAL_CUSTOMER_ID = 'c78297a5-bb21-4701-b289-20352ef29f73';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .order('created_at', { ascending: false });
    
    if (error) toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    else setRequests(data || []);
    setIsLoading(false);
  };

  const handleOpenPricingModal = async (req: any) => {
    setSelectedRequest(req);
    setPriceInput(req.status === 'pending_ceo_initial' ? (req.estimated_price?.toString() || '') : (req.final_price?.toString() || ''));
    setPricingModalOpen(true);
    
    // دریافت قطعات برای وضعیت‌های بعد از تعمیر (گزارش نهایی یا مشاهده جزئیات پرونده)
    if (['estimated', 'pending_commercial', 'pending_finance', 'invoiced', 'pending_commercial_checkout', 'ready_for_delivery', 'pending_ceo_final', 'completed'].includes(req.status)) {
      setIsFetchingParts(true);
      const { data, error } = await supabase.from('repair_parts').select('*').eq('request_id', req.id);
      if (!error) setPartsList(data || []);
      setIsFetchingParts(false);
    } else {
      setPartsList([]);
    }
  };

  const submitPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceInput) return toast.error('لطفاً قیمت را وارد کنید');

    setIsSubmitting(true);
    try {
      if (selectedRequest.status === 'pending_ceo_initial') {
        const { error } = await supabase
          .from('repair_requests')
          .update({
            estimated_price: parseFloat(priceInput),
            status: 'pending_customer_approval'
          })
          .eq('id', selectedRequest.id);
        if (error) throw error;
        toast.success('برآورد اولیه (ریال) ثبت شد و در انتظار تایید مشتری می‌باشد.');
      } else {
        const { error } = await supabase
          .from('repair_requests')
          .update({
            final_price: parseFloat(priceInput),
            status: 'pending_commercial'
          })
          .eq('id', selectedRequest.id);
        if (error) throw error;
        toast.success('قیمت نهایی ثبت و درخواست به واحد بازرگانی ارجاع داده شد');
      }

      setPricingModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error('خطا در ثبت اطلاعات: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // تایید نهایی و پایان کار
  const handleFinalApproval = async (id: string) => {
    if (!confirm('آیا پرونده این درخواست بسته شده و عملیات را تایید نهایی می‌کنید؟')) return;
    try {
      const { error } = await supabase.from('repair_requests').update({ status: 'completed' }).eq('id', id);
      if (error) throw error;
      toast.success('درخواست با موفقیت تایید نهایی شد و در وضعیت پایان کار قرار گرفت.');
      fetchRequests();
    } catch (err: any) {
      toast.error('خطا در ثبت وضعیت');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return 'ثبت اولیه';
      case 'pending_ceo_initial': return 'نیازمند برآورد اولیه';
      case 'pending_customer_approval': return 'در انتظار تایید مشتری';
      case 'canceled_by_customer': return 'لغو شده توسط مشتری';
      case 'pending_supervisor': return 'بررسی سرپرست';
      case 'waiting_for_device': return 'در انتظار دریافت دستگاه';
      case 'accepted': return 'پذیرش شده';
      case 'repairing': return 'در حال تعمیر';
      case 'estimated': return 'نیازمند برآورد نهایی';
      case 'pending_commercial': return 'در انتظار بازرگانی';
      case 'pending_finance': return 'در انتظار مالی';
      case 'invoiced': return 'فاکتور شده - انتظار پرداخت';
      case 'pending_commercial_checkout': return 'تایید مالی - ارجاع به بازرگانی';
      case 'ready_for_delivery': return 'در انتظار ثبت خروج (هماهنگی)';
      case 'pending_ceo_final': return 'در انتظار تایید نهایی مدیریت';
      case 'completed': return 'پایان کار / تحویل داده شده';
      case 'rejected': return 'رد شده';
      default: return 'نامشخص';
    }
  };

  const getStatusBadge = (status: string) => {
    const text = getStatusText(status);
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'pending_ceo_initial': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold animate-pulse">{text}</span>;
      case 'pending_customer_approval': return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'estimated': return <span className="bg-fuchsia-100 text-fuchsia-800 px-2 py-1 rounded text-xs font-bold animate-pulse">{text}</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'pending_commercial_checkout': return <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'ready_for_delivery': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'pending_ceo_final': return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold animate-pulse">{text}</span>;
      case 'completed': return <span className="bg-emerald-200 text-emerald-900 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">{text}</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{text}</span>;
    }
  };

  const exportToExcel = () => {
    const headers = ['ردیف', 'نام پروژه / ارجاع کار', 'نام تجهیز (Unit Name)', 'پارت نامبر', 'کارخانه سازنده', 'کد پیگیری (TR)', 'شماره سریال', 'نام مشتری', 'وضعیت کنونی', 'مبلغ کل فاکتور (ریال)', 'تاریخ ثبت درخواست'];
    const rows = requests.map((req, index) => {
      const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
      const customerName = isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'نامشخص');
      
      return [
        index + 1, req.project_name || '---', req.device_info, req.part_number || '---', req.brand || '---', req.tracking_code, req.serial_number || '---', customerName, getStatusText(req.status), req.final_price || 0, new Date(req.created_at).toLocaleDateString('fa-IR')
      ];
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!views'] = [{ RTL: true, rightToLeft: true }];
    worksheet['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش مدیریت');
    XLSX.writeFile(workbook, 'گزارش_جامع_مدیریت.xlsx');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    try {
      if (profile?.username) {
        await supabase.from('personnel_users').update({ password: newPassword }).eq('username', profile.username);
      }
      toast.success('رمز عبور تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) { toast.error('خطا در تغییر رمز'); }
  };

  const queueRequests = requests.filter(r => 
    r.status === 'estimated' || 
    r.status === 'pending_ceo_initial' || 
    r.status === 'pending_ceo_final'
  );

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
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
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md mx-auto md:mx-0">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Activity size={18} /> کارتابل بررسی 
            {queueRequests.length > 0 && <span className="bg-white text-purple-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> گزارشات کل سامانه
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'queue' ? 'درخواست‌های نیازمند بررسی مدیر مرکز' : 'لیست جامع تمامی درخواست‌های سیستم'}
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
                          {(() => {
                            const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
                            return (
                              <>
                                <div className="font-bold text-slate-800">
                                  {isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام')}
                                </div>
                                <div className="text-xs font-mono text-slate-500" dir="ltr">
                                  {isCommercial ? 'ثبت سازمانی' : (req.profiles?.phone || '---')}
                                </div>
                                {isCommercial && (
                                  <span className="inline-block mt-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                    🛒 درخواست بازرگانی
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.device_info}</div>
                        <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                      </td>
                      <td className="py-4 px-3">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {req.status === 'estimated' || req.status === 'pending_ceo_initial' ? (
                          <button onClick={() => handleOpenPricingModal(req)} className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5">
                            <DollarSign size={16} /> {req.status === 'pending_ceo_initial' ? 'برآورد اولیه' : 'بررسی و قیمت‌گذاری نهایی'}
                          </button>
                        ) : req.status === 'pending_ceo_final' ? (
                           <div className="flex flex-col gap-2">
                             <button onClick={() => handleOpenPricingModal(req)} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5">
                               <Search size={16} /> مشاهده جزئیات
                             </button>
                             <button onClick={() => handleFinalApproval(req.id)} className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-md">
                               <CheckCircle size={16} /> تایید نهایی و پایان کار
                             </button>
                           </div>
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

      {/* مودال بررسی گزارش تعمیر، نمایش زمان‌بندی و ثبت قیمت */}
      {pricingModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedRequest.status === 'pending_ceo_initial' ? 'تعیین برآورد هزینه اولیه (پیش از شروع کار)' : 
                   selectedRequest.status === 'estimated' ? 'تعیین برآورد هزینه نهایی' : 
                   selectedRequest.status === 'pending_ceo_final' ? 'جزئیات و بررسی نهایی پرونده' : 'جزئیات درخواست'}
                </h3>
                <p className="text-sm text-slate-500 font-mono mt-1" dir="ltr">{selectedRequest.tracking_code}</p>
              </div>
              <button onClick={() => setPricingModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-6">
              
              {/* نمایش مشخصات کامل تجهیز ارسالی */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">مشخصات کامل تجهیز ارسالی</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">نام تجهیز (Unit Name):</span> <strong className="text-slate-800">{selectedRequest.device_info}</strong></div>
                  <div><span className="text-slate-400">کارخانه سازنده (Brand):</span> <strong className="text-slate-800">{selectedRequest.brand || '---'}</strong></div>
                  <div><span className="text-slate-400">پارت نامبر (Part Number):</span> <strong className="font-mono text-slate-800" dir="ltr">{selectedRequest.part_number || '---'}</strong></div>
                  <div><span className="text-slate-400">شماره سریال (S/N):</span> <strong className="font-mono text-slate-800" dir="ltr">{selectedRequest.serial_number || '---'}</strong></div>
                  <div className="sm:col-span-2"><span className="text-slate-400">نام پروژه / ارجاع کار:</span> <strong className="text-slate-800">{selectedRequest.project_name || '---'}</strong></div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 text-xs block mb-1">شرح کامل مشکل:</span>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">{selectedRequest.fault_description}</p>
                </div>
              </div>

              {/* نمایش زمان‌بندی دقیق ثبت، ورود و خروج دستگاه */}
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                 <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5"><Clock size={14}/> زمان‌بندی فرآیند</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                   <div><span className="text-indigo-400">تاریخ ثبت درخواست:</span> <strong className="text-indigo-900" dir="ltr">{new Date(selectedRequest.created_at).toLocaleString('fa-IR')}</strong></div>
                   <div><span className="text-indigo-400">تایید نهایی مشتری:</span> <strong className="text-indigo-900">{selectedRequest.needs_price_estimate ? 'بله' : 'بدون نیاز به برآورد'}</strong></div>
                   <div><span className="text-indigo-400">زمان ورود دستگاه:</span> <strong className="text-indigo-900" dir="ltr">{selectedRequest.received_at ? new Date(selectedRequest.received_at).toLocaleString('fa-IR') : 'ثبت نشده'}</strong></div>
                   <div><span className="text-indigo-400">زمان خروج دستگاه:</span> <strong className="text-indigo-900" dir="ltr">{selectedRequest.delivered_at ? new Date(selectedRequest.delivered_at).toLocaleString('fa-IR') : 'ثبت نشده'}</strong></div>
                 </div>
              </div>

              {/* اگر وضعیت بررسی نهایی یا مشاهده جزئیات است، گزارش سرپرست و قطعات نمایش داده شود */}
              {selectedRequest.status !== 'pending_ceo_initial' && selectedRequest.status !== 'pending_coordinator' && (
                <>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <span className="text-xs text-blue-400 block mb-1">گزارش فنی سرپرست تعمیر</span>
                    <p className="text-sm text-blue-900 leading-relaxed font-medium">
                      {selectedRequest.supervisor_report || 'گزارشی ثبت نشده است.'}
                    </p>
                  </div>
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
                </>
              )}

              {/* فرم قیمت‌گذاری برحسب ریال */}
              {(selectedRequest.status === 'estimated' || selectedRequest.status === 'pending_ceo_initial') ? (
                <form onSubmit={submitPricing} className="bg-purple-50 p-5 rounded-2xl border border-purple-100 mt-6">
                  
                  {/* نمایش برآورد اولیه پیش از دریافت قیمت نهایی */}
                  {selectedRequest.status === 'estimated' && selectedRequest.estimated_price && (
                    <div className="mb-5 bg-white p-4 rounded-xl border border-purple-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm">
                      <span className="text-sm font-bold text-slate-600">مبلغ برآورد اولیه (اعلام شده به مشتری):</span>
                      <span className="font-mono font-bold text-purple-700 text-lg bg-purple-50 px-3 py-1 rounded-lg border border-purple-100" dir="ltr">
                        {selectedRequest.estimated_price.toLocaleString()} ریال
                      </span>
                    </div>
                  )}
                  
                  <label className="block text-sm font-bold text-purple-900 mb-2">
                    {selectedRequest.status === 'pending_ceo_initial' ? 'برآورد هزینه اولیه (برحسب ریال)' : 'برآورد هزینه نهایی (برحسب ریال)'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="number" 
                      required
                      value={priceInput} 
                      onChange={e => setPriceInput(e.target.value)} 
                      placeholder="مثال: 15000000" 
                      className="flex-1 px-4 py-3 rounded-xl border border-purple-200 outline-none focus:border-purple-500 font-mono font-bold text-lg" 
                      dir="ltr"
                    />
                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex justify-center items-center gap-2 whitespace-nowrap"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />} 
                      {selectedRequest.status === 'pending_ceo_initial' ? 'ثبت و ارسال به مشتری' : 'تایید و ارجاع به بازرگانی'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">مبلغ برآورد اولیه:</span>
                    <span className="font-mono font-bold text-brand-primary" dir="ltr">{selectedRequest.estimated_price ? `${selectedRequest.estimated_price.toLocaleString()} ریال` : '---'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">مبلغ فاکتور نهایی تایید شده:</span>
                    <span className="font-mono font-bold text-lg text-brand-primary" dir="ltr">{selectedRequest.final_price ? `${selectedRequest.final_price.toLocaleString()} ریال` : '---'}</span>
                  </div>
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
            <form onSubmit={handleChangePassword}>
              <div className="mb-5">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز عبور جدید" className="w-full px-4 py-3 border border-slate-200 rounded-xl" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold">ثبت رمز جدید</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}