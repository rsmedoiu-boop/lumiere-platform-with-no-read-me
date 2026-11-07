"use client";

/**
 * One reply for the whole household. Validation comes from the shared RSVP
 * schema, so the browser and (from Milestone 5) the server agree exactly.
 * In preview mode nothing is sent or stored.
 */
import { useState } from "react";
import { householdReplySchema, summariseReply, type HouseholdReply, type InvitedMember } from "@/lib/rsvp/schema";

type Draft = Record<string, { attending?: "yes" | "no"; meal?: string; childMeal?: boolean; dietary?: string; allergies?: string; showNeeds?: boolean }>;

export function RsvpForm({
  household,
  meals,
  childMealOffered,
  deadlineLabel,
  hostsLabel,
  preview = false,
}: {
  hostsLabel: string;
  household: { name: string; members: InvitedMember[] };
  meals: string[];
  childMealOffered: boolean;
  deadlineLabel: string;
  preview?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(household.members.map((m) => [m.id, { childMeal: m.isChild && childMealOffered }])),
  );
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<HouseholdReply | null>(null);

  const set = (id: string, patch: Draft[string]) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = {
      members: household.members.map((m) => ({
        guestId: m.id,
        attending: draft[m.id]?.attending,
        meal: draft[m.id]?.childMeal ? undefined : draft[m.id]?.meal,
        childMeal: !!draft[m.id]?.childMeal,
        dietary: draft[m.id]?.dietary || undefined,
        allergies: draft[m.id]?.allergies || undefined,
      })),
      message: message || undefined,
    };
    const parsed = householdReplySchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const idx = issue.path[1];
        const id = typeof idx === "number" ? household.members[idx]?.id : "form";
        if (id && !next[id]) next[id] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSent(parsed.data);
  };

  if (sent) {
    const s = summariseReply(sent);
    const first = household.members[0]?.firstName;
    return (
      <div role="status" className="text-center">
        <p className="font-display text-4xl">Thank you{first ? `, ${first}` : ""}</p>
        <p className="mx-auto mt-4 max-w-md text-[color:var(--ev-muted)]">
          {s.coming === 0
            ? "We're sorry you can't make it, and we'll miss you."
            : `We've noted ${s.coming} of ${household.members.length} coming. A confirmation is on its way to your inbox.`}{" "}
          You can change your reply until {deadlineLabel}.
        </p>
        {preview && <p className="mt-6 text-xs text-[color:var(--ev-muted)]">Preview: this reply wasn&apos;t saved or sent.</p>}
        <button type="button" onClick={() => setSent(null)} className="mt-8 text-sm underline underline-offset-4">
          Change my reply
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-8">
      {household.members.map((m) => {
        const d = draft[m.id] ?? {};
        const name = [m.firstName, m.lastName].filter(Boolean).join(" ");
        const errId = `err-${m.id}`;
        return (
          <fieldset key={m.id} className="border-t border-[color:var(--ev-line)] pt-6" aria-describedby={errors[m.id] ? errId : undefined}>
            <legend className="font-display text-2xl">
              {name}
              {m.isChild && <span className="ml-2 font-sans text-xs text-[color:var(--ev-muted)]">child</span>}
            </legend>
            <div className="mt-4 flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`attending-${m.id}`}
                    value={v}
                    checked={d.attending === v}
                    onChange={() => set(m.id, { attending: v })}
                    className="peer sr-only"
                  />
                  <span className="inline-block rounded-full border border-[color:var(--ev-line)] px-5 py-2.5 text-sm transition-colors peer-checked:border-[color:var(--ev-accent)] peer-checked:bg-[color:var(--ev-accent)] peer-checked:text-[color:var(--ev-bg)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ev-accent)]">
                    {v === "yes" ? "Joyfully accepts" : "Regretfully declines"}
                  </span>
                </label>
              ))}
            </div>
            {d.attending === "yes" && (
              <div className="mt-5 grid gap-4">
                {m.isChild && childMealOffered ? (
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" checked={!!d.childMeal} onChange={(e) => set(m.id, { childMeal: e.target.checked })} />
                    Children&apos;s menu
                  </label>
                ) : null}
                {!d.childMeal && (
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-[color:var(--ev-muted)]">Main course</span>
                    <select
                      value={d.meal ?? ""}
                      onChange={(e) => set(m.id, { meal: e.target.value })}
                      className="rounded-[2px] border border-[color:var(--ev-line)] bg-transparent px-3 py-3 text-[color:var(--ev-ink)] [&>option]:text-black"
                    >
                      <option value="" disabled>
                        Choose a main course
                      </option>
                      {meals.map((meal) => (
                        <option key={meal}>{meal}</option>
                      ))}
                    </select>
                  </label>
                )}
                {!d.showNeeds ? (
                  <button type="button" onClick={() => set(m.id, { showNeeds: true })} className="justify-self-start text-sm underline underline-offset-4">
                    Add dietary needs or allergies
                  </button>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-[color:var(--ev-muted)]">Dietary needs</span>
                      <input
                        value={d.dietary ?? ""}
                        onChange={(e) => set(m.id, { dietary: e.target.value })}
                        placeholder="e.g. vegan, halal"
                        className="rounded-[2px] border border-[color:var(--ev-line)] bg-transparent px-3 py-3 placeholder:text-[color:var(--ev-muted)]/70"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="text-[color:var(--ev-muted)]">Allergies</span>
                      <input
                        value={d.allergies ?? ""}
                        onChange={(e) => set(m.id, { allergies: e.target.value })}
                        placeholder="e.g. tree nuts"
                        className="rounded-[2px] border border-[color:var(--ev-line)] bg-transparent px-3 py-3 placeholder:text-[color:var(--ev-muted)]/70"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
            {errors[m.id] && (
              <p id={errId} role="alert" className="mt-3 text-sm text-[#f0a8a0]">
                {errors[m.id]}
              </p>
            )}
          </fieldset>
        );
      })}
      <label className="grid gap-1.5 border-t border-[color:var(--ev-line)] pt-6 text-sm">
        <span className="text-[color:var(--ev-muted)]">A note for {hostsLabel} (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          className="rounded-[2px] border border-[color:var(--ev-line)] bg-transparent px-3 py-3"
        />
      </label>
      <button className="justify-self-center rounded-full bg-[color:var(--ev-accent)] px-9 py-3.5 text-sm font-medium tracking-wide text-[color:var(--ev-bg)] hover:opacity-90">
        Send our reply
      </button>
      <p className="-mt-4 text-center text-xs text-[color:var(--ev-muted)]">Please reply by {deadlineLabel}.</p>
    </form>
  );
}
