/**
 * The one renderer every template uses — gallery thumbnails, the editor
 * preview, the published invitation and (later) exports.
 *
 * Scenes are sequenced with CSS only (delays computed by buildTimeline), so
 * the invitation renders on the server, plays without JavaScript and stops
 * cleanly for visitors who prefer reduced motion. The only client code is the
 * small parallax wrapper and the live countdown.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  defaultContent,
  formatEventDate,
  resolveMotion,
  resolveTheme,
  type InvitationContent,
  type Layer,
  type Scene,
  type TemplateDefinition,
} from "@/lib/templates/manifest";
import { buildTimeline, revealFor, TRANSITION_MS, type MotionLevel, type RevealKey } from "@/lib/cinema/motion";
import { getAsset } from "@/lib/cinema/assets";
import { monogramOf, resolveNames, type NamesShape } from "@/lib/cinema/names";
import { Countdown } from "./Countdown";
import { Ornament } from "./Ornament";
import { ParallaxRoot } from "./ParallaxRoot";

const fontVar = { cormorant: "var(--font-display)", jost: "var(--font-sans)", pinyon: "var(--font-script)" } as const;
const LETTER_STEP_MS = 55;

interface Props {
  template: TemplateDefinition;
  content?: InvitationContent;
  /** "card" = full invitation; "thumb" = gallery preview (still, no countdown/RSVP). */
  variant?: "card" | "thumb";
  /** false = show the finished card without movement. */
  animate?: boolean;
  /** Override the motion level (the editor's preview switch). */
  motion?: MotionLevel;
  locale?: string;
  className?: string;
  /** Resolved image URLs for image slots (customer uploads, or template samples). */
  media?: Record<string, string>;
  /** Occasion settings that change what's shown (e.g. a birthday with the age hidden). */
  hideAge?: boolean;
}

const textStyles: Record<string, CSSProperties> = {
  names: { fontFamily: "var(--inv-display)", fontSize: "13cqi", lineHeight: 0.95, fontWeight: 400 },
  // Flourishes use the design's script face if it has one, else display italic.
  script: { fontFamily: "var(--inv-script)", fontStyle: "var(--inv-script-style)" as CSSProperties["fontStyle"], fontSize: "8cqi", color: "var(--inv-accent)", lineHeight: 1.1 },
  heading: { fontFamily: "var(--inv-script)", fontStyle: "var(--inv-script-style)" as CSSProperties["fontStyle"], fontSize: "9cqi", lineHeight: 1.2, color: "var(--inv-accent)" },
  body: { fontFamily: "var(--inv-display)", fontStyle: "italic", fontSize: "4.4cqi", maxWidth: "70cqi", lineHeight: 1.35 },
  date: { fontSize: "3.6cqi", letterSpacing: "0.08em", fontWeight: 450 },
  small: { fontSize: "3.1cqi", letterSpacing: "0.06em", color: "var(--inv-muted)", maxWidth: "72cqi", lineHeight: 1.45 },
};

