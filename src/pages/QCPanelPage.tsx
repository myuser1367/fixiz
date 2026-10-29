import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LogOut, Home, Key, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function QCPanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // استیت‌های مودال بررسی QC
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [qcReport, setQcReport] = useState('');
  const [qcFile, setQcFile] = useState<File | null>(null);
  const [qcDecision, setQcDecision] = useState<'approve' | 'reject'>('approve'); // انتخاب وضعیت تایید یا عدم تایید
  const [partsList, setPartsList] = useState<any[]>([]);
  const [isFetchingParts, setIsFetchingParts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchRequests();
    }
  }, [profile?.id]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone), personnel_users!technician_id(full_name)`)
      .eq('status', 'pending_qc')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('خطا در دریافت درخواست‌های کنترل کیفیت');
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenQcModal = async (req: any) => {
    setSelectedReq(req);
    setQcReport('');
    setQcFile(null);
    setQcDecision('approve');
    
    // دریافت قطعات مصرفی ثبت شده توسط تکنسین
    setIsFetchingParts(true);
    const { data, error } = await supabase.from('repair_parts').select('*').eq('request_id', req.id);
    if (!error) setPartsList(data || []);
    setIsFetchingParts(false);
  };

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    if (!qcReport.trim()) return toast.error('لطفاً توضیحات و نتیجه تست QC را وارد کنید');

    setIsSubmitting(true);
    try {
      let fileUrl = selectedReq.qc_file_url || '';

      if (qcFile) {
        const fileExt = qcFile.name.split('.').pop();
        const fileName = `${selectedReq.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('qc_files')
          .upload(filePath, qcFile);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error('خطا در آپلود فایل به سرور. لطفا پالیسی Storage را بررسی کنید.');
          setIsSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('qc_files')
          .getPublicUrl(filePath);

        fileUrl = publicUrlData.publicUrl;
      }

      const isApproved = qcDecision === 'approve';
      const nextStatus = isApproved ? 'pending_supervisor_approval' : 'repairing';

      const { error: updateError } = await supabase
        .from('repair_requests')
        .update({
          qc_report: qcReport,
          qc_file_url: fileUrl,
          qc_status: isApproved ? 'approved' : 'rejected',
          qc_personnel_id: profile?.id,
          status: nextStatus
        })
        .eq('id', selectedReq.id);

      if (updateError) throw updateError;

      toast.success(isApproved ? 'گزارش QC تایید و به سرپرست ارسال شد' : 'گزارش رد شد و به کارتابل تکنسین بازگشت');
      setSelectedReq(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'خطا در ثبت اطلاعات کنترل کیفیت');
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2.5 rounded-xl text-purple-700">
              <CheckCircle size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه تعمیرات فرافن</h1>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md">پنل QC</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> تغییر رمز
            </button>
            <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
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
            <h2 className="text-xl font-bold text-slate-800">درخواست‌های در انتظار تست</h2>
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">{requests.length} دستگاه</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">تکنسین مربوطه</th>
                  <th className="pb-3 px-3 text-center">عملیات تست و بررسی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">در حال دریافت اطلاعات...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">هیچ درخواستی در انتظار تست وجود ندارد.</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-3 font-mono font-bold text-slate-700" dir="ltr">{req.tracking_code}</td>
                      <td className="py-4 px-3 font-bold text-slate-800">{req.profiles?.full_name || 'بدون نام'}</td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-slate-800">{req.device_info}</div>
                        <div className="text-xs text-slate-500">{req.brand || 'بدون برند'}</div>
                      </td>
                      <td className="py-4 px-3 font-medium text-slate-700">
                        👨‍🔧 {req.personnel_users?.full_name || 'تعیین نشده'}
                      </td>
                      <td className="py-4 px-3 text-center">
                        <button onClick={() => handleOpenQcModal(req)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm">
                          <CheckCircle size={16} /> بررسی و تست QC
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

      {/* مودال ثبت تست و بررسی QC */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">بررسی و تست کنترل کیفیت (QC)</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">کد پیگیری: {selectedReq.tracking_code}</p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmitQC} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
                <div><span className="text-slate-400">نام دستگاه:</span> <strong className="text-slate-800">{selectedReq.device_info}</strong></div>
                <div>
                  <span className="text-slate-400 block mb-1">گزارش کار تکنسین:</span> 
                  <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">{selectedReq.supervisor_report}</p>
                </div>

                {/* نمایش قطعات مصرفی تکنسین */}
                <div>
                  <span className="text-slate-400 block mb-1">قطعات مصرفی ثبت‌شده توسط تکنسین:</span>
                  {isFetchingParts ? (
                    <div className="text-slate-500">در حال دریافت قطعات...</div>
                  ) : partsList.length === 0 ? (
                    <div className="text-slate-500 bg-white p-2 rounded border border-slate-100">هیچ قطعه‌ای ثبت نشده است.</div>
                  ) : (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {partsList.map((p: any, idx: number) => (
                        <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-700">{p.part_name}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{p.quantity} عدد</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">توضیحات و نتیجه تست QC <span className="text-red-500">*</span></label>
                <textarea 
                  rows={3} 
                  required
                  value={qcReport} 
                  onChange={e => setQcReport(e.target.value)} 
                  placeholder="نتیجه تست دستگاه را بنویسید..." 
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 outline-none focus:border-purple-500 resize-none text-sm" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">آپلود مستندات تست (عکس یا PDF)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={e => { if(e.target.files) setQcFile(e.target.files[0]); }} 
                  className="w-full px-3 py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" 
                />
              </div>

              {/* بخش انتخاب تایید یا عدم تایید (جایگزین دکمه قرمز جداگانه) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-sm font-bold text-slate-700">نتیجه نهایی کنترل کیفیت (QC) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${qcDecision === 'approve' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input 
                      type="radio" 
                      name="qc_decision" 
                      checked={qcDecision === 'approve'} 
                      onChange={() => setQcDecision('approve')} 
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600" />
                      <span>تایید کیفیت (ارسال به سرپرست)</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${qcDecision === 'reject' ? 'border-red-500 bg-red-50/50 text-red-900 font-bold' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input 
                      type="radio" 
                      name="qc_decision" 
                      checked={qcDecision === 'reject'} 
                      onChange={() => setQcDecision('reject')} 
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <XCircle size={18} className="text-red-600" />
                      <span>عدم تایید (بازگشت به تکنسین)</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} 
                  ثبت نهایی و اعمال نتیجه
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedReq(null)} 
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تغییر رمز عبور</h3>
            <form onSubmit={handleChangePassword}>
              <div className="mb-5">
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز عبور جدید" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none font-mono" dir="ltr" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isUpdatingPassword} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">ثبت رمز جدید</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 rounded-xl font-bold">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}