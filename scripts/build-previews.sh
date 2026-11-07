#!/usr/bin/env bash
# Builds the two single-file previews published as Claude artifacts:
#   preview-out/invitation.html  — Midnight Garden guest experience (/e/demo)
#   preview-out/site.html        — the public website draft
# Static export can't include server-only parts (auth, dashboard, proxy), so
# this works on throwaway copies and leaves the real app untouched.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/preview-out"; mkdir -p "$OUT"

prepare() { # $1 = dir
  rm -rf "$1"; mkdir -p "$1"
  (cd "$ROOT" && git ls-files -co --exclude-standard | grep -v '^\.env' | grep -v '^preview-out/' | tar -cf - -T -) | tar -xf - -C "$1"
  cp -al "$ROOT/node_modules" "$1/node_modules"
  cat > "$1/next.config.ts" <<'CFG'
import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "export", images: { unoptimized: true } };
export default nextConfig;
CFG
  echo 'export default { plugins: { "@tailwindcss/postcss": {} } };' > "$1/postcss.config.mjs"
  rm -rf "$1/src/proxy.ts" "$1/src/app/auth" "$1/src/app/robots.ts" "$1/src/app/(site)/dashboard" "$1/src/app/(site)/admin"
  cat > "$1/src/app/(site)/(auth)/actions.ts" <<'ACT'
export type AuthState = { error?: string; message?: string; fields?: Record<string, string> } | undefined;
const draft = async (): Promise<AuthState> => ({ error: "This is a design draft: accounts are not connected here." });
export const signIn = async (_s: AuthState, _f: FormData) => draft();
export const signUp = async (_s: AuthState, _f: FormData) => draft();
export const requestPasswordReset = async (_s: AuthState, _f: FormData) => draft();
export const signOut = async () => {};
ACT
}

# 1. Invitation preview: only the event page.
E=/tmp/lumiere-preview-event; prepare "$E"
rm -rf "$E/src/app/(site)"
echo 'export default function NotFound() { return <p>Not found</p>; }' > "$E/src/app/not-found.tsx"
sed -i 's|Invitation by <Link href="/" className="underline underline-offset-4">{brand.name}</Link>|Invitation by {brand.name}|' "$E/src/components/event-site/EventSite.tsx"
(cd "$E" && NEXT_TELEMETRY_DISABLED=1 npx next build --webpack >/dev/null)
python3 "$ROOT/scripts/inline-preview.py" "$E/out" e/demo.html "$OUT/invitation.html"
sed -i 's|<title>[^<]*</title>|<title>Midnight Garden — wedding invitation preview</title>|' "$OUT/invitation.html"

# 2. Website draft: every public page.
S=/tmp/lumiere-preview-site; prepare "$S"
rm -rf "$S/src/app/e"
(cd "$S" && NEXT_TELEMETRY_DISABLED=1 npx next build --webpack >/dev/null)
OUT_DIR="$S/out" DEST="$OUT/site.html" python3 "$ROOT/scripts/combine-site-draft.py"
ls -la "$OUT"
