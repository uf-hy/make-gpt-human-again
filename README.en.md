# make-gpt-human-again

> The movement to restore GPT's humanity. One card at a time.

Feed any text to an AI and get it rewritten in a custom persona voice — the default is **fufu酱**, a sassy tsundere catgirl, but you can configure any style you like.

Optionally renders the result as a beautiful mobile portrait PNG card.

> 🇨🇳 中文文档：[README.md](./README.md)

---

## 🤖 AI-Assisted Setup

Copy this to your AI assistant (Claude, ChatGPT, Cursor, etc.):

```
Please read AI-SETUP.md in this project and help me install and configure it.
```

The AI will walk you through environment setup, dependency installation, API configuration, persona customization, and testing.

---

## Features

- **Concurrent model racing** — multiple models run in parallel, fastest wins
- **Automatic fallback chain** — if all primaries fail, tries fallbacks in order
- **Fully customizable persona** — edit `prompts/humanize.txt`, no code changes needed
- **Zero extra dependencies** — uses Node.js 18+ native fetch only
- **OpenAI-compatible** — works with any `/v1/chat/completions` endpoint

---

## Quick Start

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
cp .env.example .env
# Edit .env with your API key and base URL
echo "Server CPU has been above 95% for 10 minutes." | node scripts/humanize.js
```

---

## Requirements

- **Node.js v18+** (uses native fetch)
- Any OpenAI-compatible API (OpenAI, Gemini, Qwen, local LLMs, etc.)

Card rendering requires Puppeteer system dependencies (see AI-SETUP.md).

---

## Configuration

Copy `.env.example` to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**Concurrent racing** (optional):
```env
# Multiple models, comma-separated — run in parallel, fastest wins
OPENAI_MODEL=gemini-2.0-flash,gpt-4o-mini
# Fallback if all primaries fail
HUMANIZE_FALLBACK_MODELS=gpt-4o
```

---

## Custom Persona

Edit `prompts/humanize.txt` with any style description. Restart to apply.

The default is **fufu酱** — a tsundere devil-type catgirl with A-board kaomoji and Telegram HTML formatting rules.

---

## File Structure

```
make-gpt-human-again/
├── .env.example           Configuration template
├── AI-SETUP.md            AI setup guide
├── README.md              中文文档
├── README.en.md           English documentation (this file)
├── scripts/
│   ├── humanize.js        Text → AI persona text (core)
│   ├── card.js            Text → HTML card
│   ├── pipeline.js        Full pipeline (humanize + card + render)
│   └── render.js          Puppeteer PNG renderer
└── prompts/
    ├── humanize.txt       Persona style prompt (customizable)
    └── card-design.txt    Card design prompt (customizable)
```

---

## License

MIT
