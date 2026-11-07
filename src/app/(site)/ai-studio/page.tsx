import Link from "next/link";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { Photo } from "@/components/ui/Photo";

export const metadata: Metadata = { title: "AI cinematic studio" };

const stages = [
  ["Choose a concept", "Pick a cinematic direction, such as a candlelit château, a coastal golden hour or a city at night."],
  ["Share your story", "Upload a few photographs of the two of you and tell us what matters. Children's photos are never used for AI."],
  ["Approve the storyboard", "We send key frames for your approval before the film is made. You can ask for changes."],
  ["Receive your film", "The finished film becomes the opening of your invitation and wedding page, usually within 3 to 5 working days."],
];

export default function AiStudioPage() {
  return (
    <>
      <PageIntro title="A short film that opens your invitation">
        Our studio uses AI video tools to build a cinematic opening around you. Changing your wording or date later never means making a new film.
      </PageIntro>
      <figure className="mx-auto max-w-6xl px-5 pb-16">
        <Photo name="chateau" sizes="(min-width: 1152px) 1120px, 100vw" className="aspect-[21/9] w-full rounded-[2px] object-cover" />
        <figcaption className="mt-3 text-sm text-ink-soft">A frame from a cinematic concept, generated in our studio. Your film is built around your own story and photographs.</figcaption>
      </figure>
      <div className="mx-auto max-w-4xl px-5 pb-24">
        <ol className="grid gap-10">
          {stages.map(([title, body], i) => (
            <li key={title} className="grid gap-4 sm:grid-cols-[80px_1fr]">
              <p className="font-display text-5xl text-foil-deep">{i + 1}</p>
              <div>
                <h2 className="text-3xl">{title}</h2>
                <p className="mt-2 text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-14 border-l-2 border-foil bg-paper p-6 text-sm text-ink-soft">
          <p className="text-ink">What to expect</p>
          <p className="mt-2">
            AI video is remarkable but not exact. Faces and details can vary from one generation to the next, which is why you approve each stage.
            Your package includes a set number of drafts, and your photographs stay private and are deleted after your event.
          </p>
        </div>
        <Link href="/pricing" className="btn btn-primary mt-10">See cinematic packages</Link>
      </div>
    </>
  );
}
