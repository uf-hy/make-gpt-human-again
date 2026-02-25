#!/usr/bin/env node

/**
 * humanize-output.js
 *
 * Reads raw GPT output from stdin, rewrites it in the configured persona voice
 * via an OpenAI-compatible API, then sends it to Telegram through the correct bot.
 *
 * Pipeline:
 *   stdin → buildContext() → callGemini() → deliverMessage() → injectContext()
 *
 * Flags:
 *   --stdout            Also print translated text to stdout
 *   --no-inject-context Skip injecting [CONTEXT_REF] back into the session
 *   --no-context        Disable conversation context (context is ON by default)
 *   --debug-context     Print the style context fed to Gemini, then exit
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { detectAgent, getBotToken, sendText } from './auto-send.mjs';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '..');

/** Load .env file from skill root (non-destructive: won't overwrite existing env vars) */
function loadEnv() {
  const envPath = path.join(SKILL_ROOT, '.env');
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch { /* .env is optional */ }
}

loadEnv();

// ─── Config (all from env, with sensible defaults) ───────────────────────────

const API_BASE    = process.env.OPENAI_API_BASE;   // required — set in .env
const API_KEY     = (process.env.OPENAI_API_KEY || '').trim();

const PRIMARY_MODELS = (
  process.env.HUMANIZE_PRIMARY_MODELS ||
  'gemini-3-flash'
).split(',').map(s => s.trim()).filter(Boolean);

const FALLBACK_MODELS = (
  process.env.HUMANIZE_FALLBACK_MODELS ||
  'gemini-2.5-flash'
).split(',').map(s => s.trim()).filter(Boolean);

const CONTEXT_N         = parseInt(process.env.HUMANIZE_CONTEXT_N || '4', 10);
const CONTEXT_MAX_CHARS = parseInt(process.env.HUMANIZE_CONTEXT_MAX_CHARS || '2000', 10);
const GATEWAY_PORT      = parseInt(process.env.OPENCLAW_GATEWAY_PORT || '18789', 10);
const OPENCLAW_CONFIG   = process.env.OPENCLAW_CONFIG_PATH || '/root/.openclaw/openclaw.json';
const AGENTS_DIR        = process.env.OPENCLAW_AGENTS_DIR  || '/root/.openclaw/agents';

// ─── Persona names (configurable for customization/privacy) ───────────────────

const PERSONA_NAME = process.env.HUMANIZE_PERSONA_NAME || 'Assistant';
const USER_NAME    = process.env.HUMANIZE_USER_NAME    || 'User';

// ─── CLI flags ────────────────────────────────────────────────────────────────

const VERBOSE_STDOUT   = process.argv.includes('--stdout');
const INJECT_CONTEXT   = !process.argv.includes('--no-inject-context');
const DEBUG_CONTEXT    = process.argv.includes('--debug-context');

function isContextEnabled() {
  if (process.argv.includes('--no-context')) return false;
  if (process.env.HUMANIZE_CONTEXT === '0') return false;
  return true;
}

// ─── Style prompt ─────────────────────────────────────────────────────────────

/** Load persona system prompt from prompts/humanize.txt (falls back to inline default) */
function loadStylePrompt() {
  const promptPath = path.join(SKILL_ROOT, 'prompts', 'humanize.txt');
  try {
    return fs.readFileSync(promptPath, 'utf8').trim();
  } catch {
    // Inline fallback — generic version
    return [
      `You are ${PERSONA_NAME}, a helpful assistant with a friendly, conversational tone.`,
      `Restate the GPT output to ${USER_NAME} in your own voice.`,
      'Preserve all key info. Use Telegram HTML. Split with %%SPLIT%%.',
      'Inline buttons: [BTN:label|label]. Kaomoji bare, never in HTML tags.',
    ].join('\n');
  }
}

const STYLE_PROMPT = loadStylePrompt();

// ─── HTML utilities ───────────────────────────────────────────────────────────

