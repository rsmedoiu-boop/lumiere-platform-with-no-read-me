import { describe, expect, it } from "vitest";
import { activeCategorySlugs, categories } from "@/config/catalogue";
import { templateLibrary, getTemplate } from "@/lib/templates/library";
import { sectionKeys, slotSchema, validateContent } from "@/lib/templates/manifest";
import { invitationKinds, kindConfig } from "../kinds";
import { defaultSettings, getOccasion, occasions, replyFieldKeys } from "../registry";
import {
  defaultSectionsFor,
  effectiveSlots,
  sectionsFor,
  startableOccasions,
  starterContent,
  templateSupports,
  templatesFor,
} from "../compat";

const wedding = getOccasion("weddings")!;
const birthday = getOccasion("birthdays")!;
const midnight = getTemplate("midnight-garden")!;

describe("occasion registry", () => {
  it("has exactly one category row per occasion, and vice versa", () => {
    expect(occasions.map((o) => o.slug).sort()).toEqual(categories.map((c) => c.slug).sort());
  });

  it("defines valid fields, known sections, reply fields and invitation types", () => {
    for (const o of occasions) {
      for (const f of o.fields) expect(() => slotSchema.parse(f), `${o.slug}.${f.key}`).not.toThrow();
      expect(new Set(o.fields.map((f) => f.key)).size, `${o.slug} duplicate field`).toBe(o.fields.length);
      for (const k of ["date", "venue", "invitationLine"]) expect(o.fields.some((f) => f.key === k), `${o.slug} lacks ${k}`).toBe(true);
      for (const s of o.sections.defaults) expect(o.sections.available).toContain(s);
      for (const s of o.sections.available) expect(sectionKeys).toContain(s);
      for (const r of o.reply.defaults) expect(o.reply.fields).toContain(r);
      for (const r of o.reply.fields) expect(replyFieldKeys).toContain(r);
      expect(o.kinds).toContain("invitation");
      for (const k of o.kinds) expect(invitationKinds).toContain(k);
      // Every invitation type offered has default wording.
      for (const k of o.kinds) expect(o.wording[k], `${o.slug} ${k} wording`).toBeTruthy();
      // An occasion that offers an RSVP must be able to show one.
      expect(o.sections.available).toContain("rsvp");
      expect(o.sections.available).toContain("countdown");
    }
  });

  it("gives birthdays age-hiding and surprise settings, off by default", () => {
    expect(defaultSettings(birthday)).toEqual({ hideAge: false, surprise: false });
  });

  it("turns child privacy on by default wherever it's offered", () => {
    for (const o of occasions) {
      const s = o.settings.find((x) => x.key === "childPrivacy");
      if (s) expect(s.default).toBe(true);
    }
    expect(getOccasion("christenings")!.settings.some((s) => s.key === "childPrivacy")).toBe(true);
  });
});

describe("invitation types", () => {
  it("save-the-dates take a light reply; invitations a full RSVP; thank-you cards none", () => {
    expect(kindConfig.save_the_date.reply).toBe("interest");
    expect(kindConfig.invitation.reply).toBe("full");
    expect(kindConfig.evening_invitation.reply).toBe("full");
    expect(kindConfig.thank_you.reply).toBe("none");
    expect(kindConfig.thank_you.countdown).toBe(false);
  });
});

