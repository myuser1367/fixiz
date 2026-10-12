import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

// این کامپوننت تصمیم می‌گیرد کاربر را بر اساس نقشش به کدام پنل بفرستد
const DashboardRouter = () => {
  const { role, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-sans">در حال بارگذاری پنل...</div>;
  if (!role) return <Navigate to="/login" replace />;

  // فعلا پنل‌ها را به صورت موقت به این شکل قرار می‌دهیم تا بعدا فایل‌های اصلی‌شان را بسازیم
  switch (role) {
    case 'customer': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-gray-700">محیط موقت پنل مشتری</div>;
    case 'admin': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-red-600">محیط موقت پنل مدیریت سیستم</div>;
    case 'coordinator': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-green-600">محیط موقت پنل هماهنگ‌کننده</div>;
    case 'supervisor': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-orange-600">محیط موقت پنل سرپرست تعمیر</div>;
    case 'ceo': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-purple-600">محیط موقت پنل مدیرعامل</div>;
    case 'commercial': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-blue-600">محیط موقت پنل بازرگانی</div>;
    case 'finance': return <div className="p-10 text-center font-bold font-sans text-xl mt-10 text-teal-600">محیط موقت پنل مالی</div>;
    default: return <Navigate to="/login" replace />;
  }
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
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