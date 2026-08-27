// next-sitemap.config.js
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_DOMAIN ?? "https://flexiairbnb.com";

/**
 * §11.4 sitemaps, regenerated on every build via the `postbuild` script.
 *
 * §10.9 drives the exclusions and the crawl policy: the curated catalogue is
 * the client's competitive asset, so legitimate search engines are allow-listed
 * explicitly while crawlers that exist to copy listings are not. Everything
 * behind auth or mid-checkout is excluded outright — an indexed booking
 * reference is a data leak.
 */
module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  changefreq: "daily",
  priority: 0.7,
  exclude: ["/account", "/account/*", "/booking/*", "/login", "/404"],
  alternateRefs: [
    { href: siteUrl, hreflang: "fr" },
    { href: siteUrl, hreflang: "en" },
    { href: siteUrl, hreflang: "x-default" }
  ],
  transform: async (config, path) => ({
    loc: path,
    changefreq: path === "/" ? "daily" : config.changefreq,
    // Catalogue detail pages are what should rank; legal pages should not
    // outrank an offer someone can actually buy.
    priority:
      path === "/"
        ? 1.0
        : /\/(offer|hotel|listing|activity|route|vehicle)\//.test(path)
          ? 0.9
          : 0.7,
    lastmod: new Date().toISOString(),
    alternateRefs: config.alternateRefs ?? []
  }),
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/booking", "/login", "/api"]
      },
      // Scraper-only crawlers that send no traffic back.
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" }
    ]
  }
};
