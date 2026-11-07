/**
 * Hand-drawn ornaments shared by every design. Drawn in currentColor so each
 * takes the template's accent; sized in cqi so they scale with the card.
 */
import type { CSSProperties } from "react";

const base: CSSProperties = { color: "var(--inv-accent)", display: "block" };

export function Ornament({ name, monogram }: { name: string; monogram: string }) {
  switch (name) {
    case "foil-rule":
      return <div aria-hidden className="inv-foil" style={{ width: "34cqi", height: 1, background: "linear-gradient(90deg, transparent, var(--inv-accent), transparent)", margin: "1.5cqi 0" }} />;
    case "monogram":
      return (
        <svg aria-hidden viewBox="0 0 60 60" style={{ ...base, width: "13cqi" }}>
          <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="30" cy="30" r="23.5" fill="none" stroke="currentColor" strokeWidth="0.4" />
          <text x="30" y="36" textAnchor="middle" fontFamily="var(--inv-display)" fontSize={monogram.length > 2 ? 15 : 19} fill="currentColor">
            {monogram || "✦"}
          </text>
        </svg>
      );
    case "laurel":
      return (
        <svg aria-hidden viewBox="0 0 120 40" style={{ ...base, width: "26cqi" }}>
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
    case "stars":
      // A loose constellation; each star twinkles on its own beat.
      return (
        <svg aria-hidden viewBox="0 0 200 60" style={{ ...base, width: "62cqi" }}>
          {[
            [18, 30, 1.6, 0], [46, 12, 1.1, 1.2], [70, 40, 2.2, 0.4], [100, 18, 1.4, 2], [128, 44, 1.2, 0.8],
            [150, 14, 2, 1.6], [176, 34, 1.3, 0.2], [88, 52, 0.9, 2.4], [136, 26, 0.8, 1],
          ].map(([x, y, r, d], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="currentColor" className="inv-twinkle" style={{ animationDelay: `${d}s` }} />
          ))}
          <path d="M70 40 L100 18 L150 14 M100 18 L136 26 L128 44" fill="none" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.5" />
        </svg>
      );
    case "sprig":
      return (
        <svg aria-hidden viewBox="0 0 80 40" style={{ ...base, width: "18cqi" }} fill="none" stroke="currentColor" strokeWidth="0.9">
          <path d="M8 34 C26 28 46 18 72 6" />
          {[0, 1, 2, 3].map((k) => (
            <g key={k}>
              <ellipse cx={22 + k * 13} cy={28 - k * 6} rx="4.5" ry="1.8" transform={`rotate(-50 ${22 + k * 13} ${28 - k * 6})`} />
              <ellipse cx={26 + k * 13} cy={33 - k * 6} rx="4.5" ry="1.8" transform={`rotate(10 ${26 + k * 13} ${33 - k * 6})`} />
            </g>
          ))}
        </svg>
      );
    case "deco-fan":
      return (
        <svg aria-hidden viewBox="0 0 120 50" style={{ ...base, width: "30cqi" }} fill="none" stroke="currentColor" strokeWidth="0.8">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
            const a = Math.PI * (k / 8);
            return <line key={k} x1="60" y1="48" x2={60 - Math.cos(a) * 44} y2={48 - Math.sin(a) * 44} />;
          })}
          <path d="M16 48 A44 44 0 0 1 104 48" />
          <path d="M34 48 A26 26 0 0 1 86 48" />
        </svg>
      );
    case "wave":
      return (
        <svg aria-hidden viewBox="0 0 160 20" style={{ ...base, width: "40cqi" }} fill="none" stroke="currentColor" strokeWidth="0.9">
          <path d="M0 10 Q10 2 20 10 T40 10 T60 10 T80 10 T100 10 T120 10 T140 10 T160 10" />
          <path d="M0 15 Q10 7 20 15 T40 15 T60 15 T80 15 T100 15 T120 15 T140 15 T160 15" strokeOpacity="0.5" />
        </svg>
      );
    case "arch":
      return (
        <svg aria-hidden viewBox="0 0 100 120" style={{ ...base, width: "24cqi" }} fill="none" stroke="currentColor" strokeWidth="0.8">
          <path d="M10 118 V50 A40 40 0 0 1 90 50 V118" />
          <path d="M18 118 V52 A32 32 0 0 1 82 52 V118" strokeOpacity="0.5" />
        </svg>
      );
    default:
      return null;
  }
}
