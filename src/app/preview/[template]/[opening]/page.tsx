/**
 * Watch any design with any opening, as a guest would see it, using sample
 * details. Linked from the design pages and the studio.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventSite } from "@/components/event-site/EventSite";
import { demoEvent, demoHousehold } from "@/lib/events/demo";
import { openingKeys, type OpeningKey } from "@/lib/cinema/motion";
import { getOccasion } from "@/lib/occasions/registry";
import { starterContent } from "@/lib/occasions/compat";
import { getTemplate, templateLibrary } from "@/lib/templates/library";
import { backdropFor } from "@/lib/cinema/assets";

export function generateStaticParams() {
  return templateLibrary.flatMap((t) => openingKeys.map((opening) => ({ template: t.slug, opening })));
}

export async function generateMetadata({ params }: PageProps<"/preview/[template]/[opening]">): Promise<Metadata> {
  const t = getTemplate((await params).template);
  return { title: { absolute: t ? `${t.name} — preview` : "Preview" }, robots: { index: false, follow: false } };
}

export default async function PreviewPage({ params }: PageProps<"/preview/[template]/[opening]">) {
  const { template: slug, opening } = await params;
  const template = getTemplate(slug);
  if (!template || !(openingKeys as readonly string[]).includes(opening)) notFound();
  const content = { ...starterContent(getOccasion("weddings")!, "invitation", template), opening: opening as OpeningKey };
  const event = { ...demoEvent, media: { ...demoEvent.media, ...backdropFor(template) }, invitation: { template, content, media: template.sampleMedia } };
  return <EventSite event={event} household={demoHousehold} preview />;
}