/** Parse [BTN:label|callback] syntax, return { text, buttons } */
function parseButtons(raw) {
  const btnRegex = /\[BTN:([^|\]]+)\|([^\]]+)\]/g;
  const allBtns  = [];
  let match;
  while ((match = btnRegex.exec(raw)) !== null) {
    let label = match[1].trim();
    // callback_data must equal visible label to avoid click confusion
    // Telegram limit: 64 bytes
    if (Buffer.byteLength(label, 'utf8') > 64) {
      const ellipsis = '…';
      const room = 64 - Buffer.byteLength(ellipsis, 'utf8');
      let acc = '';
      for (const ch of label) {
        if (Buffer.byteLength(acc + ch, 'utf8') > room) break;
        acc += ch;
      }
      label = (acc || label.slice(0, 16)) + ellipsis;
      while (Buffer.byteLength(label, 'utf8') > 64) label = label.slice(0, -1);
      process.stderr.write(`[humanize-output] ⚠️ button label truncated to fit 64 bytes: ${label}\n`);
    }
    allBtns.push({ text: label, callback_data: label });
  }

  const text = raw.replace(/\[BTN:[^\]]+\]/g, '').replace(/\n{2,}/g, '\n\n').trim();
  if (allBtns.length === 0) return { text, buttons: null };

  // Layout: ≤2 buttons same row if short enough; else each row one button
  const rows = [];
  if (allBtns.length <= 2) {
    const totalLen = allBtns.reduce((s, b) => s + b.text.length, 0);
    totalLen <= 16 ? rows.push(allBtns) : allBtns.forEach(b => rows.push([b]));
  } else {
    let i = 0;
    while (i < allBtns.length) {
      if (i + 1 < allBtns.length &&
          allBtns[i].text.length + allBtns[i + 1].text.length <= 16) {
        rows.push([allBtns[i], allBtns[i + 1]]); i += 2;
      } else {
        rows.push([allBtns[i]]); i++;
      }
    }
  }
  return { text, buttons: rows };
}

function normalizeSegment(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeAngleBrackets(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize a text segment for Telegram HTML parse_mode.
 * Keeps only allowed tags; escapes unknown tags; auto-closes unclosed tags.
 */
function sanitizeTelegramHtmlSegment(input) {
  let s = String(input ?? '').replace(/\r\n/g, '\n').replace(/<br\s*\/?\s*>/gi, '\n');
  const allowed = new Set(['b', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'tg-spoiler', 'a']);
  const tagRe   = /<\/?([a-zA-Z0-9-]+)(\s+[^>]*)?>/g;
  let out = '', last = 0;
  const stack = [];
  const push = t => { if (stack.length < 32) stack.push(t); };
  const pop  = () => stack.pop();

  let m;
  while ((m = tagRe.exec(s)) !== null) {
    out  += s.slice(last, m.index);
    last  = tagRe.lastIndex;
    const rawTag  = m[0];
    const name    = (m[1] || '').toLowerCase();
    const attrs   = m[2] || '';
    const isClose = rawTag.startsWith('</');

    if (!allowed.has(name)) { out += escapeAngleBrackets(rawTag); continue; }

    if (!isClose) {
      if (name === 'a') {
        const href = attrs.match(/href\s*=\s*"([^"]+)"/i)?.[1] ||
                     attrs.match(/href\s*=\s*'([^']+)'/i)?.[1] || '';
        if (href) { out += `<a href="${href.replace(/"/g, '&quot;')}">`;  push('a'); }
        else       { out += escapeAngleBrackets(rawTag); }
      } else {
        out += `<${name}>`; push(name);
      }
    } else {
      if (stack.length > 0 && stack[stack.length - 1] === name) {
        pop(); out += `</${name}>`;
      }
      // mismatched close tag → discard
    }
  }
  out += s.slice(last);
  for (let i = stack.length - 1; i >= 0; i--) out += `</${stack[i]}>`;
  return normalizeSegment(out);
}

// ─── Context helpers ──────────────────────────────────────────────────────────

const STATE_DIR = path.join(SKILL_ROOT, 'state');
const HISTORY_PATH = path.join(STATE_DIR, 'history.jsonl');

function ensureStateDir() {
  try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch {}
}

/**
 * Build an interleaved conversation context from the session JSONL file.
 * Pairs user messages with persona replies ([CONTEXT_REF] injections).
 * Returns a formatted string: "User: ...\n\nAssistant: ..."
 */
