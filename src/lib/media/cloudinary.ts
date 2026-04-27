import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

let configured = false;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 30_000;
const CLOUDINARY_DELETE_TIMEOUT_MS = 15_000;

function ensureCloudinaryConfigured() {
  if (configured) {
    return;
  }

  configured = true;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

export function uploadImageBufferAssetToCloudinary(input: {
  bytes: Buffer;
  folder: string;
  publicIdPrefix: string;
}) {
  ensureCloudinaryConfigured();

  const publicId = `${input.publicIdPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  return new Promise<{ secureUrl: string; publicId: string }>((resolve, reject) => {
    let settled = false;
    let stream: ReturnType<typeof cloudinary.uploader.upload_stream> | null = null;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      stream?.destroy(new Error("Cloudinary upload timed out."));
      reject(new Error("cloudinary-upload-timeout"));
    }, CLOUDINARY_UPLOAD_TIMEOUT_MS);

    function settleWithError(error: unknown) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error("Cloudinary upload failed."));
    }

    function settleWithSuccess(result: { secureUrl: string; publicId: string }) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve(result);
    }

    stream = cloudinary.uploader.upload_stream(
      {
        folder: input.folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: false
      },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          settleWithError(error ?? new Error("Cloudinary did not return a secure URL."));
          return;
        }

        settleWithSuccess({
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    stream.on("error", settleWithError);
    stream.end(input.bytes);
  });
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export function getCloudinaryConfigDiagnostics() {
  const cloudNamePresent = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim());
  const apiKeyPresent = Boolean(process.env.CLOUDINARY_API_KEY?.trim());
  const apiSecretPresent = Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
  const missing = [
    !cloudNamePresent ? "CLOUDINARY_CLOUD_NAME" : null,
    !apiKeyPresent ? "CLOUDINARY_API_KEY" : null,
    !apiSecretPresent ? "CLOUDINARY_API_SECRET" : null
  ].filter((item): item is string => Boolean(item));

  return {
    cloudNamePresent,
    apiKeyPresent,
    apiSecretPresent,
    configured: missing.length === 0,
    unavailableReasons: missing.length
      ? [`Cloudinary missing ${missing.join(", ")}`]
      : []
  };
}

export async function uploadImageAssetToCloudinary(input: {
  file: File;
  folder: string;
  publicIdPrefix: string;
}) {
  const bytes = Buffer.from(await input.file.arrayBuffer());
  return uploadImageBufferAssetToCloudinary({
    bytes,
    folder: input.folder,
    publicIdPrefix: input.publicIdPrefix
  });
}

export async function uploadImageBufferToCloudinary(input: {
  bytes: Buffer;
  folder: string;
  publicIdPrefix: string;
}) {
  const result = await uploadImageBufferAssetToCloudinary(input);
  return result.secureUrl;
}

export async function uploadImageToCloudinary(input: {
  file: File;
  folder: string;
  publicIdPrefix: string;
}) {
  const result = await uploadImageAssetToCloudinary(input);
  return result.secureUrl;
}

export async function deleteImageFromCloudinary(publicId: string) {
  ensureCloudinaryConfigured();
  await Promise.race([
    cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: "image"
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("cloudinary-delete-timeout")), CLOUDINARY_DELETE_TIMEOUT_MS);
    })
  ]);
}
