import { lstatSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { connect } from "node:net";
import { randomBytes } from "node:crypto";
import { OWNER_ROUTE_METHODS, OWNER_ROUTE_VARIANTS, assertOwnerRouteDenial, assertUncachedPublicResponse } from "./http-policy.mjs";

const stage = process.argv[2];
const scope = process.argv[3] ?? "both";
const bcnPort = Number(process.argv[4] || 3000);
const circlePort = Number(process.argv[5] || 3200);
if (!new Set(["private", "public"]).has(stage) || !new Set(["bcn-only", "circle-only", "both"]).has(scope) ||
    !Number.isInteger(bcnPort) || !Number.isInteger(circlePort)) {
  throw new Error("Usage: smoke-http.mjs <private|public> <bcn-only|circle-only|both> [bcn-port] [circle-port]");
}

const fixturePath = "/var/lib/thebusinesscircle/deployment-state/smoke-fixtures.json";
const fixtureStats = lstatSync(fixturePath);
const fixtureParent = lstatSync(dirname(fixturePath));
if (!fixtureParent.isDirectory() || fixtureParent.isSymbolicLink() || fixtureParent.uid !== 0 || (fixtureParent.mode & 0o777) !== 0o700 || !fixtureStats.isFile() || fixtureStats.isSymbolicLink() || fixtureStats.nlink !== 1 || fixtureStats.uid !== 0 ||
    (fixtureStats.mode & 0o777) !== 0o600) {
  throw new Error("Smoke fixture file must be a root-owned regular file with mode 0600.");
}
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(fixtures.publicCardSlug ?? "") ||
    !/^[A-Za-z0-9_-]{2,100}$/.test(fixtures.referralCode ?? "") ||
    !/^\/uploads\/[A-Za-z0-9_./-]+$/.test(fixtures.publicUploadPath ?? "") ||
    !/^\/generated\/community-source-previews\/[A-Za-z0-9_./-]+$/.test(fixtures.communityPreviewPath ?? "") ||
    [fixtures.publicUploadPath, fixtures.communityPreviewPath].some((path) => String(path).split("/").some((part) => part === "." || part === ".."))) {
  throw new Error("Smoke fixtures are missing or malformed; values are not displayed.");
}

function endpoint(brand, path) {
  if (stage === "public") {
    const url = new URL(path, brand === "bcn" ? "https://thebusinesscircle.net" : "https://circlecard.co.uk");
    url.searchParams.set("phase-f1-cache-bypass", randomBytes(12).toString("hex"));
    return url;
  }
  return new URL(path, brand === "bcn" ? `http://127.0.0.1:${bcnPort}` : `http://127.0.0.1:${circlePort}`);
}

function headers(brand, overrides = {}) {
  if (stage === "public") return { "Cache-Control": "no-cache, no-store", Pragma: "no-cache", ...overrides };
  const host = brand === "bcn" ? "thebusinesscircle.net" : "circlecard.co.uk";
  return { Host: host, "X-Forwarded-Host": host, "X-Forwarded-Proto": "https", ...overrides };
}

async function request(brand, path, options = {}) {
  const response = await fetch(endpoint(brand, path), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...options,
    headers: headers(brand, options.headers)
  });
  const body = await response.text();
  if (stage === "public") assertUncachedPublicResponse(response.headers);
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rawStatus(port, payload) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port });
    let response = "";
    const timer = setTimeout(() => socket.destroy(new Error("raw HTTP smoke timeout")), 5_000);
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end(payload));
    socket.on("data", (chunk) => { response += chunk; });
    socket.on("error", reject);
    socket.on("close", () => {
      clearTimeout(timer);
      const status = Number(response.match(/^HTTP\/1\.[01] (\d{3})/)?.[1]);
      if (Number.isInteger(status)) resolve(status);
      else reject(new Error("raw HTTP smoke returned no status"));
    });
  });
}

function assertBrandBody(brand, path, body) {
  if (brand === "circle-card") {
    assert(/Circle Card/i.test(body), `${path} lacks Circle Card identity.`);
    for (const leak of [/One BCN login/i, /Built into BCN/i, /relationship layer of The Business Circle/i]) {
      assert(!leak.test(body), `${path} contains a BCN product-identity leak.`);
    }
  } else {
    assert(/Business Circle/i.test(body), `${path} lacks BCN identity.`);
  }
}

