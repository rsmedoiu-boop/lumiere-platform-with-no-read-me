import Link from "next/link";
import type { Metadata } from "next";
import { StartShell } from "@/components/start/StartShell";
import { activeCategorySlugs } from "@/config/catalogue";
import { startableOccasions, templatesFor } from "@/lib/occasions/compat";
import { templateLibrary } from "@/lib/templates/library";

export const metadata: Metadata = { title: "Start your invitation" };

export default function StartPage() {
  const list = startableOccasions(templateLibrary, activeCategorySlugs);
  return (
    <StartShell step={1} back="/" title="What are you celebrating?" intro="We'll shape the questions, wording and RSVP around your occasion.">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((o) => {
          const n = templatesFor(o.slug, templateLibrary).length;
          return (
            <li key={o.slug}>
              <Link href={`/start/${o.slug}`} className="flex h-full min-h-32 flex-col justify-between border border-line bg-white p-4 hover:border-ink focus-visible:border-ink">
                <span className="font-display text-2xl leading-tight">{o.name}</span>
                <span className="mt-3 text-xs text-ink-soft">
                  {n} design{n === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </StartShell>
  );
}
