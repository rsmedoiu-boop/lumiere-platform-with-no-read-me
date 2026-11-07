/**
 * What a published event website shows. Built from the `events` row
 * (details/sections jsonb) plus the published invitation content, so every
 * template and every occasion uses the same shape.
 */
import type { InvitationContent, SectionKey, TemplateDefinition } from "@/lib/templates/manifest";

export type { SectionKey };

export interface ScheduleItem { time: string; title: string; place?: string; note?: string }
export interface Stay { name: string; distance: string; note?: string; url?: string }
export interface Faq { q: string; a: string }

export interface EventSiteData {
  slug: string;
  locale: string;
  timezone: string;
  /** ISO 8601 with offset, e.g. 2027-06-12T14:00:00+01:00 */
  startsAt: string;
  hosts: string[];
  invitation: { template: TemplateDefinition; content: InvitationContent };
  story?: { heading: string; body: string[] };
  schedule: ScheduleItem[];
  venue: { name: string; address: string; mapQuery: string; parking?: string; transport?: string };
  dressCode?: { title: string; body: string };
  accommodation: Stay[];
  extra: Faq[];
  rsvp: { deadline: string; meals: string[]; childMeal: boolean };
  /** Imagery: a backdrop (still + optional seamless loop) and story photo. */
  media?: { backdrop?: string; backdropVideo?: string; storyPhoto?: string; storyPhotoAlt?: string };
  /** Sections the couple has switched on, in display order. */
  sections: SectionKey[];
}

export const sectionLabels: Record<SectionKey, string> = {
  countdown: "Countdown",
  story: "Our story",
  schedule: "The day",
  venue: "Venue",
  dress_code: "Dress code",
  accommodation: "Where to stay",
  gallery: "Gallery",
  video: "Film",
  gifts: "Gifts",
  rsvp: "RSVP",
  extra: "Good to know",
};

export function formatLongDate(iso: string, locale: string, timezone: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timezone }).format(new Date(iso));
}

export function mapLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
