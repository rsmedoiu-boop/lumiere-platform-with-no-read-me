import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getStudioProject } from "@/lib/studio/queries";
import { getTemplate } from "@/lib/templates/library";
import { getOccasion } from "@/lib/occasions/registry";
import { kindConfig } from "@/lib/occasions/kinds";
import { effectiveSlots } from "@/lib/occasions/compat";
import { fieldGroups } from "@/lib/studio/content";
import { StudioEditor } from "./StudioEditor";

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

  const placeholders = Object.fromEntries(effectiveSlots(occasion, template).map((f) => [f.key, f.default ?? ""]));
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-6 md:pt-12">
        <p className="text-xs uppercase tracking-[0.16em] text-foil-deep">
          {occasion.name} · {kindConfig[project.kind].name} · {template.name}
        </p>
        <h1 className="mt-2 text-4xl leading-[1.05] md:text-5xl">{project.event.title}</h1>
      </div>
      <StudioEditor
        projectId={project.id}
        template={template}
        groups={fieldGroups(occasion, template)}
        initial={project.content}
        version={project.draftVersion}
        hideAge={!!project.event.settings.hideAge}
        placeholders={placeholders}
        media={template.sampleMedia}
      />
    </>
  );
}
