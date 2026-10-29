import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Wrench, Loader2, Save, Key, FileText, Plus, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TechnicianPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  
  // استیت جدید برای مدال مشاهده جزئیات
  const [viewRequest, setViewRequest] = useState<any | null>(null);

  const [technicianReport, setTechnicianReport] = useState('');
  const [parts, setParts] = useState<{ part_name: string; quantity: number }[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  // استیت چک‌باکس غیرقابل تعمیر (صرفا جهت افزودن متن به گزارش)
  const [isUnrepairable, setIsUnrepairable] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchRequests();
    }
  }, [profile?.id]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone)`)
      .eq('technician_id', profile?.id)
      .eq('status', 'repairing')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت اطلاعات درخواست‌ها');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const openReportModal = (req: any) => {
    setSelectedRequest(req);
    setTechnicianReport(req.supervisor_report || '');
    setParts([]);
    setIsUnrepairable(false);
  };

  const handleAddPart = () => {
    if (!newPartName.trim()) return toast.error('نام قطعه را وارد کنید');
    if (newPartQty < 1) return toast.error('تعداد نامعتبر است');
    setParts([...parts, { part_name: newPartName, quantity: newPartQty }]);
    setNewPartName('');
    setNewPartQty(1);
  };

  const handleRemovePart = (index: number) => {
    const newParts = [...parts];
    newParts.splice(index, 1);
    setParts(newParts);
  };

  const submitReportAndParts = async () => {
    if (!selectedRequest) return;
    if (!technicianReport.trim()) return toast.error('لطفاً گزارش کار را بنویسید');

    setIsSubmittingReport(true);
    try {
      // فقط یک برچسب متنی به گزارش اضافه میکند و روال عادی (ثبت وضعیت بررسی سرپرست) طی میشود
      const finalReport = isUnrepairable 
        ? `[دستگاه غیرقابل تعمیر اعلام شد]\n${technicianReport}`
        : technicianReport;

      const { error: reqError } = await supabase
    .from('repair_requests')
    .update({ 
      supervisor_report: finalReport,
      status: 'pending_qc' // تغییر از pending_supervisor_approval به pending_qc
    })
    .eq('id', selectedRequest.id);
      
      if (reqError) throw reqError;

      if (parts.length > 0) {
        const partsToInsert = parts.map(p => ({
          request_id: selectedRequest.id,
          part_name: p.part_name,
          quantity: p.quantity,
        }));

        const { error: partsError } = await supabase
          .from('repair_parts')
          .insert(partsToInsert);

        if (partsError) throw partsError;
      }

      toast.success('گزارش شما ثبت شد و برای تایید به کارتابل سرپرست ارسال گردید');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast.error('خطا در ثبت اطلاعات: ' + error.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsUpdatingPassword(true);
    try {
      if (profile?.username) {
        const { error } = await supabase
          .from('personnel_users')
          .update({ password: newPassword })
          .eq('username', profile.username);
        if (error) throw error;
      }
      toast.success('رمز عبور شما با موفقیت تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const FullRequestDetails = ({ req }: { req: any }) => (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mb-6" dir="rtl">
      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">مشخصات تجهیز ارجاع شده</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div><span className="text-slate-400">نام تجهیز:</span> <strong className="text-slate-800">{req.device_info}</strong></div>
        <div><span className="text-slate-400">کارخانه سازنده:</span> <strong className="text-slate-800">{req.brand || 'ثبت نشده'}</strong></div>
        <div><span className="text-slate-400">پارت نامبر:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.part_number || 'ثبت نشده'}</strong></div>
        <div><span className="text-slate-400">شماره سریال:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.serial_number || 'ثبت نشده'}</strong></div>
        
        {req.tr_code && <div><span className="text-slate-400">TR کد:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.tr_code}</strong></div>}
        {req.delivery_list_number && <div><span className="text-slate-400">شماره لیست تحویل:</span> <strong className="font-mono text-slate-800" dir="ltr">{req.delivery_list_number}</strong></div>}
        {req.email_group && <div><span className="text-slate-400">گروه ایمیل بازرگانی:</span> <strong className="text-slate-800">{req.email_group}</strong></div>}
        
        <div className="sm:col-span-2"><span className="text-slate-400">نام پروژه / ارجاع کار:</span> <strong className="text-slate-800">{req.project_name || 'ثبت نشده'}</strong></div>
        
        {req.needs_price_estimate && (
          <div className="sm:col-span-2 mt-1">
            <span className="inline-block bg-amber-100 text-amber-800 px-2.5 py-1 rounded font-bold border border-amber-200">
              ⚠️ این دستگاه نیاز به برآورد قیمت پیش از تعمیر نهایی دارد
            </span>
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-slate-200">
        <span className="text-slate-400 text-xs block mb-1">شرح کامل مشکل (اظهار مشتری/بازرگانی):</span>
        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">{req.fault_description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700">
              <Wrench size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه تعمیرات فرافن </h1>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">پنل تکنسین تعمیرات</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> <span className="hidden sm:inline">تغییر رمز</span>
            </button>
            <button onClick={() => { window.location.href = '/'; }} className="flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> <span className="hidden sm:inline">صفحه اصلی</span>
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
            <h2 className="text-xl font-bold text-slate-800">کارتابل دستگاه‌های در حال تعمیر شما</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{requests.length} دستگاه</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری / بازرگانی</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">دستگاهی برای تعمیر به شما ارجاع نشده است.</td></tr>
                ) : (
                  requests.map(req => {
                    const isCommercial = req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">
                            {isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام')}
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="font-bold text-slate-800">{req.device_info}</div>
                          <div className="text-xs text-slate-500">{req.brand || 'بدون برند'}</div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="flex flex-col gap-2">
                            {/* دکمه مشاهده جزئیات در کارتابل تکنسین */}
                            <button onClick={() => setViewRequest(req)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5 shadow-sm">
                              <Search size={16} /> مشاهده جزئیات
                            </button>
                            <button onClick={() => openReportModal(req)} className="px-4 py-2 bg-brand-primary hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-colors w-full flex justify-center items-center gap-1.5 shadow-sm">
                              <FileText size={16} /> ثبت گزارش کار
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

      {/* مدال مشاهده جزئیات تکنسین */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">جزئیات کامل درخواست</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد پیگیری: {viewRequest.tracking_code}</p>
              </div>
              <button onClick={() => setViewRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>
            <FullRequestDetails req={viewRequest} />
            <button onClick={() => setViewRequest(null)} className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">بستن پنجره</button>
          </div>
        </div>
      )}

      {/* مودال ثبت گزارش کار و قطعات مصرفی */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ثبت گزارش کار و پایان تعمیر</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد: {selectedRequest.tracking_code}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <FullRequestDetails req={selectedRequest} />

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">گزارش فنی شما (تکنسین) <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4} 
                  value={technicianReport} 
                  onChange={(e) => setTechnicianReport(e.target.value)} 
                  placeholder="شرح عملیات انجام شده روی دستگاه را بنویسید... (این گزارش برای سرپرست ارسال می‌شود)" 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-brand-primary resize-none text-sm leading-relaxed" 
                />
              </div>

              {/* گزینه اعلام غیرقابل تعمیر بودن دستگاه */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="unrepairable" 
                  checked={isUnrepairable} 
                  onChange={e => setIsUnrepairable(e.target.checked)} 
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-600 border-slate-300" 
                />
                <label htmlFor="unrepairable" className="font-bold text-slate-700 cursor-pointer">
                  اعلام دستگاه به عنوان غیرقابل تعمیر
                </label>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-4">لیست قطعات مصرفی یا تعویضی (در صورت نیاز)</label>
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={newPartName} 
                    onChange={e => setNewPartName(e.target.value)} 
                    placeholder="نام قطعه (مثلا: خازن ۱۰۰ میکرو)" 
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-primary text-sm" 
                  />
                  <input 
                    type="number" 
                    min="1" 
                    value={newPartQty} 
                    onChange={e => setNewPartQty(parseInt(e.target.value) || 1)} 
                    className="w-20 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-brand-primary text-sm text-center" 
                    dir="ltr"
                  />
                  <button onClick={handleAddPart} className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center">
                    <Plus size={18} />
                  </button>
                </div>

                {parts.length > 0 && (
                  <ul className="space-y-2">
                    {parts.map((p, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 text-sm">
                        <span className="font-bold text-slate-700">{p.part_name}</span>
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{p.quantity} عدد</span>
                          <button onClick={() => handleRemovePart(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={submitReportAndParts} 
                  disabled={isSubmittingReport} 
                  className="flex-1 py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                  {isSubmittingReport ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                  ثبت نهایی و ارجاع به سرپرست
                </button>
                <button 
                  onClick={() => setSelectedRequest(null)} 
                  className="px-6 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تغییر رمز عبور</h3>
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
                <button type="submit" disabled={isUpdatingPassword} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors text-sm">ثبت رمز جدید</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}