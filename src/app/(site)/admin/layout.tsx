import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

const sections = [
  { href: "/admin", label: "Overview" },
  // Customers, orders, templates, AI usage, promo codes follow in Milestone 8.
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-5 py-12 text-ink-soft">Checking access…</p>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "support"]);
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[200px_1fr]">
      <nav aria-label="Admin" className="text-sm">
        <p className="mb-3 text-xs text-ink-soft">Signed in as {user.role}</p>
        <ul className="grid gap-1">
          {sections.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block border-l border-line py-2 pl-4 text-ink-soft hover:border-foil hover:text-ink">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>{children}</div>
    </div>
  );
}
