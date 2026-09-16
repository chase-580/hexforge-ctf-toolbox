const toolDefinitions = {
  base64: {
    label: "Base64 encoder / decoder",
    id: "ENC-01",
    sample: "Y3RmIHJlc2VhcmNoIGJlZ2lucyBoZXJl",
    placeholder: "输入 Base64 或普通文本……",
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
    placeholder: "输入 URL 或包含特殊字符的文本……",
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
    placeholder: "输入普通文本或十六进制字节……",
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
    placeholder: "输入需要进行 ROT13 替换的文本……",
    run(value) {
      return value.replace(/[a-zA-Z]/g, (char) => {
        const base = char <= "Z" ? 65 : 97;
        return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
      });
    },
  },
  stats: {
    label: "Text statistics",
    id: "ANL-01",
    sample: "The quick brown fox jumps over the lazy dog.\nctf{count_everything}",
    placeholder: "输入文本，查看字符、单词与行统计……",
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
    id: "ANL-02",
    sample: "ctf{local_first_toolbox}",
    placeholder: "输入需要生成 SHA-256 摘要的文本……",
    async run(value) {
      if (!globalThis.crypto?.subtle) throw new Error("请通过静态服务器打开页面以使用 SHA-256");
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
    elements.recentList.innerHTML = '<div class="recent-empty">运行一个工具后，最近操作会显示在这里。</div>';
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
  elements.runStatus.textContent = "WAITING";
}

async function runTool() {
  const tool = toolDefinitions[state.selectedTool];
  const value = elements.inputText.value;
  if (!value) {
    showToast("先输入一段文本，再运行工具。");
    elements.inputText.focus();
    return;
  }
  elements.runStatus.textContent = "WORKING";
  try {
    elements.outputText.value = await tool.run(value);
    elements.runStatus.textContent = "DONE";
    updateMeta();
    state.recent.unshift({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      toolId: tool.id,
      preview: value.slice(0, 90).replace(/\n/g, " "),
      input: value,
      output: elements.outputText.value,
      tool: state.selectedTool,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    });
    state.recent = state.recent.slice(0, 5);
    saveRecent();
    renderRecent();
  } catch (error) {
    elements.outputText.value = `无法处理输入：${error.message}`;
    elements.runStatus.textContent = "ERROR";
    updateMeta();
    showToast("输入格式不符合当前工具要求。");
  }
}

document.querySelectorAll(".tool-card").forEach((card) => {
  card.addEventListener("click", () => selectTool(card.dataset.tool));
});

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((nav) => nav.classList.remove("is-active"));
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
  elements.inputText.value = toolDefinitions[state.selectedTool].sample;
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
  elements.runStatus.textContent = "WAITING";
  updateMeta();
});

document.querySelector("#swapButton").addEventListener("click", () => {
  const input = elements.inputText.value;
  elements.inputText.value = elements.outputText.value;
  elements.outputText.value = input;
  elements.runStatus.textContent = "SWAPPED";
  updateMeta();
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  if (!elements.outputText.value) {
    showToast("当前没有可复制的结果。");
    return;
  }
  try {
    await navigator.clipboard.writeText(elements.outputText.value);
    showToast("结果已复制到剪贴板。");
  } catch {
    elements.outputText.select();
    document.execCommand("copy");
    showToast("结果已复制到剪贴板。");
  }
});

document.querySelector("#clearRecentButton").addEventListener("click", () => {
  state.recent = [];
  clearStoredRecent();
  renderRecent();
  showToast("最近使用记录已清除。");
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
  showToast(document.body.classList.contains("is-light") ? "已切换到深色工作台。" : "已切换到纸面模式。");
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
