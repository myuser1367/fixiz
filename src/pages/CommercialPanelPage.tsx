import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Key, ShoppingCart, Plus, CheckCircle, Loader2, List, Clock, Wrench, XCircle, AlertCircle, FileText, Check, Search, Edit, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface RepairRequest {
  id: string;
  tracking_code: string;
  device_info: string;
  brand: string;
  fault_description: string;
  needs_price_estimate: boolean;
  status: string;
  created_at: string;
  estimated_price?: number;
  final_price?: number;
  part_number?: string;
  project_name?: string;
  customer_id?: string;
}

export default function CommercialPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'my_requests' | 'new_request'>('queue');
  
  const [queueRequests, setQueueRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // آیدی صحیح و منطبق با دیتابیس شما برای واحد بازرگانی
  const COMMERCIAL_CUSTOMER_ID = 'c78297a5-bb21-4701-b289-203d5ea50acb';

  const [formData, setFormData] = useState({
    device_info: '',
    brand: '',
    serial_number: '',
    part_number: '',
    project_name: '',
    fault_description: '',
    needs_price_estimate: false,
  });

  const [selectedTrackingReq, setSelectedTrackingReq] = useState<RepairRequest | null>(null);
  const [editingReq, setEditingReq] = useState<RepairRequest | null>(null);
  const [editFormData, setEditFormData] = useState({
    device_info: '',
    brand: '',
    fault_description: '',
    needs_price_estimate: false,
    part_number: '',
    project_name: '',
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // ۱. دریافت کارتابل بازرگانی (در انتظار تایید قیمت اولیه + در انتظار تایید خروج پس از پرداخت مالی)
    const { data: queueData, error: queueError } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .in('status', ['pending_commercial', 'pending_commercial_checkout'])
      .order('created_at', { ascending: false });
      
    if (queueError) toast.error('خطا در دریافت کارتابل');
    else setQueueRequests(queueData || []);

    // ۲. دریافت درخواست‌های ثبت شده توسط واحد بازرگانی (بر اساس آیدی دقیق دیتابیس)
    const { data: myData, error: myError } = await supabase
      .from('repair_requests')
      .select('*')
      .eq('customer_id', COMMERCIAL_CUSTOMER_ID)
      .order('created_at', { ascending: false });
        
    if (myError) {
      toast.error('خطا در دریافت درخواست‌های شما');
      setMyRequests([]);
    } else {
      setMyRequests(myData || []);
    }

    setIsLoading(false);
  };

  const handleApprovePrice = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'pending_finance' })
        .eq('id', id);

      if (error) throw error;
      toast.success('قیمت تایید شد و درخواست به واحد مالی ارجاع یافت');
      fetchData();
    } catch (err: any) {
      toast.error('خطا در تایید درخواست: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalApproval = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'ready_for_delivery' })
        .eq('id', id);

      if (error) throw error;
      toast.success('تاییدیه نهایی صادر شد و درخواست جهت ثبت خروج ارجاع داده شد');
      fetchData();
    } catch (err: any) {
      toast.error('خطا در تایید نهایی: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.device_info || !formData.fault_description) return toast.error('نام دستگاه و شرح مشکل الزامی است');
    
    setIsSubmitting(true);
    const trackingCode = `FIX-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // اصلاح: حذف عبارت "ثبت شده توسط واحد بازرگانی" از متن شرح مشکل
    const finalDescription = (formData.serial_number ? `[شماره سریال: ${formData.serial_number}]\n` : '') + formData.fault_description;

    try {
      const { error } = await supabase.from('repair_requests').insert([
        {
          customer_id: COMMERCIAL_CUSTOMER_ID,
          tracking_code: trackingCode,
          device_info: formData.device_info,
          brand: formData.brand,
          fault_description: finalDescription,
          needs_price_estimate: formData.needs_price_estimate,
          status: 'pending_coordinator',
          part_number: formData.part_number,
          project_name: formData.project_name ? `[بازرگانی] ${formData.project_name}` : '[بازرگانی] ثبت سازمانی'
        }
      ]);

      if (error) throw error;
      
      toast.success(`درخواست سازمانی شما با کد پیگیری ${trackingCode} ثبت شد`);
      setFormData({ device_info: '', brand: '', serial_number: '', part_number: '', project_name: '', fault_description: '', needs_price_estimate: false });
      setActiveTab('my_requests');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ثبت درخواست');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (req: RepairRequest) => {
    setEditingReq(req);
    setEditFormData({
      device_info: req.device_info,
      brand: req.brand || '',
      fault_description: req.fault_description,
      needs_price_estimate: req.needs_price_estimate,
      part_number: req.part_number || '',
      project_name: req.project_name || '',
    });
  };

  const handleUpdateEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({
          device_info: editFormData.device_info,
          brand: editFormData.brand,
          fault_description: editFormData.fault_description,
          needs_price_estimate: editFormData.needs_price_estimate,
          part_number: editFormData.part_number,
          project_name: editFormData.project_name
        })
        .eq('id', editingReq.id);

      if (error) throw error;

      toast.success('درخواست با موفقیت ویرایش شد');
      setEditingReq(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ویرایش درخواست');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این درخواست مطمئن هستید؟')) return;
    try {
      const { error } = await supabase.from('repair_requests').delete().eq('id', id);
      if (error) throw error;
      toast.success('درخواست با موفقیت حذف شد');
      fetchData();
    } catch (error) {
      toast.error('خطا در حذف درخواست');
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
      case 'pending_ceo_initial': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> در حال برآورد (مدیر مرکز)</span>;
      case 'pending_customer_approval': return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse"><AlertCircle size={14}/> منتظر تایید شما (قیمت)</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> انصراف</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Wrench size={14}/> در حال بررسی / پذیرش</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> در انتظار دریافت دستگاه</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پذیرش شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> عدم پذیرش</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> در حال تعمیر</span>;
      case 'estimated': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> برآورد هزینه نهایی</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShoppingCart size={14}/> در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText size={14}/> در انتظار واحد مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText size={14}/> آماده تحویل (فاکتور صادر شد)</span>;
      case 'pending_commercial_checkout': return <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShoppingCart size={14}/> تایید مالی - ارجاع به بازرگانی</span>;
      case 'ready_for_delivery': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> در انتظار ثبت خروج</span>;
      case 'pending_ceo_final': return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> در انتظار تایید نهایی مدیریت</span>;
      case 'completed': return <span className="bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پایان کار</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const renderWorkflowSteps = (currentStatus: string) => {
    const steps = [
      { id: 'registered', label: 'ثبت درخواست', desc: 'درخواست توسط واحد بازرگانی ثبت شد' },
      { id: 'acceptance', label: 'پذیرش یا عدم پذیرش', desc: 'بررسی اولیه توسط واحد هماهنگی و سرپرست' },
      { id: 'repairing', label: 'در حال تعمیر', desc: 'تکنسین در حال عیب‌یابی و تعمیر دستگاه است' },
      { id: 'estimation', label: 'برآورد هزینه', desc: 'محاسبه قطعات مصرفی و اعلام قیمت' },
      { id: 'invoiced', label: 'تسویه و خروج', desc: 'آماده تحویل، تسویه حساب و پایان کار' },
    ];

    let activeIndex = 0;
    if (['pending_supervisor', 'accepted', 'waiting_for_device'].includes(currentStatus)) activeIndex = 1;
    else if (currentStatus === 'repairing') activeIndex = 2;
    else if (['estimated', 'pending_commercial', 'pending_finance'].includes(currentStatus)) activeIndex = 3;
    else if (['invoiced', 'pending_commercial_checkout', 'ready_for_delivery', 'pending_ceo_final', 'completed'].includes(currentStatus)) activeIndex = 4;
    else if (currentStatus === 'rejected') activeIndex = 1;

    return (
      <div className="space-y-6 my-6" dir="rtl">
        <h4 className="font-bold text-slate-800 text-base mb-4">مراحل زنجیره تعمیر و خدمات</h4>
        <div className="space-y-4 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIndex || currentStatus === 'completed';
            const isCurrent = idx === activeIndex && currentStatus !== 'completed';
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

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700">
              <ShoppingCart size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه فیکسیز</h1>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">واحد بازرگانی</span>
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
        
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-2xl mx-auto md:mx-0 flex-col sm:flex-row gap-1">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <ShoppingCart size={18} /> کارتابل تاییدیه 
            {queueRequests.length > 0 && <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('new_request')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'new_request' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Plus size={18} /> ثبت درخواست جدید
          </button>
          <button onClick={() => setActiveTab('my_requests')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'my_requests' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> درخواست‌های من
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">درخواست‌های در انتظار تایید قطعات و تایید خروج</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                    <th className="pb-3 px-3">کد پیگیری</th>
                    <th className="pb-3 px-3">دستگاه و قطعه</th>
                    <th className="pb-3 px-3">مبلغ (تومان)</th>
                    <th className="pb-3 px-3">وضعیت</th>
                    <th className="pb-3 px-3 text-center">عملیات بازرگانی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto h-6 w-6 mb-2" />در حال دریافت اطلاعات...</td></tr>
                  ) : queueRequests.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400">موردی برای تایید در کارتابل شما وجود ندارد.</td></tr>
                  ) : (
                    queueRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                        </td>
                        <td className="py-4 px-3 font-mono font-bold text-blue-700 text-lg" dir="ltr">
                          {req.final_price ? req.final_price.toLocaleString() : '---'}
                        </td>
                        <td className="py-4 px-3">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {req.status === 'pending_commercial' ? (
                            <button 
                              onClick={() => handleApprovePrice(req.id)} 
                              className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                            >
                              <CheckCircle size={16} /> تایید قیمت و ارسال به مالی
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleFinalApproval(req.id)} 
                              className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                            >
                              <Send size={16} /> تایید خروج 
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
        )}

        {activeTab === 'new_request' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-4xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">فرم ثبت درخواست تعمیر سازمانی</h3>
            <form onSubmit={handleSubmitNewRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم قطعه یا دستگاه (Unit Name) <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.device_info} onChange={e => setFormData({...formData, device_info: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors" placeholder="مثال: درایو موتور زیمنس" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">برند سازنده (اختیاری)</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors" placeholder="مثال: Siemens" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">پارت نامبر (Unit Part Number) (اختیاری)</label>
                  <input type="text" value={formData.part_number} onChange={e => setFormData({...formData, part_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors text-left" dir="ltr" placeholder="P/N: 6SL3210..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره سریال (S/N) (اختیاری)</label>
                  <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors text-left" dir="ltr" placeholder="S/N: 123456789" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام پروژه / ارجاع کار (اختیاری)</label>
                  <input type="text" value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors" placeholder="مثال: پروژه خط تولید شماره ۲" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">شرح کامل مشکل <span className="text-red-500">*</span></label>
                  <textarea required rows={4} value={formData.fault_description} onChange={e => setFormData({...formData, fault_description: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors resize-none" placeholder="لطفاً مشکل دستگاه را به صورت کامل و دقیق توضیح دهید..." />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                ثبت درخواست 
              </button>
            </form>
          </div>
        )}

        {activeTab === 'my_requests' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6">درخواست‌های ثبت‌شده توسط شما</h2>
            {isLoading && myRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto h-8 w-8 mb-2" /> در حال دریافت اطلاعات...</div>
            ) : myRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><List className="text-slate-400" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">هیچ درخواستی ثبت نکرده‌اید</h3>
              </div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col gap-4 transition-hover hover:border-brand-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-slate-800">{req.device_info}</h4>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-bold" dir="ltr">{req.tracking_code}</span>
                        <span>{req.brand || 'بدون برند'}</span>
                        <span className="bg-slate-50 px-2.5 py-1 rounded border border-slate-100">{req.project_name || 'بدون پروژه'}</span>
                        <span dir="ltr">{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
                      </div>
<p className="text-sm text-slate-600 line-clamp-2 mt-2"><span className="font-bold text-slate-500">شرح مشکل:</span> {req.fault_description?.replace('ثبت شده توسط واحد بازرگانی', '').trim()}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 md:flex-col shrink-0">
                      <button 
                        onClick={() => setSelectedTrackingReq(req)}
                        className="flex-1 md:w-full px-4 py-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                      >
                        <Search size={16} /> پیگیری مراحل
                      </button>

                      {req.status === 'pending_coordinator' && (
                        <>
                          <button 
                            onClick={() => handleOpenEdit(req)}
                            className="flex-1 md:w-full px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors"
                          >
                            <Edit size={16} /> ویرایش
                          </button>
                          <button 
                            onClick={() => handleDelete(req.id)} 
                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-colors" 
                            title="حذف درخواست"
                          >
                            <Trash2 size={16} /> حذف
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* مدال ویرایش درخواست */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">ویرایش درخواست تعمیر</h3>
            <form onSubmit={handleUpdateEditRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">اسم قطعه یا دستگاه</label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.device_info} 
                    onChange={e => setEditFormData({...editFormData, device_info: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">برند سازنده</label>
                  <input 
                    type="text" 
                    value={editFormData.brand} 
                    onChange={e => setEditFormData({...editFormData, brand: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">پارت نامبر</label>
                  <input 
                    type="text" 
                    value={editFormData.part_number} 
                    onChange={e => setEditFormData({...editFormData, part_number: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary font-mono" dir="ltr"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">نام پروژه / ارجاع کار</label>
                  <input 
                    type="text" 
                    value={editFormData.project_name} 
                    onChange={e => setEditFormData({...editFormData, project_name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">شرح کامل مشکل</label>
                  <textarea 
                    rows={3} 
                    required 
                    value={editFormData.fault_description} 
                    onChange={e => setEditFormData({...editFormData, fault_description: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary resize-none" 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors">
                  {isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
                <button type="button" onClick={() => setEditingReq(null)} className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مدال پیگیری مراحل */}
      {selectedTrackingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedTrackingReq.device_info}</h3>
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold" dir="ltr">
                  {selectedTrackingReq.tracking_code}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTrackingReq(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">برند دستگاه:</span>
                  <span className="font-bold text-slate-700">{selectedTrackingReq.brand || 'تعیین نشده'}</span>
                </div>
                {selectedTrackingReq.part_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">پارت نامبر:</span>
                    <span className="font-bold text-slate-700 font-mono" dir="ltr">{selectedTrackingReq.part_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">تاریخ ثبت:</span>
                  <span className="font-mono font-bold text-slate-700" dir="ltr">{new Date(selectedTrackingReq.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">وضعیت کنونی:</span>
                  <span>{getStatusBadge(selectedTrackingReq.status)}</span>
                </div>
              </div>

              {renderWorkflowSteps(selectedTrackingReq.status)}
            </div>

            <button 
              onClick={() => setSelectedTrackingReq(null)} 
              className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              بستن پنجره پیگیری
            </button>
          </div>
        </div>
      )}

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