import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendUserNotification } from '../lib/notifications';
import { LogOut, Home, Key, CheckCircle, Loader2, CreditCard, History, Printer, DollarSign } from 'lucide-react';

export default function FinancePanelPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // استیت مودال تغییر رمز
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const COMMERCIAL_CUSTOMER_ID = 'c78297a5-bb21-4701-b289-203d5ea50acb';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    // دریافت درخواست‌های در انتظار مالی و فاکتور شده‌ها همراه با پروفایل مشتری (شامل ایمیل)
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`*, profiles!customer_id(full_name, phone, email)`)
      .in('status', ['pending_finance', 'invoiced'])
      .order('created_at', { ascending: false });
      
    if (error) {
      toast.error('خطا در دریافت اطلاعات مالی');
    } else {
      setRequests(data || []);
    }

    setIsLoading(false);
  };

  // تابعی برای ارسال ایمیل از طریق پلتفرم Resend
  const sendEmailViaApi = async (toEmail: string, subject: string, text: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, subject, text })
      });
      const resData = await response.json();
      if (!response.ok) console.error("Email API Error:", resData);
    } catch (err) {
      console.error("Network error sending email:", err);
    }
  };

  const handleIssueInvoice = async (req: any) => {
    if (!confirm(`آیا از صدور فاکتور نهایی برای قطعه "${req.device_info}" اطمینان دارید؟`)) return;
    
    setIsLoading(true);
    try {
      // 1. تغییر وضعیت به صدور فاکتور (invoiced)
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'invoiced' })
        .eq('id', req.id);

      if (error) throw error;

      // جمع‌آوری لیست ایمیل‌ها برای ارسال (ایمیل مشتری + ایمیل‌های گروه انتخاب شده در بازرگانی)
      const recipientEmails: string[] = [];

      // الف) ایمیل مشتری
      const customerEmail = req.profiles?.email;
      if (customerEmail) {
        recipientEmails.push(customerEmail);
      }

      // ب) ایمیل‌های گروه بازرگانی (در صورتی که گروهی انتخاب شده باشد)
      if (req.email_group) {
        const { data: groupData } = await supabase
          .from('email_groups')
          .select('id')
          .eq('name', req.email_group)
          .maybeSingle();

        if (groupData) {
          const { data: groupEmailsData } = await supabase
            .from('group_emails')
            .select('email')
            .eq('group_id', groupData.id);

          if (groupEmailsData) {
            groupEmailsData.forEach(item => {
              if (item.email && !recipientEmails.includes(item.email)) {
                recipientEmails.push(item.email);
              }
            });
          }
        }
      }

      // متن ایمیل فاکتور
      const emailSubject = `صدور فاکتور رسمی خدمات - کد پیگیری: ${req.tracking_code}`;
      const emailBody = `با سلام،\n\nفاکتور نهایی خدمات تعمیر تجهیز "${req.device_info}" (کد پیگیری: ${req.tracking_code}) صادر گردید.\n\nمبلغ قابل پرداخت: ${req.final_price?.toLocaleString() || 0} ریال\n\nلطفاً جهت تسویه حساب اقدام فرمایید.\n\nسامانه تعمیرات فرافن`;

      // ارسال ایمیل به تک‌تک مخاطبین استخراج شده (حفظ حریم خصوصی ایمیل‌ها نسبت به هم)
      for (const email of recipientEmails) {
        await sendEmailViaApi(email, emailSubject, emailBody);
      }

      // 2. ارسال پیامک (فقط به مشتری، نه واحد بازرگانی)
      const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
      const customerPhone = req.profiles?.phone;

      if (customerPhone && !isCommercial) {
        await sendUserNotification({
          trackingCode: req.tracking_code,
          userMobile: customerPhone,
          status: 'invoiced',
          price: req.final_price?.toString() || '0'
        });
        toast.success(`فاکتور صادر شد. پیامک به مشتری و ایمیل‌ها ارسال گردید.`);
      } else {
        // پیام موفقیت متفاوت برای زمانی که درخواست مربوط به بازرگانی است یا شماره ثبت نشده
        toast.success(`فاکتور صادر شد و ایمیل‌ها ارسال گردیدند${isCommercial ? ' (بدون ارسال پیامک به بازرگانی)' : ''}.`);
      }

      fetchData();
    } catch (err: any) {
      toast.error('خطا در صدور فاکتور: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPayment = async (req: any) => {
    if (!confirm(`آیا پرداخت فاکتور (کد پیگیری: ${req.tracking_code}) تایید می‌شود؟ با این کار درخواست جهت بررسی و تایید خروج به پنل بازرگانی ارجاع داده می‌شود.`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('repair_requests')
        .update({ status: 'pending_commercial_checkout' })
        .eq('id', req.id);

      if (error) throw error;

      toast.success('تایید پرداخت با موفقیت ثبت شد و درخواست به واحد بازرگانی ارجاع یافت.');
      fetchData();
    } catch (err: any) {
      toast.error('خطا در تایید پرداخت: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintInvoice = (req: any) => {
    const isCommercial = req.customer_id === COMMERCIAL_CUSTOMER_ID || req.project_name?.includes('[بازرگانی]') || req.fault_description?.includes('واحد بازرگانی');
    const customerName = isCommercial ? 'واحد بازرگانی' : (req.profiles?.full_name || 'بدون نام');
    const customerPhone = isCommercial ? 'ثبت سازمانی' : (req.profiles?.phone || '---');
    const dateStr = new Date().toLocaleDateString('fa-IR');

    const printContent = `
      <html dir="rtl" lang="fa">
        <head>
          <title>فاکتور خدمات - ${req.tracking_code}</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .content { line-height: 2.5; font-size: 15px; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-size: 20px; font-weight: bold; margin-top: 30px; text-align: left; background: #f9f9f9; padding: 15px; border: 2px dashed #ccc;}
            .footer { margin-top: 70px; text-align: center; font-size: 14px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>فاکتور رسمی خدمات سامانه تعمیرات فرافن </h1>
            <p>تاریخ صدور فاکتور: ${dateStr}</p>
          </div>
          <div class="content">
            <div class="row"><span>کد پیگیری درخواست:</span> <strong>${req.tracking_code}</strong></div>
            <div class="row"><span>نام مشتری / درخواست کننده:</span> <strong>${customerName}</strong></div>
            <div class="row"><span>شماره تماس:</span> <strong dir="ltr">${customerPhone}</strong></div>
            <div class="row"><span>نام دستگاه (قطعه):</span> <strong>${req.device_info}</strong></div>
            <div class="row"><span>برند سازنده:</span> <strong>${req.brand || 'ثبت نشده'}</strong></div>
            ${req.tr_code ? `<div class="row"><span>TR:</span> <strong>${req.tr_code}</strong></div>` : ''}
            ${req.delivery_list_number ? `<div class="row"><span>شماره لیست تحویل:</span> <strong>${req.delivery_list_number}</strong></div>` : ''}
            ${req.email_group ? `<div class="row"><span>گروه مرتبط:</span> <strong>${req.email_group}</strong></div>` : ''}
            <div class="total">مبلغ نهایی فاکتور: ${req.final_price?.toLocaleString() || 0} ریال</div>
          </div>
          <div class="footer">
            <p>مهر و امضای واحد امور مالی</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=800,height=800');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsUpdatingPassword(true);
    try {
      if (profile?.username) {
        const { error } = await supabase.from('personnel_users').update({ password: newPassword }).eq('username', profile.username);
        if (error) throw error;
      }
      toast.success('رمز عبور تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error('خطا در تغییر رمز عبور');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const queueRequests = requests.filter(r => r.status === 'pending_finance');
  const historyRequests = requests.filter(r => r.status === 'invoiced');

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2.5 rounded-xl text-teal-700">
              <CreditCard size={26} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">سامانه تعمیرات فرافن </h1>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md">واحد امور مالی</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">خوش آمدید، {profile?.full_name || 'همکار گرامی'}</span>
            
            <button onClick={() => setShowPasswordModal(true)} className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors">
              <Key size={16} /> تغییر رمز
            </button>
            <button onClick={() => navigate('/')} className="hidden sm:flex items-center gap-1.5 text-sm sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <Home size={16} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2.5 rounded-xl font-bold transition-colors">
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 mb-6 w-full max-w-md mx-auto md:mx-0 flex-col sm:flex-row gap-1">
          <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'queue' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <CreditCard size={18} /> کارتابل صدور فاکتور
            {queueRequests.length > 0 && <span className="bg-white text-teal-600 px-2 py-0.5 rounded-full text-xs">{queueRequests.length}</span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <History size={18} /> فاکتورهای صادر شده
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {activeTab === 'queue' ? 'درخواست‌های در انتظار بررسی و صدور فاکتور نهایی' : 'فاکتورهای صادر شده در انتظار پرداخت و تسویه'}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">کد پیگیری</th>
                  <th className="pb-3 px-3">مشتری و موبایل</th>
                  <th className="pb-3 px-3">دستگاه و برند</th>
                  <th className="pb-3 px-3">مبلغ نهایی (ریال)</th>
                  <th className="pb-3 px-3 text-center">وضعیت / عملیات مالی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto h-6 w-6 mb-2" />در حال دریافت اطلاعات...</td></tr>
                ) : (activeTab === 'queue' ? queueRequests : historyRequests).length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">موردی یافت نشد.</td></tr>
                ) : (
                  (activeTab === 'queue' ? queueRequests : historyRequests).map(req => (
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
                      </td>
                      <td className="py-4 px-3 font-mono font-bold text-teal-700 text-lg" dir="ltr">
                        {req.final_price ? req.final_price.toLocaleString() : '---'}
                      </td>
                      <td className="py-4 px-3 text-center">
                        {req.status === 'pending_finance' ? (
                          <button 
                            onClick={() => handleIssueInvoice(req)} 
                            className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle size={16} /> صدور فاکتور و اطلاع پیامکی/ایمیلی
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => handlePrintInvoice(req)} 
                              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <Printer size={16} /> چاپ فاکتور
                            </button>
                            <button 
                              onClick={() => handleConfirmPayment(req)} 
                              className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <DollarSign size={16} /> تایید پرداخت و ارجاع
                            </button>
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

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-2">تغییر رمز عبور</h3>
            <p className="text-xs text-slate-500 mb-5">رمز عبور جدیدی برای ورود به پنل وارد نمایید.</p>
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
                <button type="submit" disabled={isUpdatingPassword} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors text-sm">
                  {isUpdatingPassword ? 'در حال ثبت...' : 'ثبت رمز'}
                </button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}