# make-gpt-human-again

> The movement to restore GPT's humanity. One card at a time.

Turn any text into a beautiful mobile card image using AI — powered by Puppeteer.

Supports an optional "humanize" step: let AI translate a technical summary into plain language first, then render it as a card.

> 🇨🇳 中文文档：[README.zh.md](./README.zh.md)

---

## 🤖 AI-Assisted Setup

Copy this to your AI assistant (Claude, ChatGPT, Cursor, etc.):

```
Please read AI-SETUP.md in this project and help me install and configure it.
```

The AI will guide you through environment checks, dependency installation, and API configuration interactively.

---

## Features

- Dark Apple/Meizu keynote style
- 390px mobile portrait, 2x HiDPI rendering
- Rounded cards, generous whitespace, premium feel
- CJK font support (requires `fonts-noto-cjk`, see below)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

> **CJK fonts (important)**
> If your content includes Chinese/Japanese/Korean text, install Noto Sans CJK, otherwise text renders as boxes:
>
> ```bash
> # Debian / Ubuntu
> apt-get install -y fonts-noto-cjk
>
> # Arch Linux
> pacman -S noto-fonts-cjk
>
> # macOS
> brew install --cask font-noto-sans-cjk
>
> # Verify
> fc-list | grep -i "Noto Sans CJK"
> ```

### 2. Configure environment

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_API_BASE="https://api.openai.com/v1"   # or any OpenAI-compatible endpoint
export OPENAI_MODEL="gpt-4o"                          # optional
```

### 3. Use

```bash
# Generate a card (text → HTML → PNG)
echo "Your content here" | node scripts/card.js
# Output: /tmp/ai-card-xxx.png

# Full pipeline: humanize first, then generate card
echo "Technical summary" | node scripts/pipeline.js

# Humanize only (plain text output)
echo "Technical summary" | node scripts/humanize.js
```

## Custom Prompts

Default prompts are in the `prompts/` directory. Edit them directly, or point to a custom file via env vars:

```bash
export CARD_PROMPT_FILE="/path/to/my-card-prompt.txt"
export HUMANIZE_PROMPT_FILE="/path/to/my-humanize-prompt.txt"
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | — | API key |
| `OPENAI_API_BASE` | ✅ | — | API base URL (OpenAI-compatible) |
| `OPENAI_MODEL` | ❌ | `gemini-2.5-flash` | Model name |
| `CARD_PROMPT_FILE` | ❌ | `prompts/card-design.txt` | Card design prompt path |
| `HUMANIZE_PROMPT_FILE` | ❌ | `prompts/humanize.txt` | Humanize prompt path |
| `CARD_DPR` | ❌ | `2` | Device pixel ratio (2 = 780px actual width) |
| `CARD_WIDTH` | ❌ | `390` | Card CSS width (px) |

## File Structure

```
make-gpt-human-again/
├── AI-SETUP.md        ← AI-readable setup guide
├── README.md          ← English docs (this file)
├── README.zh.md       ← Chinese docs
├── scripts/
│   ├── card.js        # text → HTML → PNG
│   ├── humanize.js    # text → plain language
│   ├── pipeline.js    # full pipeline (humanize → card)
│   └── render.js      # Puppeteer renderer
├── prompts/
│   ├── card-design.txt    # card design prompt (customizable)
│   └── humanize.txt       # humanize prompt (customizable)
└── package.json
```

## Requirements

- Node.js 18+ (native `fetch` + ES modules)
- `puppeteer` (auto-downloads Chromium)
- CJK fonts: `fonts-noto-cjk` (optional, required for CJK text)

## License

MIT
