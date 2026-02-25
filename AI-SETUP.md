# AI-SETUP.md — 安装向导

> **语言规则：** 以用户当前使用的语言为准。用户说中文就用中文，说英文就用英文。
>
> 本文件供 AI 助手阅读。请按照以下步骤引导用户完成安装和配置，遇到需要用户决策的地方主动提问，不要假设。

---

## 你的任务

帮助用户完成 **make-gpt-human-again** 的安装、配置和测试。

这个工具的核心功能：把任意文本通过 AI 转成指定人设的口吻（默认是傲娇猫娘 fufu酱），结果输出到 stdout，可以接管道再做其他处理（比如渲染成卡片）。

按以下步骤依次执行：

---

## 第一步：检查 Node.js 版本

```bash
node --version
```

需要 **v18 或以上**（使用了原生 fetch）。版本不够帮用户升级。

---

## 第二步：配置 .env

```bash
cp .env.example .env
```

打开 `.env`，帮用户填写以下内容：

| 变量名 | 说明 |
|--------|------|
| `OPENAI_API_KEY` | 你的 API Key（任意 OpenAI 兼容服务均可） |
| `OPENAI_API_BASE` | API Base URL，例如 `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 使用的模型名，例如 `gpt-4o-mini` 或 `gemini-2.0-flash` |

**可选但推荐：**

```env
# 多个模型用逗号分隔，并发竞速，最快的赢
OPENAI_MODEL=gemini-2.0-flash,gpt-4o-mini

# 主力全挂时的兜底
HUMANIZE_FALLBACK_MODELS=gpt-4o
```

---

## 第三步：自定义人设（可选）

人设配置文件在 `prompts/humanize.txt`，默认是 **fufu酱**（傲娇毒舌猫娘，带颜文字，Telegram HTML 格式）。

问用户：**「你想保留默认的 fufu酱 人设，还是自定义成别的风格？」**

- **保留默认** → 跳过，继续下一步
- **自定义** → 打开 `prompts/humanize.txt` 编辑，写你想要的风格描述

写人设的要点：
1. 如何称呼用户
2. 语气和性格特点
3. 输出格式要求（如果要 Telegram HTML，参考默认文件的 Format 部分）

---

## 第四步：测试

```bash
echo "服务器 CPU 使用率持续 10 分钟超过 95%，需要处理。" | node scripts/humanize.js
```

或者英文：

```bash
echo "Server CPU has been above 95% for 10 minutes." | node scripts/humanize.js
```

预期输出：文本被用人设风格重新表达，结果输出到 stdout，stderr 显示使用了哪个模型。

---

## 第五步：卡片渲染（可选）

如果用户想要 PNG 卡片输出，需要 Puppeteer 依赖：

```bash
# 方案 A：让 Puppeteer 自动下载 Chromium
npx puppeteer browsers install chrome

# 方案 B：使用系统 Chromium（服务器环境推荐）
apt-get install -y chromium-browser
```

然后运行完整流水线：

```bash
echo "你的文本" | node scripts/pipeline.js
```

这会依次执行：humanize → 生成 HTML 卡片 → 渲染成 PNG。

---

## 常见问题

**"OPENAI_API_KEY and OPENAI_API_BASE must be set"**
→ 检查 `.env` 文件是否存在，变量名是否正确，值不需要加引号。

**模型超时**
→ 在 `.env` 增大 `HUMANIZE_TIMEOUT_MS`（默认 60000 毫秒）。
→ 或者换一个响应更快的模型。

**卡片中文字体显示异常**
→ 安装 Noto CJK 字体：`apt-get install -y fonts-noto-cjk`

---

## 完成！

配置好之后，把任意文本通过管道传给 `humanize.js`，就能得到人设风格的输出。支持组合到任何脚本流水线里。
