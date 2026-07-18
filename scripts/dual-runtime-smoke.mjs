import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, ".sandbox", "dual-runtime-smoke");
const mode = process.argv[2] ?? "run";
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const bcnPort = 3100;
const circleCardPort = 3200;
const runtimeDistDirs = {
  bcn: ".runtime/bcn",
  "circle-card": ".runtime/circle-card"
};
const explicitlyReviewedUntrackedBuildFiles = [
  "src/config/production-credential.ts",
  "src/config/runtime-dist-dir.ts"
];
const processes = [];
let completed = false;

function fail(message) {
  console.error(`[dual-runtime-smoke] ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function safeOsEnvironment() {
  const names = [
    "PATH",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "NUMBER_OF_PROCESSORS"
  ];
  return Object.fromEntries(
    names.flatMap((name) => process.env[name] ? [[name, process.env[name]]] : [])
  );
}

function requireSafeBuildEnvironment() {
  const databaseUrl = process.env.SMOKE_DATABASE_URL?.trim();
  const authSecret = process.env.SMOKE_AUTH_SECRET?.trim();
  if (!databaseUrl) {
    fail("SMOKE_DATABASE_URL is required and must identify a local development database.");
  }
  if (!authSecret || authSecret.length < 32) {
    fail("SMOKE_AUTH_SECRET is required and must contain at least 32 characters.");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail("SMOKE_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  const localDatabaseHosts = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "host.docker.internal"
  ]);
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !localDatabaseHosts.has(parsed.hostname)
  ) {
    fail("SMOKE_DATABASE_URL must use PostgreSQL on an explicitly local host.");
  }

  return { databaseUrl, authSecret };
}

function safeApplicationEnvironment({ databaseUrl, authSecret }) {
  return {
    ...safeOsEnvironment(),
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: authSecret,
    NEXTAUTH_SECRET: authSecret,
    STRIPE_SECRET_KEY: "sk_test_dual_runtime_smoke",
    STRIPE_WEBHOOK_SECRET: "whsec_dual_runtime_smoke",
    CIRCLE_CARD_BILLING_ENABLED: "false",
    CIRCLE_CARD_BILLING_ACCESS_MODE: "operator",
    RESEND_API_KEY: "re_test_dual_runtime_bcn",
    RESEND_FROM_EMAIL: "The Business Circle Network <noreply@thebusinesscircle.net>",
    RESEND_REPLY_TO_EMAIL: "contact@thebusinesscircle.net",
    PUBLIC_CONTACT_EMAIL: "contact@thebusinesscircle.net",
    CIRCLE_CARD_RESEND_API_KEY: "re_test_dual_runtime_circle_card",
    CIRCLE_CARD_RESEND_FROM_EMAIL: "Circle Card <noreply@circlecard.co.uk>",
    CIRCLE_CARD_RESEND_REPLY_TO_EMAIL: "support@circlecard.co.uk",
    CIRCLE_CARD_PUBLIC_CONTACT_EMAIL: "support@circlecard.co.uk"
  };
}

function stageRepository() {
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });

  const repositoryFiles = new Set(execFileSync(
    "git",
    ["ls-files", "--cached", "-z"],
    { cwd: root, encoding: "utf8" }
  ).split("\0").filter(Boolean));

  for (const repositoryPath of explicitlyReviewedUntrackedBuildFiles) {
    if (!existsSync(join(root, repositoryPath))) {
      fail(`Reviewed build input ${repositoryPath} is missing.`);
    }
    repositoryFiles.add(repositoryPath);
  }

  for (const repositoryPath of repositoryFiles) {
    const basename = repositoryPath.split(/[\\/]/).at(-1) ?? "";
    if (basename.startsWith(".env")) continue;

    const source = join(root, repositoryPath);
    const destination = join(stage, repositoryPath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
  symlinkSync(
    join(root, "node_modules"),
    join(stage, "node_modules"),
    process.platform === "win32" ? "junction" : "dir"
  );

  const copiedEnvironmentFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local"
  ].filter((name) => existsSync(join(stage, name)));
  if (copiedEnvironmentFiles.length) {
    fail("Hermetic staging unexpectedly copied an environment file.");
  }
}

function prepareRuntimeBuildCopies() {
  const sourceBuild = join(stage, ".next");
  const sourceBuildId = readFileSync(join(sourceBuild, "BUILD_ID"), "utf8").trim();

  for (const runtimeDistDir of Object.values(runtimeDistDirs)) {
    const destination = join(stage, runtimeDistDir);
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(sourceBuild, destination, { recursive: true });

    const copiedBuildId = readFileSync(join(destination, "BUILD_ID"), "utf8").trim();
    if (copiedBuildId !== sourceBuildId) {
      fail(`Runtime build copy ${runtimeDistDir} does not match the source BUILD_ID.`);
    }
  }

  return sourceBuildId;
}

function removeCompletedStage() {
  const expectedRelativePath = join(".sandbox", "dual-runtime-smoke");
  const relativeStage = relative(root, stage);
  if (isAbsolute(relativeStage) || relativeStage !== expectedRelativePath) {
    fail("Refusing to remove an unexpected smoke staging path.");
  }
  rmSync(stage, { recursive: true, force: true });
}

async function run(command, args, options) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, options);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${args.join(" ")} exited with status ${code}.`));
    });
  });
}

