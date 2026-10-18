import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Home, Plus, List, Edit, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Loader2, LogOut, Search, Check, FileText, Wrench } from 'lucide-react';
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
}

export default function CustomerPanelPage() {
  const { profile, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState('');

  // فرم ثبت درخواست جدید
  const [formData, setFormData] = useState({
    device_info: '',
    brand: '',
    serial_number: '',
    part_number: '',
    project_name: '',
    fault_description: '',
    needs_price_estimate: false,
  });

  useEffect(() => {
    if (profile) {
      if (!profile.full_name) {
        setShowProfileModal(true);
      } else {
        fetchRequests();
      }
    }
  }, [profile]);

  const fetchRequests = async () => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('خطا در دریافت لیست درخواست‌ها');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    if (!fullName) return toast.error('نام و نام خانوادگی الزامی است');
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, company_name: companyName })
        .eq('id', profile.id);
        
      if (error) throw error;
      toast.success('اطلاعات شما با موفقیت ثبت شد');
      setShowProfileModal(false);
      fetchRequests();
      window.location.reload();
    } catch (error) {
      toast.error('خطا در ثبت اطلاعات');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      return toast.error('خطا: شناسه کاربری یافت نشد. لطفاً دوباره وارد شوید.');
    }
    
    if (!formData.device_info || !formData.fault_description) {
      return toast.error('نام دستگاه و شرح مشکل الزامی است');
    }
    
    setIsLoading(true);
    const trackingCode = `FIX-${Math.floor(100000 + Math.random() * 900000)}`;

    const finalDescription = formData.serial_number 
      ? `[شماره سریال: ${formData.serial_number}]\n${formData.fault_description}` 
      : formData.fault_description;

    try {
      const { error } = await supabase.from('repair_requests').insert([
        {
          customer_id: profile.id,
          tracking_code: trackingCode,
          device_info: formData.device_info,
          brand: formData.brand,
          fault_description: finalDescription,
          needs_price_estimate: formData.needs_price_estimate,
          status: 'pending_coordinator',
          part_number: formData.part_number,
          project_name: formData.project_name
        }
      ]);

      if (error) throw error;
      
      toast.success(`درخواست شما با کد پیگیری ${trackingCode} ثبت شد`);
      setFormData({ device_info: '', brand: '', serial_number: '', part_number: '', project_name: '', fault_description: '', needs_price_estimate: false });
      setActiveTab('list');
      fetchRequests();
    } catch (error: any) {
      console.error("Supabase Insert Error:", error);
      toast.error(error.message || 'خطا در ثبت درخواست');
    } finally {
      setIsLoading(false);
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
      fetchRequests();
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
      fetchRequests();
    } catch (error) {
      toast.error('خطا در حذف درخواست');
      console.error(error);
    }
  };

  const handleCustomerApproval = async (id: string, isApproved: boolean) => {
    if (!confirm(isApproved ? 'آیا قیمت حدودی را تایید می‌کنید؟ درخواست جهت هماهنگی و تعمیر ارجاع داده می‌شود.' : 'آیا از تعمیر این دستگاه انصراف می‌دهید؟')) return;
    
    setIsLoading(true);
    try {
      const newStatus = isApproved ? 'pending_supervisor' : 'canceled_by_customer';
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(isApproved ? 'هزینه تایید شد و دستگاه وارد روند تعمیر گردید.' : 'درخواست تعمیر لغو شد.');
      fetchRequests();
    } catch (err: any) {
      toast.error('خطا در ثبت وضعیت: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> ثبت اولیه</span>;
      case 'pending_ceo_initial': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> در حال برآورد هزینه</span>;
      case 'pending_customer_approval': return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse"><AlertCircle size={14}/> منتظر تایید شما (قیمت)</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> انصراف مشتری</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Wrench size={14}/> در حال بررسی تکنسین</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> در انتظار دریافت دستگاه</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> دریافت و پذیرش شد</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> عدم پذیرش</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> در حال تعمیر</span>;
      case 'estimated': 
      case 'pending_commercial': 
      case 'pending_finance': 
        return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> در حال محاسبه فاکتور نهایی</span>;
      case 'invoiced': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><FileText size={14}/> فاکتور صادر شد (در انتظار پرداخت)</span>;
      case 'pending_commercial_checkout': return <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> پرداخت تایید شد</span>;
      case 'ready_for_delivery': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> آماده تحویل</span>;
      case 'pending_ceo_final': return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check size={14}/> تحویل داده شد (در انتظار بستن پرونده)</span>;
      case 'completed': return <span className="bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پایان کار</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const renderWorkflowSteps = (currentStatus: string) => {
    const steps = [
      { id: 'registered', label: 'ثبت و بررسی اولیه', desc: 'درخواست ثبت شده و در حال بررسی یا اعلام هزینه است' },
      { id: 'acceptance', label: 'دریافت دستگاه و پذیرش', desc: 'در انتظار رسیدن دستگاه شما به مرکز و تایید تکنسین' },
      { id: 'repairing', label: 'در حال تعمیر', desc: 'دستگاه شما توسط متخصصین در حال عیب‌یابی و تعمیر است' },
      { id: 'invoiced', label: 'صدور فاکتور و تسویه', desc: 'تعمیرات پایان یافته و فاکتور نهایی صادر شده است' },
      { id: 'completed', label: 'آماده تحویل و پایان کار', desc: 'پرداخت تایید شده و دستگاه آماده‌ی تحویل می‌باشد' },
    ];

    let activeIndex = 0;
    
    // وضعیت‌های لغو شده و رد شده
    const isCanceled = currentStatus === 'canceled_by_customer';
    const isRejected = currentStatus === 'rejected';
    const isFailed = isCanceled || isRejected;

    if (!isFailed) {
      if (['waiting_for_device', 'pending_supervisor', 'accepted'].includes(currentStatus)) activeIndex = 1;
      else if (currentStatus === 'repairing') activeIndex = 2;
      else if (['estimated', 'pending_commercial', 'pending_finance', 'invoiced'].includes(currentStatus)) activeIndex = 3;
      else if (['pending_commercial_checkout', 'ready_for_delivery', 'pending_ceo_final', 'completed'].includes(currentStatus)) activeIndex = 4;
    } else {
      // اگر در مرحله تایید قیمت انصراف دهد در مرحله اول متوقف می‌شود، اگر تکنسین رد کند در مرحله دوم
      activeIndex = isCanceled ? 0 : 1;
    }

    return (
      <div className="space-y-6 my-6" dir="rtl">
        <h4 className="font-bold text-slate-800 text-base mb-4">مراحل زنجیره تعمیر و خدمات</h4>
        <div className="space-y-4 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {steps.map((step, idx) => {
            const isCompleted = (idx < activeIndex || currentStatus === 'completed') && !isFailed;
            const isCurrent = idx === activeIndex && currentStatus !== 'completed';
            const isErrorState = isFailed && idx === activeIndex;

            return (
              <div key={step.id} className="relative flex items-start gap-4 pr-10">
                <div className={`absolute right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                  isErrorState ? 'bg-red-500 text-white' :
                  isCompleted ? 'bg-emerald-500 text-white' : 
                  isCurrent ? 'bg-brand-primary text-white animate-pulse' : 
                  'bg-slate-200 text-slate-500'
                }`}>
                  {isErrorState ? <XCircle size={14} /> : isCompleted ? <Check size={14} /> : idx + 1}
                </div>
                <div>
                  <h5 className={`font-bold text-sm ${isCurrent || isCompleted || isErrorState ? 'text-slate-800' : 'text-slate-400'}`}>
                    {isErrorState ? (isCanceled ? 'انصراف مشتری از تعمیر' : 'دستگاه توسط تکنسین رد شد') : step.label}
                  </h5>
                  <p className="text-xs text-slate-500 mt-0.5">
                     {isErrorState ? 'درخواست در این مرحله متوقف و لغو گردید.' : step.desc}
                  </p>
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
      
      <header className="bg-brand-dark text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold tracking-wider">فیکسیز</span>
            <span className="bg-white/10 px-3 py-1 rounded-lg text-sm font-medium">پنل مشتری</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { window.location.href = '/'; }} 
              className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition-colors"
            >
              <Home size={16} /> بازگشت به سایت
            </button>
            <button 
              onClick={() => logout()} 
              className="flex items-center gap-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-3 py-2 rounded-xl transition-colors"
              title="خروج از حساب"
            >
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">خوش آمدید، {profile?.full_name || 'کاربر گرامی'}</h2>
            <p className="text-slate-500 text-sm mt-1">شماره موبایل: {profile?.phone}</p>
          </div>
        </div>

        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md">
          <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> پیگیری درخواست‌ها
          </button>
          <button onClick={() => setActiveTab('new')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Plus size={18} /> ثبت درخواست جدید
          </button>
        </div>

        {activeTab === 'new' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">فرم ثبت درخواست تعمیر</h3>
            <form onSubmit={handleSubmitRequest} className="space-y-6">
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

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <input type="checkbox" id="estimate" checked={formData.needs_price_estimate} onChange={e => setFormData({...formData, needs_price_estimate: e.target.checked})} className="mt-1 w-5 h-5 rounded text-brand-primary focus:ring-brand-primary" />
                <div>
                  <label htmlFor="estimate" className="font-bold text-amber-900 block cursor-pointer">نیاز به برآورد قیمت پیش از تعمیر دارم</label>
                  <p className="text-sm text-amber-700 mt-1">با انتخاب این گزینه، هزینه حدودی برای شما ارسال می‌شود تا در صورت تایید، فرآیند تعمیر آغاز شود.</p>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full md:w-auto px-8 py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                ثبت نهایی درخواست
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading && requests.length === 0 ? (
              <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto h-8 w-8 mb-2" /> در حال دریافت اطلاعات...</div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><List className="text-slate-400" size={32} /></div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">هیچ درخواستی ثبت نشده است</h3>
                <p className="text-slate-500">برای شروع، از طریق تب «ثبت درخواست جدید» اقدام کنید.</p>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col gap-4 transition-hover hover:border-brand-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-bold text-slate-800">{req.device_info}</h4>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold" dir="ltr">{req.tracking_code}</span>
                        <span>{req.brand || 'بدون برند'}</span>
                        <span dir="ltr">{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-2">{req.fault_description}</p>
                      {req.needs_price_estimate && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-bold mt-1">
                          <AlertCircle size={14} /> درخواست برآورد قیمت
                        </span>
                      )}
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

                  {/* کادر تایید برآورد قیمت اولیه توسط مشتری */}
                  {req.status === 'pending_customer_approval' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h5 className="font-bold text-amber-900 text-sm mb-1">اعلام برآورد هزینه اولیه توسط مدیر مرکز:</h5>
                        <p className="text-2xl font-black text-amber-600 font-mono" dir="ltr">{req.estimated_price?.toLocaleString()} ریال</p>
                        <p className="text-xs text-amber-700 mt-1">جهت ادامه فرآیند و شروع تعمیرات، لطفاً هزینه اعلام شده را تایید فرمایید.</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => handleCustomerApproval(req.id, true)}
                          className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                        >
                          تایید هزینه و شروع تعمیر
                        </button>
                        <button 
                          onClick={() => handleCustomerApproval(req.id, false)}
                          className="flex-1 md:flex-none px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition-colors"
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}

                  {/* کادر اطلاع‌رسانی فاکتور (در صورت نیاز به پرداخت) */}
                  {req.status === 'invoiced' && req.final_price && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <h5 className="font-bold text-blue-900 text-sm mb-1">مبلغ نهایی فاکتور تعمیر:</h5>
                        <p className="text-xl font-black text-blue-700 font-mono" dir="ltr">{req.final_price.toLocaleString()} ریال</p>
                      </div>
                      <span className="text-xs bg-white border border-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold">در انتظار پرداخت</span>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* مدال ویرایش درخواست */}
      {editingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">ویرایش درخواست تعمیر</h3>
            <form onSubmit={handleUpdateEditRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">نام دستگاه</label>
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">نام پروژه/ارجاع کار</label>
                  <input 
                    type="text" 
                    value={editFormData.project_name} 
                    onChange={e => setEditFormData({...editFormData, project_name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">شرح مشکل</label>
                  <textarea 
                    rows={3} 
                    required 
                    value={editFormData.fault_description} 
                    onChange={e => setEditFormData({...editFormData, fault_description: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary resize-none" 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="edit_estimate" 
                  checked={editFormData.needs_price_estimate} 
                  onChange={e => setEditFormData({...editFormData, needs_price_estimate: e.target.checked})} 
                  className="w-4 h-4 rounded text-brand-primary" 
                />
                <label htmlFor="edit_estimate" className="text-sm font-bold text-slate-700 cursor-pointer">نیاز به برآورد قیمت پیش از تعمیر دارم</label>
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

      {/* مدال جزئیات و مراحل پیگیری */}
      {selectedTrackingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
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

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-100 text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">تکمیل اطلاعات کاربری</h2>
              <p className="text-slate-500 text-sm">برای استفاده از خدمات سامانه، لطفاً اطلاعات زیر را یک‌بار تکمیل کنید.</p>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نام و نام خانوادگی <span className="text-red-500">*</span></label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary" placeholder="مثال: علی احمدی" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نام شرکت (اختیاری)</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary" placeholder="مثال: پتروشیمی زاگرس" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : 'ثبت اطلاعات و ورود به پنل'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}