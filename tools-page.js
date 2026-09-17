const pageTools = {
  base64: {
    id: "ENC-01",
    zh: { name: "Base64 编码解码器", short: "编码或解码 Base64 文本", lede: "在浏览器本地完成 Base64 编码和解码，适合快速检查 CTF 题目中的字符串线索。", sample: "Y3RmIHJlc2VhcmNoIGJlZ2lucyBoZXJl", placeholder: "输入普通文本或 Base64 字符串……", why: "Base64 不是加密，而是一种把二进制数据表示成文本的编码方式。在 CTF 中，它经常出现在题目描述、Cookie、JSON 和文件内容中。" },
    en: { name: "Base64 Encoder / Decoder", short: "Encode or decode Base64 text", lede: "Encode and decode Base64 locally in your browser for quick checks during CTF practice.", sample: "Y3RmIHJlc2VhcmNoIGJlZ2lucyBoZXJl", placeholder: "Enter plain text or a Base64 string...", why: "Base64 is an encoding format, not encryption. In CTFs it commonly appears in descriptions, cookies, JSON, and file contents." },
    run(value) {
      const compact = value.replace(/\s/g, "");
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length % 4 === 0) {
        try { const decoded = decodeBase64(value); if (isPrintable(decoded)) return decoded; } catch { /* encode below */ }
      }
      return encodeBase64(value);
    },
    faq: { zh: ["为什么结果有时是编码而不是解码？", "工具会在输入看起来像有效 Base64 且解码结果可读时进行解码，否则将普通文本编码为 Base64。"], en: ["Why does the result sometimes encode instead of decode?", "The tool decodes input when it looks like valid Base64 and produces readable text. Otherwise it encodes the input as Base64."] },
  },
  url: {
    id: "ENC-02",
    zh: { name: "URL 编码解码器", short: "处理 URL 中的特殊字符", lede: "快速编码或解码 URL 参数，帮助你检查查询字符串、路径和重定向线索。", sample: "https://example.com/search?q=ctf notes", placeholder: "输入 URL 或包含特殊字符的文本……", why: "URL 编码把空格、括号、中文和其他特殊字符转换成可在 URL 中安全传输的形式。" },
    en: { name: "URL Encoder / Decoder", short: "Handle special characters in URLs", lede: "Encode or decode URL parameters locally while inspecting query strings, paths, and redirect clues.", sample: "https://example.com/search?q=ctf notes", placeholder: "Enter a URL or text with special characters...", why: "URL encoding turns spaces, Unicode, and reserved characters into a form that can travel safely inside a URL." },
    run(value) { if (/%[0-9a-f]{2}/i.test(value)) { try { return decodeURIComponent(value); } catch { /* encode below */ } } return encodeURIComponent(value); },
    faq: { zh: ["URL 编码和 Base64 一样吗？", "不一样。URL 编码解决 URL 字符安全传输问题，Base64 用来表示二进制或文本数据。"], en: ["Is URL encoding the same as Base64?", "No. URL encoding makes characters safe inside URLs, while Base64 represents binary or text data as ASCII characters."] },
  },
  hex: {
    id: "ENC-03",
    zh: { name: "Hex 十六进制转换器", short: "文本与十六进制互转", lede: "在可读文本和十六进制字节之间快速转换，适合处理 flag、文件片段和内存线索。", sample: "63 74 66 7b 68 65 78 5f 6c 61 62 7d", placeholder: "输入普通文本或十六进制字节……", why: "十六进制常用于展示原始字节。每两个十六进制字符通常对应一个字节，转换结果可以帮助你继续判断数据类型。" },
    en: { name: "Hex Converter", short: "Convert text and hexadecimal", lede: "Convert readable text and hexadecimal bytes for quick checks on flags, file fragments, and memory clues.", sample: "63 74 66 7b 68 65 78 5f 6c 61 62 7d", placeholder: "Enter text or hexadecimal bytes...", why: "Hexadecimal is a compact way to display raw bytes. Two hex characters usually represent one byte." },
    run(value) { const compact = value.replace(/\s+/g, ""); if (/^(?:[0-9a-fA-F]{2})+$/.test(compact)) return compact.match(/.{2}/g).map((byte) => String.fromCharCode(parseInt(byte, 16))).join(""); return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(16).padStart(2, "0")).join(" "); },
    faq: { zh: ["输入带空格的 Hex 可以吗？", "可以。工具会自动忽略空格和换行，再判断是否为连续的十六进制字节。"], en: ["Can I enter Hex with spaces?", "Yes. Spaces and line breaks are ignored before the tool checks for hexadecimal byte pairs."] },
  },
  rot13: {
    id: "ENC-04",
    zh: { name: "ROT13 解码器", short: "进行 ROT13 字母替换", lede: "用一次点击处理 ROT13 文本。ROT13 是可逆的字母替换，经常用于隐藏提示、答案或题目中的轻量线索。", sample: "Gur synt vf va gur frperg", placeholder: "输入需要进行 ROT13 替换的文本……", why: "ROT13 将每个英文字母向后移动 13 位。再次运行一次就会回到原文。" },
    en: { name: "ROT13 Decoder", short: "Apply the ROT13 letter substitution", lede: "Transform ROT13 text in one click. ROT13 is reversible and often hides hints, answers, or lightweight clues.", sample: "Gur synt vf va gur frperg", placeholder: "Enter text to transform with ROT13...", why: "ROT13 shifts each English letter by 13 positions. Running it twice returns the original text." },
    run(value) { return value.replace(/[a-zA-Z]/g, (char) => { const base = char <= "Z" ? 65 : 97; return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base); }); },
    faq: { zh: ["ROT13 是加密吗？", "不是。它是可逆的简单替换，不能提供安全性，只适合隐藏文本或练习题中的线索。"], en: ["Is ROT13 encryption?", "No. It is a reversible substitution with no meaningful security, useful only for obscuring text or solving puzzles."] },
  },
  binary: {
    id: "ENC-06",
    zh: { name: "Binary 二进制转换器", short: "文本与二进制字节互转", lede: "在 UTF-8 文本和 8 位二进制字节之间转换，快速识别 CTF 题目中的 0/1 数据。", sample: "01100011 01110100 01100110 01111011 01100010 01101001 01110100 01110011 01111101", placeholder: "输入普通文本或 8 位二进制字节……", why: "二进制数据通常按 8 位组成一个字节。工具会自动判断输入是二进制还是普通文本。" },
    en: { name: "Binary Converter", short: "Convert text and binary bytes", lede: "Convert between UTF-8 text and 8-bit binary bytes while inspecting CTF clues.", sample: "01100011 01110100 01100110 01111011 01100010 01101001 01110100 01110011 01111101", placeholder: "Enter text or 8-bit binary bytes...", why: "Binary data is commonly grouped into 8-bit bytes. This tool automatically detects binary input and otherwise encodes text." },
    run(value) { const compact = value.replace(/\s+/g, ""); if (/^[01]+$/.test(compact)) { if (compact.length % 8 !== 0) throw new Error("Binary length must be divisible by 8"); return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(compact.match(/.{8}/g).map((byte) => parseInt(byte, 2)))); } return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(2).padStart(8, "0")).join(" "); },
    faq: { zh: ["为什么要求 8 位一组？", "一个字节包含 8 位。解码时，工具会忽略空格和换行，再按字节读取数据。"], en: ["Why are bits grouped by eight?", "One byte contains eight bits. Whitespace is ignored before the input is decoded byte by byte."] },
  },
  jwt: {
    id: "ENC-05",
    zh: { name: "JWT 解码器", short: "查看 JSON Web Token 内容", lede: "在浏览器本地解析 JWT 的 Header 和 Payload，帮助学习认证结构和检查题目中的令牌线索。", sample: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdGYtc3R1ZGVudCIsImFkbWluIjpmYWxzZX0.demo-signature", placeholder: "输入由点号分隔的 JWT……", why: "JWT 通常由 Header、Payload 和 Signature 三段组成。解码 Header 和 Payload 不等于验证签名，也不会证明令牌可信。" },
    en: { name: "JWT Decoder", short: "Inspect a JSON Web Token", lede: "Parse JWT headers and payloads locally to learn authentication structures and inspect token clues.", sample: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdGYtc3R1ZGVudCIsImFkbWluIjpmYWxzZX0.demo-signature", placeholder: "Enter a dot-separated JWT...", why: "A JWT usually has Header, Payload, and Signature sections. Decoding the first two does not verify the signature or make the token trustworthy." },
    run(value) { const parts = value.trim().split("."); if (parts.length < 2) throw new Error("JWT 至少需要 Header 和 Payload 两段"); return `header:\n${prettyJson(decodeBase64(parts[0]))}\n\npayload:\n${prettyJson(decodeBase64(parts[1]))}\n\nsignature:\n${parts[2] || "(none)"}`; },
    faq: { zh: ["这个工具会验证 JWT 签名吗？", "不会。它只解码 Header 和 Payload，适合学习和本地检查，不应被当作安全验证器。"], en: ["Does this tool verify JWT signatures?", "No. It only decodes the header and payload for learning and inspection. It is not a signature verifier."] },
  },
  hash: {
    id: "ANL-01",
    zh: { name: "SHA-256 Hash 生成器", short: "生成文本的 SHA-256 摘要", lede: "在浏览器本地计算 SHA-256 摘要，用于比对文本、验证练习结果或学习哈希函数。", sample: "ctf{local_first_toolbox}", placeholder: "输入需要生成 SHA-256 摘要的文本……", why: "哈希函数把输入映射为固定长度摘要。相同输入会得到相同摘要，但摘要不是可逆加密。" },
    en: { name: "SHA-256 Hash Generator", short: "Generate a SHA-256 digest", lede: "Calculate SHA-256 locally in your browser to compare text, verify practice results, or learn hashing.", sample: "ctf{local_first_toolbox}", placeholder: "Enter text to hash with SHA-256...", why: "A hash maps input to a fixed-length digest. The same input produces the same digest, but a digest is not reversible encryption." },
    async run(value) { if (!globalThis.crypto?.subtle) throw new Error("请通过静态服务器打开页面以使用 SHA-256"); const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); },
    faq: { zh: ["SHA-256 可以解密吗？", "不能。它是单向摘要函数，工具只能对输入计算摘要，不能从摘要还原原文。"], en: ["Can SHA-256 be decrypted?", "No. SHA-256 is a one-way digest function. This tool hashes input but cannot recover the original text from a digest."] },
  },
  stats: {
    id: "ANL-02",
    zh: { name: "文本统计工具", short: "统计字符、单词、行和唯一字符", lede: "快速查看一段文本的基础统计信息，适合分析题目输出、字典片段和文本线索。", sample: "The quick brown fox jumps over the lazy dog.\nctf{count_everything}", placeholder: "输入文本，查看基础统计……", why: "在处理长文本或题目输出时，字符数、行数和唯一字符数量可以帮助你快速判断数据形态。" },
    en: { name: "Text Statistics", short: "Count characters, words, lines, and unique characters", lede: "Inspect basic text statistics for challenge output, dictionary fragments, and other clues.", sample: "The quick brown fox jumps over the lazy dog.\nctf{count_everything}", placeholder: "Enter text to inspect its basic statistics...", why: "Character counts, line counts, and unique character counts can help you identify the shape of unknown text quickly." },
    run(value) { const chars = value.length; const noSpace = value.replace(/\s/g, "").length; const words = value.trim() ? value.trim().split(/\s+/).length : 0; const lines = value ? value.split(/\r?\n/).length : 0; const unique = new Set(value.replace(/\s/g, "").toLowerCase()).size; return `characters: ${chars}\nnon-space: ${noSpace}\nwords: ${words}\nlines: ${lines}\nunique chars: ${unique}`; },
    faq: { zh: ["文本统计会上传内容吗？", "不会。统计过程在当前浏览器中完成，页面不会向服务器发送输入文本。"], en: ["Is my text uploaded for statistics?", "No. The calculation runs in your browser and the page does not send the input text to a server."] },
  },
  timestamp: {
    id: "ANL-03",
    zh: { name: "Unix 时间戳转换器", short: "时间戳与可读日期互转", lede: "将 Unix 秒、毫秒时间戳或日期文本转换为 ISO、UTC 和本地时间。", sample: "1767225600", placeholder: "输入 Unix 时间戳或日期，例如 1767225600……", why: "日志、令牌和取证数据经常使用 Unix 时间戳。10 位通常表示秒，13 位通常表示毫秒。" },
    en: { name: "Unix Timestamp Converter", short: "Convert timestamps and readable dates", lede: "Convert Unix seconds, milliseconds, or date text into ISO, UTC, and local time.", sample: "1767225600", placeholder: "Enter a Unix timestamp or date, such as 1767225600...", why: "Logs, tokens, and forensic data frequently use Unix timestamps. Ten digits usually represent seconds and thirteen digits milliseconds." },
    run(value) { const trimmed = value.trim(); const numeric = /^-?\d+(?:\.\d+)?$/.test(trimmed); const number = numeric ? Number(trimmed) : NaN; const date = numeric ? new Date(Math.abs(number) < 1e12 ? number * 1000 : number) : new Date(trimmed); if (Number.isNaN(date.getTime())) throw new Error("Unrecognized date or timestamp"); return `ISO 8601: ${date.toISOString()}\nUTC: ${date.toUTCString()}\nLocal: ${date.toLocaleString(locale === "en" ? "en" : "zh-CN", { hour12: false })}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`; },
    faq: { zh: ["如何区分秒和毫秒时间戳？", "工具将绝对值小于一万亿的数字按秒处理，更大的数字按毫秒处理。"], en: ["How are seconds and milliseconds detected?", "Numbers with an absolute value below one trillion are treated as seconds; larger values are treated as milliseconds."] },
  },
  regex: {
    id: "ANL-04",
    zh: { name: "正则表达式测试器", short: "检查 JavaScript 正则匹配", lede: "第一行填写正则表达式，后续行填写测试文本，快速查看匹配内容和位置。", sample: "/flag\\{[^}]+\\}/gi\nnoise FLAG{first} ctf flag{second}", placeholder: "第一行输入 /正则/flags，后续行输入测试文本……", why: "正则表达式适合从日志、题目输出和长文本中定位具有固定结构的内容。最多显示前 200 个匹配。" },
    en: { name: "Regular Expression Tester", short: "Inspect JavaScript regex matches", lede: "Put a regular expression on the first line and test text below it to inspect matches and positions.", sample: "/flag\\{[^}]+\\}/gi\nnoise FLAG{first} ctf flag{second}", placeholder: "Enter /pattern/flags on line one and test text below...", why: "Regular expressions help locate structured values inside logs, challenge output, and long text. Up to 200 matches are displayed." },
    run: runRegex,
    faq: { zh: ["支持哪些正则标志？", "支持当前浏览器实现的 JavaScript 标志，例如 g、i、m、s、u 和 y。"], en: ["Which regex flags are supported?", "The JavaScript flags implemented by your browser are supported, including g, i, m, s, u, and y."] },
  },
  filehash: {
    id: "ANL-05",
    zh: { name: "文件 SHA-256 校验", short: "在本地计算文件哈希", lede: "选择本地文件并在浏览器中计算 SHA-256，不上传文件内容。", sample: "", placeholder: "选择一个文件后运行……", why: "文件哈希可以用于验证下载完整性、对比取证样本或确认两个文件是否一致。" },
    en: { name: "File SHA-256 Checksum", short: "Hash a file locally", lede: "Select a local file and calculate its SHA-256 digest in the browser without uploading its contents.", sample: "", placeholder: "Select a file, then run the tool...", why: "File hashes help verify download integrity, compare forensic samples, or confirm whether two files are identical." },
    isFile: true,
    async runFile(file) { if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable"); const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); return `file: ${file.name}\nsize: ${file.size} bytes\ntype: ${file.type || "unknown"}\nsha256: ${hash}`; },
    faq: { zh: ["文件会上传到服务器吗？", "不会。浏览器直接读取所选文件并计算摘要，页面不会上传文件内容。"], en: ["Is the file uploaded?", "No. Your browser reads the selected file and calculates the digest locally without uploading its contents."] },
  },
};

function encodeBase64(value) { const bytes = new TextEncoder().encode(value); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary); }
function decodeBase64(value) { const binary = atob(value.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/")); return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))); }
function isPrintable(value) { return Array.from(value).every((char) => char === "\n" || char === "\r" || char === "\t" || char.charCodeAt(0) >= 32); }
function prettyJson(value) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function runRegex(value) { const newline = value.indexOf("\n"); if (newline < 0) throw new Error("Put /pattern/flags on the first line and test text below it"); const expression = value.slice(0, newline).trim(); const text = value.slice(newline + 1); const parsed = expression.match(/^\/(.*)\/([dgimsuvy]*)$/); if (!parsed) throw new Error("Use the format /pattern/flags"); const flags = parsed[2].includes("g") ? parsed[2] : `${parsed[2]}g`; const matches = Array.from(text.matchAll(new RegExp(parsed[1], flags))).slice(0, 200); return matches.length ? matches.map((match, index) => `${index + 1}. [${match.index}] ${match[0]}`).join("\n") : "No matches"; }
function showToast(message) { const toast = document.querySelector("#toolToast"); toast.textContent = message; toast.classList.add("is-visible"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 2300); }

const locale = document.body.dataset.locale === "en" ? "en" : "zh";
const slug = location.pathname.split("/").filter(Boolean).at(-1) || "base64-decoder";
const slugMap = { "base64-decoder": "base64", "url-encoder-decoder": "url", "hex-converter": "hex", "rot13-decoder": "rot13", "jwt-decoder": "jwt", "sha256-generator": "hash", "text-statistics": "stats", "binary-converter": "binary", "timestamp-converter": "timestamp", "regex-tester": "regex", "file-hash": "filehash" };
const tool = pageTools[slugMap[slug]] || pageTools.base64;
const copy = tool[locale];
const input = document.querySelector("#toolInput");
const output = document.querySelector("#toolOutput");
const status = document.querySelector("#toolStatus");
const inputCount = document.querySelector("#toolInputCount");
const outputCount = document.querySelector("#toolOutputCount");

document.title = `${copy.name} | Hexforge`;
document.querySelector('meta[name="description"]').setAttribute("content", `${copy.lede} Hexforge CTF toolbox.`);
document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
document.querySelector('link[rel="canonical"]').setAttribute("href", `${location.origin}/${locale}/tools/${slug}/`);
document.querySelectorAll(".language-pair a").forEach((link) => {
  const targetLocale = link.textContent.trim().toLowerCase() === "en" ? "en" : "zh";
  link.href = `${location.origin}/${targetLocale}/tools/${slug}/`;
  link.classList.toggle("is-current", targetLocale === locale);
});
document.querySelectorAll(".site-nav a").forEach((link) => {
  if (link.textContent.trim() === "Workspace") link.href = `${location.origin}/`;
  if (link.textContent.trim() === "Tool directory") link.href = `${location.origin}/${locale}/`;
});
const alternateLinks = [
  ["zh-CN", `${location.origin}/zh/tools/${slug}/`],
  ["en", `${location.origin}/en/tools/${slug}/`],
];
alternateLinks.forEach(([hreflang, href]) => {
  if (document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)) return;
  const link = document.createElement("link");
  link.rel = "alternate";
  link.hreflang = hreflang;
  link.href = href;
  document.head.appendChild(link);
});
document.querySelector("#toolName").textContent = copy.name;
document.querySelector("#toolShort").textContent = copy.short;
document.querySelector("#toolLede").textContent = copy.lede;
document.querySelector("#toolWhy").textContent = copy.why;
document.querySelector("#toolInputLabel").textContent = locale === "en" ? "INPUT" : "输入";
document.querySelector("#toolOutputLabel").textContent = locale === "en" ? "OUTPUT" : "输出";
const inputHint = document.querySelector("#toolInputHint");
if (inputHint) inputHint.textContent = copy.placeholder;
document.querySelector("#toolId").textContent = tool.id;
document.querySelector("#runTool").innerHTML = locale === "en" ? "Run <span>→</span>" : "运行 <span>→</span>";
document.querySelector("#sampleTool").textContent = locale === "en" ? "Use example" : "填入示例";
document.querySelector("#copyTool").textContent = locale === "en" ? "Copy result" : "复制结果";
document.querySelector("#clearTool").textContent = locale === "en" ? "Clear" : "清空";
document.querySelector("#toolFaqTitle").textContent = locale === "en" ? "Common questions" : "常见问题";
document.querySelector("#toolFaqQuestion").textContent = tool.faq[locale][0];
document.querySelector("#toolFaqAnswer").textContent = tool.faq[locale][1];
document.querySelector("#privacyTitle").textContent = locale === "en" ? "Privacy first" : "隐私优先";
document.querySelector("#privacyCopy").textContent = tool.isFile
  ? (locale === "en" ? "The selected file is hashed in your browser and is never uploaded." : "所选文件只在浏览器中计算哈希，不会上传到服务器。")
  : (locale === "en" ? "Input is processed in your current browser. This MVP does not upload the text to a server." : "输入内容在当前浏览器中处理。这个 MVP 不会把文本上传到服务器。");
document.querySelector("#relatedTitle").textContent = locale === "en" ? "Related tools" : "相关工具";
input.placeholder = copy.placeholder;

const fileControl = document.createElement("div");
fileControl.className = "tool-file-control";
fileControl.hidden = !tool.isFile;
fileControl.innerHTML = `<label class="file-picker" for="toolFile">${locale === "en" ? "Choose file" : "选择文件"}</label><input class="file-input" id="toolFile" type="file"><span id="toolFileName">${locale === "en" ? "No file selected" : "尚未选择文件"}</span>`;
input.insertAdjacentElement("afterend", fileControl);
input.hidden = Boolean(tool.isFile);
const fileInput = document.querySelector("#toolFile");
const fileName = document.querySelector("#toolFileName");

function readList(key) { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
function writeList(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ } }
const recentTools = readList("hexforge-recent-tools").filter((item) => item !== slug);
writeList("hexforge-recent-tools", [slug, ...recentTools].slice(0, 11));
const favoriteButton = document.createElement("button");
favoriteButton.type = "button";
favoriteButton.className = "favorite-tool";
function renderFavorite() { const active = readList("hexforge-favorites").includes(slug); favoriteButton.textContent = active ? (locale === "en" ? "★ Favorited" : "★ 已收藏") : (locale === "en" ? "☆ Favorite" : "☆ 收藏"); favoriteButton.setAttribute("aria-pressed", String(active)); }
favoriteButton.addEventListener("click", () => { const favorites = readList("hexforge-favorites"); const next = favorites.includes(slug) ? favorites.filter((item) => item !== slug) : [slug, ...favorites]; writeList("hexforge-favorites", next); renderFavorite(); showToast(locale === "en" ? "Favorites updated." : "收藏已更新。"); });
document.querySelector(".workbench-top > span:last-child").prepend(favoriteButton, " · ");
renderFavorite();

function updateCount() { inputCount.textContent = `${input.value.length} chars`; outputCount.textContent = `${output.value.length} chars`; }
async function run() { const file = fileInput.files[0]; if (tool.isFile ? !file : !input.value) { showToast(tool.isFile ? (locale === "en" ? "Choose a file first." : "请先选择一个文件。") : (locale === "en" ? "Enter some text first." : "请先输入一段文本。")); (tool.isFile ? fileInput : input).focus(); return; } status.textContent = "WORKING"; try { output.value = tool.isFile ? await tool.runFile(file) : await tool.run(input.value); status.textContent = "DONE"; updateCount(); incrementToolMetric(slug, "success"); } catch (error) { output.value = error.message; status.textContent = "ERROR"; updateCount(); incrementToolMetric(slug, "error"); } }
function incrementToolMetric(toolSlug, result) { try { const metrics = JSON.parse(localStorage.getItem("hexforge-tool-metrics") || "{}"); const key = `${toolSlug}:${result}`; metrics[key] = (metrics[key] || 0) + 1; localStorage.setItem("hexforge-tool-metrics", JSON.stringify(metrics)); } catch { /* Metrics never block the tool. */ } }
document.querySelector("#runTool").addEventListener("click", run);
document.querySelector("#sampleTool").addEventListener("click", () => { if (tool.isFile) return showToast(locale === "en" ? "Choose a file from your device." : "请从设备中选择文件。"); input.value = copy.sample; updateCount(); input.focus(); });
document.querySelector("#clearTool").addEventListener("click", () => { input.value = ""; output.value = ""; fileInput.value = ""; fileName.textContent = locale === "en" ? "No file selected" : "尚未选择文件"; status.textContent = "WAITING"; updateCount(); });
document.querySelector("#copyTool").addEventListener("click", async () => { if (!output.value) return showToast(locale === "en" ? "There is no result to copy." : "当前没有可复制的结果。"); try { await navigator.clipboard.writeText(output.value); showToast(locale === "en" ? "Copied to clipboard." : "结果已复制到剪贴板。"); } catch { output.select(); document.execCommand("copy"); showToast(locale === "en" ? "Copied to clipboard." : "结果已复制到剪贴板。"); } });
input.addEventListener("input", updateCount);
input.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") run(); });
fileInput.addEventListener("change", () => { const file = fileInput.files[0]; fileName.textContent = file ? `${file.name} · ${file.size} bytes` : (locale === "en" ? "No file selected" : "尚未选择文件"); });
updateCount();
