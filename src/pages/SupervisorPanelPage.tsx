import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Wrench, Key, Search, CheckCircle, XCircle, UserPlus, List, CheckSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendUserNotification } from '../lib/notifications';

export default function SupervisorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'repairing'>('pending');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [reviewRequest, setReviewRequest] = useState<any | null>(null);
  const [assignRequest, setAssignRequest] = useState<any | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<any | null>(null);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();
  }, [activeTab]);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    // واکشی کل اطلاعات کارتابل سرپرست بدون فیلتر اولیه سفت و سخت
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    } else if (data) {
      if (activeTab === 'pending') {
        // وضعیت‌هایی که در کارتابل ارجاع نمایش داده می‌شوند
        const pendingReqs = data.filter(req => 
          ['pending_supervisor', 'waiting_for_device', 'pending_supervisor_approval', 'canceled_by_customer', 'rejected', 'unrepairable'].includes(req.status) || 
          (req.status === 'repairing' && !req.technician_id) // دستگاهی که تعمیر شروع شده ولی تکنسین ندارد
        );
        setRequests(pendingReqs);
      } else {
        // دستگاه‌هایی که فقط دست تکنسین هستند
        const repairingReqs = data.filter(req => 
          req.status === 'repairing' && req.technician_id
        );
        setRequests(repairingReqs);
      }
    }
    setIsLoading(false);
  };

  const fetchTechnicians = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('roles')
        .select('role_key')
        .ilike('role_label', '%تکنسین%');

      const techRoleKeys = rolesData ? rolesData.map((r: any) => r.role_key) : [];

      const { data, error } = await supabase
        .from('personnel_users')
        .select('id, full_name, role');

      if (!error && data) {
        const filteredTechs = data.filter((u: any) => 
          techRoleKeys.includes(u.role) || u.role?.toLowerCase().includes('tec') || u.role?.toLowerCase().includes('تکنسین')
        );
        setTechnicians(filteredTechs.length > 0 ? filteredTechs : data);
      }
    } catch (err) {
      console.error("Error fetching technicians:", err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, customerPhone?: string, trackingCode?: string) => {
    const { error } = await supabase
      .from('repair_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('خطا در تغییر وضعیت');
    } else {
      toast.success(newStatus === 'rejected' ? 'درخواست رد شد' : 'وضعیت با موفقیت به‌روزرسانی شد');
      
      if (newStatus === 'waiting_for_device' && customerPhone) {
        await sendUserNotification({
          trackingCode: trackingCode || '',
          userMobile: customerPhone,
          status: 'accepted_waiting_device'
        });
        toast.success(`پیامک اطلاع‌رسانی ارسال دستگاه ارسال شد.`);
      }
      
      setReviewRequest(null);
      fetchRequests();
    }
  };

  const handleAssignToTechnician = async () => {
    if (!selectedTechnicianId) return toast.error('لطفاً یک تکنسین انتخاب کنید');
    
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ 
          technician_id: selectedTechnicianId,
          status: 'repairing' 
        })
        .eq('id', assignRequest.id);

      if (error) throw error;
      
      toast.success('دستگاه با موفقیت به تکنسین ارجاع داده شد و به تب در حال تعمیر منتقل گردید');
      setAssignRequest(null);
      setSelectedTechnicianId('');
      fetchRequests(); 
    } catch (err) {
      toast.error('خطا در ارجاع به تکنسین');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleApproveTechnicianWork = async () => {
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'estimated' })
        .eq('id', approvalRequest.id);

      if (error) throw error;
      
      toast.success('گزارش تکنسین تایید و برای اعلام قیمت به مدیر مرکز ارسال شد');
      setApprovalRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error('خطا در ثبت نهایی');
    } finally {
      setIsAssigning(false);
    }
  };

  // تابع تغییر رمز عبور که جا افتاده بود
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

  const getStatusBadge = (status: string, technicianId?: string) => {
    switch (status) {
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی شما</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">پذیرش شده / منتظر ورود فیزیکی</span>;
      case 'repairing': 
        return !technicianId 
          ? <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold">دستگاه رسیده - نیازمند ارجاع</span>
          : <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">در حال تعمیر</span>;
      case 'pending_supervisor_approval': return <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg text-xs font-bold">منتظر تایید گزارش تکنسین</span>;
      case 'unrepairable': return <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-lg text-xs font-bold">توسط تکنسین غیرقابل تعمیر اعلام شد</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-lg text-xs font-bold">رد شده (عدم پذیرش)</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">لغو شده توسط مشتری</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">{status}</span>;
    }
  };

  const FullRequestDetails = ({ req }: { req: any }) => (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mb-6" dir="rtl">
      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">مشخصات کامل تجهیز ارسالی</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div><span className="text-slate-400">نام تجهیز:</span> <strong className="text-slate-800">{req.device_info}</strong></div>
        <div><span className="text-slate-400">کارخانه سازنده:</span> <strong className="text-slate-800">{req.brand || 'ثبت نشده'}</strong></div>
        <div><span className="text-slate-400">پارت نامبر:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.part_number || 'ثبت نشده'}</strong></div>
        <div><span className="text-slate-400">شماره سریال:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.serial_number || 'ثبت نشده'}</strong></div>
        
        {req.tr_code && <div><span className="text-slate-400">TR کد:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.tr_code}</strong></div>}
        {req.delivery_list_number && <div><span className="text-slate-400">شماره لیست تحویل:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.delivery_list_number}</strong></div>}
        {req.email_group && <div><span className="text-slate-400">گروه ایمیل بازرگانی:</span> <strong className="text-slate-800">{req.email_group}</strong></div>}
        
        <div className="sm:col-span-2"><span className="text-slate-400">نام پروژه / ارجاع کار:</span> <strong className="text-slate-800">{req.project_name || 'ثبت نشده'}</strong></div>
        
        {req.needs_price_estimate && (
          <div className="sm:col-span-2 mt-1">
            <span className="inline-block bg-amber-100 text-amber-800 px-2.5 py-1 rounded font-bold border border-amber-200">
              ⚠️ این دستگاه نیاز به برآورد قیمت پیش از تعمیر نهایی دارد
            </span>
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-slate-200">
        <span className="text-slate-400 text-xs block mb-1">شرح کامل مشکل:</span>
        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">{req.fault_description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه تعمیرات فرافن </h1>
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

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 w-full max-w-md gap-1">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> کارتابل بررسی و ارجاع
          </button>
          <button onClick={() => setActiveTab('repairing')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'repairing' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Wrench size={18} /> در حال تعمیر 
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">{activeTab === 'pending' ? 'درخواست‌های نیازمند اقدام' : 'دستگاه‌های دست تکنسین‌ها'}</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{requests.length} مورد</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری / بازرگانی</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">وضعیت فعلی</th>
                  <th className="pb-3 px-3 text-center">{activeTab === 'pending' ? 'عملیات فنی' : 'تکنسین مسئول تعمیر'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">موردی یافت نشد.</td></tr>
                ) : (
                  requests.map(req => {
                    const isCommercial = req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام')}</div>
                          <div className="text-xs font-mono text-slate-500" dir="ltr">{isCommercial ? 'ثبت سازمانی' : (req.profiles?.phone || '---')}</div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'بدون برند'}</div>
                        </td>
                        <td className="py-4 px-3">
                          {getStatusBadge(req.status, req.technician_id)}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {activeTab === 'pending' ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              {req.status === 'pending_supervisor' && (
                                <button onClick={() => setReviewRequest(req)} className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5">
                                  <Search size={16} /> بررسی اولیه و پذیرش
                                </button>
                              )}
                              
                              {req.status === 'waiting_for_device' && (
                                <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">منتظر رسیدن فیزیکی دستگاه</span>
                              )}

                              {(req.status === 'repairing' && !req.technician_id) && (
                                <button onClick={() => {setAssignRequest(req); setSelectedTechnicianId('');}} className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5">
                                  <UserPlus size={16} /> ارجاع به تکنسین
                                </button>
                              )}

                              {req.status === 'pending_supervisor_approval' && (
                                <button onClick={() => setApprovalRequest(req)} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5">
                                  <CheckSquare size={16} /> بررسی گزارش و تایید
                                </button>
                              )}

                              {req.status === 'unrepairable' && (
                                <span className="text-xs text-red-500 font-bold">نیازمند بایگانی / خروج</span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs border border-indigo-100">
                              👨‍🔧 {req.personnel_users?.full_name || 'تکنسین تعیین‌شده'}
                            </span>
                          )}
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

      {reviewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">بررسی درخواست تعمیر</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد پیگیری: {reviewRequest.tracking_code}</p>
              </div>
              <button onClick={() => setReviewRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>
            <FullRequestDetails req={reviewRequest} />
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 mb-6 font-bold flex items-center gap-2">
              <Wrench size={18} className="shrink-0" /> آیا با بررسی اطلاعات فوق، تعمیر این دستگاه را می‌پذیرید؟
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleStatusChange(reviewRequest.id, 'waiting_for_device', reviewRequest.profiles?.phone, reviewRequest.tracking_code)} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 shadow-sm">
                <CheckCircle size={18} /> پذیرش (ارسال پیامک به مشتری)
              </button>
              <button onClick={() => {
                if (confirm('آیا از عدم پذیرش این دستگاه اطمینان دارید؟')) {
                  handleStatusChange(reviewRequest.id, 'rejected');
                }
              }} className="px-6 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                <XCircle size={18} /> عدم پذیرش
              </button>
            </div>
          </div>
        </div>
      )}

      {assignRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ارجاع دستگاه به تکنسین</h3>
            <p className="text-sm text-slate-500 mb-6">دستگاه "{assignRequest.device_info}" را به کدام تکنسین می‌سپارید؟</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">انتخاب تکنسین</label>
              <select 
                value={selectedTechnicianId} 
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary bg-slate-50 text-sm"
              >
                <option value="">-- یک تکنسین انتخاب کنید --</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAssignToTechnician} disabled={isAssigning || !selectedTechnicianId} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 text-sm">
                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} ارجاع و شروع تعمیر
              </button>
              <button onClick={() => setAssignRequest(null)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {approvalRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">بررسی نهایی گزارش تکنسین</h3>
            
            <FullRequestDetails req={approvalRequest} />

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm mt-4">
              <div className="mb-4">
                <span className="text-slate-400 block mb-1">گزارش کار تکنسین ({approvalRequest.personnel_users?.full_name}):</span>
                <p className="font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{approvalRequest.supervisor_report}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => handleApproveTechnicianWork()} disabled={isAssigning} className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                تایید گزارش تکنسین و ارجاع جهت اعلام هزینه
              </button>
            </div>
            <button onClick={() => setApprovalRequest(null)} className="w-full mt-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">بستن پنجره</button>
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