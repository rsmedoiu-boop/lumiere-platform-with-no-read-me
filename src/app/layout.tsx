import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `${brand.name} — digital wedding invitations and planning`, template: `%s · ${brand.name}` },
  description: brand.description,
};

export const viewport: Viewport = { themeColor: "#1c2238" };

/** Shared by the studio site and the couples' event websites. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full">
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
