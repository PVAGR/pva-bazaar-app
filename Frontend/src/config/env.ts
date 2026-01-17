// Frontend/src/config/env.ts
const must = (key: string, val: string | undefined) => {
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const ENV = {
  API_URL: must("VITE_API_URL", import.meta.env.VITE_API_URL).replace(/\/$/, ""),
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "",
};

if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_UPLOAD_PRESET) {
  console.warn(
    "Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
  );
}
