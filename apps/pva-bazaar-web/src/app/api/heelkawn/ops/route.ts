import { NextResponse } from "next/server";
import { getLiveRepoSignal } from "@/lib/heelkawn-ops";

const FALLBACK_REPO_URL = "https://github.com/PVAGR/HeelKawn1";

export async function GET() {
  const repoUrl = normalizeExternalUrl(process.env.NEXT_PUBLIC_HEELKAWN_REPO_URL, FALLBACK_REPO_URL);
  const signal = await getLiveRepoSignal(repoUrl);
  return NextResponse.json({
    ok: true,
    repoUrl,
    signal,
    updatedAt: new Date().toISOString(),
  });
}

function normalizeExternalUrl(candidate: string | undefined, fallback: string): string {
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

