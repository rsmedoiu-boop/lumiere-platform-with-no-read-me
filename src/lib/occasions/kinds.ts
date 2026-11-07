/**
 * Invitation types. An event can hold several invitations (a save-the-date
 * in spring, the main invitation in summer, an evening invitation for
 * evening-only guests, a thank-you card afterwards). They share one guest
 * list and one RSVP store; the type decides how guests reply.
 *
 * Mirrors the `invitation_kind` enum in the database (migration 0004).
 */

export const invitationKinds = ["save_the_date", "invitation", "evening_invitation", "thank_you"] as const;
export type InvitationKind = (typeof invitationKinds)[number];

/**
 * How a guest answers:
 * - full: attending yes/no per person, plus the occasion's reply fields (meals, allergies…)
 * - interest: a light "Hoping to come / Can't make it", no details yet
 * - none: nothing to answer (a thank-you card is sent after the day)
 */
export type ReplyMode = "full" | "interest" | "none";

export interface InvitationKindConfig {
  kind: InvitationKind;
  name: string;
  description: string;
  reply: ReplyMode;
  /** Shows a live countdown to the event. */
  countdown: boolean;
  /** Sent after the event rather than before it. */
  afterEvent: boolean;
  /** Website sections that make sense for this type (intersected with the occasion's). */
  sectionsAllowed: "all" | readonly string[];
}

export const kindConfig: Record<InvitationKind, InvitationKindConfig> = {
  save_the_date: {
    kind: "save_the_date",
    name: "Save the date",
    description: "An early heads-up with the date and place. Guests can say if they're hoping to come.",
    reply: "interest",
    countdown: true,
    afterEvent: false,
    sectionsAllowed: ["countdown", "accommodation", "directions", "rsvp"],
  },
  invitation: {
    kind: "invitation",
    name: "Invitation",
    description: "The full invitation with every detail and a complete RSVP.",
    reply: "full",
    countdown: true,
    afterEvent: false,
    sectionsAllowed: "all",
  },
  evening_invitation: {
    kind: "evening_invitation",
    name: "Evening invitation",
    description: "For guests joining the celebration in the evening only.",
    reply: "full",
    countdown: true,
    afterEvent: false,
    sectionsAllowed: "all",
  },
  thank_you: {
    kind: "thank_you",
    name: "Thank-you card",
    description: "A moving thank-you with your favourite photographs, sent after the day.",
    reply: "none",
    countdown: false,
    afterEvent: true,
    sectionsAllowed: ["gallery", "video"],
  },
};
