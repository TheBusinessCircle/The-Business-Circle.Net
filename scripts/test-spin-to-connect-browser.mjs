import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = process.env.SPIN_TEST_BASE_URL || "http://127.0.0.1:3100";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome or Edge was not found. Set CHROME_PATH to run the Spin browser test.");
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertDialog(page, viewport, expectedPosition) {
  const dialog = page.locator("[data-spin-to-connect-dialog]");
  const backdrop = page.locator("[data-spin-to-connect-backdrop]");
  const panel = page.locator("[data-spin-to-connect-panel]");
  await dialog.waitFor({ state: "visible", timeout: 6000 });

  const layers = await page.evaluate(() => {
    const dialogElement = document.querySelector("[data-spin-to-connect-dialog]");
    const backdropElement = document.querySelector("[data-spin-to-connect-backdrop]");
    const publicRoot = document.querySelector(".circle-card-public-theme");

    return {
      dialogInBody: dialogElement?.parentElement === document.body,
      backdropInBody: backdropElement?.parentElement === document.body,
      dialogZ: dialogElement ? getComputedStyle(dialogElement).zIndex : null,
      backdropZ: backdropElement ? getComputedStyle(backdropElement).zIndex : null,
      backdropFilter: backdropElement ? getComputedStyle(backdropElement).backdropFilter : null,
      publicRootFilter: publicRoot ? getComputedStyle(publicRoot).filter : null,
      bodyOverflow: document.body.style.overflow
    };
  });

  invariant(layers.dialogInBody, "Spin dialog is not portalled directly to document.body.");
  invariant(layers.backdropInBody, "Spin backdrop is not portalled directly to document.body.");
  invariant(Number(layers.dialogZ) > Number(layers.backdropZ), "Dialog is not above its backdrop.");
  invariant(layers.backdropFilter === "none", "Backdrop unexpectedly applies backdrop-filter.");
  invariant(layers.publicRootFilter === "none", "Public Circle Card root is filtered.");
  invariant(layers.bodyOverflow === "hidden", "Body scrolling was not locked while dialog is open.");

  const box = await panel.boundingBox();
  invariant(box, "Spin dialog panel has no visible bounding box.");
  invariant(box.x >= 0 && box.y >= 0, "Spin dialog panel begins outside the viewport.");
  invariant(box.x + box.width <= viewport.width + 1, "Spin dialog panel overflows horizontally.");
  invariant(box.y + box.height <= viewport.height + 1, "Spin dialog panel is below the viewport.");

  if (expectedPosition === "bottom") {
    invariant(viewport.height - (box.y + box.height) <= 16, "Mobile dialog is not bottom aligned.");
  } else {
    const panelCenter = box.y + box.height / 2;
    invariant(Math.abs(panelCenter - viewport.height / 2) <= 30, "Desktop dialog is not centred.");
  }

  const signupHref = await page.getByRole("link", { name: "Create My Free Circle Card" }).getAttribute("href");
  const loginHref = await page.getByRole("link", { name: /Already have an account/ }).getAttribute("href");
  invariant(signupHref?.startsWith("/register?"), "Signup CTA does not use /register.");
  invariant(signupHref.includes("source=circle-card"), "Signup CTA lost Circle Card source context.");
  invariant(signupHref.includes("returnTo="), "Signup CTA lost the Spin return path.");
  invariant(loginHref?.startsWith("/login?from="), "Login CTA does not use /login with a return path.");

  return { dialog, backdrop, panel };
}

async function runScenario(browser, input) {
  const context = await browser.newContext({
    viewport: input.viewport,
    isMobile: input.mobile,
    hasTouch: input.mobile,
    reducedMotion: "no-preference",
    userAgent: input.userAgent
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/card/demo`, { waitUntil: "networkidle" });
  const spinButton = page.getByRole("button", { name: /Spin .*Circle Card/ }).first();
  await spinButton.click();
  await assertDialog(page, input.viewport, input.position);

  await page.getByRole("button", { name: "Close connection modal" }).click();
  await page.locator("[data-spin-to-connect-dialog]").waitFor({ state: "detached" });
  invariant(
    (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "Closing the dialog did not restore body scrolling."
  );

  await spinButton.click();
  await assertDialog(page, input.viewport, input.position);
  await page.keyboard.press("Escape");
  await page.locator("[data-spin-to-connect-dialog]").waitFor({ state: "detached" });
  invariant(
    (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
    "Escape did not restore body scrolling."
  );

  if (input.mobile) {
    await spinButton.click();
    await assertDialog(page, input.viewport, input.position);
    if (process.env.SPIN_TEST_SCREENSHOT) {
      await page.screenshot({ path: process.env.SPIN_TEST_SCREENSHOT, fullPage: false });
    }

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/register"),
      page.getByRole("link", { name: "Create My Free Circle Card" }).click()
    ]);
    invariant(
      new URL(page.url()).searchParams.get("source") === "circle-card",
      "Signup navigation lost the canonical Circle Card source."
    );

    await page.goBack({ waitUntil: "networkidle" });
    const returnedSpinButton = page.getByRole("button", { name: /Spin .*Circle Card/ }).first();
    await returnedSpinButton.click();
    await assertDialog(page, input.viewport, input.position);
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/login"),
      page.getByRole("link", { name: /Already have an account/ }).click()
    ]);
  }

  await context.close();
}

const browser = await chromium.launch({ executablePath, headless: true });

try {
  await runScenario(browser, {
    viewport: { width: 320, height: 700 },
    mobile: true,
    position: "bottom",
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"
  });
  await runScenario(browser, {
    viewport: { width: 1280, height: 800 },
    mobile: false,
    position: "centre",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
  });
  console.info("Spin To Connect browser checks passed at 320x700 and 1280x800.");
} finally {
  await browser.close();
}
