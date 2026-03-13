import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './OpenClawTab.css';

const logger = createLogger('OpenClawTab');

function formatModeLabel(mode) {
  if (mode === 'webhook+queue') return 'Webhook + Queue';
  if (mode === 'queue-only') return 'Queue Only';
  return 'Unknown';
}

function formatMessageTime(value) {
  if (!value) return 'n/a';
  try {
    return new Date(value).toLocaleString();
  } catch (_err) {
    return String(value);
  }
}

export default function OpenClawTab() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [queueStats, setQueueStats] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  const [queueActionResult, setQueueActionResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const sendResultTimer = useRef(null);

  const loadQueueStats = useCallback(async () => {
    setQueueLoading(true);
    try {
      const data = await apiGet('/openclaw/queue-stats');
      if (data?.ok) {
        setQueueStats(data);
      }
    } catch (err) {
      logger.error('Failed to load OpenClaw queue stats', err);
      setQueueStats(null);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await apiGet('/openclaw/status');
      setStatus(data);
    } catch (err) {
      logger.error('Failed to load OpenClaw status', err);
      setStatus({ ok: false, configured: false, reachable: false, error: err.message });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const data = await apiGet('/openclaw/messages?limit=120');
      if (data.ok) {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setMessagesError('Message history requires admin authentication.');
      } else {
        setMessagesError(`Failed to load messages: ${err.message || 'Network error'}`);
      }
      logger.error('Failed to load OpenClaw messages', err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    setSending(true);
    setSendResult(null);
    if (sendResultTimer.current) clearTimeout(sendResultTimer.current);

    try {
      const data = await apiPost('/openclaw/dispatch', {
        event: 'pvabazaar.admin.message',
        message: trimmed,
        metadata: {
          source: 'admin-openclaw-tab',
          timestamp: new Date().toISOString(),
        },
      });

      if (data.ok) {
        setSendResult({
          ok: true,
          text: data.forwarded
            ? 'Message sent and queued for the agent'
            : 'Message queued for the agent',
        });
        setMessageInput('');
        setTimeout(loadMessages, 1000);
      } else {
        setSendResult({ ok: false, text: `❌ ${data.message || 'Dispatch failed'}` });
      }
    } catch (err) {
      setSendResult({ ok: false, text: `❌ ${err.message || 'Network error'}` });
    } finally {
      setSending(false);
      sendResultTimer.current = setTimeout(() => setSendResult(null), 6000);
    }
  }, [messageInput, loadMessages]);

  const replayWebhook = useCallback(async () => {
    setQueueActionLoading(true);
    setQueueActionResult(null);

    try {
      const data = await apiPost('/openclaw/replay-webhook', { limit: 10 });
      if (data?.ok) {
        setQueueActionResult({
          ok: true,
          text: `Replay finished: ${data.forwarded}/${data.attempted} forwarded, ${data.failed} failed`,
        });
        loadQueueStats();
      } else {
        setQueueActionResult({ ok: false, text: data?.message || 'Replay failed' });
      }
    } catch (err) {
      setQueueActionResult({ ok: false, text: err?.response?.data?.message || err.message || 'Replay failed' });
      logger.error('Failed to replay webhook messages', err);
    } finally {
      setQueueActionLoading(false);
    }
  }, [loadQueueStats]);

  useEffect(() => {
    loadStatus();
    loadMessages();
    loadQueueStats();
    return () => {
      if (sendResultTimer.current) clearTimeout(sendResultTimer.current);
    };
  }, [loadStatus, loadMessages, loadQueueStats]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      loadStatus();
      loadMessages();
      loadQueueStats();
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, loadStatus, loadMessages, loadQueueStats]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const rows = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [messages],
  );

  return (
    <div className="openclaw-tab">
      <div className="oc-panel">
        <div className="oc-panel-header">
          <h2 className="oc-panel-title">🦞 OpenClaw Live Console</h2>
          <div className="oc-panel-actions">
            <label className="oc-auto-refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              Auto-refresh every 15s
            </label>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={() => {
                loadStatus();
                loadMessages();
                loadQueueStats();
              }}
              disabled={statusLoading || messagesLoading || queueLoading}
              title="Refresh status, queue, and messages"
            >
              🔄 Refresh
            </button>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={replayWebhook}
              disabled={queueActionLoading}
              title="Replay pending outbound messages to the configured webhook"
            >
              {queueActionLoading ? 'Replaying...' : '🔁 Replay Queue'}
            </button>
          </div>
        </div>

        {statusLoading ? (
          <LoadingDots size="small" label="Checking OpenClaw status..." />
        ) : (
          <div className="oc-status-grid">
            <div className={`oc-status-card ${status?.configured ? 'oc-ok' : 'oc-warn'}`}>
              <span className="oc-status-icon">{status?.configured ? '✅' : '⚠️'}</span>
              <div>
                <div className="oc-status-label">Gateway</div>
                <div className="oc-status-value">{status?.configured ? 'Configured' : 'Not configured'}</div>
              </div>
            </div>

            <div className={`oc-status-card ${status?.reachable ? 'oc-ok' : 'oc-bad'}`}>
              <span className="oc-status-icon">{status?.reachable ? '🟢' : '🔴'}</span>
              <div>
                <div className="oc-status-label">Reachability</div>
                <div className="oc-status-value">{status?.reachable ? 'Online' : 'Offline'}</div>
              </div>
            </div>

            <div className="oc-status-card oc-info">
              <span className="oc-status-icon">🤖</span>
              <div>
                <div className="oc-status-label">Operating Mode</div>
                <div className="oc-status-value">{formatModeLabel(status?.mode)}</div>
              </div>
            </div>

            <div className={`oc-status-card ${queueStats?.staleOutbound > 0 ? 'oc-warn' : 'oc-ok'}`}>
              <span className="oc-status-icon">📬</span>
              <div>
                <div className="oc-status-label">Queued Outbound</div>
                <div className="oc-status-value">
                  {queueLoading ? 'Loading...' : `${queueStats?.pendingOutbound ?? 0} pending`}
                </div>
              </div>
            </div>

            <div className={`oc-status-card ${queueStats?.staleOutbound > 0 ? 'oc-bad' : 'oc-info'}`}>
              <span className="oc-status-icon">⏱️</span>
              <div>
                <div className="oc-status-label">Stale Outbound</div>
                <div className="oc-status-value">
                  {queueLoading
                    ? 'Loading...'
                    : `${queueStats?.staleOutbound ?? 0} older than ${queueStats?.staleMinutes ?? 30}m`}
                </div>
              </div>
            </div>
          </div>
        )}

        {queueActionResult && (
          <div
            className={`oc-send-result ${queueActionResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}
            role="status"
            aria-live="polite"
          >
            {queueActionResult.text}
          </div>
        )}

        <div className="oc-chat-box" aria-label="OpenClaw chat">
          {messagesLoading && !rows.length ? (
            <LoadingDots size="small" label="Loading conversation..." />
          ) : null}

          {!messagesLoading && messagesError ? (
            <div className="oc-events-empty oc-messages-notice">
              {messagesError}
            </div>
          ) : null}

          {!messagesLoading && !messagesError && !rows.length ? (
            <div className="oc-events-empty">
              No messages yet. Send a message to queue a request for the agent.
            </div>
          ) : null}

          {!!rows.length && (
            <div className="oc-chat-list">
              {rows.map((row) => {
                const inbound = row.direction === 'inbound';
                return (
                  <div
                    key={row._id || `${row.direction}-${row.createdAt}-${row.content}`}
                    className={`oc-chat-row ${inbound ? 'inbound' : 'outbound'}`}
                  >
                    <div className="oc-chat-meta">
                      <strong>{inbound ? 'OpenClaw Agent' : 'You'}</strong>
                      <span>{formatMessageTime(row.createdAt)}</span>
                    </div>
                    <div className="oc-chat-content">{row.content || '(empty)'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="oc-dispatch-row">
          <textarea
            className="oc-message-input"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message to OpenClaw. Press Enter to send; Shift+Enter for a new line."
            rows={3}
            disabled={sending}
            aria-label="OpenClaw message input"
          />
          <button
            className="oc-btn oc-btn--primary oc-send-btn"
            onClick={sendMessage}
            disabled={sending || !messageInput.trim()}
            aria-label="Send to OpenClaw"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {sendResult && (
          <div
            className={`oc-send-result ${sendResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}
            role="status"
            aria-live="polite"
          >
            {sendResult.text}
          </div>
        )}
      </div>
    </div>
  );
}
