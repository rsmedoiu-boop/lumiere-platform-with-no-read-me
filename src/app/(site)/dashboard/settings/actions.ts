"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newPasswordSchema } from "@/lib/auth/schemas";

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

/** Choose a new password. Works for a signed-in customer, including straight after following a reset link. */
export async function changePassword(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireUser("/dashboard/settings");
  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = (await createSupabaseServerClient())!;
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Please choose a password you haven't used before." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Please choose another." };
    return { error: "We couldn't change your password. Please try again." };
  }
  return { message: "Your password has been changed." };
}
