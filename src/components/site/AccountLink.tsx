import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

/** "My account" for signed-in visitors, "Sign in" otherwise. Streams in, so pages stay static. */
export async function AccountLink({ className = "" }: { className?: string }) {
  const user = await getCurrentUser();
  return user ? (
    <Link href="/dashboard" className={className}>
      My account
    </Link>
  ) : (
    <Link href="/login" className={className}>
      Sign in
    </Link>
  );
}
