/**
 * Which stage this deployment is. "test" = the private test site: shows a
 * banner and asks search engines to stay away. Unset = local development or
 * the real live site.
 */
export const isTestSite = process.env.NEXT_PUBLIC_SITE_STAGE === "test";
