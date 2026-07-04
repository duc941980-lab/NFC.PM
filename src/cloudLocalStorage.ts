import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Compatibility layer cho code cũ còn gọi localStorage đồng bộ.
 *
 * Khác bản cũ: layer này KHÔNG ghi dữ liệu nghiệp vụ xuống browser localStorage.
 * Dữ liệu được hydrate từ Supabase `app_settings`, giữ trong memory trong phiên làm việc,
 * và mọi set/remove được debounce sync ngược lên Supabase.
 *
 * Đây là bước chuyển an toàn để bỏ persistent localStorage legacy mà không phải refactor
 * file InspectionForm.tsx gần 20k dòng trong một lần.
 */
export const CLOUD_SYNC_STORAGE_KEYS = [
  'wood_inspections_db',
  'wood_database_seeded_v1',
  'wood_users_db_v1',
  'wood_current_user_v1',
  'custom_wood_species',
  'custom_sales_employees_list',
  'employee_salary_settings_v1',
  'custom_suppliers_list',
  'regions_suppliers_list',
  'business_purchases_list_v2',
  'custom_locations_list',
  'custom_env_stats_list',
  'wood_master_participants',
  'Wood_catalog_persist_sizes_v3',
  'Wood_catalog_persist_sizes',
  'custom_standard_sizes_list',
  'nfc_reminder_notes_v1',
  'nfc_photo_folders_v2',
  'nfc_work_photos_v2',
  'erp_calendar_notes_v1',
  'excluded_sales_volumes',
  'permanently_deleted_sales_volumes',
  'supplier_payments_history',
  'wood_payment_proposals_v1',
  'wood_supplier_invoices_v1',
  'custom_pricing_profiles',
  'wood_auto_apply_price_profile',
  'payment_nguoi_lap_title',
  'payment_nguoi_lap_options',
  'payment_selected_nguoi_lap_name',
  'payment_truong_bo_phan_title',
  'payment_truong_bo_phan_options',
  'payment_selected_truong_bo_phan_name',
  'Wood_calculator_history',
  'wood_plan_cycles_v1',
  'wood_plan_specs_v1',
  'last_selected_section',
  'wood_saved_toast_notification',
];

const PERSISTED_KEYS = new Set(CLOUD_SYNC_STORAGE_KEYS);
const memoryStore = new Map<string, string>();
let isPatched = false;
let saveTimer: number | undefined;
const pending = new Set<string>();

function encodeValue(value: any): string {
  return typeof value === 'string' ? value : JSON.stringify(value ?? null);
}

function parseLocalValue(raw: string | null): any {
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function saveOneKey(key: string) {
  if (!supabase || !isSupabaseConfigured || !PERSISTED_KEYS.has(key)) return;
  const raw = memoryStore.get(key) ?? null;
  const value = parseLocalValue(raw);
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) console.warn(`[supabaseStore] Không thể đồng bộ key ${key}:`, error.message);
}

function scheduleSave(key: string) {
  if (!PERSISTED_KEYS.has(key)) return;
  pending.add(key);
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const keys = Array.from(pending);
    pending.clear();
    for (const k of keys) await saveOneKey(k);
  }, 500);
}

export async function hydrateCloudLocalStorage() {
  if (typeof window === 'undefined') return;
  memoryStore.clear();
  if (!supabase || !isSupabaseConfigured) return;

  const { data, error } = await supabase
    .from('app_settings')
    .select('key,value')
    .in('key', Array.from(PERSISTED_KEYS));

  if (error) {
    console.warn('[supabaseStore] Không thể tải app_settings:', error.message);
    return;
  }

  for (const row of data || []) {
    if (!row?.key || typeof row.value === 'undefined') continue;
    memoryStore.set(row.key, encodeValue(row.value));
  }
}

export function installCloudLocalStorageSync() {
  if (typeof window === 'undefined' || isPatched) return;
  isPatched = true;

  const originalGetItem = window.localStorage.getItem.bind(window.localStorage);
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
  const originalClear = window.localStorage.clear.bind(window.localStorage);
  const originalKey = window.localStorage.key.bind(window.localStorage);

  const storageProxy: Storage = {
    get length() { return memoryStore.size; },
    clear() {
      const keys = Array.from(memoryStore.keys());
      memoryStore.clear();
      for (const key of keys) scheduleSave(key);
      originalClear();
    },
    getItem(key: string) {
      if (memoryStore.has(key)) return memoryStore.get(key)!;
      // Chỉ đọc fallback 1 lần cho key UI/cá nhân chưa sync; không dùng cho nghiệp vụ.
      return PERSISTED_KEYS.has(key) ? null : originalGetItem(key);
    },
    key(index: number) {
      return Array.from(memoryStore.keys())[index] ?? originalKey(index);
    },
    removeItem(key: string) {
      if (PERSISTED_KEYS.has(key)) {
        memoryStore.delete(key);
        scheduleSave(key);
      } else {
        originalRemoveItem(key);
      }
    },
    setItem(key: string, value: string) {
      if (PERSISTED_KEYS.has(key)) {
        memoryStore.set(key, String(value));
        scheduleSave(key);
      } else {
        originalSetItem(key, value);
      }
    },
  };

  try {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      get: () => storageProxy,
    });
  } catch {
    // Fallback nếu browser không cho replace object: override method trên object hiện có.
    window.localStorage.getItem = storageProxy.getItem.bind(storageProxy);
    window.localStorage.setItem = storageProxy.setItem.bind(storageProxy);
    window.localStorage.removeItem = storageProxy.removeItem.bind(storageProxy);
    window.localStorage.clear = storageProxy.clear.bind(storageProxy);
    window.localStorage.key = storageProxy.key.bind(storageProxy);
  }
}