async function build() {
  const safe = requireSafeBuildEnvironment();
  stageRepository();
  const environment = {
    ...safeApplicationEnvironment(safe),
    APP_BRAND: "bcn",
    APP_URL: "https://thebusinesscircle.net",
    AUTH_URL: "https://thebusinesscircle.net",
    NEXTAUTH_URL: "https://thebusinesscircle.net"
  };
  console.log("[dual-runtime-smoke] Building one hermetic BCN-seeded production artifact.");
  await run(process.execPath, [nextBin, "build"], {
    cwd: stage,
    env: environment,
    stdio: "inherit"
  });
  if (!existsSync(join(stage, ".next", "BUILD_ID"))) {
    fail("The staged production build did not produce .next/BUILD_ID.");
  }
  const buildId = prepareRuntimeBuildCopies();
  writeFileSync(
    join(stage, ".dual-runtime-build.json"),
    JSON.stringify({ buildId, builtWithBrand: "bcn", liveCredentialsUsed: false }, null, 2)
  );
}

function runtimeEnvironment(brand, port) {
  const safe = requireSafeBuildEnvironment();
  const circleCard = brand === "circle-card";
  const origin = circleCard
    ? "https://circlecard.co.uk"
    : "https://thebusinesscircle.net";
  return {
    ...safeApplicationEnvironment(safe),
    APP_BRAND: brand,
    APP_URL: origin,
    AUTH_URL: origin,
    NEXTAUTH_URL: origin,
    NEXT_RUNTIME_DIST_DIR: runtimeDistDirs[brand],
    PORT: String(port)
  };
}

async function assertPortAvailable(port) {
  await new Promise((resolvePromise, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => reject(new Error(`Local smoke port ${port} is already in use.`)));
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => error ? reject(error) : resolvePromise());
    });
  });
}

function startRuntime(name, brand, port) {
  const child = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: stage,
      env: runtimeEnvironment(brand, port),
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  processes.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  return child;
}

function request(
  port,
  host,
  path,
  method = "GET",
  forwardedHost = host,
  includeHost = true
) {
  return new Promise((resolvePromise, reject) => {
    const headers = {
      "X-Forwarded-Proto": "https"
    };
    if (includeHost) headers.Host = host;
    if (forwardedHost) headers["X-Forwarded-Host"] = forwardedHost;

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method,
        path,
        headers,
        setHost: includeHost
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolvePromise({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body
        }));
      }
    );
    req.setTimeout(10_000, () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function waitForRuntime(port, host) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await request(port, host, "/circle-card.webmanifest", "HEAD");
      if (response.status > 0) return;
    } catch {
      // The process may still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  fail(`Runtime on port ${port} did not become ready.`);
}

async function expectResponse(input) {
  const response = await request(
    input.port,
    input.host,
    input.path,
    input.method,
    input.forwardedHost,
    input.includeHost
  );
  if (!input.statuses.includes(response.status)) {
    fail(`${input.name}: expected ${input.statuses.join("/")}, received ${response.status}.`);
  }
  if (input.location && response.headers.location !== input.location) {
    fail(`${input.name}: unexpected redirect destination.`);
  }
  if (input.contains && !response.body.includes(input.contains)) {
    fail(`${input.name}: expected response branding was absent.`);
  }
  if (input.notContains && response.body.includes(input.notContains)) {
    fail(`${input.name}: response contained cross-brand output.`);
  }
  if (input.bodyNotEquals && response.body.trim() === input.bodyNotEquals) {
    fail(`${input.name}: request was rejected by middleware instead of reaching the route.`);
  }
  console.log(`[dual-runtime-smoke] PASS ${input.name} (${response.status})`);
}

