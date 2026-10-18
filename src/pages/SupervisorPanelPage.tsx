import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Wrench, Plus, Trash2, Loader2, Save, Key, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function SupervisorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت‌های مربوط به مودال تغییر رمز
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // استیت‌های مربوط به مودال گزارش کار و ثبت قطعات
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [supervisorReport, setSupervisorReport] = useState('');
  const [parts, setParts] = useState<{ part_name: string; quantity: number }[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .in('status', ['pending_supervisor', 'accepted', 'waiting_for_device', 'repairing'])
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const sendAcceptedSms = (phone: string, trackingCode: string) => {
    console.log(`[SMS SIMULATION] To: ${phone} | Message: درخواست تعمیر شما با کد پیگیری ${trackingCode} پذیرش شد. لطفاً دستگاه خود را ارسال نمایید. سامانه فرافن`);
  };

  const handleStatusChange = async (id: string, newStatus: string, customerPhone?: string, trackingCode?: string) => {
    const { error } = await supabase
      .from('repair_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('خطا در تغییر وضعیت');
    } else {
      toast.success('وضعیت با موفقیت به‌روزرسانی شد');
      if (newStatus === 'waiting_for_device' && customerPhone) {
        sendAcceptedSms(customerPhone, trackingCode || '');
        toast.success(`پیامک اطلاع‌رسانی ارسال دستگاه به شماره ${customerPhone} ارسال شد.`);
      }
      fetchRequests();
    }
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) return toast.error('نام قطعه را وارد کنید');
    if (newPartQty < 1) return toast.error('تعداد نامعتبر است');
    setParts([...parts, { part_name: newPartName, quantity: newPartQty }]);
    setNewPartName('');
    setNewPartQty(1);
  };

  const handleRemovePart = (index: number) => {
    const newParts = [...parts];
    newParts.splice(index, 1);
    setParts(newParts);
  };

  const openReportModal = (req: any) => {
    setSelectedRequest(req);
    setSupervisorReport(req.supervisor_report || '');
    setParts([]);
  };

  const submitReportAndParts = async () => {
    if (!selectedRequest) return;
    if (!supervisorReport.trim()) return toast.error('لطفاً گزارش کار را بنویسید');

    setIsSubmittingReport(true);
    try {
      const { error: reqError } = await supabase
        .from('repair_requests')
        .update({ supervisor_report: supervisorReport })
        .eq('id', selectedRequest.id);
      
      if (reqError) throw reqError;

      if (parts.length > 0) {
        const partsToInsert = parts.map(p => ({
          request_id: selectedRequest.id,
          part_name: p.part_name,
          quantity: p.quantity,
        }));

        const { error: partsError } = await supabase
          .from('repair_parts')
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      const nextStatus = 'estimated'; 
      await supabase.from('repair_requests').update({ status: nextStatus }).eq('id', selectedRequest.id);

      toast.success('گزارش کار ثبت شد و برای برآورد هزینه به مدیر مرکز ارجاع یافت');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast.error('خطا در ثبت اطلاعات: ' + error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsUpdatingPassword(true);
    try {
      if (profile?.username) {
        const { error } = await supabase
          .from('personnel_users')
          .update({ password: newPassword })
          .eq('username', profile.username);
        if (error) throw error;
      }
      toast.success('رمز عبور شما با موفقیت تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی هماهنگی</span>;
      case 'pending_ceo_initial': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار برآورد اولیه</span>;
      case 'pending_customer_approval': return <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار تایید مشتری</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">لغو توسط مشتری</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی سرپرست</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار دریافت دستگاه</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold">پذیرش شده</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">در حال تعمیر</span>;
      case 'estimated': return <span className="bg-fuchsia-100 text-fuchsia-800 px-2.5 py-1 rounded-lg text-xs font-bold">نیازمند برآورد نهایی</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار واحد مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg text-xs font-bold">فاکتور صادر شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">عدم پذیرش</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">وضعیت نامشخص</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه فیکسیز</h1>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md">سرپرست تعمیرات</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            
            <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> <span className="hidden sm:inline">تغییر رمز</span>
            </button>
            <button onClick={() => { window.location.href = '/'; }} className="flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> <span className="hidden sm:inline">صفحه اصلی</span>
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">کارتابل فنی و تعمیرات</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{requests.length} قطعه در کارتابل</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">شرح مشکل (اظهار مشتری)</th>
                  <th className="pb-3 px-3">وضعیت فعلی</th>
                  <th className="pb-3 px-3 text-center">عملیات فنی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">قطعه‌ای برای بررسی در کارتابل شما وجود ندارد.</td></tr>
                ) : (
                  requests.map(req => {
                    // بررسی اینکه آیا این درخواست از مرحله تایید قیمت مشتری عبور کرده است یا خیر
                    const isPriceApprovedByCustomer = ['accepted', 'repairing', 'estimated', 'pending_commercial', 'pending_finance', 'invoiced'].includes(req.status);

                    return (
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
  {getStatusBadge(req.status)}
</td>
                        <td className="py-4 px-3 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {req.status === 'pending_supervisor' && (
                              <button onClick={() => handleStatusChange(req.id, 'waiting_for_device', req.profiles?.phone, req.tracking_code)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">پذیرش و ارسال پیامک</button>
                            )}
                            {req.status === 'repairing' && (
                              <button onClick={() => openReportModal(req)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors w-full flex justify-center items-center gap-1">
                                <FileText size={14} /> ثبت گزارش و اتمام
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* مودال ثبت گزارش کار و قطعات مصرفی */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ثبت گزارش کار و پایان تعمیر</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد: {selectedRequest.tracking_code} | دستگاه: {selectedRequest.device_info}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">گزارش فنی سرپرست <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4} 
                  value={supervisorReport} 
                  onChange={(e) => setSupervisorReport(e.target.value)} 
                  placeholder="شرح عملیات انجام شده روی دستگاه را بنویسید..." 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary resize-none text-sm" 
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-4">لیست قطعات مصرفی یا تعویضی (اختیاری)</label>
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={newPartName} 
                    onChange={e => setNewPartName(e.target.value)} 
                    placeholder="نام قطعه (مثلا: خازن ۱۰۰ میکرو)" 
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-primary text-sm" 
                  />
                  <input 
                    type="number" 
                    min="1" 
                    value={newPartQty} 
                    onChange={e => setNewPartQty(parseInt(e.target.value) || 1)} 
                    className="w-20 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-primary text-sm text-center" 
                    dir="ltr"
                  />
                  <button onClick={handleAddPart} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center">
                    <Plus size={18} />
                  </button>
                </div>

                {parts.length > 0 && (
                  <ul className="space-y-2">
                    {parts.map((p, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm">
                        <span className="font-bold text-slate-700">{p.part_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{p.quantity} عدد</span>
                          <button onClick={() => handleRemovePart(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={submitReportAndParts} 
                  disabled={isSubmittingReport} 
                  className="flex-1 py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2"
                >
                  {isSubmittingReport ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                  ثبت نهایی و ارجاع به مدیر مرکز
                </button>
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="px-6 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تغییر رمز عبور</h3>
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
                <button type="submit" disabled={isUpdatingPassword} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors text-sm">ثبت رمز جدید</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}