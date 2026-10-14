import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, FileSpreadsheet, Check, X, Calendar, Clock, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function CoordinatorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('repair_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('خطا در بروزرسانی وضعیت');
    } else {
      toast.success('وضعیت با موفقیت تغییر کرد');
      fetchRequests();
    }
  };

  const handleDateTimeUpdate = async (id: string, field: 'received_at' | 'delivered_at', dateVal: string, timeVal: string) => {
    let combinedDateTime = null;
    if (dateVal) {
      const time = timeVal || '00:00';
      combinedDateTime = new Date(`${dateVal}T${time}:00`).toISOString();
    }
    
    const { error } = await supabase
      .from('repair_requests')
      .update({ [field]: combinedDateTime })
      .eq('id', id);

    if (error) {
      toast.error('خطا در ثبت تاریخ و ساعت');
    } else {
      toast.success('اطلاعات زمان با موفقیت ثبت شد');
      fetchRequests();
    }
  };

  const exportToExcel = () => {
    const headers = ['ردیف', 'نام پروژه / ارجاع کار', 'نام تجهیز (Unit Name)', 'پارت نامبر', 'کارخانه سازنده', 'کد پیگیری (TR)', 'شماره سریال', 'نام مشتری', 'وضعیت کنونی', 'تاریخ دریافت', 'تاریخ تحویل'];
    
    const rows = requests.map((req, index) => {
      const rDate = req.received_at ? new Date(req.received_at).toLocaleDateString('fa-IR') : '---';
      const dDate = req.delivered_at ? new Date(req.delivered_at).toLocaleDateString('fa-IR') : '---';
      return [
        index + 1,
        req.project_name || '---',
        req.device_info,
        req.part_number || '---',
        req.brand || '---',
        req.tracking_code,
        req.serial_number || '---',
        req.profiles?.full_name || 'نامشخص',
        req.status,
        rDate,
        dDate
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet['!views'] = [{ RTL: true, rightToLeft: true }];
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, 
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش هماهنگی');
    XLSX.writeFile(workbook, 'گزارش_واحد_هماهنگی.xlsx');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه فیکسیز</h1>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">واحد هماهنگی</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-slate-500 hidden md:inline">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            <button onClick={exportToExcel} className="flex items-center gap-1.5 text-xs sm:text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <FileSpreadsheet size={16} /> خروجی اکسل
            </button>
            <button onClick={() => { window.location.href = '/'; }} className="flex items-center gap-1.5 text-sm sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
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
            <h2 className="text-xl font-bold text-slate-800">مدیریت و پیگیری درخواست‌ها</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{requests.length} درخواست</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">وضعیت فعلی</th>
                  <th className="pb-3 px-3">تاریخ و ساعت ورود / خروج قطعه</th>
                  <th className="pb-3 px-3 text-center">عملیات هماهنگی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">هیچ درخواستی ثبت نشده است.</td></tr>
                ) : (
                  requests.map(req => {
                    const receivedObj = req.received_at ? new Date(req.received_at) : null;
                    const deliveredObj = req.delivered_at ? new Date(req.delivered_at) : null;
                    
                    const recDate = receivedObj ? receivedObj.toISOString().split('T')[0] : '';
                    const recTime = receivedObj ? receivedObj.toTimeString().slice(0, 5) : '';
                    
                    const delDate = deliveredObj ? deliveredObj.toISOString().split('T')[0] : '';
                    const delTime = deliveredObj ? deliveredObj.toTimeString().slice(0, 5) : '';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.profiles?.full_name || 'بدون نام'}</div>
                          <div className="text-xs font-mono text-slate-500" dir="ltr">{req.profiles?.phone}</div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                          {req.needs_price_estimate && <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">نیاز به برآورد قیمت دارد</span>}
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            req.status === 'pending_coordinator' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {req.status === 'pending_coordinator' ? 'در انتظار بررسی هماهنگی' : req.status}
                          </span>
                        </td>
                        <td className="py-4 px-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-bold w-12"><Calendar size={13} className="text-slate-400"/> ورود:</span>
                            <input 
                              type="date" 
                              defaultValue={recDate}
                              onBlur={(e) => handleDateTimeUpdate(req.id, 'received_at', e.target.value, recTime)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                            />
                            <input 
                              type="time" 
                              defaultValue={recTime}
                              onBlur={(e) => handleDateTimeUpdate(req.id, 'received_at', recDate, e.target.value)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                            />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-bold w-12"><Clock size={13} className="text-slate-400"/> خروج:</span>
                            <input 
                              type="date" 
                              defaultValue={delDate}
                              onBlur={(e) => handleDateTimeUpdate(req.id, 'delivered_at', e.target.value, delTime)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                            />
                            <input 
                              type="time" 
                              defaultValue={delTime}
                              onBlur={(e) => handleDateTimeUpdate(req.id, 'delivered_at', delDate, e.target.value)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                            />
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          {req.status === 'pending_coordinator' && (
                            <div className="flex flex-col items-center justify-center gap-2">
                              {req.needs_price_estimate ? (
                                <button 
                                  onClick={() => handleStatusChange(req.id, 'pending_ceo_initial')} 
                                  className="w-full p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs" 
                                >
                                  ارجاع به مدیر (جهت برآورد اولیه)
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleStatusChange(req.id, 'pending_supervisor')} 
                                  className="w-full p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs" 
                                >
                                  <Check size={16} /> ارجاع به سرپرست (جهت تعمیر)
                                </button>
                              )}
                              <button 
                                onClick={() => handleStatusChange(req.id, 'rejected')} 
                                className="w-full p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs" 
                              >
                                <X size={16} /> رد و عدم پذیرش
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
    </div>
  );
}