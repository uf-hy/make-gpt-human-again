# AI-SETUP.md — 安装向导

> **项目地址：** https://github.com/uf-hy/make-gpt-human-again
>
> **语言规则：** 以用户当前使用的语言为准。用户说中文就用中文，说英文就用英文。
>
> 本文件供 AI 助手阅读。请按照以下步骤引导用户完成安装和配置，遇到需要决策的地方主动提问。

---

## 你的任务

帮助用户安装并配置 **make-gpt-human-again**。

这个工具把任意文本通过 AI 转成指定人设风格（默认傲娇猫娘 fufu酱），支持并发竞速和自动 fallback。

---

## 第一步：克隆项目

如果用户还没克隆：

```bash
git clone https://github.com/uf-hy/make-gpt-human-again.git
cd make-gpt-human-again
```

检查 Node.js 版本：

```bash
node --version
```

需要 **v18+**（使用原生 fetch）。版本不够帮用户升级。

---

## 第二步：配置 .env

```bash
cp .env.example .env
```

帮用户填写以下必填项：

| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | API Key（任意 OpenAI 兼容服务） |
| `OPENAI_API_BASE` | Base URL，如 `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 模型名，如 `gpt-4o-mini`、`gemini-2.0-flash` |

**可选增强：**

```env
# 并发竞速（逗号分隔多个模型，同时跑，最快的赢）
OPENAI_MODEL=gemini-2.0-flash,gpt-4o-mini

# 兜底（主力全挂时顺序尝试）
HUMANIZE_FALLBACK_MODELS=gpt-4o
```

---

## 第三步：自定义人设（可选）

人设文件：`prompts/humanize.txt`

问用户：**「保留默认的 fufu酱 人设，还是自定义？」**

- **保留** → 跳过
- **自定义** → 编辑 `prompts/humanize.txt`，写任意风格描述即可

---

## 第四步：测试

```bash
echo "服务器 CPU 使用率持续 10 分钟超过 95%。" | node scripts/humanize.js
```

预期：文本被人设风格重新表达，stdout 输出结果，stderr 显示用了哪个模型。

如果成功，安装完成！

---

## 常见问题

**"OPENAI_API_KEY and OPENAI_API_BASE must be set"**
→ 检查 `.env` 是否存在，变量名是否正确。

**超时**
→ `.env` 加 `HUMANIZE_TIMEOUT_MS=120000`（默认 60 秒）。

**想接入 OpenClaw 自动发 Telegram**
→ 参考 `SKILL.md`，把本项目作为 OpenClaw skill 使用。
