-- NFC ERP Migration v3: chuẩn hóa đăng nhập và phân quyền tài khoản
-- Chạy sau 001 và 002 trong Supabase SQL Editor.

INSERT INTO roles(code, name, description, permissions)
VALUES
  ('admin', 'Quản trị hệ thống', 'Toàn quyền hệ thống', '{}'::jsonb),
  ('director', 'Ban giám đốc', 'Xem và phê duyệt', '{}'::jsonb),
  ('purchasing', 'Thu mua', 'Nghiệp vụ thu mua', '{}'::jsonb),
  ('accounting', 'Kế toán', 'Thanh toán, hóa đơn, công nợ', '{}'::jsonb),
  ('qc', 'QC / Kiểm hàng', 'Kiểm hàng và biên bản QC', '{}'::jsonb),
  ('viewer', 'Người xem', 'Chỉ xem các mục được cấp', '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Bảo đảm dữ liệu đơn giá được lưu bền vững trong app_settings.
INSERT INTO app_settings(key, value)
VALUES ('custom_pricing_profiles', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
