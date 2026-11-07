/** A complete sample wedding used for the template preview at /e/demo. All names and places are fictional. */
import { getTemplate } from "@/lib/templates/library";
import type { EventSiteData } from "./site";
import type { InvitedMember } from "@/lib/rsvp/schema";

export const demoEvent: EventSiteData = {
  slug: "demo",
  locale: "en-GB",
  timezone: "Europe/London",
  startsAt: "2027-06-12T14:00:00+01:00",
  hosts: ["Sarah", "James"],
  invitation: {
    template: getTemplate("midnight-garden")!,
    content: {
      slots: {
        partnerOne: "Sarah",
        partnerTwo: "James",
        date: "2027-06-12",
        time: "14:00",
        venue: "Ashcombe House, Oxfordshire",
        invitationLine: "request the pleasure of your company to celebrate their marriage",
      },
    },
  },
  story: {
    heading: "Ten years after a missed train",
    body: [
      "We met on a cancelled 18:42 from Paddington, sharing the last table in a station café and a very long wait.",
      "A decade, two flats and one rescue greyhound later, we'd love you to celebrate with us in the Oxfordshire countryside.",
    ],
  },
  schedule: [
    { time: "13:30", title: "Guests arrive", place: "The Orangery", note: "Welcome drinks on the lawn" },
    { time: "14:00", title: "Ceremony", place: "The Orangery" },
    { time: "15:00", title: "Drinks and canapés", place: "South Terrace" },
    { time: "17:30", title: "Wedding breakfast", place: "The Great Hall" },
    { time: "20:30", title: "First dance and party", place: "The Ballroom" },
    { time: "00:00", title: "Carriages" },
  ],
  venue: {
    name: "Ashcombe House",
    address: "Ashcombe Lane, Little Ashcombe, Oxfordshire",
    mapQuery: "Oxfordshire, United Kingdom",
    parking: "Free parking on site. Cars may stay overnight and be collected by 11:00 the next morning.",
    transport: "The nearest station is 10 minutes away by taxi. A shuttle leaves for town at 00:15.",
  },
  dressCode: {
    title: "Black tie optional",
    body: "Dinner jackets or dark suits; floor-length or cocktail dresses. The ceremony is on grass, so you may prefer block heels.",
  },
  accommodation: [
    { name: "The Fox & Lantern", distance: "5 minutes' walk", note: "Rooms held until 1 March under \"Sarah & James\"" },
    { name: "Kingsmere Hotel", distance: "15 minutes by car" },
    { name: "Willow Barn Cottages", distance: "12 minutes by car", note: "Self-catering cottages for families" },
  ],
  extra: [
    { q: "Can I bring a plus-one?", a: "If your invitation includes a guest, their name will appear on your RSVP. We're keeping numbers small, so we can't add others." },
    { q: "Are children welcome?", a: "Yes. Children named on your invitation are very welcome, with their own menu and an entertainer during dinner." },
    { q: "Is there a gift list?", a: "Your company is the gift. If you'd like to, a contribution to our honeymoon fund can be made on the day." },
  ],
  rsvp: { deadline: "2027-04-30", meals: ["Spring lamb", "Hake with samphire", "Wild mushroom risotto (vegetarian)"], childMeal: true },
  media: {
    backdrop: "/media/night-garden-900.webp",
    backdropVideo: "/media/night-garden-loop.mp4",
    storyPhoto: "/media/couple-garden-800.webp",
    storyPhotoAlt: "Sarah and James walking through a garden under festoon lights",
  },
  sections: ["countdown", "story", "schedule", "venue", "dress_code", "accommodation", "rsvp", "extra"],
};

/** The household whose invitation link the demo opens as. */
export const demoHousehold: { name: string; members: InvitedMember[] } = {
  name: "The Patel family",
  members: [
    { id: "g1", firstName: "Anika", lastName: "Patel" },
    { id: "g2", firstName: "Raj", lastName: "Patel" },
    { id: "g3", firstName: "Maya", lastName: "Patel", isChild: true },
  ],
};

export function getEventSite(slug: string): EventSiteData | null {
  // Milestone 3: published events load from the database here.
  return slug === demoEvent.slug ? demoEvent : null;
}
