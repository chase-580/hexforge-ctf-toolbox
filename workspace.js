(function initializeChallengeWorkspace() {
  const STORAGE_KEY = "hexforge-workspaces-v1";
  const MAX_CHALLENGES = 50;
  const MAX_ARTIFACTS = 30;
  const MAX_ARTIFACT_LENGTH = 20000;

  const elements = {
    section: document.querySelector("#challengeWorkspace"),
    navCount: document.querySelector("#workspaceNavCount"),
    summary: document.querySelector("#challengeSummary"),
    solvedCount: document.querySelector("#challengeSolvedCount"),
    list: document.querySelector("#challengeList"),
    empty: document.querySelector("#challengeEmpty"),
    editor: document.querySelector("#challengeEditor"),
    newButton: document.querySelector("#newChallengeButton"),
    emptyNewButton: document.querySelector("#emptyNewChallenge"),
    name: document.querySelector("#challengeName"),
    category: document.querySelector("#challengeCategory"),
    difficulty: document.querySelector("#challengeDifficulty"),
    tags: document.querySelector("#challengeTags"),
    notes: document.querySelector("#challengeNotes"),
    flag: document.querySelector("#challengeFlag"),
    statusButton: document.querySelector("#challengeStatusButton"),
    deleteButton: document.querySelector("#deleteChallengeButton"),
    saveState: document.querySelector("#challengeSaveState"),
    artifacts: document.querySelector("#challengeArtifacts"),
    artifactCount: document.querySelector("#artifactCount"),
    dialog: document.querySelector("#challengeDialog"),
    form: document.querySelector("#challengeForm"),
    newName: document.querySelector("#newChallengeName"),
    newCategory: document.querySelector("#newChallengeCategory"),
    newDifficulty: document.querySelector("#newChallengeDifficulty"),
    newTags: document.querySelector("#newChallengeTags"),
    saveToolResult: document.querySelector("#saveToolResult"),
    saveChainResult: document.querySelector("#saveChainResult"),
  };

  if (!elements.section) return;

  let state = readState();
  let saveTimer = 0;
  let pendingArtifact = null;

  function createId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function notify(message) {
    if (typeof showToast === "function") showToast(message);
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.challenges)) return { activeId: null, challenges: [] };
      const challenges = parsed.challenges.slice(0, MAX_CHALLENGES).map(normalizeChallenge).filter(Boolean);
      const activeId = challenges.some((item) => item.id === parsed.activeId) ? parsed.activeId : challenges[0]?.id || null;
      return { activeId, challenges };
    } catch {
      return { activeId: null, challenges: [] };
    }
  }

  function normalizeChallenge(item) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") return null;
    return {
      id: item.id,
      name: item.name.slice(0, 80) || "未命名题目",
      category: ["Web", "Crypto", "Pwn", "Reverse", "Forensics", "Misc"].includes(item.category) ? item.category : "Misc",
      difficulty: ["Easy", "Medium", "Hard", "Insane"].includes(item.difficulty) ? item.difficulty : "Medium",
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string").slice(0, 12) : [],
      notes: typeof item.notes === "string" ? item.notes.slice(0, 50000) : "",
      flag: typeof item.flag === "string" ? item.flag.slice(0, 500) : "",
      status: item.status === "solved" ? "solved" : "active",
      artifacts: Array.isArray(item.artifacts) ? item.artifacts.slice(0, MAX_ARTIFACTS).map(normalizeArtifact).filter(Boolean) : [],
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Date.now(),
    };
  }

  function normalizeArtifact(item) {
    if (!item || typeof item !== "object" || typeof item.content !== "string") return null;
    return {
      id: typeof item.id === "string" ? item.id : createId(),
      label: typeof item.label === "string" ? item.label.slice(0, 80) : "工具结果",
      content: item.content.slice(0, MAX_ARTIFACT_LENGTH),
      createdAt: Number(item.createdAt) || Date.now(),
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      notify("本地存储空间不足，当前修改可能无法保留。");
      return false;
    }
  }

  function getActiveChallenge() {
    return state.challenges.find((item) => item.id === state.activeId) || null;
  }

  function parseTags(value) {
    return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    renderSummary();
    renderList();
    renderEditor();
  }

  function renderSummary() {
    const count = state.challenges.length;
    const solved = state.challenges.filter((item) => item.status === "solved").length;
    elements.navCount.textContent = String(count).padStart(2, "0");
    elements.summary.textContent = `${count} ${count === 1 ? "CHALLENGE" : "CHALLENGES"} · LOCAL`;
    elements.solvedCount.textContent = `${solved} / ${count} SOLVED`;
  }

  function renderList() {
    elements.list.replaceChildren();
    if (!state.challenges.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-list-empty";
      empty.textContent = "创建题目后，它们会按最近修改时间显示在这里。";
      elements.list.append(empty);
      return;
    }

    [...state.challenges].sort((a, b) => b.updatedAt - a.updatedAt).forEach((challenge) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `challenge-list-item${challenge.id === state.activeId ? " is-active" : ""}${challenge.status === "solved" ? " is-solved" : ""}`;
      button.dataset.challengeId = challenge.id;

      const marker = document.createElement("span");
      marker.className = "challenge-list-marker";
      marker.setAttribute("aria-hidden", "true");

      const copy = document.createElement("span");
      copy.className = "challenge-list-copy";
      const title = document.createElement("strong");
      title.textContent = challenge.name;
      const meta = document.createElement("span");
      meta.className = "challenge-list-meta";
      const type = document.createElement("span");
      type.textContent = `${challenge.category} · ${challenge.difficulty}`;
      const status = document.createElement("span");
      status.textContent = challenge.status === "solved" ? "SOLVED" : "ACTIVE";
      meta.append(type, status);
      copy.append(title, meta);
      button.append(marker, copy);
      elements.list.append(button);
    });
  }

  function renderEditor() {
    const challenge = getActiveChallenge();
    elements.empty.hidden = Boolean(challenge);
    elements.editor.hidden = !challenge;
    if (!challenge) return;

    elements.name.value = challenge.name;
    elements.category.value = challenge.category;
    elements.difficulty.value = challenge.difficulty;
    elements.tags.value = challenge.tags.join(", ");
    elements.notes.value = challenge.notes;
    elements.flag.value = challenge.flag;
    elements.statusButton.textContent = challenge.status === "solved" ? "已解决 ✓" : "标记已解";
    elements.statusButton.classList.toggle("is-solved", challenge.status === "solved");
    elements.saveState.textContent = `SAVED · ${formatDate(challenge.updatedAt)}`;
    renderArtifacts(challenge);
  }

  function renderArtifacts(challenge) {
    elements.artifacts.replaceChildren();
    elements.artifactCount.textContent = `${challenge.artifacts.length} ${challenge.artifacts.length === 1 ? "ITEM" : "ITEMS"}`;
    if (!challenge.artifacts.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-artifacts-empty";
      empty.textContent = "运行工具后，点击“存入题目”保存关键结果。";
      elements.artifacts.append(empty);
      return;
    }

    challenge.artifacts.forEach((artifact) => {
      const article = document.createElement("article");
      article.className = "challenge-artifact";
      const head = document.createElement("div");
      head.className = "challenge-artifact-head";
      const label = document.createElement("strong");
      label.textContent = artifact.label;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "移除结果";
      remove.setAttribute("aria-label", `移除 ${artifact.label}`);
      remove.dataset.artifactId = artifact.id;
      const content = document.createElement("pre");
      content.textContent = artifact.content;
      const time = document.createElement("time");
      time.dateTime = new Date(artifact.createdAt).toISOString();
      time.textContent = formatDate(artifact.createdAt);
      head.append(label, remove);
      article.append(head, content, time);
      elements.artifacts.append(article);
    });
  }

  function openCreateDialog() {
    if (state.challenges.length >= MAX_CHALLENGES) {
      notify("本地工作区最多保存 50 个题目。");
      return;
    }
    elements.form.reset();
    elements.newDifficulty.value = "Medium";
    elements.dialog.showModal();
    window.setTimeout(() => elements.newName.focus(), 0);
  }

  function createChallenge() {
    const name = elements.newName.value.trim();
    if (!name) return;
    const now = Date.now();
    const challenge = {
      id: createId(),
      name,
      category: elements.newCategory.value,
      difficulty: elements.newDifficulty.value,
      tags: parseTags(elements.newTags.value),
      notes: "",
      flag: "",
      status: "active",
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };
    state.challenges.push(challenge);
    state.activeId = challenge.id;
    if (pendingArtifact) {
      challenge.artifacts.unshift(pendingArtifact);
      pendingArtifact = null;
    }
    persist();
    render();
    elements.dialog.close();
    elements.section.scrollIntoView({ behavior: "smooth", block: "start" });
    notify("题目工作区已创建并保存在当前浏览器。");
  }

  function updateActive(field, value, immediate = false) {
    const challenge = getActiveChallenge();
    if (!challenge) return;
    challenge[field] = value;
    challenge.updatedAt = Date.now();
    elements.saveState.textContent = "SAVING...";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      persist();
      renderSummary();
      renderList();
      elements.saveState.textContent = `SAVED · ${formatDate(challenge.updatedAt)}`;
    }, immediate ? 0 : 350);
  }

  function captureArtifact(label, content) {
    if (!content) {
      notify("当前没有可保存的结果。");
      return;
    }
    const truncated = content.length > MAX_ARTIFACT_LENGTH;
    const artifact = { id: createId(), label, content: content.slice(0, MAX_ARTIFACT_LENGTH), createdAt: Date.now() };
    const challenge = getActiveChallenge();
    if (!challenge) {
      pendingArtifact = artifact;
      openCreateDialog();
      notify("先创建题目，当前结果会自动加入新题目。");
      return;
    }
    challenge.artifacts.unshift(artifact);
    challenge.artifacts = challenge.artifacts.slice(0, MAX_ARTIFACTS);
    challenge.updatedAt = Date.now();
    persist();
    renderSummary();
    renderList();
    renderArtifacts(challenge);
    notify(truncated ? "结果已截取前 20,000 字符并存入题目。" : "结果已存入当前题目。");
  }

  elements.newButton.addEventListener("click", openCreateDialog);
  elements.emptyNewButton.addEventListener("click", openCreateDialog);
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.submitter?.value === "cancel") {
      pendingArtifact = null;
      elements.dialog.close();
      return;
    }
    createChallenge();
  });
  elements.dialog.addEventListener("cancel", () => { pendingArtifact = null; });

  elements.list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-challenge-id]");
    if (!button) return;
    state.activeId = button.dataset.challengeId;
    persist();
    render();
  });

  elements.name.addEventListener("input", () => updateActive("name", elements.name.value.slice(0, 80) || "未命名题目"));
  elements.category.addEventListener("change", () => updateActive("category", elements.category.value, true));
  elements.difficulty.addEventListener("change", () => updateActive("difficulty", elements.difficulty.value, true));
  elements.tags.addEventListener("input", () => updateActive("tags", parseTags(elements.tags.value)));
  elements.notes.addEventListener("input", () => updateActive("notes", elements.notes.value.slice(0, 50000)));
  elements.flag.addEventListener("input", () => updateActive("flag", elements.flag.value.slice(0, 500)));

  elements.statusButton.addEventListener("click", () => {
    const challenge = getActiveChallenge();
    if (!challenge) return;
    challenge.status = challenge.status === "solved" ? "active" : "solved";
    challenge.updatedAt = Date.now();
    persist();
    render();
    notify(challenge.status === "solved" ? "题目已标记为解决。" : "题目已恢复为进行中。");
  });

  elements.deleteButton.addEventListener("click", () => {
    const challenge = getActiveChallenge();
    if (!challenge || !window.confirm(`删除题目“${challenge.name}”及其本地记录？`)) return;
    state.challenges = state.challenges.filter((item) => item.id !== challenge.id);
    state.activeId = [...state.challenges].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null;
    persist();
    render();
    notify("题目记录已从当前浏览器删除。");
  });

  elements.artifacts.addEventListener("click", (event) => {
    const button = event.target.closest("[data-artifact-id]");
    const challenge = getActiveChallenge();
    if (!button || !challenge) return;
    challenge.artifacts = challenge.artifacts.filter((item) => item.id !== button.dataset.artifactId);
    challenge.updatedAt = Date.now();
    persist();
    renderSummary();
    renderList();
    renderArtifacts(challenge);
    notify("已移除这条保存结果。");
  });

  elements.saveToolResult.addEventListener("click", () => {
    const output = document.querySelector("#outputText").value;
    const toolLabel = document.querySelector("#selectedToolLabel").textContent;
    captureArtifact(`工具 · ${toolLabel}`, output);
  });

  elements.saveChainResult.addEventListener("click", () => {
    const output = document.querySelector("#chainOutput").value;
    const steps = document.querySelector("#chainSummary").textContent.split(" · ")[0];
    captureArtifact(`工具链 · ${steps}`, output);
  });

  render();
})();
