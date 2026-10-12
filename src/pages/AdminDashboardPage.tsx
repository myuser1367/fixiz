import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Shield, Phone, LogOut, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PersonnelUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  phone: string;
  is_first_login: boolean;
}

const roleNames: Record<string, { label: string; color: string }> = {
  admin: { label: 'مدیر سیستم (Admin)', color: 'bg-red-100 text-red-700' },
  coordinator: { label: 'هماهنگ‌کننده', color: 'bg-green-100 text-green-700' },
  supervisor: { label: 'سرپرست تعمیر', color: 'bg-orange-100 text-orange-700' },
  ceo: { label: 'مدیرعامل', color: 'bg-purple-100 text-purple-700' },
  commercial: { label: 'بازرگانی', color: 'bg-blue-100 text-blue-700' },
  finance: { label: 'مالی', color: 'bg-teal-100 text-teal-700' },
};

export default function AdminDashboardPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [personnelList, setPersonnelList] = useState<PersonnelUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // فرم ثبت پرسنل جدید
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('coordinator');
  const [phone, setPhone] = useState('');

  // واکشی لیست پرسنل
  const fetchPersonnel = async () => {
    const { data, error } = await supabase.from('personnel_users').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPersonnelList(data);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  // ثبت پرسنل جدید
  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone) return toast.error('لطفاً تمام فیلدها را پر کنید');
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('personnel_users').insert({
        full_name: fullName,
        username: username.toLowerCase().trim(),
        role,
        phone: phone.trim(),
        is_first_login: true
      });

      if (error) throw new Error(error.message);

      toast.success('پرسنل جدید با موفقیت ثبت شد');
      setFullName('');
      setUsername('');
      setPhone('');
      fetchPersonnel();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ثبت پرسنل');
    } finally {
      setIsLoading(false);
    }
  };

  // حذف پرسنل
  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    const { error } = await supabase.from('personnel_users').delete().eq('id', id);
    if (!error) {
      toast.success('کاربر حذف شد');
      fetchPersonnel();
    } else {
      toast.error('خطا در حذف کاربر');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* هدر پنل */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 p-2.5 rounded-xl text-brand-primary">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">پنل مدیریت سیستم (ادمین کل)</h1>
              <p className="text-sm text-slate-500">خوش آمدید، {profile?.full_name || 'مدیر'}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl font-medium transition-colors">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </header>

      {/* محتوای اصلی */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* فرم ثبت پرسنل جدید */}
        <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 h-fit">
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
            <UserPlus className="text-brand-primary" size={22} />
            <span>تعریف پرسنل سازمانی جدید</span>
          </div>

          <form onSubmit={handleAddPersonnel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام و نام خانوادگی</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: علی رضایی" className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کاربری (انگلیسی)</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: ali_rezaei" className="input-field" dir="ltr" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نقش سازمانی</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                <option value="coordinator">هماهنگ‌کننده</option>
                <option value="supervisor">سرپرست تعمیر</option>
                <option value="ceo">مدیرعامل</option>
                <option value="commercial">بازرگانی</option>
                <option value="finance">مالی</option>
                <option value="admin">مدیر سیستم (Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره موبایل (جهت ارسال کد تایید)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" className="input-field" dir="ltr" />
            </div>

            <p className="text-xs text-slate-400 mt-1">رمز عبور اولیه برای تمام پرسنل به صورت خودکار تنظیم می‌شود و در اولین ورود از آن‌ها خواسته می‌شود رمز را تغییر دهند.</p>

            <button type="submit" disabled={isLoading} className="w-btn-primary btn-primary w-full mt-4 flex justify-center items-center gap-2">
              <UserPlus size={18} /> {isLoading ? 'در حال ثبت...' : 'ثبت و ایجاد حساب پرسنل'}
            </button>
          </form>
        </div>

        {/* لیست پرسنل موجود */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-card border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
              <Shield className="text-brand-primary" size={22} />
              <span>لیست پرسنل و دسترسی‌های فعال</span>
            </div>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{personnelList.length} نفر</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase">
                  <th className="pb-3 px-3">نام پرسنل</th>
                  <th className="pb-3 px-3">نام کاربری</th>
                  <th className="pb-3 px-3">نقش سازمانی</th>
                  <th className="pb-3 px-3">موبایل</th>
                  <th className="pb-3 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {personnelList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">هنوز هیچ پرسنلی ثبت نشده است.</td>
                  </tr>
                ) : (
                  personnelList.map((user) => {
                    const badge = roleNames[user.role] || { label: user.role, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3 font-bold text-slate-800">{user.full_name}</td>
                        <td className="py-4 px-3 font-mono text-slate-600" dir="ltr">{user.username}</td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-mono text-slate-600" dir="ltr">
                          <span className="flex items-center gap-1 justify-end"><Phone size={14} className="text-slate-400" />{user.phone}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="حذف کاربر">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}