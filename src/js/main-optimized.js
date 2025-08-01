/**
 * Main Application Module - Optimized Version
 * Handles the main translation workflow and user interactions
 */

import { CONFIG } from './core/config.js';
import { isSingleWord, capitalizeFirstWord, log, debounce, throttle } from './core/utils.js';
import apiService from './services/api.js';
import notificationManager from './ui/notification.js';
import popupManager from './ui/popup.js';
import triggerManager from './ui/trigger.js';
import apiKeyPromptManager from './ui/api-key-prompt.js';

class TranslationApp {
    constructor() {
        this.isInitialized = false;
        this.selectionHandler = null;
        this.clickHandler = null;
        this.scrollHandler = null;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize services
            await apiService.initialize();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            this.isInitialized = true;
            log('Translation app initialized successfully', 'info');
            
        } catch (error) {
            log(`Failed to initialize app: ${error.message}`, 'error');
        }
    }

    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        // Selection handler with debouncing
        this.selectionHandler = debounce(this.handleTextSelection.bind(this), 150);
        document.addEventListener("mouseup", this.selectionHandler);

        // Click handler for closing popups
        this.clickHandler = this.handleDocumentClick.bind(this);
        document.addEventListener('click', this.clickHandler);

        // Scroll handler with throttling
        this.scrollHandler = throttle(this.handleScroll.bind(this), 100);
        document.addEventListener('scroll', this.scrollHandler);

        log('Event handlers setup completed', 'info');
    }

    /**
     * Handle text selection
     * @param {MouseEvent} e - Mouse event
     */
    handleTextSelection(e) {
        try {
            const selected = window.getSelection().toString().trim();
            
            // Early return conditions
            if (!selected) return;
            if (e.target.closest('.xt-translator-popup')) return;
            if (e.target.closest('.xt-audio-controls')) return;
            if (e.target.closest('.xt-trigger-icon')) return;

            // Remove existing trigger
            triggerManager.remove();

            // Get selection rectangle
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
            
            // Create trigger icon
            const triggerIcon = triggerManager.create(selectionRect);
            
            // Setup trigger click handler
            triggerIcon.addEventListener('click', async () => {
                await this.handleTranslation(selected, selectionRect);
            });

        } catch (error) {
            log(`Error in text selection handler: ${error.message}`, 'error');
        }
    }

    /**
     * Handle translation process
     * @param {string} selectedText - Selected text to translate
     * @param {DOMRect} selectionRect - Selection rectangle
     */
    async handleTranslation(selectedText, selectionRect) {
        try {
            // Remove trigger icon
            triggerManager.remove();

            // Check if API key is available
            if (!apiService.hasValidApiKey()) {
                apiKeyPromptManager.show();
                return;
            }

            // Determine if it's a single word
            const singleWord = isSingleWord(selectedText);
            const displayText = capitalizeFirstWord(selectedText);

            // Create and setup popup
            const popup = popupManager.create();
            popup.innerHTML = popupManager.createLoadingContent(displayText);
            popupManager.setupDragging(popup);
            popupManager.positionPopup(selectionRect, popup);

            // Perform translation
            const result = await apiService.translate(selectedText, singleWord);
            
            if (!result) {
                popup.innerHTML = popupManager.createErrorContent(displayText);
                popupManager.setupControls(popup);
                return;
            }

            // Update popup content based on translation type
            if (singleWord) {
                popup.innerHTML = popupManager.createSingleWordContent(displayText, result);
            } else {
                popup.innerHTML = popupManager.createTextContent(displayText, result);
            }

            // Setup popup controls
            popupManager.setupControls(popup, result);

            log(`Translation completed for: ${displayText}`, 'info');

        } catch (error) {
            log(`Translation failed: ${error.message}`, 'error');
            notificationManager.error('Có lỗi xảy ra khi dịch. Vui lòng thử lại.');
        }
    }

    /**
     * Handle document click events
     * @param {MouseEvent} e - Click event
     */
    handleDocumentClick(e) {
        try {
            const popup = popupManager.getCurrentPopup();
            const trigger = triggerManager.getCurrentTrigger();
            
            // Close popup if clicking outside
            if (popup && 
                !popup.contains(e.target) && 
                !e.target.closest('.xt-audio-controls') && 
                !e.target.closest('.xt-trigger-icon') && 
                !window.getSelection().toString().trim()) {
                
                popupManager.remove();
                triggerManager.remove();
            }

            // Remove trigger if clicking outside
            if (trigger && 
                !trigger.contains(e.target) && 
                !e.target.closest('.xt-trigger-icon') && 
                !triggerManager.wasJustCreated() && 
                e.button === 0) {
                
                triggerManager.remove();
            }

        } catch (error) {
            log(`Error in click handler: ${error.message}`, 'error');
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        try {
            const popup = popupManager.getCurrentPopup();
            if (popup) {
                popupManager.handleScrollAdjustment(popup);
            }
        } catch (error) {
            log(`Error in scroll handler: ${error.message}`, 'error');
        }
    }

    /**
     * Cleanup and destroy the application
     */
    destroy() {
        // Remove event listeners
        if (this.selectionHandler) {
            document.removeEventListener("mouseup", this.selectionHandler);
        }
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
        }
        if (this.scrollHandler) {
            document.removeEventListener('scroll', this.scrollHandler);
        }

        // Cleanup UI elements
        popupManager.remove();
        triggerManager.remove();
        apiKeyPromptManager.remove();
        notificationManager.closeAll();

        this.isInitialized = false;
        log('Translation app destroyed', 'info');
    }

    /**
     * Get application status
     * @returns {Object} Application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasApiKey: apiService.hasValidApiKey(),
            hasPopup: popupManager.hasPopup(),
            hasTrigger: triggerManager.hasTrigger(),
            notificationCount: notificationManager.getActiveCount()
        };
    }
}

// Create singleton instance
const translationApp = new TranslationApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        translationApp.initialize();
    });
} else {
    translationApp.initialize();
}

// Export for debugging and testing
window.translationApp = translationApp;

export default translationApp; 