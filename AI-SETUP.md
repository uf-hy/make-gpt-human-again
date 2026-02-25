# AI-SETUP.md — make-gpt-human-again Setup Guide

> **Language rule:** Match the user's language. If they write in Chinese, respond in Chinese. If English, respond in English.
>
> This file is for AI assistants. Follow the steps below to guide the user through installation and configuration.

---

## Your Task

Help the user set up **make-gpt-human-again** — a tool that rewrites any text in a custom AI persona voice, then optionally renders it as a beautiful mobile card image.

Walk through these steps in order. Ask before assuming.

---

## Step 1 — Check Prerequisites

Run the following and show the user the output:

```bash
node --version
npm --version
```

Required: **Node.js v18+**. If below, help them upgrade.

---

## Step 2 — Install Dependencies

```bash
npm install
```

If they want the card rendering feature (PNG output), they also need Puppeteer's system dependencies. On Debian/Ubuntu:

```bash
npx puppeteer browsers install chrome
# or if on a headless server:
apt-get install -y chromium-browser
```

They can skip this if they only want the `humanize` text transformation step.

---

## Step 3 — Configure .env

Copy the example and fill it in:

```bash
cp .env.example .env
```

Open `.env` and ask the user to fill in:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | API key for their AI provider |
| `OPENAI_API_BASE` | Base URL (e.g. `https://api.openai.com/v1`, or any OpenAI-compatible endpoint) |
| `OPENAI_MODEL` | Model to use (e.g. `gpt-4o-mini`, `gemini-2.0-flash`) |

Optional but recommended:
- `HUMANIZE_FALLBACK_MODELS` — comma-separated fallback models if the primary fails

---

## Step 4 — Customize the Persona (Optional)

The AI persona lives in `prompts/humanize.txt`. The default is **fufu酱** — a tsundere catgirl assistant.

Ask the user: **"Do you want to keep the default fufu酱 persona, or customize it?"**

- **Keep default** → nothing to do, proceed
- **Customize** → open `prompts/humanize.txt` and edit it. They can describe any persona they want. The file is plain text — no special syntax needed.

Key things to tell the persona:
1. How to address the user
2. Tone and personality
3. Output format rules (the default includes Telegram HTML formatting rules)

---

## Step 5 — Test

Run a quick test:

```bash
echo "The server CPU usage is at 95% for the past 10 minutes." | node scripts/humanize.js
```

Expected: the text comes back rewritten in the persona's voice (fufu酱 style by default).

If it works, the setup is complete.

---

## Step 6 — Card Rendering (Optional)

If the user wants PNG card output:

```bash
echo "Your text here" | node scripts/pipeline.js
```

This will:
1. Humanize the text (via `humanize.js`)
2. Generate an HTML card layout (via `card.js`)
3. Render it to a PNG image (via `render.js`)

---

## Troubleshooting

**"OPENAI_API_KEY and OPENAI_API_BASE must be set"**
→ Check `.env` exists and has correct values. No quotes needed around values.

**Model timeout**
→ Increase `HUMANIZE_TIMEOUT_MS` in `.env` (default is 60 seconds).
→ Or set a faster model in `OPENAI_MODEL`.

**Font rendering issues in cards**
→ Install CJK fonts: `apt-get install -y fonts-noto-cjk`

---

## That's it!

After setup, the user can pipe any text through `humanize.js` to get it rewritten in their configured persona. The output goes to stdout, so it composes easily with other tools.
