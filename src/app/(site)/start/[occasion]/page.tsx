import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StartShell, kindToUrl } from "@/components/start/StartShell";
import { activeCategorySlugs } from "@/config/catalogue";
import { getOccasion, occasions } from "@/lib/occasions/registry";
import { kindConfig } from "@/lib/occasions/kinds";

export function generateStaticParams() {
  return occasions.filter((o) => activeCategorySlugs.includes(o.slug)).map((o) => ({ occasion: o.slug }));
}

export const metadata: Metadata = { title: "Which invitation?" };

const replyLine = { full: "Guests reply with a full RSVP", interest: "Guests can say they're hoping to come", none: "Nothing for guests to reply to" } as const;

export default async function KindPage({ params }: PageProps<"/start/[occasion]">) {
  const o = getOccasion((await params).occasion);
  if (!o || !activeCategorySlugs.includes(o.slug)) notFound();
  return (
    <StartShell step={2} back="/start" eyebrow={o.name} title="Which invitation?" intro="You can add the others to the same event later. They share one guest list.">
      <ul className="grid max-w-2xl gap-3">
        {o.kinds.map((k) => {
          const c = kindConfig[k];
          return (
            <li key={k}>
              <Link href={`/start/${o.slug}/${kindToUrl(k)}`} className="block border border-line bg-white p-5 hover:border-ink focus-visible:border-ink">
                <span className="font-display text-2xl">{c.name}</span>
                <span className="mt-1 block text-sm text-ink-soft">{c.description}</span>
                <span className="mt-3 block text-xs text-foil-deep">
                  {replyLine[c.reply]}
                  {c.countdown ? " · live countdown" : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </StartShell>
  );
}
