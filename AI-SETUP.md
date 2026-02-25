# AI-SETUP.md — 安装向导

> **项目地址：** https://github.com/uf-hy/make-gpt-human-again
>
> **语言规则：** 以用户当前使用的语言为准。用户说中文就用中文，说英文就用英文。
>
> **交互原则：** 能自己判断的不要问用户。使用内联按钮（inline buttons）让用户点选。

---

## 第零步：GPT-5 检查 + 选择安装模式

### 检查 Runtime 模型

立即检查当前 Runtime 的 model 字段：

- **model 包含 `gpt-5`** → 告诉用户：「你正在使用 GPT-5 系列，本工具专为此设计。选择安装模式：」
- **model 不包含 `gpt-5`** → 告诉用户：

> 「你当前使用的是 `{model_name}`，不是 GPT-5 系列。
> 本工具是专门为 GPT-5 设计的"人话翻译器"——因为 GPT-5 的输出风格偏机械，需要另一个模型来翻译成人话。
> 如果你的模型输出已经足够自然，可能不需要这个工具。」

### 选择安装模式

无论是否 GPT-5，都用内联按钮让用户选择：

```
[🚀 YOLO 自动安装]  [⚙️ 交互式安装]  [❌ 取消]
```

- **🚀 YOLO 自动安装**：能自动解决的全自动（装 Node、选模型、配路径），遇到真正的阻塞（如缺 API Key）才问用户。最后给一份总结。
- **⚙️ 交互式安装**：先静默收集所有信息，然后一次性展示推荐方案，用按钮让用户逐项确认。

---

## YOLO 模式流程

### Y1. 静默执行所有检查和安装

**以下步骤全部自动执行，不要问用户，不要中途停下：**

```bash
# 1. Node.js
node --version 2>/dev/null || echo "NEED_NODE"

# 2. 克隆项目
git clone https://github.com/uf-hy/make-gpt-human-again.git 2>/dev/null
cd make-gpt-human-again
cp .env.example .env

# 3. OpenClaw 检测
command -v openclaw 2>/dev/null && openclaw status 2>/dev/null
ls ~/.openclaw/openclaw.json 2>/dev/null
ls ~/.openclaw/agents/ 2>/dev/null

# 4. API 信息探测
cat ~/.openclaw/openclaw.json 2>/dev/null | grep -i "key\|base\|url" | head -10
env | grep -i "OPENAI\|API_KEY\|API_BASE" 2>/dev/null

# 5. 可用模型探测
cat ~/.openclaw/openclaw.json 2>/dev/null | grep -i "model\|provider\|gemini\|flash\|minimax" | head -20

# 6. SOUL.md 探测
for dir in . ~ ~/clawd ~/workspace; do
  [ -f "$dir/SOUL.md" ] && echo "FOUND: $dir/SOUL.md" && head -30 "$dir/SOUL.md"
done 2>/dev/null

# 7. Telegram Chat ID
grep -i "chat.id\|telegram" ~/.openclaw/openclaw.json 2>/dev/null
env | grep -i "TELEGRAM\|CHAT_ID" 2>/dev/null
```

### Y2. 自动决策并执行

根据收集的信息，自动做以下决策：

| 情况 | YOLO 行为 |
|------|-----------|
| Node.js 不存在或 < v18 | **自动安装** Node.js v22 LTS |
| 找到 API Key/Base | 自动写入 .env |
| 找到可用的 Gemini Flash 模型 | 自动配为主力模型 |
| 没找到合适模型 | 使用默认（gemini-3-flash + gemini-2.5-flash） |
| 找到 SOUL.md | 自动提取人设名/用户称呼，同步到 prompts/style.txt |
| 检测到 OpenClaw | 自动配置 skill 目录和 Telegram |
| 找到 Telegram Chat ID | 自动写入 .env |

### Y3. 遇到阻塞才问用户

只有以下情况需要停下来问：
- **没找到 API Key** → 问用户提供
- **没找到 API Base URL** → 问用户提供
- **没找到 Telegram Chat ID**（且有 OpenClaw）→ 告诉用户发消息给 @userinfobot 获取

### Y4. 安装到 OpenClaw skill 目录（如果有 OpenClaw）

