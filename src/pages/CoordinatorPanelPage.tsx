import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Check, Calendar, Clock, Wrench, Activity, List, Save, Send, Search, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

export default function CoordinatorPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'queue' | 'reports'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateValues, setDateValues] = useState<Record<string, {rec: Date | null, del: Date | null}>>({});

  // استیت‌های مودال مشاهده جزئیات در پنل هماهنگی
  const [viewRequest, setViewRequest] = useState<any | null>(null);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);

  const COMMERCIAL_CUSTOMER_ID = 'c78297a5-bb21-4701-b289-203d5ea50acb';

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطا در دریافت اطلاعات');
    } else {
      setRequests(data || []);
      
      const initialDates: any = {};
      (data || []).forEach(req => {
        initialDates[req.id] = {
          rec: req.received_at ? new Date(req.received_at) : null,
          del: req.delivered_at ? new Date(req.delivered_at) : null
        };
      });
      setDateValues(initialDates);
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

  const sendDeviceSendSms = (phone: string, trackingCode: string) => {
    console.log(`[SMS SIMULATION] To: ${phone} | Message: برآورد قیمت درخواست تعمیر شما با کد ${trackingCode} تایید شد. لطفاً دستگاه خود را ارسال نمایید. سامانه تعمیرات فرافن`);
  };

  const handleDateChange = (id: string, field: 'rec' | 'del', dateObj: any) => {
    const d = dateObj ? dateObj.toDate() : null;
    setDateValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {rec: null, del: null}),
        [field]: d
      }
    }));
  };

  const handleSaveDateTime = async (id: string, silent: boolean = false) => {
    const dates = dateValues[id];
    if (!dates) return true;

    // حذف ثانیه و میلی‌ثانیه قبل از ذخیره در دیتابیس
    const formatForDB = (d: Date | null) => {
      if (!d) return null;
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d.toISOString();
    };

    const updateData = {
      received_at: formatForDB(dates.rec),
      delivered_at: formatForDB(dates.del)
    };

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

  const handleSendToCeoFinal = async (req: any) => {
    const dates = dateValues[req.id];
    if (!dates || !dates.del) {
      return toast.error('لطفاً ابتدا تاریخ و زمان خروج دستگاه را وارد کنید.');
    }

    await handleSaveDateTime(req.id, true);

    const { error } = await supabase.from('repair_requests').update({ status: 'pending_ceo_final' }).eq('id', req.id);
    if (error) {
       toast.error('خطا در ثبت وضعیت');
    } else {
       toast.success('تاریخ خروج ثبت و درخواست برای تایید نهایی به مدیر مرکز ارسال شد.');
       fetchRequests();
    }
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
      case 'pending_qc': return <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار تست QC</span>;
      case 'pending_supervisor_approval': return <span className="bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg text-xs font-bold">منتظر تایید نهایی سرپرست</span>;
      case 'estimated': return <span className="bg-fuchsia-100 text-fuchsia-800 px-2.5 py-1 rounded-lg text-xs font-bold">نیازمند برآورد نهایی</span>;
      case 'pending_commercial': return <span className="bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار بازرگانی</span>;
      case 'pending_finance': return <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار مالی</span>;
      case 'invoiced': return <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg text-xs font-bold">فاکتور صادر شده - انتظار پرداخت</span>;
      case 'pending_commercial_checkout':
      case 'pending_commercial_final': return <span className="bg-cyan-100 text-cyan-800 px-2.5 py-1 rounded-lg text-xs font-bold">تایید مالی - ارجاع به بازرگانی</span>;
      case 'ready_for_delivery': return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg text-xs font-bold">آماده تحویل (در انتظار ثبت خروج)</span>;
      case 'pending_ceo_final': return <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold">در انتظار تایید نهایی مدیر</span>;
      case 'completed': return <span className="bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg text-xs font-bold">پایان کار / تحویل داده شده</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold">عدم پذیرش</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">وضعیت نامشخص</span>;
    }
  };

  // تابعی برای فرمت کردن تاریخ و زمان بدون ثانیه در هنگام استخراج
  const formatDateTimeNoSeconds = (dateString: string | null) => {
    if (!dateString) return 'ثبت نشده';
    const date = new Date(dateString);
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const queueRequests = requests.filter(r => 
    ['pending_coordinator', 'waiting_for_device', 'ready_for_delivery'].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه تعمیرات فرافن </h1>
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
                  <th className="pb-3 px-3 text-center">{activeTab === 'queue' ? 'عملیات هماهنگی' : 'جزئیات پرونده'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : (activeTab === 'queue' ? queueRequests : requests).length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">هیچ درخواستی یافت نشد.</td></tr>
                ) : (
                  (activeTab === 'queue' ? queueRequests : requests).map(req => {
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          {(() => {
                            const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
                            return (
                              <>
                                <div className="font-bold text-slate-800">
                                  {isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام')}
                                </div>
                                <div className="text-xs font-mono text-slate-500" dir="ltr">
                                  {isCommercial ? 'ثبت سازمانی' : (req.profiles?.phone || '---')}
                                </div>
                                {isCommercial && (
                                  <span className="inline-block mt-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                    🛒 درخواست بازرگانی
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'برند نامشخص'}</div>
                          {isRequestUnrepairable(req) && (
                            <span className="inline-block mt-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              ⚠️ اعلام غیرقابل تعمیر
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="py-4 px-3">
                          {activeTab === 'queue' ? (
                            <div className="space-y-2">
                              {req.status === 'waiting_for_device' ? (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="flex items-center gap-1 font-bold w-12"><Calendar size={13} className="text-slate-400"/> ورود:</span>
                                  <DatePicker
                                    calendar={persian}
                                    locale={persian_fa}
                                    format="YYYY/MM/DD HH:mm"
                                    plugins={[<TimePicker hideSeconds position="bottom" />]}
                                    value={dateValues[req.id]?.rec}
                                    onChange={(date) => handleDateChange(req.id, 'rec', date)}
                                    inputClass="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono bg-white outline-none focus:border-brand-primary w-full text-center"
                                  />
                                  <button onClick={() => handleSaveDateTime(req.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="ذخیره">
                                    <Save size={14} />
                                  </button>
                                </div>
                              ) : req.status === 'ready_for_delivery' ? (
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="flex items-center gap-1 font-bold w-12"><Clock size={13} className="text-slate-400"/> خروج:</span>
                                  <DatePicker
                                    calendar={persian}
                                    locale={persian_fa}
                                    format="YYYY/MM/DD HH:mm"
                                    plugins={[<TimePicker hideSeconds position="bottom" />]}
                                    value={dateValues[req.id]?.del}
                                    onChange={(date) => handleDateChange(req.id, 'del', date)}
                                    inputClass="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono bg-white outline-none focus:border-brand-primary w-full text-center"
                                  />
                                  <button onClick={() => handleSaveDateTime(req.id)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="ذخیره">
                                    <Save size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">---</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs text-slate-600">
                              <div><span className="font-bold text-slate-400">ورود: </span> {formatDateTimeNoSeconds(req.received_at)}</div>
                              <div><span className="font-bold text-slate-400">خروج: </span> {formatDateTimeNoSeconds(req.delivered_at)}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-center align-top pt-4">
                          <div className="flex flex-col items-center justify-center gap-2">
                            {activeTab === 'queue' && (
                              <>
                                {req.status === 'pending_coordinator' && (
                                  req.needs_price_estimate && !req.estimated_price ? (
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
                                  )
                                )}

                                {req.status === 'waiting_for_device' && (
                                  <button 
                                    onClick={() => handleStatusChange(req.id, 'repairing', req.profiles?.phone, req.tracking_code)} 
                                    className="w-full p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs shadow-sm"
                                  >
                                    <Check size={16} /> ثبت ورود و ارسال به تعمیرات
                                  </button>
                                )}

                                {req.status === 'ready_for_delivery' && (
                                  <button 
                                    onClick={() => handleSendToCeoFinal(req)} 
                                    className="w-full p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-xl transition-colors font-bold flex items-center justify-center gap-1 text-xs shadow-md"
                                  >
                                    <Send size={14} /> ثبت نهایی خروج و ارجاع به مدیر
                                  </button>
                                )}
                              </>
                            )}

                            <button 
                              onClick={() => handleOpenDetailsModal(req)} 
                              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <Search size={14} /> مشاهده جزئیات
                            </button>
                          </div>
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

      {/* مودال مشاهده جزئیات کامل پرونده (گزارش تکنسین، قطعات، وضعیت غیرقابل تعمیر و گزارش QC) */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">جزئیات کامل درخواست</h3>
                <p className="text-sm text-slate-500 font-mono mt-1" dir="ltr">{viewRequest.tracking_code}</p>
              </div>
              <button onClick={() => setViewRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-5">
              {/* مشخصات تجهیز */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">مشخصات تجهیز و درخواست</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">نام تجهیز:</span> <strong className="text-slate-800">{viewRequest.device_info}</strong></div>
                  <div><span className="text-slate-400">برند سازنده:</span> <strong className="text-slate-800">{viewRequest.brand || '---'}</strong></div>
                  <div><span className="text-slate-400">پارت نامبر:</span> <strong className="font-mono text-slate-800" dir="ltr">{viewRequest.part_number || '---'}</strong></div>
                  <div><span className="text-slate-400">شماره سریال:</span> <strong className="font-mono text-slate-800" dir="ltr">{viewRequest.serial_number || '---'}</strong></div>
                  <div><span className="text-slate-400">زمان ورود:</span> <strong className="text-slate-800" dir="ltr">{formatDateTimeNoSeconds(viewRequest.received_at)}</strong></div>
                  <div><span className="text-slate-400">زمان خروج:</span> <strong className="text-slate-800" dir="ltr">{formatDateTimeNoSeconds(viewRequest.delivered_at)}</strong></div>
                  <div className="sm:col-span-2"><span className="text-slate-400">نام پروژه / ارجاع:</span> <strong className="text-slate-800">{viewRequest.project_name || '---'}</strong></div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 text-xs block mb-1">شرح کامل مشکل:</span>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">{viewRequest.fault_description}</p>
                </div>
              </div>

              {/* گزارش تکنسین و قطعات مصرفی */}
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                  <div className="text-xs">
                    <span className="text-slate-500">تکنسین تعمیر: </span>
                    <strong className="text-slate-800">👨‍🔧 {viewRequest.personnel_users?.full_name || 'تعیین نشده'}</strong>
                  </div>
                  {isRequestUnrepairable(viewRequest) ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200">
                      <AlertTriangle size={14} /> اعلام شده به عنوان غیرقابل تعمیر
                    </span>
                  ) : viewRequest.supervisor_report ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                      تعمیر شده (قابل تعمیر)
                    </span>
                  ) : null}
                </div>

                <div>
                  <span className="text-xs font-bold text-blue-900 block mb-1">گزارش فنی تکنسین:</span>
                  <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-blue-100 leading-relaxed whitespace-pre-wrap">
                    {viewRequest.supervisor_report || 'گزارشی ثبت نشده است.'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-blue-900 block mb-1">قطعات مصرفی یا تعویضی:</span>
                  {isFetchingParts ? (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 size={14} className="animate-spin"/> در حال دریافت قطعات...</div>
                  ) : partsList.length === 0 ? (
                    <div className="text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">هیچ قطعه‌ای ثبت نشده است.</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {partsList.map((part: any, idx: number) => (
                        <li key={part.id || idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-700">{part.part_name}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">{part.quantity} عدد</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* گزارش و فایل کنترل کیفیت (QC) */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2">
                  <span className="text-xs font-bold text-purple-900">نتیجه و گزارش کنترل کیفیت (QC):</span>
                  {viewRequest.qc_status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200">
                      <CheckCircle size={14} /> مورد تایید QC
                    </span>
                  ) : viewRequest.qc_status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200">
                      <XCircle size={14} /> عدم تایید QC
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">ثبت نشده</span>
                  )}
                </div>

                <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-purple-100 leading-relaxed whitespace-pre-wrap">
                  {viewRequest.qc_report || 'گزارشی توسط واحد QC ثبت نشده است.'}
                </p>

                {viewRequest.qc_file_url && (
                  <div>
                    <a 
                      href={viewRequest.qc_file_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-bold transition-colors shadow-sm"
                    >
                      <FileText size={15} /> مشاهده فایل / مستندات تست QC
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setViewRequest(null)} className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm">
              بستن پنجره
            </button>
          </div>
        </div>
      )}
    </div>
  );
}