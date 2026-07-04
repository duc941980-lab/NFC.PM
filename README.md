# NFC.PM ERP Portal

Phần mềm ERP nội bộ cho nghiệm thu gỗ, quản lý nhà cung cấp, đơn giá, công nợ, thanh toán, ảnh công việc và dashboard.

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind
- Backend: Express chạy chung project, dùng cho API AI `/api/chat-debt`
- Database: Supabase Postgres
- Auth: Supabase Auth + bảng `profiles`
- Storage: Supabase Storage bucket `inspection-photos`
- Deploy khuyến nghị: Render Web Service

## Điểm đã chuẩn hóa

- Bỏ Firebase/Firestore khỏi runtime.
- Supabase là nguồn dữ liệu chính cho biên bản, user registry và app settings.
- Không dùng browser localStorage làm nơi lưu bền vững dữ liệu nghiệp vụ. Một compatibility layer vẫn giữ API đồng bộ cho code cũ, nhưng dữ liệu nghiệp vụ được hydrate/sync qua Supabase `app_settings`.
- Thêm migration RLS/Auth/Storage production cơ bản.

## Chạy local

```bash
npm install
cp .env.example .env
npm run dev
```

Mở:

```text
http://localhost:3000
```

## Env cần có

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
GEMINI_API_KEY=your-gemini-api-key
APP_URL=http://localhost:3000
PORT=3000
```

## Setup Supabase

1. Tạo project mới trên Supabase.
2. Vào SQL Editor, chạy lần lượt:
   - `supabase/migrations/001_erp_initial_schema.sql`
   - `supabase/migrations/002_supabase_auth_storage_rls.sql`
3. Vào Authentication > Users, tạo user đăng nhập.
4. Copy `User UID` của user vừa tạo.
5. Vào SQL Editor tạo profile:

```sql
INSERT INTO profiles(auth_user_id, email, username, full_name, role_code)
VALUES (
  '<AUTH_USER_UID>',
  'admin@example.com',
  'admin',
  'Admin',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role_code = EXCLUDED.role_code,
  is_active = true,
  updated_at = NOW();
```

## Build production

```bash
npm run build
npm start
```

## Deploy Render

Xem hướng dẫn từng click trong `docs/DEPLOYMENT_GUIDE.md`.

## Test sau deploy

1. Đăng nhập bằng user Supabase Auth.
2. Tạo một biên bản nghiệm thu mới.
3. Reload browser, kiểm tra biên bản vẫn còn.
4. Đăng xuất, đăng nhập lại, kiểm tra dữ liệu vẫn còn.
5. Tạo/sửa một danh mục phụ như nhà cung cấp, đơn giá hoặc ghi chú, reload lại kiểm tra dữ liệu được hydrate từ Supabase.

## Lưu ý bảo mật

Migration v2 bật RLS với policy đơn giản: user đã đăng nhập có quyền đọc/ghi dữ liệu ERP. Đây là cấu hình phù hợp để chạy MVP nội bộ. Khi phân quyền nghiêm túc, hãy siết policy theo `profiles.role_code`.
