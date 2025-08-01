/**
 * Notification UI Module
 * Handles all notification displays and interactions
 */

import { CONFIG } from '../core/config.js';
import { safeRemoveElement, safeSetStyle, log } from '../core/utils.js';

class NotificationManager {
    constructor() {
        this.activeNotifications = new Map();
        this.notificationCounter = 0;
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info, audio-error)
     * @param {number} duration - Duration in milliseconds
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    show(message, type = "info", duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION, options = {}) {
        const notificationId = `notification_${++this.notificationCounter}`;
        
        try {
            const notification = this.createNotificationElement(message, type, notificationId);
            this.setupNotificationPosition(notification, options);
            this.setupNotificationEvents(notification, notificationId, duration);
            
            document.body.appendChild(notification);
            this.activeNotifications.set(notificationId, notification);
            
            // Animate in
            requestAnimationFrame(() => {
                safeSetStyle(notification, 'opacity', '1');
                safeSetStyle(notification, 'transform', 'translateY(0) scale(1)');
            });
            
            log(`Notification shown: ${type} - ${message}`, 'info');
            return notificationId;
            
        } catch (error) {
            log(`Failed to show notification: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Create notification element
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {string} id - Notification ID
     * @returns {HTMLElement} Notification element
     */
    createNotificationElement(message, type, id) {
        const { icon, title } = this.getNotificationConfig(type);
        const timeLeft = Math.ceil(duration / 1000);
        
        const notification = document.createElement("div");
        notification.className = `xt-notification xt-notification-${type}`;
        notification.id = id;
        
        notification.innerHTML = `
            <div class="xt-notification-header">
                <div class="xt-notification-title">
                    ${icon}
                    <span>${title}</span>
                </div>
                <span class="xt-notification-close" title="Đóng">×</span>
            </div>
            <div class="xt-notification-body">
                <span class="xt-notification-message">${this.escapeHtml(message)}</span>
            </div>
            <div class="xt-notification-footer">
                <div class="xt-notification-timer">
                    <span class="xt-timer-text">Tự đóng sau: </span>
                    <span class="xt-timer-count">${timeLeft}s</span>
                </div>
            </div>
        `;
        
        // Set initial styles
        safeSetStyle(notification, 'opacity', '0');
        safeSetStyle(notification, 'transform', 'translateY(-10px) scale(0.95)');
        safeSetStyle(notification, 'transition', 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)');
        
        return notification;
    }

    /**
     * Get notification configuration
     * @param {string} type - Notification type
     * @returns {Object} Configuration object
     */
    getNotificationConfig(type) {
        const configs = {
            success: {
                icon: "<span class='xt-notification-icon'>✅</span>",
                title: "Thành công"
            },
            error: {
                icon: "<span class='xt-notification-icon'>❌</span>",
                title: "Lỗi"
            },
            warning: {
                icon: "<span class='xt-notification-icon'>⚠️</span>",
                title: "Cảnh báo"
            },
            "audio-error": {
                icon: "<span class='xt-notification-icon'>🔇</span>",
                title: "Lỗi âm thanh"
            },
            info: {
                icon: "<span class='xt-notification-icon'>ℹ️</span>",
                title: "Thông báo"
            }
        };
        
        return configs[type] || configs.info;
    }

    /**
     * Set notification position
     * @param {HTMLElement} notification - Notification element
     * @param {Object} options - Position options
     */
    setupNotificationPosition(notification, options = {}) {
        const { position = 'auto', offsetX = 20, offsetY = 0 } = options;
        
        // Get popup position for reference
        const popup = document.querySelector('.xt-translator-popup');
        const popupRect = popup?.getBoundingClientRect();
        
        let left, top;
        
        if (position === 'auto' && popupRect) {
            left = popupRect.right + offsetX;
            top = popupRect.top + offsetY;
        } else {
            left = window.innerWidth - CONFIG.UI.NOTIFICATION_WIDTH - offsetX;
            top = offsetY;
        }
        
        // Ensure notification stays within viewport
        left = Math.max(CONFIG.UI.PADDING, Math.min(left, window.innerWidth - CONFIG.UI.NOTIFICATION_WIDTH - CONFIG.UI.PADDING));
        top = Math.max(CONFIG.UI.PADDING, Math.min(top, window.innerHeight - 100 - CONFIG.UI.PADDING));
        
        safeSetStyle(notification, 'position', 'fixed');
        safeSetStyle(notification, 'zIndex', CONFIG.UI.Z_INDEX.NOTIFICATION.toString());
        safeSetStyle(notification, 'left', `${left}px`);
        safeSetStyle(notification, 'top', `${top}px`);
    }

    /**
     * Setup notification events
     * @param {HTMLElement} notification - Notification element
     * @param {string} notificationId - Notification ID
     * @param {number} duration - Duration in milliseconds
     */
    setupNotificationEvents(notification, notificationId, duration) {
        let timeRemaining = Math.ceil(duration / 1000);
        const timerElement = notification.querySelector('.xt-timer-count');
        let timerInterval;
        let closeTimeout;
        
        // Timer countdown
        if (timerElement && duration > 0) {
            timerInterval = setInterval(() => {
                timeRemaining--;
                if (timerElement) {
                    timerElement.textContent = `${timeRemaining}s`;
                }
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                }
            }, 1000);
        }
        
        // Close button
        const closeBtn = notification.querySelector(".xt-notification-close");
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close(notificationId);
            });
        }
        
        // Auto close
        if (duration > 0) {
            closeTimeout = setTimeout(() => {
                this.close(notificationId);
            }, duration);
        }
        
        // Store cleanup functions
        this.activeNotifications.set(notificationId, {
            element: notification,
            timerInterval,
            closeTimeout
        });
    }

    /**
     * Close notification
     * @param {string} notificationId - Notification ID
     */
    close(notificationId) {
        const notificationData = this.activeNotifications.get(notificationId);
        if (!notificationData) return;
        
        const { element, timerInterval, closeTimeout } = notificationData;
        
        // Clear timers
        if (timerInterval) clearInterval(timerInterval);
        if (closeTimeout) clearTimeout(closeTimeout);
        
        // Animate out
        safeSetStyle(element, 'opacity', '0');
        safeSetStyle(element, 'transform', 'translateY(-10px) scale(0.95)');
        
        // Remove after animation
        setTimeout(() => {
            safeRemoveElement(element);
            this.activeNotifications.delete(notificationId);
        }, CONFIG.UI.ANIMATION_DURATION);
        
        log(`Notification closed: ${notificationId}`, 'info');
    }

    /**
     * Close all notifications
     */
    closeAll() {
        for (const [notificationId] of this.activeNotifications) {
            this.close(notificationId);
        }
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    success(message, duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    error(message, duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    warning(message, duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    info(message, duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
        return this.show(message, 'info', duration);
    }

    /**
     * Show audio error notification
     * @param {string} errorMessage - Audio error message
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    audioError(errorMessage, duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
        const userFriendlyMessage = this.getAudioErrorMessage(errorMessage);
        return this.show(userFriendlyMessage, 'audio-error', duration);
    }

    /**
     * Get user-friendly audio error message
     * @param {string} errorMessage - Raw error message
     * @returns {string} User-friendly message
     */
    getAudioErrorMessage(errorMessage) {
        if (!errorMessage) return "Không thể phát âm thanh.";
        
        const errorLower = errorMessage.toLowerCase();
        
        if (errorLower.includes("content security policy") || errorLower.includes("blob:")) {
            return "Website này không cho phép phát âm thanh do chính sách bảo mật.";
        }
        
        if (errorLower.includes("failed to load") || errorLower.includes("no supported source")) {
            return "Trang hiện tại không hỗ trợ phát âm thanh vì chính sách bảo mật của họ.";
        }
        
        if (errorLower.includes("rate_limit_exceeded")) {
            return "Hết lượt sử dụng phát âm hôm nay.";
        }
        
        if (errorLower.includes("network") || errorLower.includes("fetch")) {
            return "Lỗi kết nối mạng.";
        }
        
        return "Không thể phát âm thanh.";
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
     * Get active notification count
     * @returns {number} Number of active notifications
     */
    getActiveCount() {
        return this.activeNotifications.size;
    }

    /**
     * Check if notification exists
     * @param {string} notificationId - Notification ID
     * @returns {boolean} True if exists
     */
    exists(notificationId) {
        return this.activeNotifications.has(notificationId);
    }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// Export for backward compatibility
export function showNotification(message, type = "info", duration = CONFIG.CONSTANTS.DEFAULT_NOTIFICATION_DURATION) {
    return notificationManager.show(message, type, duration);
}

export function showAudioErrorNotification(errorMessage) {
    return notificationManager.audioError(errorMessage);
}

export default notificationManager; 