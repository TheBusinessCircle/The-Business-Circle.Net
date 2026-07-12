import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/media/cloudinary", () => ({
  isCloudinaryConfigured: () => false,
  uploadImageToCloudinary: vi.fn()
}));

import { GET as getPublicImage } from "@/app/api/circle-card/public-image/[...path]/route";
import { isSafeCircleCardImageUrl } from "@/lib/circle-card/image-url";
import { resolvePublicUploadImageUrl } from "@/server/circle-card/public-upload-image-url";
import {
  circleCardImageUploadDirectory,
  circleCardLinkFileUploadDirectory,
  persistCircleCardImageUpload,
  persistCircleCardLinkFileUpload,
  isCircleCardImageUploadKind,
  removeOwnedCircleCardImageUpload,
  readCircleCardImage,
  readCircleCardLinkFile,
  resolveCircleCardLinkFilePath,
  resolveCircleCardImageFilePath
} from "@/server/circle-card/upload.service";

const SITE_URL = "https://thebusinesscircle.net";
const createdFiles: string[] = [];

afterEach(async () => {
  await Promise.all(createdFiles.splice(0).map((file) => rm(file, { force: true })));
});

describe("Circle Card local image storage", () => {
  it("accepts the protected Studio background upload kind", () => {
    expect(isCircleCardImageUploadKind("background-image")).toBe(true);
  });

  it("writes to public/uploads/circle-card and serves the returned URL", async () => {
    const sourceBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const imageUrl = await persistCircleCardImageUpload({
      file: new File([sourceBytes], "gallery.png", { type: "image/png" }),
      userId: "test-user",
      kind: "gallery-image"
    });
    const filename = imageUrl.split("/").at(-1) ?? "";
    const absolutePath = resolveCircleCardImageFilePath(filename);

    expect(circleCardImageUploadDirectory()).toBe(
      resolve(process.cwd(), "public", "uploads", "circle-card")
    );
    expect(absolutePath).toBeTruthy();
    createdFiles.push(absolutePath!);
    expect(imageUrl).toMatch(/^\/uploads\/circle-card\/.+\.png$/);
    expect(isSafeCircleCardImageUrl(imageUrl)).toBe(true);

    const storedImage = await readCircleCardImage(filename);
    expect(storedImage?.bytes).toEqual(Buffer.from(sourceBytes));
    await expect(resolvePublicUploadImageUrl(imageUrl, SITE_URL)).resolves.toBe(imageUrl);

    const response = await getPublicImage(new Request(`${SITE_URL}${imageUrl}`), {
      params: Promise.resolve({ path: [filename] })
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(sourceBytes);
  });

  it("returns 404 for missing and invalid image paths", async () => {
    const missing = await getPublicImage(new Request(`${SITE_URL}/missing.png`), {
      params: Promise.resolve({
        path: ["test-user-gallery-image-1700000000000-deadbeef.png"]
      })
    });
    const invalid = await getPublicImage(new Request(`${SITE_URL}/private.png`), {
      params: Promise.resolve({ path: ["..", "private.png"] })
    });

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(404);
  });

  it("removes failed local uploads only for their owning user", async () => {
    const imageUrl = await persistCircleCardImageUpload({
      file: new File([new Uint8Array([1, 2, 3])], "profile.png", { type: "image/png" }),
      userId: "owner-1",
      kind: "profile-photo"
    });
    const filename = imageUrl.split("/").at(-1) ?? "";

    await expect(removeOwnedCircleCardImageUpload(imageUrl, "another-user")).resolves.toBe(false);
    expect(await readCircleCardImage(filename)).not.toBeNull();
    await expect(removeOwnedCircleCardImageUpload(imageUrl, "owner-1")).resolves.toBe(true);
    expect(await readCircleCardImage(filename)).toBeNull();
  });
});

describe("Circle Card link-file document storage", () => {
  it("stores and reads a 10MB-safe office document through the existing file infrastructure", async () => {
    const sourceBytes = new Uint8Array([80, 75, 3, 4]);
    const uploaded = await persistCircleCardLinkFileUpload({
      file: new File([sourceBytes], "application-form.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    });
    const filename = uploaded.fileUrl.split("/").at(-1) ?? "";
    const absolutePath = resolveCircleCardLinkFilePath(filename);

    expect(circleCardLinkFileUploadDirectory()).toBe(
      resolve(process.cwd(), ".uploads", "circle-card-link-files")
    );
    expect(absolutePath).toBeTruthy();
    createdFiles.push(absolutePath!);
    expect(uploaded).toMatchObject({
      fileUrl: expect.stringMatching(/^\/api\/circle-card\/link-file\/.+\.docx$/),
      fileName: "application-form.docx",
      fileMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    const stored = await readCircleCardLinkFile(filename);
    expect(stored?.bytes).toEqual(Buffer.from(sourceBytes));
    expect(stored?.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });
});
