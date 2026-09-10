// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UniversalSearch, { useUniversalSearchShortcut } from '../src/components/UniversalSearch.jsx';
import { searchRoutes } from '../src/lib/searchCatalog.js';

// Mock fetch
const originalFetch = globalThis.fetch;

function renderWithRouter(ui) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
});

describe('searchCatalog', () => {
  it('A: returns empty array for queries shorter than 2 chars', () => {
    expect(searchRoutes('')).toEqual([]);
    expect(searchRoutes('a')).toEqual([]);
  });

  it('B: returns matching routes for valid queries', () => {
    const results = searchRoutes('market');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('route');
    expect(results[0].title.toLowerCase()).toContain('market');
  });

  it('C: respects the limit parameter', () => {
    const results = searchRoutes('e', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('UniversalSearch', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            query: 'test',
            count: 2,
            results: [
              { type: 'book', id: '1', title: 'Test Book', path: '/books/read/test' },
              { type: 'artifact', id: '2', title: 'Test Item', path: '/marketplace/test' },
            ],
            partial: false,
            failedSources: [],
          }),
      })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('D: shows EMPTY state when opened with no query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Type at least 2 characters/i)).toBeTruthy();
  });

  it('E: shows LOADING state during search', async () => {
    const user = userEvent.setup();
    let resolveFetch;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search PVA Bazaar/i);
    await user.type(input, 'test query');

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeTruthy();
    });

    resolveFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          query: 'test query',
          count: 0,
          results: [],
          partial: false,
          failedSources: [],
        }),
    });
  });

  it('F: shows RESULTS state when results returned', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search PVA Bazaar/i);
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Test Book')).toBeTruthy();
    });
  });

  it('G: shows NO_RESULTS state when no matches', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            query: 'zzzzzzzz',
            count: 0,
            results: [],
            partial: false,
            failedSources: [],
          }),
      })
    );

    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search PVA Bazaar/i);
    await user.type(input, 'zzzzzzzz');

    await waitFor(() => {
      expect(screen.getByText(/No results for/i)).toBeTruthy();
    });
  });

  it('H: shows PARTIAL state when some sources fail', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            query: 'test',
            count: 1,
            results: [{ type: 'book', id: '1', title: 'Test', path: '/books' }],
            partial: true,
            failedSources: ['artifacts'],
          }),
      })
    );

    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search PVA Bazaar/i);
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText(/Partial results/i)).toBeTruthy();
    });
  });

  it('I: shows UNAVAILABLE state on backend failure', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    renderWithRouter(<UniversalSearch isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Search PVA Bazaar/i);
    await user.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText(/Search unavailable/i)).toBeTruthy();
    });
  });

  it('J: opens on Ctrl+K shortcut', async () => {
    const onOpen = vi.fn();
    function TestComponent() {
      useUniversalSearchShortcut(onOpen);
      return null;
    }

    renderWithRouter(<TestComponent />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(onOpen).toHaveBeenCalled();
  });

  it('K: closes on Escape key', async () => {
    const onClose = vi.fn();
    renderWithRouter(<UniversalSearch isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
