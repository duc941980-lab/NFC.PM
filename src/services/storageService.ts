import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const INSPECTION_PHOTOS_BUCKET = 'inspection-photos';

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, content] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(content || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export async function uploadInspectionPhoto(params: {
  file: File | Blob;
  inspectionId?: string;
  folder?: string;
  filename?: string;
}) {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase Storage chưa được cấu hình.');
  }

  const safeInspectionId = (params.inspectionId || 'general').replace(/[^a-zA-Z0-9._-]/g, '-');
  const name = params.filename || `${Date.now()}.jpg`;
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${params.folder || safeInspectionId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(INSPECTION_PHOTOS_BUCKET)
    .upload(path, params.file, { upsert: false, contentType: (params.file as File).type || undefined });

  if (error) throw error;

  const { data } = supabase.storage.from(INSPECTION_PHOTOS_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
