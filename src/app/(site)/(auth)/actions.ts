"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, tooMany } from "@/lib/security/rate-limit";
import { signInSchema, signUpSchema, siteUrl } from "@/lib/auth/schemas";

export type AuthState = { error?: string; message?: string; fields?: Record<string, string>; unconfirmed?: boolean } | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  // Only allow same-site relative paths (prevents open redirects).
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
};

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: String(form.get("email") ?? "") } };
  const rl = await rateLimit("login", parsed.data.email);
  if (!rl.ok) return { error: tooMany(rl.retryAfter), fields: { email: parsed.data.email } };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Sign-in isn't connected yet. Add the Supabase settings to .env.local." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return {
      error: "Please confirm your email first: use the link we sent when you registered.",
      fields: { email: parsed.data.email },
      unconfirmed: true,
    };
  }
  // Same message for unknown email and wrong password: don't reveal which accounts exist.
  if (error) return { error: "That email and password don't match an account.", fields: { email: parsed.data.email } };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = signUpSchema.safeParse(raw);
  const fields = { fullName: String(raw.fullName ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const rl = await rateLimit("signup");
  if (!rl.ok) return { error: tooMany(rl.retryAfter), fields };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Registration isn't connected yet. Add the Supabase settings to .env.local.", fields };
  const site = siteUrl();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${site}/auth/confirm`,
      data: { full_name: parsed.data.fullName, marketing_opt_in: parsed.data.marketing === "on" },
    },
  });
  if (error) return { error: error.message, fields };
  return { message: "Check your inbox: we've sent a link to confirm your email address." };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address" };
  const rl = await rateLimit("passwordReset", email.data);
  if (!rl.ok) return { error: tooMany(rl.retryAfter) };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Password reset isn't connected yet." };
  const site = siteUrl();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${site}/auth/confirm?next=/dashboard/settings%23password` });
  // Same answer whether or not the account exists.
  return { message: "If an account uses that address, a reset link is on its way." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function resendConfirmation(_: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address" };
  const rl = await rateLimit("passwordReset", `confirm:${email.data}`);
  if (!rl.ok) return { error: tooMany(rl.retryAfter), fields: { email: email.data }, unconfirmed: true };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Sign-in isn't connected yet." };
  const site = siteUrl();
  const { error } = await supabase.auth.resend({ type: "signup", email: email.data, options: { emailRedirectTo: `${site}/auth/confirm` } });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "We've sent several emails already. Please wait a little and try again.", fields: { email: email.data }, unconfirmed: true };
  }
  // Same answer whether or not the account exists.
  return { message: "If that account is waiting for confirmation, a new link is on its way. It works for one hour.", fields: { email: email.data } };
}