async function expectPage(brand, path, origin) {
  const { response, body } = await request(brand, path);
  assert(response.status === 200, `${brand} ${path} status=${response.status}`);
  assert(response.headers.get("content-type")?.includes("text/html"), `${brand} ${path} is not HTML.`);
  assertBrandBody(brand, path, body);
  assert(body.includes(origin), `${brand} ${path} lacks its canonical origin.`);
  const other = brand === "bcn" ? "https://circlecard.co.uk" : "https://thebusinesscircle.net";
  if (brand === "circle-card") {
    assert(!body.includes(`${other}/login`) && !body.includes(`${other}/register`), `${path} has cross-brand auth links.`);
  }
}

async function expectAuthGate(brand, path, origin) {
  const { response } = await request(brand, path);
  assert(response.status === 307, `${brand} ${path} auth status=${response.status}`);
  const location = new URL(response.headers.get("location"), origin);
  assert(location.origin === origin && location.pathname === "/login", `${brand} ${path} left its auth origin.`);
  assert(location.searchParams.get("from") === path, `${brand} ${path} lost its exact return path.`);
}

async function circleChecks() {
  const origin = "https://circlecard.co.uk";
  for (const path of ["/", "/pro", "/teams", "/community-standards", "/privacy-policy", "/login", "/register"]) {
    await expectPage("circle-card", path, origin);
  }
  const pro = await request("circle-card", "/pro");
  assert(!pro.body.includes("/api/stripe") && !/public billing enabled/i.test(pro.body), "Circle public billing appears exposed.");
  for (const path of ["/app", "/app/onboarding", "/app/studio", "/app/wallet", "/app/testimonial"]) {
    await expectAuthGate("circle-card", path, origin);
  }
  const manifest = await request("circle-card", "/circle-card.webmanifest");
  assert(manifest.response.status === 200 && manifest.response.headers.get("content-type")?.includes("manifest"), "Circle manifest response invalid.");
  const manifestJson = JSON.parse(manifest.body);
  assert(manifestJson.name === "Circle Card" && manifestJson.start_url === "/app", "Circle manifest identity invalid.");
  const robots = await request("circle-card", "/robots.txt");
  assert(robots.response.status === 200 && robots.body.includes(`${origin}/sitemap.xml`) && !robots.body.includes("thebusinesscircle.net"), "Circle robots origin invalid.");
  const sitemap = await request("circle-card", "/sitemap.xml");
  assert(sitemap.response.status === 200 && sitemap.body.includes(origin) && !sitemap.body.includes("thebusinesscircle.net"), "Circle sitemap origin invalid.");
  const icon = await request("circle-card", "/circle-card-icon-192.png");
  assert(icon.response.status === 200 && icon.response.headers.get("content-type")?.startsWith("image/"), "Circle static icon invalid.");
  const image = await request("circle-card", "/_next/image?url=%2Fcircle-card-icon-192.png&w=64&q=75");
  assert(image.response.status === 200 && image.response.headers.get("content-type")?.startsWith("image/"), "Circle image optimiser invalid.");
  const publicCard = await request("circle-card", `/card/${encodeURIComponent(fixtures.publicCardSlug)}`);
  assert(publicCard.response.status === 200 && publicCard.response.headers.get("content-type")?.includes("text/html"), "Circle public-card fixture failed.");
  assertBrandBody("circle-card", "/card/[fixture]", publicCard.body);
  const referral = await request("circle-card", `/r/${encodeURIComponent(fixtures.referralCode)}`);
  const referralLocation = new URL(referral.response.headers.get("location"), origin);
  assert(referral.response.status === 307 && referralLocation.origin === origin &&
    referralLocation.pathname === "/circle-card" &&
    referralLocation.searchParams.get("referredBy") === fixtures.referralCode,
  "Circle referral fixture destination failed.");
  const upload = await request("circle-card", fixtures.publicUploadPath);
  assert(upload.response.status === 200 && !upload.response.headers.get("content-type")?.includes("text/html"), "Shared public-upload fixture failed.");
  for (const path of OWNER_ROUTE_VARIANTS) {
    for (const method of OWNER_ROUTE_METHODS) {
      const result = await request("circle-card", path, { method });
      assertOwnerRouteDenial({ status: result.response.status, location: result.response.headers.get("location") }, method, path);
    }
  }
  const deniedGet = await request("circle-card", "/membership");
  assert(deniedGet.response.status === 307 && new URL(deniedGet.response.headers.get("location"), origin).href === `${origin}/`, "Circle BCN-page redirect invalid.");
  const deniedPost = await request("circle-card", "/membership", { method: "POST" });
  assert(deniedPost.response.status === 404 && !deniedPost.response.headers.has("location"), "Circle mutating BCN-page denial invalid.");
  if (stage === "private") {
    const unknown = await fetch(`http://127.0.0.1:${circlePort}/`, { redirect: "manual", headers: headers("circle-card", { Host: "attacker.invalid", "X-Forwarded-Host": "attacker.invalid" }) });
    assert(unknown.status === 421, "Circle unknown Host was not rejected.");
    const mismatch = await fetch(`http://127.0.0.1:${circlePort}/`, { redirect: "manual", headers: headers("circle-card", { "X-Forwarded-Host": "attacker.invalid" }) });
    assert(mismatch.status === 421, "Circle forwarded-host mismatch was not rejected.");
    const missingHost = await rawStatus(circlePort, "GET / HTTP/1.1\r\nConnection: close\r\n\r\n");
    assert(missingHost === 400 || missingHost === 421, `Circle missing Host denial changed: ${missingHost}`);
    const duplicateHost = await rawStatus(circlePort, "GET / HTTP/1.1\r\nHost: circlecard.co.uk\r\nHost: attacker.invalid\r\nConnection: close\r\n\r\n");
    assert(duplicateHost >= 400 && duplicateHost < 500, `Circle duplicate Host was not rejected: ${duplicateHost}`);
  }
}

