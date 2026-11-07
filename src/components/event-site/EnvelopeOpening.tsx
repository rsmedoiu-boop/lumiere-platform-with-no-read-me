"use client";

/**
 * The opening moment: a sealed envelope addressed to the household. Tapping
 * the seal opens the flap, the invitation rises out, and the guest chooses
 * when to continue to the wedding website. Reduced-motion users get the same
 * steps without movement.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

type Stage = "sealed" | "opening" | "card" | "done";

export function EnvelopeOpening({
  addressee,
  monogram,
  card,
  children,
  backdrop,
  backdropVideo,
}: {
  backdrop?: string;
  backdropVideo?: string;
  addressee: string;
  monogram: string;
  card: ReactNode;
  children: ReactNode;
}) {
  const [stage, setStage] = useState<Stage>("sealed");
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (stage !== "opening") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setStage("card"), reduce ? 0 : 1100);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage === "card") {
      const t = setTimeout(() => continueRef.current?.focus({ preventScroll: true }), 2600);
      return () => clearTimeout(t);
    }
    if (stage === "done") window.scrollTo({ top: 0 });
  }, [stage]);

  // Keep the page behind from scrolling while the envelope is showing.
  useEffect(() => {
    document.documentElement.style.overflow = stage === "done" ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [stage]);

  return (
    <>
      {stage !== "done" && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto px-5 py-10"
          style={{ background: "radial-gradient(120% 80% at 50% 10%, #2b3352 0%, #1a2036 55%, #11162a 100%)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Your invitation"
        >
          <Backdrop image={backdrop} video={backdropVideo} />
          {stage === "sealed" || stage === "opening" ? (
            <div className="relative flex flex-col items-center">
              <p className="mb-8 font-display text-xl italic text-[#d9c9a3]">For {addressee}</p>
              <button
                type="button"
                onClick={() => setStage("opening")}
                disabled={stage === "opening"}
                className="group relative [perspective:1200px]"
                aria-label="Open your invitation"
              >
                <Envelope opening={stage === "opening"} monogram={monogram} />
              </button>
              <p className="mt-10 text-sm tracking-wide text-[#9aa0b6]" aria-hidden={stage === "opening"}>
                {stage === "sealed" ? "Tap the seal to open" : " "}
              </p>
            </div>
          ) : (
            <div className="relative flex w-full max-w-[400px] flex-col items-center">
              <div className="w-full reveal-rise shadow-[0_50px_90px_-40px_rgba(0,0,0,0.8)]">{card}</div>
              <button
                ref={continueRef}
                type="button"
                onClick={() => setStage("done")}
                className="reveal-settle mt-8 rounded-full border border-[#c9ad6e] px-7 py-3 text-sm tracking-wide text-[#f1eadb] hover:bg-[#c9ad6e] hover:text-[#1c2238]"
                style={{ animationDelay: "2200ms" }}
              >
                View the wedding details
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setStage("done")}
            className="absolute right-4 top-4 z-10 text-xs text-[#9aa0b6] underline-offset-4 hover:underline"
          >
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

function Envelope({ opening, monogram }: { opening: boolean; monogram: string }) {
  const paper = "#232a45";
  return (
    <div className="relative h-[230px] w-[min(340px,86vw)]" style={{ transformStyle: "preserve-3d" }}>
      {/* Body */}
      <div className="absolute inset-0 rounded-[3px]" style={{ background: paper, boxShadow: "0 40px 80px -30px rgba(0,0,0,0.75)" }} />
      {/* Inner lining glimpse */}
      <div
        className="absolute inset-x-[10px] top-[8px] h-[60%]"
        style={{ background: "repeating-linear-gradient(135deg, #2c3456 0 6px, #262d4a 6px 12px)", opacity: opening ? 1 : 0, transition: "opacity 300ms 200ms" }}
      />
      {/* Side and bottom folds */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 340 230" preserveAspectRatio="none" aria-hidden>
        <path d="M0 0 L170 135 L340 0 L340 230 L0 230 Z" fill="#283053" />
        <path d="M0 230 L170 120 L340 230 Z" fill="#2d3559" />
        <path d="M0 230 L170 120 L340 230" fill="none" stroke="#c9ad6e" strokeOpacity="0.35" strokeWidth="0.8" />
      </svg>
      {/* Flap */}
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
          <path d="M0 0 L340 0 L170 143 Z" fill="#313a60" />
          <path d="M0 0 L170 143 L340 0" fill="none" stroke="#c9ad6e" strokeOpacity="0.45" strokeWidth="0.8" />
        </svg>
      </div>
      {/* Wax seal */}
      <div
        className="absolute left-1/2 top-[56%] z-10 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
        style={{
          background: "radial-gradient(circle at 35% 30%, #e2cd98, #b8964f 55%, #8a6d33)",
          boxShadow: "0 6px 14px -4px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.25)",
          opacity: opening ? 0 : 1,
          transition: "opacity 250ms",
        }}
      >
        <span className="font-display text-xl italic text-[#3a2c12]">{monogram}</span>
      </div>
    </div>
  );
}

/**
 * Atmospheric layer behind the envelope: the template's still image, and its
 * seamless loop where provided (muted, never for reduced-motion visitors).
 */
export function Backdrop({ image, video, fade = 0.55 }: { image?: string; video?: string; fade?: number }) {
  if (!image && !video) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {video && (
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          src={video}
          poster={image}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(17,22,42,${fade}) 0%, rgba(17,22,42,${Math.min(fade + 0.25, 0.95)}) 100%)` }} />
    </div>
  );
}
