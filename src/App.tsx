import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster, toast } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CustomerPanelPage from './pages/CustomerPanelPage';
import { supabase } from './lib/supabase';
import { Home, LogOut, Key, Wrench, FileText, ShoppingCart, UserCheck, BarChart3, Settings, Activity } from 'lucide-react';
import CoordinatorPanelPage from './pages/CoordinatorPanelPage';
import SupervisorPanelPage from './pages/SupervisorPanelPage';
import CeoPanelPage from './pages/CeoPanelPage';
import CommercialPanelPage from './pages/CommercialPanelPage';
import FinancePanelPage from './pages/FinancePanelPage';
import MonitoringPanelPage from './pages/MonitoringPanelPage';
import MonitoringManagerPanelPage from './pages/MonitoringManagerPanelPage';
import TechnicianPanelPage from './pages/TechnicianPanelPage'; // <--- ایمپورت پنل تکنسین

export const roleMeta: Record<string, { title: string; color: string; badge: string; icon: any; desc: string }> = {
  coordinator: { 
    title: 'واحد هماهنگی', 
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200', 
    badge: 'bg-emerald-100 text-emerald-800',
    icon: Wrench,
    desc: 'پذیرش اولیه دستگاه‌ها، تماس با مشتریان و هماهنگی لجستیک و ارسال'
  },
  supervisor: { 
    title: 'سرپرست تعمیر', 
    color: 'text-amber-700 bg-amber-50 border-amber-200', 
    badge: 'bg-amber-100 text-amber-800',
    icon: UserCheck,
    desc: 'بررسی فنی، تخصیص دستگاه‌ها به تکنسین‌ها، عیب‌یابی و تایید کیفیت نهایی'
  },
  ceo: { 
    title: 'مدیر مرکز', 
    color: 'text-purple-700 bg-purple-50 border-purple-200', 
    badge: 'bg-purple-100 text-purple-800',
    icon: BarChart3,
    desc: 'داشبورد مدیریتی، بررسی آمار عملکرد بخش‌ها و گزارش‌های راهبردی'
  },
  commercial: { 
    title: 'واحد بازرگانی', 
    color: 'text-blue-700 bg-blue-50 border-blue-200', 
    badge: 'bg-blue-100 text-blue-800',
    icon: ShoppingCart,
    desc: 'استعلام قیمت قطعات، تامین لوازم یدکی و ارتباط با تامین‌کنندگان'
  },
  finance: { 
    title: 'واحد مالی', 
    color: 'text-teal-700 bg-teal-50 border-teal-200', 
    badge: 'bg-teal-100 text-teal-800',
    icon: FileText,
    desc: 'صدور پیش‌فاکتور، تایید تسویه‌حساب مشتریان و امور مالی سازمان'
  },
  monitoring: { 
    title: 'مانیتورینگ', 
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200', 
    badge: 'bg-cyan-100 text-cyan-800',
    icon: Activity,
    desc: 'مشاهده لحظه‌ای تجهیزات فعال و وضعیت تعمیرات در کارگاه'
  },
  monitoring_manager: { 
    title: 'مانیتورینگ مدیر', 
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200', 
    badge: 'bg-indigo-100 text-indigo-800',
    icon: BarChart3,
    desc: 'گزارش‌گیری پیشرفته، فیلترینگ بازه‌های زمانی و خروجی اکسل'
  },
  technician: { 
    title: 'تکنسین تعمیرات', 
    color: 'text-blue-700 bg-blue-50 border-blue-200', 
    badge: 'bg-blue-100 text-blue-800',
    icon: Wrench,
    desc: 'بررسی دستگاه‌های ارجاع‌شده، انجام تعمیرات و ثبت گزارش کار'
  },
};

export const PersonnelPanelLayout = ({ roleKey }: { roleKey: string }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const meta = roleMeta[roleKey] || {
    title: 'پرسنل',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    badge: 'bg-slate-100 text-slate-800',
    icon: Settings,
    desc: 'پنل خدمات سازمانی فرافن'
  };

  const IconComponent = meta.icon;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
    setIsUpdating(true);
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
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-vazir" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">فرافن</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${meta.badge}`}>
              {meta.title}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500 hidden md:inline ml-2">
              خوش آمدید، {profile?.full_name || 'همکار گرامی'}
            </span>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              <Key size={16} /> <span className="hidden sm:inline">تغییر رمز</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              <Home size={16} /> <span className="hidden sm:inline">صفحه اصلی</span>
            </button>

            <button
              onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              <LogOut size={16} /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className={`p-8 rounded-3xl border shadow-sm mb-8 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${meta.badge}`}>
              <IconComponent size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-1">پنل تخصصی {meta.title}</h2>
              <p className="text-sm text-slate-500">{meta.desc}</p>
            </div>
          </div>
          <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-xs text-slate-600">
            <div><span className="font-bold text-slate-700">نام کاربری:</span> <span className="font-mono">{profile?.username || '-'}</span></div>
            <div className="mt-1"><span className="font-bold text-slate-700">شماره تماس:</span> <span className="font-mono">{profile?.phone || '-'}</span></div>
          </div>
        </div>
      </main>

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
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors text-sm"
                >
                  {isUpdating ? 'در حال ثبت...' : 'ثبت رمز جدید'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-sm"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardRouter = () => {
  const { role, profile, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-vazir text-slate-600">در حال بارگذاری پنل...</div>;
  if (!role && !profile) return <Navigate to="/" replace />;

  const currentRole = role || profile?.role;

  // بررسی نقش برای هدایت به صفحه مربوطه (پشتیبانی از نقش‌های پویا یا کلیدهای شامل تکنسین)
  if (currentRole?.includes('technician') || currentRole?.includes('تکنسین')) {
    return <TechnicianPanelPage />;
  }

  switch (currentRole) { 
    case 'admin': return <AdminDashboardPage />;
    case 'customer': return <CustomerPanelPage />;
    case 'coordinator': return <CoordinatorPanelPage />;
    case 'supervisor': return <SupervisorPanelPage />;
    case 'ceo': return <CeoPanelPage />;
    case 'commercial': return <CommercialPanelPage />;
    case 'finance': return <FinancePanelPage />;
    case 'monitoring': return <MonitoringPanelPage />;
    case 'monitoring_manager': return <MonitoringManagerPanelPage />;
    default: return <Navigate to="/" replace />;
  }
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/panel" element={<DashboardRouter />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}