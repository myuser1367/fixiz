import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LogOut, Home, Wrench, Key, Search, CheckCircle, XCircle, 
  UserPlus, List, CheckSquare, Loader2, FileText, Plus, Trash2, Save, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendUserNotification } from '../lib/notifications';

export default function SupervisorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'repairing' | 'my_repairs'>('pending');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [reviewRequest, setReviewRequest] = useState<any | null>(null);
  const [assignRequest, setAssignRequest] = useState<any | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<any | null>(null);
  
  // استیت‌های نمایش جزئیات و قطعات در مدال تایید سرپرست
  const [viewRequest, setViewRequest] = useState<any | null>(null);
  const [approvalParts, setApprovalParts] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // استیت‌های مربوط به تب «تعمیرات من» (نقش تکنسین برای سرپرست)
  const [selectedTechRequest, setSelectedTechRequest] = useState<any | null>(null);
  const [technicianReport, setTechnicianReport] = useState('');
  const [parts, setParts] = useState<{ part_name: string; quantity: number }[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [isUnrepairable, setIsUnrepairable] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();
  }, [activeTab, profile?.id]);

  const fetchRequests = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    } else if (data) {
      if (activeTab === 'pending') {
        const pendingReqs = data.filter(req => 
          ['pending_supervisor', 'waiting_for_device', 'pending_supervisor_approval', 'canceled_by_customer', 'rejected', 'unrepairable'].includes(req.status) || 
          (req.status === 'repairing' && !req.technician_id)
        );
        setRequests(pendingReqs);
      } else if (activeTab === 'repairing') {
        const repairingReqs = data.filter(req => 
          req.status === 'repairing' && req.technician_id
        );
        setRequests(repairingReqs);
      } else if (activeTab === 'my_repairs') {
        const myRepairingReqs = data.filter(req => 
          req.status === 'repairing' && req.technician_id === profile?.id
        );
        setRequests(myRepairingReqs);
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
        let finalTechList = filteredTechs.length > 0 ? [...filteredTechs] : [...data];

        // اضافه کردن خود سرپرست به لیست تکنسین‌ها در صورتی که در لیست نباشد
        if (profile?.id && !finalTechList.some((t: any) => t.id === profile.id)) {
          finalTechList.unshift({
            id: profile.id,
            full_name: `${profile.full_name || 'سرپرست تعمیرات'} `,
            role: profile.role
          });
        }

        setTechnicians(finalTechList);
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
      
      toast.success('دستگاه با موفقیت به تکنسین ارجاع داده شد');
      setAssignRequest(null);
      setSelectedTechnicianId('');
      fetchRequests(); 
    } catch (err) {
      toast.error('خطا در ارجاع به تکنسین');
    } finally {
      setIsAssigning(false);
    }
  };

  // باز کردن مدال بررسی نهایی سرپرست و دریافت قطعات مصرفی تکنسین
  const handleOpenApproval = async (req: any) => {
    setApprovalRequest(req);
    setIsFetchingParts(true);
    const { data, error } = await supabase
      .from('repair_parts')
      .select('*')
      .eq('request_id', req.id);

    if (!error && data && data.length > 0) {
      setApprovalParts(data);
    } else if (Array.isArray(req.used_parts) && req.used_parts.length > 0) {
      setApprovalParts(req.used_parts);
    } else {
      setApprovalParts([]);
    }
    setIsFetchingParts(false);
  };

  // تایید نهایی سرپرست و ارسال به مدیر مرکز جهت اعلام هزینه
  const handleApproveTechnicianWork = async () => {
    if (!approvalRequest) return;
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'estimated' })
        .eq('id', approvalRequest.id);

      if (error) throw error;
      
      toast.success('گزارش تایید شد و برای اعلام هزینه و تایید به مدیر مرکز ارسال گردید');
      setApprovalRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error('خطا در ثبت نهایی');
    } finally {
      setIsAssigning(false);
    }
  };

  // ارجاع مجدد به همان تکنسین برای بررسی بیشتر
  const handleReturnToTechnician = async () => {
    if (!approvalRequest) return;
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ 
          status: 'repairing',
          technician_id: approvalRequest.technician_id 
        })
        .eq('id', approvalRequest.id);

      if (error) throw error;
      
      toast.success('درخواست جهت بررسی بیشتر مجدداً به کارتابل همان تکنسین ارجاع داده شد');
      setApprovalRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error('خطا در ارجاع مجدد به تکنسین');
    } finally {
      setIsAssigning(false);
    }
  };

  // توابع مربوط به عملیات تکنسین برای خود سرپرست (تب تعمیرات من)
  const openTechReportModal = async (req: any) => {
    setSelectedTechRequest(req);
    const rawReport = req.supervisor_report || '';
    const hasUnrepairablePrefix = rawReport.startsWith('[دستگاه غیرقابل تعمیر اعلام شد]');
    const cleanReport = rawReport.replace('[دستگاه غیرقابل تعمیر اعلام شد]\n', '').replace('[دستگاه غیرقابل تعمیر اعلام شد]', '');

    setTechnicianReport(cleanReport);
    setIsUnrepairable(Boolean(req.is_unrepairable || hasUnrepairablePrefix));

    const { data, error } = await supabase.from('repair_parts').select('*').eq('request_id', req.id);
    if (!error && data && data.length > 0) {
      setParts(data.map((p: any) => ({ part_name: p.part_name, quantity: p.quantity })));
    } else if (Array.isArray(req.used_parts) && req.used_parts.length > 0) {
      setParts(req.used_parts);
    } else {
      setParts([]);
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

  const submitSupervisorTechReport = async () => {
    if (!selectedTechRequest) return;
    if (!technicianReport.trim()) return toast.error('لطفاً گزارش کار را بنویسید');

    setIsSubmittingReport(true);
    try {
      const cleanReport = technicianReport.replace('[دستگاه غیرقابل تعمیر اعلام شد]\n', '').trim();
      const finalReport = isUnrepairable 
        ? `[دستگاه غیرقابل تعمیر اعلام شد]\n${cleanReport}`
        : cleanReport;

      let { error: reqError } = await supabase
        .from('repair_requests')
        .update({ 
          supervisor_report: finalReport,
          is_unrepairable: isUnrepairable,
          used_parts: parts,
          status: 'pending_qc' 
        })
        .eq('id', selectedTechRequest.id);

      // پشتیبانی در صورتی که ستون‌های جدید هنوز در SQL اضافه نشده باشند
      if (reqError && reqError.message?.includes('column')) {
        const { error: fallbackError } = await supabase
          .from('repair_requests')
          .update({ 
            supervisor_report: finalReport,
            status: 'pending_qc' 
          })
          .eq('id', selectedTechRequest.id);
        reqError = fallbackError;
      }
      
      if (reqError) throw reqError;

      // بروزرسانی جدول قطعات مصرفی
      await supabase.from('repair_parts').delete().eq('request_id', selectedTechRequest.id);
      if (parts.length > 0) {
        const partsToInsert = parts.map(p => ({
          request_id: selectedTechRequest.id,
          part_name: p.part_name,
          quantity: p.quantity,
        }));

        const { error: partsError } = await supabase
          .from('repair_parts')
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      toast.success('گزارش تعمیر شما ثبت شد و برای تست به واحد کنترل کیفیت (QC) ارسال گردید');
      setSelectedTechRequest(null);
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

  const isRequestUnrepairable = (req: any) => {
    return Boolean(req?.is_unrepairable || req?.supervisor_report?.includes('[دستگاه غیرقابل تعمیر اعلام شد]'));
  };

  const getStatusBadge = (status: string, technicianId?: string, qcStatus?: string) => {
    switch (status) {
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی شما</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">پذیرش شده / منتظر ورود فیزیکی</span>;
      case 'repairing': 
        return !technicianId 
          ? <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold">دستگاه رسیده - نیازمند ارجاع</span>
          : <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">در حال تعمیر</span>;
      case 'pending_supervisor_approval': 
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg text-xs font-bold">برگشت از QC - منتظر تصمیم سرپرست</span>
            {qcStatus === 'approved' && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold">تایید شده توسط QC</span>}
            {qcStatus === 'rejected' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[11px] font-bold">عدم تایید توسط QC</span>}
          </div>
        );
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
        <div className="flex flex-wrap bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 w-full max-w-2xl gap-1">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 px-3 flex justify-center items-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> کارتابل بررسی و ارجاع
          </button>
          <button onClick={() => setActiveTab('repairing')} className={`flex-1 py-3 px-3 flex justify-center items-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'repairing' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Wrench size={18} /> در حال تعمیر (همه)
          </button>
          <button onClick={() => setActiveTab('my_repairs')} className={`flex-1 py-3 px-3 flex justify-center items-center gap-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'my_repairs' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Wrench size={18} /> تعمیرات من (تکنسین)
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'pending' 
                ? 'درخواست‌های نیازمند اقدام سرپرست' 
                : activeTab === 'repairing' 
                ? 'دستگاه‌های دست تکنسین‌ها' 
                : 'کارتابل دستگاه‌های ارجاع‌شده به شما (تکنسین)'}
            </h2>
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
                  <th className="pb-3 px-3 text-center">
                    {activeTab === 'pending' ? 'عملیات فنی' : activeTab === 'repairing' ? 'تکنسین / عملیات' : 'عملیات تعمیر'}
                  </th>
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
                          {getStatusBadge(req.status, req.technician_id, req.qc_status)}
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
                                <button onClick={() => handleOpenApproval(req)} className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5">
                                  <CheckSquare size={16} /> بررسی گزارش تکنسین و QC
                                </button>
                              )}

                              {req.status === 'unrepairable' && (
                                <span className="text-xs text-red-500 font-bold">نیازمند اقدام / خروج</span>
                              )}
                            </div>
                          ) : activeTab === 'repairing' ? (
                            <div className="flex flex-col items-center gap-2">
                              <span className="inline-block bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs border border-indigo-100 w-full">
                                👨‍🔧 {req.personnel_users?.full_name || 'تکنسین تعیین‌شده'}
                              </span>
                              <button onClick={() => setViewRequest(req)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5">
                                <Search size={14} /> مشاهده جزئیات
                              </button>
                            </div>
                          ) : (
                            /* عملیات تب تعمیرات من (سرپرست در نقش تکنسین) */
                            <div className="flex flex-col gap-2">
                              <button onClick={() => setViewRequest(req)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5 shadow-sm">
                                <Search size={16} /> مشاهده جزئیات
                              </button>
                              <button onClick={() => openTechReportModal(req)} className="px-4 py-2 bg-brand-primary hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5 shadow-sm">
                                <FileText size={16} /> ثبت گزارش کار و ارسال به QC
                              </button>
                            </div>
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

      {/* مدال مشاهده جزئیات */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">جزئیات کامل درخواست</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد پیگیری: {viewRequest.tracking_code}</p>
              </div>
              <button onClick={() => setViewRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>
            <FullRequestDetails req={viewRequest} />
            <button onClick={() => setViewRequest(null)} className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">بستن پنجره</button>
          </div>
        </div>
      )}

      {/* مدال بررسی اولیه */}
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

      {/* مدال ارجاع به تکنسین (شامل نام خود سرپرست) */}
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

      {/* مدال بررسی نهایی گزارش تکنسین و تست QC توسط سرپرست */}
      {approvalRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">بررسی نهایی گزارش تکنسین و تست QC</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد پیگیری: {approvalRequest.tracking_code}</p>
              </div>
              <button onClick={() => setApprovalRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>
            
            <FullRequestDetails req={approvalRequest} />

            {/* بخش گزارش تکنسین و قطعات مصرفی */}
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4 text-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
                <div>
                  <span className="text-slate-500 text-xs">تکنسین انجام‌دهنده: </span>
                  <strong className="text-slate-800">👨‍🔧 {approvalRequest.personnel_users?.full_name || 'نامشخص'}</strong>
                </div>
                {isRequestUnrepairable(approvalRequest) ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">
                    <AlertTriangle size={14} /> اعلام شده به عنوان غیرقابل تعمیر توسط تکنسین
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                    اعلام شده به عنوان تعمیرشده (قابل تعمیر)
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">گزارش کار و توضیحات تکنسین:</span>
                <p className="font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap text-xs">
                  {approvalRequest.supervisor_report || 'گزارشی ثبت نشده است.'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-xs font-bold block mb-1">قطعات مصرفی ثبت‌شده توسط تکنسین:</span>
                {isFetchingParts ? (
                  <div className="text-xs text-slate-400">در حال دریافت لیست قطعات...</div>
                ) : approvalParts.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">هیچ قطعه‌ای ثبت نشده است.</div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {approvalParts.map((p: any, idx: number) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-700">{p.part_name}</span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">{p.quantity} عدد</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* نمایش اطلاعات، وضعیت تایید/عدم تایید و فایل QC */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 mb-6 text-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                <span className="text-purple-800 font-bold text-xs">نتیجه بررسی کنترل کیفیت (QC):</span>
                {approvalRequest.qc_status === 'approved' ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-200">
                    <CheckCircle size={14} /> مورد تایید واحد QC
                  </span>
                ) : approvalRequest.qc_status === 'rejected' ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-lg text-xs font-bold border border-red-200">
                    <XCircle size={14} /> عدم تایید واحد QC
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">بدون وضعیت</span>
                )}
              </div>

              <div>
                <span className="text-purple-700 text-xs font-bold block mb-1">متن گزارش تست QC:</span>
                <p className="text-slate-800 bg-white p-3 rounded-xl border border-purple-100 leading-relaxed text-xs whitespace-pre-wrap">
                  {approvalRequest.qc_report || 'توضیحاتی ثبت نشده است.'}
                </p>
              </div>

              {approvalRequest.qc_file_url && (
                <div>
                  <a 
                    href={approvalRequest.qc_file_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm"
                  >
                    <FileText size={16} /> مشاهده فایل / مستندات تست QC
                  </a>
                </div>
              )}
            </div>

            {/* دکمه‌های تصمیم‌گیری سرپرست: ارسال به مدیر مرکز یا بازگشت به تکنسین */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleApproveTechnicianWork} 
                disabled={isAssigning} 
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 text-xs sm:text-sm shadow-sm"
              >
                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                تایید و ارسال به مدیر مرکز (اعلام هزینه)
              </button>

              <button 
                onClick={handleReturnToTechnician} 
                disabled={isAssigning} 
                className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 text-xs sm:text-sm shadow-sm"
              >
                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                ارجاع مجدد به تکنسین (بررسی بیشتر)
              </button>
            </div>
            <button onClick={() => setApprovalRequest(null)} className="w-full mt-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">بستن پنجره</button>
          </div>
        </div>
      )}

      {/* مودال ثبت گزارش کار و قطعات مصرفی (مخصوص سرپرست در نقش تکنسین) */}
      {selectedTechRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ثبت گزارش کار و پایان تعمیر (توسط شما)</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد: {selectedTechRequest.tracking_code}</p>
              </div>
              <button onClick={() => setSelectedTechRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <FullRequestDetails req={selectedTechRequest} />

            {/* نمایش گزارش قبلی QC در صورتی که دستگاه برای بررسی مجدد برگشت خورده باشد */}
            {selectedTechRequest.qc_report && (
              <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 mb-6 text-xs space-y-1">
                <span className="font-bold text-purple-800 block">آخرین گزارش ثبت‌شده در QC:</span>
                <p className="text-slate-700">{selectedTechRequest.qc_report}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">گزارش فنی تعمیر <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4} 
                  value={technicianReport} 
                  onChange={(e) => setTechnicianReport(e.target.value)} 
                  placeholder="شرح عملیات انجام شده روی دستگاه را بنویسید..." 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary resize-none text-sm leading-relaxed" 
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="sup_unrepairable" 
                  checked={isUnrepairable} 
                  onChange={e => setIsUnrepairable(e.target.checked)} 
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-600 border-slate-300" 
                />
                <label htmlFor="sup_unrepairable" className="font-bold text-slate-700 cursor-pointer">
                  اعلام دستگاه به عنوان غیرقابل تعمیر
                </label>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-4">لیست قطعات مصرفی یا تعویضی (در صورت نیاز)</label>
                
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
                  <button type="button" onClick={handleAddPart} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center">
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
                          <button type="button" onClick={() => handleRemovePart(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={submitSupervisorTechReport} 
                  disabled={isSubmittingReport} 
                  className="flex-1 py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                  {isSubmittingReport ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                  ثبت نهایی و ارجاع به کنترل کیفیت (QC)
                </button>
                <button 
                  onClick={() => setSelectedTechRequest(null)} 
                  className="px-6 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
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