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
    // دریافت اطلاعات برای وضعیت‌های اصلی پنل تعمیرات و QC
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .in('status', [
        'pending_supervisor', 
        'waiting_for_device', 
        'repairing',
        'pending_qc',
        'pending_supervisor_approval'
      ])
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت اطلاعات مانیتورینگ');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  // ترجمه و نمایش دقیق نام مراحل بر اساس فرآیند داخلی واحد تعمیر
  const getStatusText = (req: any) => {
    switch (req.status) {
      case 'pending_supervisor': return 'منتظر بررسی';
      case 'waiting_for_device': return 'در انتظار دستگاه';
      case 'pending_qc': return 'در انتظار تست QC';
      case 'pending_supervisor_approval': return 'تایید گزارش';
      case 'repairing': return req.technician_id ? 'در حال تعمیر' : 'نیازمند ارجاع به کارشناس';
      default: return req.status;
    }
  };

  const filteredRequests = requests.filter(r => 
    r.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.device_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.personnel_users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.status === 'pending_qc' && 'qc'.includes(searchTerm.toLowerCase()))
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
            <span className="text-xs text-slate-400 hidden sm:inline">ناظر: {profile?.full_name || 'همکار گرامی'}</span>
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
            <h2 className="text-xl font-bold text-white">تجهیزات فعال ارجاع‌شده به واحد تعمیرات</h2>
            <span className="bg-brand-primary text-slate-950 font-black px-3 py-0.5 rounded-full text-xs">{filteredRequests.length} دستگاه</span>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="جستجو با کد پیگیری، نام تکنسین یا سریال..." 
              className="w-full pr-10 pl-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary transition-colors"
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
                  <th className="py-4 px-4 text-center">کارشناس مسئول </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">در حال بارگذاری اطلاعات مانیتورینگ...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">هیچ دستگاهی با این مشخصات در کارتابل واحد تعمیرات یافت نشد.</td></tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-brand-light" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-4 font-bold text-white">{req.device_info}</td>
                      <td className="py-4 px-4 font-mono text-slate-300" dir="ltr">{req.serial_number || '---'}</td>
                      <td className="py-4 px-4">
                        <span className="bg-brand-primary/10 text-brand-light border border-brand-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                          {getStatusText(req)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {req.status === 'pending_qc' ? (
                          <div className="inline-flex items-center gap-2 text-purple-300 bg-purple-500/20 px-3 py-1 rounded-lg border border-purple-500/30">
                            <span className="font-bold">QC</span>
                          </div>
                        ) : req.personnel_users?.full_name ? (
                          <div className="inline-flex items-center gap-2 text-slate-200">
                            <Wrench size={14} className="text-orange-400" />
                            <span className="font-bold">{req.personnel_users.full_name}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs font-bold bg-slate-700/50 px-3 py-1.5 rounded-lg border border-slate-600/50 inline-block">
                            ارجاع نشده
                          </div>
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
    </div>
  );
}