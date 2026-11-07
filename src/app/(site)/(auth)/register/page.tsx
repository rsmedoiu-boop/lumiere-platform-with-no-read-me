import type { Metadata } from "next";
import { AuthCard } from "@/components/ui/AuthCard";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Begin your invitation"
      intro="Your account keeps your designs, guest list and seating plan in one place. Guests never need an account to reply."
      aside={<SetupNotice />}
    >
      <RegisterForm />
    </AuthCard>
  );
}
