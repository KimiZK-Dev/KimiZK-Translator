// Utility functions for KimiZK-Translator
const Utils = {
    /**
     * Clean JSON response from API
     * @param {string} text - Raw JSON text
     * @returns {string} Cleaned JSON text
     */
    cleanJson(text) {
        return text
            .replace(/```json\n?|\n?```/g, "")
            .replace(/`+/g, "")
            .trim();
    },
    
    /**
     * Capitalize first word of text
     * @param {string} text - Input text
     * @returns {string} Text with first word capitalized
     */
    capitalizeFirstWord(text) {
        return text ? text.replace(/^\w/, c => c.toUpperCase()) : text;
    },
    
    /**
     * Escape special characters for safe HTML rendering
     * @param {string} text - Input text
     * @returns {string} Escaped text
     */
    escapeSpecialChars(text) {
        if (!text) return '';
        return text
            .replace(/[\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },
    
    /**
     * Detect language from text using character patterns
     * @param {string} text - Text to analyze
     * @returns {string} Detected language name in Vietnamese
     */
    detectLanguage(text) {
        if (!text || !CONFIG) return 'tiếng Anh';
        
        for (const [lang, pattern] of Object.entries(CONFIG.LANGUAGES)) {
            if (pattern.test(text)) {
                return CONFIG.LANGUAGE_NAMES[lang] || 'tiếng Anh';
            }
        }
        
        return 'tiếng Anh';
    },
    
    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    /**
     * Debounce function to limit execution frequency
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function to limit execution frequency
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Check if element is visible in viewport
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is visible
     */
    isElementInViewport(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * Deep clone object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },
    
    /**
     * Validate API key format
     * @param {string} key - API key to validate
     * @returns {boolean} True if valid
     */
    validateApiKey(key) {
        return key && key.length >= 20 && /^gsk_[a-zA-Z0-9]{32,}$/.test(key);
    },
    
    /**
     * Safe JSON parse with error handling
     * @param {string} text - JSON text to parse
     * @returns {object|null} Parsed object or null
     */
    safeJsonParse(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        
        try {
            // First try: direct parse
            return JSON.parse(text);
        } catch (error) {
            console.error('JSON parse error:', error);
            
            try {
                // Second try: clean and parse
                const cleaned = text
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                
                return JSON.parse(cleaned);
            } catch (error2) {
                console.error('JSON parse error after cleaning:', error2);
                
                try {
                    // Third try: extract JSON from text
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        return JSON.parse(jsonMatch[0]);
                    }
                } catch (error3) {
                    console.error('JSON parse error after extraction:', error3);
                }
                
                return null;
            }
        }
    },
    
    /**
     * Check if browser supports required features
     * @returns {object} Support status object
     */
    checkBrowserSupport() {
        return {
            fetch: typeof fetch !== 'undefined',
            audio: typeof Audio !== 'undefined',
            clipboard: navigator.clipboard && navigator.clipboard.writeText,
            storage: typeof chrome !== 'undefined' && chrome.storage,
            notifications: typeof chrome !== 'undefined' && chrome.notifications
        };
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.Utils = Utils;
} 