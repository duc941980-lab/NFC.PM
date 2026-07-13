import React, { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, Plus, RefreshCw, Shield, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const ERP_MODULES = [
  ['nfc', 'Trang chủ & Dashboard'], ['qc_dashboard', 'Dashboard thống kê QC'], ['qc', 'Kiểm hàng đầu vào'],
  ['plan_tracking', 'Dashboard NLG'], ['plan', 'Kế hoạch mua gỗ'], ['materials', 'Chi tiết thanh toán'],
  ['invoice', 'Quản lý hóa đơn VAT'], ['payment_docs', 'Giấy đề nghị thanh toán'], ['debt', 'Công nợ'],
  ['info', 'Khai báo thông tin'], ['price', 'Quản lý đơn giá mua'], ['regions', 'Sản lượng theo vùng'],
  ['nlg_personnel', 'Nhân sự .GOC'], ['calendar', 'Lịch hàng về'], ['calculator', 'Máy tính gỗ'],
  ['notes', 'Ghi chú & nhắc việc'], ['work_photos', 'Kho ảnh công việc'], ['backup_restore', 'Sao lưu & khôi phục'],
] as const;

export type ManagedUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  roleCode: string;
  role: string;
  isActive: boolean;
  permissions: string[];
};

type Props = { open: boolean; onClose: () => void; currentUserEmail: string; onRegistryChanged?: (users: any[]) => void };

async function adminRequest(path: string, init?: RequestInit) {
  const { data } = await supabase!.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Không thể thực hiện yêu cầu.');
  return payload;
}

