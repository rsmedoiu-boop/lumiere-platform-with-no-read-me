"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resendConfirmation, signIn } from "../actions";
import { FormMessage } from "@/components/ui/AuthCard";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(signIn, undefined);
  const [resent, resend, resending] = useActionState(resendConfirmation, undefined);
  const linkError = params.get("error") === "link" ? "That link has expired or was already used. Sign in or request a new one." : undefined;
  const knownEmail = state?.fields?.email ?? resent?.fields?.email;
  const needsConfirm = state?.unconfirmed || resent?.unconfirmed || params.get("error") === "link";
  return (
    <div className="grid gap-6">
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={params.get("next") ?? "/dashboard"} />
      <FormMessage error={state?.error ?? linkError} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm text-ink-soft">
        <Link href="/reset-password" className="underline underline-offset-4">
          Forgotten password
        </Link>
        <Link href="/register" className="underline underline-offset-4">
          Create an account
        </Link>
      </div>
    </form>
    {needsConfirm && (
      <form action={resend} className="grid gap-3 border-t border-line pt-5">
        <FormMessage error={resent?.error} message={resent?.message} />
        <p className="text-sm text-ink-soft">Confirmation links work for one hour. Need a new one?</p>
        {knownEmail ? (
          <input type="hidden" name="email" value={knownEmail} />
        ) : (
          <div className="field">
            <label htmlFor="resend-email">Email</label>
            <input id="resend-email" name="email" type="email" autoComplete="email" required />
          </div>
        )}
        <button className="btn btn-quiet justify-self-start" disabled={resending}>
          {resending ? "Sending…" : "Send a new confirmation email"}
        </button>
      </form>
    )}
    </div>
  );
}