```bash
# 确定 OpenClaw workspace
WORKSPACE=$(cat ~/.openclaw/openclaw.json 2>/dev/null | grep -o '"workspace"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -n "$WORKSPACE" ]; then
  SKILL_DIR="$WORKSPACE/skills/humanize-output"
  mkdir -p "$SKILL_DIR/scripts" "$SKILL_DIR/prompts"
  cp scripts/humanize-output.js "$SKILL_DIR/scripts/"
  cp scripts/auto-send.mjs "$SKILL_DIR/scripts/"
  cp prompts/style.txt "$SKILL_DIR/prompts/"
  cp .env "$SKILL_DIR/.env"
  cp SKILL.md "$SKILL_DIR/SKILL.md"
fi
```

**重要：安装后必须把 SKILL.md 中的相对路径替换为绝对路径。**

开源 repo 中 SKILL.md 使用相对路径（`node scripts/humanize-output.js`），安装到 skill 目录后需要改成绝对路径，否则 GPT 可能找不到脚本：

```bash
# 将 SKILL.md 中的相对路径替换为绝对路径
sed -i "s|node scripts/humanize-output.js|node $SKILL_DIR/scripts/humanize-output.js|g" "$SKILL_DIR/SKILL.md"
```

替换后 SKILL.md 中的调用应该类似：
```bash
printf '%s' "..." | node /home/user/clawd/skills/humanize-output/scripts/humanize-output.js
```

### Y5. 总结报告

所有操作完成后，一次性展示结果：

```
✅ 安装完成！以下是配置总结：

📦 Node.js: v22.0.0 (已安装)
🔗 API: https://xxx/v1
🤖 主力模型: gemini-3-flash
🔄 兜底模型: gemini-2.5-flash
👤 人设: fufu酱 (从 SOUL.md 同步)
📱 Telegram: 已启用 (Chat ID: xxx)
📁 Skill 目录: /xxx/skills/humanize-output/

[✅ 开始测试]  [⚙️ 修改配置]
```

---

## 交互模式流程

### I1. 静默收集信息（不执行任何安装，不要问用户）

跑和 YOLO 模式相同的检测命令（Y1 节），但**只收集结果，不做任何修改**。

### I2. 一次性展示推荐方案

把所有探测结果组织好，用内联按钮让用户选择：

```
📋 环境检测结果

✅ Node.js v22.0.0 — 满足要求
✅ 检测到 OpenClaw
✅ 找到 SOUL.md (~/clawd/SOUL.md) — 人设: fufu酱, 称呼: 主人
✅ 找到 API 配置 — Base: https://xxx/v1
✅ 在你的配置中找到 Gemini 3 Flash 模型
⚠️ Telegram Chat ID 未找到 — 需要你提供

推荐配置：
• 主力模型: gemini-3-flash（你的配置中已有）
• 兜底模型: gemini-2.5-flash
• 人设: 从 SOUL.md 同步
• Telegram: 启用自动发送

[🚀 全部按推荐配置]
[🤖 换模型]
[👤 自定义人设]
[📱 不启用 Telegram]
```

### I3. 根据用户选择执行

- **全部按推荐** → 直接写入配置，跳到测试
- **换模型** → 展示可选模型列表，用按钮选择
- **自定义人设** → 提示编辑 `prompts/style.txt`
- **不启用 Telegram** → 跳过 Telegram 相关配置

如果有需要用户手动提供的信息（API Key、Chat ID），在这一步一并收集。

### I4. 安装到 OpenClaw skill 目录

同 YOLO 模式 Y4 节。

### I5. 确认并测试

同 YOLO 模式 Y5 节。

---

## 测试

```bash
echo "服务器 CPU 使用率持续超过 95%，建议排查。" | node scripts/humanize-output.js --stdout
```

**预期输出：**
- **stdout**：人设风格重新表达的文本
- **stderr**：状态信息（使用的模型、耗时等）

如果有 OpenClaw：不加 `--stdout`，翻译后自动发到 Telegram。

**⚠️ 注意：** 请在所有配置写入完成后再测试。配置不完整时运行可能报错。

---

