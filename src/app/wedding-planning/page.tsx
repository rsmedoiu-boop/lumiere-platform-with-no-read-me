import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { SeatingIllustration } from "@/components/site/SeatingIllustration";

export const metadata: Metadata = { title: "RSVP, guest list and seating plan" };

const blocks = [
  {
    id: "rsvp",
    title: "RSVPs without the chasing",
    points: [
      "Each household gets a private link. Guests reply in a minute without creating an account.",
      "Meal choices, dietary requirements, allergies and children's meals are collected as they reply.",
      "Confirmation emails go out automatically. You see who has opened, replied or still needs a nudge.",
      "Import your list from a spreadsheet, group couples and families, and export it at any time.",
    ],
  },
  {
    id: "seating",
    title: "Smart Seating Planner",
    points: [
      "Round, rectangular, oval or custom tables, each with its own capacity, name or number.",
      "Drag guests into place on a computer, or tap to assign on your phone.",
      "Families and couples move together. Keep-apart and keep-together wishes show as gentle warnings.",
      "If a seated guest changes their reply, their seat is flagged for you. Nothing is quietly removed.",
      "Lock finished tables, undo any change, and see free seats update as you go.",
    ],
  },
  {
    id: "handover",
    title: "Venue handover pack",
    points: [
      "A PDF seating chart with table-by-table guest lists and seat numbers.",
      "A catering summary listing every dietary need and allergy, with names and tables.",
      "Excel and CSV guest lists, ready for your venue's own systems.",
      "Every version is numbered and dated, so you and the venue always know which is current.",
    ],
  },
];

export default function PlanningPage() {
  return (
    <>
      <PageIntro title="Your guest list, replies and seating plan, together">
        Every reply your guests send goes straight into your guest list and your seating plan. There&apos;s one list to keep up to date, and it never gets out of step.
      </PageIntro>
      <div className="mx-auto grid max-w-6xl gap-20 px-5 pb-24">
        {blocks.map((b, i) => (
          <section key={b.id} id={b.id} className="grid scroll-mt-24 gap-10 md:grid-cols-[1fr_1fr] md:items-center">
            <div className={i === 1 ? "md:order-2" : ""}>
              <h2 className="text-4xl">{b.title}</h2>
              <ul className="mt-6 grid gap-3">
                {b.points.map((p) => <li key={p} className="border-l border-foil pl-4 text-ink-soft">{p}</li>)}
              </ul>
            </div>
            {i === 1 ? <SeatingIllustration tables={15} seatsPerTable={10} confirmed={128} /> : <div className="hidden md:block" />}
          </section>
        ))}
      </div>
    </>
  );
}
