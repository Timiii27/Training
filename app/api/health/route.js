import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "summer-hoops-training",
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  });
}