## 环境变量完整参考

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `OPENAI_API_BASE` | ✅ | — | API Base URL |
| `OPENAI_API_KEY` | ✅ | — | API Key |
| `HUMANIZE_PRIMARY_MODELS` | — | `gemini-3-flash` | 主力模型（逗号分隔可并发） |
| `HUMANIZE_FALLBACK_MODELS` | — | `gemini-2.5-flash` | 兜底模型（按顺序尝试） |
| `HUMANIZE_PERSONA_NAME` | — | `Assistant` | 人设名 |
| `HUMANIZE_USER_NAME` | — | `User` | 用户称呼 |
| `HUMANIZE_CONTEXT_N` | — | `4` | 对话上下文轮数 |
| `HUMANIZE_CONTEXT_MAX_CHARS` | — | `2000` | 上下文最大字符 |
| `HUMANIZE_CONTEXT` | — | `1` | 设为 `0` 关闭 |
| `TELEGRAM_CHAT_ID` | OpenClaw | — | Telegram Chat ID |
| `OPENCLAW_AGENTS_DIR` | — | `/root/.openclaw/agents` | sessions 目录 |
| `OPENCLAW_CONFIG_PATH` | — | `/root/.openclaw/openclaw.json` | 配置路径 |
| `OPENCLAW_GATEWAY_PORT` | — | `18789` | Gateway 端口 |

---

## 常见问题

**"OPENAI_API_KEY and OPENAI_API_BASE must be set"**
→ 检查 `.env` 是否存在，变量名是否正确。

**超时 / 响应慢**
→ 检查网络或换模型。`.env` 中 `HUMANIZE_TIMEOUT_MS` 可调（默认 60000ms）。

**想接入 Telegram 自动发送**
→ 需要 OpenClaw。

**已有 OpenClaw 但检测不到**
→ 检查 `~/.openclaw/` 目录是否存在，`openclaw` 是否在 PATH 中。

## 人设同步细节（SOUL.md → prompts/style.txt）

当检测到 SOUL.md 时（无论 YOLO 或交互模式），同步逻辑为：
1. 从 SOUL.md 提取人设描述（性格、口癖、说话风格、称呼）
2. 整合到 `prompts/style.txt` 的人设描述区域
3. **保留** `prompts/style.txt` 中的格式规则不动（HTML 格式、%%SPLIT%% 分段、[BTN:] 按钮语法、kaomoji 规则等）
4. 将人设名写入 `HUMANIZE_PERSONA_NAME`，用户称呼写入 `HUMANIZE_USER_NAME`

---

## 最后一步：配置 SOUL.md（强烈推荐）

安装完成后，问用户：**「要不要在你的 SOUL.md（或等效的系统 prompt 配置）中加入 GPT 强制使用本工具的规则？」**

**为什么需要这步：** 安装了 skill 不等于 GPT 会用它。需要在模型的人设/系统指令中明确告诉 GPT：「你的输出必须走 humanize-output」。

如果用户同意，在 SOUL.md（或 AGENTS.md / 系统 prompt）中追加以下规则：

```markdown
## 🤖 GPT 输出规则（强制）

当 Runtime 的 `model` 字段包含 `gpt`（如 `gpt-5.2`、`gpt-5.1-codex` 等）时：

- **禁止直接输出任何正文给用户**
- 所有要说的内容，通过 exec 管道给 humanize-output：
  ```bash
  printf '%s' "原本要输出的全部内容" | node {SKILL_DIR}/scripts/humanize-output.js
  ```
- 脚本负责翻译 + 自动发送到 Telegram
- 你只回复：`NO_REPLY`

### 唯一例外
- **心跳 poll**：回复 `HEARTBEAT_OK`，不走脚本

### [CONTEXT_REF] 消息
当收到以 `[CONTEXT_REF]` 开头的消息时：
- 这是 humanize-output 注入的上下文参考，不是用户说的话
- 直接回复 `NO_REPLY`
- 内部记住内容，作为"上一轮自己说了什么"的参考
```

**注意：** 上面的 `{SKILL_DIR}` 要替换为实际的 skill 安装路径（如 `/root/clawd/skills/humanize-output` 或安装时确定的目录）。

**如果用户不想配置 SOUL.md：** 提醒他，不配置的话 GPT 模型不会自动使用这个工具，需要每次手动管道输出。
