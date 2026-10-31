import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, BarChart3, FileSpreadsheet, Search, Filter, Printer, PieChart, X, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function MonitoringManagerPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت‌های مودال و فیلترها
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);

  // استیت‌های مودال نمودار
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [chartField, setChartField] = useState<'status' | 'date'>('status');

  // استیت‌های مودال مشاهده جزئیات در پنل مانیتورینگ
  const [viewRequest, setViewRequest] = useState<any | null>(null);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت گزارشات');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const isRequestUnrepairable = (req: any) => {
    return Boolean(req?.is_unrepairable || req?.supervisor_report?.includes('[دستگاه غیرقابل تعمیر اعلام شد]'));
  };

  const handleOpenDetailsModal = async (req: any) => {
    setViewRequest(req);
    setIsFetchingParts(true);
    const { data, error } = await supabase.from('repair_parts').select('*').eq('request_id', req.id);
    if (!error && data && data.length > 0) {
      setPartsList(data);
    } else if (Array.isArray(req.used_parts) && req.used_parts.length > 0) {
      setPartsList(req.used_parts);
    } else {
      setPartsList([]);
    }
    setIsFetchingParts(false);
  };

  // ترجمه کامل و فارسی وضعیت‌ها
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return 'ثبت اولیه';
      case 'pending_ceo_initial': return 'برآورد اولیه مدیر';
      case 'pending_customer_approval': return 'در انتظار تایید مشتری';
      case 'canceled_by_customer': return 'لغو توسط مشتری';
      case 'pending_supervisor': return 'بررسی سرپرست';
      case 'waiting_for_device': return 'در انتظار دریافت دستگاه';
      case 'accepted': return 'پذیرش شده';
      case 'repairing': return 'در حال تعمیر';
      case 'pending_qc': return 'در انتظار تست QC';
      case 'pending_supervisor_approval': return 'منتظر تایید نهایی سرپرست';
      case 'estimated': return 'برآورد هزینه نهایی';
      case 'pending_commercial': return 'در انتظار بازرگانی';
      case 'pending_finance': return 'در انتظار واحد مالی';
      case 'invoiced': return 'فاکتور شده';
      case 'pending_commercial_checkout': return 'تایید مالی';
      case 'ready_for_delivery': return 'آماده تحویل';
      case 'pending_ceo_final': return 'تایید نهایی مدیر';
      case 'completed': return 'پایان کار';
      case 'rejected': return 'عدم پذیرش';
      default: return status;
    }
  };

  // فیلتر کردن پیشرفته داده‌ها
  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (req.tracking_code && req.tracking_code.toLowerCase().includes(searchLower)) ||
      (req.device_info && req.device_info.toLowerCase().includes(searchLower)) ||
      (req.profiles?.full_name && req.profiles.full_name.toLowerCase().includes(searchLower));
      
    let matchesDate = true;
    const reqDate = new Date(req.created_at).getTime();
    if (startDate) {
      matchesDate = matchesDate && reqDate >= startDate.toDate().setHours(0,0,0,0);
    }
    if (endDate) {
      matchesDate = matchesDate && reqDate <= endDate.toDate().setHours(23,59,59,999);
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  // خروجی اکسل با تنظیم عرض ستون‌ها و راست‌چین
  const exportToExcel = () => {
    const headers = ['ردیف', 'کد پیگیری', 'نام دستگاه', 'شماره سریال', 'مشتری', 'وضعیت', 'مبلغ نهایی (ریال)', 'تاریخ ثبت'];
    
    const rows = filteredRequests.map((req, idx) => [
      (idx + 1).toString(),
      req.tracking_code || '---',
      req.device_info || '---',
      req.serial_number || '---',
      req.profiles?.full_name || 'ناشناس',
      getStatusText(req.status),
      (req.final_price || 0).toString(),
      new Date(req.created_at).toLocaleDateString('fa-IR')
    ]);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // تنظیم عرض ستون‌ها بر اساس محتوا
    const colWidths = headers.map((_, colIndex) => {
      const maxLength = Math.max(...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0)));
      return { wch: maxLength + 5 }; // +5 برای فاصله حاشیه
    });

    worksheet['!cols'] = colWidths;
    worksheet['!views'] = [{ RTL: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارشات سامانه');
    XLSX.writeFile(workbook, 'گزارش_مدیریت.xlsx');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setStartDate(null);
    setEndDate(null);
    setIsFilterModalOpen(false);
  };

  // پردازش داده‌ها برای نمودار
  const generateChartData = () => {
    const dataMap: Record<string, number> = {};
    filteredRequests.forEach(req => {
      let key = '';
      if (chartField === 'status') {
        key = getStatusText(req.status);
      } else if (chartField === 'date') {
        key = new Date(req.created_at).toLocaleDateString('fa-IR');
      }
      if (key) {
        dataMap[key] = (dataMap[key] || 0) + 1;
      }
    });
    return Object.entries(dataMap).map(([label, value]) => ({ label, value }));
  };

  const chartData = generateChartData();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

  // تولید گرادیان برای نمودار دایره‌ای (Pie)
  let currentAngle = 0;
  const pieSlices = chartData.map((d, i) => {
    const percentage = (d.value / (filteredRequests.length || 1)) * 100;
    const slice = `${chartColors[i % chartColors.length]} ${currentAngle}% ${currentAngle + percentage}%`;
    currentAngle += percentage;
    return slice;
  }).join(', ');

  const handlePrintChart = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-vazir" dir="rtl">
      {/* در زمان پرینت، هدر مخفی می‌شود */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/20 p-2.5 rounded-xl text-brand-primary">
              <BarChart3 size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">مانیتورینگ و گزارش‌گیری مدیر</h1>
              <span className="text-xs text-brand-primary font-bold">مدیریت کلان سیستم</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden md:inline">ناظر: {profile?.full_name || 'مدیر'}</span>
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 print:hidden">
        
        {/* نوار ابزار (دکمه‌های فیلتر، نمودار و خروجی) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button onClick={() => setIsFilterModalOpen(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <Filter size={18} /> فیلتر پیشرفته
              {(searchQuery || statusFilter !== 'all' || startDate || endDate) && (
                <span className="bg-brand-primary text-slate-900 w-2 h-2 rounded-full inline-block mr-1 animate-pulse"></span>
              )}
            </button>
            <button onClick={() => setIsChartModalOpen(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <PieChart size={18} /> نمودار گرافیکی
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold">
              تعداد نتایج: <span className="text-brand-primary">{filteredRequests.length}</span>
            </span>
            <button onClick={exportToExcel} className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
              <FileSpreadsheet size={18} /> خروجی اکسل
            </button>
          </div>
        </div>

        {/* جدول گزارشات در تم تاریک */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase bg-slate-800/50">
                  <th className="py-4 px-4">کد پیگیری</th>
                  <th className="py-4 px-4">نام تجهیز</th>
                  <th className="py-4 px-4">درخواست‌کننده</th>
                  <th className="py-4 px-4">وضعیت</th>
                  <th className="py-4 px-4">مبلغ نهایی (ریال)</th>
                  <th className="py-4 px-4">تاریخ ثبت</th>
                  <th className="py-4 px-4 text-center">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">موردی با این فیلترها یافت نشد.</td></tr>
                ) : (
                  filteredRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-brand-light" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-white">{req.device_info}</div>
                        {isRequestUnrepairable(req) && (
                          <span className="inline-block mt-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[11px] font-bold">
                            ⚠️ اعلام غیرقابل تعمیر
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-300">{req.profiles?.full_name || '---'}</td>
                      <td className="py-4 px-4">
                        <span className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-600">
                          {getStatusText(req.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400" dir="ltr">{req.final_price ? req.final_price.toLocaleString() : '---'}</td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-400" dir="ltr">{new Date(req.created_at).toLocaleDateString('fa-IR')}</td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleOpenDetailsModal(req)} 
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 border border-slate-600"
                        >
                          <Search size={14} /> مشاهده جزئیات
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* مودال مشاهده جزئیات کامل در پنل مانیتورینگ مدیر */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-800 text-slate-100 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-slate-700 animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="border-b border-slate-700 pb-4 mb-5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">جزئیات کامل پرونده تعمیرات</h3>
                <p className="text-sm text-brand-primary font-mono mt-1" dir="ltr">{viewRequest.tracking_code}</p>
              </div>
              <button onClick={() => setViewRequest(null)} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 font-bold">✕</button>
            </div>

            <div className="space-y-5">
              {/* مشخصات تجهیز */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">مشخصات دستگاه و درخواست‌کننده</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">نام تجهیز:</span> <strong className="text-white">{viewRequest.device_info}</strong></div>
                  <div><span className="text-slate-400">برند سازنده:</span> <strong className="text-white">{viewRequest.brand || '---'}</strong></div>
                  <div><span className="text-slate-400">پارت نامبر:</span> <strong className="font-mono text-white" dir="ltr">{viewRequest.part_number || '---'}</strong></div>
                  <div><span className="text-slate-400">شماره سریال:</span> <strong className="font-mono text-white" dir="ltr">{viewRequest.serial_number || '---'}</strong></div>
                  <div><span className="text-slate-400">درخواست‌کننده:</span> <strong className="text-white">{viewRequest.profiles?.full_name || '---'}</strong></div>
                  <div><span className="text-slate-400">وضعیت فعلی:</span> <strong className="text-brand-primary">{getStatusText(viewRequest.status)}</strong></div>
                  <div className="sm:col-span-2"><span className="text-slate-400">نام پروژه / ارجاع:</span> <strong className="text-white">{viewRequest.project_name || '---'}</strong></div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-slate-400 text-xs block mb-1">شرح مشکل اولیه:</span>
                  <p className="text-xs text-slate-200 bg-slate-800 p-3 rounded-xl border border-slate-700 leading-relaxed">{viewRequest.fault_description}</p>
                </div>
              </div>

              {/* گزارش تکنسین و قطعات مصرفی */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
                  <div className="text-xs">
                    <span className="text-slate-400">تکنسین انجام‌دهنده: </span>
                    <strong className="text-white">👨‍🔧 {viewRequest.personnel_users?.full_name || 'تعیین نشده'}</strong>
                  </div>
                  {isRequestUnrepairable(viewRequest) ? (
                    <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs font-bold border border-red-500/30">
                      <AlertTriangle size={14} /> اعلام شده به عنوان غیرقابل تعمیر
                    </span>
                  ) : viewRequest.supervisor_report ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/30">
                      تعمیر شده (قابل تعمیر)
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-xs font-bold text-blue-400 block mb-1">گزارش فنی تکنسین:</span>
                  <p className="text-xs text-slate-200 bg-slate-800 p-3 rounded-xl border border-slate-700 leading-relaxed whitespace-pre-wrap">
                    {viewRequest.supervisor_report || 'گزارشی ثبت نشده است.'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-blue-400 block mb-1">قطعات مصرفی ثبت‌شده توسط تکنسین:</span>
                  {isFetchingParts ? (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={14} className="animate-spin"/> در حال دریافت قطعات...</div>
                  ) : partsList.length === 0 ? (
                    <div className="text-xs text-slate-400 bg-slate-800 p-2.5 rounded-xl border border-slate-700">هیچ قطعه‌ای ثبت نشده است.</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {partsList.map((part: any, idx: number) => (
                        <li key={part.id || idx} className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-xs">
                          <span className="font-bold text-slate-200">{part.part_name}</span>
                          <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">{part.quantity} عدد</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* گزارش و فایل کنترل کیفیت (QC) */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-2.5">
                  <span className="text-xs font-bold text-purple-400">نتیجه و گزارش کنترل کیفیت (QC):</span>
                  {viewRequest.qc_status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/30">
                      <CheckCircle size={14} /> مورد تایید QC
                    </span>
                  ) : viewRequest.qc_status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-500/30">
                      <XCircle size={14} /> عدم تایید QC
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">ثبت نشده</span>
                  )}
                </div>

                <p className="text-xs text-slate-200 bg-slate-800 p-3 rounded-xl border border-slate-700 leading-relaxed whitespace-pre-wrap">
                  {viewRequest.qc_report || 'گزارشی توسط واحد QC ثبت نشده است.'}
                </p>

                {viewRequest.qc_file_url && (
                  <div>
                    <a 
                      href={viewRequest.qc_file_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm"
                    >
                      <FileText size={15} /> مشاهده فایل / مستندات تست QC
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setViewRequest(null)} className="w-full mt-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors text-sm">
              بستن پنجره
            </button>
          </div>
        </div>
      )}

      {/* مودال فیلتر پیشرفته */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-700 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Filter size={20}/> فیلتر پیشرفته گزارشات</h3>
              <button onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">جستجو (کد پیگیری یا نام مشتری)</label>
                <div className="relative">
                  <Search className="absolute right-3 top-3.5 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="جستجو..." 
                    className="w-full pr-10 pl-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">وضعیت درخواست</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary">
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="pending_coordinator">ثبت اولیه (هماهنگی)</option>
                  <option value="pending_supervisor">در انتظار بررسی سرپرست</option>
                  <option value="repairing">در حال تعمیر</option>
                  <option value="pending_qc">در انتظار تست QC</option>
                  <option value="pending_supervisor_approval">منتظر تایید سرپرست</option>
                  <option value="estimated">برآورد هزینه شده</option>
                  <option value="pending_finance">در انتظار واحد مالی</option>
                  <option value="invoiced">فاکتور شده</option>
                  <option value="ready_for_delivery">آماده تحویل</option>
                  <option value="completed">پایان کار / تحویل شده</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">از تاریخ ثبت</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="انتخاب تاریخ"
                    inputClass="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">تا تاریخ ثبت</label>
                  <DatePicker
                    calendar={persian}
                    locale={persian_fa}
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="انتخاب تاریخ"
                    inputClass="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-brand-primary font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-500 text-slate-900 rounded-xl font-bold transition-colors">
                اعمال فیلتر
              </button>
              <button onClick={clearFilters} className="px-6 py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors">
                پاک کردن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال نمودار گرافیکی - قابل چاپ */}
      {isChartModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          {/* پنل تنظیمات نمودار - فقط روی صفحه نمایش داده می‌شود (هنگام چاپ مخفی می‌شود) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap gap-4 items-center shadow-xl print:hidden z-10 w-full max-w-3xl justify-between">
             <div className="flex gap-4 items-center">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">محور دسته‌بندی:</label>
                  <select value={chartField} onChange={(e) => setChartField(e.target.value as any)} className="bg-slate-900 text-white text-sm border border-slate-700 rounded-lg px-3 py-1.5 outline-none">
                    <option value="status">بر اساس وضعیت</option>
                    <option value="date">بر اساس تاریخ ثبت</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">نوع نمودار:</label>
                  <select value={chartType} onChange={(e) => setChartType(e.target.value as any)} className="bg-slate-900 text-white text-sm border border-slate-700 rounded-lg px-3 py-1.5 outline-none">
                    <option value="bar">نمودار میله‌ای (Bar)</option>
                    <option value="pie">نمودار دایره‌ای (Pie)</option>
                  </select>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={handlePrintChart} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                  <Printer size={16}/> چاپ نمودار
                </button>
                <button onClick={() => setIsChartModalOpen(false)} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-2 rounded-lg">
                  <X size={18}/>
                </button>
             </div>
          </div>

          {/* محتوای اصلی نمودار (روی صفحه و در نسخه چاپی نمایش داده می‌شود) */}
          <div className="bg-white text-slate-900 p-8 rounded-3xl w-full max-w-4xl shadow-2xl relative mt-20 print:mt-0 print:shadow-none print:bg-white" id="chart-print-area">
             <div className="text-center mb-10 border-b pb-6">
                <h2 className="text-2xl font-black text-slate-800">نمودار گزارشات سامانه فرافن</h2>
                <p className="text-slate-500 mt-2 font-medium">گزارش آماری بر اساس: {chartField === 'status' ? 'وضعیت درخواست‌ها' : 'تاریخ ثبت'}</p>
                <p className="text-xs text-slate-400 mt-1">تعداد کل رکوردهای فیلترشده: {filteredRequests.length}</p>
             </div>

             {chartData.length === 0 ? (
               <div className="text-center py-20 text-slate-400">داده‌ای برای نمایش نمودار وجود ندارد.</div>
             ) : (
               <div className="flex justify-center">
                 {chartType === 'bar' ? (
                   <div className="w-full space-y-4">
                     {chartData.map((d, i) => (
                       <div key={i} className="flex items-center gap-4">
                         <div className="w-1/3 text-left text-sm font-bold text-slate-700 truncate" title={d.label}>{d.label}</div>
                         <div className="w-2/3 flex items-center gap-3">
                           <div className="h-6 rounded-full bg-slate-100 flex-1 relative overflow-hidden">
                             <div 
                               className="absolute top-0 right-0 h-full rounded-full transition-all duration-1000 ease-out"
                               style={{ 
                                 width: `${(d.value / maxChartValue) * 100}%`,
                                 backgroundColor: chartColors[i % chartColors.length]
                               }}
                             ></div>
                           </div>
                           <span className="font-mono font-black text-slate-800 w-8">{d.value}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="flex flex-col md:flex-row items-center gap-10">
                     {/* نمودار دایره‌ای با CSS */}
                     <div 
                       className="w-64 h-64 rounded-full shadow-inner border-4 border-slate-50"
                       style={{ background: `conic-gradient(${pieSlices})` }}
                     ></div>
                     
                     <div className="grid grid-cols-1 gap-3">
                       {chartData.map((d, i) => (
                         <div key={i} className="flex items-center gap-3 text-sm">
                           <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: chartColors[i % chartColors.length] }}></span>
                           <span className="font-bold text-slate-700">{d.label}</span>
                           <span className="font-mono text-slate-500 bg-slate-100 px-2 rounded">({d.value}) - {((d.value/filteredRequests.length)*100).toFixed(1)}%</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}