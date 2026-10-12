import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Home, Package, FileText, MapPin, LogIn, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

export function Header({ currentPage = 'home', onNavigate }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { session, logout, role } = useAuth();
  const navigate = useNavigate();

  const isAdmin = role === 'admin';

  const navItems = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'catalog', label: 'فهرست قطعات/خدمات', icon: Package },
    { id: 'rfq', label: 'استعلام قیمت', icon: FileText },
    { id: 'tracking', label: 'پیگیری سفارش', icon: MapPin },
  ] as const;

  const handleNavigate = (id: string) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      navigate('/');
    }
  };

  const handleDashboardClick = () => {
    if (!session) {
      navigate('/login');
      return;
    }
    navigate('/panel');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 border-b border-slate-200 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[5rem] py-2"> 

          {/* لوگو سامانه */}
          <button
            onClick={() => handleNavigate('home')}
            className="flex items-center gap-3 text-brand-primary shrink-0 hover:opacity-80 transition-opacity focus:outline-none py-1"
          >
            <div className="bg-brand-primary/10 p-2.5 rounded-2xl text-brand-primary">
              <Settings size={28} className="animate-spin-slow" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800">فیکسیز</span>
          </button>

          {/* منوی دسکتاپ */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-brand-700 font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* بخش تماس و دکمه‌های ورود/پنل */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+982165024220"
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors font-medium"
              dir="ltr"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">021-65024220</span>
            </a>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            {session ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDashboardClick}
                  className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all duration-200 bg-brand-primary hover:bg-brand-600 shadow-md shadow-brand-primary/20"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{isAdmin ? 'پنل مدیریت' : 'پنل کاربری'}</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 p-2.5 rounded-xl transition-colors"
                  title="خروج از حساب"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 border-2 border-brand-primary text-brand-700 hover:bg-brand-primary hover:text-white text-sm font-bold px-5 py-2 rounded-xl transition-all duration-200"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود / ثبت‌نام</span>
              </button>
            )}
          </div>

          {/* دکمه منوی موبایل */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  );
}