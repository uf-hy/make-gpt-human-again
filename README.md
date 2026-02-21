# ai-html-card

> 🇨🇳 中文文档：[README.zh.md](./README.zh.md)

## 🤖 AI-Assisted Setup

Copy this to your AI assistant (Claude, ChatGPT, Cursor, etc.):

```
Please read AI-SETUP.md in this project and help me install and configure it.
```

The AI will guide you through environment checks, dependency installation, and API configuration interactively.

---

把任意文本通过 AI 生成精美的手机竖屏 HTML 卡片，用 Puppeteer 渲染成 PNG 图片。

支持可选的"人话翻译"步骤：先让 AI 把技术摘要翻译成口语化解释，再生成卡片。

## 效果

- 深色苹果/魅族发布会风格
- 390px 手机竖屏，2x 高清渲染
- 圆角卡片，充足留白，高级感
- 支持中文（需安装 Noto Sans CJK 字体，见下方）

## 快速开始

### 1. 安装依赖

```bash
npm install puppeteer
```

> **中文字体（重要）**
> 如果内容包含中文，必须安装 Noto Sans CJK 字体，否则中文会显示为方块：
>
> ```bash
> # Debian / Ubuntu
> apt-get install -y fonts-noto-cjk
>
> # Arch Linux
> pacman -S noto-fonts-cjk
>
> # macOS (Homebrew)
> brew install --cask font-noto-sans-cjk
>
> # 验证安装
> fc-list | grep -i "Noto Sans CJK"
> ```

### 2. 配置环境变量

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_API_BASE="https://api.openai.com/v1"   # 或任何 OpenAI 兼容接口
export OPENAI_MODEL="gpt-4o-mini"                    # 可选，默认 gemini-2.0-flash
```

### 3. 使用

```bash
# 直接生成卡片（文本 → HTML → PNG）
echo "你的内容" | node scripts/card.js
# 输出：/tmp/ai-card-xxx.png

# 先翻译成口语，再生成卡片（完整流水线）
echo "技术摘要" | node scripts/pipeline.js

# 只做人话翻译（纯文本输出）
echo "技术摘要" | node scripts/humanize.js
```

## 自定义 Prompt

默认 prompt 在 `prompts/` 目录下，可以直接编辑，也可以通过环境变量指定自定义文件：

```bash
# 自定义卡片设计 prompt
export CARD_PROMPT_FILE="/path/to/my-card-prompt.txt"

# 自定义人话翻译 prompt
export HUMANIZE_PROMPT_FILE="/path/to/my-humanize-prompt.txt"
```

## 环境变量一览

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `OPENAI_API_KEY` | ✅ | — | API 密钥 |
| `OPENAI_API_BASE` | ✅ | — | API 基础 URL（OpenAI 兼容） |
| `OPENAI_MODEL` | ❌ | `gemini-2.0-flash` | 模型名称 |
| `CARD_PROMPT_FILE` | ❌ | `prompts/card-design.txt` | 卡片设计 prompt 文件路径 |
| `HUMANIZE_PROMPT_FILE` | ❌ | `prompts/humanize.txt` | 人话翻译 prompt 文件路径 |
| `CARD_DPR` | ❌ | `2` | 渲染倍率（2=780px 实际宽度） |
| `CARD_WIDTH` | ❌ | `390` | 卡片 CSS 宽度（px） |

## 文件结构

```
ai-html-card/
├── scripts/
│   ├── card.js        # 文本 → HTML → PNG
│   ├── humanize.js    # 文本 → 口语化文本
│   ├── pipeline.js    # 完整流水线（humanize → card）
│   └── render.js      # Puppeteer 渲染器
├── prompts/
│   ├── card-design.txt    # 卡片设计 prompt（可自定义）
│   └── humanize.txt       # 人话翻译 prompt（可自定义）
└── README.md
```

## 依赖

- Node.js 18+（需要原生 `fetch` 和 ES modules）
- `puppeteer`（npm install）
- Chromium（puppeteer 自动下载，或系统已安装）
- 中文字体：`fonts-noto-cjk`（可选，中文内容必需）

## License

MIT
