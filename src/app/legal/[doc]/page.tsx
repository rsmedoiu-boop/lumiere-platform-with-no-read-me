import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { legalDocs } from "@/content/legal";

export function generateStaticParams() {
  return legalDocs.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  const d = legalDocs.find((x) => x.slug === doc);
  return { title: d?.title ?? "Legal" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  const d = legalDocs.find((x) => x.slug === doc);
  if (!d) notFound();
  return (
    <>
      <PageIntro title={d.title}>
        <p className="border-l-2 border-foil pl-4 text-base">
          Draft for legal review. This text will be checked by a solicitor before the service launches.
        </p>
      </PageIntro>
      <div className="mx-auto max-w-3xl px-5 pb-24">
        {d.sections.map((s) => (
          <section key={s.heading} className="mb-10">
            <h2 className="text-3xl">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-ink-soft">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
