import type { MetadataRoute } from "next";

/* Keep the private/unlisted areas out of search engines. These pages are still
   reachable by direct URL (for our own use) but not linked and not indexed:
   - /studio/*  the carousel + growth download hub
   - /brand     the logo / press kit */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio/", "/brand"],
    },
  };
}
