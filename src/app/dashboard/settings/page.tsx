import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-5xl">Account settings</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Change your details, marketing choices, download your data or delete your account. These controls open with guest
        management.
      </p>
    </div>
  );
}
