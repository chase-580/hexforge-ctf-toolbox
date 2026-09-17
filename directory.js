(function enhanceToolDirectory() {
  const directory = document.querySelector(".tool-directory");
  if (!directory) return;

  const locale = document.documentElement.lang === "en" ? "en" : "zh";
  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const writeList = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
  };

  const links = Array.from(directory.querySelectorAll(".tool-link"));
  const search = document.querySelector("#directorySearch");
  links.forEach((link, index) => {
    const slug = link.getAttribute("href").split("/").filter(Boolean).at(-1);
    const entry = document.createElement("div");
    entry.className = "tool-entry";
    entry.dataset.slug = slug;
    entry.dataset.order = String(index);
    link.before(entry);
    entry.append(link);

    const button = document.createElement("button");
    button.className = "directory-favorite";
    button.type = "button";
    button.title = locale === "en" ? "Add to favorites" : "收藏工具";
    button.setAttribute("aria-label", button.title);
    button.addEventListener("click", () => {
      const favorites = readList("hexforge-favorites");
      writeList("hexforge-favorites", favorites.includes(slug) ? favorites.filter((item) => item !== slug) : [slug, ...favorites]);
      render();
    });
    entry.append(button);
  });

  directory.classList.add("has-controls");
  function render() {
    const favorites = readList("hexforge-favorites");
    const recent = readList("hexforge-recent-tools");
    const entries = Array.from(directory.querySelectorAll(".tool-entry"));
    entries.forEach((entry) => {
      const active = favorites.includes(entry.dataset.slug);
      const button = entry.querySelector(".directory-favorite");
      button.textContent = active ? "★" : "☆";
      button.setAttribute("aria-pressed", String(active));
    });
    entries.sort((a, b) => {
      const favoriteDelta = Number(favorites.includes(b.dataset.slug)) - Number(favorites.includes(a.dataset.slug));
      if (favoriteDelta) return favoriteDelta;
      const aRecent = recent.indexOf(a.dataset.slug);
      const bRecent = recent.indexOf(b.dataset.slug);
      if (aRecent >= 0 || bRecent >= 0) return (aRecent < 0 ? 999 : aRecent) - (bRecent < 0 ? 999 : bRecent);
      return Number(a.dataset.order) - Number(b.dataset.order);
    }).forEach((entry) => directory.append(entry));
  }
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase(locale === "en" ? "en" : "zh-CN");
    directory.querySelectorAll(".tool-entry").forEach((entry) => {
      entry.hidden = Boolean(query) && !entry.textContent.toLocaleLowerCase(locale === "en" ? "en" : "zh-CN").includes(query);
    });
  });
  render();
})();
