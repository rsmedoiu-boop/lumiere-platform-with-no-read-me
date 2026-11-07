import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-32 text-center">
      <h1 className="text-6xl">This page isn&apos;t here</h1>
      <p className="mt-4 text-ink-soft">The link may be mistyped, or the invitation may have been unpublished by its hosts.</p>
      <Link href="/" className="btn btn-primary mt-8">Go to the home page</Link>
    </div>
  );
}
