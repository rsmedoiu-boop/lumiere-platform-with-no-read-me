"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui/AuthCard";
import { cancelDeletion, changePassword, requestDeletion, updateProfile } from "./actions";

export function ProfileForm({ fullName, email, marketing }: { fullName: string; email: string; marketing: boolean }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid max-w-md gap-5">
      <FormMessage error={state?.error} message={state?.message} />
      <div className="field">
        <label htmlFor="fullName">Your name</label>
        <input id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" value={email} readOnly aria-describedby="email-hint" />
        <p id="email-hint" className="text-xs text-ink-soft">To change your email, contact support.</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={marketing} className="mt-1" />
        <span>Send me occasional design news and offers.</span>
      </label>
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="grid max-w-md gap-5">
      <FormMessage error={state?.error} message={state?.message} />
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required aria-describedby="pw-hint" />
        <p id="pw-hint" className="text-xs text-ink-soft">At least 10 characters, with letters and a number.</p>
      </div>
      <div className="field">
        <label htmlFor="confirm">Type it again</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <button className="btn btn-primary justify-self-start" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function DeletionControls({ scheduledFor }: { scheduledFor: string | null }) {
  const [state, action, pending] = useActionState(scheduledFor ? cancelDeletion : requestDeletion, undefined);
  return (
    <form
      action={action}
      className="grid max-w-md gap-4"
      onSubmit={(e) => {
        if (!scheduledFor && !window.confirm("Delete your account, events, guest lists and seating plans? You have 14 days to change your mind.")) {
          e.preventDefault();
        }
      }}
    >
      <FormMessage error={state?.error} message={state?.message} />
      {scheduledFor ? (
        <>
          <p className="text-sm">
            Your account will be deleted on <strong>{scheduledFor}</strong>. Until then you can keep using it and cancel at any time.
          </p>
          <button className="btn btn-quiet justify-self-start" disabled={pending}>Keep my account</button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            This deletes your account, events, invitations, guest lists, seating plans and uploads after a 14-day grace period.
            Order records are kept for 6 years for tax purposes, without a link to your account.
          </p>
          <button className="btn justify-self-start border border-danger text-danger hover:bg-danger hover:text-paper" disabled={pending}>
            Delete my account
          </button>
        </>
      )}
    </form>
  );
}
