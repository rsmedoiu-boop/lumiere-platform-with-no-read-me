/**
 * Supabase settings. Until a project is connected these are absent and the
 * app runs as a public site with sign-in disabled — nothing crashes.
 * Use the local Supabase CLI (free) or a free-tier project during development.
 */
export function supabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export const isSupabaseConfigured = () => supabaseEnv() !== null;
