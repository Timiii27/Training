import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

function safeRedirect(request, pathname = "/") {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}${pathname}`;
  }

  return `${url.origin}${pathname}`;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(safeRedirect(request, "/?auth=missing-code"));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(safeRedirect(request, "/?auth=error"));
  }

  return NextResponse.redirect(safeRedirect(request, next.startsWith("/") ? next : "/"));
}
