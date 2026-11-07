import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "customer" | "support" | "admin";
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

/**
 * Data Access Layer: the single place that reads who is signed in.
 * Verifies the token with Supabase (getUser), never trusting cookie contents.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    fullName: profile?.full_name ?? null,
    role: (profile?.role as Role) ?? "customer",
  };
}

export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
