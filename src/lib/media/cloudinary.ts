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

export async function uploadImageToCloudinary(input: {
  file: File;
  folder: string;
  publicIdPrefix: string;
}) {
  ensureCloudinaryConfigured();

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const publicId = `${input.publicIdPrefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: input.folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: false
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary did not return a secure URL."));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(bytes);
  });
}
