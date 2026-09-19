const isEnglish = document.documentElement.lang.toLowerCase().startsWith("en");
const ui = (english, chinese) => isEnglish ? english : chinese;

const toolDefinitions = {
  base64: {
    label: "Base64 encoder / decoder",
    id: "ENC-01",
    sample: "Y3RmIHJlc2VhcmNoIGJlZ2lucyBoZXJl",
    placeholder: ui("Enter Base64 or plain text…", "输入 Base64 或普通文本……"),
    run(value) {
      if (!value) return "";
      const compact = value.replace(/\s/g, "");
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(compact) && compact.length % 4 === 0) {
        try {
          const decoded = decodeBase64(value);
          if (isPrintable(decoded)) return decoded;
        } catch {
          // Fall through to encoding when the input is not valid Base64.
        }
      }
      return encodeBase64(value);
    },
  },
  url: {
    label: "URL encoder / decoder",
    id: "ENC-02",
    sample: "https://example.com/search?q=ctf notes",
    placeholder: ui("Enter a URL or text containing special characters…", "输入 URL 或包含特殊字符的文本……"),
    run(value) {
      if (!value) return "";
      if (/%[0-9a-f]{2}/i.test(value)) {
        try {
          return decodeURIComponent(value);
        } catch {
          return encodeURIComponent(value);
        }
      }
      return encodeURIComponent(value);
    },
  },
  hex: {
    label: "Hex encoder / decoder",
    id: "ENC-03",
    sample: "63 74 66 7b 68 65 78 5f 6c 61 62 7d",
    placeholder: ui("Enter plain text or hexadecimal bytes…", "输入普通文本或十六进制字节……"),
    run(value) {
      if (!value) return "";
      const compact = value.replace(/\s+/g, "");
      if (/^(?:[0-9a-fA-F]{2})+$/.test(compact)) {
        return compact.match(/.{2}/g).map((byte) => String.fromCharCode(parseInt(byte, 16))).join("");
      }
      return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
    },
  },
  rot13: {
    label: "ROT13 transformer",
    id: "ENC-04",
    sample: "Gur synt vf va gur frperg",
    placeholder: ui("Enter text to transform with ROT13…", "输入需要进行 ROT13 替换的文本……"),
    run(value) {
      return value.replace(/[a-zA-Z]/g, (char) => {
        const base = char <= "Z" ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
      });
    },
  },
  binary: {
    label: "Binary text converter",
    id: "ENC-06",
    sample: "01100011 01110100 01100110 01111011 01100010 01101001 01110100 01110011 01111101",
    placeholder: ui("Enter plain text or 8-bit binary bytes…", "输入普通文本或 8 位二进制字节……"),
    run(value) {
      const compact = value.replace(/\s+/g, "");
      if (/^[01]+$/.test(compact)) {
        if (compact.length % 8 !== 0) throw new Error(ui("Binary input must contain complete 8-bit bytes", "二进制长度必须是 8 的倍数"));
        const bytes = compact.match(/.{8}/g).map((byte) => parseInt(byte, 2));
        return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
      }
      return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
    },
  },
  stats: {
    label: "Text statistics",
    id: "ANL-02",
    sample: "The quick brown fox jumps over the lazy dog.\nctf{count_everything}",
    placeholder: ui("Enter text to count characters, words, and lines…", "输入文本，查看字符、单词与行统计……"),
    run(value) {
      const chars = value.length;
      const noSpace = value.replace(/\s/g, "").length;
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      const lines = value ? value.split(/\r?\n/).length : 0;
      const unique = new Set(value.replace(/\s/g, "").toLowerCase()).size;
      return `characters: ${chars}\nnon-space: ${noSpace}\nwords: ${words}\nlines: ${lines}\nunique chars: ${unique}`;
    },
  },
  hash: {
    label: "SHA-256 digest",
    id: "ANL-01",
    sample: "ctf{local_first_toolbox}",
    placeholder: ui("Enter text to hash with SHA-256…", "输入需要生成 SHA-256 摘要的文本……"),
    async run(value) {
      if (!globalThis.crypto?.subtle) throw new Error(ui("Open the page through a static server to use SHA-256", "请通过静态服务器打开页面以使用 SHA-256"));
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
  },
  jwt: {
    label: "JWT inspector",
    id: "ENC-05",
    sample: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdGYtc3R1ZGVudCIsImFkbWluIjpmYWxzZX0.demo-signature",
    placeholder: ui("Enter a dot-separated JWT…", "输入由点号分隔的 JWT……"),
    run(value) {
      const parts = value.trim().split(".");
      if (parts.length < 2) throw new Error(ui("A JWT needs at least a header and payload", "JWT 至少需要 Header 和 Payload 两段"));
      return `header:\n${prettyJson(decodeBase64Url(parts[0]))}\n\npayload:\n${prettyJson(decodeBase64Url(parts[1]))}\n\nsignature:\n${parts[2] || "(none)"}`;
    },
  },
  timestamp: {
    label: "Unix timestamp converter",
    id: "ANL-03",
    sample: "1767225600",
    placeholder: ui("Enter a Unix timestamp or date, such as 1767225600 or 2026-01-01…", "输入 Unix 时间戳或日期，例如 1767225600 或 2026-01-01……"),
    run(value) {
      const trimmed = value.trim();
      let date;
      if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        const numeric = Number(trimmed);
        date = new Date(Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric);
      } else {
        date = new Date(trimmed);
      }
      if (Number.isNaN(date.getTime())) throw new Error(ui("Could not parse the date or timestamp", "无法识别日期或时间戳"));
      return `ISO 8601: ${date.toISOString()}\nUTC: ${date.toUTCString()}\n${ui("Local time", "本地时间")}: ${date.toLocaleString(isEnglish ? "en-US" : "zh-CN", { hour12: false })}\n${ui("Unix seconds", "Unix 秒")}: ${Math.floor(date.getTime() / 1000)}\n${ui("Unix milliseconds", "Unix 毫秒")}: ${date.getTime()}`;
    },
  },
  regex: {
    label: "Regular expression tester",
    id: "ANL-04",
    sample: "/flag\\{[^}]+\\}/gi\nnoise FLAG{first} ctf flag{second}",
    placeholder: ui("Put /pattern/flags on the first line and test text below…", "第一行输入 /正则/flags，后续行输入待匹配文本……"),
    run: runRegex,
  },
  filehash: {
    label: "File SHA-256",
    id: "ANL-05",
    sample: "",
    placeholder: ui("Choose a file to hash locally. It will not be uploaded…", "选择文件后运行，文件不会上传……"),
    isFile: true,
    async runFile(file) {
      if (!globalThis.crypto?.subtle) throw new Error(ui("This browser does not support Web Crypto", "当前浏览器不支持 Web Crypto"));
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      return `file: ${file.name}\nsize: ${file.size} bytes\ntype: ${file.type || "unknown"}\nsha256: ${hash}`;
    },
  },
};

