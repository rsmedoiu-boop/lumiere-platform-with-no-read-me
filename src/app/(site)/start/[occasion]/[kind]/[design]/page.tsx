import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StartShell, kindToUrl, urlToKind } from "@/components/start/StartShell";
import { activeCategorySlugs } from "@/config/catalogue";
import { getOccasion, occasions } from "@/lib/occasions/registry";
import { kindConfig, type InvitationKind } from "@/lib/occasions/kinds";
import { starterContent, templatesFor } from "@/lib/occasions/compat";
import { essentialFields } from "@/lib/start/draft";
import { getTemplate, templateLibrary } from "@/lib/templates/library";
import { getCurrentUser } from "@/lib/auth/session";
import { EssentialsForm, type EssentialsProps } from "./EssentialsForm";

export function generateStaticParams() {
  return occasions
    .filter((o) => activeCategorySlugs.includes(o.slug))
    .flatMap((o) => o.kinds.flatMap((k) => templatesFor(o.slug, templateLibrary).map((t) => ({ occasion: o.slug, kind: kindToUrl(k), design: t.slug }))));
}

export const metadata: Metadata = { title: "The essentials" };

export default async function EssentialsPage({ params }: PageProps<"/start/[occasion]/[kind]/[design]">) {
  const p = await params;
  const o = getOccasion(p.occasion);
  const kind = urlToKind(p.kind) as InvitationKind;
  const t = getTemplate(p.design);
  if (!o || !t || !activeCategorySlugs.includes(o.slug) || !o.kinds.includes(kind) || !templatesFor(o.slug, [t]).length) notFound();

  const starter = starterContent(o, kind, t);
  const props: EssentialsProps = {
    occasion: o.slug,
    noun: o.noun,
    kind,
    template: t,
    fields: essentialFields(o, t).map((f) => ({ ...f, default: undefined })),
    placeholders: Object.fromEntries(essentialFields(o, t).map((f) => [f.key, f.default ?? ""])),
    settings: o.settings,
    starter: starter.slots,
    media: t.sampleMedia,
    signedIn: null,
  };

  return (
    <StartShell step={4} back={`/start/${o.slug}/${p.kind}`} eyebrow={`${t.name} · ${kindConfig[kind].name}`} title="Let's begin with the essentials">
      <Suspense fallback={<EssentialsForm {...props} />}>
        <WithAccount {...props} />
      </Suspense>
    </StartShell>
  );
}

async function WithAccount(props: EssentialsProps) {
  const user = await getCurrentUser();
  return <EssentialsForm {...props} signedIn={user ? { name: user.fullName, email: user.email } : false} />;
}
