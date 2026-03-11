/**
 * OpenClawTab
 *
 * Dedicated admin tab for interacting with the OpenClaw gateway:
 * - Live status / reachability of the gateway
 * - Message dispatch panel (send events / talk to OpenClaw)
 * - Real-time activity feed (watchdog + dispatch log)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './OpenClawTab.css';

const logger = createLogger('OpenClawTab');

export default function OpenClawTab() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const sendResultTimer = useRef(null);

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

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await apiGet('/openclaw/recent-events?limit=40');
      if (data.ok) {
        setEvents(data.events || []);
      }
    } catch (err) {
      logger.error('Failed to load events', err);
    } finally {
      setEventsLoading(false);
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
        setSendResult({ ok: true, text: '✅ Dispatched to OpenClaw' });
        setMessageInput('');
        setTimeout(loadEvents, 1200);
      } else {
        setSendResult({ ok: false, text: `❌ ${data.message || 'Dispatch failed'}` });
      }
    } catch (err) {
      setSendResult({ ok: false, text: `❌ ${err.message || 'Network error'}` });
    } finally {
      setSending(false);
      sendResultTimer.current = setTimeout(() => setSendResult(null), 5000);
    }
  }, [messageInput, loadEvents]);

  // Initial load
  useEffect(() => {
    loadStatus();
    loadEvents();
    return () => {
      if (sendResultTimer.current) clearTimeout(sendResultTimer.current);
    };
  }, [loadStatus, loadEvents]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      loadStatus();
      loadEvents();
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, loadStatus, loadEvents]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const canDispatch = Boolean(status?.configured) && !sending && messageInput.trim().length > 0;

  return (
    <div className="openclaw-tab">
      {/* ── Status Panel ─────────────────────────── */}
      <div className="oc-panel">
        <div className="oc-panel-header">
          <h2 className="oc-panel-title">🦞 OpenClaw Gateway</h2>
          <div className="oc-panel-actions">
            <label className="oc-auto-refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto (30s)
            </label>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={() => { loadStatus(); loadEvents(); }}
              disabled={statusLoading || eventsLoading}
              title="Refresh status and events"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {statusLoading ? (
          <LoadingDots size="small" label="Checking gateway…" />
        ) : (
          <div className="oc-status-grid">
            <div className={`oc-status-card ${status?.configured ? 'oc-ok' : 'oc-warn'}`}>
              <span className="oc-status-icon">{status?.configured ? '✅' : '⚠️'}</span>
              <div>
                <div className="oc-status-label">Gateway</div>
                <div className="oc-status-value">{status?.configured ? 'Configured' : 'Not Configured'}</div>
              </div>
            </div>

            <div className={`oc-status-card ${status?.reachable ? 'oc-ok' : 'oc-bad'}`}>
              <span className="oc-status-icon">{status?.reachable ? '🟢' : '🔴'}</span>
              <div>
                <div className="oc-status-label">Reachable</div>
                <div className="oc-status-value">{status?.reachable ? 'Online' : 'Offline'}</div>
              </div>
            </div>

            <div className="oc-status-card oc-info">
              <span className="oc-status-icon">🪝</span>
              <div>
                <div className="oc-status-label">Webhook</div>
                <div className="oc-status-value">
                  {status?.webhookUrlConfigured ? 'Configured' : 'Not Set'}
                </div>
              </div>
            </div>

            {status?.gatewayUrl && (
              <div className="oc-status-card oc-info oc-url-card">
                <span className="oc-status-icon">🔗</span>
                <div>
                  <div className="oc-status-label">Endpoint</div>
                  <div className="oc-status-value oc-url-value">{status.gatewayUrl}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {status && !status.configured && (
          <div className="oc-notice oc-notice--warn">
            <strong>Not configured.</strong> Set{' '}
            <code>OPENCLAW_WEBHOOK_URL</code> (and optionally{' '}
            <code>OPENCLAW_GATEWAY_URL</code>) in Vercel environment variables, then redeploy the
            backend.
          </div>
        )}
      </div>

      {/* ── Dispatch / Chat Panel ─────────────────── */}
      <div className="oc-panel">
        <div className="oc-panel-header">
          <h3 className="oc-panel-title">📡 Send to OpenClaw</h3>
          <span className="oc-hint">Shift+Enter for newline · Enter to send</span>
        </div>

        <div className="oc-dispatch-row">
          <textarea
            className="oc-message-input"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              status?.configured
                ? 'Type a message or command to dispatch to OpenClaw…'
                : 'Configure OpenClaw gateway first (see notice above)'
            }
            rows={3}
            disabled={sending || !status?.configured}
            aria-label="OpenClaw message input"
          />
          <button
            className="oc-btn oc-btn--primary oc-send-btn"
            onClick={sendMessage}
            disabled={!canDispatch}
            aria-label="Send to OpenClaw"
          >
            {sending ? 'Sending…' : '📤 Send'}
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

      {/* ── Activity Feed ─────────────────────────── */}
      <div className="oc-panel">
        <div className="oc-panel-header">
          <h3 className="oc-panel-title">📋 Activity Feed</h3>
          <div className="oc-panel-actions">
            <span className="oc-hint">{events.length} event{events.length !== 1 ? 's' : ''}</span>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={loadEvents}
              disabled={eventsLoading}
              title="Reload events"
            >
              {eventsLoading ? '…' : '🔄'}
            </button>
          </div>
        </div>

        {eventsLoading && events.length === 0 && (
          <LoadingDots size="small" label="Loading activity…" />
        )}

        {!eventsLoading && events.length === 0 && (
          <div className="oc-events-empty">
            No watchdog activity yet. Events will appear here once the OpenClaw watchdog writes
            logs.
          </div>
        )}

        {events.length > 0 && (
          <div className="oc-events-list" aria-label="OpenClaw event feed">
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`oc-event oc-event--${ev.level ? ev.level.toLowerCase() : 'info'}`}
              >
                <div className="oc-event-meta">
                  <span className="oc-event-level">{ev.level || 'INFO'}</span>
                  {ev.type && ev.type !== 'general' && (
                    <span className="oc-event-type">{ev.type}</span>
                  )}
                  <span className="oc-event-time">{ev.timestamp || '—'}</span>
                </div>
                <div className="oc-event-msg">{ev.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
