"use client";

import { useEffect, useState } from "react";

/** Days until the event. Computed in the browser so pages stay static. */
export function Countdown({ isoDate }: { isoDate: string }) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;
    const [y, m, d] = isoDate.split("-").map(Number);
    const update = () => {
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      setDays(Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isoDate]);

  if (days === null) return <p style={{ fontSize: "3cqi", minHeight: "1.4em" }} aria-hidden />;
  const label = days > 1 ? `${days} days to go` : days === 1 ? "Tomorrow" : days === 0 ? "Today" : "With love, thank you";
  return (
    <p style={{ fontSize: "3cqi", letterSpacing: "0.08em", color: "var(--inv-muted)", minHeight: "1.4em" }} aria-live="polite">
      {label}
    </p>
  );
}
