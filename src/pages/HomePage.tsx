import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, ShieldCheck, Clock, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Header } from '../components/Header';

export default function HomePage() {
  const navigate = useNavigate();
  const { session, role } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Header />

      {/* بخش اصلی (Hero) */}
      <main className="relative bg-brand-dark overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#2dd4bf 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
        
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
              {session ? (
                <>
                  <LayoutDashboard size={20} />
                  {isAdmin ? 'ورود به پنل مدیریت' : 'ورود به پنل کاربری'}
                </>
              ) : (
                <>
                  ورود به سامانه
                  <ArrowLeft size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* بخش ویژگی‌ها */}
      <section className="max-w-7xl mx-auto px-4 py-16 relative z-20 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl mb-6"><Clock size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">ثبت سریع و آسان</h3>
            <p className="text-slate-500 leading-relaxed">درخواست تعمیر خود را به سادگی و در کمتر از یک دقیقه در سامانه ثبت کنید.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="bg-brand-50 text-brand-600 p-4 rounded-2xl mb-6"><ShieldCheck size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">شفافیت در هزینه</h3>
            <p className="text-slate-500 leading-relaxed">دریافت برآورد دقیق قیمت و مشاهده قطعات مصرفی پیش از شروع فرآیند تعمیر.</p>
          </div>
          <div className="card p-8 flex flex-col items-center text-center">
            <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl mb-6"><CheckCircle size={40} /></div>
            <h3 className="text-xl font-bold mb-3 text-slate-800">پیگیری لحظه‌ای</h3>
            <p className="text-slate-500 leading-relaxed">مشاهده وضعیت لحظه به لحظه دستگاه در تمامی مراحل از طریق پنل کاربری.</p>
          </div>
        </div>
      </section>
    </div>
  );
}