export function InvitationRenderer({
  template,
  content,
  variant = "card",
  animate = true,
  motion,
  locale = "en-GB",
  className = "",
  media,
  hideAge = false,
}: Props) {
  const images = media ?? (content ? {} : (template.sampleMedia ?? {}));
  const c = content ?? defaultContent(template.manifest);
  const theme = resolveTheme(template.manifest, c);
  const thumb = variant === "thumb";
  const level: MotionLevel = thumb || !animate ? "still" : (motion ?? resolveMotion(template.manifest, c).level);
  const scenes = template.manifest.scenes;
  const timeline = buildTimeline(scenes, level);
  const names = resolveNames(c.slots, { hideAge });
  const value = (slot?: string) => (slot ? (c.slots[slot] ?? "") : "");

  // A background shared by consecutive scenes (e.g. one garden loop under
  // the whole film) is drawn once beneath them; scenes add only their veil.
  const finalBg = scenes[scenes.length - 1].background;
  const sharedBg = isMedia(finalBg) ? finalBg : null;
  const sameAsShared = (b: Scene["background"]) => !!sharedBg && b.kind === sharedBg.kind && b.value === sharedBg.value;

  const rootStyle = {
    "--inv-bg": theme.palette.background,
    "--inv-ink": theme.palette.ink,
    "--inv-accent": theme.palette.accent,
    "--inv-muted": theme.palette.muted,
    "--inv-display": fontVar[theme.fonts.display],
    "--inv-body": fontVar[theme.fonts.body],
    "--inv-script": theme.fonts.script ? fontVar[theme.fonts.script] : "var(--inv-display)",
    "--inv-script-style": theme.fonts.script ? "normal" : "italic",
    background: theme.palette.background,
    color: "var(--inv-ink)",
    fontFamily: "var(--inv-body)",
    aspectRatio: "5 / 7",
  } as CSSProperties;

  const renderLayer = (layer: Layer, delay: number, key: number): ReactNode => {
    const reveal = "animation" in layer ? revealFor(layer.animation as RevealKey, level) : "none";
    const depth = "depth" in layer && level === "cinematic" ? layer.depth : undefined;
    const node = renderLayerBody(layer, reveal, delay);
    if (!node) return null;
    return depth ? (
      <div key={key} className="inv-plx" style={{ "--depth": depth } as CSSProperties}>
        {node}
      </div>
    ) : (
      <div key={key} className="contents">
        {node}
      </div>
    );
  };

  const renderLayerBody = (layer: Layer, reveal: RevealKey, delay: number): ReactNode => {
    switch (layer.type) {
      case "text": {
        const text = layer.slot ? (layer.style === "date" ? formatEventDate(value(layer.slot), locale) : value(layer.slot)) : (layer.text ?? "");
        if (!text) return null;
        return <Reveal as="p" text={text} reveal={reveal} delay={delay} style={textStyles[layer.style]} />;
      }
      case "names":
        return <Names names={names} layout={layer.layout} reveal={reveal} delay={delay} />;
      case "ornament":
        return (
          <div className={revealClass(reveal)} style={revealStyle(reveal, delay)}>
            <Ornament name={layer.name} monogram={monogramOf(names)} />
          </div>
        );
      case "image": {
        const radius = layer.shape === "arch" ? "999px 999px 4px 4px" : layer.shape === "circle" ? "999px" : "4px";
        const src = images[layer.slot];
        return (
          <div
            role="img"
            aria-label={src ? "Photograph" : "Space for a photograph"}
            className={revealClass(reveal)}
            style={{ ...revealStyle(reveal, delay), width: "40cqi", aspectRatio: "3 / 4", borderRadius: radius, border: "1px solid var(--inv-accent)", padding: "1.4cqi", marginBottom: "2cqi" }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element -- template art also renders in exports and emails
              <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius, display: "block" }} />
            ) : (
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
                {monogramOf(names)}
              </div>
            )}
          </div>
        );
      }
      case "countdown":
        return thumb ? null : <Countdown isoDate={value(layer.slot)} />;
      case "rsvp":
        return thumb ? null : (
          <span style={{ marginTop: "3cqi", border: "1px solid var(--inv-accent)", borderRadius: 999, padding: "1.6cqi 5cqi", fontSize: "3cqi", letterSpacing: "0.1em" }}>
            RSVP
          </span>
        );
      default:
        return null;
    }
  };

  const card = (
    <div className="inv-card relative overflow-hidden text-center" style={rootStyle} data-motion={level}>
      {sharedBg && <SceneBackground background={sharedBg} level={level} shared />}
      {timeline.scenes.map((t) => {
        const scene = scenes[t.index];
        const isFinal = t.endMs === null;
        const animation =
          level === "still"
            ? undefined
            : [
                `inv-scene-${t.transition} ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${t.startMs}ms both`,
                t.endMs !== null ? `inv-scene-out ${TRANSITION_MS}ms ease ${t.endMs}ms forwards` : null,
              ]
                .filter(Boolean)
                .join(", ");
        return (
          <section
            key={scene.id}
            aria-hidden={!isFinal}
            className={`inv-scene absolute inset-0 flex justify-center ${scene.align === "start" ? "items-start" : scene.align === "end" ? "items-end" : "items-center"} ${isFinal ? "" : "inv-prelude"} ${isMedia(scene.background) ? "inv-on-photo" : ""}`}
            style={{ animation, zIndex: t.index + 1, padding: scene.align === "start" ? "11cqi 8cqi 9cqi" : "9cqi 8cqi" }}
          >
            {sameAsShared(scene.background) ? (
              <Veil amount={scene.background.overlay} from={scene.background.veil} />
            ) : (
              <SceneBackground background={scene.background} level={level} />
            )}
            {isFinal && (
              <div aria-hidden className="pointer-events-none absolute" style={{ inset: "3.5cqi", border: "1px solid color-mix(in oklab, var(--inv-accent) 55%, transparent)" }} />
            )}
            {/* Content sits above the background and veil, animated or not. */}
            <div className="relative z-[1] flex w-full flex-col items-center gap-[1.6cqi]">{scene.layers.map((l, i) => renderLayer(l, t.layerDelays[i], i))}</div>
          </section>
        );
      })}
    </div>
  );

  // The outer box is the size container, so every cqi unit inside scales
  // with the card: the same invitation works as a thumbnail or full screen.
  return (
    <div className={className} style={{ containerType: "inline-size" }}>
      {level === "cinematic" ? <ParallaxRoot>{card}</ParallaxRoot> : card}
    </div>
  );
}

// ---------------------------------------------------------------------------

function isMedia(b: Scene["background"]) {
  return b.kind === "asset" || b.kind === "image" || b.kind === "video";
}

function revealClass(r: RevealKey) {
  return r === "none" ? undefined : `reveal-${r}`;
}
function revealStyle(r: RevealKey, delay: number): CSSProperties | undefined {
  return r === "none" ? undefined : { animationDelay: `${delay}ms` };
}

