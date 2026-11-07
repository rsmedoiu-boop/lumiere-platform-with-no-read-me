"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import { motionLevelInfo, motionLevels, openingInfo, openingsFor, type MotionLevel, type OpeningKey } from "@/lib/cinema/motion";
import { resolveMotion, resolveTheme, type InvitationContent, type TemplateDefinition } from "@/lib/templates/manifest";
import type { FieldGroup } from "@/lib/studio/content";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { PHOTO_ACCEPT, PHOTO_BUCKET, PHOTO_MAX_SIDE, PHOTO_PICK_LIMIT_BYTES, fitWithin, newPhotoPath } from "@/lib/studio/photo";
import { registerPhoto, removePhoto, saveDraft } from "./actions";

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
  eventId: string;
  hasStory: boolean;
  /** A short-lived link to the saved story photo. */
  storyPhotoUrl?: string;
}) {
  const [content, setContent] = useState<InvitationContent>(p.initial);
  const [status, setStatus] = useState<Status>({ kind: "saved" });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"preview" | "edit">("edit");
  const [replay, setReplay] = useState(0);
  const version = useRef(p.version);
  const saved = useRef(JSON.stringify(p.initial));
  const inFlight = useRef(false);
  const [photoUrl, setPhotoUrl] = useState(p.storyPhotoUrl);
  const [photoState, setPhotoState] = useState<{ kind: "idle" } | { kind: "working" } | { kind: "error"; message: string }>({ kind: "idle" });
  // A replaced photo is deleted only once the draft no longer points at it.
  const toDelete = useRef<string[]>([]);

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
        const stillUsed = content.story?.photoPath;
        for (const old of toDelete.current.splice(0)) if (old !== stillUsed) void removePhoto(p.projectId, old);
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

  const setStory = (patch: Partial<NonNullable<InvitationContent["story"]>>) => edit({ ...content, story: { ...content.story, ...patch } });

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > PHOTO_PICK_LIMIT_BYTES) return setPhotoState({ kind: "error", message: "That photo is over 25 MB. Please choose a smaller one." });
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return setPhotoState({ kind: "error", message: "Please choose a photo (JPEG, PNG, WebP or HEIC)." });
    setPhotoState({ kind: "working" });
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIDE);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      // Re-drawing the picture drops its hidden details, including where it was taken.
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.86));
      if (!blob) throw new Error("encode");
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("storage");
      const path = newPhotoPath(p.eventId);
      const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/webp", cacheControl: "3600", upsert: false });
      if (up.error) throw new Error("upload");
      const reg = await registerPhoto(p.projectId, path, width, height, blob.size);
      if (!reg.ok) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        return setPhotoState({ kind: "error", message: reg.message });
      }
      const previous = content.story?.photoPath;
      if (previous) toDelete.current.push(previous);
      setPhotoUrl(reg.url);
      setStory({ photoPath: path });
      setPhotoState({ kind: "idle" });
    } catch {
      setPhotoState({ kind: "error", message: "We couldn't read that photo. Please try another, or a JPEG if it's a HEIC." });
    }
  }

  function clearPhoto() {
    const previous = content.story?.photoPath;
    if (previous) toDelete.current.push(previous);
    setPhotoUrl(undefined);
    setStory({ photoPath: undefined, photoAlt: undefined });
  }

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

          {p.hasStory && (
            <fieldset className="grid gap-4">
              <legend className="mb-3 text-2xl">Our story</legend>
              <p className="-mt-2 text-sm text-ink-soft">Shown on your wedding website, below the invitation.</p>
              <label className="grid gap-1.5 text-sm text-ink-soft">
                Heading
                <input name="storyHeading" type="text" maxLength={80} value={content.story?.heading ?? ""} onChange={(e) => setStory({ heading: e.target.value })} placeholder="e.g. How we met" className={input} />
              </label>
              <label className="grid gap-1.5 text-sm text-ink-soft">
                Your story
                <textarea name="storyBody" rows={6} maxLength={1500} value={content.story?.body ?? ""} onChange={(e) => setStory({ body: e.target.value })} placeholder="A few paragraphs about you two. Leave a blank line between paragraphs." className={input} />
              </label>
              <div className="grid gap-3">
                <span className="text-sm text-ink-soft">Photograph</span>
                <div className="flex items-start gap-4">
                  <div className="grid aspect-[3/4] w-28 shrink-0 place-items-center overflow-hidden rounded-t-full border border-line bg-white text-xs text-ink-soft">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a private, short-lived storage link
                      <img src={photoUrl} alt={content.story?.photoAlt ?? "Your story photograph"} className="h-full w-full object-cover" data-testid="story-photo" />
                    ) : (
                      <span className="px-2 text-center">No photo yet</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label className="btn btn-quiet cursor-pointer">
                      {photoState.kind === "working" ? "Adding…" : photoUrl ? "Change photo" : "Add a photo"}
                      <input type="file" name="storyPhoto" accept={PHOTO_ACCEPT} className="sr-only" disabled={photoState.kind === "working"} onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                    {photoUrl && (
                      <button type="button" className="justify-self-start text-sm underline underline-offset-4" onClick={clearPhoto}>
                        Remove photo
                      </button>
                    )}
                    <p className="text-sm text-ink-soft">Portrait photos work best. We shrink it for fast loading and remove hidden details such as where it was taken.</p>
                  </div>
                </div>
                {photoState.kind === "error" && (
                  <p role="alert" className="text-sm text-[#b4493f]">
                    {photoState.message}
                  </p>
                )}
                {photoUrl && (
                  <label className="grid gap-1.5 text-sm text-ink-soft">
                    Describe the photo (for screen readers)
                    <input name="storyAlt" type="text" maxLength={160} value={content.story?.photoAlt ?? ""} onChange={(e) => setStory({ photoAlt: e.target.value })} placeholder="e.g. Isla and Marco laughing on a beach" className={input} />
                  </label>
                )}
              </div>
            </fieldset>
          )}

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
          <p className="text-sm text-ink-soft">Video and a photo gallery arrive next. Your changes save automatically.</p>
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
