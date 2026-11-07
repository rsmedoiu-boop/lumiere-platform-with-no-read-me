"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "../actions";
import { FormMessage } from "@/components/ui/AuthCard";

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.message) return <FormMessage message={state.message} />;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage error={state?.error} />
      <div className="field">
        <label htmlFor="fullName">Your name</label>
        <input id="fullName" name="fullName" autoComplete="name" required defaultValue={state?.fields?.fullName} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required aria-describedby="pw-hint" />
        <p id="pw-hint" className="text-xs text-ink-soft">At least 10 characters, with letters and a number.</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-1" />
        <span>
          I agree to the{" "}
          <Link href="/legal/terms" className="underline underline-offset-4">terms</Link> and have read the{" "}
          <Link href="/legal/privacy" className="underline underline-offset-4">privacy notice</Link>.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="marketing" className="mt-1" />
        <span>Send me occasional design news and offers. You can unsubscribe at any time.</span>
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm text-ink-soft">
        Already have an account? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}
