/**
 * The one renderer every template uses. Given a manifest and a customer's
 * content it draws the invitation — in the gallery, the editor preview, the
 * published event page and (later) export thumbnails.
 */
import type { CSSProperties } from "react";
import {
  defaultContent,
  formatEventDate,
  resolveTheme,
  type InvitationContent,
  type Layer,
  type TemplateDefinition,
} from "@/lib/templates/manifest";
import { Countdown } from "./Countdown";

const fontVar = { cormorant: "var(--font-display)", jost: "var(--font-sans)" } as const;

interface Props {
  template: TemplateDefinition;
  content?: InvitationContent;
  /** "card" = full invitation; "thumb" = gallery preview (no countdown/RSVP). */
  variant?: "card" | "thumb";
  animate?: boolean;
  locale?: string;
  className?: string;
}

export function InvitationRenderer({ template, content, variant = "card", animate = true, locale = "en-GB", className = "" }: Props) {
  const c = content ?? defaultContent(template.manifest);
  const theme = resolveTheme(template.manifest, c);
  const scene = template.manifest.scenes[0];
  const thumb = variant === "thumb";
  const value = (slot?: string) => (slot ? (c.slots[slot] ?? "") : "");

  const style = {
    "--inv-bg": theme.palette.background,
    "--inv-ink": theme.palette.ink,
    "--inv-accent": theme.palette.accent,
    "--inv-muted": theme.palette.muted,
    "--inv-display": fontVar[theme.fonts.display],
    "--inv-body": fontVar[theme.fonts.body],
    background: scene.background.kind === "gradient" || scene.background.kind === "color" ? scene.background.value : theme.palette.background,
    color: "var(--inv-ink)",
    fontFamily: "var(--inv-body)",
    aspectRatio: "5 / 7",
  } as CSSProperties;

  const anim = (layer: { animation?: string; delayMs?: number }) => {
    if (!animate || !layer.animation || layer.animation === "none") return {};
    return {
      className: `reveal-${layer.animation === "ink-in" ? "ink" : layer.animation === "foil-draw" ? "foil" : "settle"}`,
      style: { animationDelay: `${layer.delayMs ?? 0}ms` } as CSSProperties,
    };
  };

  const initials = [value("partnerOne"), value("partnerTwo")].map((n) => n.trim().charAt(0).toUpperCase()).join("");

  const renderLayer = (layer: Layer, i: number) => {
    switch (layer.type) {
      case "text": {
        const text = layer.slot ? (layer.style === "date" ? formatEventDate(value(layer.slot), locale) : value(layer.slot)) : (layer.text ?? "");
        if (!text) return null;
        const a = anim(layer);
        const styles: Record<string, CSSProperties> = {
          names: { fontFamily: "var(--inv-display)", fontSize: "13cqi", lineHeight: 0.95, fontWeight: 400 },
          script: { fontFamily: "var(--inv-display)", fontStyle: "italic", fontSize: "8cqi", color: "var(--inv-accent)", lineHeight: 1 },
          heading: { fontFamily: "var(--inv-display)", fontSize: "7cqi" },
          body: { fontFamily: "var(--inv-display)", fontStyle: "italic", fontSize: "4.4cqi", maxWidth: "70cqi", lineHeight: 1.35, color: "var(--inv-ink)" },
          date: { fontSize: "3.6cqi", letterSpacing: "0.08em", fontWeight: 450 },
          small: { fontSize: "3.1cqi", letterSpacing: "0.06em", color: "var(--inv-muted)" },
        };
        return (
          <p key={i} className={a.className} style={{ ...styles[layer.style], ...a.style }}>
            {text}
          </p>
        );
      }
      case "ornament": {
        const a = anim(layer);
        if (layer.name === "foil-rule")
          return <div key={i} aria-hidden className={a.className} style={{ ...a.style, width: "34cqi", height: 1, background: "linear-gradient(90deg, transparent, var(--inv-accent), transparent)", margin: "1.5cqi 0" }} />;
        if (layer.name === "monogram")
          return (
            <svg key={i} aria-hidden viewBox="0 0 60 60" className={a.className} style={{ ...a.style, width: "13cqi", color: "var(--inv-accent)" }}>
              <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="30" cy="30" r="23.5" fill="none" stroke="currentColor" strokeWidth="0.4" />
              <text x="30" y="36" textAnchor="middle" fontFamily="var(--inv-display)" fontSize="17" fill="currentColor">
                {initials || "&"}
              </text>
            </svg>
          );
        if (layer.name === "laurel")
          return (
            <svg key={i} aria-hidden viewBox="0 0 120 40" className={a.className} style={{ ...a.style, width: "26cqi", color: "var(--inv-accent)" }}>
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
        return null;
      }
      case "image": {
        const radius = layer.shape === "arch" ? "999px 999px 4px 4px" : layer.shape === "circle" ? "999px" : "4px";
        return (
          <div
            key={i}
            role="img"
            aria-label={value("photo") ? "Couple photograph" : "Photo placeholder"}
            style={{
              width: "40cqi",
              aspectRatio: "3 / 4",
              borderRadius: radius,
              border: "1px solid var(--inv-accent)",
              padding: "1.4cqi",
              marginBottom: "2cqi",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: radius,
                background: "linear-gradient(160deg, color-mix(in oklab, var(--inv-accent) 35%, white), color-mix(in oklab, var(--inv-accent) 70%, var(--inv-bg)))",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--inv-display)",
                fontSize: "9cqi",
                color: "var(--inv-bg)",
              }}
            >
              {initials}
            </div>
          </div>
        );
      }
      case "countdown":
        return thumb ? null : <Countdown key={i} isoDate={value(layer.slot)} />;
      case "rsvp":
        return thumb ? null : (
          <span
            key={i}
            style={{
              marginTop: "3cqi",
              border: "1px solid var(--inv-accent)",
              borderRadius: 999,
              padding: "1.6cqi 5cqi",
              fontSize: "3cqi",
              letterSpacing: "0.1em",
            }}
          >
            RSVP
          </span>
        );
      default:
        return null;
    }
  };

  // The outer box is the size container, so every cqi unit inside scales
  // with the card: the same invitation works as a thumbnail or full screen.
  return (
    <div className={className} style={{ containerType: "inline-size" }}>
      <div
        className="relative flex flex-col items-center justify-center gap-[1.6cqi] overflow-hidden text-center"
        style={{ ...style, padding: "9cqi 8cqi" }}
      >
        {/* Inner foil border — a stationery detail, not a card shadow */}
        <div aria-hidden className="pointer-events-none absolute" style={{ inset: "3.5cqi", border: "1px solid color-mix(in oklab, var(--inv-accent) 55%, transparent)" }} />
        {scene.layers.map(renderLayer)}
      </div>
    </div>
  );
}
