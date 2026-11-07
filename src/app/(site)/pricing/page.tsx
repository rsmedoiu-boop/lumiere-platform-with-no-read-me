import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { products, type FeatureKey } from "@/config/catalogue";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Pricing" };

const featureNames: Record<FeatureKey, string> = {
  invitation_classic: "Classic animated invitation",
  invitation_premium: "Premium editable invitation",
  personal_media: "Your photographs and video",
  ai_cinematic: "AI cinematic film, with storyboard approval",
  website: "Wedding website",
  countdown: "Countdown",
  rsvp: "Personal RSVP links",
  guest_management: "Guest list and groups",
  seating: "Smart Seating Planner",
  venue_handover: "Venue handover pack",
  bespoke_service: "One-to-one design with our studio",
};

export default function PricingPage() {
  return (
    <>
      <PageIntro title="One payment per celebration">
        No subscriptions. Prices include VAT where applicable. Try any design for free and pay when you&apos;re ready to send it.
      </PageIntro>
      <div className="mx-auto max-w-6xl px-5 pb-24">
        <ul className="divide-y divide-line border-y border-line">
          {products.map((p) => (
            <li key={p.slug} className={`grid gap-6 py-10 md:grid-cols-[1.2fr_1.5fr_auto] md:items-start ${p.highlight ? "bg-paper md:-mx-6 md:px-6" : ""}`}>
              <div>
                <h2 className="text-3xl">{p.name}</h2>
                {p.highlight && <p className="mt-2 text-sm text-foil-deep">Everything we offer for your wedding</p>}
                <p className="mt-3 font-display text-4xl">
                  {p.isFromPrice && <span className="text-xl">from </span>}
                  {p.prices.GBP != null ? formatMoney(p.prices.GBP) : ""}
                </p>
              </div>
              <div>
                <p className="text-ink-soft">{p.description}</p>
                <ul className="mt-4 grid gap-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="border-l border-foil pl-3">{featureNames[f]}</li>
                  ))}
                </ul>
              </div>
              <Link href={p.slug === "bespoke-premium" ? "/contact" : "/start"} className={`btn ${p.highlight ? "btn-primary" : "btn-quiet"} md:mt-2`}>
                {p.slug === "bespoke-premium" ? "Talk to the studio" : "Choose a design"}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-sm text-ink-soft">
          AI cinematic films are made by our studio with current AI video tools. Results vary between generations, so you approve a
          storyboard and drafts before the final film. We can&apos;t guarantee an exact likeness. Photographs showing children are never used for AI generation.
        </p>
      </div>
    </>
  );
}
