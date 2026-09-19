(function initializeChallengeWorkspace() {
  const english = document.documentElement.lang.toLowerCase().startsWith("en");
  const t = (en, zh) => english ? en : zh;
  const STORAGE_KEY = "hexforge-workspaces-v1";
  const EXPORT_FORMAT = "hexforge-workspace";
  const EXPORT_VERSION = 1;
  const DATABASE_NAME = "hexforge-workspace-files";
  const DATABASE_STORE = "attachments";
  const MAX_CHALLENGES = 50;
  const MAX_ARTIFACTS = 30;
  const MAX_ARTIFACT_LENGTH = 20000;
  const MAX_ATTACHMENTS = 12;
  const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
  const MAX_TOTAL_ATTACHMENT_SIZE = 64 * 1024 * 1024;

  const elements = {
    section: document.querySelector("#challengeWorkspace"),
    navCount: document.querySelector("#workspaceNavCount"),
    summary: document.querySelector("#challengeSummary"),
    solvedCount: document.querySelector("#challengeSolvedCount"),
    search: document.querySelector("#challengeSearch"),
    categoryFilter: document.querySelector("#challengeCategoryFilter"),
    statusFilter: document.querySelector("#challengeStatusFilter"),
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
    attachments: document.querySelector("#challengeAttachments"),
    attachmentCount: document.querySelector("#attachmentCount"),
    addAttachment: document.querySelector("#addAttachmentButton"),
    addScreenshot: document.querySelector("#addScreenshotButton"),
    attachmentInput: document.querySelector("#workspaceAttachmentInput"),
    importButton: document.querySelector("#importWorkspaceButton"),
    exportButton: document.querySelector("#exportWorkspaceButton"),
    importInput: document.querySelector("#importWorkspaceInput"),
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
  let databasePromise = null;
  let attachmentRenderToken = 0;
  let attachmentObjectUrls = [];
  const filters = { query: "", category: "all", status: "all" };

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
      name: item.name.slice(0, 80) || t("Untitled challenge", "未命名题目"),
      category: ["Web", "Crypto", "Pwn", "Reverse", "Forensics", "Misc"].includes(item.category) ? item.category : "Misc",
      difficulty: ["Easy", "Medium", "Hard", "Insane"].includes(item.difficulty) ? item.difficulty : "Medium",
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string").slice(0, 12) : [],
      notes: typeof item.notes === "string" ? item.notes.slice(0, 50000) : "",
      flag: typeof item.flag === "string" ? item.flag.slice(0, 500) : "",
      status: item.status === "solved" ? "solved" : "active",
      artifacts: Array.isArray(item.artifacts) ? item.artifacts.slice(0, MAX_ARTIFACTS).map(normalizeArtifact).filter(Boolean) : [],
      attachments: Array.isArray(item.attachments) ? item.attachments.slice(0, MAX_ATTACHMENTS).map(normalizeAttachment).filter(Boolean) : [],
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Date.now(),
    };
  }

  function normalizeArtifact(item) {
    if (!item || typeof item !== "object" || typeof item.content !== "string") return null;
    return {
      id: typeof item.id === "string" ? item.id : createId(),
      label: typeof item.label === "string" ? item.label.slice(0, 80) : t("Tool result", "工具结果"),
      content: item.content.slice(0, MAX_ARTIFACT_LENGTH),
      createdAt: Number(item.createdAt) || Date.now(),
    };
  }

  function normalizeAttachment(item) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") return null;
    const size = Number(item.size) || 0;
    if (size < 0 || size > MAX_ATTACHMENT_SIZE) return null;
    return {
      id: item.id,
      name: item.name.slice(0, 180) || "attachment",
      type: typeof item.type === "string" ? item.type.slice(0, 120) : "application/octet-stream",
      size,
      kind: item.kind === "screenshot" ? "screenshot" : "attachment",
      createdAt: Number(item.createdAt) || Date.now(),
    };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      notify(t("Browser storage is full. The current change may not be saved.", "本地存储空间不足，当前修改可能无法保留。"));
      return false;
    }
  }

  function getDatabase() {
    if (!globalThis.indexedDB) return Promise.reject(new Error(t("This browser does not support attachment storage", "当前浏览器不支持附件存储")));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DATABASE_STORE)) request.result.createObjectStore(DATABASE_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(t("Could not open attachment storage", "无法打开附件存储")));
    });
    return databasePromise;
  }

  async function runAttachmentTransaction(mode, action) {
    const database = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DATABASE_STORE, mode);
      const store = transaction.objectStore(DATABASE_STORE);
      const request = action(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(t("Attachment storage operation failed", "附件存储操作失败")));
      transaction.onerror = () => reject(transaction.error || new Error(t("Attachment storage transaction failed", "附件存储事务失败")));
    });
  }

  function putAttachmentBlob(id, blob) {
    return runAttachmentTransaction("readwrite", (store) => store.put({ id, blob }));
  }

  function getAttachmentBlob(id) {
    return runAttachmentTransaction("readonly", (store) => store.get(id)).then((record) => record?.blob || null);
  }

  function deleteAttachmentBlob(id) {
    return runAttachmentTransaction("readwrite", (store) => store.delete(id));
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
    const query = filters.query.toLowerCase();
    const visibleChallenges = [...state.challenges]
      .filter((challenge) => {
        const matchesQuery = !query || `${challenge.name} ${challenge.tags.join(" ")}`.toLowerCase().includes(query);
        const matchesCategory = filters.category === "all" || challenge.category === filters.category;
        const matchesStatus = filters.status === "all" || challenge.status === filters.status;
        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (!state.challenges.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-list-empty";
      empty.textContent = t("Challenges will appear here, ordered by recent activity.", "创建题目后，它们会按最近修改时间显示在这里。");
      elements.list.append(empty);
      return;
    }

    if (!visibleChallenges.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-list-empty";
      empty.textContent = t("No challenges match the current filters.", "没有符合当前筛选条件的题目。");
      elements.list.append(empty);
      return;
    }

    visibleChallenges.forEach((challenge) => {
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
    elements.statusButton.textContent = challenge.status === "solved" ? t("Solved ✓", "已解决 ✓") : t("Mark solved", "标记已解");
    elements.statusButton.classList.toggle("is-solved", challenge.status === "solved");
    elements.saveState.textContent = `SAVED · ${formatDate(challenge.updatedAt)}`;
    renderArtifacts(challenge);
    renderAttachments(challenge);
  }

  function renderArtifacts(challenge) {
    elements.artifacts.replaceChildren();
    elements.artifactCount.textContent = `${challenge.artifacts.length} ${challenge.artifacts.length === 1 ? "ITEM" : "ITEMS"}`;
    if (!challenge.artifacts.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-artifacts-empty";
      empty.textContent = t("Run a tool, then use “Save to case” to keep an important result.", "运行工具后，点击“存入题目”保存关键结果。");
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
      remove.title = t("Remove result", "移除结果");
      remove.setAttribute("aria-label", t(`Remove ${artifact.label}`, `移除 ${artifact.label}`));
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

  function revokeAttachmentUrls() {
    attachmentObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    attachmentObjectUrls = [];
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function renderAttachments(challenge) {
    const token = ++attachmentRenderToken;
    revokeAttachmentUrls();
    elements.attachments.replaceChildren();
    elements.attachmentCount.textContent = `${challenge.attachments.length} / ${MAX_ATTACHMENTS}`;
    if (!challenge.attachments.length) {
      const empty = document.createElement("p");
      empty.className = "challenge-attachments-empty";
      empty.textContent = t("Attachments and screenshots are stored only in this browser.", "附件和截图只保存在当前浏览器。");
      elements.attachments.append(empty);
      return;
    }

    for (const attachment of challenge.attachments) {
      let blob = null;
      try { blob = await getAttachmentBlob(attachment.id); } catch { /* Metadata remains visible if IndexedDB is unavailable. */ }
      if (token !== attachmentRenderToken || challenge.id !== state.activeId) return;

      const row = document.createElement("article");
      row.className = "challenge-attachment";
      const preview = document.createElement("span");
      preview.className = "challenge-attachment-preview";
      if (blob && attachment.type.startsWith("image/")) {
        const image = document.createElement("img");
        const objectUrl = URL.createObjectURL(blob);
        attachmentObjectUrls.push(objectUrl);
        image.src = objectUrl;
        image.alt = "";
        preview.append(image);
      } else {
        preview.textContent = attachment.kind === "screenshot" ? "IMG" : "FILE";
      }

      const copy = document.createElement("span");
      copy.className = "challenge-attachment-copy";
      const name = document.createElement("strong");
      name.textContent = attachment.name;
      const meta = document.createElement("span");
      meta.textContent = `${formatBytes(attachment.size)} · ${formatDate(attachment.createdAt)}`;
      copy.append(name, meta);

      const controls = document.createElement("span");
      controls.className = "challenge-attachment-controls";
      const download = document.createElement("button");
      download.type = "button";
      download.textContent = "↓";
      download.title = t("Download attachment", "下载附件");
      download.setAttribute("aria-label", t(`Download ${attachment.name}`, `下载 ${attachment.name}`));
      download.dataset.downloadAttachment = attachment.id;
      download.disabled = !blob;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = t("Delete attachment", "删除附件");
      remove.className = "remove-attachment";
      remove.setAttribute("aria-label", t(`Delete ${attachment.name}`, `删除 ${attachment.name}`));
      remove.dataset.removeAttachment = attachment.id;
      controls.append(download, remove);
      row.append(preview, copy, controls);
      elements.attachments.append(row);
    }
  }

  function openCreateDialog() {
    if (state.challenges.length >= MAX_CHALLENGES) {
      notify(t("The local workspace can store up to 50 challenges.", "本地工作区最多保存 50 个题目。"));
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
      attachments: [],
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
    notify(t("Challenge workspace created and saved in this browser.", "题目工作区已创建并保存在当前浏览器。"));
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
      notify(t("There is no result to save.", "当前没有可保存的结果。"));
      return;
    }
    const truncated = content.length > MAX_ARTIFACT_LENGTH;
    const artifact = { id: createId(), label, content: content.slice(0, MAX_ARTIFACT_LENGTH), createdAt: Date.now() };
    const challenge = getActiveChallenge();
    if (!challenge) {
      pendingArtifact = artifact;
      openCreateDialog();
      notify(t("Create a challenge first. The current result will be added automatically.", "先创建题目，当前结果会自动加入新题目。"));
      return;
    }
    challenge.artifacts.unshift(artifact);
    challenge.artifacts = challenge.artifacts.slice(0, MAX_ARTIFACTS);
    challenge.updatedAt = Date.now();
    persist();
    renderSummary();
    renderList();
    renderArtifacts(challenge);
    notify(truncated ? t("The first 20,000 characters were saved to the challenge.", "结果已截取前 20,000 字符并存入题目。") : t("Result saved to the active challenge.", "结果已存入当前题目。"));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error(t("Could not read the attachment", "无法读取附件")));
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const match = typeof dataUrl === "string" && dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
    if (!match) throw new Error(t("Invalid attachment data format", "附件数据格式无效"));
    const type = match[1] || "application/octet-stream";
    const binary = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type });
  }

  async function exportWorkspace() {
    if (!state.challenges.length) {
      notify(t("There are no challenges to export.", "当前没有可导出的题目。"));
      return;
    }
    const originalText = elements.exportButton.textContent;
    elements.exportButton.disabled = true;
    elements.exportButton.textContent = t("Exporting…", "导出中...");
    try {
      const attachments = [];
      for (const challenge of state.challenges) {
        for (const attachment of challenge.attachments) {
          const blob = await getAttachmentBlob(attachment.id);
          if (blob) attachments.push({ id: attachment.id, data: await blobToDataUrl(blob) });
        }
      }
      const payload = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        state,
        attachments,
      };
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `hexforge-workspace-${date}.json`);
      notify(t(`Exported ${state.challenges.length} challenges and ${attachments.length} attachments.`, `已导出 ${state.challenges.length} 个题目和 ${attachments.length} 个附件。`));
    } catch (error) {
      notify(t(`Export failed: ${error.message}`, `导出失败：${error.message}`));
    } finally {
      elements.exportButton.disabled = false;
      elements.exportButton.textContent = originalText;
    }
  }

  async function importWorkspace(file) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      notify(t("The import file cannot exceed 100 MB.", "导入文件不能超过 100 MB。"));
      return;
    }
    const originalText = elements.importButton.textContent;
    elements.importButton.disabled = true;
    elements.importButton.textContent = t("Importing…", "导入中...");
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.format !== EXPORT_FORMAT || payload?.version !== EXPORT_VERSION || !Array.isArray(payload?.state?.challenges)) {
        throw new Error(t("This is not a valid Hexforge workspace file", "不是有效的 Hexforge 工作区文件"));
      }

      const existingChallengeIds = new Set(state.challenges.map((challenge) => challenge.id));
      const existingAttachmentIds = new Set(state.challenges.flatMap((challenge) => challenge.attachments.map((attachment) => attachment.id)));
      const attachmentIdMap = new Map();
      const importedChallenges = [];
      let skipped = 0;

      for (const rawChallenge of payload.state.challenges) {
        if (state.challenges.length + importedChallenges.length >= MAX_CHALLENGES) break;
        const challenge = normalizeChallenge(rawChallenge);
        if (!challenge || existingChallengeIds.has(challenge.id)) {
          skipped += 1;
          continue;
        }
        challenge.attachments = challenge.attachments.map((attachment) => {
          const originalId = attachment.id;
          const nextId = existingAttachmentIds.has(originalId) ? createId() : originalId;
          existingAttachmentIds.add(nextId);
          attachmentIdMap.set(originalId, nextId);
          return { ...attachment, id: nextId };
        });
        importedChallenges.push(challenge);
      }

      const acceptedAttachmentIds = new Set(importedChallenges.flatMap((challenge) => challenge.attachments.map((attachment) => attachment.id)));
      let importedAttachmentBytes = getTotalAttachmentSize();
      let importedAttachmentCount = 0;
      const importedBlobIds = new Set();
      for (const item of Array.isArray(payload.attachments) ? payload.attachments : []) {
        const destinationId = attachmentIdMap.get(item.id) || item.id;
        if (!acceptedAttachmentIds.has(destinationId)) continue;
        const blob = dataUrlToBlob(item.data);
        if (blob.size > MAX_ATTACHMENT_SIZE || importedAttachmentBytes + blob.size > MAX_TOTAL_ATTACHMENT_SIZE) continue;
        await putAttachmentBlob(destinationId, blob);
        importedAttachmentBytes += blob.size;
        importedAttachmentCount += 1;
        importedBlobIds.add(destinationId);
      }
      importedChallenges.forEach((challenge) => {
        challenge.attachments = challenge.attachments.filter((attachment) => importedBlobIds.has(attachment.id));
      });

      if (!importedChallenges.length) {
        notify(skipped ? t("Those challenges already exist and were not duplicated.", "这些题目已经存在，没有重复导入。") : t("The import file contains no usable challenges.", "导入文件中没有可用题目。"));
        return;
      }
      state.challenges.push(...importedChallenges);
      const importedActiveId = payload.state.activeId;
      state.activeId = importedChallenges.some((challenge) => challenge.id === importedActiveId) ? importedActiveId : importedChallenges[0].id;
      persist();
      render();
      notify(t(`Imported ${importedChallenges.length} challenges and ${importedAttachmentCount} attachments${skipped ? `; skipped ${skipped} existing challenges` : ""}.`, `已导入 ${importedChallenges.length} 个题目和 ${importedAttachmentCount} 个附件${skipped ? `，跳过 ${skipped} 个已存在题目` : ""}。`));
    } catch (error) {
      notify(t(`Import failed: ${error.message}`, `导入失败：${error.message}`));
    } finally {
      elements.importButton.disabled = false;
      elements.importButton.textContent = originalText;
      elements.importInput.value = "";
    }
  }

  function getTotalAttachmentSize() {
    return state.challenges.reduce((total, challenge) => total + challenge.attachments.reduce((sum, attachment) => sum + attachment.size, 0), 0);
  }

  async function addAttachment(file, kind) {
    const challenge = getActiveChallenge();
    if (!challenge) {
      notify(t("Create or select a challenge first.", "请先创建或选择一个题目。"));
      return;
    }
    if (!file) return;
    if (challenge.attachments.length >= MAX_ATTACHMENTS) {
      notify(t("Each challenge can store up to 12 attachments and screenshots.", "每个题目最多保存 12 个附件和截图。"));
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      notify(t("An attachment cannot exceed 8 MB.", "单个附件不能超过 8 MB。"));
      return;
    }
    if (getTotalAttachmentSize() + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
      notify(t("Workspace attachments cannot exceed 64 MB in total.", "工作区附件总量不能超过 64 MB。"));
      return;
    }
    if (kind === "screenshot" && !file.type.startsWith("image/")) {
      notify(t("Screenshots must be image files.", "截图只能使用图片文件。"));
      return;
    }

    const attachment = {
      id: createId(),
      name: file.name.slice(0, 180) || (kind === "screenshot" ? "screenshot.png" : "attachment"),
      type: file.type || "application/octet-stream",
      size: file.size,
      kind,
      createdAt: Date.now(),
    };
    try {
      await putAttachmentBlob(attachment.id, file);
      challenge.attachments.unshift(attachment);
      challenge.updatedAt = Date.now();
      persist();
      renderSummary();
      renderList();
      renderAttachments(challenge);
      notify(kind === "screenshot" ? t("Screenshot saved to the active challenge.", "截图已保存到当前题目。") : t("Attachment saved to the active challenge.", "附件已保存到当前题目。"));
    } catch (error) {
      notify(t(`Could not save attachment: ${error.message}`, `附件保存失败：${error.message}`));
    }
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

  elements.search.addEventListener("input", () => {
    filters.query = elements.search.value.trim();
    renderList();
  });
  elements.categoryFilter.addEventListener("change", () => {
    filters.category = elements.categoryFilter.value;
    renderList();
  });
  elements.statusFilter.addEventListener("change", () => {
    filters.status = elements.statusFilter.value;
    renderList();
  });

  elements.name.addEventListener("input", () => updateActive("name", elements.name.value.slice(0, 80) || t("Untitled challenge", "未命名题目")));
  elements.category.addEventListener("change", () => updateActive("category", elements.category.value, true));
  elements.difficulty.addEventListener("change", () => updateActive("difficulty", elements.difficulty.value, true));
  elements.tags.addEventListener("input", () => updateActive("tags", parseTags(elements.tags.value)));
  elements.notes.addEventListener("input", () => updateActive("notes", elements.notes.value.slice(0, 50000)));
  elements.flag.addEventListener("input", () => updateActive("flag", elements.flag.value.slice(0, 500)));
  elements.notes.addEventListener("paste", (event) => {
    const image = Array.from(event.clipboardData?.files || []).find((file) => file.type.startsWith("image/"));
    if (image) addAttachment(image, "screenshot");
  });

  elements.statusButton.addEventListener("click", () => {
    const challenge = getActiveChallenge();
    if (!challenge) return;
    challenge.status = challenge.status === "solved" ? "active" : "solved";
    challenge.updatedAt = Date.now();
    persist();
    render();
    notify(challenge.status === "solved" ? t("Challenge marked as solved.", "题目已标记为解决。") : t("Challenge returned to active status.", "题目已恢复为进行中。"));
  });

  elements.deleteButton.addEventListener("click", () => {
    const challenge = getActiveChallenge();
    if (!challenge || !window.confirm(t(`Delete “${challenge.name}” and its local records?`, `删除题目“${challenge.name}”及其本地记录？`))) return;
    const attachmentIds = challenge.attachments.map((attachment) => attachment.id);
    state.challenges = state.challenges.filter((item) => item.id !== challenge.id);
    state.activeId = [...state.challenges].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null;
    persist();
    render();
    Promise.allSettled(attachmentIds.map(deleteAttachmentBlob));
    notify(t("Challenge record deleted from this browser.", "题目记录已从当前浏览器删除。"));
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
    notify(t("Saved result removed.", "已移除这条保存结果。"));
  });

  elements.attachments.addEventListener("click", async (event) => {
    const challenge = getActiveChallenge();
    if (!challenge) return;
    const downloadButton = event.target.closest("[data-download-attachment]");
    if (downloadButton) {
      const attachment = challenge.attachments.find((item) => item.id === downloadButton.dataset.downloadAttachment);
      if (!attachment) return;
      try {
        const blob = await getAttachmentBlob(attachment.id);
        if (!blob) throw new Error(t("Attachment data is unavailable", "附件数据不存在"));
        downloadBlob(blob, attachment.name);
      } catch (error) {
        notify(t(`Download failed: ${error.message}`, `下载失败：${error.message}`));
      }
      return;
    }

    const removeButton = event.target.closest("[data-remove-attachment]");
    if (!removeButton) return;
    const attachment = challenge.attachments.find((item) => item.id === removeButton.dataset.removeAttachment);
    if (!attachment || !window.confirm(t(`Delete attachment “${attachment.name}”?`, `删除附件“${attachment.name}”？`))) return;
    challenge.attachments = challenge.attachments.filter((item) => item.id !== attachment.id);
    challenge.updatedAt = Date.now();
    persist();
    try { await deleteAttachmentBlob(attachment.id); } catch { /* Metadata removal remains effective. */ }
    renderSummary();
    renderList();
    renderAttachments(challenge);
    notify(t("Attachment deleted from this browser.", "附件已从当前浏览器删除。"));
  });

  elements.addAttachment.addEventListener("click", () => {
    elements.attachmentInput.dataset.kind = "attachment";
    elements.attachmentInput.removeAttribute("accept");
    elements.attachmentInput.multiple = true;
    elements.attachmentInput.click();
  });
  elements.addScreenshot.addEventListener("click", () => {
    elements.attachmentInput.dataset.kind = "screenshot";
    elements.attachmentInput.accept = "image/*";
    elements.attachmentInput.multiple = false;
    elements.attachmentInput.click();
  });
  elements.attachmentInput.addEventListener("change", async () => {
    const kind = elements.attachmentInput.dataset.kind === "screenshot" ? "screenshot" : "attachment";
    for (const file of Array.from(elements.attachmentInput.files || [])) await addAttachment(file, kind);
    elements.attachmentInput.value = "";
  });

  elements.exportButton.addEventListener("click", exportWorkspace);
  elements.importButton.addEventListener("click", () => elements.importInput.click());
  elements.importInput.addEventListener("change", () => importWorkspace(elements.importInput.files[0]));

  elements.saveToolResult.addEventListener("click", () => {
    const output = document.querySelector("#outputText").value;
    const toolLabel = document.querySelector("#selectedToolLabel").textContent;
    captureArtifact(t(`Tool · ${toolLabel}`, `工具 · ${toolLabel}`), output);
  });

  elements.saveChainResult.addEventListener("click", () => {
    const output = document.querySelector("#chainOutput").value;
    const steps = document.querySelector("#chainSummary").textContent.split(" · ")[0];
    captureArtifact(t(`Toolchain · ${steps}`, `工具链 · ${steps}`), output);
  });

  render();
})();
