import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contentSchema, type InvitationContent } from "@/lib/templates/manifest";
import type { InvitationKind } from "@/lib/occasions/kinds";

export interface StudioProject {
  id: string;
  kind: InvitationKind;
  content: InvitationContent;
  draftVersion: number;
  sections: string[];
  templateSlug: string;
  event: { id: string; title: string; slug: string; timezone: string; startsAt: string | null; occasion: string; settings: Record<string, boolean> };
}

/** One invitation the signed-in customer owns (RLS returns nothing otherwise). */
export async function getStudioProject(id: string): Promise<StudioProject | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("invitation_projects")
    .select("id, kind, draft_content, draft_version, sections, templates(slug), events(id, title, slug, timezone, starts_at, details, categories(slug))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const t = data.templates as unknown as { slug: string } | null;
  const e = data.events as unknown as { id: string; title: string; slug: string; timezone: string; starts_at: string | null; details: { settings?: Record<string, boolean> } | null; categories: { slug: string } | null } | null;
  if (!t || !e) return null;
  const content = contentSchema.safeParse(data.draft_content);
  return {
    id: data.id,
    kind: data.kind as InvitationKind,
    content: content.success ? content.data : { slots: {} },
    draftVersion: data.draft_version,
    sections: data.sections ?? [],
    templateSlug: t.slug,
    event: { id: e.id, title: e.title, slug: e.slug, timezone: e.timezone, startsAt: e.starts_at, occasion: e.categories?.slug ?? "weddings", settings: e.details?.settings ?? {} },
  };
}
