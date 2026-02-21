#!/usr/bin/env node
/**
 * pipeline.js — Full pipeline: text → humanize → card → PNG
 *
 * stdin:  any text
 * stdout: PNG file path
 *
 * This is a convenience wrapper that chains humanize.js → card.js.
 * All env vars from both scripts apply here.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HUMANIZE_JS = path.join(__dirname, 'humanize.js');
const CARD_JS     = path.join(__dirname, 'card.js');

// Read stdin
let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;
input = input.trim();

if (!input) { console.error('No input'); process.exit(1); }

// Step 1: humanize
const step1 = spawnSync(
  process.execPath,
  [HUMANIZE_JS],
  { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], env: process.env }
);
if (step1.status !== 0) process.exit(1);

// Step 2: card
const step2 = spawnSync(
  process.execPath,
  [CARD_JS],
  { input: step1.stdout, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], env: process.env }
);
if (step2.status !== 0) process.exit(1);

process.stdout.write(step2.stdout);
