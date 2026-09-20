import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

function localUrl(key) {
  return `/api/files/${key.replace(/\\/g, "/")}`;
}

async function saveLocal(buffer, key, _mime) {
  const full = path.join(env.uploadRoot, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return { key, url: localUrl(key) };
}

async function saveCloudinary(buffer, key, mime) {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
  const dataUri = `data:${mime || "application/octet-stream"};base64,${buffer.toString("base64")}`;
  const folder = path.posix.dirname(key);
  const publicId = path.posix.basename(key).replace(/\.[^.]+$/, "");
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: folder === "." ? "certificates" : folder,
    public_id: publicId,
    resource_type: "auto",
  });
  return { key: uploaded.public_id, url: uploaded.secure_url };
}

async function saveS3(buffer, key, mime) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: env.s3.region,
    endpoint: env.s3.endpoint || undefined,
    credentials:
      env.s3.accessKeyId && env.s3.secretAccessKey
        ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
        : undefined,
    forcePathStyle: Boolean(env.s3.endpoint),
  });
  await client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime || "application/octet-stream",
    })
  );
  const url = env.s3.publicBaseUrl
    ? `${env.s3.publicBaseUrl}/${key}`
    : `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${key}`;
  return { key, url };
}

export async function saveFile(buffer, key, mime) {
  if (env.storageProvider === "cloudinary") return saveCloudinary(buffer, key, mime);
  if (env.storageProvider === "s3") return saveS3(buffer, key, mime);
  return saveLocal(buffer, key, mime);
}

export function isLocalStorage() {
  return env.storageProvider === "local";
}

export function absoluteFileUrl(req, url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const origin = req?.get?.("host")
    ? `${req.protocol}://${req.get("host")}`
    : env.apiPublicUrl;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}
