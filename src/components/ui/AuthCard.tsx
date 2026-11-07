import type { ReactNode } from "react";

export function AuthCard({ title, intro, children, aside }: { title: string; intro: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-[1fr_1.1fr] md:py-24">
      <div>
        <h1 className="text-5xl md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-sm text-ink-soft">{intro}</p>
        {aside}
      </div>
      <div className="border border-line bg-paper p-8 md:p-10">{children}</div>
    </div>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error)
    return (
      <p role="alert" className="border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
        {error}
      </p>
    );
  if (message)
    return (
      <p role="status" className="border-l-2 border-ok bg-ok/5 px-3 py-2 text-sm text-ok">
        {message}
      </p>
    );
  return null;
}
