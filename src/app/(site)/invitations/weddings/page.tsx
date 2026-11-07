import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { templateLibrary } from "@/lib/templates/library";
import { products } from "@/config/catalogue";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Wedding invitations" };

const tierPrice = { classic: "classic-animated", premium: "premium-editable", video: "personalised-video", cinematic: "ai-cinematic" } as const;
const tierLabel = { classic: "Classic animated", premium: "Premium editable", video: "With your photos and video", cinematic: "Cinematic" } as const;

export default function WeddingGalleryPage() {
  return (
    <>
      <PageIntro title="Wedding invitations">
        Open any design to see it move with sample names. Your own wording, date and photographs go in after you choose.
      </PageIntro>
      <ul className="mx-auto grid max-w-6xl gap-x-8 gap-y-14 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {templateLibrary.map((t) => {
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
    </>
  );
}
