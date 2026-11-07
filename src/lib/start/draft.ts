/**
 * The start flow's draft: occasion → invitation type → design → essentials.
 * Pure rules shared by the form, the server action and (later) the mobile
 * app: what's valid, and how a draft becomes an event and its invitation.
 */
import { z } from "zod";
import { getOccasion, defaultSettings, type OccasionConfig } from "@/lib/occasions/registry";
import { invitationKinds, type InvitationKind } from "@/lib/occasions/kinds";
import { defaultSectionsFor, effectiveSlots, starterContent, templateSupports } from "@/lib/occasions/compat";
import { namesLabel, resolveNames } from "@/lib/cinema/names";
import { validateContent, type InvitationContent, type Slot, type TemplateDefinition } from "@/lib/templates/manifest";

export const startDraftSchema = z.object({
  occasion: z.string().min(1).max(60),
  kind: z.enum(invitationKinds),
  template: z.string().min(1).max(80),
  fields: z.record(z.string(), z.string().max(2000)),
  settings: z.record(z.string(), z.boolean()).default({}),
});
export type StartDraft = z.infer<typeof startDraftSchema>;

/** The fields asked for in the essentials step: names, date, time and venue. Wording and photos come later, in the studio. */
export function essentialFields(o: OccasionConfig, t: TemplateDefinition): Slot[] {
  return effectiveSlots(o, t).filter((f) => f.type !== "image" && f.type !== "video" && f.key !== "invitationLine" && f.key !== "lead");
}

export type DraftProblem = { field?: string; message: string };

export interface PreparedEvent {
  occasion: string;
  template: string;
  kind: InvitationKind;
  title: string;
  hosts: string[];
  startsAt: string | null;
  timezone: string;
  venue: string;
  details: { settings: Record<string, boolean> };
  content: InvitationContent;
  sections: string[];
}

/**
 * Check a draft and turn it into what the database needs. Every rule the
 * customer can break comes back as a plain-English problem.
 */
export function prepareDraft(
  raw: unknown,
  findTemplate: (slug: string) => TemplateDefinition | undefined,
  opts: { timezone?: string } = {},
): { ok: true; event: PreparedEvent } | { ok: false; problems: DraftProblem[] } {
  const parsed = startDraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: [{ message: "Something went wrong with that form. Please start again." }] };
  const d = parsed.data;

  const o = getOccasion(d.occasion);
  if (!o) return { ok: false, problems: [{ message: "Choose an occasion" }] };
  if (!o.kinds.includes(d.kind)) return { ok: false, problems: [{ message: "Choose an invitation type" }] };
  const t = findTemplate(d.template);
  if (!t || !templateSupports(t, o).ok) return { ok: false, problems: [{ message: "Choose a design for this occasion" }] };

  // Only the essentials come from the form; everything else starts from the design and occasion.
  const asked = new Set(essentialFields(o, t).map((f) => f.key));
  const unknown = Object.keys(d.fields).filter((k) => !asked.has(k));
  if (unknown.length) return { ok: false, problems: [{ message: "Something went wrong with that form. Please start again." }] };

  const starter = starterContent(o, d.kind, t);
  const slots: Record<string, string> = { ...starter.slots };
  for (const [k, v] of Object.entries(d.fields)) slots[k] = v.trim();
  // A birthday age of "" is fine; don't keep the sample "40" if they cleared it.
  for (const k of asked) if (!(k in d.fields)) delete slots[k];

  const checked = validateContent(t.manifest, { slots }, effectiveSlots(o, t));
  if (!checked.ok) return { ok: false, problems: checked.problems.map((p) => ({ field: p.slot, message: p.message })) };

  const allowedSettings = new Set(o.settings.map((s) => s.key));
  const settings = { ...defaultSettings(o) };
  for (const [k, v] of Object.entries(d.settings)) if (allowedSettings.has(k)) settings[k] = v;

  const names = resolveNames(slots, { hideAge: settings.hideAge });
  const hosts =
    names?.mode === "couple" ? [names.first, names.second].filter(Boolean) : names?.mode === "organisation" ? [names.organisation] : names ? [names.name] : [];
  const timezone = opts.timezone ?? "Europe/London";

  return {
    ok: true,
    event: {
      occasion: o.slug,
      template: t.slug,
      kind: d.kind,
      title: eventTitle(o, slots),
      hosts,
      startsAt: slots.date ? zonedToIso(slots.date, slots.time || "12:00", timezone) : null,
      timezone,
      venue: slots.venue ?? "",
      details: { settings },
      content: { slots },
      sections: defaultSectionsFor(o, d.kind, t),
    },
  };
}

/** "Sarah & James", "Eleanor's birthday", "Hartwell & Co. — Summer Reception". */
export function eventTitle(o: OccasionConfig, slots: Record<string, string>): string {
  const n = resolveNames(slots);
  if (!n) return o.name;
  if (n.mode === "single" && o.slug === "birthdays") return `${n.name}’s birthday`;
  if (n.mode === "single" && (o.slug === "christenings" || o.slug === "baby-showers")) return `${n.name}’s ${o.noun}`;
  return namesLabel(n);
}

/**
 * Local wall-clock date and time in a time zone → ISO 8601 with its offset,
 * e.g. ("2027-06-12", "14:00", "Europe/London") → "2027-06-12T14:00:00+01:00".
 * Handles summer time without a date library.
 */
export function zonedToIso(date: string, time: string, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // What does that UTC instant read as in the zone? The difference is the offset.
  const offsetAt = (ms: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(ms))
        .map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    return (local - ms) / 60000;
  };
  let offset = offsetAt(asUtc);
  offset = offsetAt(asUtc - offset * 60000); // second pass settles the hour around clock changes
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date}T${pad(h)}:${pad(mi)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
