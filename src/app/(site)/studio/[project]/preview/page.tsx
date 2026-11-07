import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getStudioProject } from "@/lib/studio/queries";
import { getTemplate } from "@/lib/templates/library";
import { demoEvent, demoHousehold } from "@/lib/events/demo";
import { EventSite } from "@/components/event-site/EventSite";
import { backdropFor } from "@/lib/cinema/assets";
import { zonedToIso } from "@/lib/start/draft";
import { resolveNames } from "@/lib/cinema/names";
import type { SectionKey } from "@/lib/events/site";
import { signedPhotoUrl } from "@/lib/studio/photos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Guest preview", robots: { index: false, follow: false } };

export default function GuestPreview({ params }: PageProps<"/studio/[project]/preview">) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-ink-soft">Getting your invitation ready…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/studio/[project]/preview">["params"] }) {
  const { project: id } = await params;
  await requireUser(`/studio/${id}/preview`);
  const project = await getStudioProject(id);
  const template = project && getTemplate(project.templateSlug);
  if (!project || !template) notFound();

  const slots = project.content.slots;
  const names = resolveNames(slots, { hideAge: !!project.event.settings.hideAge });
  const hosts = names?.mode === "couple" ? [names.first, names.second].filter(Boolean) : names?.mode === "organisation" ? [names.organisation] : names ? [names.name] : [project.event.title];
  // Only what the studio can edit so far (countdown, RSVP and the story): timings and FAQs arrive with the next stages, so the sample ones stay out.
  const story = project.content.story;
  const storyBody = (story?.body ?? "").split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  const supabase = await createSupabaseServerClient();
  const storyPhoto = supabase ? await signedPhotoUrl(supabase, project.event.id, story?.photoPath) : undefined;
  const hasStory = !!(story?.heading?.trim() || storyBody.length || storyPhoto);
  const sections = project.sections.filter((s): s is SectionKey => s === "countdown" || s === "rsvp" || (s === "story" && hasStory));
  const event = {
    ...demoEvent,
    slug: project.event.slug,
    timezone: project.event.timezone,
    startsAt: slots.date ? zonedToIso(slots.date, slots.time || "12:00", project.event.timezone) : (project.event.startsAt ?? demoEvent.startsAt),
    hosts,
    story: hasStory ? { heading: story?.heading?.trim() || "Our story", body: storyBody } : undefined,
    schedule: [],
    dressCode: undefined,
    accommodation: [],
    extra: [],
    venue: { name: slots.venue ?? "", address: "", mapQuery: slots.venue ?? "" },
    media: { ...backdropFor(template), storyPhoto, storyPhotoAlt: story?.photoAlt },
    sections,
    invitation: { template, content: project.content, media: template.sampleMedia },
  };
  return (
    <>
      <EventSite event={event} household={demoHousehold} preview />
      <Link href={`/studio/${project.id}`} className="btn btn-primary fixed bottom-4 left-4 z-[60] shadow-lg">
        ← Back to editor
      </Link>
    </>
  );
}
