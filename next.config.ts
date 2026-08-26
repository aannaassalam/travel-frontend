import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Origin that serves catalogue images. The backend stores root-relative paths
 * like `/uploads/hotels/<uuid>.png`; those resolve against the API host, not
 * this site. Derived from one variable so next/image and the CSP below can
 * never disagree — when they do, images 404 or get blocked with no error in
 * the server log, which is a genuinely horrible thing to debug.
 */
const storageOrigin = (() => {
  const explicit = process.env.NEXT_PUBLIC_STORAGE_ORIGIN;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";
  try {
    return new URL(explicit ?? base).origin;
  } catch {
    return "";
  }
})();

/**
 * The S3 bucket the storage adapter writes to in production. With
 * `STORAGE_DRIVER=s3` the catalogue stores absolute bucket URLs rather than the
 * `/uploads/...` paths the local-disk driver produces, so `lib/media.ts` passes
 * them through untouched — which means next/image and the CSP both have to know
 * the host or every production image silently fails.
 *
 * One list, consumed by `remotePatterns` and `img-src` below, because those two
 * disagreeing is the exact failure this file already carries a comment about.
 */
const MEDIA_ORIGINS = [
  storageOrigin,
  "https://travel-media-prod.s3.eu-west-3.amazonaws.com"
].filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")]
  },
  images: {
    /**
     * Keep an optimised variant for a month.
     *
     * The source objects in S3 are multi-megabyte PNGs, and a cold fetch of one
     * from eu-west-3 measured 11s here - past the optimiser's own 7s budget, so
     * the first request for each image 500s and the card renders broken. A long
     * TTL means that gamble is taken once per image rather than whenever the
     * cache turns over.
     *
     * This is mitigation, not the fix. The upload path should be writing WebP:
     * a 1.86 MB PNG is indefensible on the 3G connections this product targets,
     * and no amount of caching helps the first visitor who waits for it.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Explicit hosts only. `hostname: "*"` turns the optimiser into an open
    // image proxy for the whole internet, which is both a bandwidth bill and
    // an SSRF-adjacent hazard.
    remotePatterns: MEDIA_ORIGINS.map((origin) => {
      const u = new URL(origin);
      return {
        protocol: u.protocol.replace(":", "") as "http" | "https",
        hostname: u.hostname,
        port: u.port || undefined,
        // The local-disk driver serves everything under /uploads; S3 keys are
        // laid out per folder at the bucket root, so this cannot be narrowed
        // to /uploads without breaking the production driver.
        pathname: "/**"
      };
    })
  },
  compress: true,
  compiler: {
    removeConsole: false
    // removeConsole: process.env.NODE_ENV === "production"
  },
  env: {
    NEXT_APP_BASE_URL: process.env.NEXT_APP_BASE_URL,
    NEXT_APP_ENCRYPTION_KEY: process.env.NEXT_APP_ENCRYPTION_KEY,
    NEXT_APP_TOKEN_NAME: process.env.NEXT_APP_TOKEN_NAME,
    NEXT_APP_CLIENT_ID: process.env.NEXT_APP_CLIENT_ID,
    NEXT_APP_CLIENT_SECRET: process.env.NEXT_APP_CLIENT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
  },
  typescript: { ignoreBuildErrors: false },

  /**
   * §10.8 application hardening.
   *
   * ponytail: the CSP below still allows `'unsafe-inline'` for scripts, which
   * §10.8 asks to remove in favour of nonces. A nonce-based policy needs
   * middleware to stamp a per-request nonce onto Next's bootstrap script, and
   * that forces every catalogue page off static generation — the opposite of
   * what §11.7 wants on a 3G connection. Upgrade path: add
   * `middleware.ts` generating a nonce, switch script-src to
   * `'nonce-<value>' 'strict-dynamic'`, and keep the catalogue on ISR by
   * serving it from the edge. Everything else here is already enforced.
   */
  async headers() {
    /** Origin of the catalogue API, so CSP and the client agree on one value. */
    const apiOrigin = (() => {
      try {
        return new URL(
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1"
        ).origin;
      } catch {
        return "";
      }
    })();

    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          // The storage origin must be listed, or every catalogue image is
          // blocked in the browser while server-rendered pages look fine.
          `img-src 'self' data: blob: ${MEDIA_ORIGINS.join(" ")}`.trim(),
          "font-src 'self' data:",
          // The API origin is the only place the browser may talk to. Derived
          // from the same variable the client uses, so the two cannot drift —
          // an earlier version read a differently-named variable, the value
          // came out empty, and every client-side catalogue fetch was silently
          // blocked while server-rendered data still worked.
          `connect-src 'self' ${apiOrigin}`.trim(),
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
          "upgrade-insecure-requests"
        ].join("; ")
      }
    ];

    return [
      { source: "/:path*", headers: security },
      {
        // §8: never cache an authenticated response. A misconfigured CDN
        // serving one customer's booking to another is catastrophic and
        // entirely preventable — so the header is set at the framework level
        // rather than trusted to each page.
        source: "/:path(account|booking)/:rest*",
        headers: [
          ...security,
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" }
        ]
      }
    ];
  }
};

export default nextConfig;
