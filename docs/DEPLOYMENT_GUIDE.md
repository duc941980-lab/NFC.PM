# Hướng dẫn deploy NFC.PM ERP lên Render + Supabase

## 1. Tạo Supabase project

1. Vào Supabase, tạo project mới.
2. Vào **Settings > API**, copy:
   - Project URL
   - anon/publishable key
3. Vào **SQL Editor**, chạy:
   - `supabase/migrations/001_erp_initial_schema.sql`
   - `supabase/migrations/002_supabase_auth_storage_rls.sql`

## 2. Tạo tài khoản đăng nhập

1. Supabase > Authentication > Users > Add user.
2. Nhập email/password.
3. Copy `User UID`.
4. SQL Editor, chạy:

```sql
INSERT INTO profiles(auth_user_id, email, username, full_name, role_code)
VALUES ('<AUTH_USER_UID>', '<EMAIL>', '<USERNAME>', '<FULL_NAME>', 'admin')
ON CONFLICT (email) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role_code = EXCLUDED.role_code,
  is_active = true,
  updated_at = NOW();
```

## 3. Push code lên GitHub

```bash
git init
git add .
git commit -m "Prepare NFC.PM ERP for Supabase production"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB>/<YOUR_REPO>.git
git push -u origin main
```

## 4. Deploy Render

1. Vào Render > New > Web Service.
2. Connect GitHub repo.
3. Chọn project.
4. Cấu hình:
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Thêm Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` nếu dùng AI
   - `APP_URL` = URL Render production sau khi deploy lần đầu
6. Bấm Deploy.

## 5. Kiểm tra production

- Mở URL Render HTTPS.
- Đăng nhập bằng user Supabase Auth.
- Tạo biên bản mới.
- Reload trang.
- Đăng xuất/đăng nhập lại.
- Kiểm tra dữ liệu còn trong Supabase bảng `inspections`.

## 6. Xem log

- Render > Service > Logs: xem lỗi server/build/runtime.
- Supabase > Logs: xem lỗi Database/Auth/API.
- Browser DevTools > Console/Network: xem lỗi frontend.

## 7. Rollback

- Render > Deploys > chọn deploy cũ > Rollback.
- Database: trước khi chạy migration phá hủy, backup Supabase trước. Các migration hiện tại không drop dữ liệu.

## 8. Free-tier cần để ý

- Render free có thể sleep hoặc cold start.
- Supabase free có giới hạn dung lượng DB/storage/bandwidth.
- Nếu app dùng thường xuyên nội bộ, nâng Render lên gói trả phí nhỏ để tránh sleep.
