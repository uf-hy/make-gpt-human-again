#!/usr/bin/env node
/**
 * auto-send.mjs
 *
 * Agent detection, bot token lookup, and Telegram message delivery.
 * Shared by humanize-output.js and any other scripts that need to auto-send.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Config (from env, with defaults) ────────────────────────────────────────

const AGENTS_DIR  = process.env.OPENCLAW_AGENTS_DIR  || '/root/.openclaw/agents';
const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || '/root/.openclaw/openclaw.json';

/** Read CHAT_ID lazily (after loadEnv in the main script has run) */
function getChatId() { return process.env.TELEGRAM_CHAT_ID; }

// ─── Agent detection ──────────────────────────────────────────────────────────

/**
 * Scan ALL session JSONL files across all agents, find the one that most
 * recently executed a humanize-output command within a 3-minute window.
 *
 * Returns { agent, sessionFile, sessionKey } or null.
 *
 * Design notes:
 * - Intentionally scans EVERY jsonl (not just the newest per agent) to avoid
 *   picking the wrong session when multiple sessions are active.
 * - The 3-minute window makes false positives practically impossible — two
 *   agents would need to call humanize-output in the exact same second.
 */
export function detectAgent(scriptStartMs = Date.now()) {
  const AGENTS = ['main', 'quick', 'fugu', 'fumi'];
  const results = {}; // agent → { ts, sessionFile, sessionKey }

  for (const agent of AGENTS) {
    const sdir = path.join(AGENTS_DIR, agent, 'sessions');
    if (!fs.existsSync(sdir)) continue;

    const files = fs.readdirSync(sdir)
      .filter(f => f.endsWith('.jsonl') && !f.includes('.lock') && !f.includes('.reset.'))
      .map(f => path.join(sdir, f));

    let bestTs   = null;
    let bestFile = null;

    for (const filePath of files) {
      // Read only the last 512 KB (recent activity)
      const stat     = fs.statSync(filePath);
      const readSize = Math.min(stat.size, 512 * 1024);
      const fd       = fs.openSync(filePath, 'r');
      const buf      = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
      fs.closeSync(fd);

      for (const line of buf.toString('utf8').trim().split('\n').reverse()) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          const ts  = obj.timestamp;
          if (!ts) continue;
          const diffMs = scriptStartMs - new Date(ts).getTime();
          if (diffMs > 180_000 || diffMs < -5_000) continue; // 3-min window

          for (const c of (obj?.message?.content ?? [])) {
            if (c.type === 'toolCall' && c.name === 'exec') {
              const cmd = c.arguments?.command || '';
              if (cmd.includes('humanize-output') && cmd.includes('node')) {
                if (!bestTs || ts > bestTs) { bestTs = ts; bestFile = filePath; }
              }
            }
          }
        } catch {}
      }
    }

    if (bestTs && bestFile) {
      results[agent] = {
        ts: bestTs,
        sessionFile: bestFile,
        sessionKey:  path.basename(bestFile, '.jsonl'),
      };
    }
  }

  if (Object.keys(results).length === 0) return null;

  const [winnerAgent, info] = Object.entries(results)
    .sort((a, b) => b[1].ts.localeCompare(a[1].ts))[0];

  const diffSec = ((scriptStartMs - new Date(info.ts).getTime()) / 1000).toFixed(1);
  process.stderr.write(
    `[auto-send] detected: ${winnerAgent} session=${info.sessionKey} (${diffSec}s ago)\n`
  );
  if (Object.keys(results).length > 1) {
    process.stderr.write(`[auto-send] multiple candidates — chose most recent: ${winnerAgent}\n`);
  }
  return { agent: winnerAgent, sessionFile: info.sessionFile, sessionKey: info.sessionKey };
}

// ─── Token lookup ─────────────────────────────────────────────────────────────

/**
 * Read the Telegram bot token for the given agent from openclaw.json.
 */
export function getBotToken(agent) {
  try {
    const cfg       = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const accountId = (cfg.bindings || []).find(b => b.agentId === agent)?.match?.accountId;
    return accountId
      ? cfg.channels?.telegram?.accounts?.[accountId]?.botToken || null
      : null;
  } catch {
    return null;
  }
}

// ─── Telegram send helpers ────────────────────────────────────────────────────

/** Strip HTML tags for plain-text fallback */
function htmlToPlain(input) {
  return String(input ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Send a text message via Telegram Bot API.
 * Automatically retries as plain text if HTML parse_mode fails.
 */
export async function sendText(token, text, parseMode = 'HTML', buttons = null) {
  const url     = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: getChatId(), text };
  if (parseMode) payload.parse_mode = parseMode;
  if (buttons?.length) payload.reply_markup = { inline_keyboard: buttons };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();

  if (!data.ok) {
    if (parseMode) {
      process.stderr.write(`[auto-send] ${parseMode} send failed, retrying as plain text\n`);
      const plain = parseMode === 'HTML' ? htmlToPlain(text) : String(text ?? '');
      return sendText(token, plain, null, buttons);
    }
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Send a file as a Telegram document (no compression).
 */
export async function sendDocument(token, filePath, caption = '') {
  const args = [
    'curl', '-s', '-X', 'POST',
    `https://api.telegram.org/bot${token}/sendDocument`,
    '-F', `chat_id=${getChatId()}`,
    '-F', `document=@${filePath}`,
  ];
  if (caption) args.push('-F', `caption=${caption}`);
  return JSON.parse(execSync(args.join(' '), { encoding: 'utf8', timeout: 30_000 }));
}

/**
 * One-liner: detect agent → get token → send.
 * mode: 'text' | 'document'
 */
export async function autoSend({ text, filePath, caption, mode = 'text' }) {
  const startMs     = Date.now();
  const agentResult = detectAgent(startMs);
  if (!agentResult) {
    process.stderr.write('[auto-send] ❌ could not detect agent, skipping send\n');
    return false;
  }
  const token = getBotToken(agentResult.agent);
  if (!token) {
    process.stderr.write(`[auto-send] ❌ no bot token for agent=${agentResult.agent}\n`);
    return false;
  }
  try {
    mode === 'document' && filePath
      ? await sendDocument(token, filePath, caption)
      : await sendText(token, text);
    process.stderr.write(`[auto-send] ✅ sent via ${agentResult.agent} bot\n`);
    return true;
  } catch (err) {
    process.stderr.write(`[auto-send] ❌ send failed: ${err.message}\n`);
    return false;
  }
}
