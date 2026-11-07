import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prepareDraft } from "@/lib/start/draft";
import { createEventFromDraft, START_DRAFT_COOKIE } from "@/lib/start/create";
import { getTemplate } from "@/lib/templates/library";

/**
 * After a new customer confirms their email (or signs in), create the
 * invitation they started, then open it in the studio.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!supabase || !data.user) return NextResponse.redirect(new URL("/login?next=/start/finish", origin));

  const raw = request.cookies.get(START_DRAFT_COOKIE)?.value;
  const done = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.cookies.delete(START_DRAFT_COOKIE);
    return res;
  };
  if (!raw) return NextResponse.redirect(new URL("/dashboard", origin));

  let draft: unknown;
  try {
    draft = JSON.parse(raw);
  } catch {
    return done("/start");
  }
  const prepared = prepareDraft(draft, getTemplate);
  if (!prepared.ok) return done("/start");
  const created = await createEventFromDraft(supabase, prepared.event);
  if (!created.ok) return done("/dashboard?start=failed");
  return done(`/studio/${created.projectId}`);
}
