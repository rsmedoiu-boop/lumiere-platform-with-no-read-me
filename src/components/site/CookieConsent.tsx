"use client";

/**
 * Cookie consent (UK GDPR / PECR). Only strictly necessary cookies are used
 * by default. Optional categories stay off until the visitor opts in, and the
 * choice can be changed at any time from the footer.
 */
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export type ConsentChoice = { necessary: true; analytics: boolean; decidedAt: string };

const KEY = "ml_consent_v1";
const EVENT = "ml-consent-open";

function readChoice(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConsentChoice) : null;
  } catch {
    return null;
  }
}

function saveChoice(analytics: boolean) {
  const choice: ConsentChoice = { necessary: true, analytics, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    /* storage blocked: choice applies to this visit only */
  }
  // Mirror to a first-party cookie so server code can respect it (6 months).
  document.cookie = `${KEY}=${analytics ? "analytics" : "necessary"}; Max-Age=${60 * 60 * 24 * 182}; Path=/; SameSite=Lax; Secure`;
  window.dispatchEvent(new Event("ml-consent-changed"));
}

/** True only after the visitor has opted in to analytics. */
export function useAnalyticsConsent() {
  return useSyncExternalStore(subscribe, () => readChoice()?.analytics ?? false, () => false);
}

export function CookieSettingsLink() {
  return (
    <button type="button" className="underline-offset-4 hover:underline" onClick={() => window.dispatchEvent(new Event(EVENT))}>
      Cookie settings
    </button>
  );
}

const subscribe = (cb: () => void) => {
  window.addEventListener("ml-consent-changed", cb);
  return () => window.removeEventListener("ml-consent-changed", cb);
};

export function CookieConsent() {
  // Server render assumes "decided" so no banner flashes before hydration.
  const decided = useSyncExternalStore(subscribe, () => readChoice() !== null, () => true);
  const [reopened, setReopened] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const open = !decided || reopened;

  useEffect(() => {
    const reopen = () => {
      setAnalytics(readChoice()?.analytics ?? false);
      setReopened(true);
    };
    window.addEventListener(EVENT, reopen);
    return () => window.removeEventListener(EVENT, reopen);
  }, []);

  if (!open) return null;

  const decide = (allowAnalytics: boolean) => {
    saveChoice(allowAnalytics);
    setReopened(false);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl border border-line bg-paper p-5 md:p-6 shadow-[0_12px_40px_-20px_rgba(28,34,56,0.45)] md:inset-x-auto md:right-6 md:bottom-6"
    >
      <h2 id="cookie-title" className="text-xl md:text-2xl">
        Cookies on this site
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        We use essential cookies to keep you signed in and keep the site secure. With your permission we&apos;d also measure
        visits anonymously to improve our designs. Read the{" "}
        <Link href="/legal/cookies" className="underline underline-offset-4">
          cookie policy
        </Link>
        .
      </p>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" checked disabled className="mt-1" />
        <span>
          <span className="font-medium">Essential</span>, always on: sign-in, security, your cookie choice.
        </span>
      </label>
      <label className="mt-2 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1" />
        <span>
          <span className="font-medium">Analytics</span>, optional: anonymous visit counts.
        </span>
      </label>
      <div className="mt-4 grid grid-cols-3 gap-2 [&_.btn]:px-3 [&_.btn]:py-2.5 [&_.btn]:text-xs md:flex md:gap-3 md:[&_.btn]:px-5 md:[&_.btn]:text-sm">
        <button type="button" className="btn btn-quiet" onClick={() => decide(false)}>
          Essential only
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => decide(analytics)}>
          Save choices
        </button>
        <button type="button" className="btn btn-primary" onClick={() => decide(true)}>
          Accept all
        </button>
      </div>
    </section>
  );
}
