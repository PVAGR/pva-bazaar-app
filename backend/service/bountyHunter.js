/**
 * bountyHunter.js
 *
 * Persistent scanner service for discovering crypto bounties across platforms.
 * Architecture: GitHub Actions cron → POST /api/bounties/scan (this triggers the scan)
 * Results stored in MongoDB for HITL review in the admin dashboard.
 *
 * Required env vars:
 *   OPENAI_API_KEY           – For AI draft generation (optional but recommended)
 *   BOUNTY_PAYOUT_WALLET     – Your Base wallet address (just the address, not the key)
 *   BOUNTY_PAYOUT_CHAIN      – Default: "base"
 *   DEWORK_API_URL           – Optional: Dework GraphQL endpoint
 *   GITHUB_BOUNTY_REPOS      – Comma-separated list of "owner/repo" to scan for issues
 */

'use strict';

const axios = require('axios');
const dbConnect = require('../lib/dbConnect');
const Bounty = require('../models/Bounty');

// ─── Keyword Strategy ────────────────────────────────────────────────────────

const KEYWORDS = {
  compensation: ['bounty', 'reward', 'prize', 'pay', 'payment', 'paid', 'contest', 'hackathon', 'grant'],
  crypto: ['crypto', 'eth', 'usdc', 'dai', 'matic', 'base', 'stablecoin', 'token', 'blockchain', 'web3'],
  task: ['task', 'quest', 'job', 'project', 'contract', 'freelance', 'remote', 'issue', 'open to work'],
  aiExecutable: [
    'code', 'script', 'solidity', 'smart contract', 'frontend', 'backend', 'api',
    'write', 'document', 'tutorial', 'review', 'audit', 'readme', 'docs',
    'react', 'node', 'python', 'typescript', 'data label', 'annotate', 'classify',
  ],
};

const ALL_KEYWORDS = Object.values(KEYWORDS).flat();
const REDDIT_SUBREDDITS = ['CryptoCurrency', 'web3', 'ethdev', 'solana', 'forhire', 'jobs4bitcoins'];

function scoreText(text) {
  if (!text) return { score: 0, matched: [] };
  const lower = text.toLowerCase();
  const matched = [...new Set(ALL_KEYWORDS.filter(kw => lower.includes(kw)))];
  return { score: matched.length, matched };
}

// Minimum keyword score to consider a bounty viable
const MIN_SCORE = 1;

// ─── Platform: Dework ────────────────────────────────────────────────────────