const state = {
  selectedTool: "base64",
  recent: readRecent(),
};

const elements = {
  toolSearch: document.querySelector("#toolSearch"),
  emptyState: document.querySelector("#emptyState"),
  selectedToolLabel: document.querySelector("#selectedToolLabel"),
  inputText: document.querySelector("#inputText"),
  outputText: document.querySelector("#outputText"),
  inputMeta: document.querySelector("#inputMeta"),
  outputMeta: document.querySelector("#outputMeta"),
  runStatus: document.querySelector("#runStatus"),
  recentList: document.querySelector("#recentList"),
  toast: document.querySelector("#toast"),
  fileControl: document.querySelector("#fileControl"),
  fileInput: document.querySelector("#fileInput"),
  selectedFileName: document.querySelector("#selectedFileName"),
};

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeBase64(normalized);
}

function prettyJson(value) {
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

function runRegex(value) {
  const newline = value.indexOf("\n");
  if (newline < 0) throw new Error(ui("Put /pattern/flags on the first line and test text below", "第一行填写 /正则/flags，第二行开始填写测试文本"));
  const expression = value.slice(0, newline).trim();
  const text = value.slice(newline + 1);
  const parsed = expression.match(/^\/(.*)\/([dgimsuvy]*)$/);
  if (!parsed) throw new Error(ui("Use the format /pattern/flags", "正则格式应为 /pattern/flags"));
  const flags = parsed[2].includes("g") ? parsed[2] : `${parsed[2]}g`;
  const regex = new RegExp(parsed[1], flags);
  const matches = Array.from(text.matchAll(regex)).slice(0, 200);
  if (!matches.length) return "No matches";
  return matches.map((match, index) => `${index + 1}. [${match.index}] ${match[0]}`).join("\n");
}

function isPrintable(value) {
  return Array.from(value).every((char) => char === "\n" || char === "\r" || char === "\t" || char.charCodeAt(0) >= 32);
}

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem("hexforge-recent") || "[]");
  } catch {
    return [];
  }
}

