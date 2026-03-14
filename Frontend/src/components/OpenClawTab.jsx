import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, fetchAdminRuntimeConfig, updateOpenClawRuntimeConfig } from '../lib/api';
import { createLogger } from '../lib/logger';
import { LoadingDots } from '../components/LoadingSpinner.jsx';
import './OpenClawTab.css';

const logger = createLogger('OpenClawTab');

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
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configResult, setConfigResult] = useState(null);
  const [openclawConfig, setOpenclawConfig] = useState({
    gatewayUrl: '',
    webhookUrl: '',
    healthUrl: '',
    apiKey: '',
    bridgeSecret: '',
    workerName: 'openclaw-queue-dispatcher',
    workerPollMs: 10000,
    workerBatchSize: 15,
  });

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

  const loadRuntimeConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await fetchAdminRuntimeConfig();
      if (data?.ok && data?.config?.openclaw) {
        const cfg = data.config.openclaw;
        setOpenclawConfig((prev) => ({
          ...prev,
          gatewayUrl: cfg.gatewayUrl || '',
          webhookUrl: cfg.webhookUrl || '',
          healthUrl: cfg.healthUrl || '',
          workerName: cfg.workerName || 'openclaw-queue-dispatcher',
          workerPollMs: cfg.workerPollMs || 10000,
          workerBatchSize: cfg.workerBatchSize || 15,
        }));
      }
    } catch (err) {
      logger.error('Failed to load runtime config', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const saveRuntimeConfig = useCallback(async () => {
    setConfigSaving(true);
    setConfigResult(null);
    try {
      const payload = {
        gatewayUrl: openclawConfig.gatewayUrl,
        webhookUrl: openclawConfig.webhookUrl,
        healthUrl: openclawConfig.healthUrl,
        apiKey: openclawConfig.apiKey,
        bridgeSecret: openclawConfig.bridgeSecret,
        workerName: openclawConfig.workerName,
        workerPollMs: Number(openclawConfig.workerPollMs || 10000),
        workerBatchSize: Number(openclawConfig.workerBatchSize || 15),
      };
      const data = await updateOpenClawRuntimeConfig(payload);
      if (data?.ok) {
        setConfigResult({ ok: true, text: 'Runtime config saved and applied.' });
        setOpenclawConfig((prev) => ({ ...prev, apiKey: '', bridgeSecret: '' }));
        loadStatus();
        loadQueueStats();
      } else {
        setConfigResult({ ok: false, text: data?.error || 'Failed to save runtime config.' });
      }
    } catch (err) {
      setConfigResult({ ok: false, text: err?.response?.data?.error || err.message || 'Failed to save runtime config.' });
    } finally {
      setConfigSaving(false);
    }
  }, [openclawConfig, loadStatus, loadQueueStats]);

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
        setMessagesError('Message history requires authentication. Send a message to get started.');
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
            ? 'Message sent to OpenClaw and queued for agent response'
            : 'Message queued for agent response',
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
          text: `Replay complete: forwarded ${data.forwarded}/${data.attempted}, failed ${data.failed}`,
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
    loadRuntimeConfig();
    return () => {
      if (sendResultTimer.current) clearTimeout(sendResultTimer.current);
    };
  }, [loadStatus, loadMessages, loadQueueStats, loadRuntimeConfig]);

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
              Poll every 15s
            </label>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={() => {
                loadStatus();
                loadMessages();
                loadQueueStats();
              }}
              disabled={statusLoading || messagesLoading || queueLoading}
              title="Refresh status and messages"
            >
              🔄 Refresh
            </button>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={replayWebhook}
              disabled={queueActionLoading}
              title="Replay pending outbound messages to OpenClaw webhook"
            >
              {queueActionLoading ? 'Replaying...' : '🔁 Replay Webhook'}
            </button>
          </div>
        </div>

        {statusLoading ? (
          <LoadingDots size="small" label="Checking gateway..." />
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
                <div className="oc-status-label">Agent Mode</div>
                <div className="oc-status-value">Autonomous queue responder</div>
              </div>
            </div>

            <div className={`oc-status-card ${queueStats?.staleOutbound > 0 ? 'oc-warn' : 'oc-ok'}`}>
              <span className="oc-status-icon">📬</span>
              <div>
                <div className="oc-status-label">Pending Queue</div>
                <div className="oc-status-value">
                  {queueLoading ? 'Loading...' : `${queueStats?.pendingOutbound ?? 0} pending`}
                </div>
              </div>
            </div>

            <div className={`oc-status-card ${queueStats?.staleOutbound > 0 ? 'oc-bad' : 'oc-info'}`}>
              <span className="oc-status-icon">⏱️</span>
              <div>
                <div className="oc-status-label">Stale Queue</div>
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

        <div className="oc-config-box" aria-label="OpenClaw runtime configuration">
          <h3 className="oc-config-title">Runtime Configuration</h3>
          <p className="oc-config-note">
            Save OpenClaw endpoints and worker tuning from this panel. Secret fields are optional on update.
          </p>
          <div className="oc-config-grid">
            <label>
              Gateway URL
              <input
                type="url"
                value={openclawConfig.gatewayUrl}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, gatewayUrl: event.target.value }))}
                placeholder="https://openclaw.yourdomain.com"
              />
            </label>
            <label>
              Webhook URL
              <input
                type="url"
                value={openclawConfig.webhookUrl}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, webhookUrl: event.target.value }))}
                placeholder="https://openclaw.yourdomain.com/webhook"
              />
            </label>
            <label>
              Health URL
              <input
                type="url"
                value={openclawConfig.healthUrl}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, healthUrl: event.target.value }))}
                placeholder="https://openclaw.yourdomain.com/healthz"
              />
            </label>
            <label>
              Worker Name
              <input
                type="text"
                value={openclawConfig.workerName}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, workerName: event.target.value }))}
              />
            </label>
            <label>
              Worker Poll (ms)
              <input
                type="number"
                min="2000"
                step="1000"
                value={openclawConfig.workerPollMs}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, workerPollMs: event.target.value }))}
              />
            </label>
            <label>
              Worker Batch Size
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={openclawConfig.workerBatchSize}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, workerBatchSize: event.target.value }))}
              />
            </label>
            <label>
              API Key (optional)
              <input
                type="password"
                value={openclawConfig.apiKey}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, apiKey: event.target.value }))}
                placeholder="Leave blank to keep existing key"
              />
            </label>
            <label>
              Bridge Secret (optional)
              <input
                type="password"
                value={openclawConfig.bridgeSecret}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, bridgeSecret: event.target.value }))}
                placeholder="Leave blank to keep existing secret"
              />
            </label>
          </div>

          <div className="oc-config-actions">
            <button
              className="oc-btn oc-btn--secondary"
              onClick={loadRuntimeConfig}
              disabled={configLoading || configSaving}
            >
              {configLoading ? 'Loading...' : 'Load Saved Config'}
            </button>
            <button
              className="oc-btn oc-btn--primary"
              onClick={saveRuntimeConfig}
              disabled={configSaving}
            >
              {configSaving ? 'Saving...' : 'Save Runtime Config'}
            </button>
          </div>

          {configResult && (
            <div className={`oc-send-result ${configResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}>
              {configResult.text}
            </div>
          )}
        </div>

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
              No messages yet. Send a message and the scheduled agent workflow will answer.
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
            placeholder="Type a message to OpenClaw. Enter sends, Shift+Enter adds newline."
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
