import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Shield, Phone, LogOut, Trash2, Edit, Home, Key, Mail, Plus, FolderPlus, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

interface PersonnelUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  phone: string;
  is_first_login: boolean;
}

interface EmailGroup {
  id: string;
  name: string;
  emails?: string[];
}

interface Role {
  id: string;
  role_key: string;
  role_label: string;
  color: string;
}

export default function AdminDashboardPage() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  // اضافه شدن 'roles' به استیت تب‌ها
  const [activeAdminTab, setActiveAdminTab] = useState<'personnel' | 'emails' | 'roles'>('personnel');

  const [personnelList, setPersonnelList] = useState<PersonnelUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState(''); // مقدار اولیه خالی است تا بعد از فچ شدن نقش‌ها پر شود
  const [phone, setPhone] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // استیت‌های مربوط به مدیریت گروه‌ها و ایمیل‌ها
  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupEmails, setGroupEmails] = useState<string[]>(['']);

  // استیت‌های مربوط به نقش‌های پویا
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');

  const fetchPersonnel = async () => {
    const { data, error } = await supabase.from('personnel_users').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPersonnelList(data);
    }
  };

  const fetchGroupsAndEmails = async () => {
    const { data: groupData, error: groupErr } = await supabase.from('email_groups').select('*').order('created_at', { ascending: false });
    if (groupErr || !groupData) return;

    const loadedGroups: EmailGroup[] = [];
    for (const g of groupData) {
      const { data: emailData } = await supabase.from('group_emails').select('email').eq('group_id', g.id);
      loadedGroups.push({
        id: g.id,
        name: g.name,
        emails: emailData ? emailData.map(e => e.email) : []
      });
    }
    setGroups(loadedGroups);
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase.from('roles').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      setRoles(data);
      if (data.length > 0 && !role) {
        setRole(data[0].role_key);
      }
    }
  };

  useEffect(() => {
    fetchPersonnel();
    fetchGroupsAndEmails();
    fetchRoles();
  }, []);

  const handleAddOrEditPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone || !role) return toast.error('لطفاً تمام فیلدها را پر کنید');
    
    setIsLoading(true);
    try {
      const cleanUsername = username.toLowerCase().trim();

      if (editingId) {
        const { error } = await supabase.from('personnel_users')
          .update({
            full_name: fullName,
            username: cleanUsername,
            role,
            phone: phone.trim()
          })
          .eq('id', editingId);

        if (error) throw new Error(error.message);
        toast.success('اطلاعات پرسنل با موفقیت ویرایش شد');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('personnel_users').insert({
          full_name: fullName,
          username: cleanUsername,
          role,
          phone: phone.trim(),
          is_first_login: true,
          password: 'Aa@123456'
        });

        if (error) throw new Error(error.message);
        toast.success('پرسنل جدید با موفقیت ثبت شد');
      }

      setFullName('');
      setUsername('');
      setPhone('');
      setRole(roles.length > 0 ? roles[0].role_key : '');
      fetchPersonnel();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ثبت/ویرایش پرسنل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('رمز عبور باید حداقل ۶ حرف باشد');
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('رمز عبور ادمین با موفقیت تغییر کرد');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message || 'خطا در تغییر رمز عبور');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFullName('');
    setUsername('');
    setRole(roles.length > 0 ? roles[0].role_key : '');
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

  // مدیریت فیلدهای ایمیل داینامیک برای افزودن گروه جدید
  const handleAddEmailInput = () => {
    setGroupEmails([...groupEmails, '']);
  };

  const handleEmailChange = (index: number, value: string) => {
    const updated = [...groupEmails];
    updated[index] = value;
    setGroupEmails(updated);
  };

  const handleRemoveEmailInput = (index: number) => {
    const updated = [...groupEmails];
    updated.splice(index, 1);
    setGroupEmails(updated);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return toast.error('عنوان گروه الزامی است');
    
    const validEmails = groupEmails.filter(e => e.trim() !== '');
    if (validEmails.length === 0) return toast.error('حداقل یک ایمیل معتبر وارد کنید');

    setIsLoading(true);
    try {
      // ذخیره گروه
      const { data: groupData, error: groupErr } = await supabase
        .from('email_groups')
        .insert({ name: newGroupName.trim() })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // ذخیره ایمیل‌های مربوط به این گروه
      const emailInserts = validEmails.map(email => ({
        group_id: groupData.id,
        email: email.trim()
      }));

      const { error: emailErr } = await supabase.from('group_emails').insert(emailInserts);
      if (emailErr) throw emailErr;

      toast.success('گروه و ایمیل‌ها با موفقیت ذخیره شدند');
      setNewGroupName('');
      setGroupEmails(['']);
      fetchGroupsAndEmails();
    } catch (err: any) {
      toast.error('خطا در ثبت گروه: ' + (err.message || 'نام گروه تکراری است'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('آیا از حذف این گروه و تمام ایمیل‌های آن مطمئن هستید؟')) return;
    const { error } = await supabase.from('email_groups').delete().eq('id', groupId);
    if (!error) {
      toast.success('گروه با موفقیت حذف شد');
      fetchGroupsAndEmails();
    } else {
      toast.error('خطا در حذف گروه');
    }
  };

  // توابع جدید مربوط به مدیریت نقش‌ها
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleKey.trim() || !newRoleLabel.trim()) return toast.error('کلید و عنوان نقش الزامی است');
    
    setIsLoading(true);
    try {
      // رنگ پیش‌فرض برای نقش‌های جدید
      const randomColor = 'bg-slate-100 text-slate-700'; 
      
      const { error } = await supabase
        .from('roles')
        .insert({ 
          role_key: newRoleKey.trim().toLowerCase(), 
          role_label: newRoleLabel.trim(),
          color: randomColor
        });

      if (error) throw error;

      toast.success('نقش جدید با موفقیت تعریف شد');
      setNewRoleKey('');
      setNewRoleLabel('');
      fetchRoles();
    } catch (err: any) {
      toast.error('خطا در ثبت نقش: ممکن است کلید نقش تکراری باشد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async (id: string, roleKey: string) => {
    if (!confirm(`آیا از حذف نقش "${roleKey}" اطمینان دارید؟`)) return;
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (!error) {
      toast.success('نقش با موفقیت حذف شد');
      fetchRoles();
    } else {
      toast.error('خطا در حذف نقش');
    }
  };

  const getRoleDetails = (roleKey: string) => {
    const foundRole = roles.find(r => r.role_key === roleKey);
    return foundRole ? { label: foundRole.role_label, color: foundRole.color } : { label: roleKey, color: 'bg-gray-100 text-gray-700' };
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
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
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPasswordModal(true)} className="hidden sm:flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl transition-colors font-bold">
              <Key size={18} /> تغییر رمز
            </button>
            <button onClick={() => navigate('/')} className="hidden sm:flex items-center gap-1.5 text-sm bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2.5 rounded-xl transition-colors font-bold">
              <Home size={18} /> صفحه اصلی
            </button>
            <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold transition-colors" title="خروج">
              <LogOut size={18} /> <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* تب‌های مدیریت ادمین */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 w-full max-w-2xl gap-1">
          <button onClick={() => setActiveAdminTab('personnel')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'personnel' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Users size={18} /> مدیریت پرسنل
          </button>
          <button onClick={() => setActiveAdminTab('emails')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'emails' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Mail size={18} /> تعریف گروه‌ها و ایمیل‌ها
          </button>
          <button onClick={() => setActiveAdminTab('roles')} className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl text-sm font-bold transition-all ${activeAdminTab === 'roles' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Briefcase size={18} /> مدیریت نقش‌ها
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {activeAdminTab === 'personnel' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 h-fit transition-all duration-300 relative">
              {editingId && <div className="absolute top-0 right-0 left-0 h-1 bg-amber-400 rounded-t-2xl"></div>}
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
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: ali_rezaei" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نقش سازمانی</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary bg-white">
                    {roles.map((r) => (
                      <option key={r.id} value={r.role_key}>{r.role_label}</option>
                    ))}
                    {roles.length === 0 && <option value="">در حال دریافت نقش‌ها...</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">شماره موبایل (ارسال کد ورود)</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr" />
                </div>

                {!editingId && <p className="text-xs text-slate-400 mt-1">رمز عبور پیش‌فرض برای تمامی پرسنل جدید <strong className="font-mono">Aa@123456</strong> می‌باشد و در اولین ورود باید آن را تغییر دهند.</p>}

                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={isLoading} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold text-white transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-primary hover:bg-brand-600'}`}>
                    {editingId ? <Edit size={18} /> : <UserPlus size={18} />} 
                    {isLoading ? 'در حال ثبت...' : (editingId ? 'ذخیره تغییرات' : 'ایجاد حساب')}
                  </button>
                  {editingId && (
                    <button type="button" onClick={cancelEdit} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">انصراف</button>
                  )}
                </div>
              </form>
            </div>

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
                      <tr><td colSpan={5} className="py-8 text-center text-slate-400">هنوز هیچ پرسنلی ثبت نشده است.</td></tr>
                    ) : (
                      personnelList.map((user) => {
                        const badge = getRoleDetails(user.role);
                        return (
                          <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${editingId === user.id ? 'bg-amber-50/50' : ''}`}>
                            <td className="py-4 px-3 font-bold text-slate-800">{user.full_name}</td>
                            <td className="py-4 px-3 font-mono text-slate-600" dir="ltr">{user.username}</td>
                            <td className="py-4 px-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badge.color}`}>{badge.label}</span>
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
          </div>
        ) : activeAdminTab === 'emails' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 h-fit">
              <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
                <FolderPlus className="text-brand-primary" size={22} />
                <span>تعریف گروه و ایمیل‌های مربوطه</span>
              </div>

              <form onSubmit={handleSaveGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">عنوان گروه</label>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="مثال: همراه اول" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">لیست ایمیل‌ها</label>
                  <div className="space-y-2">
                    {groupEmails.map((emailVal, index) => (
                      <div key={index} className="flex gap-2">
                        <input 
                          type="email" 
                          value={emailVal} 
                          onChange={(e) => handleEmailChange(index, e.target.value)} 
                          placeholder="example@domain.com" 
                          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-brand-primary text-left text-sm" 
                          dir="ltr"
                        />
                        {groupEmails.length > 1 && (
                          <button type="button" onClick={() => handleRemoveEmailInput(index)} className="px-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddEmailInput} className="mt-2 text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
                    <Plus size={14} /> افزودن فیلد ایمیل دیگر
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors mt-4">
                  {isLoading ? 'در حال ثبت...' : 'ذخیره گروه و ایمیل‌ها'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-card border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">گروه‌های تعریف‌شده و ایمیل‌ها</h3>
              {groups.length === 0 ? (
                <div className="text-center py-10 text-slate-400">هنوز هیچ گروهی تعریف نشده است.</div>
              ) : (
                <div className="space-y-4">
                  {groups.map(group => (
                    <div key={group.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base mb-1">🏷 {group.name}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {group.emails?.map((em, idx) => (
                            <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-600" dir="ltr">
                              ✉ {em}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteGroup(group.id)} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                        <Trash2 size={14} /> حذف گروه
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 h-fit">
              <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg">
                <Briefcase className="text-brand-primary" size={22} />
                <span>تعریف نقش سازمانی جدید</span>
              </div>

              <form onSubmit={handleSaveRole} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">عنوان نقش (نمایشی)</label>
                  <input type="text" value={newRoleLabel} onChange={(e) => setNewRoleLabel(e.target.value)} placeholder="مثال: کارشناس فنی" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">کلید سیستمی نقش (انگلیسی)</label>
                  <input type="text" value={newRoleKey} onChange={(e) => setNewRoleKey(e.target.value)} placeholder="مثال: technical_expert" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary" dir="ltr" required />
                  <p className="text-xs text-slate-400 mt-1">این کلید در دیتابیس ذخیره می‌شود و نباید تکراری باشد.</p>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-600 transition-colors mt-4">
                  {isLoading ? 'در حال ثبت...' : 'ذخیره نقش جدید'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-card border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">نقش‌های تعریف‌شده در سیستم</h3>
              {roles.length === 0 ? (
                <div className="text-center py-10 text-slate-400">هنوز هیچ نقشی تعریف نشده است.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roles.map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">{r.role_label}</div>
                        <div className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border inline-block" dir="ltr">{r.role_key}</div>
                      </div>
                      <button onClick={() => handleDeleteRole(r.id, r.role_key)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف نقش">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-slate-800 mb-4">تغییر رمز عبور ادمین</h3>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">رمز عبور جدید</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-brand-primary text-left" dir="ltr" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-brand-primary hover:bg-brand-600 text-white rounded-xl font-bold transition-colors">تایید تغییرات</button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}