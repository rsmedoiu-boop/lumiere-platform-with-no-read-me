import { describe, expect, it } from "vitest";
import { fitWithin, isOwnPhotoPath, newPhotoPath } from "../photo";
import { getOccasion } from "@/lib/occasions/registry";
import { getTemplate } from "@/lib/templates/library";
import { checkDraft } from "../content";

const ev = "11111111-2222-4333-8444-555555555555";
const other = "99999999-2222-4333-8444-555555555555";

describe("photo rules", () => {
  it("accepts only a webp inside the event's own folder", () => {
    const p = newPhotoPath(ev);
    expect(isOwnPhotoPath(ev, p)).toBe(true);
    expect(isOwnPhotoPath(other, p)).toBe(false);
    expect(isOwnPhotoPath(ev, `${ev}/../${other}/x.webp`)).toBe(false);
    expect(isOwnPhotoPath(ev, `${ev}/${crypto.randomUUID()}.exe`)).toBe(false);
    expect(isOwnPhotoPath(ev, `${other}/${crypto.randomUUID()}.webp`)).toBe(false);
    expect(isOwnPhotoPath(ev, undefined)).toBe(false);
  });
  it("scales down to the longest side and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1800, height: 1350 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1350, height: 1800 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("keeps story words within limits and still allows an empty story", () => {
    const o = getOccasion("weddings")!;
    const t = getTemplate("tuscan-vineyard")!;
    expect(checkDraft(o, t, { slots: {}, story: { heading: "Our story" } }).ok).toBe(true);
    expect(checkDraft(o, t, { slots: {}, story: { body: "x".repeat(1501) } }).ok).toBe(false);
  });
});
