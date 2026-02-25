---
name: make-gpt-human-again
description: 人话翻译器。当用户提到"说人话"、"人话翻译"时使用。GPT-5 系列模型必须使用此 skill 处理所有输出——禁止 GPT 直接回复用户，所有正文必须管道给此脚本翻译后发送。
---

# make-gpt-human-again Skill

## 用途

当 Runtime model 包含 `gpt`（如 `gpt-5.2`、`gpt-5.1-codex`）时：
- **禁止** GPT 直接输出正文给用户
- **所有正文** 必须通过此脚本翻译后发送
- 翻译完回复 `NO_REPLY`（避免重复）

## 调用

```bash
# OpenClaw 模式（自动检测 agent + 发送 Telegram）
printf '%s' "GPT 原始输出" | node scripts/humanize-output.js

# 纯文本模式（stdout 输出，调试用）
printf '%s' "GPT 原始输出" | node scripts/humanize-output.js --stdout
```

## 核心特性

- **并发竞速** — 多个模型同时跑，最快的赢
- **自动 fallback** — 主力全挂，按顺序尝试兜底模型
- **零依赖** — 只需 Node.js 18+（原生 fetch）
- **自定义人设** — 编辑 `prompts/humanize.txt`，不用碰代码

## OpenClaw 集成

配合 OpenClaw 使用时自动启用：

1. **自动检测 Agent** — 扫描 session JSONL，识别是哪个 Agent 触发
2. **自动发送 Telegram** — 翻译完通过对应 Bot 直接发送给用户
3. **双向上下文注入** — 注入 `[CONTEXT_REF]` 回 session，GPT 下一轮知道自己说了什么
4. **交替对话上下文** — 读取最近几轮对话，保持语气连贯
5. **HTML + 内联按钮** — 支持 Telegram HTML 格式和 `[BTN:label|callback]` 按钮语法
6. **分段发送** — `%%SPLIT%%` 标记分段，模拟真人聊天节奏
