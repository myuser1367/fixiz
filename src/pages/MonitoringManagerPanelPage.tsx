import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, BarChart3, Filter, FileSpreadsheet, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function MonitoringManagerPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت‌های فیلتر
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت گزارشات');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return 'ثبت اولیه';
      case 'pending_supervisor': return 'بررسی سرپرست';
      case 'repairing': return 'در حال تعمیر';
      case 'completed': return 'پایان کار';
      case 'canceled_by_customer': return 'لغو شده';
      default: return status;
    }
  };

  // فیلتر کردن پیشرفته داده‌ها
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesSearch = 
      req.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.device_info?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
    let matchesDate = true;
    const reqDate = new Date(req.created_at).getTime();
    if (startDate) {
      matchesDate = matchesDate && reqDate >= new Date(startDate).getTime();
    }
    if (endDate) {
      matchesDate = matchesDate && reqDate <= new Date(endDate).getTime();
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  const exportToExcel = () => {
    const headers = ['ردیف', 'کد پیگیری', 'نام دستگاه', 'شماره سریال', 'مشتری', 'وضعیت', 'مبلغ نهایی (ریال)', 'تاریخ ثبت'];
    const rows = filteredRequests.map((req, idx) => [
      idx + 1,
      req.tracking_code,
      req.device_info,
      req.serial_number || '---',
      req.profiles?.full_name || 'ناشناس',
      getStatusText(req.status),
      req.final_price || 0,
      new Date(req.created_at).toLocaleDateString('fa-IR')
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!views'] = [{ RTL: true }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش مانیتورینگ مدیریت');
    XLSX.writeFile(workbook, 'monitoring_report.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2.5 rounded-xl text-purple-700">
              <BarChart3 size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">مانیتورینگ و گزارش‌گیری مدیر</h1>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">مدیریت کلان سیستم</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* پنل فیلترها */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">جستجو (کد پیگیری یا مشتری)</label>
            <input 
              type="text" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="جستجو..." 
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">وضعیت درخواست</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500 bg-white">
              <option value="all">همه وضعیت‌ها</option>
              <option value="pending_coordinator">ثبت اولیه</option>
              <option value="pending_supervisor">بررسی سرپرست</option>
              <option value="repairing">در حال تعمیر</option>
              <option value="completed">پایان کار</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">از تاریخ میلادی/شمسی</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-500 font-mono" />
          </div>
          <div className="flex items-end">
            <button onClick={exportToExcel} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
              <FileSpreadsheet size={18} /> خروجی اکسل گزارشات
            </button>
          </div>
        </div>

        {/* جدول گزارشات */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">نتایج گزارشات ({filteredRequests.length} مورد)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">نام تجهیز</th>
                  <th className="pb-3 px-3">درخواست‌کننده</th>
                  <th className="pb-3 px-3">وضعیت</th>
                  <th className="pb-3 px-3">مبلغ نهایی (ریال)</th>
                  <th className="pb-3 px-3">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">موردی با این فیلترها یافت نشد.</td></tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-4 px-3 font-mono font-bold text-purple-700" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-3 font-bold text-slate-800">{req.device_info}</td>
                      <td className="py-4 px-3 text-slate-600">{req.profiles?.full_name || '---'}</td>
                      <td className="py-4 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {getStatusText(req.status)}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-mono font-bold" dir="ltr">{req.final_price ? req.final_price.toLocaleString() : '---'}</td>
                      <td className="py-4 px-3 font-mono text-xs text-slate-500" dir="ltr">{new Date(req.created_at).toLocaleDateString('fa-IR')}</td>
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