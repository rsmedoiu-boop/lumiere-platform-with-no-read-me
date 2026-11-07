import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = { title: "Questions" };

const faqs: [string, string][] = [
  ["Do my guests need an account to reply?", "No. Each household gets a private link and replies in a minute, on any phone or computer."],
  ["Can I change details after sending?", "Yes. Edit wording, times or venue details at any time and republish. Your link stays the same, so guests always see the latest version."],
  ["What happens if a guest changes their reply after I've seated them?", "Their seat is flagged for you to review. We never remove anyone from your plan without you deciding."],
  ["How do I send the seating plan to my venue?", "Use Generate venue handover pack. You get a PDF seating chart, a catering and allergy summary, and Excel and CSV guest lists. Download them, or share a private link that you can switch off."],
  ["Is there a subscription?", "No. You pay once per celebration."],
  ["How long is my wedding page online?", "Until 12 months after your event, then it and your guest data are deleted. We'll email you before that happens, and you can extend it."],
  ["Can I upload photos of children?", "Yes, for your invitation and wedding page. Mark them as including children and they are kept private, never used for marketing, and never sent for AI generation."],
  ["Can you design something completely bespoke?", "Yes. Our bespoke service starts with a conversation with the studio. Get in touch through the contact page."],
];

export default function FaqPage() {
  return (
    <>
      <PageIntro title="Questions" />
      <div className="mx-auto max-w-3xl px-5 pb-24">
        {faqs.map(([q, a]) => (
          <details key={q} className="group border-b border-line py-5">
            <summary className="cursor-pointer list-none font-display text-2xl marker:hidden">
              <span className="flex items-baseline justify-between gap-6">
                {q}
                <span aria-hidden className="text-foil-deep transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