function saveRecent() {
  try {
    localStorage.setItem("hexforge-recent", JSON.stringify(state.recent));
  } catch {
    // The toolbox remains usable when browser storage is blocked.
  }
}

function clearStoredRecent() {
  try {
    localStorage.removeItem("hexforge-recent");
  } catch {
    // Nothing to clear when browser storage is blocked.
  }
}

function recordToolMetric(toolId, result) {
  try {
    const metrics = JSON.parse(localStorage.getItem("hexforge-tool-metrics") || "{}");
    const key = `${toolId}:${result}`;
    metrics[key] = (metrics[key] || 0) + 1;
    localStorage.setItem("hexforge-tool-metrics", JSON.stringify(metrics));
    const slugMap = { base64: "base64-decoder", url: "url-encoder-decoder", hex: "hex-converter", rot13: "rot13-decoder", binary: "binary-converter", jwt: "jwt-decoder", hash: "sha256-generator", stats: "text-statistics", timestamp: "timestamp-converter", regex: "regex-tester", filehash: "file-hash" };
    const slug = slugMap[toolId];
    const recent = JSON.parse(localStorage.getItem("hexforge-recent-tools") || "[]").filter((item) => item !== slug);
    localStorage.setItem("hexforge-recent-tools", JSON.stringify([slug, ...recent].slice(0, 11)));
  } catch {
    // Local metrics never block the tool.
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

function updateMeta() {
  elements.inputMeta.textContent = `${elements.inputText.value.length} chars`;
  elements.outputMeta.textContent = `${elements.outputText.value.length} chars`;
}

function renderRecent() {
  if (!state.recent.length) {
    elements.recentList.innerHTML = `<div class="recent-empty">${ui("Run a tool and your recent activity will appear here.", "运行一个工具后，最近操作会显示在这里。")}</div>`;
    return;
  }
  elements.recentList.innerHTML = state.recent.map((item) => `
    <button class="recent-row" type="button" data-recent-id="${item.id}">
      <span class="recent-tool">${item.toolId}</span>
      <span class="recent-preview">${escapeHtml(item.preview)}</span>
      <span class="recent-time">${item.time}</span>
    </button>
  `).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function selectTool(toolId) {
  state.selectedTool = toolId;
  const tool = toolDefinitions[toolId];
  document.querySelectorAll(".tool-card").forEach((card) => card.classList.toggle("is-selected", card.dataset.tool === toolId));
  elements.selectedToolLabel.textContent = tool.label;
  elements.inputText.placeholder = tool.placeholder;
  elements.fileControl.hidden = !tool.isFile;
  elements.inputText.closest(".editor-column").classList.toggle("is-file-mode", Boolean(tool.isFile));
  elements.runStatus.textContent = "WAITING";
}

async function runTool() {
  const tool = toolDefinitions[state.selectedTool];
  const value = elements.inputText.value;
  const file = elements.fileInput.files[0];
  if (tool.isFile ? !file : !value) {
    showToast(tool.isFile ? ui("Choose a file first.", "请先选择一个文件。") : ui("Enter some text before running the tool.", "先输入一段文本，再运行工具。"));
    (tool.isFile ? elements.fileInput : elements.inputText).focus();
    return;
  }
  elements.runStatus.textContent = "WORKING";
  try {
    elements.outputText.value = tool.isFile ? await tool.runFile(file) : await tool.run(value);
    elements.runStatus.textContent = "DONE";
    recordToolMetric(state.selectedTool, "success");
    updateMeta();
    state.recent.unshift({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      toolId: tool.id,
      preview: tool.isFile ? file.name : value.slice(0, 90).replace(/\n/g, " "),
      input: tool.isFile ? "" : value,
      output: elements.outputText.value,
      tool: state.selectedTool,
      time: new Date().toLocaleTimeString(isEnglish ? "en-US" : "zh-CN", { hour: "2-digit", minute: "2-digit" }),
    });
    state.recent = state.recent.slice(0, 5);
    saveRecent();
    renderRecent();
  } catch (error) {
    elements.outputText.value = isEnglish ? `Unable to process input: ${error.message}` : `无法处理输入：${error.message}`;
    elements.runStatus.textContent = "ERROR";
    updateMeta();
    showToast(ui("The input does not match this tool's expected format.", "输入格式不符合当前工具要求。"));
    recordToolMetric(state.selectedTool, "error");
  }
}

document.querySelectorAll(".tool-card").forEach((card) => {
  card.addEventListener("click", () => selectTool(card.dataset.tool));
});

document.querySelectorAll(".nav-item[data-category]").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item[data-category]").forEach((nav) => nav.classList.remove("is-active"));
    item.classList.add("is-active");
    const category = item.dataset.category;
    document.querySelectorAll(".tool-card").forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
    elements.emptyState.hidden = Boolean(document.querySelector(".tool-card:not([hidden])"));
  });
});

