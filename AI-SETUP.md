# AI-SETUP.md — ai-html-card 安装向导

> **【语言规则】** 你的所有输出语言，以用户当前使用的语言为准。用户说中文就用中文，说英文就用英文，以此类推。本文件用中文编写，但不代表你必须用中文回复。
>
> 本文件供 AI 助手阅读。请按照以下步骤引导用户完成安装和配置。
> 遇到需要用户决策的地方，请主动提问，不要假设。

---

## 你的任务

帮助用户完成 **ai-html-card** 的安装、配置和测试。
这是一个把文本通过 AI 生成 HTML 卡片、再渲染成 PNG 图片的工具。

整个流程分为以下几步，请依次执行：

0. **模型兼容性检测**（必须先做）
1. 克隆项目（如果还没有）
2. 检查 Node.js 版本
3. 安装 npm 依赖
4. 选择渲染方案（A 或 C）并完成对应环境配置
5. 配置 AI API（交互式填写）
6. 写入 `.env` 文件
7. 运行测试，确认一切正常

---

## Step 0：模型兼容性检测（必须先执行）

**请先询问用户：**

> 你目前使用的是哪个 AI 助手 / 模型来帮你安装这个项目？
> （例如：ChatGPT GPT-5、Claude、Gemini、Qwen 千问等）

根据用户的回答，按以下规则判断是否继续：

### ✅ 可以继续安装

- **GPT-5 系列**（GPT-5、GPT-5.1、GPT-5.2、GPT-5.3 等）→ 直接继续
- **千问 Qwen3.5 Plus** → 直接继续

### ⚠️ 不建议，但可强制继续

- **其他 ChatGPT 版本**（GPT-4o、GPT-4 等非 GPT-5 系列）
- **Claude**（任意版本）
- **Gemini**（任意版本）
- **其他模型**

对于以上情况，请告知用户：

> 本项目针对 GPT-5 系列和千问 Qwen3.5 Plus 优化，当前模型（[模型名]）可能无法完整执行所有安装步骤。
> 是否仍要继续？（强制继续 / 取消）

如果用户选择强制继续，则正常执行后续步骤，但在遇到问题时提醒用户这可能与模型能力有关。

> **特别说明：** 如果用户使用的是 ChatGPT 但未说明具体版本，请追问：
> "你使用的是 GPT-5 系列（如 GPT-5、GPT-5.1、GPT-5.2）吗？"

---

## Step 1：克隆项目

如果用户还没有克隆，执行：

```bash
git clone https://github.com/YOUR_USERNAME/ai-html-card.git
cd ai-html-card
```

> 如果用户已经在项目目录里，跳过此步。

---

## Step 2：检查 Node.js

```bash
node --version
```

要求 **Node.js 18 或以上**（需要原生 fetch 和 ES modules top-level await）。

- 如果版本不足，告知用户升级：https://nodejs.org
- 如果没有安装，引导用户安装。

---

## Step 3：安装依赖

```bash
npm install
```

这会安装 `puppeteer`（含 Chromium，约 170MB）以及其他依赖。

> 如果用户网络较慢，告知他们 Chromium 下载需要一些时间，耐心等待即可。

---

## Step 4：选择渲染方案

**请询问用户：**

> 本工具支持两种渲染方案，请选择：
>
> **方案 A（推荐）：Puppeteer + Chromium**
> - 完整 CSS 支持，直接渲染 HTML
> - 需要 Chromium（npm install 时已自动下载）
> - 启动约 2-3 秒
>
> **方案 C：纯 Node.js（satori + resvg）**
> - 无需 Chromium，启动瞬间
> - CSS 支持有限（不支持复杂布局、动画等）
> - 需要额外安装：`npm install satori @resvg/resvg-js`
> - 中文字体需要手动提取（见下方说明）
>
> 你选择哪个方案？（A / C）

### 方案 A 的额外配置

**中文字体（可选，但强烈推荐）：**

如果卡片内容包含中文，必须安装 Noto Sans CJK 字体，否则中文显示为方块：

```bash
# Debian / Ubuntu
sudo apt-get install -y fonts-noto-cjk

# Arch Linux
sudo pacman -S noto-fonts-cjk

# macOS
brew install --cask font-noto-sans-cjk

# 验证
fc-list | grep -i "Noto Sans CJK"
```

询问用户：**你的卡片内容是否包含中文？** 如果是，引导安装字体。

### 方案 C 的额外配置

1. 安装依赖：
   ```bash
   npm install satori @resvg/resvg-js
   ```

2. 提取中文字体（需要 Python + fonttools）：
   ```bash
   pip install fonttools
   mkdir -p fonts
   python3 -c "
   from fontTools.ttLib import TTCollection
   import io
   ttc = TTCollection('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
   sc = ttc.fonts[2]
   buf = io.BytesIO()
   sc.save(buf)
   open('fonts/NotoSansCJKsc-Regular.otf', 'wb').write(buf.getvalue())
   print('done')
   "
   ```

