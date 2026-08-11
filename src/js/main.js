// Main content script for KimiZK-Translator
// console.log('KimiZK-Translator Content Script loaded');

// Initialize extension when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    TranslationManager.init();
});

// Main translation manager
const TranslationManager = {
    /**
     * Initialize the translation manager
     */
    init() {
        this._setupEventListeners();
        // console.log('TranslationManager initialized');
        
        // Debug: Log cache info on startup
        // setTimeout(() => {
        //     console.log('Audio cache info:', AudioManager.getCacheInfo());
        // }, 1000);
    },
    
    /**
     * Setup all event listeners
     * @private
     */
    _setupEventListeners() {
        // Text selection handler
        document.addEventListener("mouseup", this._handleTextSelection.bind(this));
        
        // Click outside to close
        document.addEventListener('click', this._handleOutsideClick.bind(this));
        
        // Trigger icon click outside
        document.addEventListener('click', this._handleTriggerIconClick.bind(this));
        
        // Scroll handler for popup positioning
        document.addEventListener('scroll', Utils.throttle(this._handleScroll.bind(this), 100));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyboard.bind(this));

        // Realtime Theme Sync from Extension Storage
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && changes.appTheme) {
                    UIManager.applyTheme(changes.appTheme.newValue);
                }
            });
        }
    },
    
    /**
     * Handle text selection
     * @param {MouseEvent} e - Mouse event
     */
    async _handleTextSelection(e) {
        try {
            const selected = window.getSelection().toString().trim();
            if (!selected || 
                e.target.closest('.xt-translator-popup') || 
                e.target.closest('.xt-audio-controls') || 
                e.target.closest('.xt-trigger-icon')) {
                return;
            }

            UIManager.triggerIcon?.remove();
            const selectionRect = window.getSelection().getRangeAt(0).getBoundingClientRect();
            UIManager.createTriggerIcon(selectionRect);

            UIManager.triggerIcon.addEventListener('click', async () => {
                await this._handleTranslation(selected, selectionRect);
            });
            
        } catch (error) {
            console.error('Error in text selection handler:', error);
            NotificationManager.show('Có lỗi xảy ra khi chọn văn bản. Vui lòng thử lại.', 'error');
        }
    },
    
    /**
     * Handle translation process
     * @param {string} selected - Selected text
     * @param {DOMRect} selectionRect - Selection rectangle
     */
    async _handleTranslation(selected, selectionRect) {
        try {
            UIManager.triggerIcon.remove();
            const isSingleWord = selected.split(/\s+/).length === 1 && selected.length <= 50;
            const displayText = Utils.capitalizeFirstWord(selected);
            
            // Store the original selected text for audio
            this._lastSelectedText = selected;

            const popup = UIManager.createPopup();
            popup.innerHTML = this._createLoadingHTML(displayText);
            UIManager.setupDragging(popup);

            const { top, left } = UIManager.calculatePopupPosition(selectionRect);
            Object.assign(popup.style, {
                top: `${top}px`,
                left: `${left}px`,
                opacity: '0',
                transform: 'translateY(-10px) scale(0.95)'
            });

            requestAnimationFrame(() => {
                popup.style.opacity = '1';
                popup.style.transform = 'translateY(0) scale(1)';
            });

            const content = popup.querySelector(".xt-translator-content");
            this._setupPopupControls(popup);

            // Get target language from storage safely
            let targetLanguage = 'Vietnamese';
            try {
                if (typeof StorageManager !== 'undefined' && StorageManager.getTargetLanguage) {
                    targetLanguage = await StorageManager.getTargetLanguage();
                } else {
                    const targetLanguageResponse = await new Promise((resolve) => {
                        try {
                            chrome.runtime.sendMessage({action: "getTargetLanguage"}, (res) => {
                                if (chrome.runtime.lastError) resolve({ success: false });
                                else resolve(res);
                            });
                        } catch (e) { resolve({ success: false }); }
                    });
                    targetLanguage = targetLanguageResponse?.success ? targetLanguageResponse.language : 'Vietnamese';
                }
            } catch (langErr) {
                console.warn('Target language fallback to Vietnamese:', langErr);
            }
            const startTime = Date.now();
            const result = await ApiService.translate(selected, isSingleWord, targetLanguage);
            if (!result) {
                content.innerHTML = this._createErrorHTML(displayText);
                return;
            }

            const elapsed = Date.now() - startTime;
            if (typeof StorageManager !== 'undefined' && StorageManager.recordTranslationEvent) {
                StorageManager.recordTranslationEvent(selected, targetLanguage, elapsed);
            }

            UIManager.renderTranslationResult(content, result, displayText, isSingleWord);
            this._setupResultControls(content, result, isSingleWord, popup);
            
            // Debug: Log cache info after translation
            // console.log('Cache info after translation:', AudioManager.getCacheInfo());
            
        } catch (error) {
            console.error('Error in translation process:', error);
            
            if (error.message === 'API_KEY_NOT_FOUND') {
                UIManager.showApiKeyPrompt();
            } else if (error.message === 'INVALID_API_RESPONSE') {
                if (content) content.innerHTML = this._createErrorHTML(displayText, 'API trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
                NotificationManager.show('API trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'error');
            } else {
                if (content) content.innerHTML = this._createErrorHTML(displayText, error.message);
                NotificationManager.show(error.message || 'Có lỗi xảy ra khi dịch. Vui lòng thử lại.', 'error');
            }
        }
    },

    /**
     * Display Vision OCR Translation Result in Floating Popup
     * @param {object} rect - Selected region coordinates
     * @param {object} result - OCR Translation Result
     */
    displayOcrResult(rect, result) {
        if (!result) return;
        const rawText = result.originalText || result.translated || "Vision OCR";
        const displayText = rawText;
        const isSingleWord = false;

        this._lastSelectedText = result.originalText || result.translated || "";

        const popup = UIManager.createPopup();
        popup.innerHTML = this._createLoadingHTML(displayText);
        UIManager.setupDragging(popup);

        const popupWidth = 360;
        let left = (rect.left + rect.width / 2) - (popupWidth / 2);
        left = Math.max(20, Math.min(window.innerWidth - popupWidth - 20, left));
        
        let top = rect.top + rect.height + 12;
        if (top + 280 > window.innerHeight) {
            top = Math.max(20, rect.top - 280);
        }

        Object.assign(popup.style, {
            top: `${top}px`,
            left: `${left}px`,
            opacity: '0',
            transform: 'translateY(-10px) scale(0.95)'
        });

        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0) scale(1)';
        });

        const content = popup.querySelector(".xt-translator-content");
        this._setupPopupControls(popup);

        UIManager.renderTranslationResult(content, result, displayText, isSingleWord);
        this._setupResultControls(content, result, isSingleWord, popup);
    },

    /**
     * Display immediate OCR loading popup
     * @param {object} rect - Selected region coordinates
     * @returns {HTMLElement} Created popup element
     */
    displayOcrLoading(rect) {
        const displayText = "Trích xuất OCR Vision";
        const popup = UIManager.createPopup();
        popup.innerHTML = this._createLoadingHTML(displayText);
        UIManager.setupDragging(popup);

        const popupWidth = 360;
        let left = (rect.left + rect.width / 2) - (popupWidth / 2);
        left = Math.max(20, Math.min(window.innerWidth - popupWidth - 20, left));
        
        let top = rect.top + rect.height + 12;
        if (top + 280 > window.innerHeight) {
            top = Math.max(20, rect.top - 280);
        }

        Object.assign(popup.style, {
            top: `${top}px`,
            left: `${left}px`,
            opacity: '0',
            transform: 'translateY(-10px) scale(0.95)'
        });

        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0) scale(1)';
        });

        this._setupPopupControls(popup);
        return popup;
    },
    
    /**
     * Create loading HTML
     * @private
     */
    _createLoadingHTML(displayText) {
        const iconUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL 
            ? chrome.runtime.getURL('src/icons/icon32.png') 
            : '';
        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">
                        <img src="${iconUrl}" width="18" height="18" style="display:block; width:18px; height:18px; object-fit:contain; border-radius:4px; pointer-events:none;" alt="KimiZK" />
                    </span>
                    <span class="xt-translator-word">${displayText}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                    <span class="xt-translator-close" title="Đóng">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </span>
                </div>
            </div>
            <div class="xt-translator-content">
                <div class="xt-translator-loading">
                    <div class="xt-loading-spinner"></div>
                    <span>Đang dịch...</span>
                </div>
            </div>
        `;
    },
    
    /**
     * Create error HTML
     * @private
     */
    _createErrorHTML(displayText, customMsg) {
        const errorDetail = customMsg || "API trả về dữ liệu không hợp lệ. Vui lòng thử lại sau hoặc kiểm tra API key.";
        const truncatedText = displayText && displayText.length > 35 ? displayText.substring(0, 35) + '...' : displayText;
        return `
            <div class="xt-translator-error">
                <div class="xt-error-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <p>Không thể dịch "${truncatedText}"</p>
                <span class="xt-error-subtitle">${errorDetail}</span>
            </div>
        `;
    },
    
    /**
     * Setup popup controls (close, minimize)
     * @private
     */
    _setupPopupControls(popup) {
        const closeBtn = popup.querySelector(".xt-translator-close");
        const minimizeBtn = popup.querySelector(".xt-translator-minimize");
        let isMinimized = false;

        closeBtn.addEventListener('click', () => {
            UIManager.removePopup();
        });

        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            popup.classList.toggle('is-minimized', isMinimized);
            minimizeBtn.innerHTML = isMinimized ? 
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' : 
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
            minimizeBtn.title = isMinimized ? 'Mở rộng' : 'Thu gọn';
        });
    },
    
    /**
     * Setup result controls (audio, copy buttons)
     * @private
     */
    _setupResultControls(content, result, isSingleWord, popup) {
        const origText = result?.originalText || this._getOriginalSelectedText();
        const transText = result?.translated || result?.meaning || '';

        const listenOrigBtn = content.querySelector('.xt-listen-orig-btn');
        if (listenOrigBtn && origText) {
            AudioManager.setupAudioButton(listenOrigBtn, String(origText).trim(), isSingleWord, popup, true);
        }

        const listenTransBtn = content.querySelector('.xt-listen-btn, .kz-listen-btn, .kz-fp-listen');
        if (listenTransBtn && transText) {
            AudioManager.setupAudioButton(listenTransBtn, String(transText).trim(), isSingleWord, popup, false);
        }

        const copyBtn = content.querySelector('.xt-copy-btn, .kz-copy-btn, .kz-fp-copy');
        if (copyBtn) {
            UIManager.setupCopyButton(copyBtn, transText);
        }
    },
    
    /**
     * Get original selected text from current selection
     * @private
     */
    _getOriginalSelectedText() {
        // Try to get from current selection first
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            const text = selection.toString().trim();
            // console.log('Getting text from current selection:', text);
            return text;
        }
        
        // Fallback: try to get from stored selection
        if (this._lastSelectedText) {
            // console.log('Getting text from stored selection:', this._lastSelectedText);
            return this._lastSelectedText;
        }
        
        // Final fallback: return empty string
        // console.log('No text found for audio');
        return '';
    },
    
    /**
     * Handle clicks outside popup
     * @param {MouseEvent} e - Mouse event
     */
    _handleOutsideClick(e) {
        try {
            // Ignore if clicked element was detached from DOM during click handling (e.g. innerHTML icon replacement)
            if (e.target && !e.target.isConnected) {
                return;
            }

            if (UIManager.popup && 
                !UIManager.popup.contains(e.target) && 
                !e.target.closest('.xt-audio-controls') && 
                !e.target.closest('.xt-trigger-icon') && 
                !window.getSelection().toString().trim() &&
                !AudioManager.isInteractingWithAudio()) {
                UIManager.removePopup();
                UIManager.triggerIcon?.remove();
            }
        } catch (error) {
            console.error('Error in outside click handler:', error);
        }
    },
    
    /**
     * Handle trigger icon clicks outside
     * @param {MouseEvent} e - Mouse event
     */
    _handleTriggerIconClick(e) {
        try {
            if (UIManager.triggerIcon && 
                !UIManager.triggerIcon.contains(e.target) && 
                !e.target.closest('.xt-trigger-icon') && 
                !UIManager.justCreatedTriggerIcon && 
                e.button === 0) {
                UIManager.triggerIcon.remove();
            }
        } catch (error) {
            console.error('Error in trigger icon click handler:', error);
        }
    },
    
    /**
     * Handle scroll for popup positioning
     */
    _handleScroll() {
        try {
            if (!UIManager.popup || UIManager.isDragging) return;

            const rect = UIManager.popup.getBoundingClientRect();
            const padding = 15;
            let needsAdjustment = false;
            let newTop = parseInt(UIManager.popup.style.top);
            let newLeft = parseInt(UIManager.popup.style.left);

            if (rect.top < padding) {
                newTop = padding;
                needsAdjustment = true;
            }
            if (rect.bottom > window.innerHeight - padding) {
                newTop = window.innerHeight - rect.height - padding;
                needsAdjustment = true;
            }
            if (rect.left < padding) {
                newLeft = padding;
                needsAdjustment = true;
            }
            if (rect.right > window.innerWidth - padding) {
                newLeft = window.innerWidth - rect.width - padding;
                needsAdjustment = true;
            }

            if (needsAdjustment) {
                UIManager.popup.style.top = `${Math.max(padding, newTop)}px`;
                UIManager.popup.style.left = `${Math.max(padding, newLeft)}px`;
                
                const audioControls = document.querySelector('.xt-audio-controls');
                if (audioControls) {
                    audioControls.style.left = `${Math.max(padding, newLeft) + UIManager.popup.offsetWidth + 10}px`;
                    audioControls.style.top = `${Math.max(padding, newTop)}px`;
                }
            }
        } catch (error) {
            console.error('Error in scroll handler:', error);
        }
    },
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeyboard(e) {
        // Escape key to close popup
        if (e.key === 'Escape') {
            if (UIManager.popup && !UIManager.isDragging) {
                UIManager.removePopup();
                UIManager.triggerIcon?.remove();
            }
        }
        
        // Ctrl/Cmd + Shift + L to trigger translation (changed from T to avoid conflict with browser's reopen tab)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            const selected = window.getSelection().toString().trim();
            if (selected) {
                const selectionRect = window.getSelection().getRangeAt(0).getBoundingClientRect();
                this._handleTranslation(selected, selectionRect);
            }
        }
        
        // Debug: Ctrl/Cmd + Shift + C to show cache info
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            NotificationManager.show(`Cache size: ${AudioManager.getCacheSize()}/${AudioManager.MAX_CACHE_SIZE}`, 'info', 3000);
        }
    }
};

// Region Snipping Tool Controller for Interactive OCR Crop
const RegionSnipper = {
    targetLang: "Vietnamese",
    _cleanupFn: null,

    start(targetLang = "Vietnamese") {
        this.cleanup();
        this.targetLang = targetLang;

        const overlay = document.createElement("div");
        overlay.id = "xt-snip-overlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.35);
            z-index: 2147483647;
            cursor: crosshair;
            user-select: none;
        `;

        const banner = document.createElement("div");
        banner.style.cssText = `
            position: absolute;
            top: 24px; left: 50%; transform: translateX(-50%);
            background: #0f172a; color: #ffffff;
            padding: 8px 18px; border-radius: 999px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px; font-weight: 600;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.15);
            display: flex; align-items: center; gap: 8px;
            pointer-events: none;
        `;
        banner.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M6 3v18"></path><path d="M18 3v18"></path><rect x="6" y="7" width="12" height="10" rx="2"></rect></svg><span>Kéo thả chuột để chọn vùng màn hình cần dịch OCR (Nhấn ESC để hủy)</span>`;
        overlay.appendChild(banner);

        const box = document.createElement("div");
        box.id = "xt-snip-box";
        box.style.cssText = `
            position: absolute;
            border: 2px dashed #3b82f6;
            background: rgba(59, 130, 246, 0.15);
            display: none;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
            pointer-events: none;
        `;
        overlay.appendChild(box);

        document.body.appendChild(overlay);

        let startX = 0, startY = 0, isDragging = false;

        const onMouseDown = (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isDragging = true;
            box.style.left = `${startX}px`;
            box.style.top = `${startY}px`;
            box.style.width = '0px';
            box.style.height = '0px';
            box.style.display = 'block';
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const currentX = e.clientX;
            const currentY = e.clientY;

            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            box.style.left = `${left}px`;
            box.style.top = `${top}px`;
            box.style.width = `${width}px`;
            box.style.height = `${height}px`;
        };

        const onMouseUp = async (e) => {
            if (!isDragging) return;
            isDragging = false;

            const rect = {
                left: parseInt(box.style.left) || 0,
                top: parseInt(box.style.top) || 0,
                width: parseInt(box.style.width) || 0,
                height: parseInt(box.style.height) || 0
            };

            this.cleanup();

            if (rect.width > 15 && rect.height > 15) {
                // Ensure Chrome DOM repaints clean screen without dark overlay before capturing tab
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        this.processCrop(rect);
                    }, 120);
                });
            }
        };

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                this.cleanup();
            }
        };

        overlay.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", onKeyDown);

        this._cleanupFn = () => {
            overlay.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("keydown", onKeyDown);
            overlay.remove();
        };
    },

    cleanup() {
        if (this._cleanupFn) {
            this._cleanupFn();
            this._cleanupFn = null;
        }
    },

    async processCrop(rect) {
        // Open floating loading popup INSTANTLY at cropped location
        const popup = TranslationManager.displayOcrLoading(rect);
        const content = popup.querySelector(".xt-translator-content");

        chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, async (response) => {
            if (!response || !response.dataUrl) {
                if (content) content.innerHTML = `<div style="padding:14px; color:#ef4444;">Không thể chụp màn hình. Vui lòng thử lại.</div>`;
                return;
            }

            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const dpr = window.devicePixelRatio || 1;

                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                const ctx = canvas.getContext("2d");

                ctx.drawImage(
                    img,
                    rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr,
                    0, 0, rect.width * dpr, rect.height * dpr
                );

                const croppedDataUrl = canvas.toDataURL("image/png");

                chrome.runtime.sendMessage({
                    action: "TRANSLATE_IMAGE",
                    imageDataUrl: croppedDataUrl,
                    targetLanguage: this.targetLang || "Vietnamese"
                }, (translateRes) => {
                    if (translateRes && translateRes.success && translateRes.result) {
                        const result = translateRes.result;
                        const rawText = result.originalText || result.translated || "Vision OCR";
                        const displayText = rawText;

                        // Update header title
                        const titleEl = popup.querySelector(".xt-translator-word");
                        if (titleEl) titleEl.textContent = displayText;

                        // Render result smoothly inside popup
                        UIManager.renderTranslationResult(content, result, displayText, false);
                        TranslationManager._setupResultControls(content, result, false, popup);

                        // Save to history
                        if (typeof StorageManager !== 'undefined' && StorageManager.addTranslationHistory) {
                            StorageManager.addTranslationHistory({
                                type: 'ocr',
                                originalText: result.originalText || 'Trích xuất OCR từ ảnh',
                                translatedText: result.translated || '',
                                targetLang: this.targetLang || 'Vietnamese',
                                timestamp: Date.now()
                            });
                        }
                    } else {
                        const errMsg = translateRes?.error || "Không trích xuất được chữ từ hình ảnh.";
                        if (content) {
                            content.innerHTML = `<div style="padding: 14px; color: #ef4444; font-size: 13px;">Lỗi Vision OCR: ${errMsg}</div>`;
                        }
                    }
                });
            };
            img.src = response.dataUrl;
        });
    }
};

// Handle Messages from Extension Popup or Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_REGION_SNIP") {
        RegionSnipper.start(request.targetLang || "Vietnamese");
        sendResponse({ started: true });
    }
});

// Initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TranslationManager.init();
    });
} else {
    TranslationManager.init();
}