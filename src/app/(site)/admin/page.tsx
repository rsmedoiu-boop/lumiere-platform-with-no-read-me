import { Suspense } from "react";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-5xl">Studio overview</h1>
      <Suspense fallback={<p className="mt-6 text-ink-soft">Loading figures…</p>}>
        <Figures />
      </Suspense>
    </div>
  );
}

async function Figures() {
  await requireRole(["admin", "support"]);
  const supabase = (await createSupabaseServerClient())!;
  // Staff read access comes from RLS (is_staff policies), not from a service key.
  const count = async (table: string, filter?: [string, string]) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    return (await q).count ?? 0;
  };
  const [customers, events, paid, guests] = await Promise.all([
    count("profiles", ["role", "customer"]),
    count("events"),
    count("orders", ["status", "paid"]),
    count("guests"),
  ]);
  const figures = [
    ["Customers", customers],
    ["Events", events],
    ["Paid orders", paid],
    ["Guests managed", guests],
  ] as const;
  return (
    <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
      {figures.map(([label, value]) => (
        <div key={label} className="bg-paper p-5">
          <dt className="text-xs text-ink-soft">{label}</dt>
          <dd className="mt-1 font-display text-4xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
