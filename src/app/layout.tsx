import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";
import { isTestSite } from "@/lib/stage";

export const metadata: Metadata = {
  title: { default: `${brand.name} — digital wedding invitations and planning`, template: `%s · ${brand.name}` },
  description: brand.description,
  ...(isTestSite ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#1c2238" };

/** Shared by the studio site and the couples' event websites. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full">
      <body className="flex min-h-full flex-col">
        {isTestSite && (
          <p role="note" className="bg-[#7a5a12] px-4 py-1.5 text-center text-xs text-white">
            Test site: not yet open to the public. Payments are switched off.
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
