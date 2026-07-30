"use client";

import { FormEvent, useEffect, useState } from "react";

interface SnapshotSummary {
  id: string;
  label: string;
  payloadSizeBytes: number;
  encryption?: {
    version?: string;
    algorithm?: string;
    kdf?: string;
    iterations?: number;
    plaintextSha256?: string;
    ciphertextSha256?: string;
  };
  manifest?: Record<string, unknown>;
  device?: {
    type?: string;
    platform?: string;
    timezone?: string;
  };
  ipfs?: {
    cid?: string;
    gatewayUrl?: string;
    pinnedAt?: string;
  };
  createdAt: string;
}

interface SnapshotPayload {
  version: string;
  algorithm: string;
  kdf: string;
  iterations: number;
  saltB64: string;
  ivB64: string;
  ciphertextB64: string;
  plaintextSha256?: string;
  ciphertextSha256?: string;
}

type SnapshotDetail = SnapshotSummary & {
  payload: SnapshotPayload;
};

interface SnapshotRecordResponse {
  ok?: boolean;
  item?: SnapshotDetail;
  error?: string;
}

interface BrowserSnapshotPayload {
  formatVersion: "pva-browser-recovery-v1";
  capturedAt: string;
  origin: string;
  userAgent: string;
  timezone: string;
  language: string;
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: string;
  notes: string;
}

const STORAGE_KEY_TOKEN = "pvabazaar_recovery_token";
const STORAGE_KEY_API = "pvabazaar_recovery_api";

function getDefaultApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_VERIFICATION_API_URL ||
    "";

  if (!raw) return "";
  const clean = raw.replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

function bytesToBase64(buffer: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sha256Hex(input: Uint8Array | string): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digestInput = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  const view = new Uint8Array(digest);
  return Array.from(view).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const passphraseBytes = Uint8Array.from(new TextEncoder().encode(passphrase));
  const saltBytes = Uint8Array.from(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptSnapshot(plainText: string, passphrase: string, iterations = 250000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const encoded = Uint8Array.from(new TextEncoder().encode(plainText));
  const ivBytes = Uint8Array.from(iv);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBytes }, key, encoded);
  const cipherBytes = new Uint8Array(encrypted);
  return {
    payload: {
      version: "hk-recovery-v1",
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      iterations,
      saltB64: bytesToBase64(salt),
      ivB64: bytesToBase64(iv),
      ciphertextB64: bytesToBase64(cipherBytes),
      plaintextSha256: await sha256Hex(encoded),
      ciphertextSha256: await sha256Hex(cipherBytes),
    },
    ciphertextBytes: cipherBytes.byteLength,
  };
}

async function decryptSnapshot(
  payload: SnapshotPayload,
  passphrase: string,
): Promise<string> {
  const salt = base64ToBytes(payload.saltB64);
  const iv = base64ToBytes(payload.ivB64);
  const encrypted = base64ToBytes(payload.ciphertextB64);
  const key = await deriveKey(passphrase, salt, payload.iterations || 250000);
  const ivBytes = Uint8Array.from(iv);
  const encryptedBytes = Uint8Array.from(encrypted);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, encryptedBytes);
  return new TextDecoder().decode(plainBuffer);
}

function readStorage(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    const value = storage.getItem(key);
    if (value == null) continue;
    out[key] = value;
  }
  return out;
}

function humanBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export default function RecoveryClient() {
  const [apiBase, setApiBase] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("Primary Continuity Snapshot");
  const [notes, setNotes] = useState("");
  const [pinToIpfs, setPinToIpfs] = useState(false);
  const [includeSessionStorage, setIncludeSessionStorage] = useState(true);
  const [items, setItems] = useState<SnapshotSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedApi = localStorage.getItem(STORAGE_KEY_API) || getDefaultApiBase();
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN) || localStorage.getItem("authToken") || "";
    setApiBase(storedApi);
    setToken(storedToken);
  }, []);

  async function fetchSnapshots(currentToken: string, currentApiBase: string) {
    if (!currentToken || !currentApiBase) return;
    const response = await fetch(`${currentApiBase}/recovery/snapshots`, {
      headers: { Authorization: `Bearer ${currentToken}` },
      cache: "no-store",
    });
    const data = (await response.json()) as { ok?: boolean; items?: SnapshotSummary[]; error?: string };
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Failed to load snapshots");
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!apiBase || !email || !password) {
      setError("API URL, email/username, and password are required.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; token?: string; message?: string };
      if (!response.ok || !data.ok || !data.token) {
        throw new Error(data.message || "Login failed");
      }
      setToken(data.token);
      localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem(STORAGE_KEY_API, apiBase);
      await fetchSnapshots(data.token, apiBase);
      setMessage("Logged in. Recovery vault is ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRefresh() {
    setError("");
    setMessage("");
    if (!token || !apiBase) {
      setError("Set API URL and token first.");
      return;
    }
    setBusy(true);
    try {
      await fetchSnapshots(token, apiBase);
      localStorage.setItem(STORAGE_KEY_API, apiBase);
      setMessage("Snapshot list refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateSnapshot() {
    setError("");
    setMessage("");
    if (!token || !apiBase) {
      setError("Set API URL and token first.");
      return;
    }
    if (passphrase.trim().length < 12) {
      setError("Use an encryption passphrase of at least 12 characters.");
      return;
    }

    setBusy(true);
    try {
      const snapshot: BrowserSnapshotPayload = {
        formatVersion: "pva-browser-recovery-v1",
        capturedAt: new Date().toISOString(),
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        language: navigator.language || "en-US",
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          pixelRatio: window.devicePixelRatio || 1,
        },
        localStorage: readStorage(localStorage),
        sessionStorage: includeSessionStorage ? readStorage(sessionStorage) : {},
        cookies: document.cookie || "",
        notes: notes.trim(),
      };

      const plainText = JSON.stringify(snapshot);
      const encrypted = await encryptSnapshot(plainText, passphrase.trim());
      const manifest = {
        localStorageKeys: Object.keys(snapshot.localStorage).length,
        sessionStorageKeys: Object.keys(snapshot.sessionStorage).length,
        hasCookies: snapshot.cookies.length > 0,
        noteLength: snapshot.notes.length,
        captureScope: [
          "site-local-storage",
          includeSessionStorage ? "site-session-storage" : null,
          "site-readable-cookies",
          "browser-context",
        ].filter(Boolean),
      };

      const response = await fetch(`${apiBase}/recovery/snapshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label: snapshotLabel.trim() || "Untitled snapshot",
          manifest,
          device: {
            type: /android|iphone|ipad|mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
            platform: navigator.platform || "",
            userAgent: navigator.userAgent || "",
            timezone: snapshot.timezone,
          },
          payload: encrypted.payload,
          pinToIpfs,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to save snapshot");
      }

      await fetchSnapshots(token, apiBase);
      setMessage(`Snapshot uploaded (${humanBytes(encrypted.ciphertextBytes)} encrypted payload).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create snapshot");
    } finally {
      setBusy(false);
    }
  }

  async function getSnapshot(id: string): Promise<SnapshotDetail> {
    const response = await fetch(`${apiBase}/recovery/snapshots/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = (await response.json()) as SnapshotRecordResponse;
    if (!response.ok || !data.ok || !data.item) {
      throw new Error(data.error || "Failed to fetch snapshot");
    }
    return data.item;
  }

  async function onDownload(snapshotId: string, label: string) {
    setError("");
    setMessage("");
    if (!passphrase.trim()) {
      setError("Enter your passphrase to decrypt and download.");
      return;
    }
    setBusy(true);
    try {
      const item = await getSnapshot(snapshotId);
      const plain = await decryptSnapshot(item.payload, passphrase.trim());
      const blob = new Blob([plain], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${label.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40)}-${snapshotId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Snapshot downloaded and decrypted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(snapshotId: string) {
    setError("");
    setMessage("");
    if (!passphrase.trim()) {
      setError("Enter your passphrase to decrypt and restore.");
      return;
    }

    setBusy(true);
    try {
      const item = await getSnapshot(snapshotId);
      const plain = await decryptSnapshot(item.payload, passphrase.trim());
      const data = JSON.parse(plain) as BrowserSnapshotPayload;

      if (!data || data.formatVersion !== "pva-browser-recovery-v1") {
        throw new Error("Snapshot format is not supported");
      }

      const localKeys = Object.entries(data.localStorage || {});
      for (const [key, value] of localKeys) {
        localStorage.setItem(key, String(value));
      }

      const sessionKeys = Object.entries(data.sessionStorage || {});
      for (const [key, value] of sessionKeys) {
        sessionStorage.setItem(key, String(value));
      }

      setMessage(`Restored ${localKeys.length} localStorage keys and ${sessionKeys.length} sessionStorage keys.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(snapshotId: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/recovery/snapshots/${encodeURIComponent(snapshotId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Delete failed");
      }
      await fetchSnapshots(token, apiBase);
      setMessage("Snapshot deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadVaultBundle() {
    setError("");
    setMessage("");
    if (!token || !apiBase) {
      setError("Set API URL and token first.");
      return;
    }
    setBusy(true);
    try {
      const fullItems: SnapshotDetail[] = [];
      for (const item of items) {
        // Pull full encrypted payload per record.
        // Bundle stays encrypted and can be restored later with passphrases.
        const full = await getSnapshot(item.id);
        fullItems.push(full);
      }

      const bundle = {
        formatVersion: "pva-vault-bundle-v1",
        exportedAt: new Date().toISOString(),
        source: window.location.origin,
        count: fullItems.length,
        snapshots: fullItems,
      };

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pva-recovery-vault-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded vault bundle with ${fullItems.length} encrypted snapshots.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download vault bundle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-6">
        <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">Continuity Layer</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Recovery Vault</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
          Create encrypted snapshots from this browser, store them in your account, and restore on a new device after
          login. This captures website/browser state, not full operating-system files or hardware-level passwords.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Account Access</h2>
          <form className="mt-3 space-y-3" onSubmit={onLogin}>
            <label className="block text-xs text-zinc-400">
              API base URL
              <input
                value={apiBase}
                onChange={(event) => setApiBase(event.target.value.trim())}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
                placeholder="https://api.pvabazaar.org/api"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Email or username
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Or paste existing auth token
              <input
                value={token}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  setToken(value);
                  localStorage.setItem(STORAGE_KEY_TOKEN, value);
                  localStorage.setItem("authToken", value);
                }}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="rounded border border-amber-300/60 bg-amber-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200 disabled:opacity-50"
              >
                Login
              </button>
              <button
                type="button"
                disabled={busy || !token || !apiBase}
                onClick={onRefresh}
                className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 disabled:opacity-50"
              >
                Refresh snapshots
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Create Snapshot</h2>
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-zinc-400">
              Snapshot label
              <input
                value={snapshotLabel}
                onChange={(event) => setSnapshotLabel(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Encryption passphrase (required to restore)
              <input
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
              />
            </label>
            <label className="block text-xs text-zinc-400">
              Recovery notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 min-h-20 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-amber-300/30 focus:ring"
                placeholder="Reason for this snapshot, what changed, migration notes..."
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={includeSessionStorage}
                onChange={(event) => setIncludeSessionStorage(event.target.checked)}
              />
              Include sessionStorage
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={pinToIpfs} onChange={(event) => setPinToIpfs(event.target.checked)} />
              Try pin encrypted snapshot to IPFS when backend keys are configured
            </label>
            <button
              type="button"
              disabled={busy || !token || !apiBase}
              onClick={onCreateSnapshot}
              className="rounded border border-emerald-400/60 bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-50"
            >
              Encrypt and upload snapshot
            </button>
            <button
              type="button"
              disabled={busy || !token || !apiBase || items.length === 0}
              onClick={onDownloadVaultBundle}
              className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100 disabled:opacity-50"
            >
              Download all cloud snapshots
            </button>
          </div>
        </article>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

      <article className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Vault Snapshots</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No snapshots yet. Create one from this device first.</p>
        ) : null}
        <div className="mt-3 grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Created {new Date(item.createdAt).toLocaleString()} · {humanBytes(item.payloadSizeBytes)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.device?.type || "unknown"} · {item.device?.platform || "platform-unknown"} ·{" "}
                    {item.device?.timezone || "timezone-unknown"}
                  </p>
                  {item.ipfs?.cid ? (
                    <p className="mt-1 text-xs text-amber-300">
                      IPFS CID: {item.ipfs.cid}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDownload(item.id, item.label)}
                    className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 disabled:opacity-50"
                  >
                    Decrypt + download
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRestore(item.id)}
                    className="rounded border border-amber-300/60 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-200 disabled:opacity-50"
                  >
                    Restore to browser
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(item.id)}
                    className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
