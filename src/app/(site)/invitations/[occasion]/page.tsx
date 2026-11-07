import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { templateLibrary } from "@/lib/templates/library";
import { activeCategorySlugs, products } from "@/config/catalogue";
import { formatMoney } from "@/lib/money";
import { getOccasion, occasions } from "@/lib/occasions/registry";
import { templatesFor } from "@/lib/occasions/compat";
import { kindConfig } from "@/lib/occasions/kinds";

export function generateStaticParams() {
  return occasions.filter((o) => activeCategorySlugs.includes(o.slug)).map((o) => ({ occasion: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/invitations/[occasion]">): Promise<Metadata> {
  const o = getOccasion((await params).occasion);
  return { title: o ? `${o.name} invitations` : "Not found" };
}

const listKinds = (kinds: (keyof typeof kindConfig)[]) => {
  const names = kinds.map((k) => {
    const n = kindConfig[k].name.toLowerCase();
    return `${/^[aeiou]/.test(n) ? "an" : "a"} ${n}`;
  });
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0];
};

const tierPrice = { classic: "classic-animated", premium: "premium-editable", video: "personalised-video", cinematic: "ai-cinematic" } as const;
const tierLabel = { classic: "Classic animated", premium: "Premium editable", video: "With your photos and video", cinematic: "Cinematic" } as const;

export default async function OccasionGalleryPage({ params }: PageProps<"/invitations/[occasion]">) {
  const o = getOccasion((await params).occasion);
  if (!o || !activeCategorySlugs.includes(o.slug)) notFound();
  const designs = templatesFor(o.slug, templateLibrary);

  return (
    <>
      <PageIntro title={`${o.name} invitations`}>
        {o.description} Choose from {listKinds(o.kinds)}.
      </PageIntro>
      {designs.length === 0 ? (
        <div className="mx-auto max-w-2xl px-5 pb-24 text-ink-soft">
          <p>Designs for this occasion are in the studio now and arrive shortly.</p>
          <Link href="/invitations" className="mt-4 inline-block text-ink underline underline-offset-4">See every occasion</Link>
        </div>
      ) : (
        <ul className="mx-auto grid max-w-6xl gap-x-8 gap-y-14 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((t) => {
            const p = products.find((x) => x.slug === tierPrice[t.tier]);
            return (
              <li key={t.slug}>
                <Link href={`/templates/${t.slug}`} className="group block">
                  <InvitationRenderer template={t} variant="thumb" animate={false} className="transition-transform duration-300 group-hover:-translate-y-1" />
                  <div className="mt-4 flex items-baseline justify-between gap-4">
                    <p className="font-display text-2xl">{t.name}</p>
                    {p?.prices.GBP != null && <p className="text-sm">From {formatMoney(p.prices.GBP)}</p>}
                  </div>
                  <p className="text-sm text-ink-soft">{tierLabel[t.tier]}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
