"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { motionLevelInfo, motionLevels, openingInfo, openingsFor, type MotionLevel, type OpeningKey } from "@/lib/cinema/motion";
import { resolveMotion, resolveTheme, type InvitationContent, type TemplateDefinition } from "@/lib/templates/manifest";
import type { FieldGroup } from "@/lib/studio/content";
import { saveDraft } from "./actions";

type Status = { kind: "saved" } | { kind: "saving" } | { kind: "unsaved" } | { kind: "error"; message: string } | { kind: "stale"; message: string };

const input = "w-full border border-line bg-white px-3 py-3 text-base text-ink focus:border-ink";
const paletteLabels = { background: "Paper", ink: "Text", accent: "Accent", muted: "Soft text" } as const;

export function StudioEditor(p: {
  projectId: string;
  template: TemplateDefinition;
  groups: FieldGroup[];
  initial: InvitationContent;
  version: number;
  hideAge: boolean;
  placeholders: Record<string, string>;
  media?: Record<string, string>;
}) {
  const [content, setContent] = useState<InvitationContent>(p.initial);
  const [status, setStatus] = useState<Status>({ kind: "saved" });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"preview" | "edit">("edit");
  const [replay, setReplay] = useState(0);
  const version = useRef(p.version);
  const saved = useRef(JSON.stringify(p.initial));
  const inFlight = useRef(false);

  const manifest = p.template.manifest;
  const openings = openingsFor(manifest);
  const motion = resolveMotion(manifest, content);
  const theme = resolveTheme(manifest, content);

  const edit = (next: InvitationContent) => {
    setContent(next);
    setStatus((s) => (s.kind === "stale" ? s : { kind: "unsaved" }));
  };
  const setSlot = (key: string, value: string) => edit({ ...content, slots: { ...content.slots, [key]: value } });

  const save = useCallback(async () => {
    if (inFlight.current) return;
    const body = JSON.stringify(content);
    if (body === saved.current) {
      setStatus({ kind: "saved" });
      return;
    }
    inFlight.current = true;
    setStatus({ kind: "saving" });
    try {
      const r = await saveDraft(p.projectId, content, version.current);
      if (r.ok) {
        version.current = r.version;
        saved.current = body;
        setProblems({});
        setStatus({ kind: "saved" });
      } else if (r.reason === "invalid") {
        setProblems(Object.fromEntries(r.problems.filter((x) => x.slot).map((x) => [x.slot!, x.message])));
        setStatus({ kind: "error", message: r.problems.find((x) => !x.slot)?.message ?? "Some details need fixing before they can be saved." });
      } else if (r.reason === "stale") {
        setStatus({ kind: "stale", message: r.message });
      } else {
        setStatus({ kind: "error", message: r.message });
      }
    } catch {
      setStatus({ kind: "error", message: "You seem to be offline. We'll save as soon as you're back." });
    } finally {
      inFlight.current = false;
    }
  }, [content, p.projectId]);

  // Save shortly after the last change; retry after a failure.
  useEffect(() => {
    if (status.kind !== "unsaved" && status.kind !== "error") return;
    const t = setTimeout(save, status.kind === "error" ? 5000 : 900);
    return () => clearTimeout(t);
  }, [content, status.kind, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (status.kind === "unsaved" || status.kind === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status.kind]);

  const label =
    status.kind === "saved" ? "Saved" : status.kind === "saving" ? "Saving…" : status.kind === "unsaved" ? "Unsaved changes" : status.kind === "stale" ? "Changed elsewhere" : "Couldn't save";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-6 md:pb-16 md:pt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-ink-soft">
          <span aria-hidden className={`h-2 w-2 rounded-full ${status.kind === "saved" ? "bg-[#5f9f78]" : status.kind === "saving" || status.kind === "unsaved" ? "bg-[#c9a24b]" : "bg-[#b4493f]"}`} />
          {label}
        </p>
        <div className="flex gap-2">
          <Link href={`/studio/${p.projectId}/preview`} className="btn btn-primary">
            Watch as a guest
          </Link>
          <Link href="/dashboard" className="btn btn-quiet">
            Dashboard
          </Link>
        </div>
      </div>

      {(status.kind === "stale" || status.kind === "error") && (
        <div role="alert" className="mb-5 border border-line bg-white p-4 text-sm text-ink-soft">
          {status.message}{" "}
          {status.kind === "stale" && (
            <button type="button" className="underline underline-offset-4" onClick={() => window.location.reload()}>
              Reload
            </button>
          )}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[minmax(0,400px)_1fr] md:items-start">
        <section aria-label="Live preview" className={`${tab === "preview" ? "block" : "hidden"} md:sticky md:top-6 md:block`}>
          <div className="mx-auto w-full max-w-[400px] shadow-[0_40px_80px_-40px_rgba(28,34,56,0.6)]">
            <InvitationRenderer key={`${replay}-${motion.level}`} template={p.template} content={content} media={p.media} motion={motion.level} hideAge={p.hideAge} />
          </div>
          <div className="mt-4 flex justify-center">
            <button type="button" className="btn btn-quiet" onClick={() => setReplay((n) => n + 1)}>
              Replay
            </button>
          </div>
        </section>

        <section aria-label="Edit your invitation" className={`${tab === "edit" ? "grid" : "hidden"} gap-8 md:grid`}>
          {p.groups.map((g) => (
            <fieldset key={g.id} className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-2xl">{g.title}</legend>
              {g.fields.map((f) => {
                const wide = f.key === "venue" || f.key === "invitationLine" || f.key === "lead" || f.key === "eventName" || f.key === "organisation";
                const err = problems[f.key];
                const long = f.key === "invitationLine";
                return (
                  <label key={f.key} className={`grid gap-1.5 text-sm text-ink-soft ${wide ? "sm:col-span-2" : ""}`}>
                    {f.label}
                    {long ? (
                      <textarea
                        rows={3}
                        maxLength={f.maxLength}
                        value={content.slots[f.key] ?? ""}
                        onChange={(e) => setSlot(f.key, e.target.value)}
                        className={input}
                        aria-invalid={!!err}
                      />
                    ) : (
                      <input
                        name={f.key}
                        type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                        inputMode={f.key === "age" ? "numeric" : undefined}
                        maxLength={f.maxLength}
                        placeholder={f.type === "date" || f.type === "time" ? undefined : `e.g. ${p.placeholders[f.key] ?? ""}`}
                        value={content.slots[f.key] ?? ""}
                        onChange={(e) => setSlot(f.key, e.target.value)}
                        className={input}
                        aria-invalid={!!err}
                      />
                    )}
                    {err && <span className="text-[#b4493f]">{err}</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-2xl">How it opens</legend>
            {openings.map((k: OpeningKey) => (
              <label key={k} className={`flex cursor-pointer gap-3 border p-4 ${motion.opening === k ? "border-ink bg-white" : "border-line"}`}>
                <input type="radio" name="opening" checked={motion.opening === k} onChange={() => edit({ ...content, opening: k })} className="mt-1" />
                <span>
                  <span className="block text-base text-ink">{openingInfo[k].name}</span>
                  <span className="block text-sm text-ink-soft">{openingInfo[k].help}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-2xl">Movement</legend>
            {motionLevels.map((k: MotionLevel) => (
              <label key={k} className={`flex cursor-pointer gap-3 border p-4 ${motion.level === k ? "border-ink bg-white" : "border-line"}`}>
                <input type="radio" name="motion" checked={motion.level === k} onChange={() => edit({ ...content, motion: k })} className="mt-1" />
                <span>
                  <span className="block text-base text-ink">{motionLevelInfo[k].name}</span>
                  <span className="block text-sm text-ink-soft">{motionLevelInfo[k].help}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {manifest.theme.editable.palette && (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-2xl">Colours</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(Object.keys(paletteLabels) as (keyof typeof paletteLabels)[]).map((k) => (
                  <label key={k} className="grid gap-1.5 text-sm text-ink-soft">
                    {paletteLabels[k]}
                    <input
                      type="color"
                      value={theme.palette[k]}
                      onChange={(e) => edit({ ...content, palette: { ...content.palette, [k]: e.target.value } })}
                      className="h-12 w-full border border-line bg-white p-1"
                    />
                  </label>
                ))}
              </div>
              {content.palette && Object.keys(content.palette).length > 0 && (
                <button type="button" className="justify-self-start text-sm underline underline-offset-4" onClick={() => edit({ ...content, palette: undefined })}>
                  Back to the design&apos;s colours
                </button>
              )}
            </fieldset>
          )}
          <p className="text-sm text-ink-soft">Photos and video arrive next. Your changes save automatically.</p>
        </section>
      </div>

      {/* Phone: switch between editing and seeing */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur md:hidden" role="tablist" aria-label="Editor view">
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`py-3 text-sm ${tab === t ? "bg-ink text-white" : "border border-line"}`}>
              {t === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
