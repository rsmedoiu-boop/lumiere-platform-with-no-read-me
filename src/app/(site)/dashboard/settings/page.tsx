import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeletionControls, PasswordForm, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-5xl">Account settings</h1>
      <Suspense fallback={<p className="mt-6 text-ink-soft">Loading your details…</p>}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser("/dashboard/settings");
  const supabase = (await createSupabaseServerClient())!;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, marketing_opt_in, deleted_requested_at")
    .eq("id", user.id)
    .single();
  const scheduledFor = profile?.deleted_requested_at
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(new Date(profile.deleted_requested_at).getTime() + 14 * 86_400_000),
      )
    : null;

  return (
    <div className="mt-10 grid gap-14">
      <section>
        <h2 className="text-3xl">Your details</h2>
        <div className="mt-5">
          <ProfileForm fullName={profile?.full_name ?? ""} email={user.email} marketing={!!profile?.marketing_opt_in} />
        </div>
      </section>
      <section id="password" className="scroll-mt-28">
        <h2 className="text-3xl">Password</h2>
        <p className="mt-3 max-w-md text-sm text-ink-soft">Choose a new password. If you came here from a reset email, this is where you set it.</p>
        <div className="mt-5">
          <PasswordForm />
        </div>
      </section>
      <section>
        <h2 className="text-3xl">Your data</h2>
        <p className="mt-3 max-w-md text-sm text-ink-soft">
          Download everything we hold about you and your events, including guest lists and seating plans, as a JSON file.
        </p>
        <a href="/dashboard/settings/export" className="btn btn-quiet mt-5" download>
          Download my data
        </a>
      </section>
      <section>
        <h2 className="text-3xl">Delete account</h2>
        <div className="mt-5">
          <DeletionControls scheduledFor={scheduledFor} />
        </div>
      </section>
    </div>
  );
}
