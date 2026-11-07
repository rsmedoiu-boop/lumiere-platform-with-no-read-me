/**
 * Occasions — what makes a wedding different from a birthday or a product
 * launch, kept as data so the start flow, editor, website and RSVP all adapt
 * without separate code paths.
 *
 * Each occasion's `slug` is a row in `categories` (see src/config/catalogue).
 * Adding an occasion = one entry here + one category row + templates that
 * support it. Pure TypeScript: reusable by a future mobile app.
 */
import type { SectionKey, Slot } from "@/lib/templates/manifest";
import type { InvitationKind } from "./kinds";

/** Extra questions a full RSVP can ask, on top of "can you come?". */
export const replyFieldKeys = [
  "meal",
  "dietary",
  "allergies",
  "song",
  "accessibility",
  "transport",
  "company",
  "message",
] as const;
export type ReplyFieldKey = (typeof replyFieldKeys)[number];

export const replyFieldLabels: Record<ReplyFieldKey, string> = {
  meal: "Meal choice",
  dietary: "Dietary requirements",
  allergies: "Allergies",
  song: "Song request",
  accessibility: "Access needs",
  transport: "Needs a lift or the coach",
  company: "Company / organisation",
  message: "A message for the hosts",
};

/** Occasion-specific switches the host sets once; stored in events.details.settings. */
export interface OccasionSetting {
  key: string;
  label: string;
  help: string;
  default: boolean;
}

export interface OccasionConfig {
  slug: string;
  name: string;
  /** "Tell us about your wedding" → used in the start flow. */
  noun: string;
  description: string;
  /** How the names on the invitation are shaped. */
  names: "couple" | "single" | "organisation";
  /** Fields the customer fills in the essentials step and the editor. */
  fields: Slot[];
  sections: { available: SectionKey[]; defaults: SectionKey[] };
  reply: { fields: ReplyFieldKey[]; defaults: ReplyFieldKey[] };
  kinds: InvitationKind[];
  settings: OccasionSetting[];
  /** Default invitation wording, by invitation type. */
  wording: Partial<Record<InvitationKind, string>>;
}

// ---------------------------------------------------------------------------
// Shared field definitions
// ---------------------------------------------------------------------------
const date = (label = "Date"): Slot => ({ key: "date", type: "date", label, required: true, default: "2027-06-12" });
const time = (label = "Start time"): Slot => ({ key: "time", type: "time", label, required: false, default: "14:00" });
const venue = (label = "Venue"): Slot => ({
  key: "venue",
  type: "text",
  label,
  maxLength: 60,
  required: true,
  default: "Ashcombe House, Oxfordshire",
});
const invitationLine = (fallback: string): Slot => ({
  key: "invitationLine",
  type: "longtext",
  label: "Invitation wording",
  maxLength: 140,
  required: false,
  default: fallback,
});
/** The first words of the film; defaults by invitation type (see kinds.ts). */
export const leadField: Slot = { key: "lead", type: "text", label: "Opening words", maxLength: 40, required: false, default: "You are invited" };
const photo = (label = "Photograph"): Slot => ({ key: "photo", type: "image", label, required: false });

const coupleFields = (inviteWording: string): Slot[] => [
  { key: "partnerOne", type: "text", label: "First name", maxLength: 24, required: true, default: "Sarah" },
  { key: "partnerTwo", type: "text", label: "Second name", maxLength: 24, required: true, default: "James" },
  date(),
  time(),
  venue(),
  invitationLine(inviteWording),
  leadField,
  photo("Your photograph"),
];

const allSections: SectionKey[] = [
  "countdown", "story", "schedule", "venue", "dress_code", "accommodation",
  "gallery", "video", "gifts", "rsvp", "extra",
];

const childPrivacy: OccasionSetting = {
  key: "childPrivacy",
  label: "Extra privacy for children's photos",
  help: "Asks for a password to see the website, and keeps every photo out of AI features.",
  default: true,
};

