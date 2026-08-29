import path from "path";
import fs from "fs/promises";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "restaurant";

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string,
  transformation: UploadApiResponse["transformation"]
) {
  configureCloudinary();

  const publicId = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${publicId}-${Date.now()}`,
        overwrite: false,
        resource_type: "image",
        transformation,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

function buildCloudinaryThumbnailUrl(url: string) {
  return url.replace("/upload/", "/upload/c_fill,g_auto,w_400,h_400,q_auto,f_auto/");
}

export async function ensureUploadDir(subDir?: string) {
  const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function processAndSaveImage(
  buffer: Buffer,
  filename: string,
  subDir: string = "menu",
  options: { thumbnail?: boolean } = {}
): Promise<{ url: string; thumbnailUrl: string }> {
  const shouldCreateThumbnail = options.thumbnail ?? subDir === "menu";

  if (hasCloudinaryConfig()) {
    const folder = `${CLOUDINARY_FOLDER}/${subDir}`;
    const main = await uploadToCloudinary(buffer, filename, folder, [
      { width: 1200, height: 1200, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ]);

    return {
      url: main.secure_url,
      thumbnailUrl: shouldCreateThumbnail ? buildCloudinaryThumbnailUrl(main.secure_url) : main.secure_url,
    };
  }

  // Dynamic import of sharp to avoid issues in edge runtime
  const sharp = (await import("sharp")).default;

  const uploadDir = await ensureUploadDir(subDir);
  const thumbDir = shouldCreateThumbnail ? await ensureUploadDir(path.join(subDir, "thumbs")) : null;

  const ext = ".webp";
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const safeName = `${baseName}-${Date.now()}${ext}`;
  const thumbName = `thumb-${safeName}`;

  const mainPath = path.join(uploadDir, safeName);
  const thumbPath = thumbDir ? path.join(thumbDir, thumbName) : null;

  // Main image: max 1200px wide, quality 80
  await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(mainPath);

  if (thumbPath) {
    await sharp(buffer)
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 70 })
      .toFile(thumbPath);
  }

  const baseUrl = `/${UPLOAD_DIR}/${subDir}/${safeName}`.replace("public/", "");
  const thumbUrl = thumbPath
    ? `/${UPLOAD_DIR}/${subDir}/thumbs/${thumbName}`.replace("public/", "")
    : baseUrl;

  return { url: baseUrl, thumbnailUrl: thumbUrl };
}

export async function deleteUploadedFile(url: string) {
  try {
    if (!url) return;
    if (url.includes("res.cloudinary.com")) {
      configureCloudinary();
      const parsed = new URL(url);
      const uploadIndex = parsed.pathname.indexOf("/upload/");
      if (uploadIndex === -1) return;

      const rawPath = parsed.pathname.slice(uploadIndex + "/upload/".length);
      const versionMatch = rawPath.match(/(?:^|\/)v\d+\//);
      const withoutVersion = versionMatch
        ? rawPath.slice((versionMatch.index || 0) + versionMatch[0].length)
        : rawPath;
      const publicId = withoutVersion.replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      return;
    }

    const filePath = path.join("public", url);
    await fs.unlink(filePath);
  } catch {
    // File might not exist, ignore
  }
}

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10);
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
