import '../data/entries.js';

const CUSTOM_KEY = 'journal:customEntries';

function normalize(raw) {
  if (!raw) return null;
  const contentHtml = raw.contentHtml || raw.content || '';
  return {
    ...raw,
    id: raw.id || raw._id || raw.slug || raw.title,
    contentHtml,
    content: contentHtml,
    excerpt: raw.excerpt || (contentHtml || '').replace(/<[^>]+>/g, '').slice(0, 200),
    date: raw.date || raw.createdAt || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    category: raw.category || 'journal',
  };
}

export function getEntries() {
  const base = Array.isArray(window?.JOURNAL_ENTRIES) ? window.JOURNAL_ENTRIES : [];
  let custom = [];
  try {
    custom = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
  } catch (_) {
    custom = [];
  }
  const normalized = base.concat(custom).map(normalize).filter(Boolean);
  return normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function addLocalEntry(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    existing.unshift(entry);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to store local entry', err);
  }
}

export function filterEntries(entries, term) {
  if (!term) return entries;
  const q = term.toLowerCase();
  return entries.filter((e) =>
    [e.title, e.excerpt, e.content, (e.tags || []).join(' ')].some((field) =>
      (field || '').toString().toLowerCase().includes(q),
    ),
  );
}
