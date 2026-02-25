# make-gpt-human-again

> Make GPT sound human again.

Feed GPT output in, get it rewritten in any persona you want — the default is a sassy tsundere catgirl.

Supports concurrent model racing (multiple models run in parallel, fastest wins), automatic fallback, customizable personas, and optional auto-delivery to Telegram via OpenClaw.

> 🇨🇳 中文文档：[README.md](./README.md)

---

## 🤖 AI-Assisted Setup

**Tell your AI assistant:**

```
Help me install this project: https://github.com/uf-hy/make-gpt-human-again
Read the setup guide first: https://raw.githubusercontent.com/uf-hy/make-gpt-human-again/main/AI-SETUP.md
```

**Or do it yourself:**

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
cp .env.example .env
# Edit .env with your API key and base URL
echo "Server CPU has been above 95% for 10 minutes." | node scripts/humanize.js
```

---

## Features

### 🎭 Persona Translation (humanize.js)
Rewrites any text in a custom persona voice, outputs to stdout.

```bash
echo "Disk usage at 92%, recommend clearing logs" | node scripts/humanize.js
```

- **Concurrent racing** — multiple models run in parallel, fastest wins
- **Fallback chain** — automatic sequential fallback if all primaries fail
- **Zero dependencies** — Node.js 18+ only (native fetch)
- **OpenAI-compatible** — any `/v1/chat/completions` endpoint works
- **Custom persona** — edit `prompts/style.txt`, no code changes

### 📱 OpenClaw Integration (optional)
When used as an [OpenClaw](https://github.com/openclaw/openclaw) skill:
- Auto-detect which Agent triggered the call
- Auto-deliver translated text to Telegram via the correct Bot
- Bidirectional context: inject `[CONTEXT_REF]` back into the session
- Interleaved conversation context for tone consistency

> See [SKILL.md](./SKILL.md) for OpenClaw integration details.

---

## Configuration

Copy `.env.example` to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_BASE=https://api.openai.com/v1

# Primary model (default: gemini-3-flash)
HUMANIZE_PRIMARY_MODELS=gemini-3-flash

# Fallback (default: gemini-2.5-flash)
HUMANIZE_FALLBACK_MODELS=gemini-2.5-flash

# Optional: concurrent racing (comma-separated, fastest wins)
# HUMANIZE_PRIMARY_MODELS=gemini-3-flash,gemini-2.5-flash
# HUMANIZE_FALLBACK_MODELS=minimax-m2.5
```

---

## Custom Persona

Edit `prompts/style.txt` with any style. Default is a **tsundere catgirl** (kaomoji + Telegram HTML).

---

## License

MIT
