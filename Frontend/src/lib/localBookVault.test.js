import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLocalBookProjects,
  listLocalBookProjects,
  markLocalDraftPublishFailed,
  clearLocalDraftPendingPublish,
  normalizeLocalBook,
  saveLocalBookProject,
} from './localBookVault.js';

beforeEach(() => {
  window.localStorage.clear();
  clearLocalBookProjects();
});

describe('localBookVault separation contract', () => {
  it('every record is tagged source: local (never mistaken for server data)', () => {
    const saved = saveLocalBookProject({ title: 'Test', manuscriptMarkdown: 'hello world' });
    expect(saved.source).toBe('local');
    expect(listLocalBookProjects()[0].source).toBe('local');
    expect(normalizeLocalBook({ title: 'x' }).source).toBe('local');
  });

  it('a failed online publish keeps the draft with pendingPublish + error (no false success)', () => {
    const saved = markLocalDraftPublishFailed(
      { title: 'My Book', slug: 'my-book', manuscriptMarkdown: 'text' },
      'Network error',
    );
    expect(saved.pendingPublish).toBe(true);
    expect(saved.lastOnlineError).toContain('Network error');
    expect(saved.source).toBe('local');

    const [listed] = listLocalBookProjects();
    expect(listed.pendingPublish).toBe(true);
    expect(listed.lastOnlineError).toContain('Network error');
  });

  it('clearing the pending flag works once the server confirms the write', () => {
    const saved = markLocalDraftPublishFailed({ title: 'B', manuscriptMarkdown: 't' }, 'boom');
    expect(clearLocalDraftPendingPublish(saved.id)).toBe(true);
    const [listed] = listLocalBookProjects();
    expect(listed.pendingPublish).toBe(false);
    expect(listed.lastOnlineError).toBe('');
  });
});
