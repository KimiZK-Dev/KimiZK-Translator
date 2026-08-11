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
     * Get preferred translation mode / domain style (auto, tech, academic, business, casual)
     * @returns {Promise<string>}
     */
    async getTranslationMode() {
        return new Promise(resolve => {
            chrome.storage.local.get(['TRANSLATION_MODE'], result => {
                resolve(result.TRANSLATION_MODE || 'auto');
            });
        });
    },

    /**
     * Set preferred translation mode / domain style
     * @param {string} mode
     * @returns {Promise<boolean>}
     */
    async setTranslationMode(mode) {
        return new Promise(resolve => {
            chrome.storage.local.set({ TRANSLATION_MODE: mode || 'auto' }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },

    /**
     * Get all Puter Auth Tokens as an array
     * @returns {Promise<string[]>}
     */
    async getPuterTokens() {
        return new Promise(resolve => {
            chrome.storage.local.get(['PUTER_TOKENS', 'PUTER_TOKEN'], result => {
                if (Array.isArray(result.PUTER_TOKENS) && result.PUTER_TOKENS.length > 0) {
                    resolve(result.PUTER_TOKENS.map(t => String(t).trim()).filter(Boolean));
                } else if (result.PUTER_TOKEN) {
                    const tokens = String(result.PUTER_TOKEN)
                        .split(/[\n,]+/)
                        .map(t => t.trim())
                        .filter(Boolean);
                    resolve(tokens);
                } else {
                    resolve([]);
                }
            });
        });
    },

    /**
     * Get primary or auto-rotated Puter Auth Token from storage
     * @returns {Promise<string|null>}
     */
    async getPuterToken() {
        const tokens = await this.getPuterTokens();
        if (!tokens || tokens.length === 0) return null;
        this._puterTokenIndex = ((this._puterTokenIndex || 0) + 1) % tokens.length;
        return tokens[this._puterTokenIndex] || tokens[0];
    },

    /**
     * Save Puter Auth Tokens to storage
     * @param {string|string[]} tokens 
     * @returns {Promise<boolean>}
     */
    async setPuterTokens(tokens) {
        let tokenArray = [];
        if (Array.isArray(tokens)) {
            tokenArray = tokens.map(t => String(t).trim()).filter(Boolean);
        } else if (typeof tokens === 'string') {
            tokenArray = tokens.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
        }
        
        return new Promise(resolve => {
            chrome.storage.local.set({ 
                PUTER_TOKENS: tokenArray,
                PUTER_TOKEN: tokenArray.join('\n')
            }, () => resolve(true));
        });
    },

    /**
     * Backward-compatible Puter Auth Token setter
     * @param {string|string[]} token 
     * @returns {Promise<boolean>}
     */
    async setPuterToken(token) {
        if (typeof token === 'string' && (token.includes('\n') || token.includes(','))) {
            return this.setPuterTokens(token);
        }
        const existing = await this.getPuterTokens();
        if (existing.length > 1 && typeof token === 'string') {
            return new Promise(resolve => {
                chrome.storage.local.set({ PREFERRED_PUTER_TOKEN: token.trim() }, () => resolve(true));
            });
        }
        return this.setPuterTokens(token);
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
     * Save target language alias for backward compatibility
     * @param {string} language - Target language
     * @returns {Promise<boolean>}
     */
    async saveTargetLanguage(language) {
        return this.setTargetLanguage(language);
    },

    /**
     * Get TTS Voice setting for Original Text
     * @returns {Promise<string>}
     */
    async getTtsVoiceOrig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['ttsVoiceOrig'], result => {
                resolve(result.ttsVoiceOrig || 'en-US-JennyNeural');
            });
        });
    },

    /**
     * Set TTS Voice setting for Original Text
     * @param {string} voice 
     * @returns {Promise<boolean>}
     */
    async setTtsVoiceOrig(voice) {
        return new Promise(resolve => {
            chrome.storage.local.set({ ttsVoiceOrig: voice }, () => resolve(!chrome.runtime.lastError));
        });
    },

    /**
     * Get TTS Model setting for Original Text
     * @returns {Promise<string>}
     */
    async getTtsModelOrig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['ttsModelOrig', 'ttsModel'], result => {
                resolve(result.ttsModelOrig || 'edge-tts');
            });
        });
    },

    /**
     * Set TTS Model setting for Original Text
     * @param {string} model 
     * @returns {Promise<boolean>}
     */
    async setTtsModelOrig(model) {
        return new Promise(resolve => {
            chrome.storage.local.set({ ttsModelOrig: model }, () => resolve(!chrome.runtime.lastError));
        });
    },

    /**
     * Get TTS Voice setting for Translated Text
     * @returns {Promise<string>}
     */
    async getTtsVoiceTrans() {
        return new Promise(resolve => {
            chrome.storage.local.get(['ttsVoiceTrans', 'ttsVoice'], result => {
                resolve(result.ttsVoiceTrans || result.ttsVoice || 'vi-VN-HoaiMyNeural');
            });
        });
    },

    /**
     * Set TTS Voice setting for Translated Text
     * @param {string} voice 
     * @returns {Promise<boolean>}
     */
    async setTtsVoiceTrans(voice) {
        return new Promise(resolve => {
            chrome.storage.local.set({ ttsVoiceTrans: voice, ttsVoice: voice }, () => resolve(!chrome.runtime.lastError));
        });
    },

    /**
     * Get TTS Model setting for Translated Text
     * @returns {Promise<string>}
     */
    async getTtsModelTrans() {
        return new Promise(resolve => {
            chrome.storage.local.get(['ttsModelTrans', 'ttsModel'], result => {
                resolve(result.ttsModelTrans || result.ttsModel || 'edge-tts');
            });
        });
    },

    /**
     * Set TTS Model setting for Translated Text
     * @param {string} model 
     * @returns {Promise<boolean>}
     */
    async setTtsModelTrans(model) {
        return new Promise(resolve => {
            chrome.storage.local.set({ ttsModelTrans: model, ttsModel: model }, () => resolve(!chrome.runtime.lastError));
        });
    },

    /**
     * Get TTS Voice setting (backward compatibility -> Translated)
     * @returns {Promise<string>}
     */
    async getTtsVoice() {
        return this.getTtsVoiceTrans();
    },

    /**
     * Set TTS Voice setting (backward compatibility -> Translated)
     * @param {string} voice - Voice ID
     * @returns {Promise<boolean>}
     */
    async setTtsVoice(voice) {
        return this.setTtsVoiceTrans(voice);
    },

    /**
     * Get TTS Vocal Direction setting
     * @returns {Promise<string>}
     */
    async getTtsDirection() {
        return new Promise(resolve => {
            chrome.storage.local.get(['ttsDirection'], result => {
                resolve(result.ttsDirection || 'none');
            });
        });
    },

    /**
     * Set TTS Vocal Direction setting
     * @param {string} direction - Vocal direction tag
     * @returns {Promise<boolean>}
     */
    async setTtsDirection(direction) {
        return new Promise(resolve => {
            chrome.storage.local.set({ ttsDirection: direction }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },

    /**
     * Get TTS Model setting (backward compatibility -> Translated)
     * @returns {Promise<string>}
     */
    async getTtsModel() {
        return this.getTtsModelTrans();
    },

    /**
     * Set TTS Model setting (backward compatibility -> Translated)
     * @param {string} model - TTS Model ID
     * @returns {Promise<boolean>}
     */
    async setTtsModel(model) {
        return this.setTtsModelTrans(model);
    },

    /**
     * Update Groq Rate Limit metrics from API headers
     * @param {Headers} headers - Response headers
     */
    async updateRateLimits(headers) {
        if (!headers) return;
        const remainingRequests = headers.get('x-ratelimit-remaining-requests');
        if (remainingRequests !== null) {
            const rateLimits = {
                remainingRequests: headers.get('x-ratelimit-remaining-requests'),
                limitRequests: headers.get('x-ratelimit-limit-requests'),
                remainingTokens: headers.get('x-ratelimit-remaining-tokens'),
                limitTokens: headers.get('x-ratelimit-limit-tokens'),
                resetRequests: headers.get('x-ratelimit-reset-requests'),
                resetTokens: headers.get('x-ratelimit-reset-tokens'),
                updatedAt: Date.now()
            };
            chrome.storage.local.set({ rateLimits });
        }
    },

    /**
     * Get saved Rate Limit metrics
     * @returns {Promise<object|null>}
     */
    async getRateLimits() {
        return new Promise(resolve => {
            chrome.storage.local.get(['rateLimits'], result => resolve(result.rateLimits || null));
        });
    },

    /**
     * Get selected AI model
     * @returns {Promise<string>}
     */
    async getSelectedModel() {
        return new Promise(resolve => {
            chrome.storage.local.get(['selectedModel'], result => {
                resolve(result.selectedModel || (typeof CONFIG !== 'undefined' ? CONFIG.API.MODEL : 'llama-3.3-70b-versatile'));
            });
        });
    },

    /**
     * Set selected AI model
     * @param {string} model - Model ID
     * @returns {Promise<boolean>}
     */
    async setSelectedModel(model) {
        return new Promise(resolve => {
            chrome.storage.local.set({ selectedModel: model }, () => {
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
                    recentLanguages: (typeof CONFIG !== 'undefined' && CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES) ? CONFIG.DEFAULT_POPULAR_TARGET_LANGUAGES.slice(0, 10) : ['Vietnamese', 'English', 'Japanese', 'Korean', 'Chinese (Simplified)', 'French', 'German', 'Spanish', 'Russian', 'Thai'],
                    favoriteLanguages: ['Vietnamese', 'English', 'Japanese', 'Korean']
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
     * Add favorite language
     * @param {string} language - Language to add
     * @returns {Promise<boolean>}
     */
    async addFavoriteLanguage(language) {
        const preferences = await this.getLanguagePreferences();
        const favs = preferences.favoriteLanguages || [];
        if (!favs.includes(language)) {
            favs.push(language);
            preferences.favoriteLanguages = favs;
            return this.setLanguagePreferences(preferences);
        }
        return true;
    },

    /**
     * Remove favorite language
     * @param {string} language - Language to remove
     * @returns {Promise<boolean>}
     */
    async removeFavoriteLanguage(language) {
        const preferences = await this.getLanguagePreferences();
        const favs = preferences.favoriteLanguages || [];
        preferences.favoriteLanguages = favs.filter(l => l !== language);
        return this.setLanguagePreferences(preferences);
    },

    /**
     * Get hidden target languages list
     * @returns {Promise<Array<string>>}
     */
    async getHiddenTargetLanguages() {
        return new Promise(resolve => {
            chrome.storage.local.get(['hiddenTargetLanguages'], result => {
                resolve(result.hiddenTargetLanguages || []);
            });
        });
    },

    /**
     * Remove language from target quick list (adds to hiddenTargetLanguages and removes from favorites & recents)
     * @param {string} language - Language to remove
     * @returns {Promise<boolean>}
     */
    async removeTargetLanguageFromQuickList(language) {
        const preferences = await this.getLanguagePreferences();
        const favs = preferences.favoriteLanguages || [];
        const recents = preferences.recentLanguages || [];
        preferences.favoriteLanguages = favs.filter(l => l !== language);
        preferences.recentLanguages = recents.filter(l => l !== language);
        await this.setLanguagePreferences(preferences);

        return new Promise(resolve => {
            chrome.storage.local.get(['hiddenTargetLanguages'], result => {
                const hidden = result.hiddenTargetLanguages || [];
                if (!hidden.includes(language)) {
                    hidden.push(language);
                }
                chrome.storage.local.set({ hiddenTargetLanguages: hidden }, () => {
                    resolve(!chrome.runtime.lastError);
                });
            });
        });
    },

    /**
     * Unhide target language
     * @param {string} language - Language to restore
     * @returns {Promise<boolean>}
     */
    async unhideTargetLanguage(language) {
        return new Promise(resolve => {
            chrome.storage.local.get(['hiddenTargetLanguages'], result => {
                const hidden = (result.hiddenTargetLanguages || []).filter(l => l !== language);
                chrome.storage.local.set({ hiddenTargetLanguages: hidden }, () => {
                    resolve(!chrome.runtime.lastError);
                });
            });
        });
    },

    /**
     * Get theme preference ('light' | 'dark')
     * @returns {Promise<string>}
     */
    async getTheme() {
        return new Promise(resolve => {
            chrome.storage.local.get(['appTheme'], result => {
                resolve(result.appTheme || 'light');
            });
        });
    },

    /**
     * Set theme preference ('light' | 'dark')
     * @param {string} theme - 'light' or 'dark'
     * @returns {Promise<boolean>}
     */
    async setTheme(theme) {
        return new Promise(resolve => {
            chrome.storage.local.set({ appTheme: theme }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },

    /**
     * Record a real translation event into local storage
     * @param {string} text - Translated text
     * @param {string} targetLang - Target language
     * @param {number} responseTimeMs - Response time in ms
     */
    async recordTranslationEvent(text = '', targetLang = 'Vietnamese', responseTimeMs = 0) {
        const words = (text || '').trim().split(/\s+/).filter(Boolean).length || 1;
        const now = new Date();
        const dateKey = now.toISOString().split('T')[0]; // 'YYYY-MM-DD'

        return new Promise(resolve => {
            chrome.storage.local.get(['translationHistoryStats'], result => {
                const stats = result.translationHistoryStats || {
                    totalTranslations: 0,
                    totalWords: 0,
                    dailyCounts: {},
                    langCounts: {},
                    recentDurations: []
                };

                stats.totalTranslations = (stats.totalTranslations || 0) + 1;
                stats.totalWords = (stats.totalWords || 0) + words;

                // Daily breakdown
                if (!stats.dailyCounts[dateKey]) {
                    stats.dailyCounts[dateKey] = { count: 0, words: 0 };
                }
                stats.dailyCounts[dateKey].count += 1;
                stats.dailyCounts[dateKey].words += words;

                // Language breakdown
                stats.langCounts[targetLang] = (stats.langCounts[targetLang] || 0) + 1;

                // Duration tracking
                if (responseTimeMs > 0) {
                    stats.recentDurations.push(responseTimeMs);
                    if (stats.recentDurations.length > 20) {
                        stats.recentDurations.shift();
                    }
                }

                chrome.storage.local.set({ translationHistoryStats: stats }, () => {
                    resolve(!chrome.runtime.lastError);
                });
            });
        });
    },

    /**
     * Get real translation statistics for Bento Grid from local storage
     */
    async getRealStats() {
        return new Promise(resolve => {
            chrome.storage.local.get(['translationHistoryStats'], result => {
                const stats = result.translationHistoryStats || {
                    totalTranslations: 0,
                    totalWords: 0,
                    dailyCounts: {},
                    langCounts: {},
                    recentDurations: []
                };

                // Compute last 7 days chart data
                const last7Days = [];
                const daysOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const todayDate = new Date();

                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(todayDate.getDate() - i);
                    const dateStr = d.toISOString().split('T')[0];
                    const dayLabel = daysOfWeekNames[d.getDay()];
                    const dayData = stats.dailyCounts[dateStr] || { count: 0, words: 0 };
                    last7Days.push({
                        date: dateStr,
                        dayLabel: dayLabel,
                        count: dayData.count,
                        words: dayData.words
                    });
                }

                // Compute today's count
                const todayStr = todayDate.toISOString().split('T')[0];
                const todayCount = (stats.dailyCounts[todayStr] && stats.dailyCounts[todayStr].count) || 0;

                // Compute average speed
                let avgSpeed = 0;
                if (stats.recentDurations && stats.recentDurations.length > 0) {
                    const sum = stats.recentDurations.reduce((a, b) => a + b, 0);
                    avgSpeed = Math.round(sum / stats.recentDurations.length);
                }

                // Compute top target language
                let topLang = 'Chưa có';
                let maxCount = 0;
                let totalLangCount = 0;
                Object.entries(stats.langCounts || {}).forEach(([lang, count]) => {
                    totalLangCount += count;
                    if (count > maxCount) {
                        maxCount = count;
                        topLang = lang;
                    }
                });

                const topPercent = totalLangCount > 0 ? Math.round((maxCount / totalLangCount) * 100) : 0;

                resolve({
                    totalTranslations: stats.totalTranslations || 0,
                    totalWords: stats.totalWords || 0,
                    todayCount: todayCount,
                    avgSpeed: avgSpeed,
                    topLang: topLang,
                    topPercent: topPercent,
                    last7Days: last7Days,
                    langCounts: stats.langCounts || {}
                });
            });
        });
    },

    /**
     * Get list of API Keys for Multi-Key Fallback Pool
     * @returns {Promise<string[]>}
     */
    async getApiKeys() {
        return new Promise(resolve => {
            chrome.storage.local.get(['API_KEYS', 'API_KEY'], result => {
                let keys = [];
                if (result.API_KEYS) {
                    if (Array.isArray(result.API_KEYS)) {
                        keys = result.API_KEYS;
                    } else if (typeof result.API_KEYS === 'string') {
                        keys = result.API_KEYS.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
                    }
                }
                if (keys.length === 0 && result.API_KEY) {
                    keys = [result.API_KEY.trim()];
                }
                resolve(keys);
            });
        });
    },

    /**
     * Save multiple API Keys
     * @param {string[]|string} keys 
     * @returns {Promise<boolean>}
     */
    async saveApiKeys(keys) {
        let keysArray = [];
        if (Array.isArray(keys)) {
            keysArray = keys.map(k => k.trim()).filter(Boolean);
        } else if (typeof keys === 'string') {
            keysArray = keys.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
        }

        const primaryKey = keysArray.length > 0 ? keysArray[0] : '';
        this._apiKeyCache = primaryKey;

        return new Promise(resolve => {
            chrome.storage.local.set({ API_KEYS: keysArray, API_KEY: primaryKey }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    },

    /**
     * Get recent languages list
     * @returns {Promise<string[]>}
     */
    async getRecentLanguages() {
        return new Promise(resolve => {
            chrome.storage.local.get(['recentLanguages'], result => {
                resolve(result.recentLanguages || ['Vietnamese', 'English', 'Japanese', 'Korean']);
            });
        });
    },

    /**
     * Add language to recent list
     * @param {string} lang 
     */
    async addRecentLanguage(lang) {
        if (!lang) return;
        const current = await this.getRecentLanguages();
        const updated = [lang, ...current.filter(l => l !== lang)].slice(0, 8);
        return new Promise(resolve => {
            chrome.storage.local.set({ recentLanguages: updated }, () => resolve(updated));
        });
    },

    /**
     * Remove language from recent list
     * @param {string} lang 
     */
    async removeRecentLanguage(lang) {
        if (!lang) return;
        const current = await this.getRecentLanguages();
        const updated = current.filter(l => l !== lang);
        return new Promise(resolve => {
            chrome.storage.local.set({ recentLanguages: updated }, () => resolve(updated));
        });
    },

    /**
     * Get favorite languages list
     * @returns {Promise<string[]>}
     */
    async getFavoriteLanguages() {
        return new Promise(resolve => {
            chrome.storage.local.get(['favoriteLanguages'], result => {
                resolve(result.favoriteLanguages || ['Vietnamese', 'English']);
            });
        });
    },

    /**
     * Set favorite languages list
     * @param {string[]} langs 
     */
    async setFavoriteLanguages(langs) {
        return new Promise(resolve => {
            chrome.storage.local.set({ favoriteLanguages: langs }, () => resolve(!chrome.runtime.lastError));
        });
    },

    /**
     * Get full translation history
     * @returns {Promise<object[]>}
     */
    async getTranslationHistory() {
        return new Promise(resolve => {
            chrome.storage.local.get(['translationHistoryRecords'], result => {
                resolve(result.translationHistoryRecords || []);
            });
        });
    },

    /**
     * Add record to translation history
     * @param {object} record { type, originalText, translatedText, targetLang, timestamp }
     */
    async addTranslationHistory(record) {
        if (!record || !record.originalText || !record.originalText.trim()) return;
        const history = await this.getTranslationHistory();

        // Prevent duplicate history items generated within 3 seconds
        if (history.length > 0) {
            const first = history[0];
            if (first.originalText.trim() === record.originalText.trim() && 
                Math.abs(Date.now() - (first.timestamp || 0)) < 3000) {
                // Update translated text if previous was placeholder
                if ((!first.translatedText || first.translatedText.includes('Đang chờ')) && record.translatedText) {
                    first.translatedText = record.translatedText;
                    chrome.storage.local.set({ translationHistoryRecords: history });
                }
                return history;
            }
        }

        const newRecord = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
            type: record.type || 'text', // 'text', 'voice', 'ocr'
            originalText: record.originalText.trim(),
            translatedText: (record.translatedText || '').trim(),
            targetLang: record.targetLang || 'Vietnamese',
            timestamp: record.timestamp || Date.now()
        };
        const updated = [newRecord, ...history].slice(0, 150);
        return new Promise(resolve => {
            chrome.storage.local.set({ translationHistoryRecords: updated }, () => resolve(updated));
        });
    },

    /**
     * Delete history record by ID
     * @param {string} id 
     */
    async deleteTranslationHistoryItem(id) {
        const history = await this.getTranslationHistory();
        const updated = history.filter(item => item.id !== id);
        return new Promise(resolve => {
            chrome.storage.local.set({ translationHistoryRecords: updated }, () => resolve(updated));
        });
    },

    /**
     * Clear all translation history
     */
    async clearTranslationHistory() {
        return new Promise(resolve => {
            chrome.storage.local.set({ translationHistoryRecords: [] }, () => resolve(true));
        });
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