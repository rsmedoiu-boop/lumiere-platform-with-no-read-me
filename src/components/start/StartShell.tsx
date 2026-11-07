import Link from "next/link";
import type { ReactNode } from "react";

/** Frame for each step of the start flow: back link, progress and heading. */
export function StartShell({ step, back, eyebrow, title, intro, children }: { step: number; back?: string; eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-6 sm:pt-10">
      <div className="flex h-11 items-center justify-between text-sm">
        {back ? (
          <Link href={back} className="-ml-2 px-2 py-3 text-ink-soft hover:text-ink">
            Back
          </Link>
        ) : (
          <span />
        )}
        <p className="text-ink-soft">Step {step} of 4</p>
      </div>
      <div className="mt-2 h-px w-full bg-line" aria-hidden>
        <div className="h-px bg-foil" style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      <header className="mt-8 max-w-2xl">
        {eyebrow && <p className="text-xs uppercase tracking-[0.16em] text-foil-deep">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl leading-[1.05] sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 text-ink-soft">{intro}</p>}
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export const kindToUrl = (k: string) => k.replaceAll("_", "-");
export const urlToKind = (u: string) => u.replaceAll("-", "_");
