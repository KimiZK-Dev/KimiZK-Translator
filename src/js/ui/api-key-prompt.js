/**
 * API Key Prompt Module
 * Handles API key input and validation
 */

import { CONFIG } from '../core/config.js';
import { validateApiKey, safeRemoveElement, log } from '../core/utils.js';
import apiService from '../services/api.js';
import notificationManager from './notification.js';

class ApiKeyPromptManager {
    constructor() {
        this.currentOverlay = null;
    }

    /**
     * Show API key prompt
     */
    show() {
        this.remove();
        
        const overlay = this.createOverlay();
        const box = this.createPromptBox();
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        this.currentOverlay = overlay;
        
        this.setupEventListeners(box);
        
        log('API key prompt shown', 'info');
    }

    /**
     * Create overlay element
     * @returns {HTMLElement} Overlay element
     */
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'xt-apikey-overlay';
        overlay.id = 'xt-apikey-overlay';
        return overlay;
    }

    /**
     * Create prompt box element
     * @returns {HTMLElement} Prompt box element
     */
    createPromptBox() {
        const box = document.createElement('div');
        box.className = 'xt-apikey-box';
        box.innerHTML = `
            <button class="xt-apikey-close" id="xt-apikey-close">×</button>
            <div class="xt-apikey-title">
                <span>🔑</span> Nhập API KEY để sử dụng dịch
            </div>
            <div class="xt-apikey-desc">
                Bạn cần nhập API KEY để sử dụng tiện ích. API KEY sẽ được lưu bảo mật trên máy bạn.<br><br>
                Liên hệ <a href='https://www.facebook.com/nhb.xyz' target='_blank'>Facebook</a> để được hướng dẫn lấy API KEY.
            </div>
            <input id="xt-apikey-input" type="password" class="xt-apikey-input" placeholder="Nhập API KEY tại đây..." />
            <button id="xt-apikey-save" class="xt-apikey-save">Lưu & sử dụng</button>
            <div id="xt-apikey-error" class="xt-apikey-error"></div>
        `;
        return box;
    }

    /**
     * Setup event listeners for the prompt
     * @param {HTMLElement} box - Prompt box element
     */
    setupEventListeners(box) {
        const overlay = this.currentOverlay;
        const input = box.querySelector('#xt-apikey-input');
        const saveBtn = box.querySelector('#xt-apikey-save');
        const errorDiv = box.querySelector('#xt-apikey-error');
        const closeBtn = box.querySelector('#xt-apikey-close');

        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.remove();
            }
        });

        // Close button
        closeBtn.addEventListener('click', () => {
            this.remove();
        });

        // Real-time validation
        input.addEventListener('input', () => {
            this.validateInput(input, saveBtn, errorDiv);
        });

        // Save button
        saveBtn.addEventListener('click', () => {
            this.handleSave(input, saveBtn, errorDiv);
        });

        // Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !saveBtn.disabled) {
                this.handleSave(input, saveBtn, errorDiv);
            }
        });

        // Focus input
        setTimeout(() => {
            input.focus();
        }, 100);
    }

    /**
     * Validate API key input
     * @param {HTMLInputElement} input - Input element
     * @param {HTMLButtonElement} saveBtn - Save button
     * @param {HTMLElement} errorDiv - Error display element
     */
    validateInput(input, saveBtn, errorDiv) {
        const key = input.value.trim();
        
        if (key.length === 0) {
            this.hideError(errorDiv);
            saveBtn.disabled = true;
        } else if (key.length < CONFIG.CONSTANTS.MIN_API_KEY_LENGTH) {
            this.showError(errorDiv, CONFIG.ERRORS.API_KEY_TOO_SHORT);
            saveBtn.disabled = true;
        } else if (!validateApiKey(key)) {
            this.showError(errorDiv, CONFIG.ERRORS.API_KEY_FORMAT);
            saveBtn.disabled = true;
        } else {
            this.hideError(errorDiv);
            saveBtn.disabled = false;
        }
    }

    /**
     * Handle save button click
     * @param {HTMLInputElement} input - Input element
     * @param {HTMLButtonElement} saveBtn - Save button
     * @param {HTMLElement} errorDiv - Error display element
     */
    async handleSave(input, saveBtn, errorDiv) {
        const key = input.value.trim();
        
        if (!key || key.length < CONFIG.CONSTANTS.MIN_API_KEY_LENGTH || !validateApiKey(key)) {
            this.showError(errorDiv, CONFIG.ERRORS.API_KEY_REQUIRED);
            return;
        }

        // Show loading state
        saveBtn.disabled = true;
        saveBtn.textContent = 'Đang lưu...';

        try {
            await apiService.setApiKey(key);
            this.remove();
            notificationManager.success(CONFIG.SUCCESS.API_KEY_SAVED);
            log('API key saved successfully', 'info');
        } catch (error) {
            this.showError(errorDiv, 'Lỗi khi lưu API Key!');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu & sử dụng';
            log(`Failed to save API key: ${error.message}`, 'error');
        }
    }

    /**
     * Show error message
     * @param {HTMLElement} errorDiv - Error display element
     * @param {string} message - Error message
     */
    showError(errorDiv, message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    /**
     * Hide error message
     * @param {HTMLElement} errorDiv - Error display element
     */
    hideError(errorDiv) {
        errorDiv.style.display = 'none';
    }

    /**
     * Remove current prompt
     */
    remove() {
        if (this.currentOverlay) {
            safeRemoveElement(this.currentOverlay);
            this.currentOverlay = null;
            log('API key prompt removed', 'info');
        }
    }

    /**
     * Check if prompt is currently shown
     * @returns {boolean} True if prompt is shown
     */
    isShown() {
        return !!this.currentOverlay;
    }
}

// Create singleton instance
const apiKeyPromptManager = new ApiKeyPromptManager();

// Export for backward compatibility
export function showApiKeyPrompt() {
    apiKeyPromptManager.show();
}

export default apiKeyPromptManager; 