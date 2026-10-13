import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CustomerPanelPage from './pages/CustomerPanelPage';

const DashboardRouter = () => {
  const { role, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-sans">در حال بارگذاری پنل...</div>;
  if (!role) return <Navigate to="/" replace />; // اگر لاگین نبود برگرده صفحه اصلی

  switch (role) {
    case 'admin': return <AdminDashboardPage />;
    case 'customer': return <CustomerPanelPage />;
    case 'coordinator': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-green-600">محیط پنل هماهنگ‌کننده</div>;
    case 'supervisor': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-orange-600">محیط پنل سرپرست تعمیر</div>;
    case 'ceo': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-purple-600">محیط پنل مدیر مرکز</div>;
    case 'commercial': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-blue-600">محیط پنل بازرگانی</div>;
    case 'finance': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-teal-600">محیط پنل مالی</div>;
    default: return <Navigate to="/" replace />;
  }
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* روت لاگین پاک شد چون در همون مسیر / اجرا میشه */}
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