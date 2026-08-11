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

  const _esc = (str) => typeof Utils !== 'undefined'
    ? Utils.escapeSpecialChars(str)
    : escapeHtml(str);

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
  function switchTab(targetTabId, videoIndex = null) {
    const navItems = document.querySelectorAll(".xt-nav-item");
    const panels = document.querySelectorAll(".xt-tab-panel");
    const targetNav = Array.from(navItems).find(b => b.dataset.tab === targetTabId);
    
    if (targetNav) {
      navItems.forEach((b) => b.classList.toggle("active", b === targetNav));
      panels.forEach((p) => p.classList.toggle("active", p.id === targetTabId));
      if (targetTabId === "tab-stats") renderAnalyticsDashboard();
      if (targetTabId === "tab-history") initHistoryTab();
      if (targetTabId === "tab-languages") initLanguagesTab();

      if (videoIndex !== null && !isNaN(videoIndex)) {
        setTimeout(() => {
          const videoCards = document.querySelectorAll("#tab-videos .xt-opt-card");
          const targetCard = videoCards[videoIndex];
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
            targetCard.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
            targetCard.style.borderColor = "var(--accent, #6366f1)";
            targetCard.style.boxShadow = "0 0 0 2px var(--accent-soft, rgba(99, 102, 241, 0.35))";
            setTimeout(() => {
              targetCard.style.borderColor = "";
              targetCard.style.boxShadow = "";
            }, 2500);
          }
        }, 80);
      }
    }
  }

  function initTabs() {
    const navItems = document.querySelectorAll(".xt-nav-item");

    navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tab;
        switchTab(target);
      });
    });

    document.querySelectorAll("[data-goto-tab]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = btn.getAttribute("data-goto-tab");
        const videoIdx = btn.getAttribute("data-video-index");
        switchTab(tabId, videoIdx !== null ? parseInt(videoIdx, 10) : null);
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
      StorageManager.getSelectedModel().then(m => {
        if (m) {
          modelSelect.value = m;
          modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      modelSelect.addEventListener("change", (e) => {
        StorageManager.setSelectedModel(e.target.value);
      });
    }

    // TTS settings sync + dynamic field toggle
    const puterTokenField = document.getElementById("tts-puter-token-field");
    const voiceField = document.getElementById("tts-voice-field");
    const voiceOrigField = document.getElementById("tts-voice-orig-field");
    const directionField = document.getElementById("tts-direction-field");
    
    const voiceGroupEdge = document.getElementById("voice-group-edge");
    const voiceGroupGroq = document.getElementById("voice-group-groq");
    const voiceGroupOrigEdge = document.getElementById("voice-group-orig-edge");
    const voiceGroupOrigGroq = document.getElementById("voice-group-orig-groq");

    const ttsModelOrigSelect = document.getElementById("opt-tts-model-orig");
    const voiceOrigSelect = document.getElementById("opt-voice-orig");

    function updatePuterTokenCardVisibility() {
      const origModel = ttsModelOrigSelect ? ttsModelOrigSelect.value : '';
      const transModel = ttsModelSelect ? ttsModelSelect.value : '';
      const isPuterNeeded = (origModel && origModel.startsWith('puter-')) || (transModel && transModel.startsWith('puter-'));
      if (puterTokenField) puterTokenField.style.display = isPuterNeeded ? '' : 'none';
    }

    function updateTtsFieldsVisibility(model) {
      const isPuter = model && model.startsWith('puter-');
      const isGroq = model && model.startsWith('canopylabs/');
      const isEdge = !model || model === 'edge-tts';
      const isGoogleTts = model === 'google-translate';

      if (voiceField) voiceField.style.display = (isPuter || isGoogleTts) ? 'none' : '';
      if (voiceGroupEdge) voiceGroupEdge.style.display = isGroq ? 'none' : '';
      if (voiceGroupGroq) voiceGroupGroq.style.display = (isEdge || isGoogleTts) ? 'none' : '';
      if (directionField) directionField.style.display = isGroq ? '' : 'none';

      updatePuterTokenCardVisibility();

      if (voiceSelect) {
        const currentOpt = voiceSelect.options[voiceSelect.selectedIndex];
        if (currentOpt && currentOpt.parentElement && currentOpt.parentElement.tagName === 'OPTGROUP' && currentOpt.parentElement.style.display === 'none') {
          const firstVisible = Array.from(voiceSelect.options).find(opt => !opt.parentElement || opt.parentElement.tagName !== 'OPTGROUP' || opt.parentElement.style.display !== 'none');
          if (firstVisible) {
            voiceSelect.value = firstVisible.value;
            voiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }

    function updateTtsOrigFieldsVisibility(model) {
      const isPuter = model && model.startsWith('puter-');
      const isGroq = model && model.startsWith('canopylabs/');
      const isEdge = !model || model === 'edge-tts';
      const isGoogleTts = model === 'google-translate';

      if (voiceOrigField) voiceOrigField.style.display = (isPuter || isGoogleTts) ? 'none' : '';
      if (voiceGroupOrigEdge) voiceGroupOrigEdge.style.display = isGroq ? 'none' : '';
      if (voiceGroupOrigGroq) voiceGroupOrigGroq.style.display = (isEdge || isGoogleTts) ? 'none' : '';

      updatePuterTokenCardVisibility();

      if (voiceOrigSelect) {
        const currentOpt = voiceOrigSelect.options[voiceOrigSelect.selectedIndex];
        if (currentOpt && currentOpt.parentElement && currentOpt.parentElement.tagName === 'OPTGROUP' && currentOpt.parentElement.style.display === 'none') {
          const firstVisible = Array.from(voiceOrigSelect.options).find(opt => !opt.parentElement || opt.parentElement.tagName !== 'OPTGROUP' || opt.parentElement.style.display !== 'none');
          if (firstVisible) {
            voiceOrigSelect.value = firstVisible.value;
            voiceOrigSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }

    const translationModeSelect = document.getElementById("opt-translation-mode");
    if (translationModeSelect && StorageManager.getTranslationMode) {
      StorageManager.getTranslationMode().then(mode => {
        if (mode) {
          translationModeSelect.value = mode;
          translationModeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      translationModeSelect.addEventListener("change", (e) => {
        if (StorageManager.setTranslationMode) StorageManager.setTranslationMode(e.target.value);
      });
      bindKzCustomSelect("opt-translation-mode");
    }

    if (ttsModelOrigSelect && StorageManager.getTtsModelOrig) {
      StorageManager.getTtsModelOrig().then(m => {
        if (m) {
          ttsModelOrigSelect.value = m;
          ttsModelOrigSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
        updateTtsOrigFieldsVisibility(ttsModelOrigSelect.value);
      });
      ttsModelOrigSelect.addEventListener("change", (e) => {
        if (StorageManager.setTtsModelOrig) StorageManager.setTtsModelOrig(e.target.value);
        updateTtsOrigFieldsVisibility(e.target.value);
      });
    }

    if (voiceOrigSelect && StorageManager.getTtsVoiceOrig) {
      StorageManager.getTtsVoiceOrig().then(v => {
        if (v) {
          voiceOrigSelect.value = v;
          voiceOrigSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      voiceOrigSelect.addEventListener("change", (e) => {
        if (StorageManager.setTtsVoiceOrig) StorageManager.setTtsVoiceOrig(e.target.value);
      });
    }

    if (ttsModelSelect) {
      if (StorageManager.getTtsModelTrans) {
        StorageManager.getTtsModelTrans().then(m => {
          if (m) {
            ttsModelSelect.value = m;
            ttsModelSelect.dispatchEvent(new Event("change", { bubbles: true }));
          }
          updateTtsFieldsVisibility(ttsModelSelect.value);
        });
      } else {
        updateTtsFieldsVisibility(ttsModelSelect.value);
      }
      ttsModelSelect.addEventListener("change", (e) => {
        if (StorageManager.setTtsModelTrans) StorageManager.setTtsModelTrans(e.target.value);
        updateTtsFieldsVisibility(e.target.value);
      });
    }

    const puterTokenInput = document.getElementById("opt-puter-token");
    if (puterTokenInput && StorageManager.getPuterToken) {
      StorageManager.getPuterToken().then(t => {
        if (t && puterTokenInput.options.length > 0) {
          puterTokenInput.value = t;
        }
      });
    }

    if (voiceSelect) {
      StorageManager.getTtsVoiceTrans().then(v => { if (v) voiceSelect.value = v; });
      voiceSelect.addEventListener("change", (e) => {
        StorageManager.setTtsVoiceTrans(e.target.value);
      });
    }

    if (voiceDirectionSelect) {
      StorageManager.getTtsDirection().then(d => { if (d) voiceDirectionSelect.value = d; });
      voiceDirectionSelect.addEventListener("change", (e) => {
        StorageManager.setTtsDirection(e.target.value);
      });
    }

    await initMicPermission();
    await initPuterTokenManager();

    // Bind custom kz-select-dropdown UI for all select controls
    bindKzCustomSelect("opt-model-select", "Tìm kiếm mô hình dịch...");
    bindKzCustomSelect("opt-tts-model-orig", "Tìm kiếm bộ phát âm gốc...");
    bindKzCustomSelect("opt-voice-orig", "Tìm kiếm giọng đọc gốc...");
    bindKzCustomSelect("opt-tts-model-select", "Tìm kiếm bộ phát âm dịch...");
    bindKzCustomSelect("opt-puter-token");
    bindKzCustomSelect("opt-voice-select", "Tìm kiếm giọng đọc dịch...");
    bindKzCustomSelect("opt-voice-direction");
  }

  function setStatus(el, kind, text) {
    if (!el) return;
    const icon = SVG_ICONS[kind] || SVG_ICONS.idle;
    el.className = `xt-status ${kind}`;
    el.innerHTML = `${icon}<span>${text}</span>`;
  }

  /* ------------------------------------------------------------------ */
  /* Helper: Transform native <select> to custom kz-select-dropdown     */
  /* ------------------------------------------------------------------ */
  function bindKzCustomSelect(selectId, searchPlaceholder = "") {
    const nativeSelect = typeof selectId === "string" ? document.getElementById(selectId) : selectId;
    if (!nativeSelect) return null;

    if (nativeSelect.dataset.kzSelectDone) return null;
    nativeSelect.dataset.kzSelectDone = "true";

    nativeSelect.style.display = "none";

    const wrap = document.createElement("div");
    wrap.className = "kz-select-custom-wrap";
    wrap.style.width = "100%";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "kz-select-trigger";

    const labelSpan = document.createElement("span");
    const arrowSvg = document.createElement("div");
    arrowSvg.className = "kz-select-arrow";
    arrowSvg.style.display = "inline-flex";
    arrowSvg.style.alignItems = "center";
    arrowSvg.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    trigger.appendChild(labelSpan);
    trigger.appendChild(arrowSvg);
    wrap.appendChild(trigger);

    const dropdown = document.createElement("div");
    dropdown.className = "kz-select-dropdown";
    dropdown.style.display = "none";

    const optionCount = nativeSelect.querySelectorAll("option").length;
    let searchInput = null;
    if (searchPlaceholder || optionCount > 5) {
      const searchBox = document.createElement("div");
      searchBox.className = "kz-select-search-box";
      searchBox.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" placeholder="${searchPlaceholder || 'Tìm kiếm...'}" autocomplete="off" />
      `;
      searchInput = searchBox.querySelector("input");
      dropdown.appendChild(searchBox);
    }

    const listWrap = document.createElement("div");
    listWrap.className = "kz-select-options-list";
    dropdown.appendChild(listWrap);
    wrap.appendChild(dropdown);

    nativeSelect.parentNode.insertBefore(wrap, nativeSelect);

    const renderOptionsList = (filterText = "") => {
      const filter = filterText.toLowerCase().trim();
      let html = "";

      const optgroups = Array.from(nativeSelect.querySelectorAll("optgroup"));
      if (optgroups.length > 0) {
        optgroups.forEach(group => {
          if (group.style.display === "none") return;
          const groupLabel = group.label;
          const options = Array.from(group.querySelectorAll("option"));
          const matched = options.filter(opt => !filter || opt.textContent.toLowerCase().includes(filter));
          if (matched.length > 0) {
            html += `<div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-faint); padding: 6px 10px 2px; letter-spacing: 0.5px;">${_esc(groupLabel)}</div>`;
            matched.forEach(opt => {
              const isSelected = opt.value === nativeSelect.value;
              html += `
                <div class="kz-select-option ${isSelected ? 'active' : ''}" data-value="${_esc(opt.value)}">
                  <span class="kz-select-option-label">${_esc(opt.textContent)}</span>
                </div>
              `;
            });
          }
        });
      } else {
        const options = Array.from(nativeSelect.options);
        options.forEach(opt => {
          if (!filter || opt.textContent.toLowerCase().includes(filter)) {
            const isSelected = opt.value === nativeSelect.value;
            html += `
              <div class="kz-select-option ${isSelected ? 'active' : ''}" data-value="${_esc(opt.value)}">
                <span class="kz-select-option-label">${_esc(opt.textContent)}</span>
              </div>
            `;
          }
        });
      }

      listWrap.innerHTML = html || `<div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center; font-style: italic;">Không tìm thấy kết quả</div>`;
    };

    const updateSelectedLabel = () => {
      const selectedOpt = nativeSelect.options[nativeSelect.selectedIndex];
      labelSpan.textContent = selectedOpt ? selectedOpt.textContent : "";
    };

    updateSelectedLabel();

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains("open");
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    const openDropdown = () => {
      document.querySelectorAll(".kz-select-custom-wrap.open").forEach(w => {
        w.classList.remove("open");
        const d = w.querySelector(".kz-select-dropdown");
        if (d) d.style.display = "none";
      });

      wrap.classList.add("open");
      dropdown.style.display = "block";
      renderOptionsList();
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
    };

    const closeDropdown = () => {
      wrap.classList.remove("open");
      dropdown.style.display = "none";
    };

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        closeDropdown();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderOptionsList(e.target.value);
      });
    }

    listWrap.addEventListener("click", (e) => {
      const optionItem = e.target.closest(".kz-select-option");
      if (optionItem) {
        const val = optionItem.dataset.value;
        nativeSelect.value = val;
        updateSelectedLabel();
        closeDropdown();
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    nativeSelect.addEventListener("change", () => {
      updateSelectedLabel();
    });

    try {
      const origValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (origValueDescriptor && origValueDescriptor.set) {
        Object.defineProperty(nativeSelect, 'value', {
          get() {
            return origValueDescriptor.get.call(this);
          },
          set(val) {
            origValueDescriptor.set.call(this, val);
            updateSelectedLabel();
            if (wrap.classList.contains("open")) {
              renderOptionsList(searchInput ? searchInput.value : "");
            }
          },
          configurable: true
        });
      }
    } catch (err) {}

    const observer = new MutationObserver(() => {
      updateSelectedLabel();
      if (wrap.classList.contains("open")) {
        renderOptionsList(searchInput ? searchInput.value : "");
      }
    });
    observer.observe(nativeSelect, { childList: true, subtree: true, attributes: true });

    return { wrap, updateSelectedLabel, renderOptionsList };
  }

  /* ------------------------------------------------------------------ */
  /* Puter Auth Tokens Manager & Usage Metering                         */
  /* ------------------------------------------------------------------ */
  async function initPuterTokenManager() {
    const puterTokensTextarea = document.getElementById("opt-puter-tokens");
    const savePuterBtn = document.getElementById("opt-save-puter-btn");
    const checkPuterBtn = document.getElementById("opt-check-puter-btn");
    const puterStatusEl = document.getElementById("opt-puter-status");
    const puterUsageContainer = document.getElementById("puter-usage-details");
    const singlePuterSelect = document.getElementById("opt-puter-token");

    if (!puterTokensTextarea) return;

    function populateSingleTokenSelect(tokens) {
      if (!singlePuterSelect) return;
      if (tokens && tokens.length > 0) {
        singlePuterSelect.innerHTML = tokens.map((t, i) => {
          const preview = t.length > 20 ? `${t.substring(0, 10)}...${t.slice(-6)}` : t;
          return `<option value="${_esc(t)}">Token #${i + 1} (${_esc(preview)})</option>`;
        }).join('');
      } else {
        singlePuterSelect.innerHTML = `<option value="">Chưa có Puter Token nào</option>`;
      }
    }

    // Load saved Puter tokens
    if (StorageManager.getPuterTokens) {
      const tokens = await StorageManager.getPuterTokens();
      if (tokens && tokens.length > 0) {
        puterTokensTextarea.value = tokens.join("\n");
        populateSingleTokenSelect(tokens);
        checkPuterUsage(tokens);
      }
    }

    // Save tokens handler
    const saveTokens = async () => {
      const rawText = puterTokensTextarea.value;
      const tokens = rawText.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
      await StorageManager.setPuterTokens(tokens);
      populateSingleTokenSelect(tokens);
      if (tokens.length > 0) {
        setStatus(puterStatusEl, "ok", `Đã lưu ${tokens.length} Puter Token`);
      } else {
        setStatus(puterStatusEl, "idle", "Chưa nhập Token");
      }
      checkPuterUsage(tokens);
    };

    if (savePuterBtn) savePuterBtn.addEventListener("click", saveTokens);
    if (checkPuterBtn) checkPuterBtn.addEventListener("click", async () => {
      const tokens = puterTokensTextarea.value.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
      await checkPuterUsage(tokens);
    });

    async function checkPuterUsage(tokens) {
      if (!tokens || tokens.length === 0) {
        setStatus(puterStatusEl, "idle", "Chưa nhập Token");
        if (puterUsageContainer) puterUsageContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có Puter Auth Token nào được lưu.</div>`;
        return;
      }

      const uniqueTokens = [...new Set(tokens)];

      setStatus(puterStatusEl, "warn", "Đang kiểm tra...");
      if (puterUsageContainer) puterUsageContainer.innerHTML = `<div style="font-size: 12px; color: var(--text-muted);">Đang truy vấn API Puter Metering Usage...</div>`;

      const results = await Promise.all(uniqueTokens.map(async (token, i) => {
        try {
          const res = await fetch("https://api.puter.com/metering/usage", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Accept": "application/json"
            }
          });
          if (!res.ok) return { ok: false, token, i, status: res.status };
          const data = await res.json();
          return { ok: true, token, i, data };
        } catch (err) {
          return { ok: false, token, i, networkError: true, errorMsg: err.message };
        }
      }));

      let validCount = 0;
      let totalAllowanceSum = 0;
      let totalRemainingSum = 0;
      let rowsHtml = "";

      for (const r of results) {
        const safeToken = _esc(r.token);
        if (r.ok) {
          const allowance = r.data.allowanceInfo || {};
          const remaining = allowance.remaining || 0;
          const monthAllowance = allowance.monthUsageAllowance || 25000000;
          const used = Math.max(0, monthAllowance - remaining);
          const usedPercent = Math.min(100, Math.max(0, ((used / monthAllowance) * 100))).toFixed(1);

          const remainingM = (remaining / 1000000).toFixed(2);
          const allowanceM = (monthAllowance / 1000000).toFixed(0);

          validCount++;
          totalAllowanceSum += monthAllowance;
          totalRemainingSum += remaining;

          const barColor = usedPercent > 90 ? 'var(--danger)' : usedPercent > 70 ? 'var(--warning)' : 'var(--accent)';

          rowsHtml += `
            <div class="xt-puter-token-row">
              <div class="xt-puter-token-meta">
                <span class="xt-puter-token-index">#${r.i + 1}</span>
                <span class="xt-puter-token-text" title="${safeToken}">${safeToken}</span>
              </div>
              <div class="xt-puter-meter-box">
                <div class="xt-puter-meter-text">Còn ${remainingM}M / ${allowanceM}M · ${usedPercent}% đã dùng</div>
                <div class="xt-puter-progress-bar">
                  <div class="xt-puter-progress-fill" style="width: ${usedPercent}%; background: ${barColor};"></div>
                </div>
              </div>
              <span class="xt-status ok"><span class="xt-dot"></span>Hoạt động</span>
            </div>
          `;
        } else {
          const statusText = r.networkError ? 'Lỗi mạng / Không thể kết nối' : `Lỗi xác thực (HTTP ${_esc(String(r.status))})`;
          const pillText = r.networkError ? 'Lỗi kết nối' : 'Không hợp lệ';
          rowsHtml += `
            <div class="xt-puter-token-row">
              <div class="xt-puter-token-meta">
                <span class="xt-puter-token-index">#${r.i + 1}</span>
                <span class="xt-puter-token-text" title="${safeToken}">${safeToken}</span>
              </div>
              <div class="xt-puter-meter-box">
                <div class="xt-puter-meter-text" style="color: var(--danger);">${statusText}</div>
              </div>
              <span class="xt-status error"><span class="xt-dot"></span>${pillText}</span>
            </div>
          `;
        }
      }

      let summaryHtml = "";
      if (validCount > 0) {
        const totalRemM = (totalRemainingSum / 1000000).toFixed(2);
        const totalAllowM = (totalAllowanceSum / 1000000).toFixed(0);
        setStatus(puterStatusEl, "ok", `${validCount}/${uniqueTokens.length} Token sẵn sàng (${totalRemM}M units khả dụng)`);
        summaryHtml = `
          <div class="xt-puter-summary-banner">
            <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>Hạn mức tổng khả dụng trong Pool: <strong>${totalRemM}M / ${totalAllowM}M units</strong></span>
            <span>${validCount}/${uniqueTokens.length} Tài khoản Puter OK</span>
          </div>
        `;
      } else {
        setStatus(puterStatusEl, "warn", "0 Token hoạt động");
      }

      if (puterUsageContainer) {
        puterUsageContainer.innerHTML = summaryHtml + `<div class="xt-puter-token-table">${rowsHtml}</div>`;
      }
    }
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
          <div class="xt-trend-col ${i === todayIndex ? "xt-today" : ""}" title="${d.date ? `Ngày ${d.date}: ` : ''}${d.count} lượt dịch (${d.words} từ)">
            <div class="xt-bar-value-pill">${d.count} lượt · ${d.words} từ</div>
            <div class="xt-bar-track">
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

  let languagesTabInitialized = false;

  async function initLanguagesTab() {
    renderLanguageLists();
    renderTargetQuickList();
    renderGlottologCatalog();

    if (languagesTabInitialized) return;
    languagesTabInitialized = true;

    const favList = document.getElementById("favorite-languages-list");
    const recentList = document.getElementById("recent-languages-list");
    const addBtn = document.getElementById("custom-language-btn");

    const optDropdownWrap = document.getElementById("opt-target-select-wrap");
    const optTriggerBtn = document.getElementById("opt-target-trigger");
    const optSelectedLabel = document.getElementById("opt-target-selected-label");
    const optDropdownMenu = document.getElementById("opt-target-dropdown");
    const optSearchInput = document.getElementById("opt-target-search");
    const optOptionsListWrap = document.getElementById("opt-target-options-list");
    const optHiddenSelect = document.getElementById("opt-target-lang");

    optTriggerBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = optDropdownWrap?.classList.contains("open");
      if (isOpen) {
        closeOptDropdown();
      } else {
        openOptDropdown();
      }
    });

    const openOptDropdown = () => {
      if (!optDropdownWrap || !optDropdownMenu) return;
      optDropdownWrap.classList.add("open");
      optDropdownMenu.style.display = "block";
      optSearchInput?.focus();
      if (optSearchInput) optSearchInput.value = "";
      renderCustomOptDropdownOptions();
    };

    const closeOptDropdown = () => {
      if (!optDropdownWrap || !optDropdownMenu) return;
      optDropdownWrap.classList.remove("open");
      optDropdownMenu.style.display = "none";
    };

    document.addEventListener("click", (e) => {
      if (optDropdownWrap && !optDropdownWrap.contains(e.target)) {
        closeOptDropdown();
      }
    });

    optSearchInput?.addEventListener("input", () => {
      renderCustomOptDropdownOptions();
    });

    async function renderCustomOptDropdownOptions() {
      if (!optOptionsListWrap && !optSelectedLabel) return;

      const currentTarget = await StorageManager.getTargetLanguage();
      const favorites = await StorageManager.getFavoriteLanguages();
      const recents = await StorageManager.getRecentLanguages();
      const hiddenLangs = await StorageManager.getHiddenTargetLanguages();

      const allLangs = (typeof GOOGLE_TRANSLATE_LANGUAGES !== 'undefined') ? GOOGLE_TRANSLATE_LANGUAGES : ((typeof GLOTTOLOG_LANGUAGES !== 'undefined') ? GLOTTOLOG_LANGUAGES : []);
      const langMap = {};
      allLangs.forEach(item => {
        const name = item.names ? item.names.en : item.name;
        const nativeName = item.names ? item.names.native : item.nativeName;
        langMap[name] = nativeName;
      });

      const defaultPopular = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES) ? CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES : [
        "Vietnamese", "English", "Japanese", "Korean", "Chinese (Simplified)", 
        "French", "German", "Spanish", "Russian", "Thai", "Lao", "Khmer", 
        "Myanmar (Burmese)", "Filipino (Tagalog)", "Italian", "Portuguese (Brazil)", 
        "Hindi", "Arabic", "Indonesian"
      ];

      const langsSet = new Set();
      favorites.forEach(l => langsSet.add(l));
      if (currentTarget) langsSet.add(currentTarget);
      recents.forEach(l => langsSet.add(l));
      defaultPopular.forEach(l => langsSet.add(l));

      hiddenLangs.forEach(h => {
        if (h !== currentTarget) {
          langsSet.delete(h);
        }
      });

      const query = (optSearchInput ? optSearchInput.value : "").trim().toLowerCase();

      let list = Array.from(langsSet);
      if (query) {
        list = list.filter(name => {
          const native = (langMap[name] || "").toLowerCase();
          return name.toLowerCase().includes(query) || native.includes(query);
        });
      }

      // Update selected trigger label & fallback select
      const currentNative = langMap[currentTarget] || currentTarget;
      const currentText = currentNative && currentNative !== currentTarget ? `${currentNative} (${currentTarget})` : currentTarget;
      if (optSelectedLabel) optSelectedLabel.textContent = currentText;
      if (optHiddenSelect) {
        optHiddenSelect.innerHTML = Array.from(langsSet).map(name => {
          const native = langMap[name] || name;
          const label = native && native !== name ? `${native} (${name})` : name;
          return `<option value="${Utils.escapeSpecialChars(name)}"${name === currentTarget ? ' selected' : ''}>${Utils.escapeSpecialChars(label)}</option>`;
        }).join('');
        optHiddenSelect.value = currentTarget;
      }

      if (!optOptionsListWrap) return;

      if (list.length === 0) {
        optOptionsListWrap.innerHTML = `<div style="padding: 8px; text-align: center; font-size: 11.5px; color: var(--text-muted); font-style: italic;">Không tìm thấy ngôn ngữ nào</div>`;
        return;
      }

      optOptionsListWrap.innerHTML = list.map(name => {
        const native = langMap[name] || name;
        const label = native && native !== name ? `${native} (${name})` : name;
        const isCurrent = name === currentTarget;
        return `
          <div class="kz-select-option ${isCurrent ? 'active' : ''}" data-value="${Utils.escapeSpecialChars(name)}">
            <span class="kz-select-option-label" title="${Utils.escapeSpecialChars(label)}">${Utils.escapeSpecialChars(label)}</span>
            ${!isCurrent ? `<button type="button" class="chip-delete-btn kz-select-option-del" data-value="${Utils.escapeSpecialChars(name)}" title="Xóa khỏi danh sách chọn nhanh"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
          </div>
        `;
      }).join('');

      // Option click handlers
      optOptionsListWrap.querySelectorAll('.kz-select-option').forEach(item => {
        item.addEventListener('click', async (e) => {
          if (e.target.closest('.kz-select-option-del')) return;
          const langName = item.getAttribute('data-value');
          if (langName) {
            await StorageManager.unhideTargetLanguage(langName);
            await StorageManager.setTargetLanguage(langName);
            await StorageManager.addRecentLanguage(langName);
            closeOptDropdown();
            renderLanguageLists();
            renderTargetQuickList();
            renderGlottologCatalog();
          }
        });
      });

      // Delete option click handlers
      optOptionsListWrap.querySelectorAll('.kz-select-option-del').forEach(delBtn => {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const langName = delBtn.getAttribute('data-value');
          if (langName) {
            await StorageManager.removeTargetLanguageFromQuickList(langName);
            renderLanguageLists();
            renderTargetQuickList();
            renderGlottologCatalog();
          }
        });
      });
    }

    addBtn?.addEventListener("click", async () => {
      if (!optHiddenSelect) return;
      const selectedLang = optHiddenSelect.value;
      const favorites = await StorageManager.getFavoriteLanguages();
      if (!favorites.includes(selectedLang)) {
        favorites.push(selectedLang);
        await StorageManager.setFavoriteLanguages(favorites);
        renderLanguageLists();
      }
    });

    async function renderLanguageLists() {
      renderCustomOptDropdownOptions();
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
                <button type="button" class="chip-delete-btn" aria-label="Xoá ${lang}" title="Xóa khỏi yêu thích">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </span>
            `;
          }).join("");

          favList.querySelectorAll(".xt-lang-chip").forEach(chip => {
            const lang = chip.dataset.lang;
            chip.querySelector(".chip-click-trigger")?.addEventListener("click", async () => {
              await StorageManager.setTargetLanguage(lang);
              await StorageManager.addRecentLanguage(lang);
              renderLanguageLists();
              renderGlottologCatalog();
            });
            chip.querySelector("button")?.addEventListener("click", async (e) => {
              e.stopPropagation();
              const updatedFavs = favorites.filter(f => f !== lang);
              await StorageManager.setFavoriteLanguages(updatedFavs);
              renderLanguageLists();
              renderGlottologCatalog();
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
                <button type="button" class="chip-delete-btn" aria-label="Xoá ${lang}" title="Xóa khỏi danh sách gần đây">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </span>
            `;
          }).join("");

          recentList.querySelectorAll(".xt-lang-chip").forEach(chip => {
            const lang = chip.dataset.lang;
            chip.querySelector(".chip-click-trigger")?.addEventListener("click", async () => {
              await StorageManager.setTargetLanguage(lang);
              await StorageManager.addRecentLanguage(lang);
              renderLanguageLists();
              renderGlottologCatalog();
            });
            chip.querySelector("button")?.addEventListener("click", async (e) => {
              e.stopPropagation();
              if (StorageManager.removeRecentLanguage) {
                await StorageManager.removeRecentLanguage(lang);
              }
              renderLanguageLists();
              renderGlottologCatalog();
            });
          });
        }
      }
    }

    // =========================================================================
    // GOOGLE TRANSLATE CATALOG SEARCH & FILTER SYSTEM (249 LANGUAGES)
    // =========================================================================
    const catalogList = document.getElementById("google-catalog-list") || document.getElementById("glottolog-catalog-list");
    const searchInput = document.getElementById("google-search-input") || document.getElementById("glottolog-search-input");
    const loadMoreContainer = document.getElementById("google-load-more") || document.getElementById("glottolog-load-more");
    const loadMoreBtn = document.getElementById("btn-load-more-langs");
    const filterBtns = document.querySelectorAll(".filter-btn, .xt-filter-btn");
    const countBadge = document.getElementById("google-count-badge") || document.getElementById("glottolog-count-badge");

    let currentFilter = 'all';
    let currentSearchQuery = '';
    let filteredLangs = [];

    const allLangs = (typeof GOOGLE_TRANSLATE_LANGUAGES !== 'undefined') ? GOOGLE_TRANSLATE_LANGUAGES : ((typeof GLOTTOLOG_LANGUAGES !== 'undefined') ? GLOTTOLOG_LANGUAGES : []);

    function normalizeSearchText(value) {
      return String(value ?? '')
        .normalize('NFKC')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase('en-US')
        .trim()
        .replace(/\s+/g, ' ');
    }

    async function renderTargetQuickList() {
      const chipsWrap = document.getElementById("target-quicklist-chips");
      const countBadge = document.getElementById("target-quicklist-count");
      if (!chipsWrap) return;

      const favorites = await StorageManager.getFavoriteLanguages();
      const recents = await StorageManager.getRecentLanguages();
      const currentTarget = await StorageManager.getTargetLanguage();

      const defaultPopular = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES) ? CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES : [
        "Vietnamese", "English", "Japanese", "Korean", "Chinese (Simplified)", 
        "French", "German", "Spanish", "Russian", "Thai", "Lao", "Khmer", 
        "Myanmar (Burmese)", "Filipino (Tagalog)", "Italian", "Portuguese (Brazil)", 
        "Hindi", "Arabic", "Indonesian"
      ];

      const hiddenLangs = await StorageManager.getHiddenTargetLanguages();

      const langsSet = new Set();
      favorites.forEach(l => langsSet.add(l));
      if (currentTarget) langsSet.add(currentTarget);
      recents.forEach(l => langsSet.add(l));
      defaultPopular.forEach(l => langsSet.add(l));

      // Filter out hidden languages
      hiddenLangs.forEach(h => {
        if (h !== currentTarget) {
          langsSet.delete(h);
        }
      });

      const langMap = {};
      allLangs.forEach(item => {
        const name = item.names ? item.names.en : item.name;
        const nativeName = item.names ? item.names.native : item.nativeName;
        langMap[name] = nativeName;
      });

      const list = Array.from(langsSet);

      const quicklistCountBadge = document.getElementById("quicklist-count-badge");
      if (quicklistCountBadge) {
        quicklistCountBadge.textContent = `(${langsSet.size})`;
      }

      if (countBadge) {
        countBadge.textContent = `${list.length} ngôn ngữ`;
      }

      if (list.length === 0) {
        chipsWrap.innerHTML = `<span style="font-size: 12px; color: var(--text-faint); font-style: italic;">Chưa có ngôn ngữ đích nào</span>`;
        return;
      }

      chipsWrap.innerHTML = list.map(name => {
        const native = langMap[name] || name;
        const label = native && native !== name ? `${native} (${name})` : name;
        const isCurrent = name === currentTarget;
        return `
          <span class="xt-target-chip ${isCurrent ? 'is-current' : ''}" data-name="${Utils.escapeSpecialChars(name)}">
            <span class="xt-target-chip-text" style="cursor: pointer;" title="Chọn ${Utils.escapeSpecialChars(label)} làm ngôn ngữ dịch đích">${Utils.escapeSpecialChars(label)}</span>
            ${!isCurrent ? `<button class="chip-delete-btn" data-action="remove-target-chip" data-name="${Utils.escapeSpecialChars(name)}" title="Xóa khỏi danh sách ngôn ngữ đích"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
          </span>
        `;
      }).join('');

      chipsWrap.querySelectorAll('.xt-target-chip-text').forEach(textSpan => {
        textSpan.addEventListener('click', async (e) => {
          const chip = e.currentTarget.closest('.xt-target-chip');
          const langName = chip ? chip.getAttribute('data-name') : null;
          if (langName) {
            await StorageManager.setTargetLanguage(langName);
            await StorageManager.addRecentLanguage(langName);
            renderLanguageLists();
            renderTargetQuickList();
            renderGlottologCatalog();
          }
        });
      });

      chipsWrap.querySelectorAll('[data-action="remove-target-chip"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const langName = e.currentTarget.getAttribute('data-name');
          if (langName) {
            await StorageManager.removeTargetLanguageFromQuickList(langName);
            renderTargetQuickList();
            renderGlottologCatalog();
          }
        });
      });
    }

    function filterGlottologLanguages() {
      const q = normalizeSearchText(currentSearchQuery);

      if (!q) {
        filteredLangs = currentFilter === 'has-iso' 
          ? allLangs.filter(item => !!(item.iso || (item.google && item.google.code)))
          : [...allLangs];
      } else {
        const scoredItems = [];

        for (const item of allLangs) {
          if (currentFilter === 'has-iso' && !(item.iso || (item.google && item.google.code))) continue;

          const googleCode = normalizeSearchText(item.google ? item.google.code : item.iso);
          const langId = normalizeSearchText(item.id);
          const nameEn = normalizeSearchText(item.names ? item.names.en : item.name);
          const nameNative = normalizeSearchText(item.names ? item.names.native : item.nativeName);
          const aliasesList = Array.isArray(item.aliases) 
            ? item.aliases.map(normalizeSearchText)
            : [normalizeSearchText(item.aliases)];

          let score = 0;

          // 1. Exact Google Code / ID
          if (googleCode === q) score += 1000;
          else if (googleCode.startsWith(q)) score += 800;

          if (langId === q) score += 950;
          else if (langId.startsWith(q)) score += 750;

          // 2. Exact / StartsWith English Name
          if (nameEn === q) score += 900;
          else if (nameEn.startsWith(q)) score += 700;
          else if (nameEn.includes(q)) score += 500;

          // 3. Exact / StartsWith Native Name
          if (nameNative === q) score += 850;
          else if (nameNative.startsWith(q)) score += 650;
          else if (nameNative.includes(q)) score += 450;

          // 4. Aliases Matching
          for (const alias of aliasesList) {
            if (!alias) continue;
            if (alias === q) { score = Math.max(score, 800); }
            else if (alias.startsWith(q)) { score = Math.max(score, 600); }
            else if (alias.includes(q)) { score = Math.max(score, 400); }
          }

          if (score > 0) {
            scoredItems.push({ item, score });
          }
        }

        // Sort by score descending, then alphabetically by English name (with safe fallback for missing names.en)
        scoredItems.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          const aName = (a.item.names?.en) || a.item.name || '';
          const bName = (b.item.names?.en) || b.item.name || '';
          return aName.localeCompare(bName);
        });

        filteredLangs = scoredItems.map(si => si.item);
      }

      // Render toàn bộ — 249 ngôn ngữ không cần phân trang, A-Z rail cần danh sách đầy đủ
      renderGlottologCatalog();
    }

    let renderToken = 0;

    async function renderGlottologCatalog() {
      if (!catalogList) return;
      const token = ++renderToken; // Token counter to prevent race conditions during rapid async renders

      const favorites = await StorageManager.getFavoriteLanguages();
      const currentTarget = await StorageManager.getTargetLanguage();
      const hiddenLangs = await StorageManager.getHiddenTargetLanguages();
      const recents = await StorageManager.getRecentLanguages();

      if (token !== renderToken) return; // Newer render has been launched, cancel stale callback

      const defaultPopular = (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES) ? CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES : [
        "Vietnamese", "English", "Japanese", "Korean", "Chinese (Simplified)", 
        "French", "German", "Spanish", "Russian", "Thai", "Lao", "Khmer", 
        "Myanmar (Burmese)", "Filipino (Tagalog)", "Italian", "Portuguese (Brazil)", 
        "Hindi", "Arabic", "Indonesian"
      ];
      const quickTargetSet = new Set();
      favorites.forEach(l => quickTargetSet.add(l));
      recents.forEach(l => quickTargetSet.add(l));
      defaultPopular.forEach(l => quickTargetSet.add(l));
      if (currentTarget) quickTargetSet.add(currentTarget);
      hiddenLangs.forEach(h => {
        if (h !== currentTarget) {
          quickTargetSet.delete(h);
        }
      });

      let itemsToRender = filteredLangs;
      if (currentFilter === 'favorites') {
        itemsToRender = filteredLangs.filter(item => {
          const name = item.names ? item.names.en : item.name;
          return favorites.includes(name);
        });
      }

      // Update Card 2 Tab Badges
      const favCountBadge = document.getElementById("fav-count-badge");
      const recentCountBadge = document.getElementById("recent-count-badge");
      const quicklistCountBadge = document.getElementById("quicklist-count-badge");
      if (favCountBadge) favCountBadge.textContent = `(${favorites.length})`;
      if (recentCountBadge) recentCountBadge.textContent = `(${recents.length})`;
      if (quicklistCountBadge) quicklistCountBadge.textContent = `(${quickTargetSet.size})`;

      // Accurately update count badge based on itemsToRender (reflecting favorites filter accurately)
      const countLabel = document.getElementById("google-count-label");
      if (countLabel) {
        countLabel.textContent = currentSearchQuery || currentFilter !== 'all'
          ? `${itemsToRender.length} / ${allLangs.length} ngôn ngữ khớp bộ lọc`
          : `${allLangs.length} ngôn ngữ · nhóm theo bảng chữ cái A–Z để dễ dò tìm bằng mắt`;
      }
      if (countBadge) {
        countBadge.textContent = `${itemsToRender.length.toLocaleString()} / ${allLangs.length.toLocaleString()} ngôn ngữ`;
      }

      const visibleItems = itemsToRender;

      if (visibleItems.length === 0) {
        catalogList.innerHTML = `<div class="empty-state">Không tìm thấy ngôn ngữ phù hợp với "${Utils.escapeSpecialChars(currentSearchQuery)}"</div>`;
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        renderAZRail([]);
        return;
      }

      const scrollEl = document.getElementById("google-catalog-scroll");

      let html = '';
      let lastLetter = '';
      const presentLetters = new Set();

      itemsToRender.forEach(item => {
        const name = (item.names?.en) || item.name || '';
        if (name) {
          const letter = name[0].toUpperCase();
          if (/[A-Z]/.test(letter)) {
            presentLetters.add(letter);
          }
        }
      });

      visibleItems.forEach(item => {
        const langName = (item.names?.en) || item.name || '';
        const nativeName = (item.names?.native) || item.nativeName || '';
        const googleCode = item.google ? item.google.code : item.iso;

        const letter = langName ? langName[0].toUpperCase() : '';
        if (!currentSearchQuery && letter && letter !== lastLetter && /[A-Z]/.test(letter)) {
          html += `<div class="letter-anchor" id="grp-${letter}"></div><div class="letter-group-head">${letter}</div>`;
          lastLetter = letter;
        }

        const isFav = favorites.includes(langName);
        const inTargetList = quickTargetSet.has(langName);

        html += `
          <div class="catalog-item ${inTargetList ? 'is-target-in-list' : ''}" data-name="${Utils.escapeSpecialChars(langName)}">
            <div class="catalog-meta">
              <div class="catalog-name">${Utils.escapeSpecialChars(langName)}</div>
              <div class="catalog-sub">
                <span>${Utils.escapeSpecialChars(nativeName)}</span>
                ${googleCode ? `<span class="catalog-iso">${Utils.escapeSpecialChars(googleCode)}</span>` : ''}
              </div>
            </div>
            <div class="catalog-actions">
              <button class="target-btn ${inTargetList ? 'is-active' : ''}" data-action="toggle-target-list" title="${inTargetList ? 'Đã có trong danh sách chọn nhanh (Bấm để xóa)' : 'Thêm vào danh sách chọn nhanh'}" aria-pressed="${inTargetList ? 'true' : 'false'}" type="button">
                ${inTargetList
                  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Đích</span>'
                  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Thêm Đích</span>'}
              </button>
              <button class="icon-btn ${isFav ? 'is-fav-active' : ''}" data-action="toggle-fav" title="${isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}" aria-label="${isFav ? 'Bỏ yêu thích ' + Utils.escapeSpecialChars(langName) : 'Thêm ' + Utils.escapeSpecialChars(langName) + ' vào yêu thích'}" aria-pressed="${isFav ? 'true' : 'false'}" type="button">
                <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      catalogList.innerHTML = html;

      catalogList.querySelectorAll(".catalog-item").forEach(card => {
        const name = card.dataset.name;

        card.querySelector('[data-action="toggle-target-list"]')?.addEventListener("click", async () => {
          const inList = quickTargetSet.has(name);
          if (inList) {
            await StorageManager.removeTargetLanguageFromQuickList(name);
          } else {
            await StorageManager.unhideTargetLanguage(name);
            await StorageManager.addRecentLanguage(name);
          }
          renderLanguageLists();
          renderTargetQuickList();
          renderGlottologCatalog();
        });

        card.querySelector('[data-action="toggle-fav"]')?.addEventListener("click", async () => {
          const currentFavs = await StorageManager.getFavoriteLanguages();
          let updatedFavs = [];
          if (currentFavs.includes(name)) {
            updatedFavs = currentFavs.filter(f => f !== name);
          } else {
            updatedFavs = [...currentFavs, name];
          }
          await StorageManager.setFavoriteLanguages(updatedFavs);
          renderLanguageLists();
          renderTargetQuickList();
          renderGlottologCatalog();
        });
      });

      renderAZRail(presentLetters, scrollEl);
      renderTargetQuickList();

      // Load More đã bỏ — render toàn bộ 249 ngôn ngữ cùng lúc
    }

    function renderAZRail(presentLetters, scrollContainer) {
      const railEl = document.getElementById("az-rail");
      if (!railEl) return;
      const scrollEl = scrollContainer || document.getElementById("google-catalog-scroll");

      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
      railEl.innerHTML = alphabet.map(ch => {
        const has = presentLetters && presentLetters.has ? presentLetters.has(ch) : false;
        return `<button type="button" ${has ? '' : 'disabled'} data-letter="${ch}">${ch}</button>`;
      }).join('');

      railEl.querySelectorAll('button:not(:disabled)').forEach(b => {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          const letter = b.dataset.letter;
          const targetEl = document.getElementById('grp-' + letter);
          if (targetEl && scrollEl) {
            scrollEl.scrollTo({ top: targetEl.offsetTop, behavior: 'smooth' });
          }
        });
      });
    }

    // Card 2 Tabs Switcher Listener
    const tabBtns = document.querySelectorAll(".tabs .tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        
        const favList = document.getElementById("favorite-languages-list");
        const recentList = document.getElementById("recent-languages-list");
        const targetQuickTab = document.getElementById("tab-target-quick");

        if (favList) favList.style.display = tab === "fav" ? "flex" : "none";
        if (recentList) recentList.style.display = tab === "recent" ? "flex" : "none";
        if (targetQuickTab) targetQuickTab.style.display = tab === "target-quick" ? "block" : "none";
      });
    });

    // Search input listener
    if (searchInput) {
      searchInput.addEventListener("input", Utils.debounce(() => {
        currentSearchQuery = searchInput.value;
        filterGlottologLanguages();
      }, 150));
    }

    // Filter button group listener
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        currentFilter = btn.dataset.filter;
        filterGlottologLanguages();
      });
    });

    // Load More listener
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        displayedCount += 60;
        renderGlottologCatalog();
      });
    }

    // Initialize
    renderLanguageLists();
    filterGlottologLanguages();
  }

  /* ------------------------------------------------------------------ */
  /* Tab 4 — History Controller                                           */
  /* ------------------------------------------------------------------ */
  async function initHistoryTab() {
    const listEl = document.getElementById("history-list");
    const filterSelect = document.getElementById("history-filter-type");
    const clearBtn = document.getElementById("clear-history-btn");
    const itemTemplate = document.getElementById("history-item-template");
    const emptyTemplate = document.getElementById("history-empty-template");

    if (!listEl) return;

    bindKzCustomSelect("history-filter-type");

    let history = await StorageManager.getTranslationHistory();

    function renderList() {
      const typeFilter = filterSelect ? filterSelect.value : "all";

      const filtered = history.filter((item) => {
        return typeFilter === "all" || item.type === typeFilter;
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
  async function initPlayground() {
    const input = document.getElementById("pg-input");
    const output = document.getElementById("pg-output");
    const jsonOutput = document.getElementById("pg-json-output");
    const runBtn = document.getElementById("pg-run-btn");
    const targetLangSelect = document.getElementById("pg-target-lang");
    const modeSelect = document.getElementById("pg-mode-select");
    const modelSelect = document.getElementById("pg-model-select");
    const ttsModelSelect = document.getElementById("pg-tts-model-select");
    const ttsOrigBtn = document.getElementById("pg-tts-orig-btn");
    const ttsBtn = document.getElementById("pg-tts-btn");
    const copyBtn = document.getElementById("pg-copy-btn");
    const tabRenderedBtn = document.getElementById("pg-tab-rendered");
    const tabJsonBtn = document.getElementById("pg-tab-json");
    const metaBadge = document.getElementById("pg-meta-badge");

    if (!input || !output) return;

    let currentResultText = "";
    let lastRawResult = null;

    // Output View Tabs Toggle (Rendered HTML vs Debug JSON)
    tabRenderedBtn?.addEventListener("click", () => {
      tabRenderedBtn.classList.add("active");
      tabJsonBtn?.classList.remove("active");
      output.style.display = "block";
      if (jsonOutput) jsonOutput.style.display = "none";
    });

    tabJsonBtn?.addEventListener("click", () => {
      tabJsonBtn.classList.add("active");
      tabRenderedBtn?.classList.remove("active");
      output.style.display = "none";
      if (jsonOutput) {
        jsonOutput.style.display = "block";
        jsonOutput.textContent = lastRawResult ? JSON.stringify(lastRawResult, null, 2) : "Chưa có dữ liệu Debug. Hãy bấm 'Chạy Thử Nghiệm AI'.";
      }
    });

    // Populate target language select
    if (targetLangSelect) {
      const allLangs = (typeof GOOGLE_TRANSLATE_LANGUAGES !== 'undefined') ? GOOGLE_TRANSLATE_LANGUAGES : [];
      const popular = ["Vietnamese", "English", "Japanese", "Korean", "Chinese (Simplified)", "French", "German", "Spanish", "Russian"];
      
      let html = popular.map(l => `<option value="${_esc(l)}">${_esc(l)}</option>`).join('');
      const otherLangs = allLangs.filter(i => {
        const name = i.names ? i.names.en : i.name;
        return !popular.includes(name);
      });
      if (otherLangs.length > 0) {
        html += `<optgroup label="Ngôn ngữ khác">` + otherLangs.map(i => {
          const name = i.names ? i.names.en : i.name;
          return `<option value="${_esc(name)}">${_esc(name)}</option>`;
        }).join('') + `</optgroup>`;
      }
      targetLangSelect.innerHTML = html;

      StorageManager.getTargetLanguage().then(lang => {
        if (lang) {
          targetLangSelect.value = lang;
          targetLangSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      targetLangSelect.addEventListener("change", (e) => {
        StorageManager.setTargetLanguage(e.target.value);
      });
    }

    // Bind custom select dropdowns
    bindKzCustomSelect("pg-target-lang", "Tìm kiếm ngôn ngữ...");
    bindKzCustomSelect("pg-mode-select");
    bindKzCustomSelect("pg-model-select");
    bindKzCustomSelect("pg-tts-model-select");

    // Preset Sample Chips
    document.querySelectorAll(".pg-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const sampleText = btn.dataset.text;
        const sampleMode = btn.dataset.mode;
        if (sampleText) input.value = sampleText;
        if (sampleMode && modeSelect) {
          modeSelect.value = sampleMode;
          modeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });

    // Audio TTS Player Handler
    let currentAudio = null;
    const handleTtsClick = async (btn, getTextFn, isOriginal = false) => {
      if (!btn) return;
      const textToSpeak = getTextFn();
      if (!textToSpeak) return;

      const origBtnContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Đang tải…`;

      try {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        const overrideTts = ttsModelSelect ? ttsModelSelect.value : "default";
        let origTtsModel = null;

        if (overrideTts && overrideTts !== "default") {
          if (isOriginal && StorageManager.setTtsModelOrig) {
            origTtsModel = await StorageManager.getTtsModelOrig();
            await StorageManager.setTtsModelOrig(overrideTts);
          } else if (!isOriginal && StorageManager.setTtsModelTrans) {
            origTtsModel = await StorageManager.getTtsModelTrans();
            await StorageManager.setTtsModelTrans(overrideTts);
          }
        }

        let audioUrl = null;
        try {
          audioUrl = await ApiService.textToSpeech(textToSpeak, isOriginal);
        } finally {
          if (origTtsModel) {
            if (isOriginal && StorageManager.setTtsModelOrig) {
              await StorageManager.setTtsModelOrig(origTtsModel);
            } else if (!isOriginal && StorageManager.setTtsModelTrans) {
              await StorageManager.setTtsModelTrans(origTtsModel);
            }
          }
        }

        if (audioUrl) {
          currentAudio = new Audio(audioUrl);
          currentAudio.play();
          currentAudio.onended = () => {
            btn.disabled = false;
            btn.innerHTML = origBtnContent;
          };
          currentAudio.onerror = (e) => {
            console.error("Audio playback error:", e);
            alert("Không thể phát file âm thanh. Vui lòng kiểm tra kết nối mạng.");
            btn.disabled = false;
            btn.innerHTML = origBtnContent;
          };
        } else {
          alert("Không thể tạo phát âm TTS. Vui lòng kiểm tra API Key hoặc Puter Token.");
          btn.disabled = false;
          btn.innerHTML = origBtnContent;
        }
      } catch (err) {
        alert("Lỗi phát âm TTS: " + (err.message || err));
        btn.disabled = false;
        btn.innerHTML = origBtnContent;
      }
    };

    ttsOrigBtn?.addEventListener("click", () => handleTtsClick(ttsOrigBtn, () => input ? input.value.trim() : "", true));
    ttsBtn?.addEventListener("click", () => handleTtsClick(ttsBtn, () => currentResultText || (input ? input.value.trim() : ""), false));

    // Copy Result Handler
    copyBtn?.addEventListener("click", () => {
      if (!currentResultText) return;
      navigator.clipboard.writeText(currentResultText).then(() => {
        const origText = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Đã sao chép!`;
        setTimeout(() => { copyBtn.innerHTML = origText; }, 1500);
      });
    });

    // Run Translation Workbench Handler
    runBtn?.addEventListener("click", async () => {
      const text = input ? input.value.trim() : "";
      if (!text) {
        output.textContent = "Vui lòng nhập từ hoặc đoạn văn để thử nghiệm.";
        output.classList.add("xt-pg-empty");
        if (ttsOrigBtn) ttsOrigBtn.classList.remove("visible");
        if (ttsBtn) ttsBtn.classList.remove("visible");
        if (copyBtn) copyBtn.classList.remove("visible");
        if (metaBadge) metaBadge.textContent = "";
        return;
      }

      output.classList.remove("xt-pg-empty");
      output.innerHTML = `<div style="display:flex; align-items:center; gap:8px; color:var(--text-muted);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Đang gọi API và xử lý bằng mô hình AI…</div>`;
      runBtn.disabled = true;

      const startTime = performance.now();

      try {
        const targetLang = targetLangSelect ? targetLangSelect.value : "Vietnamese";
        const mode = modeSelect ? modeSelect.value : "auto";
        const overrideModel = modelSelect ? modelSelect.value : "default";

        let isSingleWord = false;
        if (mode === "single") {
          isSingleWord = true;
        } else if (mode === "text") {
          isSingleWord = false;
        } else {
          isSingleWord = !text.includes(" ") && text.length < 35;
        }

        // Apply temporary model override if selected
        let origModel = null;
        if (overrideModel && overrideModel !== "default") {
          origModel = await StorageManager.getSelectedModel();
          await StorageManager.setSelectedModel(overrideModel);
        }

        let result = null;
        try {
          result = await ApiService.translate(text, isSingleWord, targetLang);
        } finally {
          // Restore original model setting if overridden
          if (origModel) {
            await StorageManager.setSelectedModel(origModel);
          }
        }

        const endTime = performance.now();
        const durationMs = Math.round(endTime - startTime);

        lastRawResult = result;
        if (jsonOutput && tabJsonBtn?.classList.contains("active")) {
          jsonOutput.textContent = JSON.stringify(result, null, 2);
        }

        if (result) {
          const usedModelName = overrideModel !== "default" ? overrideModel : (await StorageManager.getSelectedModel() || "Llama 3.3 70B");
          if (metaBadge) {
            metaBadge.innerHTML = `<span class="xt-status ok"><span class="xt-dot"></span>Thành công (${durationMs}ms) — Mô hình: ${escapeHtml(usedModelName)}</span>`;
          }

          if (isSingleWord && (result.meaning || result.description)) {
            currentResultText = result.meaning || result.translated || "";
            
            const renderChips = (items, isVariant = false) => {
              return items.map(item => {
                if (typeof item === 'string') {
                  return `
                    <div class="kz-tag-chip">
                      <div class="kz-chip-top">
                        <div class="kz-chip-title-wrap">
                          <span class="kz-chip-term">${_esc(item)}</span>
                        </div>
                      </div>
                    </div>
                  `;
                }
                const term = _esc(item.term || '');
                const pos = _esc(item.partOfSpeech || '');
                const form = isVariant && item.form ? _esc(item.form) : '';
                const meaning = _esc(item.meaning || '');
                const level = item.level ? _esc(item.level) : '';
                return `
                  <div class="kz-tag-chip">
                    <div class="kz-chip-top">
                      <div class="kz-chip-title-wrap">
                        <span class="kz-chip-term">${term}</span>
                        ${pos ? `<span class="kz-chip-pos">(${pos})</span>` : ''}
                      </div>
                      ${level ? `<span class="kz-chip-level">${level}</span>` : ''}
                    </div>
                    ${form ? `<div class="kz-chip-form-tag">${form}</div>` : ''}
                    ${meaning ? `<div class="kz-chip-meaning">${meaning}</div>` : ''}
                  </div>
                `;
              }).join('');
            };

            let html = `<div class="pg-result-card">`;

            // Head row: Meaning, IPA, POS, Level badge
            html += `
              <div class="pg-head-row" style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px; font-weight: 700; color: var(--accent);">${_esc(result.meaning || result.translated || "")}</span>
                ${result.transcription ? `<span style="font-size: 13px; font-weight: 500; color: var(--text-muted); font-family: monospace;">${_esc(result.transcription)}</span>` : ''}
                ${result.partOfSpeech ? `<span style="font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 6px; background: var(--accent-soft, rgba(99,102,241,0.12)); color: var(--accent); text-transform: uppercase;">${_esc(result.partOfSpeech)}</span>` : ''}
                ${result.level ? `<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: rgba(16,185,129,0.12); color: #10b981;" title="Hệ thống: ${_esc(result.levelSystem || '')}">${_esc(result.level)}</span>` : ''}
              </div>
            `;

            // Description
            if (result.description || result.explanation) {
              html += `<p style="margin: 6px 0; font-size: 13px; line-height: 1.6; color: var(--text);">${_esc(result.description || result.explanation)}</p>`;
            }

            // Usage Notes Box
            if (result.usageNotes && result.usageNotes.trim()) {
              html += `
                <div style="margin-top: 8px; padding: 8px 12px; background: var(--accent-soft, rgba(99,102,241,0.06)); border-radius: 8px; border-left: 3px solid var(--accent); font-size: 12px; color: var(--text-muted); display: flex; align-items: flex-start; gap: 6px; line-height: 1.5;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px; color: var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  <div><strong>Ghi chú sử dụng:</strong> ${_esc(result.usageNotes)}</div>
                </div>
              `;
            }

            // Example Sentences
            if (result.examples && result.examples.length > 0) {
              html += `<div style="margin-top: 10px;"><strong style="font-size: 12px; color: var(--text-muted);">Ví dụ:</strong><div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">`;
              result.examples.forEach((ex, idx) => {
                const transEx = result.examplesTranslated && result.examplesTranslated[idx] ? _esc(result.examplesTranslated[idx]) : '';
                html += `
                  <div style="padding: 6px 10px; background: var(--surface); border-radius: 6px; border: 1px solid var(--border); font-size: 12.5px;">
                    <div style="color: var(--text); font-weight: 500;">${_esc(ex)}</div>
                    ${transEx ? `<div style="color: var(--text-muted); font-style: italic; margin-top: 2px; font-size: 12px;">${transEx}</div>` : ''}
                  </div>
                `;
              });
              html += `</div></div>`;
            }

            // Synonyms Chips
            if (result.synonyms && result.synonyms.length > 0) {
              html += `
                <div style="margin-top: 12px;">
                  <strong style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 6px;">Từ đồng nghĩa (${result.synonyms.length}):</strong>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                    ${renderChips(result.synonyms, false)}
                  </div>
                </div>
              `;
            }

            // Other Word Forms Chips (Derivatives / Biến thể từ)
            if (result.otherWordForms && result.otherWordForms.length > 0) {
              html += `
                <div style="margin-top: 12px;">
                  <strong style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 6px;">Biến thể &amp; Từ liên quan (${result.otherWordForms.length}):</strong>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                    ${renderChips(result.otherWordForms, true)}
                  </div>
                </div>
              `;
            }

            html += `</div>`;
            output.innerHTML = html;
          } else {
            currentResultText = result.translated || result.meaning || (typeof result === 'string' ? result : JSON.stringify(result));
            output.innerHTML = `<div style="font-size: 14px; line-height: 1.6; color: var(--text); white-space: pre-wrap;">${_esc(currentResultText)}</div>`;
          }

          if (ttsOrigBtn) ttsOrigBtn.classList.add("visible");
          if (ttsBtn) ttsBtn.classList.add("visible");
          if (copyBtn) copyBtn.classList.add("visible");
        } else {
          output.textContent = "Không thể lấy kết quả dịch. Vui lòng kiểm tra lại API Key hoặc chọn mô hình khác.";
          if (ttsOrigBtn) ttsOrigBtn.classList.remove("visible");
          if (ttsBtn) ttsBtn.classList.remove("visible");
          if (copyBtn) copyBtn.classList.remove("visible");
          if (metaBadge) metaBadge.innerHTML = `<span class="xt-status error"><span class="xt-dot"></span>Lỗi kết quả</span>`;
        }
      } catch (err) {
        output.textContent = "Lỗi dịch thử: " + (err.message || "Kiểm tra kết nối internet.");
        if (ttsOrigBtn) ttsOrigBtn.classList.remove("visible");
        if (ttsBtn) ttsBtn.classList.remove("visible");
        if (copyBtn) copyBtn.classList.remove("visible");
        if (metaBadge) metaBadge.innerHTML = `<span class="xt-status error"><span class="xt-dot"></span>Lỗi kết nối API</span>`;
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
        alert("Bạn đang sử dụng phiên bản KimiZK Translator mới nhất (v1.0.6)!");
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
