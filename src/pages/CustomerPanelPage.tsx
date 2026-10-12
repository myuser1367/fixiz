import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, Trash2, Edit3, ShieldAlert, Wrench, Check, X } from 'lucide-react';

interface RepairRequest {
  id: string;
  trackingCode: string;
  deviceType: string;
  brand: string;
  model: string;
  problemDescription: string;
  status: 'registered' | 'accepted' | 'repairing' | 'ready' | 'delivered';
  statusLabel: string;
  createdAt: string;
}

export function CustomerPanelPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'requests' | 'new'>('requests');
  const [successMessage, setSuccessMessage] = useState('');
  
  // نمونه داده‌های درخواست‌های مشتری
  const [requests, setRequests] = useState<RepairRequest[]>([
    {
      id: '1',
      trackingCode: 'FIX-98421',
      deviceType: 'لپ‌تاپ',
      brand: 'Lenovo',
      model: 'IdeaPad 3',
      problemDescription: 'دستگاه روشن نمی‌شود و بوی سوختگی می‌دهد.',
      status: 'registered',
      statusLabel: 'ثبت شده (در انتظار بررسی)',
      createdAt: '۱۴۰۵/۰۷/۲۰',
    },
    {
      id: '2',
      trackingCode: 'FIX-73210',
      deviceType: 'کنسول بازی',
      brand: 'Sony',
      model: 'PS5',
      problemDescription: 'دسته کنسول شارژ نمی‌شود.',
      status: 'accepted',
      statusLabel: 'پذیرش شده در تعمیرگاه',
      createdAt: '۱۴۰۵/۰۷/۱۸',
    }
  ]);

  // فرم ثبت درخواست جدید
  const [newReq, setNewReq] = useState({
    deviceType: 'لپ‌تاپ',
    brand: '',
    model: '',
    problemDescription: '',
  });

  // حالت ویرایش
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ brand: '', model: '', problemDescription: '' });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const randomCode = 'FIX-' + Math.floor(10000 + Math.random() * 90000);
    const created: RepairRequest = {
      id: Date.now().toString(),
      trackingCode: randomCode,
      deviceType: newReq.deviceType,
      brand: newReq.brand,
      model: newReq.model,
      problemDescription: newReq.problemDescription,
      status: 'registered',
      statusLabel: 'ثبت شده (در انتظار بررسی)',
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };

    setRequests([created, ...requests]);
    setNewReq({ deviceType: 'لپ‌تاپ', brand: '', model: '', problemDescription: '' });
    setActiveTab('requests');
    setSuccessMessage(`درخواست شما با موفقیت ثبت شد! کد پیگیری: ${randomCode} (به مسئول هماهنگی اطلاع‌رسانی شد)`);
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const handleDelete = (id: string, status: string) => {
    if (status !== 'registered') {
      alert('امکان حذف درخواست پس از مرحله پذیرش وجود ندارد.');
      return;
    }
    if (confirm('آیا از حذف این درخواست اطمینان دارید؟ (به مسئول هماهنگی اطلاع داده می‌شود)')) {
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  const startEdit = (req: RepairRequest) => {
    if (req.status !== 'registered') {
      alert('فقط درخواست‌های در مرحله ثبت شده قابل ویرایش هستند.');
      return;
    }
    setEditingId(req.id);
    setEditForm({ brand: req.brand, model: req.model, problemDescription: req.problemDescription });
  };

  const saveEdit = (id: string) => {
    setRequests(requests.map(r => r.id === id ? { ...r, ...editForm } : r));
    setEditingId(null);
    setSuccessMessage('تغییرات درخواست با موفقیت ذخیره شد و به مسئول هماهنگی اعلام گردید.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      <Header currentPage="panel" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بنر خوش‌آمدگویی */}
        <div className="bg-gradient-to-r from-brand-primary to-teal-700 text-white rounded-3xl p-6 sm:p-8 mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">پنل کاربری مشتری فیکسیز</h1>
            <p className="text-teal-100 text-sm sm:text-base">
              شماره همراه: {session?.user?.phone || '0912...'} | از اینجا می‌توانید درخواست‌های تعمیر خود را ثبت و پیگیری کنید.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('new')}
            className="flex items-center gap-2 bg-white text-brand-700 hover:bg-teal-50 font-bold px-6 py-3 rounded-2xl shadow-md transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>ثبت درخواست تعمیر جدید</span>
          </button>
        </div>

        {/* پیام موفقیت */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm animate-bounce-short">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm sm:text-base">{successMessage}</span>
          </div>
        )}

        {/* ناوبری تب‌ها */}
        <div className="flex border-b border-slate-200 mb-8 gap-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-4 px-4 font-bold text-base transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-brand-primary text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>درخواست‌های من ({requests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-4 px-4 font-bold text-base transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'new'
                ? 'border-brand-primary text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>ثبت درخواست جدید</span>
          </button>
        </div>

        {/* محتوای تب درخواست‌ها */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {requests.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">هنوز درخواستی ثبت نکرده‌اید</h3>
                <p className="text-slate-500 mb-6">برای شروع تعمیر دستگاه خود، روی دکمه زیر کلیک کنید.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="bg-brand-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-600 transition-colors"
                >
                  ثبت اولین درخواست
                </button>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-brand-50 text-brand-700 font-extrabold px-3 py-1 rounded-xl text-sm">
                          {req.trackingCode}
                        </span>
                        <span className="text-slate-400 text-sm">تاریخ ثبت: {req.createdAt}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {req.deviceType} - {req.brand} {req.model}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                        req.status === 'registered' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        req.status === 'accepted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {req.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="py-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                      <strong>شرح خرابی:</strong> {req.problemDescription}
                    </p>
                  </div>

                  {/* دکمه‌های ویرایش و حذف فقط تا قبل از مرحله پذیرش */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>امکان ویرایش و حذف فقط تا قبل از مرحله پذیرش تعمیرگاه وجود دارد.</span>
                    </div>

                    {req.status === 'registered' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(req)}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>ویرایش</span>
                        </button>
                        <button
                          onClick={() => handleDelete(req.id, req.status)}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">قفل شده (توسط تعمیرگاه پذیرش شده است)</span>
                    )}
                  </div>

                  {/* مودال یا بخش ویرایش سریع */}
                  {editingId === req.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="font-bold text-slate-800 text-sm">ویرایش مشخصات درخواست</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="برند"
                          value={editForm.brand}
                          onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                        <input
                          type="text"
                          placeholder="مدل"
                          value={editForm.model}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="شرح خرابی"
                        value={editForm.problemDescription}
                        onChange={(e) => setEditForm({ ...editForm, problemDescription: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                        >
                          انصراف
                        </button>
                        <button
                          onClick={() => saveEdit(req.id)}
                          className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl"
                        >
                          ذخیره تغییرات
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* محتوای تب ثبت درخواست جدید */}
        {activeTab === 'new' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto">
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">ثبت درخواست جدید تعمیرات</h2>
            <p className="text-slate-500 text-sm mb-6">اطلاعات دستگاه خود را با دقت وارد کنید تا کد پیگیری صادر شود و به هماهنگی اعلام گردد.</p>

            <form onSubmit={handleCreateRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نوع دستگاه</label>
                <select
                  value={newReq.deviceType}
                  onChange={(e) => setNewReq({ ...newReq, deviceType: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
                >
                  <option value="لپ‌تاپ">لپ‌تاپ</option>
                  <option value="گوشی موبایل">گوشی موبایل</option>
                  <option value="تبلت">تبلت</option>
                  <option value="کنسول بازی">کنسول بازی</option>
                  <option value="سایر تجهیزات">سایر تجهیزات</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">برند دستگاه</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلا: ایسوس، اپل، سامسونگ..."
                    value={newReq.brand}
                    onChange={(e) => setNewReq({ ...newReq, brand: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">مدل دقیق</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلا: ZenBook 14"
                    value={newReq.model}
                    onChange={(e) => setNewReq({ ...newReq, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">شرح کامل خرابی و ایرادات دستگاه</label>
                <textarea
                  required
                  rows={4}
                  placeholder="لطفا علائم خرابی، نحوه بروز مشکل و نکات مهم را بنویسید..."
                  value={newReq.problemDescription}
                  onChange={(e) => setNewReq({ ...newReq, problemDescription: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl text-sm hover:bg-brand-600 shadow-lg shadow-brand-primary/20 transition-all"
                >
                  ثبت نهایی درخواست و دریافت کد پیگیری
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}