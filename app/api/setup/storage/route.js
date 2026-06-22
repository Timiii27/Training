import { NextResponse } from "next/server";
import { createClient as createUserClient } from "../../../../lib/supabase/server";
import { createAdminClient, ensurePhotoBucket } from "../../../../lib/supabase/admin";

async function requireUser() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function bucketStatus() {
  const admin = createAdminClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) return { ok: false, error };

  const bucket = buckets?.find((item) => item.name === "progress-photos");
  return {
    ok: true,
    exists: Boolean(bucket),
    bucket: bucket ? { id: bucket.id, name: bucket.name, public: bucket.public } : null,
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const status = await bucketStatus();
    if (!status.ok) return NextResponse.json({ ok: false, error: status.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, exists: status.exists, bucket: status.bucket });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  try {
    const admin = createAdminClient();
    const result = await ensurePhotoBucket(admin);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, exists: true, created: result.created });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
