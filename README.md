# make-gpt-human-again

> 让 GPT 重新说人话。

把 GPT 的输出丢进来，自动用你喜欢的人设风格重新表达——默认是傲娇毒舌猫娘 fufu酱。

支持并发竞速（多模型同时跑，最快的赢）、自动 fallback、自定义人设，以及通过 OpenClaw 自动发送到 Telegram。

> 🌐 English: [README.en.md](./README.en.md)

---

## 🤖 让 AI 帮你安装

**给 AI 助手说这句话：**

```
帮我安装并配置这个项目：https://github.com/uf-hy/make-gpt-human-again
请先读一下项目的 AI-SETUP.md：https://raw.githubusercontent.com/uf-hy/make-gpt-human-again/main/AI-SETUP.md
```

**或者直接给人类看的版本：**

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
cp .env.example .env
# 编辑 .env，填入 API Key 和 Base URL
echo "服务器 CPU 超过 95% 了" | node scripts/humanize.js
```

---

## 核心功能

### 🎭 人设翻译（humanize.js）
把任意文本用指定人设风格重新表达，输出到 stdout。

```bash
echo "磁盘使用率 92%，建议清理日志" | node scripts/humanize.js
# 输出：笨蛋主人，你的硬盘快要撑爆了喵！92% 了你不清理日志是等着它自爆吗？...
```

**特性：**
- **并发竞速**：多个模型同时跑，谁先回来用谁
- **fallback 链**：主力全挂自动切备用
- **零额外依赖**：只需 Node.js 18+（原生 fetch）
- **OpenAI 兼容**：任何 `/v1/chat/completions` 接口都能用
- **人设可自定义**：改 `prompts/style.txt`，不用碰代码

### 📱 OpenClaw 集成（可选）
如果你使用 [OpenClaw](https://github.com/openclaw/openclaw)，humanize-output skill 版本额外支持：
- **自动检测调用来源**：识别是哪个 Agent 触发的
- **自动发送到 Telegram**：翻译完直接通过对应 Bot 发送
- **双向上下文**：注入 `[CONTEXT_REF]` 回 session，GPT 知道自己说了什么
- **交替对话上下文**：读取最近几轮对话，保持语气连贯

> OpenClaw 集成版本见 [SKILL.md](./SKILL.md)

---

## 配置

复制 `.env.example` 为 `.env`：

```env
# 必填
OPENAI_API_KEY=sk-your-key-here
OPENAI_API_BASE=https://api.openai.com/v1

# 主力模型（默认 gemini-3-flash）
HUMANIZE_PRIMARY_MODELS=gemini-3-flash

# 兜底模型（默认 gemini-2.5-flash）
HUMANIZE_FALLBACK_MODELS=gemini-2.5-flash

# 可选：并发竞速（逗号分隔，同时跑，最快赢）
# HUMANIZE_PRIMARY_MODELS=gemini-3-flash,gemini-2.5-flash
# HUMANIZE_FALLBACK_MODELS=minimax-m2.5
```

---

## 自定义人设

编辑 `prompts/style.txt`，写任何你想要的风格。默认是 **fufu酱**（傲娇猫娘 + A 岛颜文字 + Telegram HTML）。

改完直接生效，不用碰代码。

---

## 文件结构

```
make-gpt-human-again/
├── .env.example           配置模板
├── AI-SETUP.md            AI 安装向导
├── SKILL.md               OpenClaw Skill 说明
├── scripts/
│   └── humanize.js        核心：文本 → 人设风格文本
└── prompts/
    └── style.txt       人设风格 prompt（可自定义）
```

---

## License

MIT
