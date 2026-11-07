"use client";

/**
 * The opening moment before the invitation: a sealed envelope, a silk curtain
 * or a film title card, personalised with the guest's name. Every opening
 * takes its colours from the design, ends on the playing invitation, and
 * lets the guest replay it or continue to the event website.
 *
 * Reduced-motion visitors get the same steps without movement, and every
 * stage can be skipped.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { OpeningKey } from "@/lib/cinema/motion";

type Stage = "closed" | "opening" | "card" | "done";

export interface OpeningPalette {
  background: string;
  ink: string;
  accent: string;
  muted: string;
}

interface Props {
  opening: OpeningKey;
  palette: OpeningPalette;
  /** "the Patel family" */
  addressee: string;
  /** "S&J" for the seal */
  monogram: string;
  /** "Sarah & James", for the title card */
  title: string;
  /** The invitation itself (an InvitationRenderer). */
  card: ReactNode;
  /** Whether the invitation moves (offers "Watch again"). */
  replayable?: boolean;
  continueLabel?: string;
  backdrop?: string;
  backdropVideo?: string;
  /** Artwork for the gilded opening: the closed envelope and its gold-foil twin. */
  art?: { closed: string; revealed: string };
  /** The design's paper, shown behind the card once an art-based opening has played. */
  paper?: string;
  children: ReactNode;
}

const OPEN_MS: Record<OpeningKey, number> = { envelope: 1100, curtain: 1500, "title-card": 6200, gilded: 3000, none: 0 };

export function OpeningSequence({
  opening: requested,
  palette,
  addressee,
  monogram,
  title,
  card,
  replayable = true,
  continueLabel = "View the details",
  backdrop,
  backdropVideo,
  art,
  paper,
  children,
}: Props) {
  // An art-based opening without its artwork falls back to the classic envelope.
  const opening: OpeningKey = requested === "gilded" && !art ? "envelope" : requested;
  const [stage, setStage] = useState<Stage>(opening === "none" ? "card" : "closed");
  const [plays, setPlays] = useState(0);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (stage !== "opening") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setStage("card"), reduce ? 0 : OPEN_MS[opening]);
    return () => clearTimeout(t);
  }, [stage, opening]);

  useEffect(() => {
    if (stage === "card") {
      const t = setTimeout(() => continueRef.current?.focus({ preventScroll: true }), 2600);
      return () => clearTimeout(t);
    }
    if (stage === "done") window.scrollTo({ top: 0 });
  }, [stage]);

  // Keep the page behind from scrolling while the opening is showing.
  useEffect(() => {
    document.documentElement.style.overflow = stage === "done" ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [stage]);

  const dark = isDark(palette.background);
  const vars = {
    "--op-bg": palette.background,
    "--op-ink": palette.ink,
    "--op-accent": palette.accent,
    "--op-muted": palette.muted,
    "--op-deep": `color-mix(in oklab, ${palette.background} ${dark ? 70 : 88}%, black)`,
    "--op-paper": `color-mix(in oklab, ${palette.background} ${dark ? 88 : 94}%, ${dark ? "white" : palette.accent})`,
    // Folds shade towards the ink on dark paper, towards the foil on light.
    "--op-fold": dark ? palette.ink : palette.accent,
    background: `radial-gradient(120% 80% at 50% 10%, color-mix(in oklab, ${palette.background} 85%, white) 0%, ${palette.background} 55%, var(--op-deep) 100%)`,
    color: palette.ink,
  } as CSSProperties;

  const open = () => setStage("opening");

  return (
    <>
      {stage !== "done" && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto px-5 py-10"
          style={vars}
          role="dialog"
          aria-modal="true"
          aria-label="Your invitation"
          data-opening={opening}
        >
          {opening !== "title-card" && opening !== "gilded" && <Backdrop image={backdrop} video={backdropVideo} tint={palette.background} />}
          {opening === "gilded" && stage === "card" && <Backdrop image={paper ?? backdrop} video={paper ? undefined : backdropVideo} tint={palette.background} fade={paper ? 0.1 : 0.35} />}

          {stage !== "card" && opening === "envelope" && (
            <div className="relative flex flex-col items-center">
              <p className="mb-8 font-display text-xl italic text-[color:var(--op-accent)]">For {addressee}</p>
              <button type="button" onClick={open} disabled={stage === "opening"} className="group relative [perspective:1200px]" aria-label="Open your invitation">
                <Envelope opening={stage === "opening"} monogram={monogram} />
              </button>
              <p className="mt-10 text-sm tracking-wide text-[color:var(--op-muted)]" aria-hidden={stage === "opening"}>
                {stage === "closed" ? "Tap the seal to open" : " "}
              </p>
            </div>
          )}

          {stage !== "card" && opening === "curtain" && <Curtain opening={stage === "opening"} onOpen={open} addressee={addressee} monogram={monogram} />}

          {stage !== "card" && opening === "gilded" && art && <GildedEnvelope opening={stage === "opening"} onOpen={open} addressee={addressee} monogram={monogram} art={art} />}

          {stage !== "card" && opening === "title-card" && <TitleCard playing={stage === "opening"} onBegin={open} addressee={addressee} title={title} />}

          {stage === "card" && (
            <div className="relative flex w-full max-w-[400px] flex-col items-center">
              <div key={plays} className="reveal-rise-card w-full shadow-[0_50px_90px_-40px_rgba(0,0,0,0.8)]">
                {card}
              </div>
              <div className="reveal-settle mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "2200ms" }}>
                <button
                  ref={continueRef}
                  type="button"
                  onClick={() => setStage("done")}
                  className="rounded-full border border-[color:var(--op-accent)] px-7 py-3 text-sm tracking-wide hover:bg-[color:var(--op-accent)] hover:text-[color:var(--op-bg)]"
                >
                  {continueLabel}
                </button>
                {replayable && (
                  <button type="button" onClick={() => setPlays((n) => n + 1)} className="px-3 py-3 text-sm text-[color:var(--op-muted)] underline-offset-4 hover:underline motion-reduce:hidden">
                    Watch again
                  </button>
                )}
              </div>
            </div>
          )}

          <button type="button" onClick={() => setStage("done")} className="absolute right-4 top-4 z-50 text-xs text-[color:var(--op-muted)] underline-offset-4 hover:underline">
            Skip
          </button>
        </div>
      )}
      <div aria-hidden={stage !== "done"} inert={stage !== "done"}>
        {children}
      </div>
    </>
  );
}

