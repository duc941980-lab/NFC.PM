-- NFC ERP Supabase Migration v1
-- Chạy file này trong Supabase SQL Editor.
-- Mục tiêu: tạo nền DB an toàn, có thể chạy ngay với code hiện tại và mở rộng dần sang schema chuẩn.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Roles & Profiles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  role_code TEXT REFERENCES roles(code),
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Compatibility table for current app user registry.
-- Code hiện tại đang gọi bảng users(email,data). Giữ bảng này để app chạy ngay.
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility fix: nếu bảng users đã được tạo bản cũ thì bổ sung cột còn thiếu.
ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- 3) Master data
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  region_id UUID REFERENCES regions(id),
  region_name TEXT,
  phone TEXT,
  address TEXT,
  tax_code TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  contact_person TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_region ON suppliers(region_name);

-- 4) Inspection / nghiệm thu
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  ma_bbnt TEXT,
  ngay_nt DATE,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  loai_go TEXT,
  chung_chi_fsc TEXT,
  dia_diem_nhap TEXT,
  ket_luan TEXT,
  trang_thai_thanh_toan TEXT,
  nhan_vien_kinh_doanh TEXT,
  vung_quan_ly TEXT,
  total_volume NUMERIC(18, 4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility fix: nếu bảng inspections đã được tạo bản cũ thì bổ sung cột còn thiếu trước khi tạo index.
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS ma_bbnt TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS ngay_nt DATE;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS loai_go TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS chung_chi_fsc TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS dia_diem_nhap TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS ket_luan TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS trang_thai_thanh_toan TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS nhan_vien_kinh_doanh TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS vung_quan_ly TEXT;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS total_volume NUMERIC(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_inspections_ngay_nt ON inspections(ngay_nt DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_supplier_name ON inspections(supplier_name);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(trang_thai_thanh_toan);
CREATE INDEX IF NOT EXISTS idx_inspections_raw_gin ON inspections USING GIN(raw_data);

CREATE TABLE IF NOT EXISTS inspection_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  spec_source_id TEXT,
  stt INTEGER,
  kich_thuoc_mm TEXT,
  chieu_dai NUMERIC,
  chieu_rong NUMERIC,
  chieu_day NUMERIC,
  so_thanh NUMERIC DEFAULT 0,
  kl_nguyen_thuy NUMERIC(18, 4) DEFAULT 0,
  co_phan_loai BOOLEAN DEFAULT FALSE,
  ten_quy_cach TEXT,
  ghi_chu TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspection_specs_inspection_id ON inspection_specs(inspection_id);

CREATE TABLE IF NOT EXISTS inspection_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  spec_id UUID REFERENCES inspection_specs(id) ON DELETE CASCADE,
  source_spec_id TEXT,
  ten_loai TEXT,
  so_thanh NUMERIC DEFAULT 0,
  ti_le NUMERIC DEFAULT 0,
  kl_nhap_kho NUMERIC(18, 4) DEFAULT 0,
  ghi_chu TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspection_classifications_inspection_id ON inspection_classifications(inspection_id);

-- 5) Pricing / công nợ / thanh toán
CREATE TABLE IF NOT EXISTS pricing_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  supplier_name TEXT,
  effective_date DATE,
  phuong_thuc_van_chuyen TEXT,
  ten_don_vi_van_chuyen TEXT,
  prices JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT,
  symbol TEXT,
  invoice_date DATE,
  supplier_name TEXT,
  bbnt_ids TEXT[] DEFAULT '{}',
  total_volume NUMERIC(18, 4) DEFAULT 0,
  amount_before_tax NUMERIC(18, 2) DEFAULT 0,
  tax_rate NUMERIC(6, 2) DEFAULT 0,
  tax_amount NUMERIC(18, 2) DEFAULT 0,
  total_amount NUMERIC(18, 2) DEFAULT 0,
  status TEXT,
  link_url TEXT,
  note TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_proposals (
  id TEXT PRIMARY KEY,
  proposal_no TEXT,
  proposal_date DATE,
  supplier_name TEXT,
  bbnt_id TEXT,
  invoice_id TEXT,
  amount NUMERIC(18, 2) DEFAULT 0,
  payment_method TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_name TEXT,
  reason TEXT,
  status TEXT,
  requester_name TEXT,
  total_volume NUMERIC(18, 4) DEFAULT 0,
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  supplier_name TEXT,
  bbnt_id TEXT,
  invoice_id TEXT,
  proposal_id TEXT,
  amount NUMERIC(18, 2) DEFAULT 0,
  paid_at DATE,
  payment_method TEXT,
  note TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Photos / files / notes
CREATE TABLE IF NOT EXISTS photo_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_photos (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES photo_folders(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  storage_path TEXT,
  public_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminder_notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  due_at TIMESTAMPTZ,
  status TEXT DEFAULT 'open',
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) Key-value table để chuyển dần các localStorage dataset sang DB mà không cần refactor toàn bộ UI ngay.
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 9) updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles','profiles','users','regions','suppliers','inspections','inspection_specs',
    'inspection_classifications','pricing_profiles','invoices','payment_proposals',
    'supplier_payments','photo_folders','work_photos','reminder_notes','calendar_notes','app_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- 10) Seed roles
INSERT INTO roles(code, name, description, permissions)
VALUES
  ('admin', 'Quản trị hệ thống', 'Toàn quyền hệ thống', '{"all": true}'::jsonb),
  ('director', 'Ban giám đốc', 'Xem dashboard, báo cáo, duyệt nghiệp vụ', '{"dashboard": true, "reports": true, "approve": true}'::jsonb),
  ('accounting', 'Kế toán', 'Quản lý công nợ, hóa đơn, thanh toán', '{"invoices": true, "payments": true}'::jsonb),
  ('qc', 'QC / Kiểm hàng', 'Tạo và xử lý biên bản nghiệm thu', '{"inspections": true}'::jsonb),
  ('purchasing', 'Thu mua', 'Quản lý nhà cung cấp, kế hoạch mua', '{"suppliers": true, "purchase": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 11) Tạm thời tắt RLS để app hiện tại chạy được bằng publishable key.
-- Khi đã chuyển sang Supabase Auth đầy đủ, bật RLS và policy ở migration v2.
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE regions DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_specs DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_classifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE photo_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
