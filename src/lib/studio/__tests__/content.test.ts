import { describe, expect, it } from "vitest";
import { getOccasion } from "@/lib/occasions/registry";
import { getTemplate } from "@/lib/templates/library";
import { starterContent } from "@/lib/occasions/compat";
import { checkDraft, eventFieldsFrom, fieldGroups, tidy } from "../content";

const wedding = getOccasion("weddings")!;
const tuscan = getTemplate("tuscan-vineyard")!;
const base = () => starterContent(wedding, "invitation", tuscan);

describe("studio editing rules", () => {
  it("groups a wedding's fields into names, when, where and wording", () => {
    const g = fieldGroups(wedding, tuscan);
    expect(g.map((x) => x.id)).toEqual(["names", "when", "where", "wording"]);
    expect(g[0].fields.map((f) => f.key)).toEqual(expect.arrayContaining(["partnerOne", "partnerTwo"]));
    expect(g.flatMap((x) => x.fields).some((f) => f.type === "image")).toBe(false);
  });

  it("allows a half-finished draft but not malformed values", () => {
    const c = base();
    c.slots.partnerTwo = "";
    expect(checkDraft(wedding, tuscan, c).ok).toBe(true);
    c.slots.date = "12/06/2027";
    const bad = checkDraft(wedding, tuscan, c);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems[0].slot).toBe("date");
  });

  it("rejects unknown fields, locked palettes and openings the design lacks", () => {
    expect(checkDraft(wedding, tuscan, { slots: { nonsense: "x" } }).ok).toBe(false);
    const ivory = getTemplate("ivory-vow")!;
    expect(checkDraft(wedding, ivory, { slots: {}, opening: "gilded" }).ok).toBe(false);
    expect(checkDraft(wedding, tuscan, { slots: {}, opening: "gilded" }).ok).toBe(true);
    expect(checkDraft(wedding, tuscan, { slots: {}, opening: "bogus" }).ok).toBe(false);
  });

  it("tidies values and keeps the event row in step", () => {
    const c = tidy({ slots: { ...base().slots, partnerOne: "  Amara ", partnerTwo: "Tomás", date: "2027-07-03", time: "15:30", venue: " Villa Rosa " } });
    expect(c.slots.partnerOne).toBe("Amara");
    const e = eventFieldsFrom(wedding, c, "Europe/London");
    expect(e.title).toBe("Amara & Tomás");
    expect(e.host_names).toEqual(["Amara", "Tomás"]);
    expect(e.starts_at).toBe("2027-07-03T15:30:00+01:00");
    expect(e.venue_name).toBe("Villa Rosa");
  });
});
