import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Home, MapPin, Settings, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onOpenTracking?: () => void;
}

export function Header({ currentPage = 'home', onNavigate, onOpenTracking }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'tracking', label: 'پیگیری درخواست', icon: MapPin },
  ] as const;

  const handleNavigate = (id: string) => {
    if (id === 'tracking') {
      if (onOpenTracking) {
        onOpenTracking();
      } else {
        const code = prompt('لطفاً کد پیگیری خود را وارد کنید (مثال: FIX-633141):');
        if (code) {
          // انتقال مستقیم به صفحه پنل همراه با کد پیگیری یا جستجوی مستقیم
          window.location.href = `/panel?tracking=${code.trim()}`;
        }
      }
      return;
    }

    if (onNavigate) {
      onNavigate(id);
    } else {
      navigate('/');
    }
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
          <nav className="hidden md:flex items-center gap-4">
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

          {/* بخش تماس و دکمه ورود به پنل */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+982165024220"
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors font-medium"
              dir="ltr"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">021-65024220</span>
            </a>

            {/* دکمه ورود به پنل */}
            <button
              onClick={() => { window.location.href = '/panel'; }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              <span>ورود به پنل</span>
            </button>
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