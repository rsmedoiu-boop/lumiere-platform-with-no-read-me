import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StartShell, kindToUrl, urlToKind } from "@/components/start/StartShell";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { activeCategorySlugs, products } from "@/config/catalogue";
import { getOccasion, occasions } from "@/lib/occasions/registry";
import { kindConfig, type InvitationKind } from "@/lib/occasions/kinds";
import { starterContent, templatesFor } from "@/lib/occasions/compat";
import { templateLibrary } from "@/lib/templates/library";
import { formatMoney } from "@/lib/money";

export function generateStaticParams() {
  return occasions.filter((o) => activeCategorySlugs.includes(o.slug)).flatMap((o) => o.kinds.map((k) => ({ occasion: o.slug, kind: kindToUrl(k) })));
}

export const metadata: Metadata = { title: "Choose your design" };

const tierPrice = { classic: "classic-animated", premium: "premium-editable", video: "personalised-video", cinematic: "ai-cinematic" } as const;
const tierLabel = { classic: "Classic animated", premium: "Premium · cinematic film", video: "With your photos and video", cinematic: "Cinematic" } as const;

export default async function DesignPage({ params }: PageProps<"/start/[occasion]/[kind]">) {
  const p = await params;
  const o = getOccasion(p.occasion);
  const kind = urlToKind(p.kind) as InvitationKind;
  if (!o || !activeCategorySlugs.includes(o.slug) || !o.kinds.includes(kind)) notFound();
  const designs = templatesFor(o.slug, templateLibrary);
  return (
    <StartShell
      step={3}
      back={`/start/${o.slug}`}
      eyebrow={`${o.name} · ${kindConfig[kind].name}`}
      title="Choose your design"
      intro="Shown with sample details for your occasion. You can switch design later without losing your words."
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
        {designs.map((t) => {
          const price = products.find((x) => x.slug === tierPrice[t.tier])?.prices.GBP;
          return (
            <li key={t.slug} className="flex flex-col">
              <Link href={`/start/${o.slug}/${p.kind}/${t.slug}`} className="group block">
                <InvitationRenderer template={t} content={starterContent(o, kind, t)} media={t.sampleMedia} variant="thumb" className="shadow-[0_24px_40px_-24px_rgba(28,34,56,0.6)] transition-transform group-hover:-translate-y-1" />
                <span className="mt-3 block font-display text-2xl leading-tight">{t.name}</span>
                <span className="block text-xs text-ink-soft">
                  {tierLabel[t.tier]}
                  {price != null && ` · from ${formatMoney(price)}`}
                </span>
              </Link>
              <Link href={`/preview/${t.slug}/${t.manifest.motion.opening}`} className="mt-2 self-start py-2 text-sm underline underline-offset-4">
                Watch it open
              </Link>
            </li>
          );
        })}
      </ul>
    </StartShell>
  );
}
