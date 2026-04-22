import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

let configured = false;

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

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

export async function uploadImageAssetToCloudinary(input: {
  file: File;
  folder: string;
  publicIdPrefix: string;
}) {
  ensureCloudinaryConfigured();

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const publicId = `${input.publicIdPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  return new Promise<{ secureUrl: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: input.folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: false
      },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          reject(error ?? new Error("Cloudinary did not return a secure URL."));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    stream.end(bytes);
  });
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
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "image"
  });
}
