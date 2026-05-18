import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, rgba(245, 158, 11, 0.2), transparent 35%), linear-gradient(135deg, #05070b 0%, #0b1220 45%, #111827 100%)",
          color: "#f4f4f5",
          padding: "56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "#a1a1aa",
          }}
        >
          PVA Bazaar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.02 }}>
            AI-Verified Preservation
          </div>
          <div style={{ fontSize: 30, color: "#d4d4d8", maxWidth: 980 }}>
            Discover verified artifacts, preserve history, and access the living archive.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#fbbf24" }}>pvabazaar.org</div>
      </div>
    ),
    {
      ...size,
    },
  );
}
