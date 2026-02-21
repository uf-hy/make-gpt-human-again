#!/usr/bin/env node
/**
 * card.js — Text → AI-generated HTML card → PNG
 *
 * stdin:  any text
 * stdout: PNG file path
 *
 * Env vars (required):
 *   OPENAI_API_KEY    API key
 *   OPENAI_API_BASE   API base URL (OpenAI-compatible)
 *   OPENAI_MODEL      Model name (default: gemini-2.0-flash)
 *
 * Env vars (optional):
 *   CARD_PROMPT_FILE  Path to custom system prompt .txt file
 *                     (default: ../prompts/card-design.txt)
 *   CARD_DPR          Device pixel ratio (default: 2)
 *   CARD_WIDTH        Card width in CSS px (default: 390)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = process.env.OPENAI_API_BASE;
const MODEL = process.env.OPENAI_MODEL ?? 'gemini-2.0-flash';

if (!API_KEY || !API_BASE) {
  console.error('Error: OPENAI_API_KEY and OPENAI_API_BASE must be set.');
  process.exit(1);
}

const PROMPT_FILE =
  process.env.CARD_PROMPT_FILE ??
  path.join(__dirname, '../prompts/card-design.txt');

const SYSTEM_PROMPT = fs.readFileSync(PROMPT_FILE, 'utf8').trim();

const RENDER_JS = path.join(__dirname, 'render.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => (data += c));
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', reject);
  });
}

async function callAI(userContent) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

function cleanHTML(raw) {
  return raw
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const input = await readStdin();
if (!input) { console.error('No input'); process.exit(1); }

const html = cleanHTML(await callAI(input));

// Write HTML to temp file
const tmpHtml = path.join(os.tmpdir(), `ai-card-${Date.now()}.html`);
const tmpPng  = path.join(os.tmpdir(), `ai-card-${Date.now()}.png`);
fs.writeFileSync(tmpHtml, html, 'utf8');

// Render
const result = spawnSync(
  process.execPath,
  [RENDER_JS, tmpHtml, tmpPng],
  { stdio: ['ignore', 'pipe', 'pipe'], env: process.env }
);

fs.unlinkSync(tmpHtml);

if (result.status !== 0) {
  console.error(result.stderr.toString());
  process.exit(1);
}

console.log(tmpPng);
