import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Shield, Phone, LogOut, Trash2, Edit } from 'lucide-react';
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
  admin: { label: 'ادمین', color: 'bg-red-100 text-red-700' },
  coordinator: { label: 'واحد هماهنگی', color: 'bg-green-100 text-green-700' },
  supervisor: { label: 'سرپرست تعمیر', color: 'bg-orange-100 text-orange-700' },
  ceo: { label: 'مدیر مرکز', color: 'bg-purple-100 text-purple-700' },
  commercial: { label: 'واحد بازرگانی', color: 'bg-blue-100 text-blue-700' },
  finance: { label: 'واحد مالی', color: 'bg-teal-100 text-teal-700' },
};

export default function AdminDashboardPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [personnelList, setPersonnelList] = useState<PersonnelUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // فرم ثبت/ویرایش پرسنل 
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('coordinator');
  const [phone, setPhone] = useState('');

  const fetchPersonnel = async () => {
    const { data, error } = await supabase.from('personnel_users').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPersonnelList(data);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const handleAddOrEditPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone) return toast.error('لطفاً تمام فیلدها را پر کنید');
    
    setIsLoading(true);
    try {
      if (editingId) {
        // ویرایش پرسنل
        const { error } = await supabase.from('personnel_users')
          .update({
            full_name: fullName,
            username: username.toLowerCase().trim(),
            role,
            phone: phone.trim()
          })
          .eq('id', editingId);

        if (error) throw new Error(error.message);
        toast.success('اطلاعات پرسنل با موفقیت ویرایش شد');
        setEditingId(null);
      } else {
        // ثبت پرسنل جدید
        const { error } = await supabase.from('personnel_users').insert({
          full_name: fullName,
          username: username.toLowerCase().trim(),
          role,
          phone: phone.trim(),
          is_first_login: true
        });

        if (error) throw new Error(error.message);
        toast.success('پرسنل جدید با موفقیت ثبت شد');
      }

      setFullName('');
      setUsername('');
      setPhone('');
      setRole('coordinator');
      fetchPersonnel();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ثبت/ویرایش پرسنل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (user: PersonnelUser) => {
    setEditingId(user.id);
    setFullName(user.full_name);
    setUsername(user.username);
    setRole(user.role);
    setPhone(user.phone);
    // اسکرول به فرم ویرایش در موبایل
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFullName('');
    setUsername('');
    setRole('coordinator');
    setPhone('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;
    const { error } = await supabase.from('personnel_users').delete().eq('id', id);
    if (!error) {
      toast.success('کاربر حذف شد');
      fetchPersonnel();
      if(editingId === id) cancelEdit();
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
              <h1 className="text-xl font-bold text-slate-800">پنل مدیریت سیستم (ادمین)</h1>
              <p className="text-sm text-slate-500">خوش آمدید، {profile?.full_name || 'مدیر'}</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl font-medium transition-colors">
            <LogOut size={18} /> خروج از حساب
          </button>
        </div>
      </header>

      {/* محتوای اصلی */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* فرم ثبت/ویرایش پرسنل */}
        <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 h-fit transition-all duration-300 relative">
           {editingId && (
            <div className="absolute top-0 right-0 left-0 h-1 bg-amber-400 rounded-t-2xl"></div>
          )}
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
            {editingId ? <Edit className="text-amber-500" size={22} /> : <UserPlus className="text-brand-primary" size={22} />}
            <span>{editingId ? 'ویرایش اطلاعات پرسنل' : 'تعریف پرسنل سازمانی جدید'}</span>
          </div>

          <form onSubmit={handleAddOrEditPersonnel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام و نام خانوادگی</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: علی رضایی" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نام کاربری (انگلیسی)</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: ali_rezaei" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr" disabled={!!editingId} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نقش سازمانی</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary bg-white">
                <option value="coordinator">واحد هماهنگی</option>
                <option value="finance">واحد مالی</option>
                <option value="commercial">واحد بازرگانی</option>
                <option value="supervisor">سرپرست تعمیر</option>
                <option value="admin">ادمین</option>
                <option value="ceo">مدیر مرکز</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">شماره موبایل (ارسال کد ورود)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr" />
            </div>

            {!editingId && <p className="text-xs text-slate-400 mt-1">رمز عبور اولیه برای تمام پرسنل به صورت خودکار تنظیم می‌شود.</p>}

            <div className="flex gap-2 mt-4">
               <button type="submit" disabled={isLoading} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-white transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-primary hover:bg-brand-600'}`}>
                {editingId ? <Edit size={18} /> : <UserPlus size={18} />} 
                {isLoading ? 'در حال ثبت...' : (editingId ? 'ذخیره تغییرات' : 'ایجاد حساب')}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">
                  انصراف
                </button>
              )}
            </div>
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
                      <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${editingId === user.id ? 'bg-amber-50/50' : ''}`}>
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
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditClick(user)} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors" title="ویرایش اطلاعات">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="حذف کاربر">
                              <Trash2 size={18} />
                            </button>
                          </div>
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