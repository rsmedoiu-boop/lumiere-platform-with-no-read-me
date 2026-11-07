import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateLibrary, getTemplate } from "@/lib/templates/library";
import { manifestSchema, resolveMotion, type ManifestInput } from "@/lib/templates/manifest";
import { buildTimeline, openingsFor, revealFor, transitionFor, TRANSITION_MS } from "../motion";
import { cinematicAssets, getAsset } from "../assets";
import { monogramOf, namesLabel, resolveNames } from "../names";

const garden = getTemplate("midnight-garden")!;

describe("timeline", () => {
  it("plays Midnight Garden's preludes in turn, crossfading into the final card", () => {
    const t = buildTimeline(garden.manifest.scenes, "cinematic");
    expect(t.scenes.map((s) => s.id)).toEqual(["dusk", "names", "card"]);
    const [dusk, names, card] = t.scenes;
    expect(dusk.startMs).toBe(0);
    expect(dusk.endMs).toBe(3000);
    expect(names.startMs).toBe(3000); // begins as dusk leaves
    expect(names.endMs).toBe(6600);
    expect(card.startMs).toBe(6600);
    expect(card.endMs).toBeNull(); // the finished card stays
    // Layer delays are absolute from the start of playback.
    expect(card.layerDelays[0]).toBe(6600);
    expect(t.totalMs).toBeGreaterThan(card.startMs + 2000);
  });

  it("is gentler and shorter at Gentle, and shows only the card at Still", () => {
    const c = buildTimeline(garden.manifest.scenes, "cinematic");
    const g = buildTimeline(garden.manifest.scenes, "gentle");
    expect(g.totalMs).toBeLessThan(c.totalMs);
    expect(g.scenes.every((s) => s.transition === "fade")).toBe(true);
    const s = buildTimeline(garden.manifest.scenes, "still");
    expect(s.scenes).toHaveLength(1);
    expect(s.scenes[0]).toMatchObject({ id: "card", startMs: 0, endMs: null, transition: "none" });
    expect(s.totalMs).toBe(0);
  });

  it("handles a single-scene design", () => {
    const t = buildTimeline(getTemplate("ivory-vow")!.manifest.scenes, "cinematic");
    expect(t.scenes).toHaveLength(1);
    expect(t.scenes[0].endMs).toBeNull();
  });

  it("maps reveals and transitions per level", () => {
    expect(revealFor("letters", "cinematic")).toBe("letters");
    expect(revealFor("letters", "gentle")).toBe("settle");
    expect(revealFor("foil-draw", "gentle")).toBe("foil-draw");
    expect(revealFor("letters", "still")).toBe("none");
    expect(transitionFor("iris", "gentle")).toBe("fade");
    expect(transitionFor("iris", "still")).toBe("none");
    expect(TRANSITION_MS).toBeGreaterThan(0);
  });
});

describe("names adapt to the occasion", () => {
  it("couple, single (with optional age), organisation", () => {
    const couple = resolveNames({ partnerOne: "Sarah", partnerTwo: "James" });
    expect(couple).toEqual({ mode: "couple", first: "Sarah", second: "James" });
    expect(monogramOf(couple)).toBe("S&J");
    expect(namesLabel(couple)).toBe("Sarah & James");

    expect(resolveNames({ celebrant: "Eleanor", age: "40" })).toEqual({ mode: "single", name: "Eleanor", caption: "is turning 40" });
    expect(resolveNames({ celebrant: "Eleanor", age: "40" }, { hideAge: true })).toEqual({ mode: "single", name: "Eleanor", caption: undefined });
    expect(resolveNames({ celebrant: "Eleanor", age: "forty" })?.mode).toBe("single");
    expect(resolveNames({ childName: "Rose" })).toEqual({ mode: "single", name: "Rose" });

    const corp = resolveNames({ organisation: "Hartwell & Co.", eventName: "Summer Reception" });
    expect(corp).toEqual({ mode: "organisation", organisation: "Hartwell & Co.", title: "Summer Reception" });
    expect(monogramOf(corp)).toBe("H");

    expect(resolveNames({ eventName: "A Garden Party", hostName: "The Ashworths" })).toEqual({
      mode: "single",
      name: "A Garden Party",
      caption: "hosted by The Ashworths",
    });
    expect(resolveNames({})).toBeNull();
  });
});

describe("shared asset library", () => {
  it("every asset's files exist, and every design's asset reference resolves", () => {
    const pub = join(__dirname, "..", "..", "..", "..", "public");
    for (const a of cinematicAssets) {
      expect(existsSync(join(pub, a.src)), a.src).toBe(true);
      expect(existsSync(join(pub, a.poster)), a.poster).toBe(true);
    }
    for (const t of templateLibrary) {
      for (const s of t.manifest.scenes) {
        if (s.background.kind === "asset") expect(getAsset(s.background.value), `${t.slug}/${s.id}`).toBeDefined();
      }
    }
  });

  it("opening artwork and website paper resolve to real assets", () => {
    for (const t of templateLibrary) {
      const m = t.manifest;
      if (m.motion.art) {
        expect(getAsset(m.motion.art.closed), `${t.slug} closed`).toBeDefined();
        expect(getAsset(m.motion.art.revealed), `${t.slug} revealed`).toBeDefined();
      }
      if (m.site?.paper) expect(getAsset(m.site.paper), `${t.slug} paper`).toBeDefined();
    }
  });

  it("the gilded opening is only offered by designs that carry its artwork", () => {
    expect(openingsFor(getTemplate("tuscan-vineyard")!.manifest)).toContain("gilded");
    expect(openingsFor(garden.manifest)).not.toContain("gilded");
    expect(openingsFor(garden.manifest)).toEqual(["envelope", "curtain", "title-card", "none"]);
  });

  it("the same loop serves several scenes and designs (reuse, not one-offs)", () => {
    const uses = templateLibrary.flatMap((t) => t.manifest.scenes.filter((s) => s.background.kind === "asset").map((s) => s.background.value));
    expect(uses.filter((u) => u === "night-garden").length).toBeGreaterThanOrEqual(3);
  });
});

describe("manifest rules for films", () => {
  const base = garden.manifest as ManifestInput;
  const withScenes = (scenes: ManifestInput["scenes"]) => manifestSchema.safeParse({ ...base, scenes });

  it("the final scene must carry the names and date", () => {
    const r = withScenes([{ id: "x", background: { kind: "color", value: "#000000" }, layers: [{ type: "text", text: "Hello", style: "body" }] }]);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toMatch(/names/);
    expect(JSON.stringify(r.error?.issues)).toMatch(/date/);
  });

  it("countdown and RSVP can't hide in a prelude", () => {
    const r = withScenes([
      { id: "a", background: { kind: "color", value: "#000000" }, layers: [{ type: "rsvp" }] },
      ...(base.scenes.slice(-1) as ManifestInput["scenes"]),
    ]);
    expect(r.success).toBe(false);
  });

  it("older manifests without motion settings still load, with sensible defaults", () => {
    const { motion: _omit, ...old } = base;
    void _omit;
    const r = manifestSchema.parse(old);
    expect(r.motion).toEqual({ opening: "envelope", level: "cinematic" });
    expect(r.site).toBeUndefined();
  });

  it("the customer's motion and opening choices win over the design's", () => {
    expect(resolveMotion(garden.manifest)).toMatchObject({ level: "cinematic", opening: "envelope" });
    expect(resolveMotion(garden.manifest, { slots: {}, motion: "still", opening: "title-card" })).toEqual({ level: "still", opening: "title-card" });
  });
});
