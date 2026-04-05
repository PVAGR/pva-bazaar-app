/* global setTimeout, clearTimeout, setInterval, clearInterval */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut, fetchAdminRuntimeConfig, updateOpenClawRuntimeConfig } from '../lib/api';
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

function formatAgeMinutes(value) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(Math.round((Date.now() - then) / 60000), 0);
}

export default function OpenClawTab() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [queueStats, setQueueStats] = useState(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  const [queueActionResult, setQueueActionResult] = useState(null);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [liveReplyEnabled, setLiveReplyEnabled] = useState(true);
  const [replyWaitMs, setReplyWaitMs] = useState(14000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [autoHealEnabled, setAutoHealEnabled] = useState(false);
  const [autoHealCooldownMinutes, setAutoHealCooldownMinutes] = useState(8);
  const [autoHealLastRunAt, setAutoHealLastRunAt] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configResult, setConfigResult] = useState(null);
  const [recoveryHistory, setRecoveryHistory] = useState([]);
  const [recoveryHistoryLoading, setRecoveryHistoryLoading] = useState(true);
  const [missionWalletAddress, setMissionWalletAddress] = useState('');
  const [missionMinRewardRaw, setMissionMinRewardRaw] = useState('0');
  const [missionLimit, setMissionLimit] = useState('10');
  const [missionLoading, setMissionLoading] = useState('');
  const [missionResult, setMissionResult] = useState(null);
  const [openclawConfig, setOpenclawConfig] = useState({
    gatewayUrl: '',
    webhookUrl: '',
    healthUrl: '',
    apiKey: '',
    bridgeSecret: '',
    autonomousEnabled: true,
    autonomousBountyScanMinutes: 30,
    autonomousKeepaliveMinutes: 10,
    autonomousMoneyRunEnabled: false,
    workerName: 'openclaw-queue-dispatcher',
    workerPollMs: 10000,
    workerBatchSize: 15,
  });
  const [agentConfig, setAgentConfig] = useState({ creatorCommands: [], goals: [] });
  const [agentConfigLoading, setAgentConfigLoading] = useState(false);
  const [agentConfigSaving, setAgentConfigSaving] = useState(false);
  const [creatorCommandsDraft, setCreatorCommandsDraft] = useState('');
  const [goalsDraft, setGoalsDraft] = useState('');
  const [configSaveResult, setConfigSaveResult] = useState(null);
  const [memory, setMemory] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(false);

  const sendResultTimer = useRef(null);
  const autoHealRunningRef = useRef(false);
  const chatEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const loadBountyDefaults = useCallback(async () => {
    try {
      const data = await apiGet('/bounties/stats');
      if (data?.ok && !missionWalletAddress && data.defaultPayoutWallet) {
        setMissionWalletAddress(data.defaultPayoutWallet);
      }
    } catch (err) {
      logger.error('Failed to load bounty defaults for OpenClaw', err);
    }
  }, [missionWalletAddress]);

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
          autonomousEnabled: cfg.autonomousEnabled !== false,
          autonomousBountyScanMinutes: cfg.autonomousBountyScanMinutes || 30,
          autonomousKeepaliveMinutes: cfg.autonomousKeepaliveMinutes || 10,
          autonomousMoneyRunEnabled: cfg.autonomousMoneyRunEnabled === true,
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
        autonomousEnabled: openclawConfig.autonomousEnabled,
        autonomousBountyScanMinutes: Number(openclawConfig.autonomousBountyScanMinutes || 30),
        autonomousKeepaliveMinutes: Number(openclawConfig.autonomousKeepaliveMinutes || 10),
        autonomousMoneyRunEnabled: openclawConfig.autonomousMoneyRunEnabled,
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

  const loadAgentConfig = useCallback(async () => {
    setAgentConfigLoading(true);
    try {
      const data = await apiGet('/openclaw/agent-config');
      const directives = data?.globalDirectives ?? data?.creatorCommands ?? [];
      if (data?.ok) {
        setAgentConfig({
          creatorCommands: directives,
          goals: data.goals ?? [],
        });
        setCreatorCommandsDraft((directives ?? []).join('\n'));
        setGoalsDraft((data.goals ?? []).join('\n'));
      }
    } catch (err) {
      logger.error('Failed to load OpenClaw agent config', err);
    } finally {
      setAgentConfigLoading(false);
    }
  }, []);

  const loadMemory = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const data = await apiGet('/openclaw/memory?limit=30');
      if (data?.ok && Array.isArray(data.memory)) {
        setMemory(data.memory);
      }
    } catch (err) {
      logger.error('Failed to load OpenClaw memory', err);
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const saveCreatorCommands = useCallback(async () => {
    const commands = creatorCommandsDraft
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    setAgentConfigSaving(true);
    setConfigSaveResult(null);
    try {
      const data = await apiPut('/openclaw/agent-config', {
        creatorCommands: commands,
        globalDirectives: commands,
      });
      if (data?.ok) {
        const savedDirectives = data.globalDirectives ?? data.creatorCommands ?? commands;
        setAgentConfig((c) => ({ ...c, creatorCommands: savedDirectives }));
        setConfigSaveResult({ ok: true, text: 'Logic directives saved. OpenClaw will apply them globally.' });
      } else {
        setConfigSaveResult({ ok: false, text: data?.message || 'Save failed' });
      }
    } catch (err) {
      setConfigSaveResult({ ok: false, text: err?.message || 'Save failed' });
    } finally {
      setAgentConfigSaving(false);
      setTimeout(() => setConfigSaveResult(null), 5000);
    }
  }, [creatorCommandsDraft]);

  const saveGoals = useCallback(async () => {
    const goals = goalsDraft
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    setAgentConfigSaving(true);
    setConfigSaveResult(null);
    try {
      const data = await apiPut('/openclaw/agent-config', { goals });
      if (data?.ok) {
        setAgentConfig((c) => ({ ...c, goals: data.goals ?? goals }));
        setConfigSaveResult({ ok: true, text: 'Global goals saved.' });
      } else {
        setConfigSaveResult({ ok: false, text: data?.message || 'Save failed' });
      }
    } catch (err) {
      setConfigSaveResult({ ok: false, text: err?.message || 'Save failed' });
    } finally {
      setAgentConfigSaving(false);
      setTimeout(() => setConfigSaveResult(null), 5000);
    }
  }, [goalsDraft]);

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

  const loadRecoveryHistory = useCallback(async () => {
    setRecoveryHistoryLoading(true);
    try {
      const data = await apiGet('/openclaw/recent-events?limit=60');
      const events = Array.isArray(data?.events) ? data.events : [];
      const filtered = events.filter((event) => {
        const type = String(event?.type || '').toLowerCase();
        const msg = String(event?.message || '').toLowerCase();
        return (
          type.includes('recovery')
          || type.includes('alert')
          || type.includes('health-failure')
          || msg.includes('recover')
          || msg.includes('replay')
          || msg.includes('health check failed')
        );
      });
      setRecoveryHistory(filtered.slice(0, 20));
    } catch (err) {
      logger.error('Failed to load OpenClaw recovery history', err);
      setRecoveryHistory([]);
    } finally {
      setRecoveryHistoryLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    setSending(true);
    setSendResult(null);
    if (sendResultTimer.current) clearTimeout(sendResultTimer.current);

    try {
      const data = await apiPost(liveReplyEnabled ? '/openclaw/chat' : '/openclaw/dispatch', {
        event: 'pvabazaar.admin.message',
        message: trimmed,
        waitForReplyMs: Math.min(Math.max(Number(replyWaitMs) || 14000, 2000), 25000),
        source: 'admin-openclaw-tab',
        metadata: {
          source: 'admin-openclaw-tab',
          timestamp: new Date().toISOString(),
        },
      });

      if (data.ok) {
        const hasLiveReply = liveReplyEnabled && data?.reply?.content;
        setSendResult({
          ok: true,
          text: hasLiveReply
            ? 'Live reply received from OpenClaw.'
            : (data.waiting
              ? 'Message sent. OpenClaw is still working; poll will pick up the reply shortly.'
              : (data.forwarded
                ? 'Message sent to OpenClaw and queued for agent response'
                : 'Message queued for agent response')),
        });
        setMessageInput('');
        setTimeout(loadMessages, hasLiveReply ? 250 : 1000);
        messageInputRef.current?.focus();
      } else {
        setSendResult({ ok: false, text: `❌ ${data.message || 'Dispatch failed'}` });
      }
    } catch (err) {
      setSendResult({ ok: false, text: `❌ ${err.message || 'Network error'}` });
    } finally {
      setSending(false);
      sendResultTimer.current = setTimeout(() => setSendResult(null), 6000);
    }
  }, [liveReplyEnabled, loadMessages, messageInput, replyWaitMs]);

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
        loadRecoveryHistory();
      } else {
        setQueueActionResult({ ok: false, text: data?.message || 'Replay failed' });
      }
    } catch (err) {
      setQueueActionResult({ ok: false, text: err?.response?.data?.message || err.message || 'Replay failed' });
      logger.error('Failed to replay webhook messages', err);
    } finally {
      setQueueActionLoading(false);
    }
  }, [loadQueueStats, loadRecoveryHistory]);

  const runRecovery = useCallback(async () => {
    setRecoverLoading(true);
    setQueueActionResult(null);

    try {
      const data = await apiPost('/openclaw/recover', {});
      if (data?.ok) {
        const replaySummary = data?.replay
          ? ` replay ${data.replay.forwarded}/${data.replay.attempted}`
          : '';
        setQueueActionResult({
          ok: true,
          text: `${data.message || 'Recovery completed'}; stale ${data?.queue?.before?.staleOutbound ?? 0} -> ${data?.queue?.after?.staleOutbound ?? 0}.${replaySummary}`,
        });
        loadStatus();
        loadQueueStats();
        loadRecoveryHistory();
      } else {
        setQueueActionResult({ ok: false, text: data?.message || 'Recovery failed' });
      }
    } catch (err) {
      setQueueActionResult({ ok: false, text: err?.response?.data?.message || err.message || 'Recovery failed' });
      logger.error('Failed to run OpenClaw recovery', err);
    } finally {
      setRecoverLoading(false);
    }
  }, [loadStatus, loadQueueStats, loadRecoveryHistory]);

  const runMission = useCallback(async (type) => {
    setMissionLoading(type);
    setMissionResult(null);

    const payload = {
      limit: Math.min(Math.max(parseInt(missionLimit, 10) || 10, 1), 25),
      walletAddress: missionWalletAddress.trim(),
      minRewardRaw: Math.max(0, Number(missionMinRewardRaw) || 0),
    };

    try {
      let data;
      if (type === 'scan') {
        data = await apiPost('/bounties/scan', {});
        setMissionResult({
          ok: true,
          text: `Scan completed. Sources refreshed: ${Array.isArray(data?.results) ? data.results.length : 0}.`,
        });
      } else if (type === 'dispatch') {
        data = await apiPost('/bounties/dispatch-top', payload);
        setMissionResult({
          ok: data?.ok !== false,
          text: data?.queued
            ? `Queued ${data.rankedCount || 0} ranked opportunities to OpenClaw for ${data.walletAddress || 'default payout wallet'}.`
            : (data?.message || 'No dispatch candidates available.'),
        });
      } else if (type === 'money-run') {
        data = await apiPost('/bounties/money-run', payload);
        setMissionResult({
          ok: data?.ok !== false,
          text: data?.queued
            ? `Money run queued ${data.rankedCount || 0} opportunities for ${data.walletAddress || 'default payout wallet'}.`
            : (data?.message || 'Money run completed with no qualifying opportunities.'),
        });
      } else if (type === 'ops-brief') {
        data = await apiPost('/openclaw/dispatch', {
          event: 'pvabazaar.admin.ops.brief',
          message: [
            'Maintain website uptime and queue hygiene.',
            'Prioritize stalled deliveries, stale outbound queue items, and gateway reachability issues.',
            'If bounty workflows are enabled, prefer high-confidence opportunities above the configured minimum reward.',
            `Target payout wallet: ${missionWalletAddress.trim() || 'default payout wallet'}.`,
          ].join(' '),
          metadata: {
            source: 'admin-openclaw-mission-rack',
            minRewardRaw: Math.max(0, Number(missionMinRewardRaw) || 0),
            limit: Math.min(Math.max(parseInt(missionLimit, 10) || 10, 1), 25),
            timestamp: new Date().toISOString(),
          },
        });
        setMissionResult({
          ok: data?.ok !== false,
          text: data?.forwarded
            ? 'Operations brief sent to OpenClaw and forwarded to the active gateway.'
            : 'Operations brief queued for OpenClaw.',
        });
      }

      loadStatus();
      loadMessages();
      loadQueueStats();
      loadRecoveryHistory();
    } catch (err) {
      setMissionResult({
        ok: false,
        text: err?.response?.data?.message || err.message || 'Mission failed',
      });
      logger.error(`OpenClaw mission failed: ${type}`, err);
    } finally {
      setMissionLoading('');
    }
  }, [loadMessages, loadQueueStats, loadRecoveryHistory, loadStatus, missionLimit, missionMinRewardRaw, missionWalletAddress]);

  useEffect(() => {
    loadStatus();
    loadMessages();
    loadQueueStats();
    loadRuntimeConfig();
    loadRecoveryHistory();
    loadBountyDefaults();
    loadAgentConfig();
    loadMemory();
    return () => {
      if (sendResultTimer.current) clearTimeout(sendResultTimer.current);
    };
  }, [loadStatus, loadMessages, loadQueueStats, loadRuntimeConfig, loadRecoveryHistory, loadBountyDefaults, loadAgentConfig, loadMemory]);

  const pendingOutbound = queueStats?.pendingOutbound ?? 0;
  const waitingForAgent = pendingOutbound > 0;
  const refreshInterval = waitingForAgent ? 5000 : 15000;

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      loadStatus();
      loadMessages();
      loadQueueStats();
      loadRecoveryHistory();
      loadMemory();
    }, refreshInterval);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, loadStatus, loadMessages, loadQueueStats, loadRecoveryHistory, loadMemory]);

  const shouldAutoHeal = useMemo(() => {
    if (!autoHealEnabled || statusLoading || queueLoading) {
      return { run: false, reason: '' };
    }

    const reasons = [];

    if (!status?.reachable) reasons.push('gateway offline');
    const heartbeatAge = formatAgeMinutes(status?.worker?.heartbeatAt);
    if (status?.worker?.active === false) reasons.push('worker lease inactive');
    if (heartbeatAge !== null && heartbeatAge > 4) reasons.push(`heartbeat stale (${heartbeatAge}m)`);
    if ((queueStats?.staleOutbound || 0) > 0) reasons.push(`stale queue (${queueStats?.staleOutbound})`);

    if (!reasons.length) {
      return { run: false, reason: '' };
    }

    const cooldownMs = Math.max(Number(autoHealCooldownMinutes || 8), 1) * 60 * 1000;
    const last = autoHealLastRunAt ? new Date(autoHealLastRunAt).getTime() : 0;
    const cooldownPassed = !last || (Date.now() - last) >= cooldownMs;

    return {
      run: cooldownPassed,
      reason: reasons.join(', '),
    };
  }, [
    autoHealEnabled,
    autoHealCooldownMinutes,
    autoHealLastRunAt,
    queueLoading,
    queueStats,
    status,
    statusLoading,
  ]);

  useEffect(() => {
    if (!shouldAutoHeal.run || autoHealRunningRef.current || recoverLoading) return;

    autoHealRunningRef.current = true;
    setQueueActionResult({ ok: true, text: `Auto-heal triggered: ${shouldAutoHeal.reason}` });

    runRecovery()
      .finally(() => {
        setAutoHealLastRunAt(new Date().toISOString());
        autoHealRunningRef.current = false;
      });
  }, [recoverLoading, runRecovery, shouldAutoHeal]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const rows = useMemo(() => {
    const safe = Array.isArray(messages)
      ? messages.filter((item) => item && typeof item === 'object')
      : [];

    return safe.sort((a, b) => {
      const aTime = Date.parse(a.createdAt || 0) || 0;
      const bTime = Date.parse(b.createdAt || 0) || 0;
      return aTime - bTime;
    });
  }, [messages]);

  const heartbeatAgeMinutes = formatAgeMinutes(status?.worker?.heartbeatAt);
  const heartbeatHealthy = heartbeatAgeMinutes !== null && heartbeatAgeMinutes <= 2;
  const leaseActive = status?.worker?.active === true;
  const staleOutbound = queueStats?.staleOutbound ?? 0;
  const ecosystem = status?.ecosystem?.services || {};
  const ecosystemState = status?.ecosystem?.status || 'unknown';
  const autonomyPosture = useMemo(() => {
    if (!openclawConfig.autonomousEnabled) {
      return { tone: 'oc-warn', icon: '🧷', label: 'Manual hold', detail: 'Autonomous mode is disabled' };
    }
    if (!status?.reachable || !leaseActive || staleOutbound > 0) {
      return { tone: 'oc-bad', icon: '🚨', label: 'Recovery pressure', detail: 'Operator attention required' };
    }
    if (openclawConfig.autonomousMoneyRunEnabled) {
      return { tone: 'oc-ok', icon: '🟢', label: 'Live bounty posture', detail: 'Autonomous ops and money-run are armed' };
    }
    return { tone: 'oc-info', icon: '🧭', label: 'Operator-guided', detail: 'Autonomous ops active, money-run held' };
  }, [leaseActive, openclawConfig.autonomousEnabled, openclawConfig.autonomousMoneyRunEnabled, staleOutbound, status?.reachable]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rows.length]);

  return (
    <div className="openclaw-tab" role="tabpanel" id="openclaw-panel">
      <div className="oc-panel">
        <div className="oc-panel-header">
          <div>
            <h2 className="oc-panel-title">🦞 OpenClaw Live Console</h2>
            <p className="oc-listening">OpenClaw is listening. Every message is remembered.</p>
          </div>
          <div className="oc-panel-actions">
            <label className="oc-auto-refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              {waitingForAgent ? 'Auto-refresh every 5s (waiting)' : 'Auto-refresh every 15s'}
            </label>
            <label className="oc-auto-refresh-label">
              <input
                type="checkbox"
                checked={autoHealEnabled}
                onChange={(event) => setAutoHealEnabled(event.target.checked)}
              />
              Auto-heal on anomalies
            </label>
            <label className="oc-auto-refresh-label">
              <input
                type="checkbox"
                checked={liveReplyEnabled}
                onChange={(event) => setLiveReplyEnabled(event.target.checked)}
              />
              Live reply mode
            </label>
            <label className="oc-auto-heal-cooldown">
              Reply wait (ms)
              <input
                type="number"
                min="2000"
                max="25000"
                step="500"
                value={replyWaitMs}
                onChange={(event) => setReplyWaitMs(event.target.value)}
                disabled={!liveReplyEnabled}
              />
            </label>
            <label className="oc-auto-heal-cooldown">
              Cooldown (min)
              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={autoHealCooldownMinutes}
                onChange={(event) => setAutoHealCooldownMinutes(event.target.value)}
                disabled={!autoHealEnabled}
              />
            </label>
            <button
              className="oc-btn oc-btn--secondary"
              onClick={() => {
                loadStatus();
                loadMessages();
                loadQueueStats();
                loadRecoveryHistory();
                loadMemory();
              }}
              disabled={statusLoading || messagesLoading || queueLoading}
              title="Refresh status, queue, messages, memory, and recovery history"
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
            <button
              className="oc-btn oc-btn--secondary"
              onClick={runRecovery}
              disabled={recoverLoading}
              title="Run automatic recovery checks and replay stale queue items"
            >
              {recoverLoading ? 'Recovering...' : '🛠️ Self-Heal'}
            </button>
          </div>
        </div>

        <div className={`oc-auto-heal-banner ${autoHealEnabled ? 'enabled' : 'disabled'}`}>
          <strong>Auto-heal:</strong>{' '}
          {autoHealEnabled
            ? `armed${shouldAutoHeal.reason ? ` · anomaly: ${shouldAutoHeal.reason}` : ' · monitoring'}`
            : 'disabled'}
          {autoHealLastRunAt ? ` · last run ${formatMessageTime(autoHealLastRunAt)}` : ''}
        </div>

        <div className="oc-recovery-history" aria-label="OpenClaw recovery history">
          <div className="oc-recovery-history-head">
            <h3>Recovery History</h3>
            <button
              className="oc-btn oc-btn--secondary"
              type="button"
              onClick={loadRecoveryHistory}
              disabled={recoveryHistoryLoading}
            >
              {recoveryHistoryLoading ? 'Loading...' : 'Refresh History'}
            </button>
          </div>

          {recoveryHistoryLoading ? (
            <div className="oc-events-empty">Loading recovery events...</div>
          ) : recoveryHistory.length === 0 ? (
            <div className="oc-events-empty">No recovery or alert events yet.</div>
          ) : (
            <div className="oc-recovery-list">
              {recoveryHistory.map((event, index) => (
                <div key={event.id || `${event.timestamp || 'no-ts'}-${index}`} className="oc-recovery-row">
                  <div className="oc-recovery-meta">
                    <span className={`oc-recovery-level oc-recovery-level-${String(event.level || 'info').toLowerCase()}`}>
                      {event.level || 'INFO'}
                    </span>
                    <span>{event.type || 'event'}</span>
                    <span>{formatMessageTime(event.timestamp)}</span>
                  </div>
                  <div className="oc-recovery-message">{event.message || 'No message'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="oc-creator-section oc-panel" style={{ marginTop: 0 }}>
          <div className="oc-panel-header">
            <h3 className="oc-panel-title">Logic Mode - Global Directives</h3>
          </div>
          <p className="oc-hint">
            Configure broad directives for the assistant behavior. One directive per line.
          </p>
          <p className="oc-hint">
            Stored directives: {agentConfig.creatorCommands.length} · goals: {agentConfig.goals.length}
          </p>
          {agentConfigLoading ? (
            <LoadingDots size="small" label="Loading..." />
          ) : (
            <>
              <textarea
                className="oc-message-input"
                value={creatorCommandsDraft}
                onChange={(e) => setCreatorCommandsDraft(e.target.value)}
                placeholder="e.g. Keep replies clear and practical. Prioritize uptime and reliability. Suggest next actions with checks."
                rows={4}
                aria-label="Global logic directives"
              />
              <div className="oc-dispatch-row" style={{ marginTop: 8 }}>
                <button
                  className="oc-btn oc-btn--primary"
                  onClick={saveCreatorCommands}
                  disabled={agentConfigSaving}
                >
                  {agentConfigSaving ? 'Saving...' : 'Save Logic Directives'}
                </button>
              </div>
              {configSaveResult && (
                <div
                  className={`oc-send-result ${configSaveResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}
                  role="status"
                >
                  {configSaveResult.text}
                </div>
              )}
            </>
          )}
        </div>

        <div className="oc-creator-section oc-panel">
          <div className="oc-panel-header">
            <h3 className="oc-panel-title">Global Goals</h3>
          </div>
          <p className="oc-hint">Broad goals the assistant should always pursue across the system. One per line.</p>
          {agentConfigLoading ? null : (
            <>
              <textarea
                className="oc-message-input"
                value={goalsDraft}
                onChange={(e) => setGoalsDraft(e.target.value)}
                placeholder="e.g. Keep services healthy. Reduce stale queue. Provide actionable status updates."
                rows={3}
                aria-label="Global goals"
              />
              <div className="oc-dispatch-row" style={{ marginTop: 8 }}>
                <button
                  className="oc-btn oc-btn--secondary"
                  onClick={saveGoals}
                  disabled={agentConfigSaving}
                >
                  {agentConfigSaving ? 'Saving...' : 'Save Goals'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="oc-memory-section oc-panel">
          <div className="oc-panel-header">
            <h3 className="oc-panel-title">Memory</h3>
            <button
              type="button"
              className="oc-btn oc-btn--secondary"
              onClick={loadMemory}
              disabled={memoryLoading}
            >
              {memoryLoading ? '…' : 'Refresh'}
            </button>
          </div>
          {memoryLoading && !memory.length ? (
            <LoadingDots size="small" label="Loading memory..." />
          ) : memory.length === 0 ? (
            <p className="oc-hint">No memory yet. Conversations are stored after the agent replies.</p>
          ) : (
            <ul className="oc-memory-list">
              {memory.slice(0, 15).map((m) => (
                <li key={m._id} className="oc-memory-item">
                  <span className="oc-memory-type">[{m.type}]</span> {m.key}: {String(m.value).slice(0, 80)}{String(m.value).length > 80 ? '…' : ''}
                </li>
              ))}
            </ul>
          )}
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

            <div className={`oc-status-card ${autonomyPosture.tone}`}>
              <span className="oc-status-icon">{autonomyPosture.icon}</span>
              <div>
                <div className="oc-status-label">Autonomy Posture</div>
                <div className="oc-status-value">{autonomyPosture.label}</div>
                <div className="oc-status-subvalue">{autonomyPosture.detail}</div>
              </div>
            </div>

            <div className={`oc-status-card ${staleOutbound > 0 ? 'oc-warn' : 'oc-ok'}`}>
              <span className="oc-status-icon">📬</span>
              <div>
                <div className="oc-status-label">Pending Queue</div>
                <div className="oc-status-value">
                  {queueLoading ? 'Loading...' : `${pendingOutbound} pending`}
                </div>
              </div>
            </div>

            <div className={`oc-status-card ${staleOutbound > 0 ? 'oc-bad' : 'oc-info'}`}>
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

            <div className={`oc-status-card ${leaseActive ? 'oc-ok' : 'oc-warn'}`}>
              <span className="oc-status-icon">🧭</span>
              <div>
                <div className="oc-status-label">Worker Lease</div>
                <div className="oc-status-value">{leaseActive ? 'Active' : 'Inactive / expired'}</div>
              </div>
            </div>

            <div className={`oc-status-card ${heartbeatHealthy ? 'oc-ok' : 'oc-warn'}`}>
              <span className="oc-status-icon">💓</span>
              <div>
                <div className="oc-status-label">Heartbeat Freshness</div>
                <div className="oc-status-value">
                  {heartbeatAgeMinutes === null
                    ? 'No heartbeat yet'
                    : `${heartbeatAgeMinutes}m ago`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="oc-ecosystem-panel oc-panel">
          <div className="oc-panel-header">
            <div>
              <h3 className="oc-config-title">Ecosystem Keystones</h3>
              <p className="oc-config-note">
                One live snapshot for the website, OpenClaw, Ollama, and Telegram bridge.
              </p>
            </div>
            <span className={`oc-mission-badge ${ecosystemState === 'healthy' ? 'oc-ok' : ecosystemState === 'degraded' ? 'oc-warn' : 'oc-bad'}`}>
              {ecosystemState.toUpperCase()}
            </span>
          </div>

          <div className="oc-status-grid">
            <div className={`oc-status-card ${ecosystem.website?.reachable ? 'oc-ok' : 'oc-warn'} oc-url-card`}>
              <span className="oc-status-icon">🌐</span>
              <div>
                <div className="oc-status-label">Website</div>
                <div className="oc-status-value">{ecosystem.website?.status || 'unknown'}</div>
                <div className="oc-status-subvalue">{ecosystem.website?.url || 'Not configured'}</div>
              </div>
            </div>

            <div className={`oc-status-card ${ecosystem.openclaw?.status === 'online' ? 'oc-ok' : 'oc-warn'} oc-url-card`}>
              <span className="oc-status-icon">🦞</span>
              <div>
                <div className="oc-status-label">OpenClaw</div>
                <div className="oc-status-value">{ecosystem.openclaw?.status || 'unknown'}</div>
                <div className="oc-status-subvalue">
                  {typeof ecosystem.openclaw?.queuePending === 'number'
                    ? `${ecosystem.openclaw.queuePending} pending · ${ecosystem.openclaw.staleOutbound ?? 0} stale`
                    : ecosystem.openclaw?.message || 'Queue snapshot unavailable'}
                </div>
                <div className="oc-status-subvalue">
                  {`Responder ${ecosystem.openclaw?.responderState || 'unknown'} · failures ${ecosystem.openclaw?.responderFailures ?? 0}`}
                </div>
              </div>
            </div>

            <div className={`oc-status-card ${ecosystem.ollama?.reachable ? 'oc-ok' : ecosystem.ollama?.configured ? 'oc-warn' : 'oc-info'} oc-url-card`}>
              <span className="oc-status-icon">🧠</span>
              <div>
                <div className="oc-status-label">Ollama</div>
                <div className="oc-status-value">{ecosystem.ollama?.status || 'unknown'}</div>
                <div className="oc-status-subvalue">
                  {ecosystem.ollama?.model ? `Model: ${ecosystem.ollama.model}` : ecosystem.ollama?.message || 'Not configured'}
                </div>
              </div>
            </div>

            <div className={`oc-status-card ${ecosystem.telegram?.reachable ? 'oc-ok' : ecosystem.telegram?.configured ? 'oc-warn' : 'oc-info'} oc-url-card`}>
              <span className="oc-status-icon">📱</span>
              <div>
                <div className="oc-status-label">Telegram</div>
                <div className="oc-status-value">{ecosystem.telegram?.status || 'unknown'}</div>
                <div className="oc-status-subvalue">
                  {ecosystem.telegram?.lastHeartbeatAt
                    ? `Heartbeat ${formatMessageTime(ecosystem.telegram.lastHeartbeatAt)}`
                    : ecosystem.telegram?.message || 'Bridge not reporting yet'}
                </div>
                <div className="oc-status-subvalue">
                  {`Bridge ${ecosystem.telegram?.connectionState || 'unknown'} · failures ${ecosystem.telegram?.consecutiveFailures ?? 0}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="oc-mission-rack" aria-label="OpenClaw mission rack">
          <div className="oc-mission-rack-head">
            <div>
              <h3 className="oc-config-title">Mission Rack</h3>
              <p className="oc-config-note">
                Operator-approved actions for keeping OpenClaw active, ranking opportunities, and dispatching work without blind wallet autonomy.
              </p>
            </div>
            <div className="oc-mission-posture">
              <span className={`oc-mission-badge ${autonomyPosture.tone}`}>{autonomyPosture.label}</span>
              <span className="oc-hint">Queue {pendingOutbound} pending · {staleOutbound} stale</span>
            </div>
          </div>

          <div className="oc-mission-controls">
            <label>
              Payout Wallet (Base)
              <input
                type="text"
                value={missionWalletAddress}
                onChange={(event) => setMissionWalletAddress(event.target.value)}
                placeholder="Uses backend default if left blank"
              />
            </label>
            <label>
              Minimum Reward
              <input
                type="number"
                min="0"
                step="1"
                value={missionMinRewardRaw}
                onChange={(event) => setMissionMinRewardRaw(event.target.value)}
              />
            </label>
            <label>
              Dispatch Limit
              <input
                type="number"
                min="1"
                max="25"
                step="1"
                value={missionLimit}
                onChange={(event) => setMissionLimit(event.target.value)}
              />
            </label>
          </div>

          <div className="oc-mission-grid">
            <button
              className="oc-mission-card"
              type="button"
              onClick={() => runMission('ops-brief')}
              disabled={missionLoading === 'ops-brief'}
            >
              <span className="oc-mission-icon">🛰️</span>
              <span className="oc-mission-title">Send Ops Brief</span>
              <span className="oc-mission-copy">Push a standing directive to prioritize uptime, queue hygiene, and recovery pressure.</span>
              <span className="oc-mission-cta">{missionLoading === 'ops-brief' ? 'Dispatching...' : 'Queue mission'}</span>
            </button>

            <button
              className="oc-mission-card"
              type="button"
              onClick={() => runMission('scan')}
              disabled={missionLoading === 'scan'}
            >
              <span className="oc-mission-icon">⚡</span>
              <span className="oc-mission-title">Run Fresh Scan</span>
              <span className="oc-mission-copy">Refresh the bounty field so OpenClaw is working from current opportunities instead of stale inventory.</span>
              <span className="oc-mission-cta">{missionLoading === 'scan' ? 'Scanning...' : 'Refresh sources'}</span>
            </button>

            <button
              className="oc-mission-card"
              type="button"
              onClick={() => runMission('dispatch')}
              disabled={missionLoading === 'dispatch'}
            >
              <span className="oc-mission-icon">🎯</span>
              <span className="oc-mission-title">Dispatch Top Ranked</span>
              <span className="oc-mission-copy">Queue the best currently known opportunities to OpenClaw with your payout target and minimum reward filter.</span>
              <span className="oc-mission-cta">{missionLoading === 'dispatch' ? 'Dispatching...' : 'Send ranked set'}</span>
            </button>

            <button
              className="oc-mission-card"
              type="button"
              onClick={() => runMission('money-run')}
              disabled={missionLoading === 'money-run'}
            >
              <span className="oc-mission-icon">💸</span>
              <span className="oc-mission-title">Money Run</span>
              <span className="oc-mission-copy">Perform the full admin-safe cycle: scan, rank, and queue qualified opportunities for OpenClaw to work.</span>
              <span className="oc-mission-cta">{missionLoading === 'money-run' ? 'Running...' : 'Start cycle'}</span>
            </button>
          </div>

          {missionResult && (
            <div className={`oc-send-result ${missionResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}>
              {missionResult.text}
            </div>
          )}
        </div>

        {queueActionResult && (
          <div
            className={`oc-send-result ${queueActionResult.ok ? 'oc-send-result--ok' : 'oc-send-result--err'}`}
            role="status"
            aria-live="polite"
          >
            {queueActionResult.text}
          </div>
        )}

        {waitingForAgent && (
          <div className="oc-waiting-banner" role="status" aria-live="polite">
            ⏳ OpenClaw is processing {pendingOutbound} message{pendingOutbound !== 1 ? 's' : ''}. Replies will appear here.
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
              Autonomous Scan (minutes)
              <input
                type="number"
                min="5"
                max="1440"
                step="1"
                value={openclawConfig.autonomousBountyScanMinutes}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, autonomousBountyScanMinutes: event.target.value }))}
              />
            </label>
            <label>
              Keepalive Ping (minutes)
              <input
                type="number"
                min="1"
                max="240"
                step="1"
                value={openclawConfig.autonomousKeepaliveMinutes}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, autonomousKeepaliveMinutes: event.target.value }))}
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
            <label className="oc-config-toggle">
              <input
                type="checkbox"
                checked={openclawConfig.autonomousEnabled}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, autonomousEnabled: event.target.checked }))}
              />
              Autonomous OpenClaw mode enabled
            </label>
            <label className="oc-config-toggle">
              <input
                type="checkbox"
                checked={openclawConfig.autonomousMoneyRunEnabled}
                onChange={(event) => setOpenclawConfig(prev => ({ ...prev, autonomousMoneyRunEnabled: event.target.checked }))}
              />
              Autonomous money-run workflows enabled
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

        <div className="oc-chat-box" aria-label="OpenClaw chat" aria-live="polite">
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
              No messages yet. Use the chat box below to start a global OpenClaw conversation.
            </div>
          ) : null}

          {!!rows.length && (
            <div className="oc-chat-list">
              {rows.map((row, index) => {
                const inbound = row.direction === 'inbound';
                const content = typeof row.content === 'string'
                  ? row.content
                  : (row.content == null ? '(empty)' : JSON.stringify(row.content));
                return (
                  <div
                    key={row._id || `${row.direction || 'unknown'}-${row.createdAt || index}-${index}`}
                    className={`oc-chat-row ${inbound ? 'inbound' : 'outbound'}`}
                  >
                    <div className="oc-chat-meta">
                      <strong>{inbound ? 'OpenClaw Agent' : 'You'}</strong>
                      <span>{formatMessageTime(row.createdAt)}</span>
                    </div>
                    <div className="oc-chat-content">{content}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="oc-dispatch-row">
          <textarea
            ref={messageInputRef}
            className="oc-message-input"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message for global OpenClaw chat. Enter sends, Shift+Enter adds newline."
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
