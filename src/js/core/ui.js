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
        this.triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('src/icons/icon16.png')}" alt="Translate">`;
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
     * Create translation popup
     * @returns {HTMLElement} Popup element
     */
    createPopup() {
        AudioManager.stopCurrentAudio();
        this.popup?.remove();
        
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
                <span>🔑</span> Nhập API KEY để sử dụng dịch
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
                    <div class="xt-example-en">${Utils.escapeSpecialChars(ex)}</div>
                    <div class="xt-example-vi">${Utils.escapeSpecialChars(translations?.[i] || '–')}</div>
                </div>
            `).join('');
        };

        return `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title-single">${Utils.escapeSpecialChars(displayText)}</h2>
                    <div class="xt-language-info">
                        <span class="xt-language-badge">${Utils.escapeSpecialChars(result.detectedLanguage || 'tiếng Anh')} → ${Utils.escapeSpecialChars(result.targetLanguage || 'tiếng Việt')}</span>
                    </div>
                    <div class="xt-action-buttons">
                        <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                            <span class="xt-btn-icon">🔊</span>
                            <span class="xt-btn-text">Nghe</span>
                        </button>
                    </div>
                    <div class="xt-phonetic">${Utils.escapeSpecialChars(result.transcription || '')}</div>
                    <div class="xt-part-of-speech">${Utils.escapeSpecialChars(result.partOfSpeech)}</div>
                </div>
                <div class="xt-meaning">
                    <h3>Nghĩa</h3>
                    <p>${Utils.escapeSpecialChars(result.meaning.charAt(0).toUpperCase() + result.meaning.slice(1))}</p>
                </div>
                <div class="xt-description">
                    <h3>Giải thích</h3>
                    <p>${Utils.escapeSpecialChars(result.description.charAt(0).toUpperCase() + result.description.slice(1))}</p>
                </div>
            </div>
            <div class="xt-translator-secondary">
                <div class="xt-section xt-examples">
                    <h3><span class="xt-section-icon">💡</span>Ví dụ</h3>
                    <div class="xt-examples-list">
                        ${renderExamples(result.examples, result.examplesTranslated)}
                    </div>
                </div>
                <div class="xt-section xt-synonyms">
                    <h3><span class="xt-section-icon">🔗</span>Từ đồng nghĩa</h3>
                    <div class="xt-tags">
                        ${(result.synonyms || []).map(s => `<span class="xt-tag">${Utils.escapeSpecialChars(s)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                    </div>
                </div>
                <div class="xt-section xt-word-forms">
                    <h3><span class="xt-section-icon">📝</span>Biến thể khác</h3>
                    <div class="xt-tags">
                        ${(result.otherWordForms || []).map(f => `<span class="xt-tag">${Utils.escapeSpecialChars(f)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                    </div>
                </div>
            </div>
            <div class="xt-translator-footer">
                <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                <div class="xt-footer-info">Powered by AI</div>
            </div>
        `;
    },
    
    /**
     * Render text translation result
     * @private
     */
    _renderTextResult(result, displayText) {
        return `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title-text">${Utils.escapeSpecialChars(displayText)}</h2>
                    <div class="xt-language-info">
                        <span class="xt-language-badge">${Utils.escapeSpecialChars(result.detectedLanguage || 'tiếng Anh')} → ${Utils.escapeSpecialChars(result.targetLanguage || 'tiếng Việt')}</span>
                    </div>
                    <div class="xt-action-buttons">
                        <button class="xt-action-btn xt-listen-btn" title="Nghe văn bản gốc">
                            <span class="xt-btn-icon">🔊</span>
                            <span class="xt-btn-text">Nghe</span>
                        </button>
                        <button class="xt-action-btn xt-copy-btn" title="Sao chép văn bản dịch">
                            <span class="xt-btn-icon">📋</span>
                            <span class="xt-btn-text">Copy</span>
                        </button>
                    </div>
                    ${result.transcription ? `<div class="xt-phonetic">${Utils.escapeSpecialChars(result.transcription)}</div>` : ''}
                </div>
                <div class="xt-translation">
                    <h3>Dịch</h3>
                    <p>${Utils.escapeSpecialChars(result.translated)}</p>
                </div>
            </div>
            <div class="xt-translator-footer">
                <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                <div class="xt-footer-info">Powered by AI</div>
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

        button.addEventListener('click', () => {
            navigator.clipboard.writeText(text)
                .then(() => {
                    copyIcon.textContent = "✅";
                    copyText.textContent = "Đã sao chép";
                    setTimeout(() => {
                        copyIcon.textContent = "📋";
                        copyText.textContent = "Copy";
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