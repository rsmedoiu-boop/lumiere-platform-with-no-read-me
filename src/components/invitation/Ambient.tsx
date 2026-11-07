/**
 * Looping atmosphere for the invitation card: drifting petals, rising golden
 * dust, twinkling stars. Pure CSS, so it renders on the server, never needs a
 * video seam to hide, and stops for visitors who ask for less motion.
 * Every particle's place and timing comes from its index, so server and
 * browser always draw the same thing.
 */
import { useId, type CSSProperties } from "react";
import type { AmbientKey } from "@/lib/templates/manifest";
import type { MotionLevel } from "@/lib/cinema/motion";

const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const between = (i: number, salt: number, lo: number, hi: number) => lo + rnd(i, salt) * (hi - lo);

const COUNTS: Record<AmbientKey, number> = { petals: 16, sparkle: 26, stars: 44 };

export function Ambient({ kind, level }: { kind: AmbientKey; level: MotionLevel }) {
  if (level === "still") return null;
  const n = Math.round(COUNTS[kind] * (level === "gentle" ? 0.55 : 1));
  const items = Array.from({ length: n }, (_, i) => i);
  return (
    <div aria-hidden className={`inv-ambient inv-ambient-${kind} pointer-events-none absolute inset-0 overflow-hidden`}>
      {kind === "stars" ? (
        <>
          {items.map((i) => (
            <i
              key={i}
              className="amb-star"
              style={
                {
                  left: `${between(i, 1, 2, 98)}%`,
                  top: `${between(i, 2, 2, 90)}%`,
                  "--s": `${between(i, 3, 0.5, 1.5)}cqi`,
                  "--d": `${between(i, 4, 2.6, 6)}s`,
                  "--o": `${-between(i, 5, 0, 6)}s`,
                } as CSSProperties
              }
            />
          ))}
          {[0, 1].map((m) => (
            <i key={`m${m}`} className="amb-meteor" style={{ left: `${between(m, 9, 55, 90)}%`, top: `${between(m, 8, 4, 24)}%`, "--o": `${m * 6.5 + 3}s` } as CSSProperties} />
          ))}
        </>
      ) : (
        items.map((i) => (
          <span
            key={i}
            className="amb-strip"
            style={
              {
                left: `${between(i, 1, -2, 98)}%`,
                "--fall": `${between(i, 2, kind === "petals" ? 9 : 12, kind === "petals" ? 17 : 22)}s`,
                "--o": `${-between(i, 3, 0, 20)}s`,
                "--sway": `${between(i, 4, 3, 6)}s`,
                "--drift": `${between(i, 5, 3, 9) * (rnd(i, 6) > 0.5 ? 1 : -1)}cqi`,
                "--s": `${kind === "petals" ? between(i, 7, 2.2, 4.2) : between(i, 7, 0.5, 1.3)}cqi`,
                "--r": `${between(i, 8, 0, 360)}deg`,
              } as CSSProperties
            }
          >
            <i className="amb-p" />
          </span>
        ))
      )}
    </div>
  );
}

/** A moon circles a star, slowing and closing in, until they rest side by side. */
export function Celestial({ orbit, size, delay, level }: { orbit: boolean; size: "large" | "small"; delay: number; level: MotionLevel }) {
  const uid = useId().replace(/:/g, "");
  const small = size === "small";
  const w = small ? 40 : 74;
  const h = small ? 20 : 52;
  // Resting places, as a share of the box: the star left of centre, the moon beside it.
  const starX = small ? 36 : 40;
  const rest = small ? 11 : 17; // cqi from the star
  const start = small ? 0 : 34;
  return (
    <div
      role="img"
      aria-label="A moon and a star, together"
      className={`cel ${orbit ? "cel-orbit" : "cel-rest"} ${small ? "cel-small" : ""}`}
      data-motion={level}
      style={{ width: `${w}cqi`, height: `${h}cqi`, "--cel-delay": `${delay}ms`, "--rest": `${rest}cqi`, "--start": `${start}cqi`, "--star-x": `${starX}%` } as CSSProperties}
    >
      <svg className="cel-rings" viewBox="0 0 100 60" aria-hidden preserveAspectRatio="none">
        <ellipse cx={starX} cy="30" rx="44" ry="26" fill="none" stroke="var(--inv-accent)" strokeWidth="0.25" strokeDasharray="1.2 1.6" />
        <ellipse cx={starX} cy="30" rx="30" ry="18" fill="none" stroke="var(--inv-accent)" strokeWidth="0.2" strokeDasharray="1 2" />
      </svg>
      <span className="cel-star" aria-hidden>
        <svg viewBox="0 0 100 100">
          <path d="M50 0C54 36 64 46 100 50C64 54 54 64 50 100C46 64 36 54 0 50C36 46 46 36 50 0Z" fill="var(--inv-accent)" />
          <path d="M50 18C52 40 60 48 82 50C60 52 52 60 50 82C48 60 40 52 18 50C40 48 48 40 50 18Z" fill="#fff6d8" opacity="0.85" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="5" fill="#fffbe9" />
        </svg>
      </span>
      <span className="cel-arm" aria-hidden>
        <span className="cel-reach">
          <span className="cel-moon-turn">
            <svg viewBox="0 0 100 100" className="cel-moon">
              <defs>
                <mask id={`cres-${uid}`}>
                  <rect width="100" height="100" fill="white" />
                  <circle cx="64" cy="42" r="34" fill="black" />
                </mask>
                <radialGradient id={`moon-${uid}`} cx="35%" cy="35%" r="75%">
                  <stop offset="0" stopColor="#fffaf0" />
                  <stop offset="1" stopColor="#e8d9b0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="52" r="38" fill={`url(#moon-${uid})`} mask={`url(#cres-${uid})`} />
            </svg>
          </span>
        </span>
      </span>
    </div>
  );
}
