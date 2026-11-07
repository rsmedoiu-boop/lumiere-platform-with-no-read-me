/**
 * Whose names go on the invitation, whatever the occasion. A design uses a
 * single "names" layer; this decides whether that's a couple, one person or
 * an organisation, from the content the customer filled in.
 */

export type NamesShape =
  | { mode: "couple"; first: string; second: string }
  | { mode: "single"; name: string; caption?: string }
  | { mode: "organisation"; organisation: string; title: string };

export function resolveNames(slots: Record<string, string>, opts: { hideAge?: boolean } = {}): NamesShape | null {
  const v = (k: string) => (slots[k] ?? "").trim();
  if (v("partnerOne") || v("partnerTwo")) return { mode: "couple", first: v("partnerOne"), second: v("partnerTwo") };
  if (v("organisation"))
    return { mode: "organisation", organisation: v("organisation"), title: v("eventName") };
  if (v("celebrant")) {
    const age = !opts.hideAge && /^\d{1,3}$/.test(v("age")) ? v("age") : "";
    return { mode: "single", name: v("celebrant"), caption: age ? `is turning ${age}` : undefined };
  }
  for (const k of ["childName", "honouree"]) if (v(k)) return { mode: "single", name: v(k) };
  if (v("eventName")) return { mode: "single", name: v("eventName"), caption: v("hostName") ? `hosted by ${v("hostName")}` : undefined };
  return null;
}

/** Monogram initials: "S&J", "E", "H". */
export function monogramOf(n: NamesShape | null): string {
  if (!n) return "";
  const i = (s: string) => s.trim().charAt(0).toUpperCase();
  if (n.mode === "couple") return [i(n.first), i(n.second)].filter(Boolean).join("&");
  if (n.mode === "organisation") return i(n.organisation);
  return i(n.name);
}

/** Plain-text names for titles and screen readers: "Sarah & James". */
export function namesLabel(n: NamesShape | null): string {
  if (!n) return "";
  if (n.mode === "couple") return [n.first, n.second].filter(Boolean).join(" & ");
  if (n.mode === "organisation") return [n.organisation, n.title].filter(Boolean).join(" — ");
  return n.name;
}
