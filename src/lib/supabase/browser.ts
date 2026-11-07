"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const env = supabaseEnv();
  return env ? createBrowserClient(env.url, env.key) : null;
}
