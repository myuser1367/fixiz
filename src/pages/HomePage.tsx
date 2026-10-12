import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowLeft, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans" dir="rtl">
      {/* هدر سایت */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Wrench size={32} />
            <span className="text-2xl font-extrabold text-gray-900">فیکسیز</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            ورود / ثبت‌نام
            <ArrowLeft size={18} />
          </button>
        </div>
      </header>

      {/* بخش اصلی */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            سامانه جامع <span className="text-blue-600">مدیریت تعمیرات</span> و خدمات
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            از ثبت درخواست تا برآورد هزینه و تحویل کالا، همه چیز را آنلاین، شفاف و سریع مدیریت و پیگیری کنید.
          </p>
          
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg transition-all">
              ورود به سامانه
            </button>
          </div>
        </div>

        {/* ویژگی‌ها */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <CheckCircle className="text-green-500 w-12 h-12 mb-4" />
              <h3 className="text-lg font-bold mb-2">ثبت سریع و آسان</h3>
              <p className="text-gray-600">درخواست خود را در کمتر از ۱ دقیقه ثبت کنید.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <CheckCircle className="text-blue-500 w-12 h-12 mb-4" />
              <h3 className="text-lg font-bold mb-2">شفافیت در هزینه</h3>
              <p className="text-gray-600">دریافت برآورد قیمت پیش از شروع تعمیرات قطعه.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <CheckCircle className="text-purple-500 w-12 h-12 mb-4" />
              <h3 className="text-lg font-bold mb-2">پیگیری لحظه‌ای</h3>
              <p className="text-gray-600">مشاهده لحظه به لحظه وضعیت دستگاه در پنل کاربری.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}