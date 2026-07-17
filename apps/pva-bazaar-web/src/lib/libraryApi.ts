// Shared client-side helpers for the sanctuary layer.
// All sanctuary pages must call the PVA Bazaar API through this module so
// we never hardcode URLs in components and always send the correct headers.

export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  const raw =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_VERIFICATION_API_URL ??
    "";
  return String(raw || "").replace(/\/+$/, "");
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
