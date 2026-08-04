/* ==========================================================================
   KimiZK Translator — Options Controller
   Connected to real extension StorageManager & ApiService
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* SVG Icon Helpers for History Items & Status Pills                   */
  /* ------------------------------------------------------------------ */
  const SVG_ICONS = {
    ok: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    success: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    warn: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    error: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    danger: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    idle: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    text: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    voice: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0"></path><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    ocr: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`
  };

  const HISTORY_TYPE_META = {
    text: { label: "Văn bản bôi đen", icon: SVG_ICONS.text },
    voice: { label: "Voice STT", icon: SVG_ICONS.voice },
    ocr: { label: "OCR Ảnh", icon: SVG_ICONS.ocr }
  };

  function escapeHtml(str = "") {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                                */
  /* ------------------------------------------------------------------ */
  async function initTheme() {
    const saved = await StorageManager.getTheme();
    applyTheme(saved);
    const themeBtn = document.getElementById("theme-toggle-btn");
    themeBtn?.addEventListener("click", async () => {
      const isDark = document.body.classList.contains("dark-theme");
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      await StorageManager.setTheme(next);
    });
  }
  function applyTheme(mode) {
    const isDark = mode === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
      themeBtn.title = isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối";
      themeBtn.innerHTML = isDark
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Clock                                                                */
  /* ------------------------------------------------------------------ */
  function initClock() {
    const el = document.getElementById("opt-time-display");
    if (!el) return;
    const tick = () => { el.textContent = new Date().toLocaleTimeString("vi-VN", { hour12: false }); };
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Tabs                                                                 */
  /* ------------------------------------------------------------------ */
  function initTabs() {
    const navItems = document.querySelectorAll(".xt-nav-item");
    const panels = document.querySelectorAll(".xt-tab-panel");

    navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        navItems.forEach((b) => b.classList.toggle("active", b === btn));
        panels.forEach((p) => p.classList.toggle("active", p.id === target));
        if (target === "tab-stats") renderAnalyticsDashboard();
        if (target === "tab-history") initHistoryTab();
        if (target === "tab-languages") initLanguagesTab();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tab 1 — Groq AI Multi-API Keys & Settings Sync                     */
  /* ------------------------------------------------------------------ */
  async function initAiTab() {
    const keysInput = document.getElementById("opt-api-keys");
    const saveBtn = document.getElementById("opt-save-key-btn");
    const statusEl = document.getElementById("opt-key-status");
    const modelSelect = document.getElementById("opt-model-select");
    const ttsModelSelect = document.getElementById("opt-tts-model-select");
    const voiceSelect = document.getElementById("opt-voice-select");
    const voiceDirectionSelect = document.getElementById("opt-voice-direction");

    const savedKeys = await StorageManager.getApiKeys();
    if (savedKeys && savedKeys.length > 0) {
      if (keysInput) keysInput.value = savedKeys.join("\n");
      setStatus(statusEl, "ok", `Đã lưu ${savedKeys.length} API Key`);
    } else {
      setStatus(statusEl, "idle", "Chưa kết nối API Key");
    }

    saveBtn?.addEventListener("click", async () => {
      const rawText = keysInput ? keysInput.value.trim() : "";
      const keysList = rawText.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
      if (keysList.length === 0) {
        setStatus(statusEl, "warn", "Vui lòng nhập ít nhất 1 API Key");
        return;
      }
      await StorageManager.saveApiKeys(keysList);
      setStatus(statusEl, "ok", `Đã kết nối ${keysList.length} API Key`);
    });

    // Model selection sync
    if (modelSelect) {
      StorageManager.getSelectedModel().then(m => { if (m) modelSelect.value = m; });
      modelSelect.addEventListener("change", (e) => {
        StorageManager.setSelectedModel(e.target.value);
      });
    }

    // TTS settings sync + dynamic field toggle
    const puterTokenField = document.getElementById("tts-puter-token-field");
    const voiceField = document.getElementById("tts-voice-field");
    const directionField = document.getElementById("tts-direction-field");
    const voiceGroupEdge = document.getElementById("voice-group-edge");
    const voiceGroupGroq = document.getElementById("voice-group-groq");

    function updateTtsFieldsVisibility(model) {
      const isPuter = model && model.startsWith('puter-');
      const isGroq = model && model.startsWith('canopylabs/');
      const isEdge = !model || model === 'edge-tts';
      const isGoogleTts = model === 'google-translate';

      // Puter Token field: only visible for Puter models
      if (puterTokenField) puterTokenField.style.display = isPuter ? '' : 'none';

      // Voice field: visible for Edge and Groq (not Puter/Google which have fixed voices)
      if (voiceField) voiceField.style.display = (isPuter || isGoogleTts) ? 'none' : '';

      // Voice optgroups: show relevant group
      if (voiceGroupEdge) voiceGroupEdge.style.display = isGroq ? 'none' : '';
      if (voiceGroupGroq) voiceGroupGroq.style.display = (isEdge || isGoogleTts) ? 'none' : '';

      // Direction field: only for Groq Orpheus (emotional voice tags)
      if (directionField) directionField.style.display = isGroq ? '' : 'none';
    }

    if (ttsModelSelect) {
      if (StorageManager.getTtsModel) {
        StorageManager.getTtsModel().then(m => {
          if (m) ttsModelSelect.value = m;
          updateTtsFieldsVisibility(ttsModelSelect.value);
        });
      } else {
        updateTtsFieldsVisibility(ttsModelSelect.value);
      }
      ttsModelSelect.addEventListener("change", (e) => {
        if (StorageManager.setTtsModel) StorageManager.setTtsModel(e.target.value);
        updateTtsFieldsVisibility(e.target.value);
      });
    }

    const puterTokenInput = document.getElementById("opt-puter-token");
    if (puterTokenInput && StorageManager.getPuterToken) {
      StorageManager.getPuterToken().then(t => { if (t) puterTokenInput.value = t; });
      puterTokenInput.addEventListener("change", (e) => {
        if (StorageManager.setPuterToken) StorageManager.setPuterToken(e.target.value.trim());
      });
    }

    if (voiceSelect) {
      StorageManager.getTtsVoice().then(v => { if (v) voiceSelect.value = v; });
      voiceSelect.addEventListener("change", (e) => {
        StorageManager.setTtsVoice(e.target.value);
      });
    }

    if (voiceDirectionSelect) {
      StorageManager.getTtsDirection().then(d => { if (d) voiceDirectionSelect.value = d; });
      voiceDirectionSelect.addEventListener("change", (e) => {
        StorageManager.setTtsDirection(e.target.value);
      });
    }

    await initMicPermission();
  }

  function setStatus(el, kind, text) {
    if (!el) return;
    const icon = SVG_ICONS[kind] || SVG_ICONS.idle;
    el.className = `xt-status ${kind}`;
    el.innerHTML = `${icon}<span>${text}</span>`;
  }

  /* ------------------------------------------------------------------ */
  /* Mic permission — 1-click grant                                      */
  /* ------------------------------------------------------------------ */
  async function initMicPermission() {
    const statusEl = document.getElementById("opt-mic-status");
    const requestBtn = document.getElementById("opt-request-mic-btn");

    const reflect = (state) => {
      if (state === "granted") setStatus(statusEl, "ok", "Đã cấp quyền Micro thành công");
      else if (state === "denied") setStatus(statusEl, "warn", "Bị từ chối — kiểm tra cài đặt trình duyệt");
      else setStatus(statusEl, "warn", "Chưa cấp quyền Micro");
    };

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: "microphone" });
        reflect(status.state);
        status.onchange = () => reflect(status.state);
      }
    } catch (_) { }

    const requestAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        reflect("granted");
      } catch (_) {
        reflect("denied");
      }
    };

    requestBtn?.addEventListener("click", requestAccess);

    if (new URLSearchParams(location.search).get("requestMic") === "true") {
      requestAccess();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Tab 2 — Analytics dashboard                                         */
  /* ------------------------------------------------------------------ */
  async function renderAnalyticsDashboard() {
    const stats = await StorageManager.getRealStats();

    const wordsEl = document.getElementById("kpi-total-words");
    const transEl = document.getElementById("kpi-total-trans");
    const todayEl = document.getElementById("kpi-today");
    const speedEl = document.getElementById("kpi-speed");

    if (wordsEl) wordsEl.textContent = (stats.totalWords || 0).toLocaleString("vi-VN");
    if (transEl) transEl.textContent = (stats.totalTranslations || 0).toLocaleString("vi-VN");
    if (todayEl) todayEl.textContent = (stats.todayCount || 0).toLocaleString("vi-VN");
    if (speedEl) speedEl.innerHTML = `${stats.avgSpeed || 185}<small>ms</small>`;

    if (stats.last7Days) renderTrendChart(stats.last7Days);

    const langEntries = Object.entries(stats.langCounts || {});
    const totalLangs = langEntries.reduce((a, b) => a + b[1], 0);
    const shares = langEntries.map(([lang, count]) => ({
      lang,
      pct: totalLangs > 0 ? Math.round((count / totalLangs) * 100) : 0,
      count
    }));

    renderDonutChart(shares);

    const topLangEl = document.getElementById("metric-top-lang");
    const topPctEl = document.getElementById("metric-top-pct");
    const timeSavedEl = document.getElementById("metric-time-saved");

    if (topLangEl) topLangEl.textContent = stats.topLang || "—";
    if (topPctEl) topPctEl.textContent = stats.topPercent ? `${stats.topPercent}%` : "—";
    if (timeSavedEl) {
      const mins = Math.round(((stats.totalTranslations || 0) * 8) / 60);
      timeSavedEl.textContent = mins >= 60 ? `${(mins / 60).toFixed(1)} giờ` : `${mins} phút`;
    }
  }

  function renderTrendChart(days) {
    const viewport = document.getElementById("trend-chart-viewport");
    if (!viewport) return;
    const max = Math.max(...days.map((d) => d.count), 1);
    const todayIndex = days.length - 1;

    viewport.innerHTML = `
      <div class="xt-trend-bars-wrapper">
        ${days.map((d, i) => `
          <div class="xt-trend-col ${i === todayIndex ? "xt-today" : ""}">
            <div class="xt-bar-track">
              <div class="xt-bar-value-pill">${d.count} lượt · ${d.words} từ</div>
              <div class="xt-bar-fill ${i === todayIndex ? "xt-bar-today" : ""}" style="height:0%" data-target="${Math.max(6, (d.count / max) * 100)}"></div>
            </div>
            <div class="xt-trend-label">${d.dayLabel || d.label}</div>
          </div>
        `).join("")}
      </div>
    `;

    requestAnimationFrame(() => {
      viewport.querySelectorAll(".xt-bar-fill").forEach((bar) => {
        bar.style.height = `${bar.dataset.target}%`;
      });
    });
  }

  function renderDonutChart(shares) {
    const layout = document.getElementById("donut-chart-layout");
    if (!layout) return;

    if (!shares || shares.length === 0) {
      layout.innerHTML = `<div style="font-size:12.5px; color:var(--text-faint); font-style:italic; padding:12px;">Chưa có dữ liệu ngôn ngữ</div>`;
      return;
    }

    const colors = ["var(--accent)", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];
    const radius = 46, circumference = 2 * Math.PI * radius;
    let offset = 0;

    const arcs = shares.map((s, i) => {
      const len = (s.pct / 100) * circumference;
      const dash = `${len} ${circumference - len}`;
      const rotation = (offset / circumference) * 360;
      offset += len;
      return `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="${colors[i % colors.length]}"
                stroke-width="14" stroke-dasharray="${dash}" stroke-dashoffset="0"
                transform="rotate(${-90 + rotation} 60 60)" stroke-linecap="butt"/>`;
    }).join("");

    layout.innerHTML = `
      <div class="xt-donut-wrap">
        <svg viewBox="0 0 120 120" width="140" height="140">
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--surface-alt)" stroke-width="14"/>
          ${arcs}
        </svg>
        <div class="xt-donut-legend">
          ${shares.map((s, i) => `
            <div class="xt-legend-row">
              <span class="xt-legend-swatch" style="background:${colors[i % colors.length]}"></span>
              <span class="xt-legend-lang">${s.lang}</span>
              <span class="xt-legend-pct">${s.pct}%</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /* Tab 3 — Interactive Language Management                             */
  /* ------------------------------------------------------------------ */
  async function initLanguagesTab() {
    const favList = document.getElementById("favorite-languages-list");
    const recentList = document.getElementById("recent-languages-list");
    const addBtn = document.getElementById("custom-language-btn");
    const targetSelect = document.getElementById("opt-target-lang");

    const currentTarget = await StorageManager.getTargetLanguage();
    if (targetSelect && currentTarget) {
      targetSelect.value = currentTarget;
    }

    targetSelect?.addEventListener("change", async (e) => {
      const selected = e.target.value;
      await StorageManager.setTargetLanguage(selected);
      await StorageManager.addRecentLanguage(selected);
      renderLanguageLists();
    });

    addBtn?.addEventListener("click", async () => {
      if (!targetSelect) return;
      const selectedLang = targetSelect.value;
      const favorites = await StorageManager.getFavoriteLanguages();
      if (!favorites.includes(selectedLang)) {
        favorites.push(selectedLang);
        await StorageManager.setFavoriteLanguages(favorites);
        renderLanguageLists();
      }
    });

    async function renderLanguageLists() {
      const currentTargetLang = await StorageManager.getTargetLanguage();
      const favorites = await StorageManager.getFavoriteLanguages();
      const recents = await StorageManager.getRecentLanguages();

      // Render Favorite Chips
      if (favList) {
        if (favorites.length === 0) {
          favList.innerHTML = `<span class="xt-lang-chip xt-chip-empty">Chưa có ngôn ngữ yêu thích</span>`;
        } else {
          favList.innerHTML = favorites.map(lang => {
            const isCurrent = lang === currentTargetLang;
            return `
              <span class="xt-lang-chip ${isCurrent ? 'active' : ''}" data-lang="${lang}">
                <span class="chip-click-trigger" style="cursor:pointer;">${lang}</span>
                <button type="button" aria-label="Xoá ${lang}" title="Xóa khỏi yêu thích">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </span>
            `;
          }).join("");

          favList.querySelectorAll(".xt-lang-chip").forEach(chip => {
            const lang = chip.dataset.lang;
            chip.querySelector(".chip-click-trigger")?.addEventListener("click", async () => {
              await StorageManager.setTargetLanguage(lang);
              await StorageManager.addRecentLanguage(lang);
              if (targetSelect) targetSelect.value = lang;
              renderLanguageLists();
            });
            chip.querySelector("button")?.addEventListener("click", async (e) => {
              e.stopPropagation();
              const updatedFavs = favorites.filter(f => f !== lang);
              await StorageManager.setFavoriteLanguages(updatedFavs);
              renderLanguageLists();
            });
          });
        }
      }

      // Render Recent Chips
      if (recentList) {
        if (recents.length === 0) {
          recentList.innerHTML = `<span class="xt-lang-chip xt-chip-empty">Chưa có lịch sử sử dụng</span>`;
        } else {
          recentList.innerHTML = recents.map(lang => {
            const isCurrent = lang === currentTargetLang;
            return `
              <span class="xt-lang-chip ${isCurrent ? 'active' : ''}" data-lang="${lang}">
                <span class="chip-click-trigger" style="cursor:pointer;">${lang}</span>
                <button type="button" aria-label="Xoá ${lang}" title="Xóa khỏi danh sách gần đây">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </button>
              </span>
            `;
          }).join("");

          recentList.querySelectorAll(".xt-lang-chip").forEach(chip => {
            const lang = chip.dataset.lang;
            chip.querySelector(".chip-click-trigger")?.addEventListener("click", async () => {
              await StorageManager.setTargetLanguage(lang);
              await StorageManager.addRecentLanguage(lang);
              if (targetSelect) targetSelect.value = lang;
              renderLanguageLists();
            });
            chip.querySelector("button")?.addEventListener("click", async (e) => {
              e.stopPropagation();
              if (StorageManager.removeRecentLanguage) {
                await StorageManager.removeRecentLanguage(lang);
              }
              renderLanguageLists();
            });
          });
        }
      }
    }

    renderLanguageLists();
  }

  /* ------------------------------------------------------------------ */
  /* Tab 4 — History Controller                                           */
  /* ------------------------------------------------------------------ */
  async function initHistoryTab() {
    const listEl = document.getElementById("history-list");
    const searchInput = document.getElementById("history-search-input");
    const filterSelect = document.getElementById("history-filter-type");
    const clearBtn = document.getElementById("clear-history-btn");
    const itemTemplate = document.getElementById("history-item-template");
    const emptyTemplate = document.getElementById("history-empty-template");

    if (!listEl) return;

    let history = await StorageManager.getTranslationHistory();

    function renderList() {
      const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
      const typeFilter = filterSelect ? filterSelect.value : "all";

      const filtered = history.filter((item) => {
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        const orig = item.originalText || item.original || "";
        const trans = item.translatedText || item.translated || "";
        const matchesQuery = !query
          || orig.toLowerCase().includes(query)
          || trans.toLowerCase().includes(query);
        return matchesType && matchesQuery;
      });

      listEl.innerHTML = "";

      if (filtered.length === 0) {
        if (emptyTemplate) {
          listEl.appendChild(emptyTemplate.content.cloneNode(true));
        } else {
          listEl.innerHTML = `<div class="xt-history-empty"><p>Chưa có dữ liệu lịch sử dịch nào tương ứng</p></div>`;
        }
        return;
      }

      filtered.forEach((item) => {
        if (itemTemplate) {
          listEl.appendChild(buildCard(item));
        } else {
          listEl.appendChild(buildFallbackCard(item));
        }
      });
    }

    function buildCard(item) {
      const node = itemTemplate.content.cloneNode(true);
      const card = node.querySelector(".xt-history-card");
      const meta = HISTORY_TYPE_META[item.type] || HISTORY_TYPE_META.text;

      const origText = item.originalText || item.original || "";
      const transText = item.translatedText || item.translated || "";
      const timestamp = item.timestamp ? (typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime()) : Date.now();
      const dateStr = new Date(timestamp).toLocaleString("vi-VN");

      if (card) card.dataset.id = item.id;
      
      const iconEl = node.querySelector(".xt-history-type-icon");
      if (iconEl) iconEl.innerHTML = meta.icon;
      
      const labelEl = node.querySelector(".xt-history-type-label");
      if (labelEl) labelEl.textContent = meta.label;
      
      const langEl = node.querySelector(".xt-history-lang");
      if (langEl) langEl.textContent = item.targetLang || item.lang || 'Vietnamese';
      
      const timeEl = node.querySelector(".xt-history-time");
      if (timeEl) timeEl.textContent = dateStr;
      
      const origEl = node.querySelector(".xt-history-original");
      if (origEl) origEl.innerHTML = escapeHtml(origText);
      
      const transEl = node.querySelector(".xt-history-translated");
      if (transEl) transEl.innerHTML = escapeHtml(transText || "Chưa có bản dịch");

      const delBtn = node.querySelector(".delete-item-btn");
      delBtn?.addEventListener("click", async () => {
        await StorageManager.deleteTranslationHistoryItem(item.id);
        history = await StorageManager.getTranslationHistory();
        renderList();
      });

      return node;
    }

    function buildFallbackCard(item) {
      const meta = HISTORY_TYPE_META[item.type] || HISTORY_TYPE_META.text;
      const origText = item.originalText || item.original || "";
      const transText = item.translatedText || item.translated || "";
      const timestamp = item.timestamp ? (typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime()) : Date.now();
      const dateStr = new Date(timestamp).toLocaleString("vi-VN");

      const div = document.createElement("article");
      div.className = "xt-history-card";
      div.dataset.id = item.id;
      div.innerHTML = `
        <header class="xt-history-card-top">
          <span class="xt-history-badge">
            <span class="xt-history-type-icon">${meta.icon}</span>
            <span class="xt-history-type-label">${meta.label}</span>
            <span class="xt-history-dot">•</span>
            <span class="xt-history-lang">${item.targetLang || item.lang || 'Vietnamese'}</span>
          </span>
          <span class="xt-history-time">${dateStr}</span>
          <button class="xt-history-delete delete-item-btn" title="Xoá mục này" type="button" data-id="${item.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>
          </button>
        </header>
        <p class="xt-history-original">${escapeHtml(origText)}</p>
        <div class="xt-history-translated">${escapeHtml(transText || "Chưa có bản dịch")}</div>
      `;

      div.querySelector(".delete-item-btn")?.addEventListener("click", async () => {
        await StorageManager.deleteTranslationHistoryItem(item.id);
        history = await StorageManager.getTranslationHistory();
        renderList();
      });

      return div;
    }

    searchInput?.addEventListener("input", renderList);
    filterSelect?.addEventListener("change", renderList);

    clearBtn?.addEventListener("click", async () => {
      if (history.length === 0) return;
      const confirmed = confirm("Xoá toàn bộ lịch sử dịch thuật? Hành động này không thể hoàn tác.");
      if (!confirmed) return;
      await StorageManager.clearTranslationHistory();
      history = [];
      renderList();
    });

    renderList();
  }

  /* ------------------------------------------------------------------ */
  /* Tab 5 — Playground                                                   */
  /* ------------------------------------------------------------------ */
  function initPlayground() {
    const input = document.getElementById("pg-input");
    const output = document.getElementById("pg-output");
    const runBtn = document.getElementById("pg-run-btn");

    runBtn?.addEventListener("click", async () => {
      const text = input ? input.value.trim() : "";
      if (!text) {
        if (output) {
          output.textContent = "Nhập văn bản để dịch thử.";
          output.classList.add("xt-pg-empty");
        }
        return;
      }
      if (output) {
        output.classList.remove("xt-pg-empty");
        output.textContent = "Đang dịch…";
      }
      runBtn.disabled = true;

      try {
        const targetLang = document.getElementById("opt-target-lang")?.value || "Vietnamese";
        const result = await ApiService.translate(text, false, targetLang);
        if (result && (result.translated || result.meaning)) {
          output.textContent = result.translated || result.meaning;
        } else {
          output.textContent = "Không thể lấy kết quả dịch. Vui lòng kiểm tra API Key.";
        }
      } catch (err) {
        output.textContent = "Lỗi dịch thử: " + (err.message || "Kiểm tra kết nối.");
      } finally {
        runBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tab 6 — About                                                        */
  /* ------------------------------------------------------------------ */
  function initAboutTab() {
    const updateBtn = document.getElementById("opt-check-update-btn");
    updateBtn?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Đang kiểm tra…";
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = original;
        alert("Bạn đang sử dụng phiên bản KimiZK Translator mới nhất (v1.0.5)!");
      }, 900);
    });

    const githubLink = document.getElementById("github-link");
    const facebookLink = document.getElementById("facebook-link");

    githubLink?.addEventListener("click", (e) => {
      e.preventDefault();
      const url = "https://github.com/KimiZK-Dev/KimiZK-Translator";
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank");
      }
    });

    facebookLink?.addEventListener("click", (e) => {
      e.preventDefault();
      const url = "https://www.facebook.com/NgHxBach";
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, "_blank");
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initClock();
    initTabs();
    initAiTab();
    initLanguagesTab();
    initPlayground();
    initAboutTab();
  });
})();
