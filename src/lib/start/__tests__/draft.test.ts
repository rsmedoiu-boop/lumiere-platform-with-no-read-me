import { describe, expect, it } from "vitest";
import { getTemplate } from "@/lib/templates/library";
import { getOccasion } from "@/lib/occasions/registry";
import { essentialFields, eventTitle, prepareDraft, zonedToIso } from "../draft";

const wedding = {
  occasion: "weddings",
  kind: "invitation",
  template: "midnight-garden",
  fields: { partnerOne: "Amara", partnerTwo: "Tom", date: "2027-06-12", time: "14:30", venue: "Hartley Barn, Kent" },
};

describe("essentials asked for", () => {
  it("names, date, time and venue — wording and photos come later in the studio", () => {
    const keys = essentialFields(getOccasion("weddings")!, getTemplate("midnight-garden")!).map((f) => f.key);
    expect(keys).toEqual(["partnerOne", "partnerTwo", "date", "time", "venue"]);
    const b = essentialFields(getOccasion("birthdays")!, getTemplate("midnight-garden")!).map((f) => f.key);
    expect(b).toEqual(["celebrant", "age", "date", "time", "venue"]);
  });
});

describe("preparing a draft", () => {
  it("turns a wedding draft into an event and invitation", () => {
    const r = prepareDraft(wedding, getTemplate);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event).toMatchObject({
      occasion: "weddings",
      template: "midnight-garden",
      kind: "invitation",
      title: "Amara & Tom",
      hosts: ["Amara", "Tom"],
      startsAt: "2027-06-12T14:30:00+01:00",
      venue: "Hartley Barn, Kent",
      details: { settings: { adultsOnly: false, plusOnes: false } },
    });
    // Wording comes from the occasion and invitation type, not the sample design.
    expect(r.event.content.slots.invitationLine).toBe(getOccasion("weddings")!.wording.invitation);
    expect(r.event.content.slots.lead).toBe("You are invited");
    expect(r.event.sections).toEqual(expect.arrayContaining(["countdown", "rsvp"]));
  });

  it("a save-the-date gets its own wording and only short sections", () => {
    const r = prepareDraft({ ...wedding, kind: "save_the_date" }, getTemplate);
    expect(r.ok && r.event.content.slots.lead).toBe("Save the date");
    expect(r.ok && r.event.sections).not.toContain("dress_code");
  });

  it("a birthday on the flagship design, with the age kept private", () => {
    const r = prepareDraft(
      { occasion: "birthdays", kind: "invitation", template: "midnight-garden", fields: { celebrant: "Eleanor", age: "40", date: "2027-03-06", time: "19:00", venue: "The Orangery" }, settings: { hideAge: true, surprise: true } },
      getTemplate,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.title).toBe("Eleanor’s birthday");
    expect(r.event.hosts).toEqual(["Eleanor"]);
    expect(r.event.details.settings).toEqual({ hideAge: true, surprise: true });
    expect(r.event.startsAt).toBe("2027-03-06T19:00:00+00:00"); // GMT in March
  });

  it("explains what's missing in plain English", () => {
    const r = prepareDraft({ ...wedding, fields: { ...wedding.fields, partnerTwo: "  ", date: "" } }, getTemplate);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.problems.map((p) => p.field)).toEqual(expect.arrayContaining(["partnerTwo", "date"]));
    expect(r.problems.find((p) => p.field === "partnerTwo")?.message).toMatch(/required/);
  });

  it("refuses mismatches: a design not offered for the occasion, a type the occasion lacks, smuggled fields", () => {
    expect(prepareDraft({ ...wedding, occasion: "corporate" }, getTemplate).ok).toBe(false);
    expect(prepareDraft({ ...wedding, template: "riviera", occasion: "birthdays", fields: {} }, getTemplate).ok).toBe(false);
    expect(prepareDraft({ ...wedding, occasion: "christenings", kind: "save_the_date", template: "ivory-vow", fields: {} }, getTemplate).ok).toBe(false);
    expect(prepareDraft({ ...wedding, fields: { ...wedding.fields, invitationLine: "<script>" } }, getTemplate).ok).toBe(false);
    expect(prepareDraft({ ...wedding, kind: "party_bag" }, getTemplate).ok).toBe(false);
    expect(prepareDraft({ ...wedding, settings: { notASetting: true } }, getTemplate)).toMatchObject({ ok: true });
  });

  it("ignores settings the occasion doesn't have", () => {
    const r = prepareDraft({ ...wedding, settings: { hideAge: true, adultsOnly: true } }, getTemplate);
    expect(r.ok && r.event.details.settings).toEqual({ adultsOnly: true, plusOnes: false });
  });
});

describe("titles and times", () => {
  it("titles each occasion naturally", () => {
    expect(eventTitle(getOccasion("christenings")!, { childName: "Rose" })).toBe("Rose’s christening");
    expect(eventTitle(getOccasion("corporate")!, { organisation: "Hartwell & Co.", eventName: "Summer Reception" })).toBe("Hartwell & Co. — Summer Reception");
  });
  it("converts UK wall-clock time across summer time", () => {
    expect(zonedToIso("2027-06-12", "14:00", "Europe/London")).toBe("2027-06-12T14:00:00+01:00");
    expect(zonedToIso("2027-12-18", "15:30", "Europe/London")).toBe("2027-12-18T15:30:00+00:00");
    expect(zonedToIso("2027-06-12", "14:00", "Europe/Paris")).toBe("2027-06-12T14:00:00+02:00");
    expect(zonedToIso("2027-06-12", "14:00", "America/New_York")).toBe("2027-06-12T14:00:00-04:00");
  });
});
