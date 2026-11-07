import Link from "next/link";
import { brand } from "@/lib/brand";
import { MobileNav } from "./MobileNav";

export const primaryNav = [
  { href: "/invitations/weddings", label: "Invitations" },
  { href: "/ai-studio", label: "AI studio" },
  { href: "/wedding-planning", label: "Guests & seating" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line/70 bg-silk/90 backdrop-blur supports-[backdrop-filter]:bg-silk/75 sticky top-0 z-40">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="flex items-center gap-3" aria-label={`${brand.name} home`}>
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full border border-foil font-display text-base text-foil-deep">
            {brand.monogram}
          </span>
          <span className="font-display text-2xl leading-none">{brand.name}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm lg:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink-soft hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/login" className="text-sm text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link href="/invitations/weddings" className="btn btn-primary">
            Choose a design
          </Link>
        </div>
        <MobileNav items={primaryNav} />
      </div>
    </header>
  );
}
