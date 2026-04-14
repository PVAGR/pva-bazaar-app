// Frontend/src/config/env.ts
const rawApiUrl = (import.meta.env.VITE_API_URL || "https://pvabazaar.org/api").replace(
  /\/$/, ""
);
const isProdBuild = import.meta.env.MODE === "production";
const isLocalApi = /localhost|127\.0\.0\.1/i.test(rawApiUrl);

if (isProdBuild && isLocalApi) {
  throw new Error(
    "VITE_API_URL points to localhost in production build. Set it to the deployed API domain (e.g., https://pvabazaar.org/api)."
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
};

if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_UPLOAD_PRESET) {
  console.warn(
    "Missing Cloudinary config. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
  );
}
