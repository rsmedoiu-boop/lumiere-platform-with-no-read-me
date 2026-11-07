import type { ReactNode } from "react";

export function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-5 pt-16 pb-10 md:pt-24">
      <h1 className="max-w-3xl text-5xl md:text-6xl">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-lg text-ink-soft">{children}</div>}
      <div className="foil-rule mt-12" />
    </header>
  );
}
