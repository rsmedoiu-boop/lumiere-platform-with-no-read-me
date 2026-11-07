import Link from "next/link";

const modules = [
  { href: "/dashboard", label: "My events" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/settings", label: "Account settings" },
  { href: "/contact", label: "Support" },
];

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[200px_1fr]">
      <nav aria-label="Dashboard" className="text-sm">
        <ul className="grid gap-1 md:sticky md:top-24">
          {modules.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="block border-l border-line py-2 pl-4 text-ink-soft hover:border-foil hover:text-ink">
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>{children}</div>
    </div>
  );
}