async function bcnChecks() {
  const origin = "https://thebusinesscircle.net";
  const root = await request("bcn", "/");
  assert(root.response.status === 307 && new URL(root.response.headers.get("location"), origin).href === `${origin}/join-desktop`, "BCN homepage redirect invalid.");
  for (const path of ["/login", "/register", "/circle-card"]) await expectPage("bcn", path, origin);
  await expectAuthGate("bcn", "/dashboard", origin);
  const manifest = await request("bcn", "/circle-card.webmanifest");
  assert(manifest.response.status === 200 && JSON.parse(manifest.body).start_url === "/dashboard/circle-card", "BCN manifest changed.");
  const robots = await request("bcn", "/robots.txt");
  assert(robots.body.includes(`${origin}/sitemap.xml`) && !robots.body.includes("circlecard.co.uk"), "BCN robots origin invalid.");
  const sitemap = await request("bcn", "/sitemap.xml");
  assert(sitemap.body.includes(origin) && !sitemap.body.includes("circlecard.co.uk"), "BCN sitemap origin invalid.");
  const preview = await request("bcn", fixtures.communityPreviewPath);
  assert(preview.response.status === 200 && preview.response.headers.get("content-type")?.startsWith("image/"), "BCN generated-preview fixture failed.");
  const webhook = await request("bcn", "/api/stripe/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": "invalid-phase-f1-smoke" },
    body: '{"preflight":"invalid-signature"}'
  });
  assert(webhook.response.status === 400 && !webhook.response.headers.has("location"), "BCN webhook invalid-signature baseline changed.");
  const cron = await request("bcn", "/api/cron/intelligence-refresh");
  assert(cron.response.status === 401 && !cron.response.headers.has("location"), "BCN cron ownership baseline changed.");
  const internal = await request("bcn", "/api/internal/circle-card/weekly-summary/run", { method: "POST" });
  assert(internal.response.status === 401 && !internal.response.headers.has("location"), "BCN internal ownership baseline changed.");
  const inbound = await request("bcn", "/api/webhooks/resend/inbound", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
  });
  assert(inbound.response.status === 400 && !inbound.response.headers.has("location"), "BCN inbound ownership baseline changed.");
  if (stage === "private") {
    const unknown = await fetch(`http://127.0.0.1:${bcnPort}/`, {
      redirect: "manual", headers: headers("bcn", { Host: "attacker.invalid", "X-Forwarded-Host": "attacker.invalid" })
    });
    assert(unknown.status === 421, "BCN unknown Host was not rejected.");
    const mismatch = await fetch(`http://127.0.0.1:${bcnPort}/`, {
      redirect: "manual", headers: headers("bcn", { "X-Forwarded-Host": "attacker.invalid" })
    });
    assert(mismatch.status === 421, "BCN forwarded-host mismatch was not rejected.");
  }
}

if (scope !== "bcn-only") await circleChecks();
if (scope !== "circle-only") await bcnChecks();
console.log(`Semantic ${stage} smoke passed for scope=${scope}; authenticated fixtures remain a separate gate.`);
