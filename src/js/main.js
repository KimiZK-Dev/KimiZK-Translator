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
        //     // console.log('Audio cache info:', AudioManager.getCacheInfo());
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
    },
    
    /**
     * Handle text selection
     * @param {MouseEvent} e - Mouse event
     */
    async _handleTextSelection(e) {
        try {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return;
            }
            
            const selected = selection.toString().trim();
            // console.log('Selected text:', selected);
            
            if (!selected || 
                e.target.closest('.xt-translator-popup') || 
                e.target.closest('.xt-audio-controls') || 
                e.target.closest('.xt-trigger-icon')) {
                return;
            }

            UIManager.triggerIcon?.remove();
            const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
            UIManager.createTriggerIcon(selectionRect);

            UIManager.triggerIcon.addEventListener('click', async () => {
                // console.log('Trigger icon clicked, selected text:', selected);
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
        // Validate selected text at the beginning
        if (!selected || typeof selected !== 'string' || selected.trim().length === 0) {
            console.error('Invalid selected text:', selected);
            NotificationManager.show('Văn bản được chọn không hợp lệ. Vui lòng thử lại.', 'error');
            return;
        }

        let displayText;
        let content;
        
        try {
            UIManager.triggerIcon.remove();
            const isSingleWord = selected.split(/\s+/).length === 1 && selected.length <= 50;
            displayText = Utils.capitalizeFirstWord(selected);
            
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

            content = popup.querySelector(".xt-translator-content");
            this._setupPopupControls(popup);

            // Get target language from storage
            const targetLanguageResponse = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getTargetLanguage"}, resolve);
            });
            const targetLanguage = targetLanguageResponse?.success ? targetLanguageResponse.language : 'Vietnamese';
            const result = await ApiService.translate(selected, isSingleWord, targetLanguage);
            if (!result) {
                content.innerHTML = this._createErrorHTML(displayText);
                return;
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
                // Use the content variable if available, otherwise find it
                if (content) {
                    const errorDisplayText = displayText || selected || 'Văn bản không xác định';
                    content.innerHTML = this._createErrorHTML(errorDisplayText);
                } else {
                    const popup = document.querySelector('.xt-translator-popup');
                    if (popup) {
                        const contentElement = popup.querySelector(".xt-translator-content");
                        if (contentElement) {
                            const errorDisplayText = displayText || selected || 'Văn bản không xác định';
                            contentElement.innerHTML = this._createErrorHTML(errorDisplayText);
                        }
                    }
                }
                NotificationManager.show('API trả về dữ liệu không hợp lệ. Vui lòng thử lại.', 'error');
            } else {
                NotificationManager.show('Có lỗi xảy ra khi dịch. Vui lòng thử lại.', 'error');
            }
        }
    },
    
    /**
     * Create loading HTML
     * @private
     */
    _createLoadingHTML(displayText) {
        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${displayText}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">−</span>
                    <span class="xt-translator-close" title="Đóng">×</span>
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
    _createErrorHTML(displayText) {
        return `
            <div class="xt-translator-error">
                <div class="xt-error-icon">⚠️</div>
                <p>Không thể dịch "${displayText}"</p>
                <span class="xt-error-subtitle">API trả về dữ liệu không hợp lệ. Vui lòng thử lại sau hoặc kiểm tra API key.</span>
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
            AudioManager.stopCurrentAudio();
            popup.remove();
        });

        minimizeBtn.addEventListener('click', () => {
            const content = popup.querySelector(".xt-translator-content");
            isMinimized = !isMinimized;
            content.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '+' : '−';
            minimizeBtn.title = isMinimized ? 'Mở rộng' : 'Thu gọn';
        });
    },
    
    /**
     * Setup result controls (audio, copy buttons)
     * @private
     */
    _setupResultControls(content, result, isSingleWord, popup) {
        const listenBtn = content.querySelector('.xt-listen-btn');
        if (listenBtn) {
            // Use original selected text for audio (the text user highlighted)
            const originalSelectedText = this._getOriginalSelectedText();
            // console.log('Setting up audio for original text:', originalSelectedText);
            AudioManager.setupAudioButton(listenBtn, originalSelectedText, isSingleWord, popup);
        }

        const copyBtn = content.querySelector('.xt-copy-btn');
        if (copyBtn) {
            // For single word, copy the meaning; for text, copy the translation
            const textToCopy = isSingleWord ? (result.meaning || '') : (result.translated || '');
            UIManager.setupCopyButton(copyBtn, textToCopy);
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
            if (UIManager.popup && 
                !UIManager.popup.contains(e.target) && 
                !e.target.closest('.xt-audio-controls') && 
                !e.target.closest('.xt-trigger-icon') && 
                !window.getSelection().toString().trim() &&
                !AudioManager.isInteractingWithAudio()) {
                AudioManager.stopCurrentAudio();
                UIManager.popup.remove();
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
            if (UIManager.popup) {
                AudioManager.stopCurrentAudio();
                UIManager.popup.remove();
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
            // console.log('Audio cache info:', AudioManager.getCacheInfo());
            NotificationManager.show(`Cache size: ${AudioManager.getCacheSize()}/${AudioManager.MAX_CACHE_SIZE}`, 'info', 3000);
        }
    }
};

// Initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TranslationManager.init();
    });
} else {
    TranslationManager.init();
}