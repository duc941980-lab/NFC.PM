import {
  isSupabaseConfigured,
  getInspectionsFromSupabase,
  saveInspectionToSupabase,
  deleteInspectionFromSupabase,
  getUsersFromSupabase,
  saveUserToSupabase,
  deleteUserFromSupabase,
} from './supabaseClient';

/**
 * Supabase-only data gateway.
 *
 * File này giữ tên `firebase.ts` để không phải refactor hàng loạt import cũ,
 * nhưng toàn bộ Firebase/Firestore đã bị loại bỏ. Các hàm bên dưới chỉ làm việc
 * với Supabase PostgreSQL/Auth/Storage. Nếu chưa cấu hình Supabase, hàm sẽ báo lỗi
 * rõ ràng thay vì fallback sang localStorage hoặc Firestore.
 */
function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase chưa được cấu hình. Hãy khai báo VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.'
    );
  }
}

export async function getInspections(): Promise<any[]> {
  assertSupabaseConfigured();
  const records = await getInspectionsFromSupabase();
  return records || [];
}

export async function saveInspectionToDb(id: string, data: any): Promise<void> {
  assertSupabaseConfigured();
  const success = await saveInspectionToSupabase(id, data);
  if (!success) throw new Error(`Không thể lưu biên bản ${id} lên Supabase.`);
}

export async function deleteInspectionFromDb(id: string): Promise<void> {
  assertSupabaseConfigured();
  const success = await deleteInspectionFromSupabase(id);
  if (!success) throw new Error(`Không thể xóa biên bản ${id} trên Supabase.`);
}

export async function getUsers(): Promise<any[]> {
  assertSupabaseConfigured();
  const users = await getUsersFromSupabase();
  return users || [];
}

export function compressBase64Image(base64: string, maxWidth = 120, maxHeight = 120): Promise<string> {
  return new Promise((resolve) => {
    if (!base64 || typeof window === 'undefined' || !base64.startsWith('data:image')) {
      resolve(base64);
      return;
    }

    if (base64.length < 50000) {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export async function saveUserToDb(email: string, data: any): Promise<void> {
  assertSupabaseConfigured();
  const finalData = { ...data };
  if (finalData.avatar && finalData.avatar.length > 50000) {
    finalData.avatar = await compressBase64Image(finalData.avatar);
  }
  if (finalData.avatar && finalData.avatar.length > 150000) {
    finalData.avatar = '';
  }
  const success = await saveUserToSupabase(email, finalData);
  if (!success) throw new Error(`Không thể lưu user ${email} lên Supabase.`);
}

export async function deleteUserFromDb(email: string): Promise<void> {
  assertSupabaseConfigured();
  const success = await deleteUserFromSupabase(email);
  if (!success) throw new Error(`Không thể xóa user ${email} trên Supabase.`);
}

/**
 * Hàm tương thích tên cũ. Không còn sync local/Firebase nữa.
 * Nếu cần import dữ liệu cũ, dùng màn hình Import/Backup trong app hoặc script SQL riêng.
 */
export async function syncLocalToFirestore(_localRecords: any[]): Promise<void> {
  console.info('Legacy local sync đã bị vô hiệu hóa: app hiện chỉ dùng Supabase.');
}
export { subscribeInspections } from './supabaseClient';
