-- NFC ERP Supabase Migration v2
-- Mục tiêu: chuẩn hóa production theo Supabase Auth + Storage + RLS cơ bản.
-- Chạy sau 001_erp_initial_schema.sql trong Supabase SQL Editor.

-- 1) Tạo bucket lưu ảnh/file nghiệm thu.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-photos',
  'inspection-photos',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Bật RLS cho các bảng nghiệp vụ.
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3) Policy đơn giản cho giai đoạn 1: user đã đăng nhập được đọc/ghi dữ liệu ERP.
-- Sau khi ổn định có thể siết theo role_code/department.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles','profiles','users','regions','suppliers','inspections','inspection_specs',
    'inspection_classifications','pricing_profiles','invoices','payment_proposals',
    'supplier_payments','photo_folders','work_photos','reminder_notes','calendar_notes','app_settings','audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS authenticated_select_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_insert_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_update_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_delete_%I ON %I', t, t);

    EXECUTE format('CREATE POLICY authenticated_select_%I ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY authenticated_insert_%I ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY authenticated_update_%I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY authenticated_delete_%I ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- 4) Storage policies cho bucket inspection-photos.
DROP POLICY IF EXISTS inspection_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS inspection_photos_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS inspection_photos_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS inspection_photos_authenticated_delete ON storage.objects;

CREATE POLICY inspection_photos_public_read
ON storage.objects FOR SELECT
USING (bucket_id = 'inspection-photos');

CREATE POLICY inspection_photos_authenticated_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY inspection_photos_authenticated_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'inspection-photos')
WITH CHECK (bucket_id = 'inspection-photos');

CREATE POLICY inspection_photos_authenticated_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos');

-- 5) Helper tạo profile sau khi tạo user Supabase Auth.
-- Cách dùng sau khi tạo user trong Authentication:
-- INSERT INTO profiles(auth_user_id,email,username,full_name,role_code)
-- VALUES ('<auth.users.id>','user@example.com','username','Tên người dùng','admin');
