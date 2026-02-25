---
name: make-gpt-human-again
description: 把 GPT 输出用自定义人设风格重新表达（默认傲娇猫娘 fufu酱）。支持并发竞速、自动 fallback、OpenClaw 自动发送 Telegram。
---

# make-gpt-human-again Skill

## 用途

- 输入：GPT 原始输出（stdin）
- 输出：人设风格文本（stdout）
- 人设可完全自定义（编辑 `prompts/humanize.txt`）

## 调用

```bash
printf '%s' "GPT 原始输出" | node scripts/humanize.js
```

## 环境变量

必须在 `.env` 中配置：

```env
OPENAI_API_KEY=sk-your-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## OpenClaw 集成

作为 OpenClaw skill 使用时，humanize-output 版本额外支持：

1. **自动检测 Agent** — 扫描 session JSONL，识别是哪个 Agent 触发
2. **自动发送 Telegram** — 翻译完通过对应 Bot 直接发送给用户
3. **双向上下文注入** — 发完后注入 `[CONTEXT_REF]` 回 session，GPT 下一轮知道自己说了什么
4. **交替对话上下文** — 读取最近几轮 `主人/fufu酱` 交替对话，保持语气连贯

OpenClaw 集成版代码在 `skills/humanize-output/` 目录（非本仓库，由 OpenClaw 管理）。
