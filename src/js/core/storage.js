// Storage management module for KimiZK-Translator
const StorageManager = {
    // Cache for API key to avoid repeated storage calls
    _apiKeyCache: null,
    
    /**
     * Get API key from storage
     * @returns {Promise<string|null>}
     */
    async getApiKey() {
        if (this._apiKeyCache !== null) {
            return this._apiKeyCache;
        }
        
        return new Promise(resolve => {
            chrome.storage.local.get(['API_KEY'], result => {
                this._apiKeyCache = result.API_KEY || null;
                resolve(this._apiKeyCache);
            });
        });
    },
    
    /**
     * Save API key to storage
     * @param {string} key - API key to save
     * @returns {Promise<boolean>}
     */
    async saveApiKey(key) {
        return new Promise(resolve => {
            chrome.storage.local.set({ API_KEY: key }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving API key:', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    this._apiKeyCache = key;
                    resolve(true);
                }
            });
        });
    },
    
    /**
     * Clear API key cache
     */
    clearApiKeyCache() {
        this._apiKeyCache = null;
    },
    
    /**
     * Get update notification settings
     * @returns {Promise<boolean>}
     */
    async getUpdateNotifications() {
        return new Promise(resolve => {
            chrome.storage.local.get(['updateNotifications'], result => {
                resolve(result.updateNotifications !== false); // Default to true
            });
        });
    },
    
    /**
     * Set update notification settings
     * @param {boolean} enabled - Whether to enable notifications
     * @returns {Promise<boolean>}
     */
    async setUpdateNotifications(enabled) {
        return new Promise(resolve => {
            chrome.storage.local.set({ updateNotifications: enabled }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get last update check time
     * @returns {Promise<number>}
     */
    async getLastUpdateCheck() {
        return new Promise(resolve => {
            chrome.storage.local.get(['lastUpdateCheck'], result => {
                resolve(result.lastUpdateCheck || 0);
            });
        });
    },
    
    /**
     * Set last update check time
     * @param {number} timestamp - Current timestamp
     * @returns {Promise<boolean>}
     */
    async setLastUpdateCheck(timestamp) {
        return new Promise(resolve => {
            chrome.storage.local.set({ lastUpdateCheck: timestamp }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get current version from storage
     * @returns {Promise<string>}
     */
    async getCurrentVersion() {
        return new Promise(resolve => {
            chrome.storage.local.get(['currentVersion'], result => {
                resolve(result.currentVersion || chrome.runtime.getManifest().version);
            });
        });
    },
    
    /**
     * Set current version in storage
     * @param {string} version - Version to save
     * @returns {Promise<boolean>}
     */
    async setCurrentVersion(version) {
        return new Promise(resolve => {
            chrome.storage.local.set({ currentVersion: version }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get installation time
     * @returns {Promise<number>}
     */
    async getInstallTime() {
        return new Promise(resolve => {
            chrome.storage.local.get(['installTime'], result => {
                resolve(result.installTime || Date.now());
            });
        });
    },
    
    /**
     * Set installation time
     * @param {number} timestamp - Installation timestamp
     * @returns {Promise<boolean>}
     */
    async setInstallTime(timestamp) {
        return new Promise(resolve => {
            chrome.storage.local.set({ installTime: timestamp }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get last update time
     * @returns {Promise<number>}
     */
    async getLastUpdateTime() {
        return new Promise(resolve => {
            chrome.storage.local.get(['lastUpdateTime'], result => {
                resolve(result.lastUpdateTime || 0);
            });
        });
    },
    
    /**
     * Set last update time
     * @param {number} timestamp - Update timestamp
     * @returns {Promise<boolean>}
     */
    async setLastUpdateTime(timestamp) {
        return new Promise(resolve => {
            chrome.storage.local.set({ lastUpdateTime: timestamp }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get target language for translation
     * @returns {Promise<string>}
     */
    async getTargetLanguage() {
        return new Promise(resolve => {
            chrome.storage.local.get(['targetLanguage'], result => {
                resolve(result.targetLanguage || 'Vietnamese');
            });
        });
    },
    
    /**
     * Set target language for translation
     * @param {string} language - Target language
     * @returns {Promise<boolean>}
     */
    async setTargetLanguage(language) {
        return new Promise(resolve => {
            chrome.storage.local.set({ targetLanguage: language }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Get language preferences
     * @returns {Promise<object>}
     */
    async getLanguagePreferences() {
        return new Promise(resolve => {
            chrome.storage.local.get(['languagePreferences'], result => {
                resolve(result.languagePreferences || {
                    recentLanguages: ['Vietnamese', 'English', 'Japanese', 'Korean', 'Chinese'],
                    favoriteLanguages: ['Vietnamese', 'English']
                });
            });
        });
    },
    
    /**
     * Set language preferences
     * @param {object} preferences - Language preferences
     * @returns {Promise<boolean>}
     */
    async setLanguagePreferences(preferences) {
        return new Promise(resolve => {
            chrome.storage.local.set({ languagePreferences: preferences }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },
    
    /**
     * Add recent language
     * @param {string} language - Language to add
     * @returns {Promise<boolean>}
     */
    async addRecentLanguage(language) {
        const preferences = await this.getLanguagePreferences();
        const recentLanguages = preferences.recentLanguages || [];
        
        // Remove if already exists
        const filtered = recentLanguages.filter(lang => lang !== language);
        // Add to beginning
        filtered.unshift(language);
        // Keep only top 10
        const updated = filtered.slice(0, 10);
        
        preferences.recentLanguages = updated;
        return this.setLanguagePreferences(preferences);
    },
    
    /**
     * Clear all storage data
     * @returns {Promise<boolean>}
     */
    async clearAll() {
        return new Promise(resolve => {
            chrome.storage.local.clear(() => {
                this._apiKeyCache = null;
                resolve(!chrome.runtime.lastError);
            });
        });
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
} 