function smokeChecks() {
  const circleOwnedPaths = [
    "/api/stripe/webhook",
    "/api/webhooks/resend/inbound",
    "/api/cron/intelligence-refresh",
    "/api/internal/circle-card/weekly-summary/run"
  ];
  const deniedMethods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

  return [
    { name: "BCN root remains BCN entry", port: bcnPort, host: "thebusinesscircle.net", path: "/", statuses: [307] },
    { name: "BCN login", port: bcnPort, host: "thebusinesscircle.net", path: "/login", statuses: [200], contains: "Business Circle", notContains: "https://circlecard.co.uk" },
    { name: "BCN register", port: bcnPort, host: "thebusinesscircle.net", path: "/register", statuses: [200], contains: "Business Circle" },
    { name: "BCN dashboard auth gate", port: bcnPort, host: "thebusinesscircle.net", path: "/dashboard", statuses: [307] },
    { name: "BCN legacy Circle Card", port: bcnPort, host: "thebusinesscircle.net", path: "/circle-card", statuses: [200], contains: "Circle Card" },
    { name: "BCN public card canonical", port: bcnPort, host: "thebusinesscircle.net", path: "/card/demo", statuses: [200], contains: "https://thebusinesscircle.net/card/demo" },
    { name: "BCN manifest remains BCN", port: bcnPort, host: "thebusinesscircle.net", path: "/manifest.webmanifest", statuses: [200], contains: "The Business Circle Network", notContains: "circlecard.co.uk" },
    { name: "BCN robots remain BCN", port: bcnPort, host: "thebusinesscircle.net", path: "/robots.txt", statuses: [200], contains: "https://thebusinesscircle.net/sitemap.xml", notContains: "circlecard.co.uk" },
    { name: "BCN sitemap remains BCN", port: bcnPort, host: "thebusinesscircle.net", path: "/sitemap.xml", statuses: [200], contains: "https://thebusinesscircle.net/", notContains: "circlecard.co.uk" },
    { name: "BCN legal canonical", port: bcnPort, host: "thebusinesscircle.net", path: "/privacy-policy", statuses: [200], contains: "https://thebusinesscircle.net/privacy-policy", notContains: "https://circlecard.co.uk/privacy-policy" },
    { name: "BCN webhook remains present", port: bcnPort, host: "thebusinesscircle.net", path: "/api/stripe/webhook", method: "POST", statuses: [400] },
    { name: "BCN cron remains credential protected", port: bcnPort, host: "thebusinesscircle.net", path: "/api/cron/intelligence-refresh", statuses: [401] },
    { name: "BCN internal route remains credential protected", port: bcnPort, host: "thebusinesscircle.net", path: "/api/internal/circle-card/weekly-summary/run", statuses: [401] },
    { name: "BCN inbound webhook remains signature protected", port: bcnPort, host: "thebusinesscircle.net", path: "/api/webhooks/resend/inbound", method: "POST", statuses: [400] },
    { name: "Circle Card home", port: circleCardPort, host: "circlecard.co.uk", path: "/", statuses: [200], contains: "Circle Card" },
    { name: "Circle Card Pro", port: circleCardPort, host: "circlecard.co.uk", path: "/pro", statuses: [200], contains: "Circle Card Pro" },
    { name: "Circle Card Teams", port: circleCardPort, host: "circlecard.co.uk", path: "/teams", statuses: [200], contains: "Circle Card" },
    { name: "Circle Card standards", port: circleCardPort, host: "circlecard.co.uk", path: "/community-standards", statuses: [200], contains: "Community Standards" },
    { name: "Circle Card app auth gate", port: circleCardPort, host: "circlecard.co.uk", path: "/app", statuses: [307] },
    { name: "Circle Card onboarding auth gate", port: circleCardPort, host: "circlecard.co.uk", path: "/app/onboarding", statuses: [307] },
    { name: "Circle Card Studio auth gate", port: circleCardPort, host: "circlecard.co.uk", path: "/app/studio", statuses: [307] },
    { name: "Circle Card wallet auth gate", port: circleCardPort, host: "circlecard.co.uk", path: "/app/wallet", statuses: [307] },
    { name: "Circle Card testimonial auth gate", port: circleCardPort, host: "circlecard.co.uk", path: "/app/testimonial", statuses: [307] },
    { name: "Circle Card public card canonical", port: circleCardPort, host: "circlecard.co.uk", path: "/card/demo", statuses: [200], contains: "https://circlecard.co.uk/card/demo" },
    { name: "Circle Card trust canonical", port: circleCardPort, host: "circlecard.co.uk", path: "/card/demo/trust", statuses: [200], contains: "https://circlecard.co.uk/card/demo/trust" },
    { name: "Circle Card static asset", port: circleCardPort, host: "circlecard.co.uk", path: "/circle-card-icon-192.png", method: "HEAD", statuses: [200] },
    { name: "Circle Card image optimisation", port: circleCardPort, host: "circlecard.co.uk", path: "/_next/image?url=%2Fcircle-card-icon-192.png&w=64&q=75", statuses: [200] },
    { name: "Circle Card image proxy blocks owner route", port: circleCardPort, host: "circlecard.co.uk", path: "/_next/image?url=%2Fapi%2Finternal%2Fcircle-card%2Fweekly-summary%2Frun&w=64&q=75", statuses: [404] },
    { name: "Circle Card manifest GET", port: circleCardPort, host: "circlecard.co.uk", path: "/circle-card.webmanifest", statuses: [200], contains: "\"start_url\":\"/app\"" },
    { name: "Circle Card manifest HEAD", port: circleCardPort, host: "circlecard.co.uk", path: "/circle-card.webmanifest", method: "HEAD", statuses: [200] },
    { name: "Circle Card rejects BCN manifest", port: circleCardPort, host: "circlecard.co.uk", path: "/manifest.webmanifest", statuses: [404] },
    { name: "Circle Card robots", port: circleCardPort, host: "circlecard.co.uk", path: "/robots.txt", statuses: [200], contains: "https://circlecard.co.uk/sitemap.xml", notContains: "thebusinesscircle.net" },
    { name: "Circle Card sitemap", port: circleCardPort, host: "circlecard.co.uk", path: "/sitemap.xml", statuses: [200], contains: "https://circlecard.co.uk/pro", notContains: "thebusinesscircle.net" },
    { name: "Circle Card legal canonical", port: circleCardPort, host: "circlecard.co.uk", path: "/privacy-policy", statuses: [200], contains: "https://circlecard.co.uk/privacy-policy", notContains: "https://thebusinesscircle.net/privacy-policy" },
    { name: "Circle Card metadata remains isolated after BCN requests", port: circleCardPort, host: "circlecard.co.uk", path: "/robots.txt", statuses: [200], contains: "https://circlecard.co.uk/sitemap.xml", notContains: "thebusinesscircle.net" },
    { name: "Circle Card denies BCN page GET", port: circleCardPort, host: "circlecard.co.uk", path: "/membership", statuses: [307], location: "https://circlecard.co.uk/" },
    { name: "Circle Card denies BCN page HEAD", port: circleCardPort, host: "circlecard.co.uk", path: "/membership", method: "HEAD", statuses: [307], location: "https://circlecard.co.uk/" },
    { name: "Circle Card denies BCN dashboard", port: circleCardPort, host: "circlecard.co.uk", path: "/dashboard", statuses: [307], location: "https://circlecard.co.uk/" },
    ...["POST", "PUT", "PATCH", "DELETE"].map((method) => ({ name: `Circle Card denies BCN ${method}`, port: circleCardPort, host: "circlecard.co.uk", path: "/membership", method, statuses: [404] })),
    ...circleOwnedPaths.flatMap((path) => deniedMethods.map((method) => ({ name: `Circle Card denies ${method} ${path}`, port: circleCardPort, host: "circlecard.co.uk", path, method, statuses: [404] }))),
    { name: "Circle Card denies trailing-slash webhook", port: circleCardPort, host: "circlecard.co.uk", path: "/api/stripe/webhook/", method: "POST", statuses: [404] },
    { name: "Next normalizes duplicate-slash owner route before application logic", port: circleCardPort, host: "circlecard.co.uk", path: "//api//internal//circle-card//weekly-summary//run", method: "POST", statuses: [308] },
    { name: "Circle Card denies encoded internal route", port: circleCardPort, host: "circlecard.co.uk", path: "/api%2Finternal%2Fcircle-card%2Fweekly-summary%2Frun", method: "POST", statuses: [400, 404] },
    { name: "Extension-ending API reaches routing", port: circleCardPort, host: "circlecard.co.uk", path: "/api/circle-card/export.csv", statuses: [404], bodyNotEquals: "Not Found" },
    { name: "Unknown host rejected", port: bcnPort, host: "attacker.example", path: "/", statuses: [421] },
    { name: "Missing host rejected", port: bcnPort, host: "", path: "/", includeHost: false, forwardedHost: "", statuses: [400, 421] },
    { name: "Forwarded host mismatch rejected", port: circleCardPort, host: "circlecard.co.uk", forwardedHost: "attacker.example", path: "/", statuses: [421] },
    { name: "Duplicate forwarded host rejected", port: circleCardPort, host: "circlecard.co.uk", forwardedHost: "circlecard.co.uk, attacker.example", path: "/", statuses: [421] },
    { name: "BCN www page canonicalises", port: bcnPort, host: "www.thebusinesscircle.net", path: "/login", statuses: [308], location: "https://thebusinesscircle.net/login" },
    { name: "Circle Card www page canonicalises", port: circleCardPort, host: "www.circlecard.co.uk", path: "/pro", statuses: [308], location: "https://circlecard.co.uk/pro" },
    { name: "Circle Card www API does not redirect", port: circleCardPort, host: "www.circlecard.co.uk", path: "/api/auth/session", method: "GET", statuses: [404] },
    { name: "BCN www webhook does not redirect", port: bcnPort, host: "www.thebusinesscircle.net", path: "/api/stripe/webhook", method: "POST", statuses: [404] },
    { name: "Auth callback path reaches Auth.js", port: circleCardPort, host: "circlecard.co.uk", path: "/api/auth/callback/credentials", statuses: [200, 302, 400, 405] },
    { name: "Auth session path reachable", port: circleCardPort, host: "circlecard.co.uk", path: "/api/auth/session", statuses: [200] }
  ];
}