async function scanDework() {
  const endpoint = process.env.DEWORK_API_URL || 'https://api.dework.xyz/graphql';
  const found = [];

  try {
    const query = `
      query GetBounties($limit: Int!) {
        tasks(filter: { status: TODO, reward: { gt: { amount: 0 } } }, limit: $limit) {
          id
          name
          description
          dueDate
          project { name permalink }
          reward { amount token { symbol chain } currency }
          tags { label }
          permalink
        }
      }
    `;

    const { data } = await axios.post(
      endpoint,
      { query, variables: { limit: 50 } },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const tasks = data?.data?.tasks || [];

    for (const task of tasks) {
      const text = `${task.name} ${task.description || ''}`;
      const { score, matched } = scoreText(text);
      if (score < MIN_SCORE) continue;

      const rewardAmount = task.reward?.amount;
      const rewardToken = task.reward?.token?.symbol || task.reward?.currency || '';

      found.push({
        platform: 'dework',
        platformId: task.id,
        platformUrl: task.permalink ? `https://app.dework.xyz${task.permalink}` : '',
        title: task.name,
        description: task.description || '',
        tags: (task.tags || []).map(t => t.label),
        keywords: matched,
        rewardAmount: rewardAmount ? `${rewardAmount} ${rewardToken}` : '',
        rewardToken,
        rewardRaw: parseFloat(rewardAmount) || 0,
        chain: task.reward?.token?.chain || process.env.BOUNTY_PAYOUT_CHAIN || 'base',
        expiresAt: task.dueDate ? new Date(task.dueDate) : null,
        rawData: task,
      });
    }
  } catch (err) {
    // Dework API may require auth or change endpoints; log and continue
    console.warn('[BountyHunter] Dework scan failed:', err.message);
  }

  return found;
}

// ─── Platform: GitHub Issues ─────────────────────────────────────────────────

async function scanGitHub() {
  const found = [];
  const repos = (process.env.GITHUB_BOUNTY_REPOS || '')
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  // Also scan public "good-first-issue" + "bounty" labeled issues via search
  const searches = [
    'is:issue is:open label:bounty',
    'is:issue is:open label:reward',
    'is:issue is:open (bounty OR reward) (USDC OR ETH OR DAI OR MATIC)',
    'is:issue is:open (web3 OR blockchain) (paid OR payment OR grant)',
    'is:issue is:open (smart contract OR solidity OR frontend OR react) (bounty OR reward)',
  ];

  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Scan specific repos
  for (const repo of repos) {
    try {
      // Keep both a label-focused pass and a generic pass to avoid missing opportunities.
      const [labelPass, genericPass] = await Promise.all([
        axios.get(`https://api.github.com/repos/${repo}/issues?state=open&per_page=30&labels=bounty,reward`, {
          headers,
          timeout: 10000,
        }).catch(() => ({ data: [] })),
        axios.get(`https://api.github.com/repos/${repo}/issues?state=open&per_page=30`, {
          headers,
          timeout: 10000,
        }).catch(() => ({ data: [] })),
      ]);

      const data = [...(labelPass.data || []), ...(genericPass.data || [])];
      const uniqueById = new Map();
      for (const issue of data) uniqueById.set(issue.id, issue);

      for (const issue of uniqueById.values()) {
        if (issue.pull_request) continue; // skip PRs
        const text = `${issue.title} ${issue.body || ''}`;
        const { score, matched } = scoreText(text);
        if (score < MIN_SCORE) continue;

        const rewardInfo = extractRewardFromText(issue.body || issue.title);

        found.push({
          platform: 'github',
          platformId: String(issue.id),
          platformUrl: issue.html_url,
          title: issue.title,
          description: (issue.body || '').substring(0, 2000),
          tags: (issue.labels || []).map(l => l.name),
          keywords: matched,
          rewardAmount: rewardInfo.amountText,
          rewardToken: rewardInfo.token,
          rewardRaw: rewardInfo.raw,
          chain: process.env.BOUNTY_PAYOUT_CHAIN || 'base',
          rawData: { id: issue.id, number: issue.number, repo },
        });
      }
    } catch (err) {
      console.warn(`[BountyHunter] GitHub scan failed for ${repo}:`, err.message);
    }
  }

  // Public search for bounties
  for (const q of searches) {
    try {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=30&sort=created&order=desc`;
      const { data } = await axios.get(url, { headers, timeout: 10000 });

      for (const issue of (data.items || [])) {
        if (issue.pull_request) continue;
        const text = `${issue.title} ${issue.body || ''}`;
        const { score, matched } = scoreText(text);
        if (score < MIN_SCORE) continue;

        const rewardInfo = extractRewardFromText(issue.body || issue.title);

        found.push({
          platform: 'github',
          platformId: String(issue.id),
          platformUrl: issue.html_url,
          title: issue.title,
          description: (issue.body || '').substring(0, 2000),
          tags: (issue.labels || []).map(l => l.name),
          keywords: matched,
          rewardAmount: rewardInfo.amountText,
          rewardToken: rewardInfo.token,
          rewardRaw: rewardInfo.raw,
          chain: process.env.BOUNTY_PAYOUT_CHAIN || 'base',
          rawData: { id: issue.id, repo: issue.repository_url?.split('/').slice(-2).join('/') },
        });
      }
    } catch (err) {
      console.warn('[BountyHunter] GitHub search failed:', err.message);
    }
  }

  return found;
}

// ─── Platform: Reddit (public JSON feed) ────────────────────────────────────

async function scanReddit() {
  const found = [];
  const subreddits = (process.env.REDDIT_BOUNTY_SUBREDDITS || REDDIT_SUBREDDITS.join(','))
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  for (const subreddit of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;
      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'pva-bazaar-bounty-scanner/1.0',
        },
      });

      const posts = data?.data?.children || [];
      for (const item of posts) {
        const p = item?.data;
        if (!p || p.stickied) continue;

        const text = `${p.title || ''} ${p.selftext || ''}`;
        const { score, matched } = scoreText(text);
        if (score < MIN_SCORE) continue;

        const rewardInfo = extractRewardFromText(text);

        found.push({
          platform: 'reddit',
          platformId: p.id,
          platformUrl: p.permalink ? `https://www.reddit.com${p.permalink}` : '',
          title: p.title || '(untitled)',
          description: (p.selftext || '').substring(0, 2000),
          tags: [`r/${subreddit}`],
          keywords: matched,
          rewardAmount: rewardInfo.amountText,
          rewardToken: rewardInfo.token,
          rewardRaw: rewardInfo.raw,
          chain: process.env.BOUNTY_PAYOUT_CHAIN || 'base',
          rawData: {
            id: p.id,
            subreddit,
            createdUtc: p.created_utc,
            author: p.author,
          },
        });
      }
    } catch (err) {
      console.warn(`[BountyHunter] Reddit scan failed for r/${subreddit}:`, err.message);
    }
  }

  return found;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractRewardFromText(text) {
  if (!text) return '';
  const normalized = String(text).replace(/\$/g, ' USD ');
  const match = normalized.match(/(\d[\d,\.]*)\s*(USDC|ETH|DAI|MATIC|USDT|USD)/i);
  if (!match) {
    return { amountText: '', token: '', raw: 0 };
  }

  const value = parseFloat(String(match[1]).replace(/,/g, '')) || 0;
  const token = String(match[2] || '').toUpperCase();
  return {
    amountText: `${match[1]} ${token}`,
    token,
    raw: value,
  };
}