/** Rough luminance check so openings pick light or dark paper. */
function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------
function Envelope({ opening, monogram }: { opening: boolean; monogram: string }) {
  return (
    <div className="relative h-[230px] w-[min(340px,86vw)]" style={{ transformStyle: "preserve-3d" }}>
      <div className="absolute inset-0 rounded-[3px]" style={{ background: "var(--op-paper)", boxShadow: "0 40px 80px -30px rgba(0,0,0,0.6)" }} />
      <div
        className="absolute inset-x-[10px] top-[8px] h-[60%]"
        style={{
          background: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--op-accent) 22%, var(--op-paper)) 0 6px, var(--op-paper) 6px 12px)",
          opacity: opening ? 1 : 0,
          transition: "opacity 300ms 200ms",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 340 230" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 L170 135 L340 0 L340 230 L0 230 Z" style={{ fill: "color-mix(in oklab, var(--op-paper) 92%, var(--op-fold))" }} />
        <path d="M0 230 L170 120 L340 230 Z" style={{ fill: "color-mix(in oklab, var(--op-paper) 86%, var(--op-fold))" }} />
        <path d="M0 230 L170 120 L340 230" fill="none" style={{ stroke: "var(--op-accent)" }} strokeOpacity="0.45" strokeWidth="0.8" />
      </svg>
      <div
        className="absolute inset-x-0 top-0 h-[62%] origin-top"
        style={{
          transform: opening ? "rotateX(180deg)" : "rotateX(0deg)",
          transition: "transform 900ms cubic-bezier(0.65, 0, 0.35, 1)",
          transformStyle: "preserve-3d",
          zIndex: opening ? 0 : 2,
        }}
      >
        <svg className="h-full w-full" viewBox="0 0 340 143" preserveAspectRatio="none" aria-hidden>
          <path d="M0 0 L340 0 L170 143 Z" style={{ fill: "color-mix(in oklab, var(--op-paper) 80%, var(--op-fold))" }} />
          <path d="M0 0 L170 143 L340 0" fill="none" style={{ stroke: "var(--op-accent)" }} strokeOpacity="0.55" strokeWidth="0.8" />
        </svg>
      </div>
      <WaxSeal monogram={monogram} hidden={opening} className="absolute left-1/2 top-[56%] z-10 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

function WaxSeal({ monogram, hidden, className = "" }: { monogram: string; hidden?: boolean; className?: string }) {
  return (
    <div
      className={`grid h-[68px] w-[68px] place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105 ${className}`}
      style={{
        background: "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--op-accent) 55%, white), var(--op-accent) 55%, color-mix(in oklab, var(--op-accent) 60%, black))",
        boxShadow: "0 6px 14px -4px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.25)",
        opacity: hidden ? 0 : 1,
        transition: "opacity 250ms, transform 300ms",
      }}
    >
      <span className="font-display text-xl italic" style={{ color: "color-mix(in oklab, var(--op-accent) 30%, black)" }}>
        {monogram}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Silk curtain
// ---------------------------------------------------------------------------
function Curtain({ opening, onOpen, addressee, monogram }: { opening: boolean; onOpen: () => void; addressee: string; monogram: string }) {
  const silk = (side: "left" | "right"): CSSProperties => ({
    background: `repeating-linear-gradient(90deg,
        color-mix(in oklab, var(--op-paper) 80%, var(--op-ink)) 0 18px,
        color-mix(in oklab, var(--op-paper) 92%, white) 30px,
        color-mix(in oklab, var(--op-paper) 84%, var(--op-ink)) 46px)`,
    transform: opening ? `translateX(${side === "left" ? "-104%" : "104%"}) skewX(${side === "left" ? 4 : -4}deg)` : "none",
    transformOrigin: side === "left" ? "top left" : "top right",
    transition: "transform 1400ms cubic-bezier(0.7, 0, 0.25, 1)",
    boxShadow: side === "left" ? "inset -24px 0 40px -20px rgba(0,0,0,0.45)" : "inset 24px 0 40px -20px rgba(0,0,0,0.45)",
  });
  return (
    <div className="fixed inset-0 z-10">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1/2" style={silk("left")} />
      <div aria-hidden className="absolute inset-y-0 right-0 w-1/2" style={silk("right")} />
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: opening ? 0 : 1, transition: "opacity 400ms" }}>
        <p className="mb-8 font-display text-xl italic text-[color:var(--op-ink)]">For {addressee}</p>
        <button type="button" onClick={onOpen} disabled={opening} className="group flex flex-col items-center" aria-label="Open your invitation">
          <span aria-hidden className="mb-1 h-16 w-px bg-[color:var(--op-accent)]" />
          <WaxSeal monogram={monogram} />
        </button>
        <p className="mt-8 text-sm tracking-wide text-[color:var(--op-muted)]">Tap to open</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gilded velvet envelope (art-based)
// ---------------------------------------------------------------------------
/**
 * The envelope is two paintings of the same velvet: plain, and with its
 * embossing turned to gold foil. Breaking the seal blooms the gold outwards
 * from the seal, then the envelope opens in warm light.
 */
function GildedEnvelope({
  opening,
  onOpen,
  addressee,
  monogram,
  art,
}: {
  opening: boolean;
  onOpen: () => void;
  addressee: string;
  monogram: string;
  art: { closed: string; revealed: string };
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#2a0d14]">
      <div className="relative h-full max-h-[100dvh] w-full max-w-[calc(100dvh*9/16)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed artwork */}
        <img src={art.closed} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed artwork */}
        <img
          src={art.revealed}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            clipPath: opening ? "circle(150% at 50% 54%)" : "circle(0% at 50% 54%)",
            transition: "clip-path 1600ms cubic-bezier(0.55, 0, 0.3, 1) 150ms",
          }}
        />
        {/* Warm light as it opens */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(60% 45% at 50% 54%, #fff3d6 0%, rgba(255,226,160,0.85) 35%, rgba(255,214,140,0) 75%)",
            opacity: opening ? 1 : 0,
            transform: opening ? "scale(2.4)" : "scale(0.4)",
            transition: "opacity 900ms ease 1700ms, transform 1300ms cubic-bezier(0.3, 0, 0.2, 1) 1700ms",
          }}
        />
        <p
          className="absolute inset-x-0 top-[9%] text-center text-[clamp(26px,7vw,40px)] text-[#e9dcc3]"
          style={{ fontFamily: "var(--font-script)", opacity: opening ? 0 : 1, transition: "opacity 500ms" }}
        >
          For {addressee}
        </p>
        <button
          type="button"
          onClick={onOpen}
          disabled={opening}
          aria-label="Open your invitation"
          className="group absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full p-3"
        >
          <span
            className="grid h-[84px] w-[84px] place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
            style={{
              background: opening
                ? "radial-gradient(circle at 35% 30%, #fff6dc, #e6c574 50%, #a07a2c)"
                : "radial-gradient(circle at 35% 30%, #fbfaf6, #d9d4c9 50%, #9c978d)",
              boxShadow: opening
                ? "0 0 0 2px rgba(255,230,170,0.5), 0 0 40px 12px rgba(255,214,140,0.75), inset 0 -3px 6px rgba(0,0,0,0.2)"
                : "0 8px 18px -6px rgba(0,0,0,0.7), inset 0 -3px 6px rgba(0,0,0,0.18)",
              transition: "background 700ms ease, box-shadow 900ms ease",
            }}
          >
            <span className="font-display text-2xl italic" style={{ color: opening ? "#7a5717" : "#7d786f", transition: "color 700ms" }}>
              {monogram}
            </span>
          </span>
        </button>
        <p className="absolute inset-x-0 bottom-[8%] text-center text-sm tracking-wide text-[#d8c9b0]" style={{ opacity: opening ? 0 : 0.9, transition: "opacity 400ms" }}>
          Tap the seal to open
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Film title card
// ---------------------------------------------------------------------------
function TitleCard({ playing, onBegin, addressee, title }: { playing: boolean; onBegin: () => void; addressee: string; title: string }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#07080c] px-6 text-center text-[#efe9dc]">
      {!playing ? (
        <div className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[#8d8a83]">A film for {addressee}</p>
          <button type="button" onClick={onBegin} className="mt-10 flex h-20 w-20 items-center justify-center rounded-full border border-[color:var(--op-accent)] hover:bg-white/5" aria-label="Play your invitation">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" aria-hidden>
              <path d="M7 4 L20 12 L7 20 Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="relative h-40 w-full max-w-xl" aria-live="polite">
          <p className="op-title op-title-1 absolute inset-0 flex items-center justify-center font-display text-2xl italic">For {addressee}</p>
          <p className="op-title op-title-2 absolute inset-0 flex items-center justify-center font-display text-5xl sm:text-6xl">{title}</p>
          <p className="op-title op-title-3 absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.5em] text-[color:var(--op-accent)]">
            request your company
          </p>
        </div>
      )}
      {/* Letterbox bars */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[9vh] bg-black" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[9vh] bg-black" />
    </div>
  );
}

/**
 * Atmospheric layer behind an opening: the design's still image, and its
 * seamless loop where provided (muted, never for reduced-motion visitors).
 */
export function Backdrop({ image, video, tint = "#11162a", fade = 0.55 }: { image?: string; video?: string; tint?: string; fade?: number }) {
  if (!image && !video) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {video && <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" src={video} poster={image} autoPlay muted loop playsInline />}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${tint} ${Math.round(fade * 100)}%, transparent) 0%, color-mix(in oklab, ${tint} ${Math.round(Math.min(fade + 0.25, 0.95) * 100)}%, transparent) 100%)` }}
      />
    </div>
  );
}
