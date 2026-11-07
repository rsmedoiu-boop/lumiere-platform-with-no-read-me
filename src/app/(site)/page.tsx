import Link from "next/link";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { SeatingIllustration } from "@/components/site/SeatingIllustration";
import { Photo } from "@/components/ui/Photo";
import { templateLibrary, getTemplate } from "@/lib/templates/library";
import { products } from "@/config/catalogue";
import { formatMoney } from "@/lib/money";

const price = (slug: string) => {
  const p = products.find((x) => x.slug === slug);
  return p?.prices.GBP != null ? formatMoney(p.prices.GBP) : "";
};

const levels = [
  {
    slug: "classic-animated",
    name: "Animated designs",
    body: "Pick a design, add your names, date and venue. It arrives on your guests' phones moving, not as a flat card.",
  },
  {
    slug: "personalised-video",
    name: "Your photographs and film",
    body: "Your engagement photos and short clips set inside the design, so the invitation is unmistakably yours.",
  },
  {
    slug: "ai-cinematic",
    name: "A cinematic film",
    body: "Our studio crafts a short film around your story. You approve a storyboard before anything is made.",
  },
];

export default function HomePage() {
  const hero = getTemplate("midnight-garden")!;

  return (
    <>
      {/* Hero: the product itself, writing itself in. */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 md:grid-cols-[1.05fr_1fr] md:pt-20 md:pb-28">
          <div>
            <h1 className="text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
              Invitations that move,
              <span className="block italic text-ink-soft">and everything after the yes.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg text-ink-soft">
              Animated and cinematic wedding invitations, with RSVPs, your guest list, a seating plan and the documents your
              venue needs, all in one place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/invitations/weddings" className="btn btn-primary">
                Choose a design
              </Link>
              <Link href="/wedding-planning" className="btn btn-quiet">
                See the planning tools
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[460px] pb-16 pl-10 sm:pl-16">
            <Photo
              name="hero"
              priority
              sizes="(min-width: 768px) 420px, 90vw"
              className="aspect-[4/5] w-full rounded-[2px] object-cover shadow-[0_40px_80px_-40px_rgba(28,34,56,0.55)]"
            />
            <figure className="absolute bottom-0 left-0 w-[48%] rotate-[-3deg] shadow-[0_30px_60px_-25px_rgba(28,34,56,0.8)]">
              <InvitationRenderer template={hero} />
              <figcaption className="sr-only">An example invitation for Sarah and James, using the Midnight Garden design.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Three levels of invitation. A real ladder, so it's a sequence. */}
      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl text-4xl md:text-5xl">Three ways to invite, from ready-made to made-for-you</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            {levels.map((l, i) => (
              <li key={l.slug} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <p className="font-display text-2xl text-foil-deep">{["I", "II", "III"][i]}</p>
                <h3 className="mt-3 text-3xl">{l.name}</h3>
                <p className="mt-3 text-ink-soft">{l.body}</p>
                <p className="mt-5 text-sm">From {price(l.slug)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Planning: the differentiator, shown with real numbers. */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-4xl md:text-5xl">After they reply, the hard part is done for you</h2>
          <p className="mt-5 max-w-md text-ink-soft">
            Every RSVP lands in your guest list with meal choices and allergies. Seat everyone with drag and drop, or a tap
            on your phone. When the plan is final, send your venue a seating chart, catering list and spreadsheet in one click.
          </p>
          <ul className="mt-8 grid gap-3 text-sm">
            <li className="border-l border-foil pl-4">Guests reply from a personal link. No accounts, no passwords.</li>
            <li className="border-l border-foil pl-4">Tables never overfill, and a late &ldquo;sorry, can&apos;t come&rdquo; is flagged instead of quietly reshuffled.</li>
            <li className="border-l border-foil pl-4">Venue handover pack: PDF seating chart, Excel and CSV guest lists, dietary summary.</li>
          </ul>
        </div>
        <SeatingIllustration tables={15} seatsPerTable={10} confirmed={128} />
      </section>

      {/* Gallery strip */}
      <section className="bg-blush/50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-4xl md:text-5xl">From the wedding collection</h2>
            <Link href="/invitations/weddings" className="text-sm underline underline-offset-4">
              See every design
            </Link>
          </div>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {templateLibrary.map((t) => (
              <li key={t.slug}>
                <Link href={`/templates/${t.slug}`} className="group block">
                  <InvitationRenderer template={t} variant="thumb" animate={false} className="transition-transform duration-300 group-hover:-translate-y-1" />
                  <p className="mt-4 font-display text-2xl">{t.name}</p>
                  <p className="text-sm text-ink-soft">{t.mood}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h2 className="text-4xl md:text-5xl">The Complete Wedding Experience</h2>
        <p className="mx-auto mt-5 max-w-xl text-ink-soft">
          A premium invitation with your photos and film, your wedding website, RSVPs, guest list, Smart Seating Planner and
          venue handover pack, for {price("complete-experience")}.
        </p>
        <Link href="/pricing" className="btn btn-primary mt-8">
          Compare packages
        </Link>
      </section>
    </>
  );
}
