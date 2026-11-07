"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import type { Slot, TemplateDefinition } from "@/lib/templates/manifest";
import type { InvitationKind } from "@/lib/occasions/kinds";
import type { OccasionSetting } from "@/lib/occasions/registry";
import { startInvitation, type StartState } from "../../../actions";

export interface EssentialsProps {
  occasion: string;
  noun: string;
  kind: InvitationKind;
  template: TemplateDefinition;
  fields: Slot[];
  /** Sample values shown as hints, never submitted. */
  placeholders: Record<string, string>;
  settings: OccasionSetting[];
  /** Starting content (wording) for the live preview. */
  starter: Record<string, string>;
  media?: Record<string, string>;
  /** null while checking; false when signed out. */
  signedIn: { name: string | null; email: string } | false | null;
}

const input = "w-full border border-line bg-white px-3 py-3 text-base text-ink focus:border-ink";

export function EssentialsForm(p: EssentialsProps) {
  const [state, action, pending] = useActionState<StartState, FormData>(startInvitation, undefined);
  const prev = state?.values ?? {};
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(p.fields.map((f) => [f.key, prev[`f:${f.key}`] ?? ""])));
  const [mode, setMode] = useState<"signup" | "signin">((prev.mode as "signin") ?? "signup");
  // A field's message clears as soon as it's edited after the last submit.
  const [edited, setEdited] = useState<{ after: StartState; keys: string[] }>({ after: undefined, keys: [] });
  const editedKeys = edited.after === state ? edited.keys : [];
  const problem = (key: string) => (editedKeys.includes(key) ? undefined : state?.problems?.find((x) => x.field === key)?.message);
  const general = state?.error ?? state?.problems?.find((x) => !x.field)?.message;

  if (state?.sentTo) {
    return (
      <div role="status" className="max-w-lg border border-line bg-white p-6">
        <h2 className="text-3xl">Check your inbox</h2>
        <p className="mt-3 text-ink-soft">
          We&apos;ve sent a link to <strong className="text-ink">{state.sentTo}</strong>. Open it on this device and your invitation will be waiting in the studio, exactly as you left it. The link works for one hour.
        </p>
        <p className="mt-4 text-sm text-ink-soft">
          No email? Check spam, or <Link href="/login" className="underline underline-offset-4">sign in</Link> to send a new link.
        </p>
      </div>
    );
  }

  // Preview: sample wording, the customer's own names and date as they type.
  const previewSlots = { ...p.starter, ...Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())) };

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_360px] md:items-start">
      <form action={action} noValidate className="grid max-w-xl gap-5" aria-describedby={general ? "start-error" : undefined}>
        <input type="hidden" name="occasion" value={p.occasion} />
        <input type="hidden" name="kind" value={p.kind} />
        <input type="hidden" name="template" value={p.template.slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          {p.fields.map((f) => {
            const err = problem(f.key);
            const wide = f.key === "venue" || f.key === "eventName" || f.key === "organisation";
            return (
              <label key={f.key} className={`grid gap-1.5 text-sm text-ink-soft ${wide ? "sm:col-span-2" : ""}`}>
                {f.label}
                {!f.required && <span className="sr-only">(optional)</span>}
                <input
                  name={`f:${f.key}`}
                  type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                  inputMode={f.key === "age" ? "numeric" : undefined}
                  maxLength={f.maxLength}
                  required={f.required}
                  placeholder={f.type === "date" || f.type === "time" ? undefined : `e.g. ${p.placeholders[f.key]}`}
                  value={values[f.key] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [f.key]: e.target.value }));
                    setEdited({ after: state, keys: [...editedKeys, f.key] });
                  }}
                  aria-invalid={!!err}
                  aria-describedby={err ? `err-${f.key}` : undefined}
                  className={input}
                />
                {err && (
                  <span id={`err-${f.key}`} className="text-sm text-[#9b2c2c]">
                    {err}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {p.settings.length > 0 && (
          <fieldset className="grid gap-3 border-t border-line pt-5">
            <legend className="sr-only">Options</legend>
            {p.settings.map((s) => (
              <label key={s.key} className="flex items-start gap-3">
                <input type="checkbox" name={`s:${s.key}`} defaultChecked={prev[`s:${s.key}`] ? true : s.default} className="mt-1 h-5 w-5 accent-[#1c2238]" />
                <span>
                  <span className="block text-ink">{s.label}</span>
                  <span className="block text-sm text-ink-soft">{s.help}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="border-t border-line pt-5">
          {p.signedIn ? (
            <p className="text-sm text-ink-soft">Saving to your account, {p.signedIn.email}.</p>
          ) : p.signedIn === null ? (
            <p className="text-sm text-ink-soft">Checking your account…</p>
          ) : (
            <div className="grid gap-4">
              <input type="hidden" name="mode" value={mode} />
              <p className="text-ink">{mode === "signup" ? `Save your ${p.noun} so you can come back on any device.` : "Welcome back."}</p>
              {mode === "signup" && (
                <label className="grid gap-1.5 text-sm text-ink-soft">
                  Your name
                  <input name="fullName" autoComplete="name" defaultValue={prev.fullName} className={input} />
                </label>
              )}
              <label className="grid gap-1.5 text-sm text-ink-soft">
                Email
                <input name="email" type="email" autoComplete="email" defaultValue={prev.email} className={input} />
              </label>
              <label className="grid gap-1.5 text-sm text-ink-soft">
                Password
                <input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className={input} />
                {mode === "signup" && <span className="text-xs">At least 10 characters, with letters and a number.</span>}
              </label>
              {mode === "signup" && (
                <>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="terms" defaultChecked={prev.terms === "on"} className="mt-0.5 h-5 w-5 accent-[#1c2238]" />
                    <span>
                      I accept the{" "}
                      <Link href="/legal/terms" className="underline underline-offset-4">
                        terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/legal/privacy" className="underline underline-offset-4">
                        privacy notice
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-ink-soft">
                    <input type="checkbox" name="marketing" defaultChecked={prev.marketing === "on"} className="mt-0.5 h-5 w-5 accent-[#1c2238]" />
                    Send me occasional ideas and offers. You can stop any time.
                  </label>
                </>
              )}
              <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="justify-self-start py-2 text-sm underline underline-offset-4">
                {mode === "signup" ? "I already have an account" : "I'm new here: create an account"}
              </button>
            </div>
          )}
        </div>

        {general && (
          <p id="start-error" role="alert" className="text-sm text-[#9b2c2c]">
            {general}
          </p>
        )}
        <button disabled={pending || p.signedIn === null} className="btn btn-primary w-full disabled:opacity-60 sm:w-auto">
          {pending ? "Saving…" : "Open the studio"}
        </button>
        <p className="text-sm text-ink-soft">Free to design. You only pay when you publish.</p>
      </form>

      <aside aria-label="Live preview" className="order-first md:order-none md:sticky md:top-24">
        <div className="mx-auto w-48 md:w-full">
          <InvitationRenderer template={p.template} content={{ slots: previewSlots }} media={p.media} motion="still" />
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft">Updates as you type. Wording, photos and motion come next, in the studio.</p>
      </aside>
    </div>
  );
}
