# AI-SETUP.md — 安装向导

> **项目地址：** https://github.com/uf-hy/make-gpt-human-again
>
> **语言规则：** 以用户当前使用的语言为准。用户说中文就用中文，说英文就用英文。
>
> 本文件供 AI 助手阅读。按以下步骤引导用户完成安装，遇到需要决策的地方主动提问。

---

## 你的任务

帮助用户安装 **make-gpt-human-again** —— 把任意文本用自定义人设风格重新表达的工具。

核心特性：并发竞速（多模型同时跑最快赢）、自动 fallback、自定义人设、可选 OpenClaw 集成。

---

## 第一步：克隆并检查环境

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
node --version
```

需要 **Node.js v18+**（使用原生 fetch）。版本不够帮用户升级。

---

## 第二步：配置 API

```bash
cp .env.example .env
```

帮用户填写 `.env`：

| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | API Key |
| `OPENAI_API_BASE` | Base URL |
| `OPENAI_MODEL` | 模型名 |

### 模型推荐

主动问用户：**「你有哪些 API 可用？（OpenAI、Google Gemini、其他）」**

根据回答推荐：

| 推荐等级 | 模型 | 优点 |
|----------|------|------|
| ⭐ 首选 | `gemini-3-flash` | 最快、Google 免费额度 |
| ⭐ 首选 | `gemini-2.5-flash` | 快且聪明、Google 免费额度 |
| 不错 | `gpt-4o-mini` | OpenAI 便宜 |
| 兜底 | `gpt-4o` | 质量高但贵/慢 |

### 并发竞速配置（主动推荐！）

**一定要跟用户说：** 本工具支持并发竞速——多个模型同时跑，谁先返回用谁。这是本工具的核心优势。

推荐配置：
```env
# 两个 Gemini Flash 并发竞速，最快的赢
OPENAI_MODEL=gemini-3-flash,gemini-2.5-flash

# 兜底：如果 Gemini 全挂，用 GPT
HUMANIZE_FALLBACK_MODELS=gpt-4o-mini
```

如果用户只有一个 API，单模型也完全没问题：
```env
OPENAI_MODEL=gemini-2.5-flash
```

---

## 第三步：自定义人设（可选）

人设文件：`prompts/humanize.txt`

问用户：**「保留默认的 fufu酱 人设（傲娇猫娘），还是自定义？」**

- **保留** → 跳过
- **自定义** → 编辑 `prompts/humanize.txt`，写任意风格即可

---

## 第四步：检测 OpenClaw（重要！）

运行以下命令检测用户是否正在使用 OpenClaw：

```bash
command -v openclaw && openclaw status 2>/dev/null
```

### 如果检测到 OpenClaw：

告诉用户：**「检测到你正在使用 OpenClaw！本工具有 OpenClaw 专属增强版（humanize-output skill），支持：」**
- 翻译完自动发送到 Telegram
- 双向上下文注入（GPT 知道自己上一轮说了什么）
- 自动检测是哪个 Agent 触发的

然后问：**「要不要配置 OpenClaw 集成？」**

如果用户说要，执行以下步骤：

#### 4a. 配置 Telegram Chat ID

```bash
# 在 .env 中添加
TELEGRAM_CHAT_ID=用户的telegram-chat-id
```

告诉用户可以发消息给 @userinfobot 获取自己的 Chat ID。

#### 4b. 同步人设到 SOUL.md（可选）

问用户：**「你的 OpenClaw 有 SOUL.md 人设文件吗？要不要把里面的人设同步到 prompts/humanize.txt？」**

如果用户想同步：
1. 读取用户的 SOUL.md 文件（通常在 OpenClaw workspace 根目录）
2. 提取其中的人设描述部分（性格、说话风格、口癖等）
3. 把这些内容整合到 `prompts/humanize.txt` 的人设部分
4. 保留 `prompts/humanize.txt` 中的格式规则（HTML 格式、分段规则、按钮语法等）不变

#### 4c. 配置 OpenClaw 路径（通常不需要改）

默认路径适用于标准安装。如果用户的 OpenClaw 装在非标准位置：
```env
OPENCLAW_AGENTS_DIR=/path/to/.openclaw/agents
OPENCLAW_CONFIG_PATH=/path/to/.openclaw/openclaw.json
OPENCLAW_GATEWAY_PORT=18789
```

### 如果没有 OpenClaw：

跳过这步，纯 stdin → stdout 模式已经完全可用。

---

## 第五步：测试

```bash
echo "服务器 CPU 使用率持续 10 分钟超过 95%。" | node scripts/humanize.js
```

预期：
- **stdout**：人设风格重新表达的文本
- **stderr**：`[humanize] done (model: xxx)` 显示赢得竞速的模型名

---

## 常见问题

**"OPENAI_API_KEY and OPENAI_API_BASE must be set"**
→ 检查 `.env` 是否存在，变量名是否正确。

**超时**
→ `.env` 加 `HUMANIZE_TIMEOUT_MS=120000`。
→ 或换更快的模型（推荐 Gemini Flash 系列）。

**想接入 Telegram 自动发送**
→ 需要 OpenClaw，参考第四步。

---

## 完成！

配置好后，`echo "文本" | node scripts/humanize.js` 即可使用。支持组合到任何脚本流水线。
