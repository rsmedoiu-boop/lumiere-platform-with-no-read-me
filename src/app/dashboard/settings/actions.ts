"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; message?: string } | undefined;

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  marketing: z.string().optional(),
});

export async function updateProfile(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser("/dashboard/settings");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = (await createSupabaseServerClient())!;
  const marketing = parsed.data.marketing === "on";
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, marketing_opt_in: marketing, marketing_opt_in_at: marketing ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (error) return { error: "Your changes couldn't be saved. Please try again." };
  revalidatePath("/dashboard/settings");
  return { message: "Changes saved." };
}

export async function requestDeletion(): Promise<SettingsState> {
  await requireUser("/dashboard/settings");
  const supabase = (await createSupabaseServerClient())!;
  const { error } = await supabase.rpc("request_account_deletion");
  if (error) return { error: "We couldn't schedule the deletion. Please contact support." };
  revalidatePath("/dashboard/settings");
  return { message: "Deletion scheduled." };
}

export async function cancelDeletion(): Promise<SettingsState> {
  await requireUser("/dashboard/settings");
  const supabase = (await createSupabaseServerClient())!;
  await supabase.rpc("cancel_account_deletion");
  revalidatePath("/dashboard/settings");
  return { message: "Deletion cancelled. Your account stays." };
}
