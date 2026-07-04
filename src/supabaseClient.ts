import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (((import.meta as any).env?.VITE_SUPABASE_URL || '') as string).trim();
const supabaseAnonKey = (((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '') as string).trim();

// Check if valid credentials are provided (ignoring placeholders)
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-supabase');

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * SQL template to set up database tables in Supabase Dashboard SQL Editor:
 * 
 * -- 1. Setup the inspections table
 * CREATE TABLE IF NOT EXISTS inspections (
 *   id TEXT PRIMARY KEY,
 *   data JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
 * );
 * 
 * -- Enable Realtime for inspections
 * ALTER PUBLICATION supabase_realtime ADD TABLE inspections;
 * 
 * -- 2. Setup the users table
 * CREATE TABLE IF NOT EXISTS users (
 *   email TEXT PRIMARY KEY,
 *   data JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
 * );
 * 
 * -- Enable Realtime for users
 * ALTER PUBLICATION supabase_realtime ADD TABLE users;
 * 
 * -- 3. Enable RLS or disable temporarily if not using Supabase Auth:
 * ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
 * ALTER TABLE users DISABLE ROW LEVEL SECURITY;
 */

export async function getInspectionsFromSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data: rows, error } = await supabase
      .from('inspections')
      .select('*');
    
    if (error) {
      console.error('Error fetching inspections from Supabase:', error);
      throw error;
    }
    
    return (rows || []).map(row => {
  const legacy = row.raw_data || row.data || {};

  return {
    id: row.id,
    ...legacy,

    // Ưu tiên cột chuẩn hóa từ PostgreSQL
    ma_bbnt: row.ma_bbnt ?? legacy.ma_bbnt,
    ngay_nt: row.ngay_nt ?? legacy.ngay_nt,
    supplier_name: row.supplier_name ?? legacy.supplier_name ?? legacy.don_vi_cung_ung,
    don_vi_cung_ung: row.supplier_name ?? legacy.don_vi_cung_ung,
    loai_go: row.loai_go ?? legacy.loai_go,
    chung_chi_fsc: row.chung_chi_fsc ?? legacy.chung_chi_fsc,
    dia_diem_nhap: row.dia_diem_nhap ?? legacy.dia_diem_nhap,
    ket_luan: row.ket_luan ?? legacy.ket_luan,
    trang_thai_thanh_toan: row.trang_thai_thanh_toan ?? legacy.trang_thai_thanh_toan,
    nhan_vien_kinh_doanh: row.nhan_vien_kinh_doanh ?? legacy.nhan_vien_kinh_doanh,
    vung_quan_ly: row.vung_quan_ly ?? legacy.vung_quan_ly,

    total_volume: Number(row.total_volume ?? legacy.total_volume ?? 0),
    total_amount: Number(row.total_amount ?? legacy.total_amount ?? 0),
  };
});
  } catch (err) {
    console.error('Supabase query failed:', err);
    return null;
  }
}

export async function saveInspectionToSupabase(id: string, data: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    const { error } = await supabase
      .from('inspections')
      .upsert({
        id,
        ma_bbnt: sanitized.ma_bbnt || null,
        ngay_nt: sanitized.ngay_nt || null,
        supplier_name: sanitized.don_vi_cung_ung || sanitized.supplier_name || null,
        loai_go: sanitized.loai_go || null,
        chung_chi_fsc: sanitized.chung_chi_fsc || null,
        dia_diem_nhap: sanitized.dia_diem_nhap || null,
        ket_luan: sanitized.ket_luan || null,
        trang_thai_thanh_toan: sanitized.trang_thai_thanh_toan || null,
        nhan_vien_kinh_doanh: sanitized.nhan_vien_kinh_doanh || null,
        vung_quan_ly: sanitized.vung_quan_ly || null,
        total_volume: sanitized.quy_cach_a?.reduce?.((sum: number, q: any) => sum + Number(q.kl_nguyen_thuy || 0), 0) || 0,
        total_amount: sanitized.bang_thanh_toan?.reduce?.((sum: number, r: any) => sum + Number(r.thanh_tien || 0), 0) || 0,
        data: sanitized,
        raw_data: sanitized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting inspection to Supabase:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Supabase upsert failed:', err);
    return false;
  }
}

export async function deleteInspectionFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inspection from Supabase:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete failed:', err);
    return false;
  }
}

export async function getUsersFromSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data: rows, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      throw error;
    }
    return (rows || []).map(row => ({
      email: row.email,
      ...(row.raw_data || row.data || {})
    }));
  } catch (err) {
    console.error('Supabase query failed:', err);
    return null;
  }
}

export async function saveUserToSupabase(email: string, data: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    const { error } = await supabase
      .from('users')
      .upsert({
        email: email.toLowerCase(),
        data: sanitized,
        raw_data: sanitized,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) {
      console.error('Error upserting user to Supabase:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Supabase user upsert failed:', err);
    return false;
  }
}

export async function deleteUserFromSupabase(email: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) {
      console.log('Error deleting user from Supabase:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Supabase user delete failed:', err);
    return false;
  }
}

export async function getAppSetting<T = any>(key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.warn(`Error fetching app setting ${key}:`, error.message);
    return fallback;
  }
  return typeof data?.value === 'undefined' ? fallback : (data.value as T);
}

export async function saveAppSetting(key: string, value: any): Promise<void> {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}
export function subscribeInspections(onChange: () => void) {
  if (!supabase) return null;

  return supabase
    .channel('inspections-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inspections',
      },
      () => {
        onChange();
      }
    )
    .subscribe();
}