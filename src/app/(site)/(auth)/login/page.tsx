import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/AuthCard";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" intro="Sign in to edit your invitation, follow RSVPs and finish your seating plan." aside={<SetupNotice />}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
