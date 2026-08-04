// Notification management module for KimiZK-Translator
const NotificationManager = {
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds
     */
    show(message, type = 'info', duration = 5000) {
        const notification = this._createNotification(message, type, duration);
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0) scale(1)';
        });
        
        // Start countdown timer
        this._startCountdown(notification, duration);
        
        return notification;
    },
    
    /**
     * Show audio error notification
     * @param {string} message - Error message
     */
    showAudioError(message) {
        const notification = this._createNotification(message, 'audio-error', 6000);
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0) scale(1)';
        });
        
        // Start countdown timer
        this._startCountdown(notification, 6000);
        
        return notification;
    },
    
    /**
     * Create notification element
     * @private
     */
    _createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `xt-notification xt-notification-${type}`;
        
        const icon = this._getNotificationIcon(type);
        const title = this._getNotificationTitle(type);
        const seconds = Math.ceil(duration / 1000);
        
        notification.innerHTML = `
            <div class="xt-notification-header">
                <div class="xt-notification-title">
                    <span class="xt-notification-icon">${icon}</span>
                    <span>${title}</span>
                </div>
                <button class="xt-notification-close" title="Đóng">×</button>
            </div>
            <div class="xt-notification-body">
                <div class="xt-notification-message">${message}</div>
            </div>
            <div class="xt-notification-footer">
                <div class="xt-notification-timer">
                    <div class="xt-timer-text">Tự động đóng sau:</div>
                    <div class="xt-timer-count">${seconds}s</div>
                </div>
            </div>
        `;
        
        // Position notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '2147483647',
            opacity: '0',
            transform: 'translateY(-20px) scale(0.95)',
            transition: 'all 300ms cubic-bezier(0.25, 0.8, 0.25, 1)'
        });
        
        // Setup close button
        const closeBtn = notification.querySelector('.xt-notification-close');
        closeBtn.addEventListener('click', () => {
            this._removeNotification(notification);
        });
        
        return notification;
    },
    
    /**
     * Start countdown timer for notification
     * @private
     */
    _startCountdown(notification, duration) {
        const timerElement = notification.querySelector('.xt-timer-count');
        if (!timerElement) return;
        
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const seconds = Math.ceil(remaining / 1000);
            
            if (timerElement) {
                timerElement.textContent = `${seconds}s`;
            }
            
            if (remaining > 0) {
                requestAnimationFrame(updateTimer);
            } else {
                this._removeNotification(notification);
            }
        };
        
        // Start the countdown
        requestAnimationFrame(updateTimer);
    },
    
    /**
     * Remove notification with animation
     * @private
     */
    _removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px) scale(0.95)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    },
    
    /**
     * Get notification icon based on type
     * @private
     */
    _getNotificationIcon(type) {
        const icons = {
            success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
            error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
            warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
            'audio-error': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
        };
        return icons[type] || icons.info;
    },
    
    /**
     * Get notification title based on type
     * @private
     */
    _getNotificationTitle(type) {
        const titles = {
            success: 'Thành công',
            error: 'Lỗi',
            warning: 'Cảnh báo',
            info: 'Thông tin',
            'audio-error': 'Lỗi âm thanh'
        };
        return titles[type] || titles.info;
    },
    
    /**
     * Show Chrome notification (for background script)
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    showChromeNotification(title, message) {
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
                title: title,
                message: message
            }, (notificationId) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome notification failed:', chrome.runtime.lastError);
                    // Fallback: create without icon
                    chrome.notifications.create({
                        type: 'basic',
                        title: title,
                        message: message
                    });
                }
            });
        } catch (error) {
            console.error('Error creating Chrome notification:', error);
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
} 