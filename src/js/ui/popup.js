/**
 * Popup UI Module
 * Handles translation popup creation and management
 */

import { CONFIG } from '../core/config.js';
import { calculatePopupPosition, safeRemoveElement, safeSetStyle, log } from '../core/utils.js';
import apiService from '../services/api.js';
import notificationManager from './notification.js';
import audioPlayer from './audio-player.js';

class PopupManager {
    constructor() {
        this.currentPopup = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
    }

    /**
     * Create translation popup
     * @returns {HTMLElement} Popup element
     */
    create() {
        // Stop current audio and remove existing popup
        audioPlayer.stop();
        this.remove();

        const popup = document.createElement("div");
        popup.className = "xt-translator-popup";
        
        // Set initial styles
        safeSetStyle(popup, 'position', 'fixed');
        safeSetStyle(popup, 'zIndex', CONFIG.UI.Z_INDEX.POPUP.toString());
        safeSetStyle(popup, 'left', '0px');
        safeSetStyle(popup, 'top', '0px');
        
        document.body.appendChild(popup);
        this.currentPopup = popup;
        
        log('Translation popup created', 'info');
        return popup;
    }

    /**
     * Remove current popup
     */
    remove() {
        if (this.currentPopup) {
            safeRemoveElement(this.currentPopup);
            this.currentPopup = null;
            this.isDragging = false;
            log('Translation popup removed', 'info');
        }
    }

    /**
     * Setup popup dragging
     * @param {HTMLElement} popup - Popup element
     */
    setupDragging(popup) {
        const header = popup.querySelector('.xt-translator-header');
        const dragOverlay = header?.querySelector('.xt-header-drag-overlay');
        
        if (!header || !dragOverlay) return;

        const startDrag = e => {
            if (e.button !== 0) return; // Only left mouse button
            
            this.isDragging = true;
            const rect = popup.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            
            safeSetStyle(popup, 'transition', 'none');
            safeSetStyle(document.body, 'userSelect', 'none');
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', stopDrag);
        };

        const drag = e => {
            if (!this.isDragging) return;
            
            e.preventDefault();
            const newX = Math.max(0, Math.min(e.clientX - this.dragOffset.x, window.innerWidth - popup.offsetWidth));
            const newY = Math.max(0, Math.min(e.clientY - this.dragOffset.y, window.innerHeight - popup.offsetHeight));
            
            safeSetStyle(popup, 'left', `${newX}px`);
            safeSetStyle(popup, 'top', `${newY}px`);
            
            // Update audio controls position
            this.updateAudioControlsPosition(newX, newY, popup.offsetWidth);
        };

        const stopDrag = () => {
            this.isDragging = false;
            safeSetStyle(popup, 'transition', 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)');
            safeSetStyle(document.body, 'userSelect', '');
            
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
        };

        dragOverlay.addEventListener('mousedown', startDrag);
        
        // Prevent dragging on child elements
        dragOverlay.querySelectorAll('*').forEach(child => {
            child.addEventListener('mousedown', e => e.stopPropagation());
        });
    }

    /**
     * Update audio controls position
     * @param {number} popupX - Popup X position
     * @param {number} popupY - Popup Y position
     * @param {number} popupWidth - Popup width
     */
    updateAudioControlsPosition(popupX, popupY, popupWidth) {
        const audioControls = document.querySelector('.xt-audio-controls');
        if (audioControls) {
            safeSetStyle(audioControls, 'left', `${popupX + popupWidth + 10}px`);
            safeSetStyle(audioControls, 'top', `${popupY}px`);
        }
    }

    /**
     * Position popup based on selection
     * @param {DOMRect} selectionRect - Selection rectangle
     * @param {HTMLElement} popup - Popup element
     */
    positionPopup(selectionRect, popup) {
        const { left, top } = calculatePopupPosition(selectionRect);
        
        safeSetStyle(popup, 'top', `${top}px`);
        safeSetStyle(popup, 'left', `${left}px`);
        safeSetStyle(popup, 'opacity', '0');
        safeSetStyle(popup, 'transform', 'translateY(-10px) scale(0.95)');

        // Animate in
        requestAnimationFrame(() => {
            safeSetStyle(popup, 'opacity', '1');
            safeSetStyle(popup, 'transform', 'translateY(0) scale(1)');
        });
    }

