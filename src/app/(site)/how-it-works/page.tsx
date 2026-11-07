import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  ["Choose a design", "Browse the collection and open any design to see it move. Nothing to pay yet."],
  ["Make it yours", "Add your names, wording, date and venue. Upload photographs or short clips where the design allows. Your work saves as you go."],
  ["Publish and share", "Pay once, publish, and share your personal link by message, email or QR code. Your wedding page goes live with it."],
  ["Collect replies", "Add guests or import a spreadsheet. Each household gets its own link to reply, with meal choices and allergies."],
  ["Seat everyone", "Create your tables, then drag guests into place, or tap to assign on your phone. Tables can't be overfilled."],
  ["Hand over to your venue", "Generate the seating chart, catering list and guest spreadsheets in one click, and regenerate whenever plans change."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro title="How it works">From the first design to the final seating chart, in six steps.</PageIntro>
      <ol className="mx-auto grid max-w-4xl gap-12 px-5 pb-24">
        {steps.map(([title, body], i) => (
          <li key={title} className="grid gap-4 sm:grid-cols-[80px_1fr]">
            <p className="font-display text-5xl text-foil-deep">{i + 1}</p>
            <div>
              <h2 className="text-3xl">{title}</h2>
              <p className="mt-2 max-w-xl text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
        <li className="sm:pl-[96px]">
          <Link href="/invitations/weddings" className="btn btn-primary">Choose a design</Link>
        </li>
      </ol>
    </>
  );
}
