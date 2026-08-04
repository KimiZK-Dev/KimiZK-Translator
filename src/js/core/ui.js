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
    
    /**
     * Remove translation popup and stop any active audio
     */
    removePopup() {
        if (typeof AudioManager !== 'undefined' && AudioManager.stopCurrentAudio) {
            AudioManager.stopCurrentAudio();
        }
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        const audioControls = document.querySelector('.xt-audio-controls');
        if (audioControls) {
            audioControls.remove();
        }
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
        
        return this.popup;
    },
    
    /**
     * Setup dragging functionality for popup
     * @param {HTMLElement} element - Element to make draggable
     */
    setupDragging(element) {
        const header = element.querySelector('.xt-translator-header');
        const dragOverlay = header?.querySelector('.xt-header-drag-overlay');
        if (!header || !dragOverlay) return;

        const startDrag = e => {
            if (e.button !== 0) return;
            this.isDragging = true;
            const rect = element.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            element.style.transition = 'none';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
        };

        const drag = e => {
            if (!this.isDragging) return;
            e.preventDefault();
            const newX = Math.max(0, Math.min(e.clientX - this.dragOffset.x, window.innerWidth - element.offsetWidth));
            const newY = Math.max(0, Math.min(e.clientY - this.dragOffset.y, window.innerHeight - element.offsetHeight));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            
            // Update audio controls position
            const audioControls = document.querySelector('.xt-audio-controls');
            if (audioControls) {
                audioControls.style.left = `${newX + element.offsetWidth + 10}px`;
                audioControls.style.top = `${newY}px`;
            }
        };

        const stopDrag = () => {
            this.isDragging = false;
            element.style.transition = `all ${CONFIG.UI.ANIMATION_DURATION}ms cubic-bezier(0.25, 0.8, 0.25, 1)`;
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        };

        dragOverlay.addEventListener('mousedown', startDrag);
        dragOverlay.querySelectorAll('*').forEach(child => {
            child.addEventListener('mousedown', e => e.stopPropagation());
        });
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
            <button class="xt-apikey-close" id="xt-apikey-close">×</button>
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
    },
    
    /**
     * Render single word translation result
     * @private
     */
    _renderSingleWordResult(result, displayText) {
        const renderExamples = (examples, translations) => {
            return (examples || []).map((ex, i) => `
                <div class="xt-example-item">
                    <div class="xt-example-en">"${Utils.escapeSpecialChars(ex)}"</div>
                    <div class="xt-example-vi">${Utils.escapeSpecialChars(translations?.[i] || '–')}</div>
                </div>
            `).join('');
        };

        const renderTag = (text) => {
            if (!text) return '';
            const escaped = Utils.escapeSpecialChars(text);
            const match = escaped.match(/^([^(]+)\s*\(([^)]+)\)$/);
            if (match) {
                return `<span class="xt-tag"><strong class="xt-tag-word">${match[1].trim()}</strong> <span class="xt-tag-pos" style="opacity: 0.75; font-size: 11px; font-weight: 500; margin-left: 3px;">(${match[2].trim()})</span></span>`;
            }
            return `<span class="xt-tag">${escaped}</span>`;
        };

        const hasPhonetic = result.transcription && result.transcription.trim().length > 0;
        const partOfSpeech = result.partOfSpeech ? result.partOfSpeech.trim() : '';

        return `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title-single" title="${Utils.escapeSpecialChars(displayText)}">${Utils.escapeSpecialChars(displayText)}</h2>
                    <div class="xt-language-info">
                        <span class="xt-language-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <span>${Utils.escapeSpecialChars(result.detectedLanguage || 'tiếng Anh')}</span>
                            <span class="xt-arrow" style="display: inline-flex; align-items: center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
                            <span>${Utils.escapeSpecialChars(result.targetLanguage || 'tiếng Việt')}</span>
                        </span>
                    </div>
                    <div class="xt-action-buttons">
                        <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                            <span class="xt-btn-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                            </span>
                            <span class="xt-btn-text">Nghe</span>
                        </button>
                    </div>
                    ${hasPhonetic ? `<div class="xt-phonetic"><code>${Utils.escapeSpecialChars(result.transcription)}</code></div>` : ''}
                    ${partOfSpeech ? `<div class="xt-part-of-speech">${Utils.escapeSpecialChars(partOfSpeech)}</div>` : ''}
                </div>
                ${result.meaning ? `
                <div class="xt-translation-card">
                    <div class="xt-card-header">
                        <span class="xt-card-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        </span>
                        <span class="xt-card-label">Nghĩa chính</span>
                    </div>
                    <p class="xt-translation-text">${Utils.escapeSpecialChars(result.meaning.charAt(0).toUpperCase() + result.meaning.slice(1))}</p>
                </div>
                ` : ''}
                ${result.description ? `
                <div class="xt-description-box">
                    <div class="xt-card-header">
                        <span class="xt-card-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>
                        </span>
                        <span class="xt-card-label">Giải thích</span>
                    </div>
                    <p class="xt-description-text">${Utils.escapeSpecialChars(result.description.charAt(0).toUpperCase() + result.description.slice(1))}</p>
                </div>
                ` : ''}
            </div>
            <div class="xt-translator-secondary">
                ${(result.examples && result.examples.length > 0) ? `
                <div class="xt-section xt-examples">
                    <h3>
                        <span class="xt-section-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </span>Ví dụ
                    </h3>
                    <div class="xt-examples-list">
                        ${renderExamples(result.examples, result.examplesTranslated)}
                    </div>
                </div>
                ` : ''}
                ${(result.synonyms && result.synonyms.length > 0) ? `
                <div class="xt-section xt-synonyms">
                    <h3>
                        <span class="xt-section-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        </span>Từ đồng nghĩa
                    </h3>
                    <div class="xt-tags">
                        ${result.synonyms.map(s => renderTag(s)).join('')}
                    </div>
                </div>
                ` : ''}
                ${(result.otherWordForms && result.otherWordForms.length > 0) ? `
                <div class="xt-section xt-word-forms">
                    <h3>
                        <span class="xt-section-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        </span>Biến thể khác
                    </h3>
                    <div class="xt-tags">
                        ${result.otherWordForms.map(f => renderTag(f)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
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
                    <h2 class="xt-word-title-text" title="${Utils.toSingleLine(displayText)}">${Utils.toSingleLine(displayText)}</h2>
                    <div class="xt-language-info">
                        <span class="xt-language-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            <span>${Utils.escapeSpecialChars(result.detectedLanguage || 'tiếng Anh')}</span>
                            <span class="xt-arrow" style="display: inline-flex; align-items: center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
                            <span>${Utils.escapeSpecialChars(result.targetLanguage || 'tiếng Việt')}</span>
                        </span>
                    </div>
                    <div class="xt-action-buttons">
                        <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                            <span class="xt-btn-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                            </span>
                            <span class="xt-btn-text">Nghe</span>
                        </button>
                        <button class="xt-action-btn xt-copy-btn" title="Sao chép bản dịch">
                            <span class="xt-btn-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </span>
                            <span class="xt-btn-text">Copy</span>
                        </button>
                    </div>
                    ${hasPhonetic ? `<div class="xt-phonetic"><code>${Utils.escapeSpecialChars(result.transcription)}</code></div>` : ''}
                </div>
                <div class="xt-translation-card">
                    <div class="xt-card-header">
                        <span class="xt-card-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
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
        const copyIcon = button.querySelector(".xt-btn-icon");
        const copyText = button.querySelector(".xt-btn-text");

        const clipboardSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        const checkmarkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(text)
                .then(() => {
                    copyIcon.innerHTML = checkmarkSvg;
                    copyText.textContent = "Đã chép";
                    button.classList.add("copied");
                    setTimeout(() => {
                        copyIcon.innerHTML = clipboardSvg;
                        copyText.textContent = "Copy";
                        button.classList.remove("copied");
                    }, 2000);
                })
                .catch(() => NotificationManager.show("Không thể sao chép văn bản.", "error", 4000));
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