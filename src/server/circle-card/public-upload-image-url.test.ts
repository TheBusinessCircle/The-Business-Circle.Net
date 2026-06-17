import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  parsePublicUploadImageUrl,
  resolvePublicUploadImageUrl
} from "@/server/circle-card/public-upload-image-url";

const SITE_URL = "https://thebusinesscircle.net";
const TEST_UPLOAD_PATH = "/uploads/circle-card/public-upload-image-url-test.jpg";
const TEST_UPLOAD_FILE = resolve(process.cwd(), "public", "uploads", "circle-card", "public-upload-image-url-test.jpg");

afterEach(async () => {
  await rm(TEST_UPLOAD_FILE, { force: true });
});

describe("public upload image URL resolution", () => {
  it("keeps external image URLs without filesystem checks", async () => {
    await expect(
      resolvePublicUploadImageUrl("https://res.cloudinary.com/demo/image/upload/card.jpg", SITE_URL)
    ).resolves.toBe("https://res.cloudinary.com/demo/image/upload/card.jpg");
  });

  it("keeps relative public upload URLs when the file exists", async () => {
    await mkdir(resolve(process.cwd(), "public", "uploads", "circle-card"), { recursive: true });
    await writeFile(TEST_UPLOAD_FILE, Buffer.from("not really an image"));

    await expect(resolvePublicUploadImageUrl(TEST_UPLOAD_PATH, SITE_URL)).resolves.toBe(TEST_UPLOAD_PATH);
  });

  it("removes stale relative public upload URLs when the file is missing", async () => {
    await expect(resolvePublicUploadImageUrl(TEST_UPLOAD_PATH, SITE_URL)).resolves.toBeNull();
  });

  it("treats same-site absolute upload URLs as public upload files", () => {
    expect(parsePublicUploadImageUrl(`${SITE_URL}${TEST_UPLOAD_PATH}?v=1`, SITE_URL)).toEqual({
      imageUrl: `${SITE_URL}${TEST_UPLOAD_PATH}?v=1`,
      publicUploadPathname: TEST_UPLOAD_PATH
    });
  });
});