    /**
     * Create popup content for single word
     * @param {string} displayText - Text to display
     * @param {Object} result - Translation result
     * @returns {string} HTML content
     */
    createSingleWordContent(displayText, result) {
        const renderExamples = (examples, translations) => {
            return (examples || []).map((ex, i) => `
                <div class="xt-example-item">
                    <div class="xt-example-en">${this.escapeHtml(ex)}</div>
                    <div class="xt-example-vi">${this.escapeHtml(translations?.[i] || '–')}</div>
                </div>
            `).join('');
        };

        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${this.escapeHtml(displayText)}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">−</span>
                    <span class="xt-translator-close" title="Đóng">×</span>
                </div>
            </div>
            <div class="xt-translator-content">
                <div class="xt-translator-main">
                    <div class="xt-main-info">
                        <h2 class="xt-word-title-single">${this.escapeHtml(displayText)}</h2>
                        <div class="xt-language-info">
                            <span class="xt-language-badge">${this.escapeHtml(result.detectedLanguage || 'tiếng Anh')} → tiếng Việt</span>
                        </div>
                        <div class="xt-action-buttons">
                            <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                                <span class="xt-btn-icon">🔊</span>
                                <span class="xt-btn-text">Nghe</span>
                            </button>
                        </div>
                        <div class="xt-phonetic">${this.escapeHtml(result.transcription || '')}</div>
                        <div class="xt-part-of-speech">${this.escapeHtml(result.partOfSpeech)}</div>
                    </div>
                    <div class="xt-meaning">
                        <h3>Nghĩa</h3>
                        <p>${this.escapeHtml(this.capitalizeFirst(result.meaning))}</p>
                    </div>
                    <div class="xt-description">
                        <h3>Giải thích</h3>
                        <p>${this.escapeHtml(this.capitalizeFirst(result.description))}</p>
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
                            ${(result.synonyms || []).map(s => `<span class="xt-tag">${this.escapeHtml(s)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                        </div>
                    </div>
                    <div class="xt-section xt-word-forms">
                        <h3><span class="xt-section-icon">📝</span>Biến thể khác</h3>
                        <div class="xt-tags">
                            ${(result.otherWordForms || []).map(f => `<span class="xt-tag">${this.escapeHtml(f)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                        </div>
                    </div>
                </div>
                <div class="xt-translator-footer">
                    <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                    <div class="xt-footer-info">Powered by AI</div>
                </div>
            </div>
        `;
    }

    /**
     * Create popup content for text
     * @param {string} displayText - Text to display
     * @param {Object} result - Translation result
     * @returns {string} HTML content
     */
    createTextContent(displayText, result) {
        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${this.escapeHtml(displayText)}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">−</span>
                    <span class="xt-translator-close" title="Đóng">×</span>
                </div>
            </div>
            <div class="xt-translator-content">
                <div class="xt-translator-main">
                    <div class="xt-main-info">
                        <h2 class="xt-word-title-text">${this.escapeHtml(displayText)}</h2>
                        <div class="xt-language-info">
                            <span class="xt-language-badge">${this.escapeHtml(result.detectedLanguage || 'tiếng Anh')} → tiếng Việt</span>
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
                        ${result.transcription ? `<div class="xt-phonetic">${this.escapeHtml(result.transcription)}</div>` : ''}
                    </div>
                    <div class="xt-translation">
                        <h3>Dịch</h3>
                        <p>${this.escapeHtml(result.translated)}</p>
                    </div>
                </div>
                <div class="xt-translator-footer">
                    <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                    <div class="xt-footer-info">Powered by AI</div>
                </div>
            </div>
        `;
    }

    /**
     * Create loading content
     * @param {string} displayText - Text being translated
     * @returns {string} HTML content
     */
    createLoadingContent(displayText) {
        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${this.escapeHtml(displayText)}</span>
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
    }

    /**
     * Create error content
     * @param {string} displayText - Text that failed to translate
     * @returns {string} HTML content
     */
    createErrorContent(displayText) {
        return `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${this.escapeHtml(displayText)}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">−</span>
                    <span class="xt-translator-close" title="Đóng">×</span>
                </div>
            </div>
            <div class="xt-translator-content">
                <div class="xt-translator-error">
                    <div class="xt-error-icon">⚠️</div>
                    <p>Không thể dịch "${this.escapeHtml(displayText)}"</p>
                    <span class="xt-error-subtitle">Định dạng phản hồi từ API không hợp lệ. Vui lòng thử lại sau.</span>
                </div>
            </div>
        `;
    }

    /**
     * Setup popup controls
     * @param {HTMLElement} popup - Popup element
     * @param {Object} result - Translation result (for copy functionality)
     */
    setupControls(popup, result = null) {
        const closeBtn = popup.querySelector(".xt-translator-close");
        const minimizeBtn = popup.querySelector(".xt-translator-minimize");
        const content = popup.querySelector(".xt-translator-content");
        let isMinimized = false;

        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                audioPlayer.stop();
                this.remove();
            });
        }

        // Minimize button
        if (minimizeBtn && content) {
            minimizeBtn.addEventListener('click', () => {
                isMinimized = !isMinimized;
                safeSetStyle(content, 'display', isMinimized ? 'none' : 'block');
                minimizeBtn.textContent = isMinimized ? '+' : '−';
                minimizeBtn.title = isMinimized ? 'Mở rộng' : 'Thu gọn';
            });
        }

        // Copy button (for text translations)
        if (result && result.translated) {
            const copyBtn = popup.querySelector(".xt-copy-btn");
            if (copyBtn) {
                const copyIcon = copyBtn.querySelector(".xt-btn-icon");
                const copyText = copyBtn.querySelector(".xt-btn-text");

                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(result.translated)
                        .then(() => {
                            copyIcon.textContent = "✅";
                            copyText.textContent = "Đã sao chép";
                            setTimeout(() => {
                                copyIcon.textContent = "📋";
                                copyText.textContent = "Copy";
                            }, 2000);
                        })
                        .catch(() => {
                            notificationManager.error("Không thể sao chép văn bản.", 4000);
                        });
                });
            }
        }

        // Audio button
        const listenBtn = popup.querySelector(".xt-listen-btn");
        if (listenBtn) {
            const text = result?.original || result?.meaning || '';
            const isSingleWord = !result?.translated;
            audioPlayer.setupAudioButton(listenBtn, text, isSingleWord);
        }
    }

    /**
     * Handle popup scroll adjustment
     * @param {HTMLElement} popup - Popup element
     */
    handleScrollAdjustment(popup) {
        if (!popup || this.isDragging) return;

        const rect = popup.getBoundingClientRect();
        const padding = CONFIG.UI.PADDING;
        let needsAdjustment = false;
        let newTop = parseInt(safeGetStyle(popup, 'top'));
        let newLeft = parseInt(safeGetStyle(popup, 'left'));

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
            safeSetStyle(popup, 'top', `${Math.max(padding, newTop)}px`);
            safeSetStyle(popup, 'left', `${Math.max(padding, newLeft)}px`);
            this.updateAudioControlsPosition(Math.max(padding, newLeft), Math.max(padding, newTop), rect.width);
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Capitalize first letter
     * @param {string} text - Text to capitalize
     * @returns {string} Capitalized text
     */
    capitalizeFirst(text) {
        if (!text || typeof text !== 'string') return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Get current popup
     * @returns {HTMLElement|null} Current popup element
     */
    getCurrentPopup() {
        return this.currentPopup;
    }

    /**
     * Check if popup exists
     * @returns {boolean} True if popup exists
     */
    hasPopup() {
        return !!this.currentPopup;
    }
}

// Create singleton instance
const popupManager = new PopupManager();

// Export for backward compatibility
export function createPopup() {
    return popupManager.create();
}

export function setupDragging(element) {
    popupManager.setupDragging(element);
}

export default popupManager; 