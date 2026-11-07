import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { templateLibrary, getTemplate } from "@/lib/templates/library";

export function generateStaticParams() {
  return templateLibrary.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/templates/[slug]">): Promise<Metadata> {
  const t = getTemplate((await params).slug);
  return { title: t ? `${t.name} wedding invitation` : "Design not found" };
}

const sectionNames: Record<string, string> = {
  countdown: "Countdown", ceremony: "Ceremony details", reception: "Reception details", dress_code: "Dress code",
  directions: "Directions and map", accommodation: "Where to stay", gallery: "Photo gallery", video: "Your video",
  rsvp: "Personal RSVP links", extra: "Extra information",
};

export default async function TemplatePage({ params }: PageProps<"/templates/[slug]">) {
  const t = getTemplate((await params).slug);
  if (!t) notFound();
  const editable = [
    "Names, wording, date and venue",
    t.manifest.theme.editable.palette && "Colours",
    t.manifest.theme.editable.fonts && "Typography",
    t.manifest.slots.some((s) => s.type === "image") && "Your photograph",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 md:grid-cols-[1fr_1fr] md:py-24">
      <div className="mx-auto w-full max-w-[420px] self-start shadow-[0_40px_80px_-40px_rgba(28,34,56,0.6)]">
        <InvitationRenderer template={t} />
      </div>
      <div>
        <Link href="/invitations/weddings" className="text-sm text-ink-soft underline underline-offset-4">
          All wedding designs
        </Link>
        <h1 className="mt-6 text-6xl">{t.name}</h1>
        <p className="mt-4 text-lg text-ink-soft">{t.mood}</p>
        <div className="foil-rule my-10" />
        <h2 className="text-2xl">What you can change</h2>
        <ul className="mt-3 grid gap-1 text-ink-soft">
          {editable.map((e) => <li key={e}>{e}</li>)}
        </ul>
        <h2 className="mt-8 text-2xl">Your wedding page includes</h2>
        <p className="mt-3 text-ink-soft">{t.manifest.sections.map((s) => sectionNames[s]).join(", ")}.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/register" className="btn btn-primary">
            Personalise this design
          </Link>
          {t.slug === "midnight-garden" && (
            <Link href="/e/demo" className="btn btn-quiet">
              Open it as a guest
            </Link>
          )}
        </div>
        <p className="mt-3 text-sm text-ink-soft">Free to try. You only pay when you publish.</p>
      </div>
    </div>
  );
}
