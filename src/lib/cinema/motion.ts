/**
 * Motion: how an invitation moves. One timeline function turns a design's
 * scenes and layers into exact timings for the chosen motion level, so the
 * renderer, the editor preview and future video export all agree.
 *
 * - cinematic: preludes, letter-by-letter reveals, parallax, video loops
 * - gentle:    same story, softer — simple fades, no parallax
 * - still:     the finished card only, no movement (also used for
 *              visitors who ask their device for reduced motion)
 */

export const motionLevels = ["cinematic", "gentle", "still"] as const;
export type MotionLevel = (typeof motionLevels)[number];

export const motionLevelInfo: Record<MotionLevel, { name: string; help: string }> = {
  cinematic: { name: "Cinematic", help: "The full film: opening scenes, lettering that writes itself in, gentle depth." },
  gentle: { name: "Gentle", help: "The same story with softer, simpler fades." },
  still: { name: "Still", help: "No movement at all. Calm and instant." },
};

export const revealKeys = ["none", "settle", "ink-in", "foil-draw", "letters", "blur", "rise", "wipe"] as const;
export type RevealKey = (typeof revealKeys)[number];

export const transitionKeys = ["fade", "rise", "dissolve", "iris", "none"] as const;
export type TransitionKey = (typeof transitionKeys)[number];

export const openingKeys = ["envelope", "curtain", "title-card", "none"] as const;
export type OpeningKey = (typeof openingKeys)[number];

export const openingInfo: Record<OpeningKey, { name: string; help: string }> = {
  envelope: { name: "Sealed envelope", help: "Addressed to each guest. They break the wax seal to open it." },
  curtain: { name: "Silk curtain", help: "Two silk panels part to reveal the invitation." },
  "title-card": { name: "Film title card", help: "Opens like a film: the guest's name, then yours, then the invitation." },
  none: { name: "No opening", help: "Guests go straight to the invitation." },
};

/** What each reveal becomes at each level. */
export function revealFor(reveal: RevealKey | undefined, level: MotionLevel): RevealKey {
  if (!reveal || level === "still") return "none";
  if (level === "gentle") return reveal === "none" ? "none" : reveal === "foil-draw" ? "foil-draw" : "settle";
  return reveal;
}

export function transitionFor(t: TransitionKey | undefined, level: MotionLevel): TransitionKey {
  if (level === "still") return "none";
  if (level === "gentle") return t === "none" ? "none" : "fade";
  return t ?? "fade";
}

interface TimelineScene {
  id: string;
  durationMs?: number;
  transition?: TransitionKey;
  layers: object[];
}

export interface SceneTiming {
  index: number;
  id: string;
  /** When this scene starts to appear. */
  startMs: number;
  /** When it starts to leave; null for the final scene, which stays. */
  endMs: number | null;
  transition: TransitionKey;
  /** Layer reveal delays, absolute from the start of playback. */
  layerDelays: number[];
}

export interface Timeline {
  scenes: SceneTiming[];
  /** Time until the final card has fully settled. */
  totalMs: number;
}

export const TRANSITION_MS = 900;
const GENTLE_PACE = 0.7;
const DEFAULT_PRELUDE_MS = 3200;
/** Approximate length of the longest reveal, used for totalMs. */
const LONGEST_REVEAL_MS = 1600;

/**
 * Preludes play one after another, each crossfading into the next; the last
 * scene is the finished invitation and stays. Still shows only that card.
 */
export function buildTimeline(scenes: TimelineScene[], level: MotionLevel): Timeline {
  if (scenes.length === 0) return { scenes: [], totalMs: 0 };
  const pace = level === "gentle" ? GENTLE_PACE : 1;
  const last = scenes.length - 1;

  if (level === "still") {
    return {
      scenes: [{ index: last, id: scenes[last].id, startMs: 0, endMs: null, transition: "none", layerDelays: scenes[last].layers.map(() => 0) }],
      totalMs: 0,
    };
  }

  const out: SceneTiming[] = [];
  let t = 0;
  scenes.forEach((s, index) => {
    const isLast = index === last;
    const duration = Math.round((s.durationMs ?? DEFAULT_PRELUDE_MS) * pace);
    const layerDelays = s.layers.map((l) => t + Math.round((("delayMs" in l ? Number(l.delayMs) : 0) || 0) * pace));
    out.push({
      index,
      id: s.id,
      startMs: t,
      endMs: isLast ? null : t + duration,
      transition: transitionFor(s.transition, level),
      layerDelays,
    });
    // The next scene begins as this one starts to leave (a crossfade).
    if (!isLast) t += duration;
  });
  const final = out[out.length - 1];
  const lastReveal = Math.max(final.startMs, ...final.layerDelays);
  return { scenes: out, totalMs: lastReveal + Math.round(LONGEST_REVEAL_MS * pace) };
}
