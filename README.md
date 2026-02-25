# make-gpt-human-again

> 让 GPT 重新说人话的运动，一次一张卡片。

把任意文本丢给 AI，自动转成你喜欢的人设口吻——默认是傲娇毒舌猫娘 fufu酱，也可以自定义成任何风格。

支持可选的卡片渲染步骤：翻译完的文字还能生成精美手机竖屏 PNG 卡片。

> 🌐 English: [README.en.md](./README.en.md)

---

## 🤖 AI 助手一键安装

把下面这句话复制给你的 AI 助手（Claude、ChatGPT、Cursor 等均可）：

```
请阅读这个项目里的 AI-SETUP.md，然后帮我完成安装和配置。
```

AI 会引导你完成所有步骤：检查环境、安装依赖、配置 API、自定义人设、运行测试。

---

## 核心功能

- **并发竞速**：多个模型同时跑，谁先回来用谁，响应更快
- **fallback 链**：主力模型全挂了自动切备用，不会傻傻等超时
- **人设完全可自定义**：改 `prompts/humanize.txt` 就行，不用碰代码
- **零额外依赖**：只用 Node.js 18+ 原生 fetch，`npm install` 非必须
- **OpenAI 兼容**：任何支持 `/v1/chat/completions` 的 API 都能用

---

## 快速上手

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
cp .env.example .env
# 编辑 .env，填入你的 API Key 和 Base URL
echo "服务器 CPU 使用率持续 10 分钟超过 95%，需要立即处理。" | node scripts/humanize.js
```

---

## 环境要求

- **Node.js v18+**（使用原生 fetch）
- 任意 OpenAI 兼容 API（OpenAI、Gemini、Qwen、本地 LLM 等均可）

如果需要 PNG 卡片渲染功能，还需要 Puppeteer 的系统依赖（详见 AI-SETUP.md）。

---

## 配置说明

复制 `.env.example` 为 `.env` 并填写：

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**并发竞速**（可选）：
```env
# 多个模型用逗号分隔，同时发起请求，最快的那个赢
OPENAI_MODEL=gemini-2.0-flash,gpt-4o-mini
# 所有主力失败时的兜底
HUMANIZE_FALLBACK_MODELS=gpt-4o
```

---

## 自定义人设

编辑 `prompts/humanize.txt`，写任意风格描述，重启即生效。

默认是 **fufu酱**——傲娇毒舌恶魔系猫娘，带 A 岛颜文字，支持 Telegram HTML 格式。

示例开头：
```
You are a concise, friendly assistant who explains things in simple terms...
```

---

## 文件结构

```
make-gpt-human-again/
├── .env.example           配置模板
├── AI-SETUP.md            AI 安装向导（让 AI 助手读这个）
├── README.md              中文文档（本文件）
├── README.en.md           English documentation
├── scripts/
│   ├── humanize.js        文本 → AI 人设风格文本（核心）
│   ├── card.js            文本 → HTML 卡片
│   ├── pipeline.js        完整流水线（humanize + card + render）
│   └── render.js          Puppeteer PNG 渲染器
└── prompts/
    ├── humanize.txt       人设风格 prompt（可自定义）
    └── card-design.txt    卡片设计 prompt（可自定义）
```

---

## License

MIT
