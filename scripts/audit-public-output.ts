import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

type AuditMode = "source" | "rendered";

type PublicOutputCheck = {
  route: string;
  files: string[];
};

type MatchResult = {
  route: string;
  target: string;
  phrase: string;
  line: number;
  text: string;
};

const root = process.cwd();

const publicRoutes = [
  "/",
  "/about",
  "/membership",
  "/join",
  "/faq",
  "/insights",
  "/terms-of-service",
  "/privacy-policy",
  "/cookie-policy",
  "/contact",
  "/robots.txt",
  "/sitemap.xml"
] as const;

const stalePhrases = [
  "Dark",
  "Light",
  "background mode",
  "theme toggle",
  "Appearance toggle",
  "Terms & Conditions",
  "Terms and Conditions",
  "both plans",
  "Both plans",
  "both tiers",
  "Both tiers",
  "two tiers",
  "two plans",
  "OWNER INPUT REQUIRED",
  "Image: Test",
  "Founder-Led Growth Ecosystem",
  "Founder Led Growth Ecosystem"
] as const;

const sourceChecks: PublicOutputCheck[] = [
  {
    route: "/",
    files: [
      "src/app/(public)/page.tsx",
      "src/config/site.ts",
      "src/components/public/footer.tsx",
      "src/components/public/navbar-client.tsx"
    ]
  },
  {
    route: "/about",
    files: ["src/app/(public)/about/page.tsx", "src/components/public/footer.tsx"]
  },
  {
    route: "/membership",
    files: [
      "src/app/(public)/membership/page.tsx",
      "src/components/public/membership-guided-selector.tsx",
      "src/config/site-content.ts"
    ]
  },
  {
    route: "/join",
    files: ["src/app/(auth)/join/page.tsx", "src/components/auth/register-form.tsx"]
  },
  {
    route: "/faq",
    files: ["src/app/(public)/faq/page.tsx", "src/config/site-content.ts"]
  },
  {
    route: "/insights",
    files: ["src/app/(public)/insights/page.tsx", "src/config/insights.ts"]
  },
  {
    route: "/terms-of-service",
    files: ["src/app/(public)/terms-of-service/page.tsx", "src/config/legal.ts"]
  },
  {
    route: "/privacy-policy",
    files: ["src/app/(public)/privacy-policy/page.tsx", "src/config/legal.ts"]
  },
  {
    route: "/cookie-policy",
    files: ["src/app/(public)/cookie-policy/page.tsx", "src/config/legal.ts"]
  },
  {
    route: "/contact",
    files: ["src/app/(public)/contact/page.tsx", "src/components/public/footer.tsx"]
  },
  {
    route: "/robots.txt",
    files: ["src/app/robots.ts"]
  },
  {
    route: "/sitemap.xml",
    files: ["src/app/sitemap.ts"]
  }
];

function parseMode(argv: string[]): AuditMode {
  if (argv.includes("--rendered")) {
    return "rendered";
  }

  if (argv.includes("--source")) {
    return "source";
  }

  return process.env.AUDIT_PUBLIC_OUTPUT_MODE === "rendered" ? "rendered" : "source";
}

function baseUrlFromEnv() {
  return (
    process.env.APP_URL ||
    process.env.AUDIT_PUBLIC_OUTPUT_BASE_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcherForPhrase(phrase: string) {
  if (phrase === "Dark" || phrase === "Light") {
    return new RegExp(`\\b${phrase}\\b`, "g");
  }

  return new RegExp(escapeRegExp(phrase), "gi");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function renderedTextFromHtml(route: string, html: string) {
  if (route.endsWith(".txt") || route.endsWith(".xml")) {
    return decodeHtmlEntities(html);
  }

  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function lineForIndex(text: string, index: number) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findPhraseMatches(route: string, target: string, text: string): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const phrase of stalePhrases) {
    const matcher = matcherForPhrase(phrase);
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(text)) !== null) {
      const start = Math.max(0, match.index - 80);
      const end = Math.min(text.length, match.index + phrase.length + 80);
      matches.push({
        route,
        target,
        phrase,
        line: lineForIndex(text, match.index),
        text: text.slice(start, end).replace(/\s+/g, " ").trim()
      });

      if (matcher.lastIndex === match.index) {
        matcher.lastIndex += 1;
      }
    }
  }

  return matches;
}

