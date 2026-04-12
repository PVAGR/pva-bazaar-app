import { fetchArchiveEntries } from './api'

// Shared lightweight loader for archive feed surfaces (homepage, archive page, etc).
export async function fetchArchiveEntriesSafe(options = {}) {
  try {
    const result = await fetchArchiveEntries(options)
    if (result?.ok && Array.isArray(result.items)) {
      return { ok: true, items: result.items, error: '' }
    }
    return {
      ok: false,
      items: [],
      error: result?.error || result?.message || 'Unable to load archive entries right now.',
    }
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: error?.message || 'Connection issue while loading archive entries.',
    }
  }
}
