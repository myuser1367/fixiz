import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Home, Plus, List, Edit, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RepairRequest {
  id: string;
  tracking_code: string;
  device_name: string;
  brand: string;
  serial_number: string;
  problem_desc: string;
  needs_estimate: boolean;
  status: string;
  created_at: string;
}

export default function CustomerPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // مودال تکمیل اطلاعات پروفایل
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState('');

  // فرم ثبت درخواست
  const [formData, setFormData] = useState({
    device_name: '',
    brand: '',
    serial_number: '',
    problem_desc: '',
    needs_estimate: false,
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
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('repair_requests')
        .select('*')
        .eq('customer_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('خطا در دریافت لیست درخواست‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return toast.error('نام و نام خانوادگی الزامی است');
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, company_name: companyName })
        .eq('id', profile?.id);
      if (error) throw error;
      toast.success('اطلاعات شما با موفقیت ثبت شد');
      setShowProfileModal(false);
      fetchRequests();
      window.location.reload(); // برای آپدیت کانتکست
    } catch (error) {
      toast.error('خطا در ثبت اطلاعات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.device_name || !formData.problem_desc) {
      return toast.error('نام دستگاه و شرح مشکل الزامی است');
    }
    
    setIsLoading(true);
    // تولید کد پیگیری رندوم مثل FIX-123456
    const trackingCode = `FIX-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const { error } = await supabase.from('repair_requests').insert({
        customer_id: profile?.id,
        tracking_code: trackingCode,
        device_name: formData.device_name,
        brand: formData.brand,
        serial_number: formData.serial_number,
        problem_desc: formData.problem_desc,
        needs_estimate: formData.needs_estimate,
        status: 'registered'
      });

      if (error) throw error;
      toast.success(`درخواست شما با کد پیگیری ${trackingCode} ثبت شد`);
      setFormData({ device_name: '', brand: '', serial_number: '', problem_desc: '', needs_estimate: false });
      setActiveTab('list');
      fetchRequests();
    } catch (error) {
      toast.error('خطا در ثبت درخواست');
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
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered': return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> ثبت اولیه</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={14}/> پذیرش شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> عدم پذیرش</span>;
      case 'repairing': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Loader2 size={14} className="animate-spin"/> در حال تعمیر</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      
      {/* هدر پنل */}
      <header className="bg-brand-dark text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold tracking-wider">فیکسیز</span>
            <span className="bg-white/10 px-3 py-1 rounded-lg text-sm font-medium">پنل مشتری</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Home size={18} /> بازگشت به سایت
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* اطلاعات کاربر */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">خوش آمدید، {profile?.full_name || 'کاربر گرامی'}</h2>
            <p className="text-slate-500 text-sm mt-1">شماره موبایل: {profile?.phone}</p>
          </div>
        </div>

        {/* تب‌ها */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md">
          <button onClick={() => setActiveTab('list')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> پیگیری درخواست‌ها
          </button>
          <button onClick={() => setActiveTab('new')} className={`flex-1 py-2.5 flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Plus size={18} /> ثبت درخواست جدید
          </button>
        </div>

        {/* محتوای تب‌ها */}
        {activeTab === 'new' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">فرم ثبت درخواست تعمیر</h3>
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اسم قطعه یا دستگاه <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.device_name} onChange={e => setFormData({...formData, device_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors" placeholder="مثال: درایو موتور زیمنس" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">برند سازنده</label>
                  <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors" placeholder="مثال: Siemens" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">شماره سریال دستگاه</label>
                  <input type="text" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors text-left" dir="ltr" placeholder="S/N: 123456789" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">شرح کامل مشکل <span className="text-red-500">*</span></label>
                  <textarea required rows={4} value={formData.problem_desc} onChange={e => setFormData({...formData, problem_desc: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary transition-colors resize-none" placeholder="لطفاً مشکل دستگاه را به صورت کامل و دقیق توضیح دهید..." />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <input type="checkbox" id="estimate" checked={formData.needs_estimate} onChange={e => setFormData({...formData, needs_estimate: e.target.checked})} className="mt-1 w-5 h-5 rounded text-brand-primary focus:ring-brand-primary" />
                <div>
                  <label htmlFor="estimate" className="font-bold text-amber-900 block cursor-pointer">نیاز به برآورد قیمت پیش از تعمیر دارم</label>
                  <p className="text-sm text-amber-700 mt-1">با انتخاب این گزینه، هماهنگ‌کننده پیش از پذیرش نهایی، هزینه حدودی را برای شما ارسال می‌کند تا در صورت تایید، فرآیند تعمیر آغاز شود.</p>
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
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-hover hover:border-brand-300">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-slate-800">{req.device_name}</h4>
                      {getStatusBadge(req.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold" dir="ltr">{req.tracking_code}</span>
                      <span>{req.brand || 'بدون برند'}</span>
                      <span dir="ltr">{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-2">{req.problem_desc}</p>
                    {req.needs_estimate && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-bold mt-1">
                        <AlertCircle size={14} /> درخواست برآورد قیمت
                      </span>
                    )}
                  </div>
                  
                  {/* دکمه‌های عملیات فقط برای وضعیت ثبت اولیه */}
                  {req.status === 'registered' && (
                    <div className="flex items-center gap-2 md:flex-col shrink-0">
                      <button className="flex-1 md:w-full px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                        <Edit size={16} /> ویرایش
                      </button>
                      <button onClick={() => handleDelete(req.id)} className="flex-1 md:w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* مودال تکمیل پروفایل در اولین ورود */}
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