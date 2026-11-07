/**
 * The couple's wedding website. Theme colours come from the chosen template,
 * and each section appears only if the couple switched it on — so this one
 * component serves every template and, later, every occasion.
 */
import type { CSSProperties } from "react";
import Link from "next/link";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { resolveTheme } from "@/lib/templates/manifest";
import { formatLongDate, mapLink, sectionLabels, type EventSiteData, type SectionKey } from "@/lib/events/site";
import type { InvitedMember } from "@/lib/rsvp/schema";
import { brand } from "@/lib/brand";
import { EnvelopeOpening } from "./EnvelopeOpening";
import { LiveCountdown } from "./LiveCountdown";
import { RsvpForm } from "./RsvpForm";

const navOrder: SectionKey[] = ["story", "schedule", "venue", "accommodation", "extra"];

export function EventSite({
  event,
  household,
  preview = false,
}: {
  event: EventSiteData;
  household: { name: string; members: InvitedMember[] };
  preview?: boolean;
}) {
  const { template, content } = event.invitation;
  const theme = resolveTheme(template.manifest, content);
  const on = (k: SectionKey) => event.sections.includes(k);
  const hostsLabel = event.hosts.join(" and ");
  const longDate = formatLongDate(event.startsAt, event.locale, event.timezone);
  const deadline = formatLongDate(`${event.rsvp.deadline}T12:00:00Z`, event.locale, event.timezone).replace(/^\w+ /, "");
  const monogram = event.hosts.map((h) => h[0]).join("&");

  const vars = {
    "--ev-bg": theme.palette.background,
    "--ev-ink": theme.palette.ink,
    "--ev-accent": theme.palette.accent,
    "--ev-muted": theme.palette.muted,
    "--ev-line": `color-mix(in oklab, ${theme.palette.accent} 30%, transparent)`,
    "--ev-raise": `color-mix(in oklab, ${theme.palette.background} 88%, white)`,
    background: theme.palette.background,
    color: theme.palette.ink,
  } as CSSProperties;

  return (
    <EnvelopeOpening
      addressee={household.name}
      monogram={monogram}
      card={<InvitationRenderer template={template} content={content} locale={event.locale} />}
    >
      <div style={vars} className="min-h-screen">
        {preview && (
          <p className="bg-[color:var(--ev-accent)] px-4 py-2 text-center text-xs text-[color:var(--ev-bg)]">
            Template preview with sample details. Replies here aren&apos;t saved.
          </p>
        )}

        {/* Sticky navigation */}
        <nav aria-label="Wedding" className="sticky top-0 z-30 border-b border-[color:var(--ev-line)] backdrop-blur" style={{ background: "color-mix(in oklab, var(--ev-bg) 85%, transparent)" }}>
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
            <a href="#top" className="font-display text-xl italic text-[color:var(--ev-accent)]">
              {monogram.replace("&", " & ")}
            </a>
            <ul className="hidden gap-7 text-sm sm:flex">
              {navOrder.filter(on).map((k) => (
                <li key={k}>
                  <a href={`#${k}`} className="text-[color:var(--ev-muted)] hover:text-[color:var(--ev-ink)]">
                    {sectionLabels[k]}
                  </a>
                </li>
              ))}
            </ul>
            {on("rsvp") && (
              <a href="#rsvp" className="rounded-full border border-[color:var(--ev-accent)] px-4 py-1.5 text-sm hover:bg-[color:var(--ev-accent)] hover:text-[color:var(--ev-bg)]">
                RSVP
              </a>
            )}
          </div>
        </nav>

        {/* Hero */}
        <header id="top" className="relative overflow-hidden px-5 pb-20 pt-16 text-center sm:pt-24" style={{ background: "radial-gradient(90% 70% at 50% 0%, color-mix(in oklab, var(--ev-bg) 70%, white 8%) 0%, var(--ev-bg) 70%)" }}>
          <Laurel />
          <p className="mt-6 text-sm tracking-[0.14em] text-[color:var(--ev-muted)]">Together with their families</p>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] sm:text-8xl">
            {event.hosts[0]}
            <span className="my-2 block font-display text-4xl italic text-[color:var(--ev-accent)] sm:text-5xl">&amp;</span>
            {event.hosts[1]}
          </h1>
          <div className="mx-auto my-9 h-px w-40" style={{ background: "linear-gradient(90deg, transparent, var(--ev-accent), transparent)" }} />
          <p className="text-lg">{longDate}</p>
          <p className="mt-1 text-[color:var(--ev-muted)]">{event.venue.name}, {event.venue.address.split(",").at(-1)?.trim()}</p>
          {on("countdown") && (
            <div className="mt-14">
              <LiveCountdown startsAt={event.startsAt} />
            </div>
          )}
        </header>

        <main>
          {on("story") && event.story && (
            <Section id="story" title={event.story.heading}>
              <div className="grid items-center gap-12 md:grid-cols-[1fr_1.2fr]">
                <ArchPortrait monogram={monogram} />
                <div className="grid gap-4 text-lg leading-relaxed text-[color:var(--ev-ink)]/90">
                  {event.story.body.map((p) => (
                    <p key={p.slice(0, 24)}>{p}</p>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {on("schedule") && (
            <Section id="schedule" title="The day" raised>
              <ol className="mx-auto max-w-xl">
                {event.schedule.map((item, i) => (
                  <li key={item.time + item.title} className="grid grid-cols-[72px_24px_1fr] gap-x-4">
                    <p className="pt-0.5 text-right font-display text-2xl text-[color:var(--ev-accent)] [font-variant-numeric:lining-nums_tabular-nums]">{item.time}</p>
                    <div className="flex flex-col items-center" aria-hidden>
                      <span className="mt-2.5 h-2.5 w-2.5 rotate-45 border border-[color:var(--ev-accent)]" />
                      {i < event.schedule.length - 1 && <span className="w-px flex-1 bg-[color:var(--ev-line)]" />}
                    </div>
                    <div className="pb-9">
                      <p className="font-display text-2xl">{item.title}</p>
                      {(item.place || item.note) && (
                        <p className="text-sm text-[color:var(--ev-muted)]">{[item.place, item.note].filter(Boolean).join(". ")}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {on("venue") && (
            <Section id="venue" title={event.venue.name}>
              <div className="grid gap-10 md:grid-cols-2">
                <div>
                  <p className="text-lg">{event.venue.address}</p>
                  <a
                    href={mapLink(event.venue.mapQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-block rounded-full border border-[color:var(--ev-accent)] px-6 py-2.5 text-sm hover:bg-[color:var(--ev-accent)] hover:text-[color:var(--ev-bg)]"
                  >
                    Open in Maps
                  </a>
                </div>
                <dl className="grid gap-6 text-sm">
                  {event.venue.parking && (
                    <div>
                      <dt className="font-display text-xl">Parking</dt>
                      <dd className="mt-1 text-[color:var(--ev-muted)]">{event.venue.parking}</dd>
                    </div>
                  )}
                  {event.venue.transport && (
                    <div>
                      <dt className="font-display text-xl">Getting here</dt>
                      <dd className="mt-1 text-[color:var(--ev-muted)]">{event.venue.transport}</dd>
                    </div>
                  )}
                  {on("dress_code") && event.dressCode && (
                    <div>
                      <dt className="font-display text-xl">Dress code: {event.dressCode.title}</dt>
                      <dd className="mt-1 text-[color:var(--ev-muted)]">{event.dressCode.body}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </Section>
          )}

          {on("accommodation") && event.accommodation.length > 0 && (
            <Section id="accommodation" title="Where to stay" raised>
              <ul className="grid gap-px overflow-hidden rounded-[2px] border border-[color:var(--ev-line)] bg-[color:var(--ev-line)] sm:grid-cols-3">
                {event.accommodation.map((s) => (
                  <li key={s.name} className="bg-[color:var(--ev-bg)] p-6">
                    <p className="font-display text-2xl">{s.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--ev-accent)]">{s.distance}</p>
                    {s.note && <p className="mt-3 text-sm text-[color:var(--ev-muted)]">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {on("rsvp") && (
            <Section id="rsvp" title="Will you join us?">
              <p className="-mt-6 mb-10 text-center text-[color:var(--ev-muted)]">
                Your invitation is for {household.name}. Please reply by {deadline}.
              </p>
              <div className="mx-auto max-w-xl">
                <RsvpForm
                  household={household}
                  meals={event.rsvp.meals}
                  childMealOffered={event.rsvp.childMeal}
                  deadlineLabel={deadline}
                  hostsLabel={hostsLabel}
                  preview={preview}
                />
              </div>
            </Section>
          )}

          {on("extra") && event.extra.length > 0 && (
            <Section id="extra" title="Good to know" raised>
              <div className="mx-auto max-w-2xl">
                {event.extra.map((f) => (
                  <details key={f.q} className="group border-b border-[color:var(--ev-line)] py-5">
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 font-display text-2xl">
                      {f.q}
                      <span aria-hidden className="text-[color:var(--ev-accent)] transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-[color:var(--ev-muted)]">{f.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}
        </main>

        <footer className="px-5 py-16 text-center">
          <p className="font-display text-3xl italic text-[color:var(--ev-accent)]">{monogram.replace("&", " & ")}</p>
          <p className="mt-2 text-sm text-[color:var(--ev-muted)]">{longDate}</p>
          <p className="mt-10 text-xs text-[color:var(--ev-muted)]/80">
            Invitation by <Link href="/" className="underline underline-offset-4">{brand.name}</Link>
          </p>
        </footer>
      </div>
    </EnvelopeOpening>
  );
}

function Section({ id, title, raised, children }: { id: string; title: string; raised?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 px-5 py-20 sm:py-24" style={raised ? { background: "var(--ev-raise)" } : undefined}>
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center font-display text-4xl sm:text-5xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Laurel() {
  return (
    <svg aria-hidden viewBox="0 0 120 40" className="mx-auto w-28 text-[color:var(--ev-accent)]">
      {[-1, 1].map((side) => (
        <g key={side} transform={side === 1 ? "translate(120 0) scale(-1 1)" : undefined} fill="none" stroke="currentColor" strokeWidth="0.9">
          <path d="M58 34 C40 32 22 24 12 8" />
          {[0, 1, 2, 3, 4].map((k) => (
            <ellipse key={k} cx={46 - k * 8} cy={30 - k * 4.6} rx="5" ry="2" transform={`rotate(${-20 - k * 8} ${46 - k * 8} ${30 - k * 4.6})`} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Placeholder for the couple's photograph, framed like the invitation. */
function ArchPortrait({ monogram }: { monogram: string }) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-t-full border border-[color:var(--ev-accent)] p-3">
      <div
        className="grid aspect-[3/4] place-items-center rounded-t-full font-display text-6xl italic text-[color:var(--ev-bg)]"
        style={{ background: "linear-gradient(170deg, color-mix(in oklab, var(--ev-accent) 70%, white 10%), color-mix(in oklab, var(--ev-accent) 45%, var(--ev-bg)))" }}
        role="img"
        aria-label="Space for the couple's photograph"
      >
        {monogram.replace("&", " & ")}
      </div>
    </div>
  );
}
