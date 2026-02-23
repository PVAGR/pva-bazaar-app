import React, { useId, useMemo, useState } from 'react';
import './HelpTip.css';

/**
 * HelpTip
 * Small "?" button that opens a compact, accessible tooltip/popover.
 */
export default function HelpTip({ title, body, example }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const hasContent = useMemo(() => !!(title || body || example), [title, body, example]);
  if (!hasContent) return null;

  return (
    <span className="helpTip">
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

