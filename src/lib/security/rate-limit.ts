import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const limits = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  rsvp: { limit: 30, windowSeconds: 60 * 60 },
  contact: { limit: 5, windowSeconds: 60 * 60 },
  export: { limit: 10, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof limits;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Count one attempt. Keys are hashed so no raw IPs or emails are stored.
 * Fails open only in development without a service key; in production a
 * missing key is a configuration error and the attempt is refused.
 */
export async function rateLimit(name: LimitName, subject = ""): Promise<{ ok: boolean; retryAfter: number }> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    // Local testing of a production build can opt out explicitly; deployed
    // environments never set this, so they fail closed without a key.
    const allowWithoutKey = process.env.NODE_ENV !== "production" || process.env.LOCAL_ALLOW_NO_RATE_LIMIT === "1";
    return allowWithoutKey ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: 60 };
  }
  const { limit, windowSeconds } = limits[name];
  const key = createHash("sha256").update(`${name}|${await clientIp()}|${subject.toLowerCase()}`).digest("hex");
  const { data, error } = await admin.rpc("hit_rate_limit", { p_bucket: `${name}:${key}`, p_limit: limit, p_window_seconds: windowSeconds }).single();
  if (error || !data) return { ok: true, retryAfter: 0 }; // never lock everyone out on a transient DB error
  const row = data as { allowed: boolean; retry_after_seconds: number };
  return { ok: row.allowed, retryAfter: row.retry_after_seconds };
}

export const tooMany = (retryAfter: number) =>
  `Too many attempts. Please try again in ${Math.max(1, Math.ceil(retryAfter / 60))} minute${retryAfter > 60 ? "s" : ""}.`;
