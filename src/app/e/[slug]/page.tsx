import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventSite } from "@/components/event-site/EventSite";
import { demoHousehold, getEventSite } from "@/lib/events/demo";

export function generateStaticParams() {
  return [{ slug: "demo" }];
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = getEventSite((await params).slug);
  if (!event) return { title: "Invitation not found" };
  return {
    title: { absolute: `${event.hosts.join(" & ")} — wedding invitation` },
    // Couples' pages are private by default: never indexed by search engines.
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  const event = getEventSite((await params).slug);
  if (!event) notFound();
  // Milestone 5: the household comes from the guest's personal link.
  return <EventSite event={event} household={demoHousehold} preview={event.slug === "demo"} />;
}
