import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getStudioProject } from "@/lib/studio/queries";
import { getTemplate } from "@/lib/templates/library";
import { getOccasion } from "@/lib/occasions/registry";
import { kindConfig } from "@/lib/occasions/kinds";
import { sectionLabels, type SectionKey } from "@/lib/events/site";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default function StudioPage({ params }: PageProps<"/studio/[project]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-5 py-16 text-ink-soft">Opening your invitation…</p>}>
      <Studio params={params} />
    </Suspense>
  );
}

async function Studio({ params }: { params: PageProps<"/studio/[project]">["params"] }) {
  const { project: id } = await params;
  await requireUser(`/studio/${id}`);
  const project = await getStudioProject(id);
  if (!project) notFound();
  const template = getTemplate(project.templateSlug);
  const occasion = getOccasion(project.event.occasion);
  if (!template || !occasion) notFound();

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 md:grid-cols-[minmax(0,420px)_1fr] md:py-16">
      <div className="mx-auto w-full max-w-[420px] shadow-[0_40px_80px_-40px_rgba(28,34,56,0.6)]">
        <InvitationRenderer template={template} content={project.content} media={template.sampleMedia} hideAge={project.event.settings.hideAge} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-foil-deep">
          {occasion.name} · {kindConfig[project.kind].name} · {template.name}
        </p>
        <h1 className="mt-2 text-5xl leading-[1.05]">{project.event.title}</h1>
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[#5f9f78]" />
          Saved to your account
        </p>
        <div className="foil-rule my-8" />
        <h2 className="text-2xl">Coming next: the studio editor</h2>
        <p className="mt-2 text-ink-soft">
          Your invitation is saved and playing on the left with your names and date. The editor for wording, photos, colours, motion and the opening arrives in the next stage of this milestone, and will open right here.
        </p>
        <h2 className="mt-8 text-2xl">Your page will include</h2>
        <p className="mt-2 text-ink-soft">{project.sections.map((s) => sectionLabels[s as SectionKey] ?? s).join(", ")}.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Go to my dashboard
          </Link>
          <Link href={`/preview/${template.slug}/${template.manifest.motion.opening}`} className="btn btn-quiet">
            See how guests open it
          </Link>
        </div>
      </div>
    </div>
  );
}
