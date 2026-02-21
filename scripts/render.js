#!/usr/bin/env node
/**
 * render.js — Puppeteer HTML → PNG renderer
 *
 * Usage: node render.js <html-file> <output-png>
 *
 * Env vars:
 *   CARD_DPR      Device pixel ratio (default: 2)
 *   CARD_WIDTH    Viewport width in CSS px (default: 390)
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DPR = Number(process.env.CARD_DPR ?? 2);
const WIDTH = Number(process.env.CARD_WIDTH ?? 390);

const [, , htmlFile, outFile] = process.argv;
if (!htmlFile || !outFile) {
  console.error('Usage: node render.js <html-file> <output-png>');
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 1200, deviceScaleFactor: DPR });
  await page.goto(`file://${path.resolve(htmlFile)}`, { waitUntil: 'networkidle0' });

  const card = await page.$('#card');
  if (!card) throw new Error('No #card element found in HTML');

  await card.screenshot({ path: outFile, type: 'png' });
  console.log(outFile);
} finally {
  await browser.close();
}
