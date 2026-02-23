import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './HelpTip.css';

/**
 * HelpTip
 * Small "?" button that opens a compact, accessible tooltip/popover.
 */
export default function HelpTip({ title, body, example }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const hasContent = useMemo(() => !!(title || body || example), [title, body, example]);
  if (!hasContent) return null;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    function onPointerDown(e) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <span className="helpTip" ref={rootRef}>
      <button
        type="button"
        className="helpTip__btn"
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={`helpTip-popover-${id}`}
        onClick={() => setOpen((v) => !v)}
        title={title || 'Help'}
      >
        ?
      </button>
      {open ? (
        <span
          role="dialog"
          aria-label={title || 'Help'}
          id={`helpTip-popover-${id}`}
          className="helpTip__popover"
        >
          <span className="helpTip__header">
            <span className="helpTip__title">{title || 'Help'}</span>
            <button
              type="button"
              className="helpTip__close"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              title="Close"
            >
              ×
            </button>
          </span>
          {body ? <span className="helpTip__body">{body}</span> : null}
          {example ? (
            <span className="helpTip__example">
              <span className="helpTip__exampleLabel">Example:</span> <code>{example}</code>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

