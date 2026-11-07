import type { MetadataRoute } from "next";

import { isTestSite } from "@/lib/stage";

export default function robots(): MetadataRoute.Robots {
  // The test site is never indexed.
  if (isTestSite) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/rsvp", "/preview", "/e/", "/auth"] },
  };
}
