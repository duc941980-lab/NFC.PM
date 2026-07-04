import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Building, CheckCircle2, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (user: { username: string; email: string; fullName: string; role: string; avatar?: string }) => void;
  userEmail?: string;
}

const LOCAL_STORAGE_CURRENT_USER_KEY = 'wood_current_user_v1';

type ProfileRow = {
  email: string;
  username?: string | null;
  full_name?: string | null;
  role_code?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
};

function roleLabel(roleCode?: string | null) {
  const map: Record<string, string> = {
    admin: 'Quản trị hệ thống',
    director: 'Ban giám đốc',
    purchasing: 'Thu mua',
    accounting: 'Kế toán',
    qc: 'QC / Kiểm hàng',
    viewer: 'Người xem',
  };
  return roleCode ? map[roleCode] || roleCode : 'viewer';
}

export default function AuthScreen({ onLoginSuccess, userEmail }: AuthScreenProps) {
  const [loginEmail, setLoginEmail] = useState(userEmail || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userEmail && !loginEmail) setLoginEmail(userEmail);
  }, [userEmail, loginEmail]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Vui lòng nhập Email và Mật khẩu!');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Chưa cấu hình Supabase. Vui lòng kiểm tra file .env có VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (authError || !authData.user) {
        setErrorMsg('Email hoặc mật khẩu Supabase không đúng. Vui lòng kiểm tra lại.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, username, full_name, role_code, avatar_url, is_active')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle<ProfileRow>();

      if (profileError) {
        console.error('Profile query error:', profileError);
        setErrorMsg('Đăng nhập Supabase thành công nhưng không đọc được hồ sơ profile.');
        return;
      }

      if (!profile) {
        setErrorMsg('Tài khoản đã đăng nhập nhưng chưa có profile trong bảng profiles. Vui lòng tạo profile cho user này.');
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        setErrorMsg('Tài khoản này đang bị khóa. Vui lòng liên hệ quản trị viên.');
        return;
      }

      const appUser = {
        username: profile.username || profile.email.split('@')[0],
        email: profile.email,
        fullName: profile.full_name || profile.email,
        role: roleLabel(profile.role_code),
        avatar: profile.avatar_url || undefined,
      };

      localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(appUser));
      setSuccessMsg('Đăng nhập Supabase thành công! Đang tải hệ thống...');

      setTimeout(() => onLoginSuccess(appUser), 500);
    } catch (err) {
      console.error('Supabase login failed:', err);
      setErrorMsg('Có lỗi khi đăng nhập. Vui lòng mở Console/Terminal để xem chi tiết.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white font-sans">
      <div className="w-full md:w-[45%] bg-[#121314] flex flex-col items-center justify-between p-8 md:p-12 text-white relative min-h-[420px] md:min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(1,166,90,0.18),transparent_60%)] pointer-events-none" />
        <div className="w-full max-w-sm flex justify-start items-center gap-2 relative z-10">
          <div className="w-2.5 h-2.5 bg-[#01a65a] rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-[#01a65a] tracking-widest uppercase">NFC GROUP • ERP PORTAL</span>
        </div>

        <div className="flex flex-col items-center justify-center w-full max-w-sm relative z-10 my-auto space-y-8">
          <div className="bg-gradient-to-br from-neutral-950 via-neutral-950 to-[#121314] border border-neutral-800 p-8 rounded-2xl w-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative flex flex-col items-center justify-center aspect-[1.8/1] overflow-hidden">
            <div className="text-[96px] leading-none italic tracking-tighter text-[#01a65a] select-none filter drop-shadow-[0_0_15px_rgba(1,166,90,0.35)]" style={{ fontFamily: 'Arial Black, Impact, sans-serif', fontWeight: 900, fontStyle: 'italic' }}>
              NFC
            </div>
            <div className="absolute right-7 bottom-6 text-[#dd2222] font-black text-2xl tracking-[0.25em]">NAFOCO</div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-extrabold text-neutral-100 tracking-wide">NFC.PM ERP</h3>
            <p className="text-xs text-neutral-400 font-medium leading-relaxed max-w-[310px] mx-auto">
              Hệ thống quản lý nghiệm thu, thanh toán và dữ liệu gỗ dùng Supabase Auth.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm flex items-center justify-between text-[10px] text-neutral-500 font-bold border-t border-neutral-900/60 pt-4 relative z-10">
          <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> NFC.COMPANY</span>
          <span>SUPABASE AUTH</span>
        </div>
      </div>

      <div className="flex-1 bg-white flex flex-col justify-center p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full mx-auto space-y-7">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
              <Shield className="w-4 h-4" /> Supabase Auth
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Đăng nhập hệ thống</h2>
            <p className="text-slate-500 font-semibold text-sm">Dùng tài khoản đã tạo trong Supabase Authentication</p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2.5 text-rose-800 text-xs text-left">
              <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2.5 text-emerald-800 text-xs text-left border-l-4 border-l-emerald-500">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
            <div className="space-y-1">
              <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:border-[#01a65a] focus-within:ring-1 focus-within:ring-[#01a65a] transition">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 text-sm outline-none text-slate-800 bg-white placeholder-slate-400 font-medium"
                  autoComplete="email"
                />
                <div className="px-3.5 py-3 border-l border-slate-200 bg-slate-50 text-slate-500 shrink-0 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:border-[#01a65a] focus-within:ring-1 focus-within:ring-[#01a65a] transition">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full px-4 py-3 text-sm outline-none text-slate-800 bg-white placeholder-slate-400 font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="px-3.5 py-3 border-l border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="px-3.5 py-3 border-l border-slate-200 bg-slate-50 text-slate-500 shrink-0 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#01a65a] hover:bg-[#009247] disabled:bg-slate-300 disabled:cursor-not-allowed transition text-white font-bold py-3.5 px-4 rounded-lg shadow-sm text-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>
          </form>

          <p className="text-xs text-slate-500 leading-relaxed">
            Nếu đăng nhập không được, kiểm tra: user đã có trong Authentication, profile đã có trong bảng profiles, và file .env có đúng Supabase URL/key.
          </p>
        </div>
      </div>
    </div>
  );
}
