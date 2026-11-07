"use client";

import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};

/** Days, hours and minutes until the event. Renders nothing on the server. */
export function LiveCountdown({ startsAt }: { startsAt: string }) {
  const minute = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 60_000), () => null);
  const target = Date.parse(startsAt);
  const parts = (() => {
    if (minute === null) return null;
    const diff = Math.max(target - minute * 60_000, 0);
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
    };
  })();
  const cells: [string, number | undefined][] = [
    ["days", parts?.days],
    ["hours", parts?.hours],
    ["minutes", parts?.minutes],
  ];
  return (
    <div className="flex justify-center gap-8 sm:gap-14" role="timer" aria-live="off">
      {cells.map(([label, value]) => (
        <div key={label} className="text-center">
          <p className="font-display text-5xl sm:text-6xl [font-variant-numeric:lining-nums_tabular-nums]" style={{ minWidth: "2ch" }}>
            {value ?? "–"}
          </p>
          <p className="mt-1 text-xs tracking-[0.12em] text-[color:var(--ev-muted)]">{label}</p>
        </div>
      ))}
    </div>
  );
}
