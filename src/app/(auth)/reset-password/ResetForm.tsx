"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { FormMessage } from "@/components/ui/AuthCard";

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage error={state?.error} message={state?.message} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
