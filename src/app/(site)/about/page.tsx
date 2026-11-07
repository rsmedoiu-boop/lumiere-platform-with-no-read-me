import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { brand } from "@/lib/brand";
import { Photo } from "@/components/ui/Photo";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <>
      <PageIntro title={`About ${brand.name}`}>
        We&apos;re a small UK studio making invitations that feel like the opening scene of the day, and the tools to run everything that follows.
      </PageIntro>
      <div className="mx-auto max-w-6xl px-5 pb-14">
        <Photo name="studioDesk" sizes="(min-width: 1152px) 1120px, 100vw" className="aspect-[16/9] w-full rounded-[2px] object-cover" />
      </div>
      <div className="mx-auto grid max-w-3xl gap-6 px-5 pb-24 text-lg text-ink-soft">
        <p>
          Paper invitations are beautiful, but planning after the post goes out is spreadsheets, chasing replies and a seating plan
          on the back of an envelope. We wanted one place where the invitation, the replies, the guest list and the seating plan all agree.
        </p>
        <p>
          Every design is made in our studio. Your names and words are set by hand-tuned typography, not dropped into a template box.
          And your guests&apos; details are treated with care: private by default, never sold, and deleted after your celebration.
        </p>
      </div>
    </>
  );
}
