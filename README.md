# Hexforge CTF 工具箱 MVP

一个纯 HTML / CSS / JavaScript 的 CTF 网络安全工具箱 MVP。无需构建工具，直接打开 `index.html` 即可使用。

## 1. 用户需求分析

### 核心用户

- CTF 初学者：需要低门槛、看得懂、能立刻验证结果的工具。
- 刷题用户：需要快速处理 Base64、URL、Hex、ROT13、文本统计和 Hash 等重复动作。
- 有经验的选手：希望工具响应快、输入输出清晰，并且不会把题目内容上传到第三方。

### 关键场景

1. 从题目中复制一段字符串。
2. 快速定位合适的工具。
3. 在同一个页面完成处理并复制结果。
4. 对照输入和输出继续尝试，必要时恢复最近一次操作。

### MVP 需要验证的假设

- 用户是否愿意把它作为做题时的固定入口。
- 哪些工具使用频率最高，是否需要继续扩充密码学、编码、取证类工具。
- “本地处理、不上传数据”是否能成为产品信任点。
- 用户是否愿意为批量处理、工具链、题目收藏、历史记录同步和无广告体验付费。

## 2. 当前 MVP 范围

- 工具搜索与分类筛选。
- Base64 编码/解码。
- URL 编码/解码。
- Hex 文本与十六进制转换。
- ROT13 转换。
- 文本字符、单词、行和唯一字符统计。
- SHA-256 摘要生成。
- 示例输入、运行、复制、清空、交换输入输出。
- 最近 5 次操作保存在浏览器 `localStorage` 中。
- 响应式布局、键盘快捷键和亮度模式切换。

第二阶段已增加：

- `/zh/` 中文工具目录。
- `/en/` English tool directory。
- 7 个双语独立工具页：Base64、URL、Hex、ROT13、JWT、SHA-256、文本统计。
- 每个工具页独立的标题、描述、canonical、hreflang、FAQ 和相关工具链接。
- `robots.txt` 与 `sitemap.xml`。

第三阶段已增加：

- Binary、Unix 时间戳、正则表达式和文件 SHA-256 工具。
- 工作台现包含 11 个工具，JWT 也可直接在工作台运行。
- 双语目录支持本地收藏，并按收藏和最近访问自动排序。
- 工具成功/错误次数只保存在浏览器本地，不包含输入内容。
- 修复独立工具页初始化中断的问题。

## 3. 统计接入

代码已经预留：

- `analytics-config.js`：填入 Cloudflare Web Analytics beacon token。
- `analytics.js`：只有配置了真实 token 时才加载 Cloudflare beacon，不会向线上发送占位符。
- `privacy/` 与 `en/privacy/`：说明本地处理、localStorage 和匿名访问统计。
- 首页、双语目录和所有工具页都加载统计入口。

### Cloudflare Web Analytics

对于 Cloudflare Pages 项目，优先进入 `Workers & Pages > hexforge-ctf-toolbox > Metrics`，在 Web Analytics 区域选择 Enable。Cloudflare 会在下一次部署时自动注入 beacon。

如果改用 Web Analytics 页面手动添加站点，主机名填写 `hexforge-ctf-toolbox.pages.dev`，不要包含 `https://` 或路径。创建后可将生成的 token 填入：

```js
window.HEXFORGE_CONFIG = Object.freeze({
  cloudflareWebAnalyticsToken: "你的真实 token",
});
```

### Google Search Console

当前使用的是 Cloudflare 提供的 `pages.dev` 子域名，推荐在 Search Console 添加 URL-prefix property：`https://hexforge-ctf-toolbox.pages.dev/`，并使用 HTML tag 验证。验证后提交：

```text
https://hexforge-ctf-toolbox.pages.dev/sitemap.xml
```

## 4. 运行方式

直接双击 `index.html`，或用任意静态文件服务器打开目录。若浏览器禁止 `file://` 页面调用 Web Crypto，SHA-256 工具需要通过静态服务器访问；其余工具不受影响。

主要路径：

- `/zh/`
- `/en/`
- `/zh/tools/base64-decoder/`
- `/en/tools/base64-decoder/`

当前版本只依赖浏览器原生 API，所有转换都在当前浏览器中完成。

## 5. 后续迭代顺序

### P0：验证使用频率（已完成基础版本）

- 已增加 JWT 解码、Binary、时间戳、正则测试和文件哈希。
- 已增加输入格式说明、错误提示、工具收藏与最近使用排序。
- 已增加浏览器本地工具计数；Cloudflare Web Analytics 暂不支持自定义事件，后续接入独立事件端点时再做汇总分析。

### P1：提高留存

- 题目工作区：保存题目、标签、笔记和工具结果。
- 工具链：把多个转换串起来批量执行。
- 导入文本文件、导出结果。
- 账号登录与跨设备同步。

### P2：商业化

- 免费层：单次文本处理和基础工具。
- Pro 会员：批量处理、文件处理、工具链、历史同步、无广告和高级工具。
- AdSense：只放在公开的内容页和工具介绍页，避免干扰实际工作台。
- 付费前先验证高频功能，不要先做复杂支付系统。

## 6. 安全边界

本 MVP 只提供浏览器端的文本转换和摘要计算，不执行用户输入，不发起网络请求，也不提供漏洞利用或攻击功能。后续加入文件解析、网络请求或第三方 API 时，需要单独设计输入限制、隐私说明和错误隔离。
