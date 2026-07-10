import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const studio = readFileSync(join(root, "src/components/circle-card/circle-studio.tsx"), "utf8");
const studioPage = readFileSync(
  join(root, "src/app/(member)/dashboard/circle-card/studio/page.tsx"),
  "utf8"
);
const action = readFileSync(join(root, "src/actions/circle-card.actions.ts"), "utf8");
const publicService = readFileSync(
  join(root, "src/server/circle-card/public-card.service.ts"),
  "utf8"
);
const publicProfile = readFileSync(
  join(root, "src/components/circle-card/public-circle-card-profile.tsx"),
  "utf8"
);
const themeResolver = readFileSync(join(root, "src/lib/circle-card/theme.ts"), "utf8");

describe("Circle Studio activation live render contract", () => {
  it("submits the exact preview metadata plus fine tune fallback fields", () => {
    expect(studio).toContain("const previewMetadata = useMemo(() => buildCircleStudioMetadata(tokens, \"CORE\", fineTune)");
    expect(studio).toContain("<LiveCardPreview card={card} metadata={previewMetadata} device={device} />");
    expect(studio).toContain('name="studioMetadataJson"');
    expect(studio).toContain("JSON.stringify(previewMetadata)");
    expect(studio).toContain('name="fineTuneBackgroundImageUrl"');
    expect(studio).toContain('name="fineTuneBackgroundOverlay"');
  });

  it("saves parsed preview metadata to the selected card without rebuilding defaults", () => {
    expect(action).toContain("readCircleStudioActivationMetadata(formData)");
    expect(action).toContain('formData.get("studioMetadataJson")');
    expect(action).toContain("readCircleStudioMetadata(JSON.parse(rawMetadata))");
    expect(action).toContain("const metadata = submittedMetadata ?? buildCircleStudioMetadata");
    expect(action).toContain("const tokens = metadata.tokens");
    expect(action).toContain("const fineTune = metadata.fineTune");
    expect(action).toContain("where: { id: cardId, userId: user.id, archivedAt: null }");
    expect(action).toContain("themeMetadata: metadata as Prisma.InputJsonValue");
  });

  it("keeps Personal and Business card activations scoped to the selected card", () => {
    expect(studio).toContain('name="cardId" value={card.id}');
    expect(studio).toContain('name="returnPath" value={`/dashboard/circle-card/studio?card=${card.id}`}');
    expect(studioPage).toContain("const card = requestedCard ?? persistedCard ?? defaultLiveCard ?? cards[0]");
    expect(action).toContain("where: { id: card.id }");
  });

  it("revalidates Studio, public card and Circle Trust before opening live links", () => {
    expect(action).toContain('revalidatePath("/dashboard/circle-card/studio")');
    expect(action).toContain('revalidatePath("/dashboard/circle-card")');
    expect(action).toContain("revalidatePath(`/card/${slug}`)");
    expect(action).toContain("revalidatePath(`/card/${slug}/trust`)");
    expect(action).toContain('appendQueryParam(returnPath, "activatedAt", String(Date.now()))');
    expect(studioPage).toContain("activatedAt={firstValue(params.activatedAt)}");
    expect(studio).toContain('`?studio=${encodeURIComponent(activatedAt)}`');
    expect(studio).toContain("Your Circle Card style is live.");
  });

  it("prevents Free users from activating while preserving the preview", () => {
    expect(studio).toContain("canActivate ? <ActivateIdentityButton");
    expect(studio).toContain('href="/circle-card/pro"');
    expect(action).toContain('redirectWithError(returnPath, "studio-pro-required")');
  });

  it("returns saved metadata to the public root and uploaded background variables", () => {
    expect(publicService).toContain("themeMetadata: true");
    expect(publicService).toContain("themeMetadata,");
    expect(publicProfile).toContain("resolveCircleCardLiveTheme(card)");
    expect(publicProfile).toContain("{...circleStudioAttributes}");
    expect(themeResolver).toContain('"data-cc-identity"');
    expect(themeResolver).toContain("--cc-theme-page-bg");
    expect(themeResolver).toContain("Math.max(0.34, theme.fineTune.backgroundOverlay - 0.24)");
    expect(themeResolver).toContain("url(\"${escapedBackgroundImage}\")");
  });
});
