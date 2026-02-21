---
name: ai-html-card
description: 把任意文本通过 AI 生成精美手机竖屏 HTML 卡片，Puppeteer 渲染成 PNG。支持可选的"人话翻译"前置步骤。
---

# ai-html-card Skill

## 用途

- 输入：任意文本（stdin）
- 输出：PNG 图片路径（stdout）
- 可选：先经过"人话翻译"步骤，再生成卡片

## 脚本

| 脚本 | 功能 |
|------|------|
| `scripts/card.js` | 文本 → AI 生成 HTML → Puppeteer 渲染 → PNG |
| `scripts/humanize.js` | 文本 → AI 口语化翻译 → 纯文本 |
| `scripts/pipeline.js` | 完整流水线：humanize → card → PNG |
| `scripts/render.js` | Puppeteer 渲染器（HTML 文件 → PNG） |

## 调用示例

```bash
# 直接生成卡片
echo "内容" | node scripts/card.js

# 完整流水线（先翻译再出图）
printf '%s' "技术摘要" | node scripts/pipeline.js

# 只翻译
printf '%s' "内容" | node scripts/humanize.js
```

## 必需环境变量

```bash
export OPENAI_API_KEY="your-key"
export OPENAI_API_BASE="https://api.openai.com/v1"
export OPENAI_MODEL="gpt-4o-mini"   # 可选
```

## 渲染方案选择

本 skill 使用 **方案 A（Puppeteer + Chromium）**，CSS 支持完整，适合复杂卡片。

如果环境无法安装 Chromium，可考虑 **方案 C（纯 Node.js 渲染）**：
- 替换 `render.js` 为基于 `@resvg/resvg-js` 或 `node-html-to-image` 的实现
- 优点：无需 Chromium，启动瞬间
- 缺点：CSS 支持不完整，复杂卡片可能渲染异常（渐变、box-shadow 等）

**推荐：** 有 Chromium 环境用方案 A；轻量部署或 serverless 用方案 C。

## 字体安装（中文必需）

如果卡片内容包含中文，**必须**安装 Noto Sans CJK 字体，否则中文显示为方块：

```bash
# Debian / Ubuntu（推荐）
apt-get install -y fonts-noto-cjk

# Arch Linux
pacman -S noto-fonts-cjk

# macOS
brew install --cask font-noto-sans-cjk

# 验证
fc-list | grep -i "Noto Sans CJK"
```

安装后无需重启，Puppeteer 下次渲染时自动使用。

## 自定义 Prompt

prompt 文件在 `prompts/` 目录，可直接编辑或通过环境变量覆盖：

```bash
export CARD_PROMPT_FILE="/path/to/custom-card.txt"
export HUMANIZE_PROMPT_FILE="/path/to/custom-humanize.txt"
```

## 依赖安装

```bash
npm install puppeteer
# puppeteer 会自动下载 Chromium（~170MB）
```

Node.js 18+ 必需（使用原生 fetch 和 ES modules top-level await）。
