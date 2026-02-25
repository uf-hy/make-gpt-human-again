#!/usr/bin/env node
/**
 * humanize.js — Rewrite any text in a custom AI persona voice
 *
 * Reads raw text from stdin, sends it to one or more AI models concurrently
 * (fastest response wins), and writes the rewritten output to stdout.
 *
 * stdin:  any text (GPT output, technical summary, AI response, etc.)
 * stdout: persona-styled plain text
 *
 * Required env vars:
 *   OPENAI_API_KEY    API key for your OpenAI-compatible endpoint
 *   OPENAI_API_BASE   Base URL  (e.g. https://api.openai.com/v1)
 *
 * Optional env vars:
 *   OPENAI_MODEL              Primary model, comma-separated for racing
 *                             (default: gemini-2.0-flash)
 *   HUMANIZE_FALLBACK_MODELS  Fallback models, comma-separated (tried in order)
 *   HUMANIZE_PROMPT_FILE      Path to system prompt .txt file
 *                             (default: ../prompts/humanize.txt)
 *   HUMANIZE_TIMEOUT_MS       Per-model timeout in ms (default: 60000)
 *   HUMANIZE_TEMPERATURE      Sampling temperature (default: 0.5)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY  = (process.env.OPENAI_API_KEY  || '').trim();
const API_BASE = (process.env.OPENAI_API_BASE || '').trim();

if (!API_KEY || !API_BASE) {
  process.stderr.write(
    'Error: OPENAI_API_KEY and OPENAI_API_BASE must be set.\n' +
    'Copy .env.example to .env and fill in your values.\n'
  );
  process.exit(1);
}

const PRIMARY_MODELS = (process.env.OPENAI_MODEL || 'gemini-2.0-flash')
  .split(',').map(s => s.trim()).filter(Boolean);

const FALLBACK_MODELS = (process.env.HUMANIZE_FALLBACK_MODELS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const TIMEOUT_MS  = parseInt(process.env.HUMANIZE_TIMEOUT_MS  || '60000', 10);
const TEMPERATURE = parseFloat(process.env.HUMANIZE_TEMPERATURE || '0.5');

// ─── System prompt ────────────────────────────────────────────────────────────

const PROMPT_FILE = process.env.HUMANIZE_PROMPT_FILE
  ?? path.join(__dirname, '../prompts/humanize.txt');

let SYSTEM_PROMPT = '';
try {
  SYSTEM_PROMPT = fs.readFileSync(PROMPT_FILE, 'utf8').trim();
} catch {
  process.stderr.write(`Warning: could not read prompt file: ${PROMPT_FILE}\n`);
  SYSTEM_PROMPT = 'Rewrite the following text in plain, friendly language.';
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Call one model with a timeout. Returns the model's text output.
 */
async function callModel(model, input) {
  const ac    = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: input },
        ],
        temperature: TEMPERATURE,
        max_tokens: 8192,
      }),
      signal: ac.signal,
    });

    const text = await resp.text();
    if (!resp.ok) {
      let msg = text;
      try { msg = JSON.parse(text)?.error?.message || text; } catch {}
      throw new Error(`HTTP ${resp.status}: ${msg}`);
    }

    const json = JSON.parse(text);
    const out  = json?.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error('Empty response from model');
    return out;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Race PRIMARY_MODELS concurrently (fastest wins).
 * Falls back to FALLBACK_MODELS in sequence if all primaries fail.
 */
async function translate(input) {
  // Race primaries
  if (PRIMARY_MODELS.length > 0) {
    const toWin = m => callModel(m, input).then(text => ({ text, model: m }));
    try {
      return await Promise.any(PRIMARY_MODELS.map(toWin));
    } catch {}
  }

  // Fallbacks in order
  for (const m of FALLBACK_MODELS) {
    try {
      const text = await callModel(m, input);
      return { text, model: `${m} (fallback)` };
    } catch (err) {
      const msg = err?.name === 'AbortError' ? 'timeout' : String(err?.message ?? err);
      process.stderr.write(`[humanize] fallback ${m} failed: ${msg}\n`);
    }
  }

  throw new Error('All models failed. Check your API key and network.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data',  c => { data += c; });
    process.stdin.on('end',   () => resolve(data.trim()));
    process.stdin.on('error', reject);
  });
}

const input = await readStdin();
if (!input) {
  process.stderr.write('[humanize] no input on stdin\n');
  process.exit(1);
}

try {
  const { text, model } = await translate(input);
  process.stdout.write(text + '\n');
  process.stderr.write(`[humanize] done (model: ${model})\n`);
} catch (err) {
  process.stderr.write(`[humanize] error: ${err.message}\n`);
  process.exit(1);
}
