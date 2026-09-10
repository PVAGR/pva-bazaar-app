import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureAdminBlogTokenFromStorage,
  publishBlogPostToServer,
  saveBlogDraftOnlineToServer,
} from '../blogPublish.js';

const called = [];

function jsonResponse(body, { status = 200 } = {}) {
  return { ok: status >= 200 && status < 400, status, json: async () => body };
}

function installFetchMock(handlers) {
  vi.stubGlobal('fetch', async (input, init = {}) => {
    const url = String(input);
    const path = new URL(url).pathname.replace(/^\/api(?=\/)/, '') || '/';
    called.push({ path, method: String(init?.method || 'GET').toUpperCase() });
    const handler = handlers[path];
    if (!handler) {
      console.error('MISSING HANDLER', JSON.stringify({ url, path, keys: Object.keys(handlers) }));
      return jsonResponse({ ok: false, error: 'not found' }, { status: 404 });
    }
    return handler(path, init);
  });
}

const happyPathHandlers = {
  '/blogs/setup': () => jsonResponse({ ok: true, status: 'pending', editSecret: 'secret-1' }),
  '/blogs/hello-world/update': () => jsonResponse({ ok: true, status: 'pending' }),
  '/blogs/hello-world/publish': () => jsonResponse({ ok: true, status: 'published' }),
  '/blogs/hello-world': () => jsonResponse({ ok: true, blog: { slug: 'hello-world', title: 'Hello World' } }),
};

const baseArgs = {
  slug: 'hello-world',
  title: 'Hello World',
  content: 'Body text',
  authorName: 'Richard Torres',
  adminToken: 'owner-token',
};

beforeEach(() => {
  called.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('blogPublish helpers (server-authoritative publish)', () => {
  it('saveBlogDraftOnlineToServer creates a pending draft and never publishes', async () => {
    installFetchMock(happyPathHandlers);

    const result = await saveBlogDraftOnlineToServer(baseArgs);

    expect(result).toEqual({ ok: true, slug: 'hello-world', status: 'pending' });
    expect(called.map((entry) => `${entry.method} ${entry.path}`)).toEqual([
      'POST /blogs/setup',
      'POST /blogs/hello-world/update',
    ]);
  });

  it('publishBlogPostToServer runs setup → update → publish → public GET verification', async () => {
    installFetchMock(happyPathHandlers);

    const result = await publishBlogPostToServer(baseArgs);

    expect(result).toEqual({ ok: true, slug: 'hello-world', status: 'published' });
    expect(called.map((entry) => `${entry.method} ${entry.path}`)).toEqual([
      'POST /blogs/setup',
      'POST /blogs/hello-world/update',
      'POST /blogs/hello-world/publish',
      'GET /blogs/hello-world',
    ]);
  });

  it('rejects when the server refuses publication (no fake success)', async () => {
    installFetchMock({
      ...happyPathHandlers,
      '/blogs/hello-world/publish': () =>
        jsonResponse({ ok: false, message: 'Add a title and body before publishing' }, { status: 400 }),
    });

    await expect(publishBlogPostToServer(baseArgs)).rejects.toThrow(
      'Add a title and body before publishing',
    );
  });

  it('rejects when the public GET cannot retrieve the published record', async () => {
    installFetchMock({
      ...happyPathHandlers,
      '/blogs/hello-world': () => jsonResponse({ ok: false, error: 'not found' }, { status: 404 }),
    });

    await expect(publishBlogPostToServer(baseArgs)).rejects.toThrow(
      'Published post could not be verified on the public API',
    );
  });

  it('rejects on an empty draft before any write (server will also protect)', async () => {
    installFetchMock(happyPathHandlers);

    await expect(
      publishBlogPostToServer({ ...baseArgs, title: '   ' }),
    ).rejects.toThrow('A slug and title are required to publish');
    expect(called.length).toBe(0);
  });

  it('never reads the device-local studio draft key (local draft stays local)', async () => {
    installFetchMock(happyPathHandlers);
    const getItemSpy = vi.spyOn(window.localStorage, 'getItem');
    window.localStorage.setItem('pva-writing-studio-blog-draft', JSON.stringify({ title: 'Local only' }));

    await publishBlogPostToServer(baseArgs);

    const readKeys = getItemSpy.mock.calls.map((call) => call[0]);
    expect(readKeys).not.toContain('pva-writing-studio-blog-draft');
    await expect(ensureAdminBlogTokenFromStorage()).resolves.toBe('');
  });

  it('normalizes the slug the same way the public URL uses it', async () => {
    installFetchMock(happyPathHandlers);

    await publishBlogPostToServer({ ...baseArgs, slug: '  Hello-World  ' });

    expect(called.map((entry) => entry.path)).toContain('/blogs/hello-world/publish');
  });
});