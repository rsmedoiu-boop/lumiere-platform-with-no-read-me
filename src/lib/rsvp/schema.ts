/**
 * RSVP rules shared by the guest form, the server action (Milestone 5) and
 * any future mobile app. One household replies for all its members.
 */
import { z } from "zod";

export const memberReplySchema = z
  .object({
    guestId: z.string().min(1),
    attending: z.enum(["yes", "no"], { error: "Let us know if each guest can come" }),
    meal: z.string().max(60).optional(),
    childMeal: z.boolean().optional(),
    dietary: z.string().trim().max(300).optional(),
    allergies: z.string().trim().max(300).optional(),
  })
  .refine((m) => m.attending === "no" || m.childMeal || !!m.meal, {
    message: "Choose a meal for each guest who is coming",
    path: ["meal"],
  });

export const householdReplySchema = z.object({
  members: z.array(memberReplySchema).min(1),
  message: z.string().trim().max(2000).optional(),
});

export type HouseholdReply = z.infer<typeof householdReplySchema>;

export interface InvitedMember { id: string; firstName: string; lastName?: string; isChild?: boolean; isPlusOne?: boolean }

export function summariseReply(reply: HouseholdReply) {
  const coming = reply.members.filter((m) => m.attending === "yes");
  return {
    coming: coming.length,
    notComing: reply.members.length - coming.length,
    allergies: coming.filter((m) => m.allergies).length,
  };
}
