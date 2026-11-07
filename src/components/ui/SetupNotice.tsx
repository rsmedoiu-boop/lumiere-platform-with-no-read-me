import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Shown only in development before a Supabase project is connected. */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <p className="mt-8 max-w-sm border-l-2 border-foil bg-paper px-4 py-3 text-sm text-ink-soft">
      Development mode: accounts aren&apos;t connected yet. Add your Supabase settings to <code>.env.local</code> to turn on sign-in.
    </p>
  );
}
