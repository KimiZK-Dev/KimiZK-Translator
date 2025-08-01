/**
 * Trigger Icon Module
 * Handles translation trigger icon creation and management
 */

import { CONFIG } from '../core/config.js';
import { safeRemoveElement, safeSetStyle, log } from '../core/utils.js';

class TriggerManager {
    constructor() {
        this.currentTrigger = null;
        this.justCreated = false;
    }

    /**
     * Create trigger icon
     * @param {DOMRect} selectionRect - Selection rectangle
     * @returns {HTMLElement} Trigger icon element
     */
    create(selectionRect) {
        this.remove();
        
        const triggerIcon = document.createElement("div");
        triggerIcon.className = "xt-trigger-icon";
        triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('src/icons/icon16.png')}" alt="Translate">`;
        
        // Position the trigger icon
        this.positionTrigger(triggerIcon, selectionRect);
        
        document.body.appendChild(triggerIcon);
        this.currentTrigger = triggerIcon;
        this.justCreated = true;
        
        // Reset justCreated flag after a short delay
        setTimeout(() => {
            this.justCreated = false;
        }, 200);
        
        log('Trigger icon created', 'info');
        return triggerIcon;
    }

    /**
     * Position trigger icon relative to selection
     * @param {HTMLElement} triggerIcon - Trigger icon element
     * @param {DOMRect} selectionRect - Selection rectangle
     */
    positionTrigger(triggerIcon, selectionRect) {
        const padding = 10;
        const iconSize = CONFIG.UI.TRIGGER_ICON_SIZE;
        
        let left = selectionRect.left;
        let top = selectionRect.bottom + padding;
        
        // Ensure icon stays within viewport
        left = Math.max(CONFIG.UI.PADDING, Math.min(left, window.innerWidth - iconSize - CONFIG.UI.PADDING));
        top = Math.max(CONFIG.UI.PADDING, Math.min(top, window.innerHeight - iconSize - CONFIG.UI.PADDING));
        
        safeSetStyle(triggerIcon, 'position', 'fixed');
        safeSetStyle(triggerIcon, 'zIndex', CONFIG.UI.Z_INDEX.POPUP.toString());
        safeSetStyle(triggerIcon, 'left', `${left}px`);
        safeSetStyle(triggerIcon, 'top', `${top}px`);
    }

    /**
     * Remove current trigger icon
     */
    remove() {
        if (this.currentTrigger) {
            safeRemoveElement(this.currentTrigger);
            this.currentTrigger = null;
            log('Trigger icon removed', 'info');
        }
    }

    /**
     * Check if trigger was just created
     * @returns {boolean} True if just created
     */
    wasJustCreated() {
        return this.justCreated;
    }

    /**
     * Get current trigger icon
     * @returns {HTMLElement|null} Current trigger icon
     */
    getCurrentTrigger() {
        return this.currentTrigger;
    }

    /**
     * Check if trigger exists
     * @returns {boolean} True if trigger exists
     */
    hasTrigger() {
        return !!this.currentTrigger;
    }

    /**
     * Update trigger position based on scroll
     * @param {DOMRect} selectionRect - Updated selection rectangle
     */
    updatePosition(selectionRect) {
        if (this.currentTrigger) {
            this.positionTrigger(this.currentTrigger, selectionRect);
        }
    }
}

// Create singleton instance
const triggerManager = new TriggerManager();

// Export for backward compatibility
export function createTriggerIcon(selectionRect) {
    return triggerManager.create(selectionRect);
}

export default triggerManager; 