import type { NextConfig } from "next";

function uniqueTokens(tokens: string[]) {
  return Array.from(new Set(tokens.filter(Boolean)));
}

function cspSourceFromUrl(value: string | undefined, allowedProtocols: string[]) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return allowedProtocols.includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy() {
  const liveKitConnectSource = cspSourceFromUrl(process.env.LIVEKIT_URL, [
    "ws:",
    "wss:",
    "http:",
    "https:"
  ]);
  const connectSources = uniqueTokens([
    "'self'",
    "https://checkout.stripe.com",
    "https://billing.stripe.com",
    "https://api.stripe.com",
    "https://*.ably.io",
    "wss://*.ably.io",
    "https://*.ably-realtime.com",
    "wss://*.ably-realtime.com",
    "http://localhost:7880",
    "ws://localhost:7880",
    "https://rtc.thebusinesscircle.net",
    "wss://rtc.thebusinesscircle.net",
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
    "https://*.livekit.io",
    "wss://*.livekit.io",
    liveKitConnectSource ?? ""
  ]);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com",
    "media-src 'self' blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://billing.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ].join("; ");
}

function buildSecurityHeaders() {
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
      value: "camera=(self), microphone=(self), geolocation=(), payment=()"
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
      value: buildContentSecurityPolicy()
    }
  ] as const;
}

const SECURITY_HEADERS = buildSecurityHeaders();
const PAGE_ROUTE_SOURCE =
  "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.[^/]+$).*)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
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
