#!/usr/bin/env node
/**
 * humanize.js — Text → AI "humanized" explanation (plain text)
 *
 * stdin:  any text (technical summary, AI output, etc.)
 * stdout: humanized plain text
 *
 * Env vars (required):
 *   OPENAI_API_KEY    API key
 *   OPENAI_API_BASE   API base URL (OpenAI-compatible)
 *   OPENAI_MODEL      Model name (default: gemini-2.0-flash)
 *
 * Env vars (optional):
 *   HUMANIZE_PROMPT_FILE  Path to custom system prompt .txt file
 *                         (default: ../prompts/humanize.txt)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = process.env.OPENAI_API_BASE;
const MODEL = process.env.OPENAI_MODEL ?? 'gemini-2.0-flash';

if (!API_KEY || !API_BASE) {
  console.error('Error: OPENAI_API_KEY and OPENAI_API_BASE must be set.');
  process.exit(1);
}

const PROMPT_FILE =
  process.env.HUMANIZE_PROMPT_FILE ??
  path.join(__dirname, '../prompts/humanize.txt');

const SYSTEM_PROMPT = fs.readFileSync(PROMPT_FILE, 'utf8').trim();

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => (data += c));
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', reject);
  });
}

const input = await readStdin();
if (!input) { console.error('No input'); process.exit(1); }

const res = await fetch(`${API_BASE}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: input },
    ],
    max_tokens: 8192,
  }),
});

if (!res.ok) {
  console.error(`API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const json = await res.json();
process.stdout.write(json.choices[0].message.content.trim() + '\n');
