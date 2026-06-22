import { createClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "progress-photos";
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function ensurePhotoBucket(admin) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) return { ok: false, error: listError };

  const exists = buckets?.some((bucket) => bucket.name === PHOTO_BUCKET);
  if (exists) return { ok: true, created: false };

  const { error: createError } = await admin.storage.createBucket(PHOTO_BUCKET, {
    public: false,
    fileSizeLimit: PHOTO_MAX_BYTES,
    allowedMimeTypes: PHOTO_MIME_TYPES,
  });

  if (createError) return { ok: false, error: createError };

  return { ok: true, created: true };
}