function buildContext(sessionFile) {
  if (!isContextEnabled() || !sessionFile) return '';
  try {
    if (!fs.existsSync(sessionFile)) return '';
    const stat     = fs.statSync(sessionFile);
    const readSize = Math.min(stat.size, 512 * 1024);
    const fd       = fs.openSync(sessionFile, 'r');
    const buf      = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    fs.closeSync(fd);

    const turns = [];
    for (const line of buf.toString('utf8').trim().split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj  = JSON.parse(line);
        const msg  = obj?.message;
        if (!msg || msg.role !== 'user') continue;
        const text = (Array.isArray(msg.content) ? msg.content : [])
          .filter(p => p?.type === 'text' && typeof p.text === 'string')
          .map(p => p.text).join('\n').trim();
        if (!text) continue;

        // Drop system noise
        if (text.startsWith('System:') && text.includes('Exec completed')) continue;

        // [CONTEXT_REF] → assistant turn: extract translated content
        if (text.includes('[CONTEXT_REF]')) {
          const m = text.match(/NO_REPLY[：:]\s*\n+([\s\S]+)/);
          if (m?.[1]?.trim()) turns.push({ role: 'assistant', text: m[1].trim() });
          continue;
        }

        // Regular user message: strip Conversation info metadata block
        const cleaned = text
          .replace(/Conversation info \(untrusted metadata\)[^\n]*\n```json[\s\S]*?```\s*/g, '')
          .trim();
        if (cleaned) turns.push({ role: 'user', text: cleaned });
      } catch {}
    }

    const recent    = turns.slice(-Math.max(2, CONTEXT_N * 2));
    const formatted = recent.map(t => {
      const prefix = t.role === 'user' ? USER_NAME : PERSONA_NAME;
      const txt    = t.text.length > 500 ? t.text.slice(-500) : t.text;
      return `${prefix}: ${txt}`;
    });

    let joined = formatted.join('\n\n').trim();
    if (joined.length > CONTEXT_MAX_CHARS) joined = joined.slice(-CONTEXT_MAX_CHARS);
    return joined;
  } catch {
    return '';
  }
}

/** Append a sent message to the local history log (used as fallback context) */
function appendHistory(text) {
  try {
    ensureStateDir();
    const line = JSON.stringify({ ts: new Date().toISOString(), text: String(text ?? '') }) + '\n';
    fs.appendFileSync(HISTORY_PATH, line, 'utf8');
    const stat = fs.statSync(HISTORY_PATH);
    if (stat.size > 200 * 1024) {
      const buf  = fs.readFileSync(HISTORY_PATH);
      const tail = buf.slice(Math.max(0, buf.length - 100 * 1024)).toString('utf8');
      const idx  = tail.indexOf('\n');
      fs.writeFileSync(HISTORY_PATH, idx >= 0 ? tail.slice(idx + 1) : tail, 'utf8');
    }
  } catch {}
}

// ─── Gemini API ───────────────────────────────────────────────────────────────

/**
 * Call one model and return the translated text.
 * Throws on HTTP error or timeout.
 */
async function callModel(model, input, styleContext, timeoutMs = 60_000) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const messages = [{ role: 'system', content: STYLE_PROMPT }];
  if (styleContext?.trim()) {
    messages.push({
      role: 'user',
      content: `[Recent conversation context — use to keep tone consistent; do NOT repeat or quote]\n\n${styleContext.trim()}`,
    });
  }
  messages.push({
    role: 'user',
    content: `Here is the GPT output to restate in your ${PERSONA_NAME} voice:\n\n${input}`,
  });

  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 8192 }),
      signal: ac.signal,
    });
    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON response: ${text.slice(0, 200)}`); }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${json?.error?.message || text}`);
    const out = json?.choices?.[0]?.message?.content;
    if (!out) throw new Error(`Empty response: ${text.slice(0, 200)}`);
    return out.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Race PRIMARY_MODELS concurrently; fall back to FALLBACK_MODELS in order.
 * Returns { text, model } — model is the name of the winner (marked "(fallback)" if fallback).
 */
async function callGemini(input, styleContext) {
  const toResult = m => callModel(m, input, styleContext)
    .then(text => ({ text, model: m }))
    .catch(err => Promise.reject({ model: m, err }));

  // Try primaries concurrently
  try {
    return await Promise.any(PRIMARY_MODELS.map(toResult));
  } catch (_) {}

  // Primaries all failed — try fallbacks in sequence
  for (const m of FALLBACK_MODELS) {
    try {
      const text = await callModel(m, input, styleContext);
      return { text, model: `${m}(fallback)` };
    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? err);
      process.stderr.write(`[humanize-output] fallback ${m} failed: ${msg}\n`);
    }
  }
  throw new Error('All primary and fallback models failed');
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

/**
 * Split translated text into segments, sanitize HTML, send to Telegram.
 * Returns the plain-text version of what was sent (for context injection).
 */