describe("templates and occasions", () => {
  it("a design whose names adapt suits a birthday; one that draws two named partners would not", () => {
    expect(templateSupports(midnight, wedding).ok).toBe(true);
    expect(templateSupports(midnight, birthday).ok).toBe(true);
    const twoNames = {
      ...midnight,
      occasions: ["birthdays"],
      manifest: {
        ...midnight.manifest,
        scenes: [{ ...midnight.manifest.scenes[2], layers: [{ type: "text" as const, slot: "partnerOne", style: "names" as const, animation: "settle" as const, delayMs: 0 }] }],
      },
    };
    const b = templateSupports(twoNames, birthday);
    expect(b.ok).toBe(false);
    expect(b.missing).toEqual(["partnerOne"]);
  });

  it("a design is only offered for the occasions it lists", () => {
    expect(templateSupports(getTemplate("riviera")!, birthday).ok).toBe(false);
  });

  it("every design is usable for every occasion it lists", () => {
    for (const t of templateLibrary) {
      for (const slug of t.occasions ?? [t.category]) {
        const o = getOccasion(slug);
        expect(o, `${t.slug} lists unknown occasion ${slug}`).toBeDefined();
        expect(templateSupports(t, o!), `${t.slug} × ${slug}`).toMatchObject({ ok: true });
      }
    }
  });

  it("filters the gallery by occasion", () => {
    expect(templatesFor("weddings", templateLibrary).map((t) => t.slug)).toEqual(["ivory-vow", "midnight-garden", "riviera"]);
    expect(templatesFor("birthdays", templateLibrary).map((t) => t.slug)).toEqual(["ivory-vow", "midnight-garden"]);
    expect(templatesFor("corporate", templateLibrary).map((t) => t.slug)).toEqual(["ivory-vow"]);
    expect(templatesFor("nope", templateLibrary)).toEqual([]);
  });

  it("only offers occasions that are switched on and have a design", () => {
    const slugs = startableOccasions(templateLibrary, activeCategorySlugs).map((o) => o.slug);
    expect(slugs).toContain("weddings");
    expect(slugs).toContain("birthdays");
    expect(startableOccasions(templateLibrary, ["weddings"]).map((o) => o.slug)).toEqual(["weddings"]);
    expect(startableOccasions([getTemplate("riviera")!], activeCategorySlugs).map((o) => o.slug)).not.toContain("birthdays");
  });
});

describe("every published invitation has a countdown and a reply", () => {
  it("holds for every occasion × invitation type × suitable design", () => {
    for (const o of occasions) {
      for (const kind of o.kinds) {
        const k = kindConfig[kind];
        for (const t of templatesFor(o.slug, templateLibrary)) {
          const offered = sectionsFor(o, kind, t);
          const on = defaultSectionsFor(o, kind, t);
          const label = `${o.slug}/${kind}/${t.slug}`;
          expect(on.includes("countdown"), label).toBe(k.countdown);
          expect(on.includes("rsvp"), label).toBe(k.reply !== "none");
          for (const s of on) expect(offered).toContain(s);
          for (const s of offered) expect(o.sections.available, label).toContain(s);
        }
      }
    }
  });

  it("keeps a save-the-date short: no dress code, schedule or gallery", () => {
    const s = sectionsFor(wedding, "save_the_date", midnight);
    expect(s).toEqual(expect.arrayContaining(["countdown", "rsvp"]));
    for (const x of ["dress_code", "schedule", "gallery"]) expect(s).not.toContain(x);
  });

  it("gives a thank-you card neither countdown nor RSVP", () => {
    const s = sectionsFor(wedding, "thank_you", midnight);
    expect(s).not.toContain("countdown");
    expect(s).not.toContain("rsvp");
  });
});

describe("starter content", () => {
  it("uses the invitation type's wording and opening words, and validates against the occasion's fields", () => {
    const c = starterContent(wedding, "save_the_date", midnight);
    expect(c.slots.invitationLine).toBe(wedding.wording.save_the_date);
    expect(c.slots.lead).toBe("Save the date");
    expect(validateContent(midnight.manifest, c, effectiveSlots(wedding, midnight)).ok).toBe(true);
  });

  it("a birthday on Midnight Garden validates against birthday fields, not wedding ones", () => {
    const fields = effectiveSlots(birthday, midnight);
    const c = starterContent(birthday, "invitation", midnight);
    expect(c.slots.celebrant).toBeTruthy();
    expect(c.slots.partnerOne).toBeUndefined();
    expect(validateContent(midnight.manifest, c, fields).ok).toBe(true);
    const r = validateContent(midnight.manifest, { slots: { ...c.slots, celebrant: "" } }, fields);
    expect(r.ok).toBe(false);
  });

  it("collects the occasion's fields, keeping the design's sample names", () => {
    const keys = effectiveSlots(wedding, midnight).map((s) => s.key);
    expect(keys).toEqual(wedding.fields.map((f) => f.key));
  });
});