3. 修改 `scripts/render.js`，替换为 satori 版本（见项目 Wiki 或告知用户需要手动替换）。

---

## Step 5：配置 AI API

**请依次询问用户以下问题：**

### 5.1 选择 API 供应商

> 你使用哪个 AI API 供应商来生成卡片内容？
>
> 1. OpenAI
> 2. Google Gemini
> 3. DeepSeek
> 4. 其他 OpenAI 兼容接口
> 5. Anthropic Claude（需要修改代码，见下方说明）

根据用户选择，给出对应的默认值：

| 供应商 | API Base URL | 推荐模型 |
|--------|-------------|---------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash` |
| DeepSeek | `https://api.deepseek.com/v1` | 用户自填 |
| 其他兼容接口 | 用户自填 | 用户自填 |

> **注意：** Anthropic Claude 不使用 OpenAI 兼容协议。如果用户选择 Anthropic，告知他们需要修改 `scripts/card.js` 和 `scripts/humanize.js` 中的 API 调用代码，改用 `@anthropic-ai/sdk`，并提供修改示例（见文末）。

### 5.2 填写 API Key

> 请输入你的 API Key：

### 5.3 确认模型名称

> 你想使用的模型名称是？（直接回车使用上方推荐的默认值）

---

## Step 5.5：人设配置（可选）

**请询问用户：**

> 本工具通常配合 OpenClaw 使用，OpenClaw 工作目录下一般有一个 `SOUL.md` 人设文件。
> 是否要把你的 `SOUL.md` 追加到 humanize prompt 中，让输出风格符合你的 AI 人设？（推荐）

### 如果用户选择添加：

1. 询问文件路径，例如 `/path/to/SOUL.md`
2. 将其追加到 humanize prompt 末尾：

   ```bash
   cat /path/to/SOUL.md >> prompts/humanize.txt
   ```

   或者，如果用户希望保持原始 prompt 不变，改用环境变量指向合并后的文件：

   ```bash
   # 合并默认 prompt + 人设文件
   cat prompts/humanize.txt /path/to/SOUL.md > /tmp/humanize-with-persona.txt
   # 在 .env 中引用
   echo "HUMANIZE_PROMPT_FILE=/tmp/humanize-with-persona.txt" >> .env
   ```

3. 告知用户：人设文件只影响"人话翻译"步骤（`humanize.js`），不影响卡片视觉设计。
   如果也想让卡片设计风格受人设影响，同样操作 `CARD_PROMPT_FILE`。

### 如果用户没有人设文件：

跳过此步，使用默认 prompt 风格。

---

## Step 6：写入 .env 文件

根据用户填写的信息，创建 `.env` 文件：

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=用户填写的key
OPENAI_API_BASE=用户填写的base_url
OPENAI_MODEL=用户填写的模型名
EOF
```

同时，告知用户在运行时需要先加载环境变量：

```bash
source .env
# 或
export $(cat .env | xargs)
```

> **安全提示：** `.env` 已在 `.gitignore` 中，不会被提交到 Git。

---

## Step 7：运行测试

执行以下命令验证安装是否成功：

```bash
source .env
echo "Hello, this is a test card." | node scripts/card.js
```

预期输出：一个 PNG 文件路径，如 `/tmp/ai-card-xxx.png`

如果成功，告知用户安装完成，并展示基本用法：

```bash
# 生成卡片
echo "你的内容" | node scripts/card.js

# 完整流水线（先翻译再出图）
echo "技术摘要" | node scripts/pipeline.js
```

---

## 常见问题处理

### 中文显示为方块
→ 未安装 Noto Sans CJK 字体，参考 Step 4 安装。

### Chromium 启动失败（Linux 沙箱错误）
→ 在 `scripts/render.js` 的 `puppeteer.launch` 中添加 `--no-sandbox` 参数（已默认包含）。

### API 返回 401
→ API Key 填写有误，检查 `.env` 文件。

### API 返回 404
→ API Base URL 或模型名称有误，检查供应商文档。

---

## 附录：Anthropic 用户的代码修改示例

如果用户使用 Anthropic Claude API，需要修改 API 调用部分。

```bash
npm install @anthropic-ai/sdk
```

在 `scripts/card.js` 和 `scripts/humanize.js` 中，将 fetch 调用替换为：

```js
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const message = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
  max_tokens: 8192,
  messages: [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n${input}` }],
});
const result = message.content[0].text;
```

---

## 完成

安装完成后，用户可以：
- 直接用 `echo "内容" | node scripts/card.js` 生成卡片
- 自定义 `prompts/card-design.txt` 修改卡片风格
- 自定义 `prompts/humanize.txt` 修改翻译风格
- 设置 `CARD_PROMPT_FILE` 环境变量使用外部 prompt 文件
