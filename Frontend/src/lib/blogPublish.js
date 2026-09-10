import { apiFetch } from './api.js';

/**
 * Server-authoritative blog publishing.
 *
 * Writes never trust the client to declare success: each step must be
 * confirmed by the backend, and "published" is only returned after the
 * public endpoint retrieves the exact server record by slug.
 *
 * The local editor draft stays in this browser (device-only auto-save); these
 * helpers only talk to MongoDB through the backend.
 */

export async function ensureAdminBlogTokenFromStorage() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem('admin:token') || window.localStorage.getItem('admin_token') || '';
  } catch (_err) {
    return '';
  }
}

/**
 * Create/refresh the online draft record (pending) and write the content into
 * it. Returns { ok, status } where status is still 'pending' after a save.
 * Throws when the server does not confirm the draft exists online.
 */
export async function saveBlogDraftOnlineToServer({ slug, title, content = '', authorName = '', adminToken }) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  const cleanTitle = String(title || '').trim();
  if (!cleanSlug || !cleanTitle) {
    throw new Error('A slug and title are required to save the draft online');
  }

  const setupRes = await apiFetch('/blogs/setup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ slug: cleanSlug, title: cleanTitle }),
  });
  const setup = await setupRes.json().catch(() => ({}));
  if (!setupRes.ok) {
    throw new Error(setup?.message || setup?.error || `Save draft failed (${setupRes.status})`);
  }
  if (!setup?.ok || !setup?.editSecret) {
    throw new Error('Server did not confirm the draft');
  }

  const updateRes = await apiFetch(`/blogs/${encodeURIComponent(cleanSlug)}/update`, {
    method: 'POST',
    body: JSON.stringify({
      edit: setup.editSecret,
      title: cleanTitle,
      content,
      authorName: String(authorName || '').trim() || 'Richard Torres',
    }),
  });
  const updated = await updateRes.json().catch(() => ({}));
  if (!updateRes.ok) {
    throw new Error(updated?.message || updated?.error || `Save draft failed (${updateRes.status})`);
  }
  if (updated?.status !== 'pending' && updated?.status !== 'published') {
    throw new Error('Server did not confirm the draft');
  }

  return { ok: true, slug: cleanSlug, status: updated.status };
}

/**
 * Publish a blog post online. Saves the draft first, asks the server to flip
 * it to published, then verifies the public endpoint returns the exact record.
 * Throws unless every step is confirmed. Never fabricates publication.
 */
export async function publishBlogPostToServer({ slug, title, content = '', authorName = '', adminToken }) {
  const cleanSlug = String(slug || '').trim().toLowerCase();
  const cleanTitle = String(title || '').trim();
  if (!cleanSlug || !cleanTitle) {
    throw new Error('A slug and title are required to publish');
  }

  await saveBlogDraftOnlineToServer({ slug: cleanSlug, title: cleanTitle, content, authorName, adminToken });

  const publishRes = await apiFetch(`/blogs/${encodeURIComponent(cleanSlug)}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: '{}',
  });
  const published = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok) {
    throw new Error(published?.message || published?.error || `Publish failed (${publishRes.status})`);
  }
  if (published?.status !== 'published') {
    throw new Error('Server did not confirm publication');
  }

  const verifyRes = await apiFetch(`/blogs/${encodeURIComponent(cleanSlug)}`);
  const verified = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok || !verified?.ok || !verified?.blog || String(verified.blog.slug || '').toLowerCase() !== cleanSlug) {
    throw new Error('Published post could not be verified on the public API');
  }

  return { ok: true, slug: cleanSlug, status: 'published' };
}