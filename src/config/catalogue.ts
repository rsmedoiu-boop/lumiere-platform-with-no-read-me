/**
 * Launch catalogue — the single editable source for products and prices.
 *
 * `npm run db:seed` turns this into supabase/seed.sql. At runtime the app
 * reads prices from the database (admins edit them there), so nothing in the
 * UI hard-codes an amount. Amounts are minor units (pence) per currency, which
 * lets us add EUR/USD prices later without a schema change.
 */

export type FeatureKey =
  | "invitation_classic"
  | "invitation_premium"
  | "personal_media"
  | "ai_cinematic"
  | "website"
  | "countdown"
  | "rsvp"
  | "guest_management"
  | "seating"
  | "venue_handover"
  | "bespoke_service";

export interface CatalogueProduct {
  slug: string;
  name: string;
  description: string;
  features: FeatureKey[];
  aiGenerationAllowance: number;
  isFromPrice?: boolean;
  prices: Partial<Record<"GBP" | "EUR" | "USD", number>>;
  highlight?: boolean;
}

export const categories = [
  { slug: "weddings", name: "Weddings", sortOrder: 1, isActive: true },
  // Ready for later launches — switched on by flipping isActive.
  { slug: "engagements", name: "Engagements", sortOrder: 2, isActive: false },
  { slug: "birthdays", name: "Birthdays", sortOrder: 3, isActive: false },
  { slug: "christenings", name: "Christenings", sortOrder: 4, isActive: false },
  { slug: "anniversaries", name: "Anniversaries", sortOrder: 5, isActive: false },
  { slug: "corporate", name: "Corporate events", sortOrder: 6, isActive: false },
] as const;

export const products: CatalogueProduct[] = [
  {
    slug: "classic-animated",
    name: "Classic Animated Invitation",
    description: "A ready-made animated design, personalised with your names, date and venue.",
    features: ["invitation_classic", "countdown"],
    aiGenerationAllowance: 0,
    prices: { GBP: 1999 },
  },
  {
    slug: "premium-editable",
    name: "Premium Editable Invitation",
    description: "Our premium collection with editable wording, colours and typography.",
    features: ["invitation_premium", "countdown"],
    aiGenerationAllowance: 0,
    prices: { GBP: 3499 },
  },
  {
    slug: "personalised-video",
    name: "Personalised Video Invitation",
    description: "Your own photographs and video clips woven into an animated invitation.",
    features: ["invitation_premium", "personal_media", "countdown"],
    aiGenerationAllowance: 0,
    prices: { GBP: 5999 },
  },
  {
    slug: "ai-cinematic",
    name: "AI Cinematic Invitation",
    description: "A studio-crafted cinematic film built around your story, with storyboard approval.",
    features: ["invitation_premium", "personal_media", "ai_cinematic", "countdown"],
    aiGenerationAllowance: 4,
    prices: { GBP: 8999 },
  },
  {
    slug: "website-rsvp",
    name: "Wedding Website & RSVP",
    description: "A beautiful event website with personal RSVP links and guest management.",
    features: ["website", "countdown", "rsvp", "guest_management"],
    aiGenerationAllowance: 0,
    prices: { GBP: 4999 },
  },
  {
    slug: "complete-experience",
    name: "Complete Wedding Experience",
    description:
      "Premium invitation, your photos and video, website, RSVP, guest management, Smart Seating Planner and Venue Handover Pack.",
    features: [
      "invitation_premium",
      "personal_media",
      "website",
      "countdown",
      "rsvp",
      "guest_management",
      "seating",
      "venue_handover",
    ],
    aiGenerationAllowance: 0,
    prices: { GBP: 11999 },
    highlight: true,
  },
  {
    slug: "bespoke-premium",
    name: "Bespoke Premium Service",
    description: "A one-of-a-kind design created with our studio, from concept to final film.",
    features: [
      "invitation_premium",
      "personal_media",
      "ai_cinematic",
      "website",
      "countdown",
      "rsvp",
      "guest_management",
      "seating",
      "venue_handover",
      "bespoke_service",
    ],
    aiGenerationAllowance: 8,
    isFromPrice: true,
    prices: { GBP: 14999 },
  },
];
