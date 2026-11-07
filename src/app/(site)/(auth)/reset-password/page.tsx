import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/AuthCard";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Reset your password" intro="Enter the email you registered with and we'll send a link to choose a new password.">
      <ResetForm />
    </AuthCard>
  );
}
