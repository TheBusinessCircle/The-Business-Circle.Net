import assert from "node:assert/strict";
import test from "node:test";
import { createForwardBuildRoleRecord, forwardBuildRole, validateForwardBuildRoleRecord } from "./build-role-contract.mjs";
import { createForwardBuildEnvironment, resolveForwardBuildTarget } from "./build-command.mjs";

const authority = "a".repeat(40);
test("forward roles are a closed fixed brand and origin model", () => {
  const bcn = createForwardBuildRoleRecord("bcn", authority, "bcn-build-id");
  const circle = createForwardBuildRoleRecord("circle-card", authority, "circle-build-id");
  assert.equal(bcn.appBrand, "bcn"); assert.equal(bcn.publicOrigin, "https://thebusinesscircle.net");
  assert.equal(circle.appBrand, "circle-card"); assert.equal(circle.publicOrigin, "https://circlecard.co.uk");
  assert.notEqual(bcn.buildIdSha256, circle.buildIdSha256);
  assert.throws(() => forwardBuildRole("forward"), /exactly bcn or circle-card/u);
  assert.throws(() => validateForwardBuildRoleRecord({ ...circle, bcnBuildOutputReused: true }), /invalid/u);
});

test("protected build input cannot override role identity", () => {
  const bcn = createForwardBuildEnvironment("bcn", { NEXT_PUBLIC_SAFE_FLAG: "yes" }, { secret: () => "synthetic-secret" });
  const circle = createForwardBuildEnvironment("circle-card", {}, { secret: () => "synthetic-secret" });
  assert.equal(bcn.APP_BRAND, "bcn"); assert.equal(bcn.APP_URL, "https://thebusinesscircle.net");
  assert.equal(circle.APP_BRAND, "circle-card"); assert.equal(circle.APP_URL, "https://circlecard.co.uk");
  assert.equal(circle.BCN_COMMUNITY_AUTOMATION_ENABLED, "false");
  for (const key of ["APP_BRAND", "APP_URL", "AUTH_URL", "PHASE_F1_BUILD_ROLE"]) assert.throws(() => createForwardBuildEnvironment("bcn", { [key]: "caller" }), /override/u);
  assert.throws(() => createForwardBuildEnvironment("arbitrary"), /exactly/u);
});

test("both roles receive their own Next build invocation", () => {
  const bcn = resolveForwardBuildTarget("next", "bcn", "/workspace");
  const circle = resolveForwardBuildTarget("next", "circle-card", "/workspace");
  assert.deepEqual(bcn, circle);
  assert.match(bcn[0], /node_modules[\\/]next[\\/]dist[\\/]bin[\\/]next$/u);
  assert.throws(() => resolveForwardBuildTarget("next", "other", "/workspace"), /exactly/u);
});
