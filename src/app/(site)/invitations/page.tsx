import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { categories } from "@/config/catalogue";

export const metadata: Metadata = { title: "Invitations for every occasion" };

export default function InvitationsPage() {
  return (
    <>
      <PageIntro title="Invitations for every occasion">
        We&apos;re opening with weddings. Engagements, birthdays, christenings, anniversaries and corporate events follow.
      </PageIntro>
      <ul className="mx-auto grid max-w-6xl gap-px border-y border-line bg-line px-0 pb-0 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.slug} className="bg-silk p-8">
            {c.isActive ? (
              <Link href={`/invitations/${c.slug}`} className="block">
                <p className="font-display text-3xl">{c.name}</p>
                <p className="mt-2 text-sm underline underline-offset-4">Browse designs</p>
              </Link>
            ) : (
              <>
                <p className="font-display text-3xl text-ink-soft">{c.name}</p>
                <p className="mt-2 text-sm text-ink-soft">Coming later</p>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="h-24" />
    </>
  );
}
