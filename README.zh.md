# ai-html-card

把任意文本通过 AI 生成精美的手机竖屏 HTML 卡片，用 Puppeteer 渲染成 PNG 图片。

支持可选的"人话翻译"步骤：先让 AI 把技术摘要翻译成口语化解释，再生成卡片。

---

## 🤖 给 AI 助手的快速安装

把下面这句话复制给你的 AI 助手（Claude、ChatGPT、Cursor 等均可）：

```
请阅读这个项目里的 AI-SETUP.md，然后帮我完成安装和配置。
```

AI 会引导你完成所有步骤，包括环境检查、依赖安装和 API 配置。

---

## 效果预览

- 深色苹果/魅族发布会风格
- 390px 手机竖屏，2x 高清渲染
- 圆角卡片，充足留白，高级感
- 支持中文（需安装 Noto Sans CJK 字体，AI-SETUP.md 中有说明）

---

## 手动安装

如果你想自己动手，参考 [README.md](./README.md)（英文）。

---

## 文件结构

```
ai-html-card/
├── AI-SETUP.md        ← AI 安装向导（让 AI 读这个）
├── README.md          ← 英文文档
├── README.zh.md       ← 中文文档（本文件）
├── scripts/
│   ├── card.js        # 文本 → HTML → PNG
│   ├── humanize.js    # 文本 → 口语化文本
│   ├── pipeline.js    # 完整流水线
│   └── render.js      # Puppeteer 渲染器
├── prompts/
│   ├── card-design.txt    # 卡片设计 prompt（可自定义）
│   └── humanize.txt       # 人话翻译 prompt（可自定义）
└── package.json
```

## License

MIT
