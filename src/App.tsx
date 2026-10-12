import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// کامپوننت محافظت از مسیرها بر اساس نقش
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { session, role, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>;
  if (!session) return <Navigate to="/" replace />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;
  
  return <>{children}</>;
};

// صفحات موقت برای تست مسیرها (بعداً اینها را در پوشه pages می‌سازیم)
const LoginPage = () => <div className="p-10 text-center">صفحه ورود (مشتری و پرسنل)</div>;
const CustomerPanel = () => <div className="p-10 text-center text-blue-600 font-bold">پنل مشتری (ثبت درخواست و پیگیری)</div>;
const CoordinatorPanel = () => <div className="p-10 text-center text-green-600 font-bold">پنل هماهنگ‌کننده</div>;
const SupervisorPanel = () => <div className="p-10 text-center text-orange-600 font-bold">پنل سرپرست تعمیر (پذیرش و گزارش کار)</div>;
const CeoPanel = () => <div className="p-10 text-center text-purple-600 font-bold">پنل مدیرعامل (برآورد قیمت و تاییدیه)</div>;

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      
      {/* پنل مشتری */}
      <Route path="/panel" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerPanel />
        </ProtectedRoute>
      } />

      {/* پنل هماهنگ‌کننده */}
      <Route path="/coordinator" element={
        <ProtectedRoute allowedRoles={['coordinator']}>
          <CoordinatorPanel />
        </ProtectedRoute>
      } />

      {/* پنل سرپرست تعمیر */}
      <Route path="/supervisor" element={
        <ProtectedRoute allowedRoles={['supervisor']}>
          <SupervisorPanel />
        </ProtectedRoute>
      } />

      {/* پنل مدیرعامل */}
      <Route path="/ceo" element={
        <ProtectedRoute allowedRoles={['ceo']}>
          <CeoPanel />
        </ProtectedRoute>
      } />

      {/* سایر مسیرها برای بازرگانی، مالی و ادمین به همین شکل اضافه می‌شوند */}
      
      <Route path="/unauthorized" element={<div className="p-10 text-center text-red-500">شما دسترسی به این بخش را ندارید.</div>} />
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