function findSourceMatches(route: string, file: string): MatchResult[] {
  const absolutePath = join(root, file);
  if (!existsSync(absolutePath)) {
    return [
      {
        route,
        target: file,
        phrase: "missing file",
        line: 0,
        text: file
      }
    ];
  }

  const text = readFileSync(absolutePath, "utf8");
  return findPhraseMatches(route, file, text);
}

function countSelectedPath(text: string) {
  return text.match(/\bSelected Path\b/g)?.length ?? 0;
}

async function fetchRenderedRoute(baseUrl: string, route: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "BCN launch readiness audit"
      }
    });

    const body = await response.text();
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditRenderedOutput() {
  const baseUrl = baseUrlFromEnv();
  const matches: MatchResult[] = [];
  let membershipSelectedPathCount = 0;

  console.log(`[mode] rendered`);
  console.log(`[base] ${baseUrl}`);

  for (const route of publicRoutes) {
    const { status, body } = await fetchRenderedRoute(baseUrl, route);
    const renderedText = renderedTextFromHtml(route, body);

    console.log(`[checked] ${route} status=${status}`);

    if (status < 200 || status >= 400) {
      matches.push({
        route,
        target: `${baseUrl}${route}`,
        phrase: `HTTP ${status}`,
        line: 0,
        text: `Unexpected response status ${status}`
      });
    }

    matches.push(...findPhraseMatches(route, `${baseUrl}${route}`, renderedText));

    if (route === "/membership") {
      membershipSelectedPathCount = countSelectedPath(renderedText);
    }
  }

  if (membershipSelectedPathCount !== 1) {
    matches.push({
      route: "/membership",
      target: `${baseUrl}/membership`,
      phrase: "duplicate selected membership output",
      line: 0,
      text: `Expected "Selected Path" once, found ${membershipSelectedPathCount}.`
    });
  }

  console.log(`[checked] /membership Selected Path count=${membershipSelectedPathCount}`);
  report(matches, "rendered public output audit");
}

function auditSourceOutput() {
  const matches: MatchResult[] = [];

  console.log(`[mode] source`);

  for (const check of sourceChecks) {
    const uniqueFiles = [...new Set(check.files)];
    console.log(`[checked] ${check.route}`);
    for (const file of uniqueFiles) {
      console.log(`  - ${relative(root, join(root, file))}`);
      matches.push(...findSourceMatches(check.route, file));
    }
  }

  const selectorPath = "src/components/public/membership-guided-selector.tsx";
  const selectorSource = readFileSync(join(root, selectorPath), "utf8");
  const selectedPanelCount = selectorSource.match(/<SelectedPathPanel\b/g)?.length ?? 0;

  if (selectedPanelCount !== 1) {
    matches.push({
      route: "/membership",
      target: selectorPath,
      phrase: "duplicate selected membership output",
      line: 0,
      text: `Expected 1 SelectedPathPanel render, found ${selectedPanelCount}.`
    });
  }

  console.log(`[checked] /membership duplicate selected output (${selectedPanelCount})`);
  report(matches, "source public output audit");
}

function report(matches: MatchResult[], label: string) {
  if (!matches.length) {
    console.log(`PASS ${label}`);
    return;
  }

  console.error(`FAIL ${label}`);
  for (const match of matches) {
    const location = match.line > 0 ? `${match.target}:${match.line}` : match.target;
    console.error(
      `- ${match.route} | ${location} | ${match.phrase} | ${match.text}`
    );
  }

  process.exitCode = 1;
}

const mode = parseMode(process.argv.slice(2));

if (mode === "rendered") {
  auditRenderedOutput().catch((error) => {
    console.error("FAIL rendered public output audit");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
} else {
  auditSourceOutput();
}
