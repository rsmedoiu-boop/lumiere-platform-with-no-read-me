"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn btn-quiet px-4 py-2"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="absolute inset-x-0 top-16 border-b border-line bg-paper px-5 pb-6 pt-2 shadow-sm">
          <ul className="grid gap-1">
            {[...items, { href: "/login", label: "Sign in" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-3 font-display text-2xl" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
