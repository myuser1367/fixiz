import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, FileSpreadsheet, Check, Calendar, Clock, Wrench, Activity, List, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function CoordinatorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // آیدی ثابتی که برای واحد بازرگانی در جدول profiles ایجاد شده است
  const COMMERCIAL_CUSTOMER_ID = 'c78297a5-bb21-4701-b289-20352ef29f73';

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

  const sendDeviceSendSms = (phone: string, trackingCode: string) => {
    console.log(`[SMS SIMULATION] To: ${phone} | Message: برآورد قیمت درخواست تعمیر شما با کد ${trackingCode} تایید شد. لطفاً دستگاه خود را ارسال نمایید. سامانه فرافن`);
  };

  const handleSaveDateTime = async (id: string, silent: boolean = false) => {
    const updateData: any = {};
    
    const recDateEl = document.getElementById(`recDate_${id}`) as HTMLInputElement;
    const recTimeEl = document.getElementById(`recTime_${id}`) as HTMLInputElement;
    if (recDateEl && recDateEl.value) {
        updateData.received_at = new Date(`${recDateEl.value}T${recTimeEl?.value || '00:00'}:00`).toISOString();
    } else if (recDateEl && !recDateEl.value) {
        updateData.received_at = null;
    }

    const delDateEl = document.getElementById(`delDate_${id}`) as HTMLInputElement;
    const delTimeEl = document.getElementById(`delTime_${id}`) as HTMLInputElement;
    if (delDateEl && delDateEl.value) {
        updateData.delivered_at = new Date(`${delDateEl.value}T${delTimeEl?.value || '00:00'}:00`).toISOString();
    } else if (delDateEl && !delDateEl.value) {
        updateData.delivered_at = null;
    }

    const { error } = await supabase.from('repair_requests').update(updateData).eq('id', id);
    
    if (error) {
      if (!silent) toast.error('خطا در ثبت زمان');
      return false;
    } else {
      if (!silent) {
        toast.success('زمان با موفقیت ثبت شد');
        fetchRequests();
      }
      return true;
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, customerPhone?: string, trackingCode?: string) => {
    await handleSaveDateTime(id, true);

    const { error } = await supabase
      .from('repair_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast.error('خطا در بروزرسانی وضعیت');
    } else {
      toast.success('وضعیت و زمان با موفقیت ثبت شد');
      if (newStatus === 'waiting_for_device' && customerPhone) {
        sendDeviceSendSms(customerPhone, trackingCode || '');
        toast.success(`پیامک درخواست ارسال دستگاه به شماره ${customerPhone} ارسال شد.`);
      }
      fetchRequests();
    }
  };

  const exportToExcel = () => {
    const headers = ['ردیف', 'نام پروژه / ارجاع کار', 'نام تجهیز (Unit Name)', 'پارت نامبر', 'کارخانه سازنده', 'کد پیگیری (TR)', 'شماره سریال', 'نام مشتری', 'وضعیت کنونی', 'تاریخ دریافت', 'تاریخ تحویل'];
    
    const rows = requests.map((req, index) => {
      const rDate = req.received_at ? new Date(req.received_at).toLocaleDateString('fa-IR') : '---';
      const dDate = req.delivered_at ? new Date(req.delivered_at).toLocaleDateString('fa-IR') : '---';
      const customerName = req.customer_id === COMMERCIAL_CUSTOMER_ID ? 'واحد بازرگانی' : (req.profiles?.full_name || 'نامشخص');
      return [
        index + 1,
        req.project_name || '---',
        req.device_info,
        req.part_number || '---',
        req.brand || '---',
        req.tracking_code,
        req.serial_number || '---',
        customerName,
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
    XLSX.writeFile(workbook, 'گزارش_جامع_سیستم.xlsx');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_coordinator': return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی هماهنگی</span>;
      case 'pending_ceo_initial': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار برآورد اولیه</span>;
      case 'pending_customer_approval': return <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار تایید مشتری</span>;
      case 'canceled_by_customer': return <span className="bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">لغو توسط مشتری</span>;
      case 'pending_supervisor': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بررسی سرپرست</span>;
      case 'waiting_for_device': return <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار دریافت دستگاه</span>;
      case 'accepted': return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold">پذیرش شده</span>;
      case 'repairing': return <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold">در حال تعمیر</span>;
      case 'estimated': return <span className="bg-fuchsia-100 text-fuchsia-800 px-2.5 py-1 rounded-lg text-xs font-bold">نیازمند برآورد نهایی</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار واحد مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg text-xs font-bold">فاکتور صادر شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">عدم پذیرش</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">وضعیت نامشخص</span>;
    }
  };

  const queueRequests = requests.filter(r => r.status === 'pending_coordinator' || r.status === 'waiting_for_device');

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
        
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md mx-auto md:mx-0">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Activity size={18} /> کارتابل هماهنگی 
            {queueRequests.length > 0 && <span className="bg-white text-emerald-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <List size={18} /> گزارشات کل سامانه
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'queue' ? 'مدیریت و پیگیری درخواست‌ها' : 'لیست جامع تمامی درخواست‌های سیستم'}
            </h2>
            {activeTab === 'reports' && (
              <button onClick={exportToExcel} className="flex items-center gap-1.5 text-sm bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold transition-colors">
                <FileSpreadsheet size={18} /> خروجی اکسل
              </button>
            )}
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
                  {activeTab === 'queue' && <th className="pb-3 px-3 text-center">عملیات هماهنگی</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={activeTab === 'queue' ? 6 : 5} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : (activeTab === 'queue' ? queueRequests : requests).length === 0 ? (
                  <tr><td colSpan={activeTab === 'queue' ? 6 : 5} className="py-8 text-center text-slate-400">هیچ درخواستی یافت نشد.</td></tr>
                ) : (
                  (activeTab === 'queue' ? queueRequests : requests).map(req => {
                    const receivedObj = req.received_at ? new Date(req.received_at) : null;
                    const deliveredObj = req.delivered_at ? new Date(req.delivered_at) : null;
                    
                    const recDate = receivedObj ? receivedObj.toISOString().split('T')[0] : '';
                    const recTime = receivedObj ? receivedObj.toTimeString().slice(0, 5) : '';
                    
                    const delDate = deliveredObj ? deliveredObj.toISOString().split('T')[0] : '';
                    const delTime = deliveredObj ? deliveredObj.toTimeString().slice(0, 5) : '';

                    const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]');

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">
                            {isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام')}
                          </div>
                          <div className="text-xs font-mono text-slate-500" dir="ltr">
                            {isCommercial ? 'ثبت سازمانی' : req.profiles?.phone}
                          </div>
                          {isCommercial && (
                            <span className="inline-block mt-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-md font-bold">
                              🛒 درخواست بازرگانی
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                        </td>
                        <td className="py-4 px-3">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="py-4 px-3">
                          {activeTab === 'queue' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="flex items-center gap-1 font-bold w-12"><Calendar size={13} className="text-slate-400"/> ورود:</span>
                                <input 
                                  id={`recDate_${req.id}`}
                                  type="date" 
                                  defaultValue={recDate}
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                                />
                                <input 
                                  id={`recTime_${req.id}`}
                                  type="time" 
                                  defaultValue={recTime}
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                                />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="flex items-center gap-1 font-bold w-12"><Clock size={13} className="text-slate-400"/> خروج:</span>
                                <input 
                                  id={`delDate_${req.id}`}
                                  type="date" 
                                  defaultValue={delDate}
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                                />
                                <input 
                                  id={`delTime_${req.id}`}
                                  type="time" 
                                  defaultValue={delTime}
                                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono bg-white outline-none focus:border-brand-primary" 
                                />
                              </div>
                              
                              <button 
                                onClick={() => handleSaveDateTime(req.id)}
                                className="w-full mt-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                              >
                                <Save size={14}/> ذخیره تاریخ
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs text-slate-600">
                              <div><span className="font-bold text-slate-400">ورود: </span> {receivedObj ? new Date(receivedObj).toLocaleString('fa-IR') : 'ثبت نشده'}</div>
                              <div><span className="font-bold text-slate-400">خروج: </span> {deliveredObj ? new Date(deliveredObj).toLocaleString('fa-IR') : 'ثبت نشده'}</div>
                            </div>
                          )}
                        </td>
                        {activeTab === 'queue' && (
                          <td className="py-4 px-3 text-center align-top pt-5">
                            {req.status === 'pending_coordinator' && (
                              <div className="flex flex-col items-center justify-center gap-2">
                                {req.needs_price_estimate ? (
                                  <button 
                                    onClick={() => handleStatusChange(req.id, 'pending_ceo_initial')} 
                                    className="w-full p-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs shadow-sm"
                                  >
                                    ارجاع به مدیر مرکز (برآورد اولیه)
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleStatusChange(req.id, 'pending_supervisor')} 
                                    className="w-full p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs shadow-sm"
                                  >
                                    <Check size={16} /> ارجاع به سرپرست (جهت تعمیر)
                                  </button>
                                )}
                              </div>
                            )}

                            {req.status === 'waiting_for_device' && (
                              <button 
                                onClick={() => handleStatusChange(req.id, 'repairing', req.profiles?.phone, req.tracking_code)} 
                                className="w-full p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs shadow-sm"
                              >
                                <Check size={16} /> ثبت ورود و ارسال به تعمیرات
                              </button>
                            )}
                          </td>
                        )}
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