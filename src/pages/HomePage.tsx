import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, CheckCircle, ShieldCheck, Clock, Settings, ArrowLeft, LayoutDashboard, LogOut } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* هدر شیشه‌ای و چسبان */}
      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* لوگو */}
          <div className="flex items-center gap-3 text-brand-primary cursor-pointer animate-fade-in" onClick={() => navigate('/')}>
            <Settings size={36} className="animate-spin-slow" style={{ animationDuration: '4s' }} />
            <span className="text-3xl font-extrabold text-slate-800">فیکسیز</span>
          </div>
          
          {/* منوی دسکتاپ */}
          <div className="hidden md:flex items-center gap-8 text-slate-600 font-medium animate-fade-in">
            <a href="#" className="hover:text-brand-primary transition-colors">خانه</a>
            <a href="#" className="hover:text-brand-primary transition-colors">خدمات ما</a>
            <a href="#" className="hover:text-brand-primary transition-colors">پیگیری سفارش</a>
          </div>

          {/* دکمه‌های هدر بر اساس وضعیت لاگین */}
          <div className="flex items-center gap-3 animate-fade-in">
            {session ? (
              <>
                <button 
                  onClick={() => navigate('/panel')}
                  className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
                >
                  <LayoutDashboard size={18} />
                  پنل مدیریت
                </button>
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold px-4 py-2.5 rounded-xl transition-all text-sm"
                  title="خروج از حساب"
                >
                  <LogOut size={18} />
                  خروج
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/login')}
                className="btn-outline flex items-center gap-2 text-sm py-2.5 px-5"
              >
                ورود / ثبت‌نام
                <LogIn size={18} />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* بخش اصلی (Hero) - سرمه‌ای تیره */}
      <main className="relative bg-brand-dark overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10" 
          style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}
        ></div>
        
        <div className="absolute bottom-0 w-full overflow-hidden leading-[0]">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 relative top-[1px]">
            <path d="M0 120L1440 120V0C1440 0 1140 100 720 100C300 100 0 0 0 0V120Z" fill="currentColor" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-32 sm:py-40 text-center z-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            سامانه جامع <span className="text-brand-light text-gradient">مدیریت تعمیرات</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            از ثبت درخواست تا برآورد هزینه و تحویل کالا، همه چیز را کاملاً آنلاین، شفاف و سریع مدیریت و پیگیری کنید.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate(session ? '/panel' : '/login')} 
              className="btn-primary flex justify-center items-center gap-2 text-lg px-8 py-4"
            >
              {session ? 'ورود به پنل کاربری' : 'ورود به سامانه'}
              <ArrowLeft size={20} />
            </button>
          </div>
        </div>
      </main>

      {/* بخش ویژگی‌ها */}
      <section className="max-w-7xl mx-auto px-4 py-16 relative z-20 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-8 flex flex-col items-center text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl mb-6"><Clock size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">ثبت سریع و آسان</h3>
            <p className="text-slate-500 leading-relaxed">درخواست تعمیر خود را به سادگی و در کمتر از یک دقیقه در سامانه ثبت کنید.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-brand-50 text-brand-600 p-4 rounded-2xl mb-6"><ShieldCheck size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">شفافیت در هزینه</h3>
            <p className="text-slate-500 leading-relaxed">دریافت برآورد دقیق قیمت و مشاهده قطعات مصرفی پیش از شروع فرآیند تعمیر.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl mb-6"><CheckCircle size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">پیگیری لحظه‌ای</h3>
            <p className="text-slate-500 leading-relaxed">مشاهده وضعیت لحظه به لحظه دستگاه در تمامی مراحل از طریق پنل کاربری.</p>
          </div>
        </div>
      </section>
    </div>
  );
}