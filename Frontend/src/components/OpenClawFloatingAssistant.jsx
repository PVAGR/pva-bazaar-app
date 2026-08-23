import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { getToken } from '../lib/auth';
import './OpenClawFloatingAssistant.css';

const SESSION_STORAGE_KEY = 'openclaw-website-session-id';

function getOrCreateSessionId() {
  const storage = typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
  if (!storage) {
    return `session-ssr-${Date.now()}`;
  }

  const existing = storage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const generated = (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : `session-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  storage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

function parseMemoryPreview(item) {
  const raw = String(item?.value || '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === 'string') return parsed.text;
    return raw;
  } catch (_err) {
    return raw;
  }
}

export default function OpenClawFloatingAssistant({ routePath = '/' }) {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('unknown');
  const [sending, setSending] = useState(false);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [memory, setMemory] = useState([]);
  const listRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiGet('/openclaw/status');
      const ecosystemStatus = data?.ecosystem?.services?.openclaw?.status || 'unknown';
      setStatus(ecosystemStatus);
    } catch (_err) {
      setStatus('offline');
    }
  }, []);

  const sendPresencePulse = useCallback(async () => {
    // Presence capture is admin-scoped server-side; skip the call for guests
    // so anonymous browsing does not generate 401 noise on every page.
    if (!getToken()) return;
    try {
      await apiPost('/openclaw/public/pulse', {
        sessionId,
        path: routePath,
        title: typeof globalThis !== 'undefined' && globalThis.document ? globalThis.document.title : '',
        referrer: typeof globalThis !== 'undefined' && globalThis.document ? globalThis.document.referrer : '',
      });
    } catch (_err) {
      // Presence capture is best-effort and should never block UX.
    }
  }, [routePath, sessionId]);

  const loadMemory = useCallback(async () => {
    setLoadingMemory(true);
    try {
      const data = await apiGet(`/openclaw/public/memory?sessionId=${encodeURIComponent(sessionId)}&limit=18`);
      setMemory(Array.isArray(data?.memory) ? data.memory : []);
    } catch (_err) {
      setMemory([]);
    } finally {
      setLoadingMemory(false);
    }
  }, [sessionId]);

  const sendMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft('');
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text,
        at: new Date().toISOString(),
      },
    ]);

    try {
      const data = await apiPost('/openclaw/public-chat', {
        sessionId,
        message: text,
        path: routePath,
        source: 'website-openclaw-widget',
        waitForReplyMs: 8000,
      });

      if (data?.reply?.content) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: String(data.reply.content),
            at: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: String(data?.message || 'Message received. I am still processing this for memory and response.'),
            at: new Date().toISOString(),
          },
        ]);
      }

      loadMemory();
    } catch (_err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not respond right now, but your request has still been captured for later memory recovery.',
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [draft, loadMemory, routePath, sending, sessionId]);

  useEffect(() => {
    loadStatus();
    sendPresencePulse();

    const interval = globalThis.setInterval(() => {
      loadStatus();
      sendPresencePulse();
    }, 180000);

    return () => globalThis.clearInterval(interval);
  }, [loadStatus, sendPresencePulse]);

  useEffect(() => {
    sendPresencePulse();
  }, [routePath, sendPresencePulse]);

  useEffect(() => {
    if (open) {
      loadMemory();
    }
  }, [open, loadMemory]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="oc-float-root" aria-live="polite">
      <button
        type="button"
        className={`oc-float-trigger oc-status-${status}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="openclaw-float-panel"
      >
        <span className="oc-float-dot" />
        OpenClaw
      </button>

      {open && (
        <section id="openclaw-float-panel" className="oc-float-panel" aria-label="OpenClaw website assistant">
          <header className="oc-float-header">
            <div>
              <strong>OpenClaw Live Memory</strong>
              <p>Status: {status}</p>
            </div>
            <button type="button" className="oc-float-min" onClick={() => setOpen(false)} aria-label="Close assistant">
              Close
            </button>
          </header>

          <div className="oc-float-chat" ref={listRef}>
            {messages.length === 0 ? (
              <p className="oc-float-hint">I stay alive on this site and keep memory of your instructions. Start speaking to me.</p>
            ) : (
              messages.map((message, index) => (
                <article key={`${message.role}-${index}-${message.at}`} className={`oc-msg oc-msg-${message.role}`}>
                  <span className="oc-msg-role">{message.role === 'assistant' ? 'OpenClaw' : 'You'}</span>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>

          <label className="oc-float-label" htmlFor="oc-float-input">Message</label>
          <textarea
            id="oc-float-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell OpenClaw what to remember, do, or monitor across the website..."
            rows={3}
          />
          <button type="button" className="oc-float-send" onClick={sendMessage} disabled={sending || !draft.trim()}>
            {sending ? 'Sending...' : 'Send and Remember'}
          </button>

          <div className="oc-memory-strip" aria-label="Session memory preview">
            <div className="oc-memory-strip-head">
              <strong>Session Memory</strong>
              <button type="button" onClick={loadMemory} disabled={loadingMemory}>Refresh</button>
            </div>
            {loadingMemory ? (
              <p className="oc-float-hint">Loading memory...</p>
            ) : memory.length === 0 ? (
              <p className="oc-float-hint">No stored memory yet in this session.</p>
            ) : (
              <ul>
                {memory.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <span>{String(item.key || '').split(':').slice(-1)[0]}</span>
                    <p>{parseMemoryPreview(item).slice(0, 100)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
