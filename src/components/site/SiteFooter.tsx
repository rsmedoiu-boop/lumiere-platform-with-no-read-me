import Link from "next/link";
import { brand } from "@/lib/brand";
import { CookieSettingsLink } from "./CookieConsent";

const columns = [
  {
    heading: "Create",
    links: [
      { href: "/invitations/weddings", label: "Wedding invitations" },
      { href: "/ai-studio", label: "AI cinematic studio" },
      { href: "/invitations", label: "All occasions" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Plan",
    links: [
      { href: "/wedding-planning", label: "RSVP and guest list" },
      { href: "/wedding-planning#seating", label: "Smart Seating Planner" },
      { href: "/wedding-planning#handover", label: "Venue handover pack" },
      { href: "/how-it-works", label: "How it works" },
    ],
  },
  {
    heading: "Studio",
    links: [
      { href: "/about", label: "About us" },
      { href: "/faq", label: "Questions" },
      { href: "/contact", label: "Contact and support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms and conditions" },
      { href: "/legal/privacy", label: "Privacy notice" },
      { href: "/legal/cookies", label: "Cookie policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-ink text-silk">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <p className="font-display text-3xl">{brand.name}</p>
          <p className="mt-3 max-w-xs text-sm text-silk/70">{brand.tagline}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h2 className="font-sans text-sm font-medium text-foil">{col.heading}</h2>
            <ul className="mt-4 grid gap-2.5 text-sm text-silk/80">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-paper">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-silk/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-silk/60">
          <p>
            © {brand.name}. Made in the {brand.country}.
          </p>
          <CookieSettingsLink />
        </div>
      </div>
    </footer>
  );
}
