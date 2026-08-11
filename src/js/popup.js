document.addEventListener("DOMContentLoaded", () => {
    // 1. Version info
    try {
        const version = chrome.runtime.getManifest().version;
        document.querySelectorAll("#version").forEach(el => el.textContent = version);
    } catch (e) {
        console.warn('Could not load version:', e);
    }

    // 2. Open options page handlers
    const openOptionsPage = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('src/html/options.html'));
        }
    };

    document.getElementById("open-options-btn")?.addEventListener("click", openOptionsPage);
    document.getElementById("full-settings-link")?.addEventListener("click", openOptionsPage);

    // Theme toggle handler
    const themeToggleBtn = document.getElementById("kz-theme-toggle");

    function applyPopupTheme(theme) {
        const isDark = theme === "dark";
        document.body.classList.toggle("dark-theme", isDark);
        document.body.classList.toggle("dark", isDark);
        if (themeToggleBtn) {
            themeToggleBtn.title = isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối";
            themeToggleBtn.innerHTML = isDark
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        }
    }

    themeToggleBtn?.addEventListener("click", async () => {
        const isDark = document.body.classList.contains("dark-theme") || document.body.classList.contains("dark");
        const nextTheme = isDark ? "light" : "dark";
        applyPopupTheme(nextTheme);
        if (typeof StorageManager !== 'undefined' && StorageManager.setTheme) {
            StorageManager.setTheme(nextTheme);
        }
    });

    if (typeof StorageManager !== 'undefined' && StorageManager.getTheme) {
        StorageManager.getTheme().then(theme => {
            applyPopupTheme(theme);
        });
    }

    // 3. Mode Tabs Logic (Text | Voice STT | Screen OCR)
    const modeTabs = document.querySelectorAll(".kz-mode-tab, .xt-mode-tab");
    const modeViews = {
        text: document.getElementById("view-text-mode"),
        voice: document.getElementById("view-voice-mode"),
        ocr: document.getElementById("view-ocr-mode")
    };

    modeTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const selectedMode = tab.getAttribute("data-mode");
            modeTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            Object.keys(modeViews).forEach(m => {
                if (modeViews[m]) {
                    if (m === selectedMode) {
                        modeViews[m].style.display = "block";
                        modeViews[m].classList.add("active");
                    } else {
                        modeViews[m].style.display = "none";
                        modeViews[m].classList.remove("active");
                    }
                }
            });
        });
    });

    // 4. Custom Searchable Select Dropdown & Deletion System
    const triggerBtn = document.getElementById("popup-target-trigger");
    const dropdownWrap = document.getElementById("popup-target-select-wrap");
    const dropdownMenu = document.getElementById("popup-target-dropdown");
    const searchInput = document.getElementById("popup-target-search");
    const optionsListWrap = document.getElementById("popup-target-options-list");
    const selectedLabel = document.getElementById("popup-target-selected-label");
    const hiddenSelect = document.getElementById("popup-target-lang");
    const targetSelect = hiddenSelect;


    // Toggle dropdown open/close
    triggerBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdownWrap.classList.contains("open");
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    const openDropdown = () => {
        dropdownWrap.classList.add("open");
        dropdownMenu.style.display = "block";
        searchInput?.focus();
        if (searchInput) searchInput.value = "";
        renderCustomDropdownOptions();
    };

    const closeDropdown = () => {
        dropdownWrap.classList.remove("open");
        dropdownMenu.style.display = "none";
    };

    // Close on click outside
    document.addEventListener("click", (e) => {
        if (dropdownWrap && !dropdownWrap.contains(e.target)) {
            closeDropdown();
        }
    });

    // Live search inside dropdown
    searchInput?.addEventListener("input", () => {
        renderCustomDropdownOptions();
    });

    async function renderCustomDropdownOptions() {
        if (!optionsListWrap) return;

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

        // Filter out hidden languages
        hiddenLangs.forEach(h => {
            if (h !== currentTarget) {
                langsSet.delete(h);
            }
        });

        const query = (searchInput ? searchInput.value : "").trim().toLowerCase();

        let list = Array.from(langsSet);
        if (query) {
            list = list.filter(name => {
                const native = (langMap[name] || "").toLowerCase();
                return name.toLowerCase().includes(query) || native.includes(query);
            });
        }

        // Update selected trigger label
        const currentNative = langMap[currentTarget] || currentTarget;
        const currentText = currentNative && currentNative !== currentTarget ? `${currentNative} (${currentTarget})` : currentTarget;
        if (selectedLabel) selectedLabel.textContent = currentText;
        if (hiddenSelect) hiddenSelect.value = currentTarget;

        if (list.length === 0) {
            optionsListWrap.innerHTML = `<div style="padding: 8px; text-align: center; font-size: 11.5px; color: var(--text-muted); font-style: italic;">Không tìm thấy ngôn ngữ nào</div>`;
            return;
        }

        optionsListWrap.innerHTML = list.map(name => {
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
        optionsListWrap.querySelectorAll('.kz-select-option').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.kz-select-option-del')) return;
                const langName = item.getAttribute('data-value');
                if (langName) {
                    await StorageManager.unhideTargetLanguage(langName);
                    await StorageManager.setTargetLanguage(langName);
                    await StorageManager.addRecentLanguage(langName);
                    chrome.runtime.sendMessage({ action: "saveTargetLanguage", language: langName });
                    closeDropdown();
                    renderCustomDropdownOptions();
                    
                    const inputArea = document.getElementById("popup-input-text");
                    if (inputArea && inputArea.value.trim()) {
                        handlePopupTranslate();
                    }
                }
            });
        });

        // Option delete handlers
        optionsListWrap.querySelectorAll('.kz-select-option-del').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const langName = btn.getAttribute('data-value');
                if (langName) {
                    await StorageManager.removeTargetLanguageFromQuickList(langName);
                    renderCustomDropdownOptions();
                }
            });
        });
    }

    renderCustomDropdownOptions();

    // Listen for live storage changes (e.g. user added favorite/target language in options page)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && (changes.targetLanguage || changes.favoriteLanguages || changes.recentLanguages || changes.hiddenTargetLanguages)) {
                renderCustomDropdownOptions();
            }
        });
    }



    // 5. Quick Translation Logic inside Popup with Skeleton Loader & Web Citations
    const inputArea = document.getElementById("popup-input-text");
    const translateBtn = document.getElementById("popup-translate-btn");
    const resultBox = document.getElementById("popup-result-container");
    const resultText = document.getElementById("popup-result-text");
    const resultDesc = document.getElementById("popup-result-desc");
    const detectedBadge = document.getElementById("popup-detected-lang");
    const listenBtn = document.getElementById("popup-listen-btn");
    const copyBtn = document.getElementById("popup-copy-btn");
    const skeletonBox = document.getElementById("popup-skeleton");
    const citationsBox = document.getElementById("popup-citations-container");
    const citationsList = document.getElementById("popup-citations-list");

    let lastResult = null;

    const renderCitations = (executedTools) => {
        if (!citationsBox || !citationsList) return;
        if (!executedTools || !Array.isArray(executedTools) || executedTools.length === 0) {
            citationsBox.style.display = "none";
            return;
        }

        let citationsHTML = '';
        executedTools.forEach((tool, index) => {
            if (tool.url || tool.link) {
                const url = tool.url || tool.link;
                const title = tool.title || tool.name || `Nguồn ${index + 1}`;
                citationsHTML += `
                    <a href="${url}" target="_blank" class="xt-citation-chip" title="${url}">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        [${index + 1}] ${title.length > 25 ? title.substring(0, 25) + '...' : title}
                    </a>
                `;
            }
        });

        if (citationsHTML) {
            citationsList.innerHTML = citationsHTML;
            citationsBox.style.display = "flex";
        } else {
            citationsBox.style.display = "none";
        }
    };

    const handlePopupTranslate = async (textOverride = null, typeOverride = 'text') => {
        const query = textOverride || inputArea.value.trim();
        if (!query) return;

        translateBtn.disabled = true;
        translateBtn.innerHTML = `
            <svg class="xt-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>
            Đang dịch...
        `;
        
        if (resultBox) resultBox.style.display = "none";
        if (skeletonBox) skeletonBox.style.display = "flex";

        try {
            const targetLang = (await StorageManager.getTargetLanguage()) || (targetSelect ? targetSelect.value : 'Vietnamese');
            const isSingleWord = query.split(/\s+/).length === 1 && query.length <= 50;
            
            const startTime = Date.now();
            const result = await ApiService.translate(query, isSingleWord, targetLang);
            const elapsed = Date.now() - startTime;

            if (skeletonBox) skeletonBox.style.display = "none";

            if (result) {
                if (typeof StorageManager !== 'undefined' && StorageManager.recordTranslationEvent) {
                    StorageManager.recordTranslationEvent(query, targetLang, elapsed);
                }
                if (typeof StorageManager !== 'undefined' && StorageManager.addTranslationHistory) {
                    StorageManager.addTranslationHistory({
                        type: typeOverride || 'text',
                        originalText: query,
                        translatedText: result.translated || result.meaning || '',
                        targetLang: targetLang,
                        timestamp: Date.now()
                    });
                }
                lastResult = result;
                resultBox.style.display = "flex";
                
                const mainResult = isSingleWord ? (result.meaning || result.translated) : result.translated;
                resultText.textContent = mainResult || '';

                // Auto-correction notice
                const correctionNotice = document.getElementById("popup-correction-notice");
                if (correctionNotice) {
                    if (result.correctedFrom && result.correctedFrom.trim()) {
                        const targetWord = result.term || query;
                        correctionNotice.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> <span>Tự động sửa chính tả: <del class="kz-corr-orig">${Utils.escapeSpecialChars(result.correctedFrom)}</del> → <strong class="kz-corr-target">${Utils.escapeSpecialChars(targetWord)}</strong></span>`;
                        correctionNotice.style.display = "flex";
                    } else {
                        correctionNotice.style.display = "none";
                    }
                }

                detectedBadge.textContent = `${result.detectedLanguage || 'Tự động'} → ${result.targetLanguage || 'tiếng Việt'}`;
                
                // 1b. Dòng meta: ngôn ngữ · phiên âm · [POS] · level — mỗi mục kèm dấu · riêng
                const phoneticEl = document.getElementById("popup-phonetic-badge");
                const phoneticSep = document.getElementById("popup-phonetic-sep");
                const posEl = document.getElementById("popup-pos-badge");
                const posSep = document.getElementById("popup-pos-sep");
                const levelEl = document.getElementById("popup-level-badge");
                const levelSep = document.getElementById("popup-level-sep");

                const setMeta = (el, sepEl, value) => {
                    if (!el) return;
                    const has = !!(value && String(value).trim());
                    el.textContent = has ? value : '';
                    el.style.display = has ? '' : 'none';
                    if (sepEl) sepEl.style.display = has ? 'inline' : 'none';
                };
                
                const rawPhonetic = result.transcription || result.phonetic;
                const formattedPhonetic = rawPhonetic ? (rawPhonetic.startsWith('/') ? rawPhonetic : `/${rawPhonetic}/`) : '';
                setMeta(phoneticEl, phoneticSep, formattedPhonetic);
                setMeta(posEl, posSep, result.partOfSpeech ? result.partOfSpeech.toUpperCase() : '');
                setMeta(levelEl, levelSep, result.level);

                // Tab elements & content panes
                const tabsBar = document.getElementById("popup-result-tabs");
                const descPane = document.getElementById("popup-result-desc");
                const examplesPane = document.getElementById("popup-result-examples");
                const synonymsPane = document.getElementById("popup-result-synonyms");
                const variantsPane = document.getElementById("popup-result-variants");

                const countExamples = document.getElementById("popup-tab-count-examples");
                const countSynonyms = document.getElementById("popup-tab-count-synonyms");
                const countVariants = document.getElementById("popup-tab-count-variants");

                const hasDesc = !!(result.description || result.explanation);
                const hasExamples = !!(result.examples && result.examples.length > 0);
                const hasSynonyms = !!(result.synonyms && result.synonyms.length > 0);
                const hasVariants = !!(result.otherWordForms && result.otherWordForms.length > 0);

                // Helper: escape HTML for safe innerHTML
                const _esc = (str) => typeof Utils !== 'undefined' ? Utils.escapeSpecialChars(str) : String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

                // Helper render chip: [term pos level] / [form] / [meaning]
                const renderObjectChips = (container, items, showForm = false) => {
                    container.innerHTML = items.map(item => {
                        if (typeof item === 'string') {
                            return `<div class="kz-tag-chip"><div class="kz-chip-top"><div class="kz-chip-title-wrap"><span class="kz-chip-term">${_esc(item)}</span></div></div></div>`;
                        }
                        const term = item.term || '';
                        const pos = item.partOfSpeech || '';
                        const meaning = item.meaning || '';
                        const level = item.level || '';
                        const form = showForm && item.form ? item.form : '';

                        return `<div class="kz-tag-chip">
                            <div class="kz-chip-top">
                                <div class="kz-chip-title-wrap">
                                    <span class="kz-chip-term">${_esc(term)}</span>
                                    ${pos ? `<span class="kz-chip-pos">(${_esc(pos)})</span>` : ''}
                                </div>
                                ${level ? `<span class="kz-chip-level">${_esc(level)}</span>` : ''}
                            </div>
                            ${form ? `<div class="kz-chip-form-tag">${_esc(form)}</div>` : ''}
                            ${meaning ? `<div class="kz-chip-meaning">${_esc(meaning)}</div>` : ''}
                        </div>`;
                    }).join('');
                };

                // Populate panes
                if (descPane) {
                    if (hasDesc) {
                        let descHtml = `<p class="kz-desc-text">${_esc(result.description || result.explanation)}</p>`;
                        if (result.usageNotes && result.usageNotes.trim()) {
                            descHtml += `<div class="kz-usage-notes"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> ${_esc(result.usageNotes)}</div>`;
                        }
                        descPane.innerHTML = descHtml;
                    } else {
                        descPane.innerHTML = '';
                    }
                }

                if (examplesPane) {
                    if (hasExamples) {
                        const examples = result.examples;
                        examplesPane.innerHTML = examples.map((ex, i) => {
                            const orig = typeof ex === 'string' ? ex : (ex.original || ex.text || '');
                            const trans = typeof ex === 'object' 
                                ? (ex.translation || ex.translated || '')
                                : ((result.examplesTranslated && result.examplesTranslated[i]) || '');
                            return `
                                <div class="kz-example-item">
                                    <div class="kz-example-orig">"${_esc(orig)}"</div>
                                    ${trans ? `<div class="kz-example-trans">${_esc(trans)}</div>` : ''}
                                </div>
                            `;
                        }).join('');
                        if (countExamples) countExamples.textContent = `(${examples.length})`;
                    } else {
                        examplesPane.innerHTML = '';
                        if (countExamples) countExamples.textContent = '';
                    }
                }

                if (synonymsPane) {
                    if (hasSynonyms) {
                        renderObjectChips(synonymsPane, result.synonyms, false);
                        if (countSynonyms) countSynonyms.textContent = `(${result.synonyms.length})`;
                    } else {
                        synonymsPane.innerHTML = '';
                        if (countSynonyms) countSynonyms.textContent = '';
                    }
                }

                if (variantsPane) {
                    if (hasVariants) {
                        renderObjectChips(variantsPane, result.otherWordForms, true);
                        if (countVariants) countVariants.textContent = `(${result.otherWordForms.length})`;
                    } else {
                        variantsPane.innerHTML = '';
                        if (countVariants) countVariants.textContent = '';
                    }
                }

                // Show/hide tab pills dynamically
                const tabPills = tabsBar?.querySelectorAll(".kz-tab-pill") || [];
                let firstAvailableTab = null;

                tabPills.forEach(pill => {
                    const tabKey = pill.dataset.tab;
                    let isAvailable = false;
                    if (tabKey === 'desc') isAvailable = hasDesc;
                    if (tabKey === 'examples') isAvailable = hasExamples;
                    if (tabKey === 'synonyms') isAvailable = hasSynonyms;
                    if (tabKey === 'variants') isAvailable = hasVariants;

                    if (isAvailable) {
                        pill.style.display = "inline-flex";
                        pill.removeAttribute("data-empty");
                        if (!firstAvailableTab) firstAvailableTab = tabKey;
                    } else {
                        pill.style.display = "none";
                        pill.setAttribute("data-empty", "true");
                    }
                });

                if (hasDesc || hasExamples || hasSynonyms || hasVariants) {
                    if (tabsBar) tabsBar.style.display = "flex";
                    initKzResultTabs(resultBox || document, firstAvailableTab || 'desc');
                } else {
                    if (tabsBar) tabsBar.style.display = "none";
                    [descPane, examplesPane, synonymsPane, variantsPane].forEach(el => {
                        if (el) el.style.display = "none";
                    });
                }

                // Render web citations if available (Groq Compound model)
                renderCitations(result.executedTools);
            } else {
                resultBox.style.display = "flex";
                resultText.textContent = "Không thể dịch văn bản. Vui lòng kiểm tra API Key trong cài đặt.";
                if (document.getElementById("popup-result-tabs")) document.getElementById("popup-result-tabs").style.display = "none";
                if (resultDesc) resultDesc.style.display = "none";
            }
        } catch (err) {
            console.error(err);
            if (skeletonBox) skeletonBox.style.display = "none";
            resultBox.style.display = "flex";
            resultText.textContent = err.message || "Lỗi kết nối API. Vui lòng thử lại.";
        } finally {
            translateBtn.disabled = false;
            translateBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Dịch ngay
            `;
        }
    };

    /**
     * Gắn logic chuyển tab cho khối #popup-result-tabs với chuẩn ARIA, Event Delegation & Chống Leak Listener
     */
    function initKzResultTabs(root, defaultTabKey) {
        root = root || document;
        const tablist = root.querySelector('#popup-result-tabs');
        if (!tablist) return;

        const tabs = Array.from(tablist.querySelectorAll('.kz-tab-pill'));
        const panes = {};
        tabs.forEach(function (t) {
            panes[t.dataset.tab] = root.querySelector('#popup-result-' + t.dataset.tab);
        });

        // Ẩn tab rỗng (trừ "desc" luôn hiển thị vì là nội dung chính)
        tabs.forEach(function (t) {
            if (t.dataset.tab === 'desc') return;
            const countEl = t.querySelector('.kz-tab-count');
            const countText = countEl ? countEl.textContent.replace(/[^0-9]/g, '') : '';
            const count = parseInt(countText, 10) || 0;
            const hasContent = !!panes[t.dataset.tab]?.textContent?.trim();
            const isEmpty = count === 0 && !hasContent;
            t.toggleAttribute('data-empty', isEmpty);
            t.style.display = isEmpty ? 'none' : 'inline-flex';
        });

        function activate(tab, focusIt) {
            tabs.forEach(function (t) {
                const isActive = t === tab;
                t.classList.toggle('active', isActive);
                t.setAttribute('aria-selected', String(isActive));
                t.tabIndex = isActive ? 0 : -1;
            });
            Object.keys(panes).forEach(function (key) {
                const p = panes[key];
                if (!p) return;
                const active = p.id === 'popup-result-' + tab.dataset.tab;
                p.classList.toggle('hidden', !active);
                p.hidden = !active;
                p.style.display = active ? 'block' : 'none';
            });
            if (focusIt) tab.focus();
        }

        // Event Delegation: Chỉ gắn listener 1 LẦN DUY NHẤT cho tablist (Dùng kzBound)
        if (!tablist.dataset.kzBound) {
            tablist.addEventListener('click', function (e) {
                const btn = e.target.closest('.kz-tab-pill');
                if (btn) activate(btn, false);
            });

            tablist.addEventListener('keydown', function (e) {
                const visible = tabs.filter(function (t) { return t.getAttribute('data-empty') !== 'true' && t.style.display !== 'none'; });
                const currentIndex = visible.indexOf(document.activeElement);
                if (currentIndex === -1) return;
                let nextIndex = null;
                if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % visible.length;
                else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + visible.length) % visible.length;
                else if (e.key === 'Home') nextIndex = 0;
                else if (e.key === 'End') nextIndex = visible.length - 1;
                if (nextIndex !== null) {
                    e.preventDefault();
                    activate(visible[nextIndex], true);
                }
            });

            // Cuộn chuột dọc -> Cuộn ngang tab
            tablist.addEventListener('wheel', function (e) {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    tablist.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            // Nắm kéo chuột để cuộn (Drag-to-scroll)
            let isDragging = false;
            let startX = 0;
            let startScrollLeft = 0;

            tablist.addEventListener('mousedown', function (e) {
                isDragging = true;
                startX = e.pageX - tablist.offsetLeft;
                startScrollLeft = tablist.scrollLeft;
                tablist.style.cursor = 'grabbing';
            });
            tablist.addEventListener('mouseleave', function () {
                isDragging = false;
                tablist.style.cursor = '';
            });
            tablist.addEventListener('mouseup', function () {
                isDragging = false;
                tablist.style.cursor = '';
            });
            tablist.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - tablist.offsetLeft;
                const walk = (x - startX) * 1.5;
                tablist.scrollLeft = startScrollLeft - walk;
            });

            tablist.dataset.kzBound = '1';
        }

        // Luôn chủ động reset trạng thái active tab về hợp lệ sau mỗi lần render mới
        const availableTabs = tabs.filter(function (t) { return t.getAttribute('data-empty') !== 'true' && t.style.display !== 'none'; });
        const targetTab = (defaultTabKey && tabs.find(t => t.dataset.tab === defaultTabKey && t.getAttribute('data-empty') !== 'true')) || availableTabs[0] || tabs[0];
        if (targetTab) activate(targetTab, false);
    }

    // Single initialization on load
    initKzResultTabs(document);

    // Event Delegation: Click vào thẻ chip (Từ đồng nghĩa / Biến thể) để tự động điền và tra từ đó!
    document.getElementById("popup-result-tab-contents")?.addEventListener("click", (e) => {
        const chip = e.target.closest(".kz-tag-chip");
        if (chip && inputArea) {
            // Lấy từ từ chip (loại bỏ phần loại từ trong ngoặc đơn ví dụ: "hello (thán từ)" -> "hello")
            const termEl = chip.querySelector(".kz-chip-term");
            const rawText = termEl ? termEl.textContent.trim() : chip.textContent.trim();
            const cleanWord = rawText.replace(/\s*\([^)]*\)/g, '').trim();
            if (cleanWord) {
                inputArea.value = cleanWord;
                handlePopupTranslate();
            }
        }
    });

    translateBtn?.addEventListener("click", () => handlePopupTranslate());
    inputArea?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handlePopupTranslate();
        }
    });

    const listenOrigBtn = document.getElementById("popup-listen-orig-btn");
    const listenTransBtn = document.getElementById("popup-listen-btn");

    if (typeof AudioManager !== 'undefined' && AudioManager.setupAudioButton) {
        if (listenOrigBtn) {
            AudioManager.setupAudioButton(listenOrigBtn, () => inputArea.value.trim() || lastResult?.originalText || '', false, null, true);
        }
        if (listenTransBtn) {
            AudioManager.setupAudioButton(listenTransBtn, () => lastResult?.translated || lastResult?.meaning || resultText.textContent.trim() || '', false, null, false);
        }
    }

    copyBtn?.addEventListener("click", () => {
        const textToCopy = lastResult?.translated || lastResult?.meaning || resultText.textContent;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 2000);
            });
        }
    });

    // Voice STT Recording (Groq Whisper)
    const micBtn = document.getElementById("mic-record-btn");
    const voiceStatus = document.getElementById("voice-status-text");

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let isStarting = false;      // Block double clicks while requesting permissions
    let activeStream = null;     // Stream reference for global cleanup on errors
    let maxRecordTimer = null;   // 60-second auto-stop timer

    const stopRecordingTimers = () => {
        if (maxRecordTimer) {
            clearTimeout(maxRecordTimer);
            maxRecordTimer = null;
        }
        const voiceStage = document.getElementById("kz-voice-stage");
        if (voiceStage) voiceStage.classList.remove("is-recording");
    };

    // Release microphone tracks safely on any exit path
    const releaseMicStream = () => {
        if (activeStream) {
            activeStream.getTracks().forEach(track => track.stop());
            activeStream = null;
        }
    };

    const setMicUIState = (recording) => {
        micBtn?.classList.toggle("recording", recording);
        micBtn?.setAttribute("aria-label", recording ? "Dừng ghi âm" : "Bắt đầu ghi âm");
        micBtn?.setAttribute("aria-pressed", String(recording));
    };

    micBtn?.addEventListener("click", async () => {
        if (isStarting) return;

        if (!isRecording) {
            isStarting = true;
            micBtn.disabled = true;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                activeStream = stream;
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                const voiceStage = document.getElementById("kz-voice-stage");
                if (voiceStage) voiceStage.classList.add("is-recording");

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    stopRecordingTimers();
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    releaseMicStream();

                    if (voiceStatus) voiceStatus.textContent = "Đang nhận diện giọng nói bằng Groq Whisper...";
                    if (skeletonBox) skeletonBox.style.display = "flex";

                    try {
                        const transcribedText = await ApiService.transcribeAudio(audioBlob);
                        if (transcribedText) {
                            if (voiceStatus) voiceStatus.textContent = `Đã nhận diện: "${transcribedText}"`;
                            if (inputArea) inputArea.value = transcribedText;
                            document.querySelector('.kz-mode-tab[data-mode="text"], .xt-mode-tab[data-mode="text"]')?.click();
                            handlePopupTranslate(transcribedText, 'voice');
                        } else {
                            if (voiceStatus) voiceStatus.textContent = "Không thể nhận diện âm thanh. Vui lòng nói rõ hơn.";
                            if (skeletonBox) skeletonBox.style.display = "none";
                        }
                    } catch (err) {
                        console.error("STT Error:", err);
                        if (voiceStatus) voiceStatus.textContent = "Lỗi nhận diện giọng nói: " + (err.message || "Kiểm tra API Key.");
                        if (skeletonBox) skeletonBox.style.display = "none";
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                setMicUIState(true);
                if (voiceStatus) voiceStatus.textContent = "Đang thu âm... Nói vào micro rồi bấm nút để dừng (Tối đa 60 giây).";

                // Safety 60-second auto-stop timer
                maxRecordTimer = setTimeout(() => {
                    if (isRecording && mediaRecorder && mediaRecorder.state !== "inactive") {
                        mediaRecorder.stop();
                        isRecording = false;
                        setMicUIState(false);
                    }
                }, 60000);

            } catch (err) {
                stopRecordingTimers();
                releaseMicStream();
                console.error("Mic Access Error:", err);

                if (voiceStatus) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        voiceStatus.innerHTML = `Chưa cấp quyền Micro. <button id="grant-mic-btn" class="xt-inline-link-btn">Nhấn vào đây để Cấp quyền 1-Click</button>`;
                        document.getElementById("grant-mic-btn")?.addEventListener("click", () => {
                            chrome.tabs.create({ url: chrome.runtime.getURL("src/html/options.html?requestMic=true") });
                        });
                    } else {
                        voiceStatus.textContent = "Không thể khởi động micro: " + (err.message || "Vui lòng thử lại.");
                    }
                }
            } finally {
                isStarting = false;
                micBtn.disabled = false;
            }

        } else {
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
            isRecording = false;
            setMicUIState(false);
            stopRecordingTimers();
        }
    });

    // 7. Screen OCR Vision Feature (Groq Vision qwen/qwen3.6-27b)
    const cropSnipBtn = document.getElementById("crop-snip-ocr-btn");
    cropSnipBtn?.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
            alert("Vui lòng mở tính năng này trên một trang web bất kỳ.");
            return;
        }
        const targetLang = (await StorageManager.getTargetLanguage()) || (targetSelect ? targetSelect.value : 'Vietnamese');
        chrome.tabs.sendMessage(tab.id, {
            action: "START_REGION_SNIP",
            targetLang: targetLang
        }, () => {
            if (chrome.runtime.lastError) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["src/js/core/config.js", "src/js/core/storage.js", "src/js/core/utils.js", "src/js/core/api.js", "src/js/core/ui.js", "src/js/main.js"]
                }, () => {
                    chrome.tabs.sendMessage(tab.id, { action: "START_REGION_SNIP", targetLang: targetLang });
                });
            }
            window.close();
        });
    });

    // 8. Toast Feedback Helper
    const popupToast = document.getElementById("popup-toast");
    let toastTimer = null;
    const showToast = (msg, iconSvg = '') => {
        if (!popupToast) return;
        if (toastTimer) clearTimeout(toastTimer);
        const iconHtml = iconSvg || `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        popupToast.innerHTML = `${iconHtml} <span>${msg}</span>`;
        popupToast.classList.add("show");
        toastTimer = setTimeout(() => {
            popupToast.classList.remove("show");
        }, 2200);
    };

    // 9. Command Palette Modal Logic
    const cmdBtn = document.getElementById("cmd-palette-btn");
    const cmdOverlay = document.getElementById("cmd-palette-overlay");
    const cmdInput = document.getElementById("cmd-input");
    const cmdItems = document.querySelectorAll(".xt-cmd-item");
    let selectedCmdIndex = -1;

    const getVisibleCmdItems = () => {
        return Array.from(cmdItems).filter(item => item.style.display !== "none");
    };

    const updateCmdSelection = (newIndex) => {
        const visibleItems = getVisibleCmdItems();
        if (visibleItems.length === 0) return;

        visibleItems.forEach(item => item.classList.remove("is-selected"));
        
        if (newIndex < 0) newIndex = visibleItems.length - 1;
        if (newIndex >= visibleItems.length) newIndex = 0;
        
        selectedCmdIndex = newIndex;
        const currentItem = visibleItems[selectedCmdIndex];
        if (currentItem) {
            currentItem.classList.add("is-selected");
            currentItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    };

    const syncActiveModelBadge = async () => {
        const currentModel = (typeof StorageManager !== 'undefined' && StorageManager.getSelectedModel)
            ? await StorageManager.getSelectedModel()
            : 'llama-3.3-70b-versatile';
        
        cmdItems.forEach(item => {
            const action = item.getAttribute("data-action");
            const val = item.getAttribute("data-value");
            let badge = item.querySelector(".xt-cmd-badge");

            if (action === "set-model" && val === currentModel) {
                item.classList.add("is-active");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "xt-cmd-badge";
                    badge.textContent = "Đang dùng";
                    item.appendChild(badge);
                }
            } else {
                item.classList.remove("is-active");
                if (badge) badge.remove();
            }
        });
    };

    const filterCmdList = (queryVal) => {
        const val = queryVal.toLowerCase().trim();
        cmdItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (!val || text.includes(val)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });

        // Hide/show group titles if no matching items remain in group
        const groupTitles = document.querySelectorAll(".xt-cmd-group-title");
        groupTitles.forEach(title => {
            let nextEl = title.nextElementSibling;
            let hasVisible = false;
            while (nextEl && !nextEl.classList.contains("xt-cmd-group-title")) {
                if (nextEl.classList.contains("xt-cmd-item") && nextEl.style.display !== "none") {
                    hasVisible = true;
                    break;
                }
                nextEl = nextEl.nextElementSibling;
            }
            title.style.display = hasVisible ? "" : "none";
        });

        selectedCmdIndex = -1;
        updateCmdSelection(0);
    };

    const openCmdPalette = () => {
        if (cmdOverlay) {
            cmdOverlay.style.display = "flex";
            syncActiveModelBadge();
            selectedCmdIndex = -1;
            if (cmdInput) {
                cmdInput.value = "";
                filterCmdList("");
                cmdInput.focus();
            }
        }
    };

    const closeCmdPalette = () => {
        if (cmdOverlay) cmdOverlay.style.display = "none";
        selectedCmdIndex = -1;
    };

    cmdBtn?.addEventListener("click", openCmdPalette);

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (cmdOverlay && cmdOverlay.style.display === "flex") {
                closeCmdPalette();
            } else {
                openCmdPalette();
            }
        }
        if (cmdOverlay && cmdOverlay.style.display === "flex") {
            if (e.key === "Escape") {
                e.preventDefault();
                closeCmdPalette();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                updateCmdSelection(selectedCmdIndex + 1);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                updateCmdSelection(selectedCmdIndex - 1);
            } else if (e.key === "Enter") {
                e.preventDefault();
                const visibleItems = getVisibleCmdItems();
                const targetItem = (selectedCmdIndex >= 0 && visibleItems[selectedCmdIndex]) ? visibleItems[selectedCmdIndex] : visibleItems[0];
                if (targetItem) targetItem.click();
            }
        }
    });

    cmdOverlay?.addEventListener("click", (e) => {
        if (e.target === cmdOverlay) closeCmdPalette();
    });

    cmdInput?.addEventListener("input", (e) => {
        filterCmdList(e.target.value);
    });

    cmdItems.forEach(item => {
        item.addEventListener("click", async () => {
            const action = item.getAttribute("data-action");
            const val = item.getAttribute("data-value");
            closeCmdPalette();

            if (action === "set-model" && val) {
                await StorageManager.setSelectedModel(val);
                if (modelSelect) modelSelect.value = val;
                showToast(`Đã chuyển sang mô hình: ${val}`);
            } else if (action === "open-options") {
                openOptionsPage();
            } else if (action === "copy-last") {
                const textToCopy = lastResult?.translated || lastResult?.meaning || resultText.textContent;
                if (textToCopy && textToCopy.trim()) {
                    navigator.clipboard.writeText(textToCopy.trim());
                    showToast("Đã sao chép bản dịch vào Clipboard!");
                } else {
                    showToast("Chưa có bản dịch để sao chép!");
                }
            }
        });
    });

    // 9. Update notifications toggle
    const notifyToggle = document.getElementById("popup-notify-toggle");
    if (notifyToggle) {
        chrome.storage.local.get(["updateNotifications"], (res) => {
            notifyToggle.checked = res.updateNotifications !== false;
        });

        notifyToggle.addEventListener("change", () => {
            chrome.storage.local.set({ updateNotifications: notifyToggle.checked });
        });
    }
});