elements.toolSearch.addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll(".tool-card").forEach((card) => {
    const match = !query || card.textContent.toLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible += 1;
  });
  elements.emptyState.hidden = visible > 0;
});

document.querySelector("#sampleButton").addEventListener("click", () => {
  const tool = toolDefinitions[state.selectedTool];
  if (tool.isFile) return showToast(ui("Choose a file from your device for this tool.", "文件工具需要从设备选择一个文件。"));
  elements.inputText.value = tool.sample;
  updateMeta();
  elements.inputText.focus();
});

document.querySelector("#runButton").addEventListener("click", runTool);
elements.inputText.addEventListener("input", updateMeta);
elements.inputText.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runTool();
});

document.querySelector("#clearButton").addEventListener("click", () => {
  elements.inputText.value = "";
  elements.outputText.value = "";
  elements.fileInput.value = "";
  elements.selectedFileName.textContent = ui("No file selected", "尚未选择文件");
  elements.runStatus.textContent = "WAITING";
  updateMeta();
});

document.querySelector("#swapButton").addEventListener("click", () => {
  if (toolDefinitions[state.selectedTool].isFile) return showToast(ui("A file hash result cannot be swapped into the input field.", "文件哈希结果不能交换到输入区。"));
  const input = elements.inputText.value;
  elements.inputText.value = elements.outputText.value;
  elements.outputText.value = input;
  elements.runStatus.textContent = "SWAPPED";
  updateMeta();
});

elements.fileInput.addEventListener("change", () => {
  const file = elements.fileInput.files[0];
  elements.selectedFileName.textContent = file ? `${file.name} · ${file.size} bytes` : ui("No file selected", "尚未选择文件");
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  if (!elements.outputText.value) {
    showToast(ui("There is no result to copy.", "当前没有可复制的结果。"));
    return;
  }
  try {
    await navigator.clipboard.writeText(elements.outputText.value);
    showToast(ui("Copied to clipboard.", "结果已复制到剪贴板。"));
  } catch {
    elements.outputText.select();
    document.execCommand("copy");
    showToast(ui("Copied to clipboard.", "结果已复制到剪贴板。"));
  }
});

document.querySelector("#clearRecentButton").addEventListener("click", () => {
  state.recent = [];
  clearStoredRecent();
  renderRecent();
  showToast(ui("Recent activity cleared.", "最近使用记录已清除。"));
});

elements.recentList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-recent-id]");
  if (!row) return;
  const item = state.recent.find((entry) => entry.id === row.dataset.recentId);
  if (!item) return;
  selectTool(item.tool);
  elements.inputText.value = item.input;
  elements.outputText.value = item.output;
  elements.runStatus.textContent = "RESTORED";
  updateMeta();
  document.querySelector(".lab-section").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("is-light");
  showToast(document.body.classList.contains("is-light") ? ui("Dark workspace enabled.", "已切换到深色工作台。") : ui("Light workspace enabled.", "已切换到纸面模式。"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    event.preventDefault();
    elements.toolSearch.focus();
  }
});

selectTool(state.selectedTool);
renderRecent();
updateMeta();
