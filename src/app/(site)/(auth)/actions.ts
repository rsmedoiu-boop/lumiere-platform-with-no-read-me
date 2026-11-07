"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, tooMany } from "@/lib/security/rate-limit";

export type AuthState = { error?: string; message?: string; fields?: Record<string, string> } | undefined;

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  // Only allow same-site relative paths (prevents open redirects).
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
};

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: String(form.get("email") ?? "") } };
  const rl = await rateLimit("login", parsed.data.email);
  if (!rl.ok) return { error: tooMany(rl.retryAfter), fields: { email: parsed.data.email } };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Sign-in isn't connected yet. Add the Supabase settings to .env.local." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed") {
    return { error: "Please confirm your email first: use the link we sent when you registered.", fields: { email: parsed.data.email } };
  }
  // Same message for unknown email and wrong password: don't reveal which accounts exist.
  if (error) return { error: "That email and password don't match an account.", fields: { email: parsed.data.email } };
  redirect(safeNext(form.get("next")));
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(128)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use letters and at least one number"),
  terms: z.literal("on", { error: "Please accept the terms and privacy notice" }),
  marketing: z.string().optional(),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const parsed = signUpSchema.safeParse(raw);
  const fields = { fullName: String(raw.fullName ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const rl = await rateLimit("signup");
  if (!rl.ok) return { error: tooMany(rl.retryAfter), fields };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Registration isn't connected yet. Add the Supabase settings to .env.local.", fields };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
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
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${site}/auth/confirm?next=/dashboard/settings` });
  // Same answer whether or not the account exists.
  return { message: "If an account uses that address, a reset link is on its way." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
