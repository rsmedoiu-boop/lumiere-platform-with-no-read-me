import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listMyEvents, type EventSummary } from "@/lib/events/queries";
import { signOut } from "../(auth)/actions";

export const metadata: Metadata = { title: "My events", robots: { index: false } };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading your events…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser("/dashboard");
  const events = await listMyEvents();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Hello{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}</h1>
          <p className="mt-2 text-ink-soft">Everything for your celebration, in one place.</p>
        </div>
        <form action={signOut}>
          <button className="btn btn-quiet">Sign out</button>
        </form>
      </div>
      <div className="foil-rule my-10" />
      {events.length === 0 ? (
        <section className="max-w-lg">
          <h2 className="text-3xl">Start with a design</h2>
          <p className="mt-3 text-ink-soft">
            Choose an invitation you love. Your wedding page, guest list and seating plan are created with it.
          </p>
          <Link href="/invitations/weddings" className="btn btn-primary mt-6">
            Browse wedding designs
          </Link>
        </section>
      ) : (
        <ul className="grid gap-10">
          {events.map((e) => (
            <EventPanel key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventPanel({ event }: { event: EventSummary }) {
  const s = event.stats;
  const figures: [string, number | undefined, boolean?][] = [
    ["Invited", s?.invited],
    ["Confirmed", s?.accepted],
    ["Declined", s?.declined],
    ["Awaiting reply", s?.pending],
    ["Confirmed without a seat", s?.unassigned_accepted, (s?.unassigned_accepted ?? 0) > 0],
    ["Table capacity", s?.total_capacity],
    ["Seats available", s?.available],
    ["Dietary needs to check", s?.dietary_flags, (s?.dietary_flags ?? 0) > 0],
  ];
  return (
    <li>
      <h2 className="text-3xl">{event.title}</h2>
      <p className="text-sm text-ink-soft">{[event.venueName, event.startsAt?.slice(0, 10)].filter(Boolean).join(", ")}</p>
      {s && s.needs_review > 0 && (
        <p role="status" className="mt-4 border-l-2 border-foil bg-paper px-3 py-2 text-sm">
          {s.needs_review} seated {s.needs_review === 1 ? "guest has" : "guests have"} changed their reply. Review them in the seating plan.
        </p>
      )}
      <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {figures.map(([label, value, attention]) => (
          <div key={label} className="bg-paper p-4">
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className={`mt-1 font-display text-3xl ${attention ? "text-foil-deep" : ""}`}>{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
