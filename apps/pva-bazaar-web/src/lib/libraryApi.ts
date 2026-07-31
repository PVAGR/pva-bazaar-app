// Shared client-side helpers for the sanctuary layer.
// All sanctuary pages must call the PVA Bazaar API through this module so
// we never hardcode URLs in components and always send the correct headers.

export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_VERIFICATION_API_URL ??
    "";
  const clean = String(raw || "").replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean.slice(0, -4) : clean;
}

export interface LibraryBook {
  id: string;
  title: string;
  subtitle: string;
  authorName: string;
  slug: string;
  description: string;
  genre: string;
  audience: string;
  language: string;
  status: string;
  wordCount: number;
  publishedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  frontCover: {
    url?: string;
    provider?: string;
    localFilename?: string;
    publicId?: string;
    originalName?: string;
    mimeType?: string;
  };
  backCover: {
    url?: string;
    provider?: string;
    localFilename?: string;
    publicId?: string;
    originalName?: string;
    mimeType?: string;
  };
  links: {
    publicPage: string;
    apiView: string;
    pdf: string;
    epub: string;
    frontCover: string;
    backCover: string;
  };
}

export interface LibraryListResponse {
  ok: boolean;
  items: LibraryBook[];
  total: number;
  query: string;
  genre: string;
  error?: string;
}

export interface LibraryBookResponse {
  ok: boolean;
  item: LibraryBook;
  error?: string;
}

async function request<T>(path: string): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new Error("Library service is not configured. Set NEXT_PUBLIC_API_URL.");
  }
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function listPublicBooks(params: {
  q?: string;
  genre?: string;
  limit?: number;
} = {}): Promise<LibraryListResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.genre) search.set("genre", params.genre);
  if (params.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return request<LibraryListResponse>(
    `/api/book-publishing/public${qs ? `?${qs}` : ""}`,
  );
}

export async function getPublicBook(slug: string): Promise<LibraryBookResponse> {
  return request<LibraryBookResponse>(
    `/api/book-publishing/public/${encodeURIComponent(slug)}`,
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  // Check all known auth storage keys in priority order.
  const keys = ["pva:book:auth", "pvabazaar_recovery_token", "authToken"];
  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      // pva:book:auth stores JSON { token, user }
      if (key === "pva:book:auth") {
        const parsed = JSON.parse(raw);
        if (parsed?.token && typeof parsed.token === "string") return parsed.token;
      } else if (typeof raw === "string" && raw.length > 10) {
        return raw;
      }
    } catch {
      /* empty */
    }
  }
  return null;
}

export function getStoredAuth(): { token: string; user: { role?: string; name?: string; email?: string } } | null {
  if (typeof window === "undefined") return null;

  // Try pva:book:auth first (has structured user object)
  try {
    const raw = window.localStorage.getItem("pva:book:auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && typeof parsed.token === "string") {
        // If user object already has role, use it; otherwise decode from JWT
        const user = parsed.user || {};
        if (user.role) return { token: parsed.token, user };
        const payload = decodeJwtPayload(parsed.token);
        if (payload?.role) user.role = String(payload.role);
        return { token: parsed.token, user };
      }
    }
  } catch {
    /* empty */
  }

  // Fall back to bare token keys and decode role from JWT payload
  const token = readTokenFromStorage();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return {
    token,
    user: {
      role: payload?.role ? String(payload.role) : undefined,
      name: payload?.name ? String(payload.name) : undefined,
      email: payload?.email ? String(payload.email) : undefined,
    },
  };
}

export function isAdminUser(): boolean {
  const auth = getStoredAuth();
  return auth?.user?.role?.toLowerCase() === "admin";
}

export async function deleteBook(bookId: string): Promise<{ ok: boolean; error?: string }> {
  const base = getApiBase();
  if (!base) throw new Error("Library service is not configured.");
  const auth = getStoredAuth();
  if (!auth) throw new Error("You must be signed in to delete books.");

  const res = await fetch(`${base}/api/book-publishing/${encodeURIComponent(bookId)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && (data.error || data.message)) || `Delete failed (${res.status})`);
  }
  return { ok: true };
}

export function buildAssetUrl(book: LibraryBook, key: "front" | "back"): string {
  const base = getApiBase();

  // Prefer direct Cloudinary URL when available
  const coverData = key === "front" ? book.frontCover : book.backCover;
  if (coverData?.url && /^https?:\/\//i.test(coverData.url)) {
    return coverData.url;
  }

  const link = key === "front" ? book.links?.frontCover : book.links?.backCover;
  if (link && /^https?:\/\//i.test(link)) return link;
  if (link && base) return `${base}${link}`;
  return "";
}

export function buildDownloadUrl(book: LibraryBook, format: "pdf" | "epub"): string {
  const base = getApiBase();
  const link = format === "pdf" ? book.links?.pdf : book.links?.epub;
  if (!link) return "";
  if (/^https?:\/\//i.test(link)) return link;
  return base ? `${base}${link}` : link;
}
