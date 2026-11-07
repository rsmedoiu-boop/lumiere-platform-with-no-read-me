/**
 * DRAFT legal content for review by a UK solicitor before launch.
 * Kept as data so a CMS or translated versions can replace it later.
 */
import { brand } from "@/lib/brand";

export interface LegalDoc {
  slug: string;
  title: string;
  sections: { heading: string; body: string[] }[];
}

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy notice",
    sections: [
      {
        heading: "Who we are",
        body: [
          `${brand.legalEntity} provides digital invitations, event websites, RSVP, guest management and seating tools. For your account and orders we are the data controller. For the guest details you add to your event, we act on your instructions as your processor.`,
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Your account: name, email address, password (stored only as a secure hash), and your marketing choice.",
          "Your event: names, dates, venues, wording, photographs and videos you upload.",
          "Your guests: names, contact details you provide, replies, meal choices, dietary requirements and allergies. Allergy information is health data, so it is only ever shown to you and, if you choose, your venue.",
          "Orders: what you bought and payment status. Card details are handled by Stripe and never reach us.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To provide the service you bought (contract), to keep the service secure and prevent fraud (legitimate interests), to keep tax records (legal obligation), and to send marketing only if you opted in (consent).",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Service providers who process data for us under contract: Supabase (database and storage, UK region), Stripe (payments), Resend (email), Vercel and Cloudflare (hosting and media delivery). For AI cinematic films only, with your explicit consent: Higgsfield (video generation). Photographs marked as including children are never sent for AI generation.",
          "We never sell personal data.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Event content, guest data and media: until 12 months after your event date, unless you extend or delete sooner. We email you 30 and 7 days before deletion.",
          "Order and payment records: 6 years, for tax law.",
          "Your account: until you delete it. Deletion completes 14 days after your request.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can access, correct, download or delete your data, object to or restrict processing, and withdraw consent at any time. Guests can contact the couple, or us, about their details.",
          `Contact ${brand.supportEmail}. You can also complain to the Information Commissioner's Office (ico.org.uk).`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie policy",
    sections: [
      {
        heading: "Essential cookies",
        body: [
          "Sign-in session cookies (set by our authentication provider) keep you signed in and protect your account. A preference cookie remembers your cookie choice. These are strictly necessary and don't need consent.",
        ],
      },
      {
        heading: "Optional cookies",
        body: [
          "Analytics cookies are off unless you switch them on in Cookie settings. We don't use advertising cookies. You can change your choice at any time from the link in the footer.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms and conditions",
    sections: [
      {
        heading: "The service",
        body: [
          "We provide digital invitation designs, event websites, RSVP and guest tools, a seating planner and venue exports. Features depend on the package you buy.",
        ],
      },
      {
        heading: "Payment and cancellation",
        body: [
          "Prices are shown before you pay and charged once per event. Digital content starts when you publish. By publishing you agree that it begins immediately, and you acknowledge that the 14-day cancellation right ends once it does, as UK consumer law allows.",
          "AI cinematic films include a stated number of drafts. Results from AI tools vary, and we will work with you to reach a result you're happy with within that allowance.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You keep ownership of what you upload. You confirm you have permission to use it, including permission from people shown in photographs, and from a parent or guardian for any child shown. You give us a licence to host and display it to provide the service.",
          "You are responsible for the guest data you add. We process it only to provide the service to you.",
        ],
      },
      {
        heading: "Availability and liability",
        body: [
          "We aim for the service to be available at all times but can't guarantee it. Nothing in these terms limits liability that cannot be limited by law.",
        ],
      },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable use",
    sections: [
      {
        heading: "Please don't",
        body: [
          "Upload content you don't have rights to, impersonate others, harass anyone, or upload unlawful material. Don't try to access other customers' events or guest data, or to overload or probe the service. We may remove content or suspend accounts that break these rules.",
        ],
      },
    ],
  },
];
