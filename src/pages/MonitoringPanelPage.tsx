import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Activity, Wrench, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MonitoringPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchActiveRequests();
    const interval = setInterval(fetchActiveRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveRequests = async () => {
    setIsLoading(true);
    // فیلتر کردن دقیق بر اساس وضعیت‌هایی که در کارتابل سرپرست تعمیر قرار دارد
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .in('status', ['pending_supervisor', 'accepted', 'waiting_for_device', 'repairing'])
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت اطلاعات مانیتورینگ');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  // ترجمه کامل و فارسی وضعیت‌ها برای جلوگیری از نمایش کلمات انگلیسی
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return 'ثبت اولیه';
      case 'pending_supervisor': return 'بررسی سرپرست';
      case 'waiting_for_device': return 'در انتظار دریافت دستگاه';
      case 'accepted': return 'پذیرش شده';
      case 'repairing': return 'در حال تعمیر';
      case 'estimated': return 'برآورد هزینه';
      case 'pending_commercial': return 'در انتظار بازرگانی';
      case 'pending_finance': return 'در انتظار واحد مالی';
      case 'invoiced': return 'فاکتور شده';
      case 'completed': return 'پایان کار';
      case 'rejected': return 'عدم پذیرش';
      default: return status;
    }
  };

  const filteredRequests = requests.filter(r => 
    r.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.device_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-vazir" dir="rtl">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/20 p-2.5 rounded-xl text-brand-primary">
              <Activity size={26} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">مانیتورینگ لحظه‌ای تعمیرات</h1>
              <span className="text-xs text-brand-primary font-bold">سامانه فرافن</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">ناظر: {profile?.full_name || 'همکار گرامی'}</span>
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">تجهیزات فعال ارجاع‌شده به سرپرست تعمیر</h2>
            <span className="bg-brand-primary text-slate-950 font-black px-3 py-0.5 rounded-full text-xs">{requests.length} دستگاه</span>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="جستجو با کد پیگیری، نام یا سریال..." 
              className="w-full pr-10 pl-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase bg-slate-800/50">
                  <th className="py-4 px-4">کد پیگیری (TR)</th>
                  <th className="py-4 px-4">نام دستگاه / تجهیز</th>
                  <th className="py-4 px-4">شماره سریال (S/N)</th>
                  <th className="py-4 px-4">وضعیت فعلی</th>
                  <th className="py-4 px-4">کارشناس مسئول </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">در حال بارگذاری اطلاعات مانیتورینگ...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">هیچ دستگاه فعالی در کارتابل سرپرست تعمیر یافت نشد.</td></tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-brand-light" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-4 font-bold text-white">{req.device_info}</td>
                      <td className="py-4 px-4 font-mono text-slate-300" dir="ltr">{req.serial_number || '---'}</td>
                      <td className="py-4 px-4">
                        <span className="bg-brand-primary/10 text-brand-light border border-brand-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                          {getStatusText(req.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 flex items-center gap-2 text-slate-300">
                        <Wrench size={16} className="text-orange-400" />
                        <span>سرپرست تعمیر (سروش آبیار)</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}