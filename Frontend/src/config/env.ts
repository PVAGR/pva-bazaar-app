// Frontend/src/config/env.ts
const must = (key: string, val: string | undefined) => {
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const rawApiUrl = must("VITE_API_URL", import.meta.env.VITE_API_URL).replace(/\/$/, "");
const isProdBuild = import.meta.env.MODE === "production";
const isLocalApi = /localhost|127\.0\.0\.1/i.test(rawApiUrl);
const rawStatusStaleMs = Number(import.meta.env.VITE_STATUS_STALE_MS || "120000");
const statusStaleMs = Number.isFinite(rawStatusStaleMs) && rawStatusStaleMs >= 15000
  ? Math.floor(rawStatusStaleMs)
  : 120000;

if (isProdBuild && isLocalApi) {
  throw new Error(
    "VITE_API_URL points to localhost in production build. Set it to the deployed API domain (e.g., https://api.pvabazaar.org)."
  );
}

if (!isProdBuild && isLocalApi) {
  console.warn(
    "VITE_API_URL is pointing to localhost. Update it to the deployed API to test against the online service."
  );
}

export const ENV = {
  API_URL: rawApiUrl,
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "",
  STATUS_STALE_MS: statusStaleMs,
};

if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_UPLOAD_PRESET) {
  console.warn(
    "Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
  );
}
