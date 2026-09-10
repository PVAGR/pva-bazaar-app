import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import { searchRoutes } from '../lib/searchCatalog';
import { apiUrl } from '../lib/apiBase';

const STATES = {
  EMPTY: 'EMPTY',
  LOADING: 'LOADING',
  RESULTS: 'RESULTS',
  NO_RESULTS: 'NO_RESULTS',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
};

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 30;
const DEBOUNCE_MS = 300;

export default function UniversalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState(STATES.EMPTY);
  const [results, setResults] = useState([]);
  const [failedSources, setFailedSources] = useState([]);
  const [partial, setPartial] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setState(STATES.EMPTY);
      setResults([]);
      setFailedSources([]);
      setPartial(false);
    }
  }, [isOpen]);

  // Search on debounced query change
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = debouncedQuery.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState(STATES.EMPTY);
      setResults([]);
      setFailedSources([]);
      setPartial(false);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setState(STATES.LOADING);

      // Search static routes locally (always succeeds)
      const routeResults = searchRoutes(trimmed, 5);

      try {
        const controller = new AbortController();
        const url = apiUrl(`/search?q=${encodeURIComponent(trimmed)}&limit=${DEFAULT_LIMIT}`);

        const res = await fetch(url, { signal: controller.signal });

        if (cancelled) return;

        if (!res.ok) {
          // Backend error - show route results only with UNAVAILABLE state
          setResults(routeResults);
          setState(STATES.UNAVAILABLE);
          setFailedSources(['backend']);
          setPartial(false);
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        // Merge backend results with route results
        const backendResults = (data.results || []).map((item) => ({
          type: item.type || 'item',
          id: item.id || item._id || String(item.slug || ''),
          title: item.title || item.name || item.businessName || 'Untitled',
          subtitle: item.subtitle || item.description?.slice(0, 80) || '',
          path: resolvePath(item),
        }));

        const merged = [...routeResults, ...backendResults].slice(0, DEFAULT_LIMIT);

        setResults(merged);
        setFailedSources(data.failedSources || []);
        setPartial(data.partial || false);

        if (merged.length === 0) {
          setState(STATES.NO_RESULTS);
        } else if (data.partial || (data.failedSources && data.failedSources.length > 0)) {
          setState(STATES.PARTIAL);
        } else {
          setState(STATES.RESULTS);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === 'AbortError') return;

        // Network error - show route results with UNAVAILABLE
        setResults(routeResults);
        setState(STATES.UNAVAILABLE);
        setFailedSources(['backend']);
        setPartial(false);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  function handleResultClick(result) {
    onClose();
    navigate(result.path);
  }

  function getStateMessage() {
    switch (state) {
      case STATES.LOADING:
        return 'Searching...';
      case STATES.NO_RESULTS:
        return `No results for "${query.trim()}"`;
      case STATES.PARTIAL:
        return `Partial results — some sources unavailable`;
      case STATES.UNAVAILABLE:
        return `Search unavailable — showing routes only`;
      default:
        return null;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="universal-search-overlay" onClick={onClose}>
      <div className="universal-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="universal-search-header">
          <input
            ref={inputRef}
            type="text"
            className="universal-search-input"
            placeholder="Search PVA Bazaar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          <button
            type="button"
            className="universal-search-close"
            onClick={onClose}
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div className="universal-search-results">
          {state === STATES.EMPTY && query.length < MIN_QUERY_LENGTH && (
            <p className="universal-search-hint">
              Type at least {MIN_QUERY_LENGTH} characters to search
            </p>
          )}

          {state !== STATES.EMPTY && (
            <>
              {getStateMessage() && (
                <p className="universal-search-state">{getStateMessage()}</p>
              )}

              {results.length > 0 && (
                <ul className="universal-search-list">
                  {results.map((result) => (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        type="button"
                        className="universal-search-item"
                        onClick={() => handleResultClick(result)}
                      >
                        <span className="universal-search-item-type">{result.type}</span>
                        <span className="universal-search-item-title">{result.title}</span>
                        {result.subtitle && (
                          <span className="universal-search-item-subtitle">{result.subtitle}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="universal-search-footer">
          <span className="universal-search-shortcut">Ctrl+K to open</span>
          <span className="universal-search-shortcut">Esc to close</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Resolve backend result to frontend path.
 */
function resolvePath(item) {
  const type = item.type || 'item';
  const slug = item.slug || item.id || item._id || '';

  switch (type) {
    case 'book':
      return slug ? `/books/read/${slug}` : '/books';
    case 'blog':
      return slug ? `/blog/${slug}` : '/blog';
    case 'libraryDocument':
    case 'library_document':
      return '/library';
    case 'libraryArticle':
    case 'library_article':
      return slug ? `/civilization-library/article/${slug}` : '/civilization-library';
    case 'partner':
    case 'partnerProfile':
      return '/partners';
    case 'artifact':
    case 'item':
      return slug ? `/marketplace/${slug}` : '/marketplace';
    case 'entry':
    case 'archiveEntry':
    case 'archive_entry':
      return '/archive';
    default:
      return '/archive';
  }
}

/**
 * Global keyboard listener for Ctrl+K.
 * Call this once at app root.
 */
export function useUniversalSearchShortcut(onOpen) {
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
