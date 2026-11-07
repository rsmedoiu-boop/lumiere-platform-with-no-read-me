import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { activeCategorySlugs } from "@/config/catalogue";
import { occasions } from "@/lib/occasions/registry";
import { templatesFor } from "@/lib/occasions/compat";
import { templateLibrary } from "@/lib/templates/library";

export const metadata: Metadata = { title: "Invitations for every occasion" };

export default function InvitationsPage() {
  const list = occasions.filter((o) => activeCategorySlugs.includes(o.slug));
  return (
    <>
      <PageIntro title="Invitations for every occasion">
        Every invitation comes with a live countdown and RSVP. Choose your occasion to see the designs made for it.
      </PageIntro>
      <ul className="mx-auto grid max-w-6xl gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {list.map((o) => {
          const n = templatesFor(o.slug, templateLibrary).length;
          return (
            <li key={o.slug} className="bg-silk">
              <Link href={`/invitations/${o.slug}`} className="block h-full p-8">
                <p className="font-display text-3xl">{o.name}</p>
                <p className="mt-2 text-sm text-ink-soft">{o.description}</p>
                <p className="mt-4 text-sm underline underline-offset-4">{n > 0 ? `${n} design${n === 1 ? "" : "s"}` : "Designs coming soon"}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-24" />
    </>
  );
}
