// UI management module for KimiZK-Translator
const UIManager = {
    // Global state
    popup: null,
    triggerIcon: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    justCreatedTriggerIcon: false,
    
    /**
     * Create trigger icon for text selection
     * @param {DOMRect} selectionRect - Selection rectangle
     */
    createTriggerIcon(selectionRect) {
        this.triggerIcon?.remove();
        this.triggerIcon = document.createElement("div");
        this.triggerIcon.className = "xt-trigger-icon";
        const iconUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) 
            ? chrome.runtime.getURL('src/icons/icon32.png') 
            : '';
        this.triggerIcon.innerHTML = `
            <div class="xt-trigger-inner" title="Dịch cùng KimiZK Translator">
                <img src="${iconUrl}" width="20" height="20" style="display:block; width:20px; height:20px; object-fit:contain; border-radius:4px; pointer-events:none;" alt="Translate Icon" />
            </div>
        `;
        document.body.appendChild(this.triggerIcon);

        const padding = 10;
        Object.assign(this.triggerIcon.style, {
            position: 'fixed',
            zIndex: CONFIG.UI.Z_INDEX.toString(),
            left: `${selectionRect.left}px`,
            top: `${selectionRect.bottom + padding}px`
        });
        
        this.justCreatedTriggerIcon = true;
        setTimeout(() => { this.justCreatedTriggerIcon = false; }, CONFIG.UI.TRIGGER_DELAY);
    },
    
    // Production architecture references & state
    attachedAudioControls: null,
    _dragCleanup: null,
    _popupResizeObserver: null,
    _popupAnimationFrame: null,
    _viewportSyncHandler: null,

    /**
     * Synchronize attached elements (Audio Controls) position relative to popup
     */
    syncAttachedElements() {
        if (!this.popup) return;

        const audio = this.attachedAudioControls || document.querySelector('.xt-audio-controls');
        if (!audio || !audio.isConnected) {
            this.attachedAudioControls = null;
            return;
        }

        const popupRect = this.popup.getBoundingClientRect();
        const audioRect = audio.getBoundingClientRect();
        const gap = 10;

        let left = popupRect.right + gap;
        let top = popupRect.top;

        // Viewport check: if not enough space on right, flip to left of popup
        if (left + audioRect.width > window.innerWidth) {
            left = popupRect.left - audioRect.width - gap;
        }

        // Clamp left bound
        left = Math.max(0, left);

        // Clamp top/bottom bounds
        top = Math.min(top, window.innerHeight - (audioRect.height || 40));
        top = Math.max(0, top);

        audio.style.left = `${left}px`;
        audio.style.top = `${top}px`;
    },

    /**
     * Observe popup size changes for dynamic content expansion
     */
    observePopupSize(popup) {
        this._popupResizeObserver?.disconnect();
        if (typeof ResizeObserver === 'undefined' || !popup) return;

        this._popupResizeObserver = new ResizeObserver(() => {
            if (!this.isDragging) {
                this.syncAttachedElements();
            }
        });

        this._popupResizeObserver.observe(popup);
    },

    /**
     * Centralized Single Cleanup Point for Popup Removal
     */
    removePopup() {
        // 1. Stop dragging
        if (this._dragCleanup) {
            this._dragCleanup();
            this._dragCleanup = null;
        }
        this.isDragging = false;

        // 2. Stop observers
        if (this._popupResizeObserver) {
            this._popupResizeObserver.disconnect();
            this._popupResizeObserver = null;
        }

        // 3. Cancel RAF animation
        if (this._popupAnimationFrame !== null) {
            cancelAnimationFrame(this._popupAnimationFrame);
            this._popupAnimationFrame = null;
        }

        // 3b. Stop syncing audio player position to scroll/resize
        if (this._viewportSyncHandler) {
            window.removeEventListener('scroll', this._viewportSyncHandler, true);
            window.removeEventListener('resize', this._viewportSyncHandler);
            this._viewportSyncHandler = null;
        }

        // 4. Stop audio & detach controls
        if (typeof AudioManager !== 'undefined') {
            if (AudioManager.detachFromPopup) AudioManager.detachFromPopup();
            if (AudioManager.stopCurrentAudio) AudioManager.stopCurrentAudio();
        }

        // 5. Clear audio reference
        this.attachedAudioControls = null;

        // 6. Remove popup DOM node
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }

        // 7. Safety cleanup
        document.querySelectorAll('.xt-audio-controls').forEach(el => el.remove());

        // 8. Restore global styles
        document.body.style.userSelect = '';
    },

    /**
     * Apply extension theme preference to floating popup
     * @param {string} [theme] - Optional theme string ('light' | 'dark' | 'auto')
     */
    async applyTheme(theme) {
        let targetTheme = theme;
        if (!targetTheme || targetTheme === 'auto') {
            if (typeof StorageManager !== 'undefined' && StorageManager.getTheme) {
                targetTheme = await StorageManager.getTheme();
            } else {
                targetTheme = 'light';
            }
        }

        if (targetTheme === 'auto') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            targetTheme = prefersDark ? 'dark' : 'light';
        }

        const isDark = targetTheme === 'dark';

        if (this.popup) {
            if (isDark) {
                this.popup.classList.add('dark-theme', 'dark');
                this.popup.classList.remove('light-theme');
            } else {
                this.popup.classList.add('light-theme');
                this.popup.classList.remove('dark-theme', 'dark');
            }
        }

        // Sync theme to any active audio controls elements
        const audioControls = document.querySelectorAll('.xt-audio-controls');
        audioControls.forEach(ctrl => {
            if (isDark) {
                ctrl.classList.add('dark-theme', 'dark');
                ctrl.classList.remove('light-theme');
            } else {
                ctrl.classList.add('light-theme');
                ctrl.classList.remove('dark-theme', 'dark');
            }
        });
    },

    /**
     * Create translation popup
     * @returns {HTMLElement} Popup element
     */
    createPopup() {
        this.removePopup();
        
        this.popup = document.createElement("div");
        this.popup.className = "xt-translator-popup";
        this.popup.style.position = 'fixed';
        this.popup.style.zIndex = CONFIG.UI.Z_INDEX.toString();
        this.popup.style.left = '0px';
        this.popup.style.top = '0px';
        document.body.appendChild(this.popup);

        // Apply saved extension theme setting immediately
        this.applyTheme();

        // Register ResizeObserver for popup content size updates
        this.observePopupSize(this.popup);

        // Keep the floating audio player glued to the popup when the page is
        // scrolled or the window is resized - previously it only re-synced on
        // drag or when the popup's own content size changed, so it could end
        // up floating away from the popup (or off-screen) on scroll/resize.
        if (this._viewportSyncHandler) {
            window.removeEventListener('scroll', this._viewportSyncHandler, true);
            window.removeEventListener('resize', this._viewportSyncHandler);
        }
        this._viewportSyncHandler = () => {
            if (!this.isDragging) this.syncAttachedElements();
        };
        window.addEventListener('scroll', this._viewportSyncHandler, true);
        window.addEventListener('resize', this._viewportSyncHandler);
        
        return this.popup;
    },

    /**
     * Setup dragging functionality using pure Pointer Events architecture
     * @param {HTMLElement} element - Element to make draggable
     */
    setupDragging(element) {
        const dragOverlay = element.querySelector('.xt-header-drag-overlay');
        if (!dragOverlay) return;

        // Cleanup old handler if setupDragging called again
        if (this._dragCleanup) {
            this._dragCleanup();
        }

        let pointerId = null;
        let rafId = null;

        let startPointerX = 0, startPointerY = 0;
        let startLeft = 0, startTop = 0;
        let pendingX = 0, pendingY = 0;

        const clampPosition = (x, y) => {
            const maxX = Math.max(0, window.innerWidth - element.offsetWidth);
            const maxY = Math.max(0, window.innerHeight - element.offsetHeight);
            return {
                x: Math.max(0, Math.min(x, maxX)),
                y: Math.max(0, Math.min(y, maxY))
            };
        };

        const render = () => {
            rafId = null;
            if (!this.isDragging || !element.isConnected) return;

            element.style.left = `${pendingX}px`;
            element.style.top = `${pendingY}px`;

            this.syncAttachedElements();
        };

        const scheduleRender = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(render);
        };

        const stopDrag = () => {
            if (!this.isDragging) return;

            this.isDragging = false;
            pointerId = null;

            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            element.classList.remove('is-dragging');
            element.style.transition = `all ${CONFIG.UI.ANIMATION_DURATION}ms cubic-bezier(0.25, 0.8, 0.25, 1)`;
            document.body.style.userSelect = '';

            this._dragCleanup = null;
        };

        const onPointerDown = (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const rect = element.getBoundingClientRect();
            pointerId = e.pointerId;

            startPointerX = e.clientX;
            startPointerY = e.clientY;

            startLeft = rect.left;
            startTop = rect.top;

            pendingX = startLeft;
            pendingY = startTop;

            this.isDragging = true;

            element.classList.add('is-dragging');
            element.style.transition = 'none';
            document.body.style.userSelect = 'none';

            if (typeof dragOverlay.setPointerCapture === 'function') {
                try { dragOverlay.setPointerCapture(pointerId); } catch (err) {}
            }
        };

        const onPointerMove = (e) => {
            if (!this.isDragging || e.pointerId !== pointerId) return;
            e.preventDefault();

            const deltaX = e.clientX - startPointerX;
            const deltaY = e.clientY - startPointerY;

            const pos = clampPosition(startLeft + deltaX, startTop + deltaY);
            pendingX = pos.x;
            pendingY = pos.y;

            scheduleRender();
        };

        const onPointerUp = (e) => {
            if (e.pointerId !== pointerId) return;
            stopDrag();
        };

        const onPointerCancel = () => {
            stopDrag();
        };

        dragOverlay.addEventListener('pointerdown', onPointerDown);
        dragOverlay.addEventListener('pointermove', onPointerMove);
        dragOverlay.addEventListener('pointerup', onPointerUp);
        dragOverlay.addEventListener('pointercancel', onPointerCancel);

        this._dragCleanup = () => {
            stopDrag();
            dragOverlay.removeEventListener('pointerdown', onPointerDown);
            dragOverlay.removeEventListener('pointermove', onPointerMove);
            dragOverlay.removeEventListener('pointerup', onPointerUp);
            dragOverlay.removeEventListener('pointercancel', onPointerCancel);
            if (typeof dragOverlay.releasePointerCapture === 'function' && pointerId !== null) {
                try { dragOverlay.releasePointerCapture(pointerId); } catch (err) {}
            }
        };
    },
    
    /**
     * Calculate optimal popup position
     * @param {DOMRect} selectionRect - Selection rectangle
     * @returns {object} Position object with left and top
     */
    calculatePopupPosition(selectionRect) {
        const popupWidth = CONFIG.UI.POPUP_WIDTH;
        const popupHeight = CONFIG.UI.POPUP_HEIGHT;
        const padding = CONFIG.UI.PADDING;
        let left = selectionRect.left;
        let top = selectionRect.bottom + padding;

        if (left + popupWidth > window.innerWidth - padding) {
            left = window.innerWidth - popupWidth - padding;
        }
        if (top + popupHeight > window.innerHeight - padding) {
            top = selectionRect.top - popupHeight - padding;
            if (top < padding) top = padding;
        }
        if (left < padding) left = padding;
        if (top < padding) top = padding;

        return { left, top };
    },
    
    /**
     * Show API key input prompt
     */
    showApiKeyPrompt() {
        AudioManager.stopCurrentAudio();
        this.popup?.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'xt-apikey-overlay';
        overlay.id = 'xt-apikey-overlay';
        
        const box = document.createElement('div');
        box.className = 'xt-apikey-box';
        box.innerHTML = `
            <button class="xt-apikey-close" id="xt-apikey-close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            <div class="xt-apikey-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;"><path d="M21 2l-2 2m-1.5 1.5l-3 3m-6.6-1.4a6.5 6.5 0 1 0 9.2 9.2l9.9-9.9-.7-2.8-2.8-.7-9.9 9.9z"></path></svg> Nhập API KEY để sử dụng dịch
            </div>
            <div class="xt-apikey-desc">Bạn cần nhập API KEY để sử dụng tiện ích. API KEY sẽ được lưu bảo mật trên máy bạn.<br><br>Liên hệ <a href='https://www.facebook.com/nhb.xyz' target='_blank'>Facebook</a> để được hướng dẫn lấy API KEY.</div>
            <input id="xt-apikey-input" type="password" class="xt-apikey-input" placeholder="Nhập API KEY tại đây..." />
            <button id="xt-apikey-save" class="xt-apikey-save">Lưu & sử dụng</button>
            <div id="xt-apikey-error" class="xt-apikey-error"></div>
        `;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        this._setupApiKeyPromptEvents(overlay, box);
    },
    
    /**
     * Setup API key prompt event handlers
     * @private
     */
    _setupApiKeyPromptEvents(overlay, box) {
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Close button
        const closeBtn = box.querySelector('#xt-apikey-close');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
        
        const input = box.querySelector('#xt-apikey-input');
        const saveBtn = box.querySelector('#xt-apikey-save');
        const errorDiv = box.querySelector('#xt-apikey-error');
        
        // Real-time validation
        input.addEventListener('input', () => {
            const key = input.value.trim();
            if (key.length === 0) {
                errorDiv.style.display = 'none';
                saveBtn.disabled = true;
            } else if (key.length < 20) {
                errorDiv.textContent = 'API KEY phải có ít nhất 20 ký tự!';
                errorDiv.style.display = 'block';
                saveBtn.disabled = true;
            } else if (!Utils.validateApiKey(key)) {
                errorDiv.textContent = 'API KEY không đúng định dạng Groq!';
                errorDiv.style.display = 'block';
                saveBtn.disabled = true;
            } else {
                errorDiv.style.display = 'none';
                saveBtn.disabled = false;
            }
        });
        
        // Save button
        saveBtn.onclick = async () => {
            const key = input.value.trim();
            if (!Utils.validateApiKey(key)) {
                errorDiv.textContent = 'API KEY không hợp lệ!';
                errorDiv.style.display = 'block';
                return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Đang lưu...';
            
            const success = await StorageManager.saveApiKey(key);
            if (success) {
                overlay.remove();
                NotificationManager.show('API KEY đã được lưu!', 'success');
            } else {
                errorDiv.textContent = 'Lỗi khi lưu API Key!';
                errorDiv.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = 'Lưu & sử dụng';
            }
        };
        
        // Enter key
        input.onkeydown = e => {
            if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click();
        };
    },
    
    /**
     * Render translation result in popup
     * @param {HTMLElement} content - Content container
     * @param {object} result - Translation result
     * @param {string} displayText - Display text
     * @param {boolean} isSingleWord - Whether it's a single word
     */
    renderTranslationResult(content, result, displayText, isSingleWord) {
        if (isSingleWord) {
            content.innerHTML = this._renderSingleWordResult(result, displayText);
        } else {
            content.innerHTML = this._renderTextResult(result, displayText);
        }

        // Attach event listeners for dictionary tabs if present
        const tabNav = content.querySelector(".xt-tabs-nav");
        const tabBtns = content.querySelectorAll(".xt-tab-btn");
        if (tabBtns.length > 0) {
            tabBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const targetTab = btn.dataset.tab;
                    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === targetTab));
                    content.querySelectorAll(".xt-tab-pane").forEach(pane => {
                        const isMatch = pane.dataset.pane === targetTab;
                        pane.style.display = isMatch ? "block" : "none";
                        pane.classList.toggle("hidden", !isMatch);
                    });
                });
            });
        }

        if (tabNav) {
            // Cuộn chuột dọc -> Cuộn ngang tab
            tabNav.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    tabNav.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            // Nắm kéo chuột để cuộn (Drag-to-scroll)
            let isDragging = false;
            let startX = 0;
            let startScrollLeft = 0;

            tabNav.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.pageX - tabNav.offsetLeft;
                startScrollLeft = tabNav.scrollLeft;
                tabNav.style.cursor = 'grabbing';
            });
            tabNav.addEventListener('mouseleave', () => {
                isDragging = false;
                tabNav.style.cursor = '';
            });
            tabNav.addEventListener('mouseup', () => {
                isDragging = false;
                tabNav.style.cursor = '';
            });
            tabNav.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - tabNav.offsetLeft;
                const walk = (x - startX) * 1.5;
                tabNav.scrollLeft = startScrollLeft - walk;
            });
        }
    },
    
    /**
     * Format ISO code or raw language name to friendly display name
     * @private
     */
    _formatLanguageName(langStr) {
        if (!langStr) return 'tiếng Việt';
        const clean = String(langStr).trim().toLowerCase();
        const map = {
            'en': 'English',
            'en-us': 'English',
            'en-gb': 'English',
            'english': 'English',
            'tiếng anh': 'English',
            'vi': 'tiếng Việt',
            'vietnamese': 'tiếng Việt',
            'tiếng việt': 'tiếng Việt',
            'ja': '日本語 (Japanese)',
            'japanese': 'Japanese',
            'tiếng nhật': 'Japanese',
            'ko': '한국어 (Korean)',
            'korean': 'Korean',
            'tiếng hàn': 'Korean',
            'zh': '中文 (Chinese)',
            'zh-cn': 'Chinese',
            'chinese': 'Chinese',
            'tiếng trung': 'Chinese',
            'fr': 'Français',
            'french': 'French',
            'tiếng pháp': 'French',
            'de': 'Deutsch',
            'german': 'German',
            'tiếng đức': 'German',
            'es': 'Español',
            'spanish': 'Spanish',
            'tiếng tây ban nha': 'Spanish',
            'ru': 'Русский',
            'russian': 'Russian',
            'tiếng nga': 'Russian',
            'it': 'Italiano',
            'italian': 'Italian',
            'tiếng ý': 'Italian',
            'pt': 'Português',
            'portuguese': 'Portuguese',
            'tiếng bồ đào nha': 'Portuguese',
            'th': 'ไทย',
            'thai': 'Thai',
            'tiếng thái': 'Thai'
        };
        return map[clean] || (langStr.length <= 3 ? langStr.toUpperCase() : langStr);
    },

    /**
     * Render single word translation result
     * @private
     */
    _renderSingleWordResult(result, displayText) {
        const renderExamples = (examples, translations) => {
            return (examples || []).map((ex, i) => `
                <div class="xt-example-item">
                    <div class="xt-example-en">"${Utils.escapeSpecialChars(typeof ex === 'string' ? ex : (ex.original || ex.text || ''))}"</div>
                    <div class="xt-example-vi">${Utils.escapeSpecialChars(typeof ex === 'object' ? (ex.translation || ex.translated || '') : (translations?.[i] || '–'))}</div>
                </div>
            `).join('');
        };

        // Render tag for both old string format and new object format
        const renderTag = (item, showForm = false) => {
            if (typeof item === 'string') {
                const escaped = Utils.escapeSpecialChars(item);
                const match = escaped.match(/^([^(]+)\s*\(([^)]+)\)$/);
                if (match) {
                    return `<div class="xt-tag"><div class="kz-chip-left"><strong class="xt-tag-word">${match[1].trim()}</strong> <span class="xt-tag-pos">(${match[2].trim()})</span></div></div>`;
                }
                return `<div class="xt-tag"><div class="kz-chip-left"><span class="xt-tag-word">${escaped}</span></div></div>`;
            }
            const term = Utils.escapeSpecialChars(item.term || '');
            const pos = item.partOfSpeech ? Utils.escapeSpecialChars(item.partOfSpeech) : '';
            const meaning = item.meaning ? Utils.escapeSpecialChars(item.meaning) : '';
            const level = item.level ? Utils.escapeSpecialChars(item.level) : '';
            const formTitle = showForm && item.form ? `${Utils.escapeSpecialChars(item.form)} — ${meaning}` : meaning;

            return `<div class="xt-tag" title="${formTitle}">
                <div class="kz-chip-left">
                    <strong class="xt-tag-word">${term}</strong>
                    ${pos ? `<span class="xt-tag-pos">(${pos})</span>` : ''}
                </div>
                ${meaning ? `<span class="xt-tag-meaning">${meaning}</span>` : ''}
                ${level ? `<span class="xt-tag-level">${level}</span>` : ''}
            </div>`;
        };

        const hasPhonetic = result.transcription && result.transcription.trim().length > 0;
        const partOfSpeech = result.partOfSpeech ? result.partOfSpeech.trim() : '';

        const hasDesc = !!(result.description && result.description.trim().length > 0);
        const hasExamples = !!(result.examples && result.examples.length > 0);
        const hasSynonyms = !!(result.synonyms && result.synonyms.length > 0);
        const hasVariants = !!(result.otherWordForms && result.otherWordForms.length > 0);

        let defaultActiveTab = '';
        if (hasDesc) defaultActiveTab = 'desc';
        else if (hasExamples) defaultActiveTab = 'examples';
        else if (hasSynonyms) defaultActiveTab = 'synonyms';
        else if (hasVariants) defaultActiveTab = 'variants';

        return `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <!-- Row 1: Language Pill + Compact Icon Actions -->
                    <div class="xt-main-topbar">
                        <span class="xt-language-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                            <span class="lang">${Utils.escapeSpecialChars(this._formatLanguageName(result.detectedLanguage))}</span>
                            <span class="xt-arrow"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
                            <span class="lang">${Utils.escapeSpecialChars(this._formatLanguageName(result.targetLanguage))}</span>
                        </span>

                        <div class="xt-action-buttons">
                            <button class="xt-action-btn xt-listen-orig-btn" title="Nghe văn bản gốc" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            </button>
                            <button class="xt-action-btn xt-listen-btn" title="Nghe bản dịch" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                            </button>
                            <button class="xt-action-btn xt-copy-btn" title="Sao chép bản dịch" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Row 2: Correction Notice (if present) -->
                    ${result.correctedFrom && result.correctedFrom.trim() ? `
                    <div class="xt-correction-notice">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                        Đã tự sửa từ "<b>${Utils.escapeSpecialChars(result.correctedFrom)}</b>"
                    </div>` : ''}

                    <!-- Row 3: Hero Word + Level inline + Phonetic & POS below -->
                    <div class="xt-hero-word-box">
                        <div class="xt-word-row">
                            <h2 class="xt-word-title-hero" title="${Utils.escapeSpecialChars(displayText)}">${Utils.escapeSpecialChars(displayText)}</h2>
                            ${result.level ? `<span class="xt-level-badge" title="${Utils.escapeSpecialChars(result.levelSystem ? `Hệ thống: ${result.levelSystem}` : '')}">${Utils.escapeSpecialChars(result.level)}</span>` : ''}
                        </div>
                        <div class="xt-meta-badges">
                            ${hasPhonetic ? `<span class="xt-phonetic">${Utils.escapeSpecialChars(result.transcription.startsWith('/') ? result.transcription : `/${result.transcription}/`)}</span>` : ''}
                            ${hasPhonetic && partOfSpeech ? `<span class="xt-dot"></span>` : ''}
                            ${partOfSpeech ? `<span class="xt-pos-badge">${Utils.escapeSpecialChars(partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1))}</span>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Row 4: Translation Card -->
                ${result.meaning ? `
                <div class="xt-translation-card">
                    <div class="xt-card-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        Nghĩa chính
                    </div>
                    <p class="xt-translation-text">${Utils.escapeSpecialChars(result.meaning.charAt(0).toUpperCase() + result.meaning.slice(1))}</p>
                </div>
                ` : ''}
            </div>

            ${(hasDesc || hasExamples || hasSynonyms || hasVariants) ? `
            <div class="xt-translator-secondary">
                <!-- Segmented Tabs Navigation -->
                <div class="xt-tabs-nav">
                    ${hasDesc ? `<button type="button" class="xt-tab-btn ${defaultActiveTab === 'desc' ? 'active' : ''}" data-tab="desc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Giải thích</button>` : ''}
                    ${hasExamples ? `<button type="button" class="xt-tab-btn ${defaultActiveTab === 'examples' ? 'active' : ''}" data-tab="examples"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Ví dụ (${result.examples.length})</button>` : ''}
                    ${hasSynonyms ? `<button type="button" class="xt-tab-btn ${defaultActiveTab === 'synonyms' ? 'active' : ''}" data-tab="synonyms"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Đồng nghĩa (${result.synonyms.length})</button>` : ''}
                    ${hasVariants ? `<button type="button" class="xt-tab-btn ${defaultActiveTab === 'variants' ? 'active' : ''}" data-tab="variants"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg> Biến thể (${result.otherWordForms.length})</button>` : ''}
                </div>

                <!-- Tab Panes -->
                <div class="xt-tab-contents">
                    ${hasDesc ? `
                    <div class="xt-tab-pane ${defaultActiveTab === 'desc' ? '' : 'hidden'}" data-pane="desc" style="${defaultActiveTab === 'desc' ? 'display:block;' : 'display:none;'}">
                        <p class="xt-description-text">${Utils.escapeSpecialChars(result.description.charAt(0).toUpperCase() + result.description.slice(1))}</p>
                        ${result.usageNotes && result.usageNotes.trim() ? `<div class="xt-usage-notes" style="margin-top: 8px; padding: 6px 10px; background: var(--accent-soft); border-radius: 8px; font-size: 11.5px; color: var(--ink-2); display: flex; align-items: flex-start; gap: 6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px; color: var(--accent);"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>${Utils.escapeSpecialChars(result.usageNotes)}</div>` : ''}
                    </div>
                    ` : ''}

                    ${hasExamples ? `
                    <div class="xt-tab-pane ${defaultActiveTab === 'examples' ? '' : 'hidden'}" data-pane="examples" style="${defaultActiveTab === 'examples' ? 'display:block;' : 'display:none;'}">
                        <div class="xt-examples-list">
                            ${renderExamples(result.examples, result.examplesTranslated)}
                        </div>
                    </div>
                    ` : ''}

                    ${hasSynonyms ? `
                    <div class="xt-tab-pane ${defaultActiveTab === 'synonyms' ? '' : 'hidden'}" data-pane="synonyms" style="${defaultActiveTab === 'synonyms' ? 'display:block;' : 'display:none;'}">
                        <div class="xt-tags">
                            ${result.synonyms.map(s => renderTag(s, false)).join('')}
                        </div>
                    </div>
                    ` : ''}

                    ${hasVariants ? `
                    <div class="xt-tab-pane ${defaultActiveTab === 'variants' ? '' : 'hidden'}" data-pane="variants" style="${defaultActiveTab === 'variants' ? 'display:block;' : 'display:none;'}">
                        <div class="xt-tags">
                            ${result.otherWordForms.map(f => renderTag(f, true)).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="xt-translator-footer">
                <div class="xt-footer-brand">KimiZK Translator</div>
                <div class="xt-footer-info">Groq AI 120B</div>
            </div>
        `;
    },

    /**
     * Render text translation result
     * @private
     */
    _renderTextResult(result, displayText) {
        const hasPhonetic = result.transcription && result.transcription.trim().length > 0;
        
        return `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <div class="xt-main-topbar">
                        <span class="xt-language-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <span class="lang">${Utils.escapeSpecialChars(this._formatLanguageName(result.detectedLanguage))}</span>
                            <span class="xt-arrow"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
                            <span class="lang">${Utils.escapeSpecialChars(this._formatLanguageName(result.targetLanguage))}</span>
                        </span>
                        <div class="xt-action-buttons">
                            <button class="xt-action-btn xt-listen-orig-btn" title="Nghe văn bản gốc" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                            </button>
                            <button class="xt-action-btn xt-listen-btn" title="Nghe bản dịch" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                            </button>
                            <button class="xt-action-btn xt-copy-btn" title="Sao chép bản dịch" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div class="xt-hero-word-box">
                        <div class="xt-word-row">
                            <h2 class="xt-word-title-single" title="${Utils.toSingleLine(displayText)}" style="font-size: 14px; font-weight: 600; line-height: 1.45;">${Utils.escapeSpecialChars(displayText)}</h2>
                        </div>
                        ${hasPhonetic ? `<div class="xt-meta-badges"><span class="xt-phonetic">/${Utils.escapeSpecialChars(result.transcription.replace(/^\/|\/$/g, ''))}/</span></div>` : ''}
                    </div>
                </div>

                <div class="xt-translation-card">
                    <div class="xt-card-header">
                        <span class="xt-card-icon">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                        </span>
                        <span class="xt-card-label">Bản dịch</span>
                    </div>
                    <p class="xt-translation-text">${Utils.escapeSpecialChars(result.translated)}</p>
                </div>
            </div>

            <div class="xt-translator-footer">
                <div class="xt-footer-brand">KimiZK Translator</div>
                <div class="xt-footer-info">Groq AI 120B</div>
            </div>
        `;
    },
    
    /**
     * Setup copy button functionality
     * @param {HTMLElement} button - Copy button element
     * @param {string} text - Text to copy
     */
    setupCopyButton(button, text) {
        if (!button) return;
        const copyIcon = button.querySelector(".xt-btn-icon") || button;
        const copyText = button.querySelector(".xt-btn-text");

        const clipboardSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;
        const checkmarkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!text) return;
            navigator.clipboard.writeText(text)
                .then(() => {
                    if (copyIcon) copyIcon.innerHTML = checkmarkSvg;
                    if (copyText) copyText.textContent = "Đã chép";
                    button.classList.add("copied");
                    setTimeout(() => {
                        if (copyIcon) copyIcon.innerHTML = clipboardSvg;
                        if (copyText) copyText.textContent = "Copy";
                        button.classList.remove("copied");
                    }, 2000);
                })
                .catch((err) => {
                    console.error("Clipboard write error:", err);
                    NotificationManager.show("Không thể sao chép văn bản.", "error", 4000);
                });
        });
    },
    
    /**
     * Clean up UI elements
     */
    cleanup() {
        this.popup?.remove();
        this.triggerIcon?.remove();
        AudioManager.stopCurrentAudio();
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}