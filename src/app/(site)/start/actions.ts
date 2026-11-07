"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit, tooMany } from "@/lib/security/rate-limit";
import { signInSchema, signUpSchema, siteUrl } from "@/lib/auth/schemas";
import { prepareDraft, type StartDraft } from "@/lib/start/draft";
import { createEventFromDraft, START_DRAFT_COOKIE } from "@/lib/start/create";
import { getTemplate } from "@/lib/templates/library";

export type StartState =
  | {
      problems?: { field?: string; message: string }[];
      error?: string;
      /** Set once a new account is waiting for its email confirmation. */
      sentTo?: string;
      values?: Record<string, string>;
    }
  | undefined;

function draftFrom(form: FormData): StartDraft {
  const fields: Record<string, string> = {};
  const settings: Record<string, boolean> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("f:") && typeof v === "string") fields[k.slice(2)] = v;
    if (k.startsWith("s:")) settings[k.slice(2)] = v === "on";
  }
  return {
    occasion: String(form.get("occasion") ?? ""),
    kind: String(form.get("kind") ?? "") as StartDraft["kind"],
    template: String(form.get("template") ?? ""),
    fields,
    settings,
  };
}

const keep = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter(([k, v]) => typeof v === "string" && k !== "password").map(([k, v]) => [k, v as string]));

/**
 * The last step of the start flow. Signed in → create now. New customer →
 * create the account, keep the draft in a short-lived cookie, and finish
 * after they confirm their email (see /start/finish).
 */
export async function startInvitation(_: StartState, form: FormData): Promise<StartState> {
  const values = keep(form);
  const draft = draftFrom(form);
  const prepared = prepareDraft(draft, getTemplate);
  if (!prepared.ok) return { problems: prepared.problems, values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Saving isn't connected yet. Add the Supabase settings to .env.local.", values };

  let user = await getCurrentUser();

  if (!user && form.get("mode") === "signin") {
    const creds = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!creds.success) return { error: creds.error.issues[0].message, values };
    const rl = await rateLimit("login", creds.data.email);
    if (!rl.ok) return { error: tooMany(rl.retryAfter), values };
    const { error } = await supabase.auth.signInWithPassword(creds.data);
    if (error?.code === "email_not_confirmed") return { error: "Please confirm your email first: use the link we sent when you registered.", values };
    if (error) return { error: "That email and password don't match an account.", values };
    user = await getCurrentUser();
  }

  if (!user) {
    const acct = signUpSchema.safeParse(Object.fromEntries(form));
    if (!acct.success) return { error: acct.error.issues[0].message, values };
    const rl = await rateLimit("signup");
    if (!rl.ok) return { error: tooMany(rl.retryAfter), values };
    const { data, error } = await supabase.auth.signUp({
      email: acct.data.email,
      password: acct.data.password,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/confirm`,
        data: { full_name: acct.data.fullName, marketing_opt_in: acct.data.marketing === "on" },
      },
    });
    if (error) return { error: error.message, values };
    if (!data.session) {
      // Keep the draft (never the password) until the confirmation link is used.
      (await cookies()).set(START_DRAFT_COOKIE, JSON.stringify(draft), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 2,
      });
      return { sentTo: acct.data.email, values };
    }
  }

  const created = await createEventFromDraft(supabase, prepared.event);
  if (!created.ok) return { error: created.error, values };
  redirect(`/studio/${created.projectId}`);
}