async function deliverMessage(sendTarget, rawTranslation) {
  const { text: rawText, buttons } = parseButtons(rawTranslation);
  const segments = rawText
    .split(/\s*%%SPLIT%%\s*/)
    .map(s => sanitizeTelegramHtmlSegment(s))
    .filter(Boolean);

  if (segments.length <= 1) {
    const one = segments[0] || sanitizeTelegramHtmlSegment(rawText);
    await sendText(sendTarget.token, one, 'HTML', buttons);
    appendHistory(one);
    return one.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/?[^>]+>/g, '');
  }

  for (let i = 0; i < segments.length; i++) {
    await sendText(sendTarget.token, segments[i], 'HTML', i === segments.length - 1 ? buttons : null);
    if (i < segments.length - 1) await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
  }
  const joined = segments.join('\n\n');
  appendHistory(joined);
  return joined.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/?[^>]+>/g, '');
}

// ─── Context injection ────────────────────────────────────────────────────────

/**
 * Inject a [CONTEXT_REF] message back into the triggering session via the
 * OpenClaw gateway, so GPT knows what the persona actually said in this turn.
 * Fire-and-forget: aborts after 5 s to avoid blocking the script.
 */
async function injectContext(sessionKey, plainText) {
  if (!INJECT_CONTEXT || !sessionKey) return;
  try {
    // Read gateway auth token from OpenClaw config
    let gatewayToken = '';
    try {
      const cfg = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
      gatewayToken = cfg?.gateway?.auth?.token || '';
    } catch {}
    if (!gatewayToken) {
      process.stderr.write('[humanize-output] ⚠️ gateway token not found, skipping inject\n');
      return;
    }

    const msg = `[CONTEXT_REF] Here is what ${PERSONA_NAME} just sent to ${USER_NAME}. For reference only — reply NO_REPLY:\n\n${plainText}`;

    const ac    = new AbortController();
    const timer = setTimeout(() => ac.abort(), 5_000);
    try {
      await fetch(`http://localhost:${GATEWAY_PORT}/tools/invoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gatewayToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'sessions_send',
          sessionKey,
          args: { sessionKey, message: msg },
        }),
        signal: ac.signal,
      });
      process.stderr.write(`[humanize-output] ✅ context injected into session ${sessionKey}\n`);
    } catch (e) {
      if (e.name === 'AbortError') {
        process.stderr.write('[humanize-output] ✅ context inject fired (no-wait timeout)\n');
      } else {
        process.stderr.write(`[humanize-output] ⚠️ context inject failed: ${e.message}\n`);
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    process.stderr.write(`[humanize-output] ⚠️ injectContext error: ${err.message}\n`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end',  () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const input = (await readStdin()).trim();
  if (!input) {
    process.stderr.write('[humanize-output] no input on stdin\n');
    process.exit(1);
  }
  if (!API_KEY || !API_BASE) {
    process.stderr.write('[humanize-output] OPENAI_API_KEY and OPENAI_API_BASE must be set in .env\n');
    process.exit(1);
  }

  const startMs = Date.now();

  // Detect which agent triggered this call (runs fast, sync file scan)
  const agentResult = detectAgent(startMs);
  const token       = agentResult ? getBotToken(agentResult.agent) : null;
  const sendTarget  = (agentResult && token) ? { ...agentResult, token } : null;

  ensureStateDir();

  // Build interleaved conversation context from the session file
  const styleContext = buildContext(sendTarget?.sessionFile);

  // Debug: print context and exit
  if (DEBUG_CONTEXT) {
    process.stdout.write('=== [DEBUG CONTEXT] fed to Gemini ===\n');
    process.stdout.write(styleContext || '(empty — context disabled or no history)\n');
    process.stdout.write(`\n=== ${styleContext.length} chars ===\n`);
    process.exit(0);
  }

  // Race models for translation
  const { text: translated, model: winnerModel } = await callGemini(input, styleContext);

  if (!sendTarget) {
    // Fallback: no agent detected — dump to stdout
    process.stderr.write('[humanize-output] could not detect agent, printing to stdout\n');
    process.stdout.write(translated + '\n');
    return;
  }

  // Send translated message to Telegram
  const plainSent = await deliverMessage(sendTarget, translated);

  const elapsed  = ((Date.now() - startMs) / 1000).toFixed(1);
  const charInfo = plainSent.length;
  if (VERBOSE_STDOUT) {
    process.stdout.write(translated + '\n');
  } else {
    process.stdout.write(`✅ sent via ${sendTarget.agent} bot (${elapsed}s, ${charInfo}chars) [${winnerModel}]\n`);
  }

  // Inject context back so GPT knows what was sent this turn
  await injectContext(sendTarget.sessionKey, plainSent);
}

main().catch(err => {
  process.stderr.write(`[humanize-output] fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