function extractTokenFromText(text) {
  if (!text) return '';
  const match = text.match(/\b(USDC|ETH|DAI|MATIC|USDT)\b/i);
  return match ? match[1].toUpperCase() : '';
}

// ─── AI Draft Generation ─────────────────────────────────────────────────────

async function generateDraft(bounty) {
  if (!process.env.OPENAI_API_KEY) return '';

  try {
    const prompt = `You are a skilled Web3 developer and technical writer. 
A bounty task has been found on ${bounty.platform}:

Title: ${bounty.title}
Description: ${bounty.description}
Reward: ${bounty.rewardAmount || 'unspecified'}
Tags: ${bounty.tags.join(', ')}

Write a high-quality submission for this task. Be specific, professional, and demonstrate expertise.
If it's a code task, write the actual code. If it's documentation, write the full document.
Start directly with the deliverable, no preamble.`;

    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.warn('[BountyHunter] Draft generation failed:', err.message);
    return '';
  }
}

// ─── Deduplication & Persistence ─────────────────────────────────────────────

async function upsertBounty(raw) {
  await dbConnect();

  // Check if already stored (by platform + platformId)
  if (raw.platformId) {
    const existing = await Bounty.findOne({ platform: raw.platform, platformId: raw.platformId });
    if (existing) return { bounty: existing, isNew: false };
  }

  // Generate AI draft while we have the data
  const draftContent = await generateDraft(raw);

  const bounty = await Bounty.create({
    ...raw,
    status: draftContent ? 'draft_ready' : 'discovered',
    draftContent,
    draftGeneratedAt: draftContent ? new Date() : undefined,
    draftModel: draftContent ? 'gpt-4o' : '',
  });

  return { bounty, isNew: true };
}

// ─── Main Scan Entry Point ────────────────────────────────────────────────────

async function runScan(options = {}) {
  const { platforms = ['dework', 'github', 'reddit'] } = options;
  const results = { discovered: 0, skipped: 0, errors: [] };

  console.log('[BountyHunter] Starting scan for platforms:', platforms.join(', '));

  let rawBounties = [];

  for (const platform of platforms) {
    try {
      if (platform === 'dework') rawBounties = rawBounties.concat(await scanDework());
      if (platform === 'github') rawBounties = rawBounties.concat(await scanGitHub());
      if (platform === 'reddit') rawBounties = rawBounties.concat(await scanReddit());
    } catch (err) {
      results.errors.push({ platform, message: err.message });
    }
  }

  console.log(`[BountyHunter] Raw bounties found: ${rawBounties.length}`);

  for (const raw of rawBounties) {
    try {
      const { isNew } = await upsertBounty(raw);
      if (isNew) {
        results.discovered += 1;
      } else {
        results.skipped += 1;
      }
    } catch (err) {
      results.errors.push({ title: raw.title, message: err.message });
    }
  }

  console.log('[BountyHunter] Scan complete:', results);
  return results;
}

module.exports = { runScan, generateDraft };
