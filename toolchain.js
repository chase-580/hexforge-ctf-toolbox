(function initializeToolchain() {
  const MAX_STEPS = 8;
  const STORAGE_KEY = "hexforge-chain-v1";
  const DEFAULT_STEPS = ["base64-decode", "rot13"];
  const DEFAULT_SAMPLE = "VXJ5eWIsIFBHUyE=";

  const operations = {
    "base64-decode": { label: "Base64 解码", run: decodeBase64Text },
    "base64-encode": { label: "Base64 编码", run: encodeBase64Text },
    "url-decode": { label: "URL 解码", run(value) { return decodeURIComponent(value); } },
    "url-encode": { label: "URL 编码", run(value) { return encodeURIComponent(value); } },
    "hex-decode": { label: "Hex 解码", run: decodeHexText },
    "hex-encode": { label: "Hex 编码", run: encodeHexText },
    "binary-decode": { label: "Binary 解码", run: decodeBinaryText },
    "binary-encode": { label: "Binary 编码", run: encodeBinaryText },
    rot13: { label: "ROT13 转换", run: applyRot13 },
    sha256: { label: "SHA-256 摘要", run: sha256 },
  };

  const elements = {
    steps: document.querySelector("#chainSteps"),
    add: document.querySelector("#addChainStep"),
    reset: document.querySelector("#resetChain"),
    sample: document.querySelector("#chainSample"),
    clear: document.querySelector("#chainClear"),
    input: document.querySelector("#chainInput"),
    output: document.querySelector("#chainOutput"),
    inputCount: document.querySelector("#chainInputCount"),
    outputCount: document.querySelector("#chainOutputCount"),
    run: document.querySelector("#runChain"),
    copy: document.querySelector("#copyChain"),
    status: document.querySelector("#chainStatus"),
    summary: document.querySelector("#chainSummary"),
    traceWrap: document.querySelector("#chainTraceWrap"),
    trace: document.querySelector("#chainTrace"),
    duration: document.querySelector("#chainDuration"),
  };

  if (!elements.steps) return;
  let chain = readChain();

  function readChain() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length && saved.length <= MAX_STEPS && saved.every((id) => operations[id])) return saved;
    } catch {
      // Invalid or blocked storage falls back to the default chain.
    }
    return [...DEFAULT_STEPS];
  }

  function saveChain() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chain)); } catch { /* Storage is optional. */ }
  }

  function renderSteps() {
    elements.steps.replaceChildren();
    chain.forEach((operationId, index) => {
      const row = document.createElement("div");
      row.className = "chain-step";
      row.dataset.index = String(index);

      const number = document.createElement("span");
      number.className = "chain-step-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const select = document.createElement("select");
      select.setAttribute("aria-label", `第 ${index + 1} 步工具`);
      Object.entries(operations).forEach(([id, operation]) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = operation.label;
        option.selected = id === operationId;
        select.append(option);
      });
      select.addEventListener("change", () => {
        chain[index] = select.value;
        saveChain();
        clearResult("CHANGED");
      });

      const up = makeStepButton("↑", "上移一步", index === 0, () => moveStep(index, index - 1));
      const down = makeStepButton("↓", "下移一步", index === chain.length - 1, () => moveStep(index, index + 1));
      const remove = makeStepButton("×", "删除步骤", chain.length === 1, () => removeStep(index));
      remove.classList.add("remove-step");
      row.append(number, select, up, down, remove);
      elements.steps.append(row);
    });
    elements.summary.textContent = `${chain.length} ${chain.length === 1 ? "STEP" : "STEPS"} · LOCAL`;
    elements.add.disabled = chain.length >= MAX_STEPS;
  }

  function makeStepButton(text, label, disabled, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    button.addEventListener("click", handler);
    return button;
  }

  function moveStep(from, to) {
    [chain[from], chain[to]] = [chain[to], chain[from]];
    saveChain();
    renderSteps();
    clearResult("REORDERED");
  }

  function removeStep(index) {
    if (chain.length === 1) return;
    chain.splice(index, 1);
    saveChain();
    renderSteps();
    clearResult("CHANGED");
  }

  function clearResult(nextStatus = "WAITING") {
    elements.output.value = "";
    elements.status.textContent = nextStatus;
    elements.traceWrap.hidden = true;
    elements.trace.replaceChildren();
    updateCounts();
  }

  function updateCounts() {
    elements.inputCount.textContent = `${elements.input.value.length} chars`;
    elements.outputCount.textContent = `${elements.output.value.length} chars`;
  }

  async function runChain() {
    if (!elements.input.value) {
      showToast("请先输入需要处理的文本。");
      elements.input.focus();
      return;
    }

    const started = performance.now();
    let current = elements.input.value;
    const trace = [];
    elements.status.textContent = "WORKING";
    elements.run.disabled = true;
    elements.traceWrap.hidden = false;

    try {
      for (let index = 0; index < chain.length; index += 1) {
        const operation = operations[chain[index]];
        const stepStarted = performance.now();
        try {
          current = await operation.run(current);
          trace.push({ index, label: operation.label, output: current, duration: performance.now() - stepStarted, status: "DONE" });
        } catch (error) {
          trace.push({ index, label: operation.label, output: error.message, duration: performance.now() - stepStarted, status: "ERROR" });
          throw new Error(`第 ${index + 1} 步失败：${error.message}`);
        }
      }
      elements.output.value = current;
      elements.status.textContent = "DONE";
      recordMetric("success");
    } catch (error) {
      elements.output.value = error.message;
      elements.status.textContent = "ERROR";
      recordMetric("error");
      showToast(error.message);
    } finally {
      const duration = performance.now() - started;
      renderTrace(trace);
      elements.duration.textContent = `${duration.toFixed(1)} ms · ${trace.length}/${chain.length} STEPS`;
      elements.run.disabled = false;
      updateCounts();
    }
  }

  function renderTrace(trace) {
    elements.trace.replaceChildren();
    trace.forEach((item) => {
      const article = document.createElement("article");
      article.className = `trace-step${item.status === "ERROR" ? " is-error" : ""}`;
      const head = document.createElement("div");
      head.className = "trace-step-head";
      const title = document.createElement("strong");
      title.textContent = `${String(item.index + 1).padStart(2, "0")} / ${item.label}`;
      const meta = document.createElement("span");
      meta.textContent = `${item.status} · ${item.duration.toFixed(1)} ms`;
      const output = document.createElement("pre");
      output.textContent = item.output || "(empty result)";
      head.append(title, meta);
      article.append(head, output);
      elements.trace.append(article);
    });
  }

  function recordMetric(result) {
    try {
      const metrics = JSON.parse(localStorage.getItem("hexforge-tool-metrics") || "{}");
      const key = `toolchain:${result}`;
      metrics[key] = (metrics[key] || 0) + 1;
      localStorage.setItem("hexforge-tool-metrics", JSON.stringify(metrics));
    } catch {
      // Local metrics never block execution.
    }
  }

  function encodeBase64Text(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function decodeBase64Text(value) {
    const compact = value.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new Error("无效的 Base64 输入");
    const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, "=");
    const binary = atob(padded);
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  }

  function encodeHexText(value) {
    return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
  }

  function decodeHexText(value) {
    const compact = value.replace(/(?:0x)|[\s,:-]/gi, "");
    if (!compact || !/^(?:[0-9a-fA-F]{2})+$/.test(compact)) throw new Error("Hex 必须由完整的两位字节组成");
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(compact.match(/.{2}/g).map((byte) => parseInt(byte, 16))));
  }

  function encodeBinaryText(value) {
    return Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
  }

  function decodeBinaryText(value) {
    const compact = value.replace(/\s+/g, "");
    if (!compact || !/^[01]+$/.test(compact) || compact.length % 8 !== 0) throw new Error("Binary 必须由完整的 8 位字节组成");
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(compact.match(/.{8}/g).map((byte) => parseInt(byte, 2))));
  }

  function applyRot13(value) {
    return value.replace(/[a-zA-Z]/g, (char) => {
      const base = char <= "Z" ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
    });
  }

  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("当前浏览器不支持 Web Crypto");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  elements.add.addEventListener("click", () => {
    if (chain.length >= MAX_STEPS) return showToast("一条工具链最多包含 8 个步骤。");
    chain.push("rot13");
    saveChain();
    renderSteps();
    clearResult("CHANGED");
  });
  elements.reset.addEventListener("click", () => {
    chain = [...DEFAULT_STEPS];
    saveChain();
    renderSteps();
    clearResult("RESET");
  });
  elements.sample.addEventListener("click", () => {
    chain = [...DEFAULT_STEPS];
    elements.input.value = DEFAULT_SAMPLE;
    saveChain();
    renderSteps();
    clearResult("READY");
    elements.input.focus();
  });
  elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    clearResult();
    elements.input.focus();
  });
  elements.copy.addEventListener("click", async () => {
    if (!elements.output.value) return showToast("当前没有可复制的工具链结果。");
    try {
      await navigator.clipboard.writeText(elements.output.value);
    } catch {
      elements.output.select();
      document.execCommand("copy");
    }
    showToast("工具链结果已复制到剪贴板。");
  });
  elements.run.addEventListener("click", runChain);
  elements.input.addEventListener("input", updateCounts);
  elements.input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runChain();
  });

  renderSteps();
  updateCounts();
})();
