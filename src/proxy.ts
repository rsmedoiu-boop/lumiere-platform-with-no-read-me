/**
 * Runs before matching requests: keeps the Supabase session cookie fresh and
 * sends signed-out visitors away from private areas. This is an optimistic
 * check only — every private page and action verifies the user again on the
 * server, and the database enforces RLS regardless.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

const PRIVATE = ["/dashboard", "/admin"];

export async function proxy(request: NextRequest) {
  const isPrivate = PRIVATE.some((p) => request.nextUrl.pathname.startsWith(p));
  const env = supabaseEnv();

  if (!env) {
    if (!isPrivate) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (isPrivate && !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static assets and the public event pages' media.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|avif|mp4|webm)$).*)"],
};
