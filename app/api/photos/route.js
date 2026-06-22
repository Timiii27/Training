import { NextResponse } from "next/server";
import { createClient as createUserClient } from "../../../lib/supabase/server";
import { createAdminClient, ensurePhotoBucket, PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "../../../lib/supabase/admin";

async function requireUser() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : new Date().toISOString().slice(0, 10);
}

function extensionFor(file) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function signedPhoto(admin, photo) {
  const { data } = await admin.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 60 * 60);
  return { ...photo, signedUrl: data?.signedUrl || "" };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data: buckets } = await admin.storage.listBuckets();
    const hasBucket = buckets?.some((bucket) => bucket.name === PHOTO_BUCKET);

    const { data, error } = await admin
      .from("progress_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!hasBucket) return NextResponse.json({ ok: true, photos: [], storageReady: false });

    const photos = await Promise.all((data || []).map((photo) => signedPhoto(admin, photo)));
    return NextResponse.json({ ok: true, photos, storageReady: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const bucket = await ensurePhotoBucket(admin);
    if (!bucket.ok) return NextResponse.json({ ok: false, error: bucket.error.message }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get("file");
    const date = isoDate(formData.get("date"));
    const note = String(formData.get("note") || "").trim().slice(0, 180) || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No he recibido ninguna imagen." }, { status: 400 });
    }

    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." }, { status: 400 });
    }

    if (file.size > PHOTO_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "La imagen supera el límite de 8 MB." }, { status: 400 });
    }

    const storagePath = `${user.id}/${date}-${crypto.randomUUID()}.${extensionFor(file)}`;
    const upload = await admin.storage.from(PHOTO_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (upload.error) return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });

    const insert = await admin
      .from("progress_photos")
      .insert({
        user_id: user.id,
        date,
        storage_path: storagePath,
        note,
      })
      .select("*")
      .single();

    if (insert.error) {
      await admin.storage.from(PHOTO_BUCKET).remove([storagePath]);
      return NextResponse.json({ ok: false, error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, photo: await signedPhoto(admin, insert.data) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await request.json();
    const admin = createAdminClient();
    const { data: photo, error: selectError } = await admin
      .from("progress_photos")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) return NextResponse.json({ ok: false, error: selectError.message }, { status: 500 });
    if (!photo) return NextResponse.json({ ok: false, error: "Foto no encontrada." }, { status: 404 });

    await admin.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
    const { error: deleteError } = await admin.from("progress_photos").delete().eq("id", photo.id).eq("user_id", user.id);
    if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
