import type { NextConfig } from "next";

function buildSecurityHeaders(input?: { allowMediaCapture?: boolean }) {
  const permissionsPolicy = input?.allowMediaCapture
    ? "camera=(self), microphone=(self), geolocation=(), payment=()"
    : "camera=(), microphone=(), geolocation=(), payment=()";

  return [
    {
      key: "X-Frame-Options",
      value: "DENY"
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff"
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin"
    },
    {
      key: "Permissions-Policy",
      value: permissionsPolicy
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin"
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-site"
    },
    {
      key: "X-DNS-Prefetch-Control",
      value: "off"
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload"
    },
    {
      key: "Content-Security-Policy",
      value:
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
    }
  ] as const;
}

const SECURITY_HEADERS = buildSecurityHeaders();
const CALLING_SECURITY_HEADERS = buildSecurityHeaders({ allowMediaCapture: true });
const PAGE_ROUTE_SOURCE =
  "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.[^/]+$).*)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [...SECURITY_HEADERS]
      },
      {
        source: PAGE_ROUTE_SOURCE,
        headers: [...SECURITY_HEADERS]
      },
      {
        source: "/calls/:path*",
        headers: [...CALLING_SECURITY_HEADERS]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: "/early-access",
        destination: "/membership",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
