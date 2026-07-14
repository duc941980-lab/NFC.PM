-- NFC ERP - XÓA SẠCH DỮ LIỆU NGHIỆP VỤ
-- GIỮ LẠI: auth.users, profiles, roles, users, app_settings và cấu hình tài khoản.
-- Khuyến nghị sao lưu Supabase trước khi chạy.

BEGIN;

TRUNCATE TABLE
  audit_logs,
  work_photos,
  photo_folders,
  calendar_notes,
  reminder_notes,
  supplier_payments,
  payment_proposals,
  invoices,
  inspection_classifications,
  inspection_specs,
  inspections,
  pricing_profiles,
  suppliers,
  regions
RESTART IDENTITY CASCADE;

COMMIT;