// ---------------------------------------------------------------------------
// The occasions
// ---------------------------------------------------------------------------
export const occasions: OccasionConfig[] = [
  {
    slug: "weddings",
    name: "Wedding",
    noun: "wedding",
    description: "Save-the-dates, invitations, a wedding website, RSVPs and the seating plan.",
    names: "couple",
    fields: coupleFields("request the pleasure of your company to celebrate their marriage"),
    sections: {
      available: allSections,
      defaults: ["countdown", "story", "schedule", "venue", "dress_code", "accommodation", "rsvp", "extra"],
    },
    reply: {
      fields: ["meal", "dietary", "allergies", "song", "accessibility", "transport", "message"],
      defaults: ["meal", "dietary", "allergies", "message"],
    },
    kinds: ["save_the_date", "invitation", "evening_invitation", "thank_you"],
    settings: [
      { key: "adultsOnly", label: "Adults-only celebration", help: "Hides the children's meal and lets guests know politely.", default: false },
      { key: "plusOnes", label: "Allow plus-ones", help: "Guests you mark can bring someone and name them in their RSVP.", default: false },
    ],
    wording: {
      save_the_date: "are getting married — please save the date",
      invitation: "request the pleasure of your company to celebrate their marriage",
      evening_invitation: "invite you to join them for the evening celebration of their marriage",
      thank_you: "thank you for sharing our day",
    },
  },
  {
    slug: "engagements",
    name: "Engagement party",
    noun: "engagement party",
    description: "Celebrate the news with an invitation and a simple RSVP.",
    names: "couple",
    fields: coupleFields("are engaged, and would love you to celebrate with them"),
    sections: { available: ["countdown", "story", "schedule", "venue", "dress_code", "gallery", "rsvp", "extra"], defaults: ["countdown", "story", "venue", "rsvp"] },
    reply: { fields: ["dietary", "allergies", "message"], defaults: ["dietary", "message"] },
    kinds: ["save_the_date", "invitation", "thank_you"],
    settings: [],
    wording: {
      save_the_date: "are engaged — save the date for the party",
      invitation: "are engaged, and would love you to celebrate with them",
      thank_you: "thank you for celebrating with us",
    },
  },
  {
    slug: "birthdays",
    name: "Birthday",
    noun: "birthday",
    description: "Milestone birthdays and parties, with surprise mode if you need it.",
    names: "single",
    fields: [
      { key: "celebrant", type: "text", label: "Whose birthday?", maxLength: 30, required: true, default: "Eleanor" },
      { key: "age", type: "text", label: "Age (optional)", maxLength: 3, required: false, default: "40" },
      date(),
      time("Party starts"),
      venue(),
      invitationLine("Join us to celebrate"),
      leadField,
      photo(),
    ],
    sections: { available: ["countdown", "schedule", "venue", "dress_code", "accommodation", "gallery", "gifts", "rsvp", "extra"], defaults: ["countdown", "venue", "dress_code", "rsvp"] },
    reply: { fields: ["dietary", "allergies", "song", "message"], defaults: ["dietary", "message"] },
    kinds: ["save_the_date", "invitation", "thank_you"],
    settings: [
      { key: "hideAge", label: "Keep the age off the invitation", help: "The number won't be shown anywhere guests can see.", default: false },
      { key: "surprise", label: "It's a surprise", help: "Reminds every guest to keep it secret, and hides the site from search.", default: false },
    ],
    wording: {
      save_the_date: "Save the date for a birthday celebration",
      invitation: "Join us to celebrate",
      thank_you: "Thank you for making the day so special",
    },
  },
  {
    slug: "anniversaries",
    name: "Anniversary",
    noun: "anniversary",
    description: "Ruby, golden and every anniversary in between.",
    names: "couple",
    fields: coupleFields("invite you to celebrate their anniversary"),
    sections: { available: ["countdown", "story", "schedule", "venue", "dress_code", "gallery", "rsvp", "extra"], defaults: ["countdown", "story", "venue", "rsvp"] },
    reply: { fields: ["meal", "dietary", "allergies", "message"], defaults: ["dietary", "message"] },
    kinds: ["save_the_date", "invitation", "thank_you"],
    settings: [],
    wording: {
      save_the_date: "are celebrating their anniversary — please save the date",
      invitation: "invite you to celebrate their anniversary",
      thank_you: "thank you for celebrating with us",
    },
  },
  {
    slug: "christenings",
    name: "Christening & naming day",
    noun: "christening",
    description: "Christenings, baptisms and naming ceremonies, with extra privacy for children.",
    names: "single",
    fields: [
      { key: "childName", type: "text", label: "Child's name", maxLength: 30, required: true, default: "Rose" },
      date(),
      time("Service time"),
      venue("Church or venue"),
      invitationLine("You are warmly invited to the christening of"),
      leadField,
      photo(),
    ],
    sections: { available: ["countdown", "schedule", "venue", "gifts", "rsvp", "extra"], defaults: ["countdown", "schedule", "venue", "rsvp"] },
    reply: { fields: ["dietary", "allergies", "accessibility", "message"], defaults: ["dietary", "message"] },
    kinds: ["invitation", "thank_you"],
    settings: [childPrivacy],
    wording: {
      invitation: "You are warmly invited to the christening of",
      thank_you: "Thank you for being part of the day",
    },
  },
  {
    slug: "baby-showers",
    name: "Baby shower",
    noun: "baby shower",
    description: "A gentle invitation with gift ideas and an easy RSVP.",
    names: "single",
    fields: [
      { key: "honouree", type: "text", label: "Who is the shower for?", maxLength: 40, required: true, default: "Priya" },
      date(),
      time(),
      venue(),
      invitationLine("Please join us for a baby shower honouring"),
      leadField,
      photo(),
    ],
    sections: { available: ["countdown", "schedule", "venue", "gifts", "rsvp", "extra"], defaults: ["countdown", "venue", "gifts", "rsvp"] },
    reply: { fields: ["dietary", "allergies", "message"], defaults: ["dietary", "message"] },
    kinds: ["invitation", "thank_you"],
    settings: [childPrivacy, { key: "surprise", label: "It's a surprise", help: "Reminds every guest to keep it secret.", default: false }],
    wording: {
      invitation: "Please join us for a baby shower honouring",
      thank_you: "Thank you for the love and the lovely gifts",
    },
  },
  {
    slug: "corporate",
    name: "Corporate event",
    noun: "event",
    description: "Launches, dinners and summer parties, with your company's branding.",
    names: "organisation",
    fields: [
      { key: "organisation", type: "text", label: "Organisation", maxLength: 40, required: true, default: "Hartwell & Co." },
      { key: "eventName", type: "text", label: "Event name", maxLength: 50, required: true, default: "Summer Reception" },
      date(),
      time(),
      venue(),
      invitationLine("requests the pleasure of your company at"),
      leadField,
      { key: "logo", type: "image", label: "Logo", required: false },
    ],
    sections: { available: ["countdown", "schedule", "venue", "dress_code", "accommodation", "rsvp", "extra"], defaults: ["countdown", "schedule", "venue", "rsvp", "extra"] },
    reply: { fields: ["company", "dietary", "allergies", "accessibility", "message"], defaults: ["company", "dietary", "accessibility"] },
    kinds: ["save_the_date", "invitation", "thank_you"],
    settings: [{ key: "branding", label: "Use our brand colours", help: "Lets you set exact colours to match your brand.", default: true }],
    wording: {
      save_the_date: "Save the date",
      invitation: "requests the pleasure of your company at",
      thank_you: "Thank you for joining us",
    },
  },
  {
    slug: "celebrations",
    name: "Something else",
    noun: "celebration",
    description: "Retirements, reunions, garden parties — any gathering worth an invitation.",
    names: "single",
    fields: [
      { key: "eventName", type: "text", label: "What are you celebrating?", maxLength: 50, required: true, default: "A Midsummer Garden Party" },
      { key: "hostName", type: "text", label: "Hosted by", maxLength: 40, required: false, default: "The Ashworths" },
      date(),
      time(),
      venue(),
      invitationLine("You are invited to"),
      leadField,
      photo(),
    ],
    sections: { available: allSections, defaults: ["countdown", "venue", "rsvp"] },
    reply: { fields: ["dietary", "allergies", "song", "accessibility", "message"], defaults: ["dietary", "message"] },
    kinds: ["save_the_date", "invitation", "thank_you"],
    settings: [{ key: "surprise", label: "It's a surprise", help: "Reminds every guest to keep it secret.", default: false }],
    wording: {
      save_the_date: "Save the date",
      invitation: "You are invited to",
      thank_you: "Thank you for coming",
    },
  },
];

export const getOccasion = (slug: string) => occasions.find((o) => o.slug === slug);

/** Default per-event settings for an occasion, e.g. { hideAge: false, surprise: false }. */
export function defaultSettings(o: OccasionConfig): Record<string, boolean> {
  return Object.fromEntries(o.settings.map((s) => [s.key, s.default]));
}