async function smokeRound(startOrder) {
  await Promise.all([assertPortAvailable(bcnPort), assertPortAvailable(circleCardPort)]);
  const starts = {
    bcn: () => startRuntime("bcn", "bcn", bcnPort),
    "circle-card": () => startRuntime("circle-card", "circle-card", circleCardPort)
  };
  for (const brand of startOrder) starts[brand]();
  await Promise.all([
    waitForRuntime(bcnPort, "thebusinesscircle.net"),
    waitForRuntime(circleCardPort, "circlecard.co.uk")
  ]);

  for (const check of smokeChecks()) {
    await expectResponse(check);
  }
}

async function smoke() {
  const buildMarker = join(stage, ".dual-runtime-build.json");
  if (!existsSync(buildMarker)) {
    fail("No hermetic staged build exists. Run npm run smoke:dual-runtime:build first.");
  }
  const marker = JSON.parse(readFileSync(buildMarker, "utf8"));
  if (marker.builtWithBrand !== "bcn" || marker.liveCredentialsUsed !== false) {
    fail("The staged build marker is invalid.");
  }
  for (const runtimeDistDir of Object.values(runtimeDistDirs)) {
    const buildIdPath = join(stage, runtimeDistDir, "BUILD_ID");
    if (!existsSync(buildIdPath) || readFileSync(buildIdPath, "utf8").trim() !== marker.buildId) {
      fail(`Runtime build copy ${runtimeDistDir} is missing or does not match the build marker.`);
    }
  }

  for (const startOrder of [["bcn", "circle-card"], ["circle-card", "bcn"]]) {
    console.log(`[dual-runtime-smoke] Starting alternating round: ${startOrder.join(" then ")}.`);
    try {
      await smokeRound(startOrder);
    } finally {
      await stopProcesses();
    }
  }
}

async function stopProcesses() {
  const children = processes.splice(0, processes.length);
  await Promise.all(children.map((child) => new Promise((resolvePromise) => {
    if (child.exitCode !== null) return resolvePromise();
    child.once("exit", resolvePromise);
    child.kill();
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2_000).unref();
  })));
}

try {
  if (mode === "build") {
    await build();
  } else if (mode === "run") {
    await smoke();
  } else {
    fail("Usage: node scripts/dual-runtime-smoke.mjs build|run");
  }
  completed = true;
} finally {
  await stopProcesses();
  if (mode === "run" && completed) {
    removeCompletedStage();
  }
}
