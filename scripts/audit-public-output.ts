import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

type PublicOutputCheck = {
  route: string;
  files: string[];
};

type MatchResult = {
  route: string;
  file: string;
  phrase: string;
  line: number;
  text: string;
};

const root = process.cwd();

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

const publicOutputChecks: PublicOutputCheck[] = [
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
    route: "/cookies",
    files: ["src/app/(public)/cookie-policy/page.tsx", "src/config/legal.ts"]
  },
  {
    route: "/contact",
    files: ["src/app/(public)/contact/page.tsx", "src/components/public/footer.tsx"]
  }
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcherForPhrase(phrase: string) {
  if (phrase === "Dark" || phrase === "Light") {
    return new RegExp(`\\b${phrase}\\b`, "g");
  }

  return new RegExp(escapeRegExp(phrase), "gi");
}

function findPhraseMatches(route: string, file: string, phrase: string): MatchResult[] {
  const absolutePath = join(root, file);
  if (!existsSync(absolutePath)) {
    return [
      {
        route,
        file,
        phrase: "missing file",
        line: 0,
        text: file
      }
    ];
  }

  const matcher = matcherForPhrase(phrase);
  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  const matches: MatchResult[] = [];

  lines.forEach((lineText, index) => {
    if (matcher.test(lineText)) {
      matches.push({
        route,
        file,
        phrase,
        line: index + 1,
        text: lineText.trim()
      });
    }

    matcher.lastIndex = 0;
  });

  return matches;
}

function auditPublicOutput() {
  const matches: MatchResult[] = [];

  for (const check of publicOutputChecks) {
    const uniqueFiles = [...new Set(check.files)];
    for (const file of uniqueFiles) {
      for (const phrase of stalePhrases) {
        matches.push(...findPhraseMatches(check.route, file, phrase));
      }
    }
  }

  const selectorPath = "src/components/public/membership-guided-selector.tsx";
  const selectorSource = readFileSync(join(root, selectorPath), "utf8");
  const selectedPanelCount = selectorSource.match(/<SelectedPathPanel\b/g)?.length ?? 0;

  if (selectedPanelCount !== 1) {
    matches.push({
      route: "/membership",
      file: selectorPath,
      phrase: "duplicate selected membership output",
      line: 0,
      text: `Expected 1 SelectedPathPanel render, found ${selectedPanelCount}.`
    });
  }

  for (const check of publicOutputChecks) {
    console.log(`[checked] ${check.route}`);
    for (const file of [...new Set(check.files)]) {
      console.log(`  - ${relative(root, join(root, file))}`);
    }
  }

  console.log(`[checked] /membership duplicate selected output (${selectedPanelCount})`);

  if (!matches.length) {
    console.log("PASS public output audit");
    return;
  }

  console.error("FAIL public output audit");
  for (const match of matches) {
    const location = match.line > 0 ? `${match.file}:${match.line}` : match.file;
    console.error(
      `- ${match.route} | ${location} | ${match.phrase} | ${match.text}`
    );
  }

  process.exitCode = 1;
}

auditPublicOutput();