export default function UserManagement({ open, onClose, currentUserEmail, onRegistryChanged }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ email: '', username: '', fullName: '', password: '', roleCode: 'viewer', isActive: true, permissions: [] as string[] });

  const allPermissionIds = useMemo(() => ERP_MODULES.map(([id]) => id), []);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await adminRequest('/api/admin/users');
      setUsers(data.users || []);
      onRegistryChanged?.((data.users || []).map((u: ManagedUser) => ({
        email: u.email, username: u.username, fullName: u.fullName, role: u.role, roleCode: u.roleCode,
        isActive: u.isActive, permissions: u.permissions,
      })));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (open) load(); }, [open]);
  if (!open) return null;

  const reset = () => {
    setEditing(null);
    setForm({ email: '', username: '', fullName: '', password: '', roleCode: 'viewer', isActive: true, permissions: [] });
  };

  const startEdit = (u: ManagedUser) => {
    setEditing(u);
    setForm({ email: u.email, username: u.username, fullName: u.fullName, password: '', roleCode: u.roleCode || 'viewer', isActive: u.isActive, permissions: u.permissions || [] });
  };

  const save = async () => {
    if (!form.email.trim() || !form.fullName.trim() || (!editing && !form.password)) {
      setError('Vui lòng nhập email, họ tên và mật khẩu cho tài khoản mới.'); return;
    }
    setLoading(true); setError('');
    try {
      if (editing) {
        await adminRequest(`/api/admin/users/${editing.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await adminRequest('/api/admin/users', { method: 'POST', body: JSON.stringify(form) });
      }
      reset(); await load();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const remove = async (u: ManagedUser) => {
    if (u.email.toLowerCase() === currentUserEmail.toLowerCase()) return setError('Không thể xóa tài khoản đang đăng nhập.');
    if (!confirm(`Xóa tài khoản ${u.fullName} (${u.email})?`)) return;
    setLoading(true); setError('');
    try { await adminRequest(`/api/admin/users/${u.id}`, { method: 'DELETE' }); await load(); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[10000] bg-slate-950/70 p-3 md:p-8 flex items-center justify-center">
    <div className="w-full max-w-6xl max-h-[94vh] overflow-hidden bg-white rounded-3xl shadow-2xl flex flex-col">
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div><h2 className="font-black text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-400"/> Quản lý tài khoản & phân quyền</h2><p className="text-xs text-slate-400 mt-1">Tạo, khóa, xóa tài khoản và chọn các module được phép truy cập.</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10"><X/></button>
      </div>
      <div className="grid lg:grid-cols-[1.1fr_.9fr] min-h-0 flex-1">
        <div className="p-5 overflow-auto border-r border-slate-200">
          <div className="flex items-center justify-between mb-4"><h3 className="font-black text-slate-800">Danh sách tài khoản</h3><button onClick={load} className="p-2 rounded-lg border"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/></button></div>
          <div className="space-y-2">{users.map(u => <button key={u.id} onClick={() => startEdit(u)} className={`w-full text-left p-3 rounded-2xl border transition ${editing?.id===u.id?'border-emerald-500 bg-emerald-50':'border-slate-200 hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="font-extrabold text-slate-900 truncate">{u.fullName}</div><div className="text-xs text-slate-500 truncate">{u.email}</div></div><span className={`text-[10px] font-black px-2 py-1 rounded-full ${u.isActive?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{u.isActive?'HOẠT ĐỘNG':'ĐÃ KHÓA'}</span></div>
            <div className="text-[11px] text-slate-500 mt-2">{u.role} • {u.permissions?.length || 0} quyền</div>
          </button>)}</div>
        </div>
        <div className="p-5 overflow-auto">
          <div className="flex justify-between items-center mb-4"><h3 className="font-black">{editing?'Chỉnh sửa tài khoản':'Thêm tài khoản mới'}</h3>{editing&&<button onClick={reset} className="text-xs font-bold text-blue-600 flex gap-1"><Plus className="w-4 h-4"/> Tạo mới</button>}</div>
          {error&&<div className="mb-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border rounded-xl px-3 py-2.5 text-sm" placeholder="Họ và tên" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/>
            <input className="border rounded-xl px-3 py-2.5 text-sm" placeholder="Tên đăng nhập" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
            <input disabled={!!editing} className="border rounded-xl px-3 py-2.5 text-sm disabled:bg-slate-100" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            <input className="border rounded-xl px-3 py-2.5 text-sm" placeholder={editing?'Mật khẩu mới (để trống nếu giữ nguyên)':'Mật khẩu'} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <select className="border rounded-xl px-3 py-2.5 text-sm" value={form.roleCode} onChange={e=>setForm({...form,roleCode:e.target.value,permissions:e.target.value==='admin'?allPermissionIds:form.permissions})}><option value="admin">Quản trị hệ thống</option><option value="director">Ban giám đốc</option><option value="accounting">Kế toán</option><option value="purchasing">Thu mua</option><option value="qc">QC / Kiểm hàng</option><option value="viewer">Người xem</option></select>
            <label className="border rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/>{form.isActive?<UserCheck className="w-4 h-4 text-emerald-600"/>:<UserX className="w-4 h-4 text-rose-600"/>} Cho phép đăng nhập</label>
          </div>
          <div className="mt-4"><div className="flex items-center justify-between mb-2"><span className="text-xs font-black uppercase text-slate-500">Quyền truy cập module</span><div className="flex gap-3 text-xs"><button onClick={()=>setForm({...form,permissions:allPermissionIds})} className="text-blue-600 font-bold">Chọn tất cả</button><button onClick={()=>setForm({...form,permissions:[]})} className="text-rose-600 font-bold">Bỏ tất cả</button></div></div>
            <div className="grid sm:grid-cols-2 gap-2">{ERP_MODULES.map(([id,label])=><label key={id} className={`p-2.5 rounded-xl border text-xs font-bold flex gap-2 items-center ${form.permissions.includes(id)?'bg-emerald-50 border-emerald-300 text-emerald-800':'bg-white border-slate-200 text-slate-600'}`}><input type="checkbox" checked={form.permissions.includes(id)} onChange={e=>setForm({...form,permissions:e.target.checked?[...form.permissions,id]:form.permissions.filter(x=>x!==id)})}/>{label}</label>)}</div>
          </div>
          <div className="mt-5 flex justify-between gap-3 border-t pt-4">{editing?<button onClick={()=>remove(editing)} disabled={loading} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-black text-xs flex gap-2"><Trash2 className="w-4 h-4"/> Xóa tài khoản</button>:<span/>}<button onClick={save} disabled={loading} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex gap-2"><LockKeyhole className="w-4 h-4"/>{editing?'Lưu thay đổi':'Tạo tài khoản'}</button></div>
        </div>
      </div>
    </div>
  </div>;
}
