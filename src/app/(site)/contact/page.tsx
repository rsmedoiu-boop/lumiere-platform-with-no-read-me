import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact and support" };

export default function ContactPage() {
  return (
    <>
      <PageIntro title="Contact and support">
        We aim to reply within one working day.
      </PageIntro>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-24 md:grid-cols-2">
        <section>
          <h2 className="text-3xl">Email the studio</h2>
          <p className="mt-3 text-ink-soft">For help with your invitation, guest list, seating plan or an order, or to ask about a bespoke design.</p>
          <a href={`mailto:${brand.supportEmail}`} className="btn btn-primary mt-6">{brand.supportEmail}</a>
        </section>
        <section>
          <h2 className="text-3xl">Your data</h2>
          <p className="mt-3 text-ink-soft">
            To download or delete your data, use Account settings once signed in, or email us with the subject &ldquo;Data request&rdquo;. We respond within one month, as UK GDPR requires.
          </p>
        </section>
      </div>
    </>
  );
}