/** Text with a reveal; "letters" writes it in one character at a time. */
function Reveal({ as: Tag, text, reveal, delay, style }: { as: "p" | "span"; text: string; reveal: RevealKey; delay: number; style?: CSSProperties }) {
  if (reveal !== "letters") {
    return (
      <Tag className={revealClass(reveal)} style={{ ...style, ...revealStyle(reveal, delay) }}>
        {text}
      </Tag>
    );
  }
  // Screen readers get the whole phrase once; the letters are decoration.
  return (
    <Tag aria-label={text} style={style}>
      {Array.from(text).map((ch, i) => (
        <span key={i} aria-hidden className="reveal-letter" style={{ animationDelay: `${delay + i * LETTER_STEP_MS}ms` }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </Tag>
  );
}

function Names({ names, layout, reveal, delay }: { names: NamesShape | null; layout: "stacked" | "inline" | "caps"; reveal: RevealKey; delay: number }) {
  if (!names) return null;
  const big = textStyles.names;
  const amp = textStyles.script;
  const letters = reveal === "letters";
  if (names.mode === "couple") {
    if (layout === "inline") {
      return <Reveal as="p" text={[names.first, names.second].filter(Boolean).join(" & ")} reveal={reveal} delay={delay} style={{ ...big, fontSize: "10cqi" }} />;
    }
    const ampDelay = letters ? delay + names.first.length * LETTER_STEP_MS : delay + 700;
    const secondDelay = letters ? ampDelay + 300 : delay + 900;
    if (layout === "caps") {
      // Engraved capitals with a small "and" between: classic stationery.
      const caps: CSSProperties = { ...big, fontSize: "10.5cqi", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 };
      return (
        <div className="flex flex-col items-center gap-[1cqi]">
          <Reveal as="p" text={names.first} reveal={reveal} delay={delay} style={caps} />
          <Reveal as="p" text="and" reveal={letters ? "blur" : reveal} delay={ampDelay} style={{ ...textStyles.small, fontSize: "3.6cqi", letterSpacing: "0.1em", color: "var(--inv-ink)" }} />
          <Reveal as="p" text={names.second} reveal={reveal} delay={secondDelay} style={caps} />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-[1.2cqi]">
        <Reveal as="p" text={names.first} reveal={reveal} delay={delay} style={big} />
        <Reveal as="p" text="&" reveal={letters ? "blur" : reveal} delay={ampDelay} style={amp} />
        <Reveal as="p" text={names.second} reveal={reveal} delay={secondDelay} style={big} />
      </div>
    );
  }
  if (names.mode === "organisation") {
    return (
      <div className="flex flex-col items-center gap-[1.6cqi]">
        <Reveal as="p" text={names.organisation} reveal={reveal} delay={delay} style={{ ...textStyles.small, letterSpacing: "0.22em", textTransform: "uppercase" }} />
        <Reveal as="p" text={names.title} reveal={reveal} delay={delay + 500} style={{ ...big, fontSize: "11cqi" }} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-[1.6cqi]">
      <Reveal as="p" text={names.name} reveal={reveal} delay={delay} style={big} />
      {names.caption && <Reveal as="p" text={names.caption} reveal={letters ? "blur" : reveal} delay={delay + 900} style={amp} />}
    </div>
  );
}

/** A wash of the paper colour over a picture, even or fading from one end, so lettering stays legible. */
function Veil({ amount, from = "even" }: { amount: number; from?: "even" | "top" | "bottom" }) {
  if (!amount) return null;
  const background =
    from === "even"
      ? "var(--inv-bg)"
      : `linear-gradient(${from === "top" ? "180deg" : "0deg"}, var(--inv-bg) 0%, color-mix(in oklab, var(--inv-bg) 92%, transparent) 40%, color-mix(in oklab, var(--inv-bg) 60%, transparent) 56%, transparent 74%)`;
  return <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background, opacity: amount }} />;
}

/** Colour, gradient, image or a shared cinematic asset (with its loop). */
function SceneBackground({ background: b, level, shared = false }: { background: Scene["background"]; level: MotionLevel; shared?: boolean }) {
  if (b.kind === "color" || b.kind === "gradient") {
    return <div aria-hidden className="absolute inset-0" style={{ background: b.value }} />;
  }
  const asset = b.kind === "asset" ? getAsset(b.value) : undefined;
  const still = asset?.poster ?? b.poster ?? (b.kind === "image" ? b.value : undefined);
  const video = level !== "still" ? (asset?.kind === "video" ? asset.src : b.kind === "video" ? b.value : undefined) : undefined;
  const drift = b.parallax && level === "cinematic";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={drift ? "inv-plx-bg absolute -inset-[6%]" : "absolute inset-0"}>
        {still && (
          // eslint-disable-next-line @next/next/no-img-element -- decorative backdrop, also used in exports
          <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {video && <video className="inv-video absolute inset-0 h-full w-full object-cover" src={video} poster={still} autoPlay muted loop playsInline preload="metadata" />}
      </div>
      {/* A shared background carries no veil of its own: each scene adds its own. */}
      {!shared && <Veil amount={b.overlay} from={b.veil} />}
    </div>
  );
}
