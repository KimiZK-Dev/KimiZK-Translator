/**
 * API Service for KimiZK-Translator
 * Handles all API calls to Groq and other services
 */

import { CONFIG } from '../core/config.js';
import { cleanJson, safeJsonParse, detectLanguage, log } from '../core/utils.js';
import storageManager from '../core/storage.js';

class ApiService {
    constructor() {
        this.apiKey = null;
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * Initialize API service
     */
    async initialize() {
        this.apiKey = await storageManager.getApiKey();
        log('API Service initialized', 'info');
    }

    /**
     * Set API key
     * @param {string} apiKey - New API key
     */
    async setApiKey(apiKey) {
        this.apiKey = apiKey;
        await storageManager.setApiKey(apiKey);
        log('API Key updated', 'info');
    }

    /**
     * Get API key
     * @returns {string|null} Current API key
     */
    getApiKey() {
        return this.apiKey;
    }

    /**
     * Check if API key is valid
     * @returns {boolean} True if valid
     */
    hasValidApiKey() {
        return this.apiKey && this.apiKey.length >= CONFIG.CONSTANTS.MIN_API_KEY_LENGTH;
    }

    /**
     * Make API request with retry logic
     * @param {string} url - API endpoint
     * @param {Object} options - Request options
     * @param {number} retries - Number of retries
     * @returns {Promise<Object>} API response
     */
    async makeRequest(url, options = {}, retries = 3) {
        const requestId = Date.now();
        log(`Making API request to ${url}`, 'info');

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            log(`API request successful`, 'info');
            return data;

        } catch (error) {
            log(`API request failed: ${error.message}`, 'error');
            
            if (retries > 0) {
                log(`Retrying request (${retries} attempts left)`, 'warn');
                await this.delay(1000 * (4 - retries)); // Exponential backoff
                return this.makeRequest(url, options, retries - 1);
            }
            
            throw error;
        }
    }

    /**
     * Translate text using Groq API
     * @param {string} text - Text to translate
     * @param {boolean} isSingleWord - Whether text is a single word
     * @returns {Promise<Object|null>} Translation result
     */
    async translate(text, isSingleWord = false) {
        if (!this.hasValidApiKey()) {
            throw new Error(CONFIG.ERRORS.API_KEY_REQUIRED);
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input');
        }

        // Check cache first
        const cacheKey = `${text}_${isSingleWord}`;
        if (this.cache.has(cacheKey)) {
            log('Translation result found in cache', 'info');
            return this.cache.get(cacheKey);
        }

        const escapedText = text.replace(/"/g, '\\"');
        const detectedLanguage = detectLanguage(text);

        const prompt = isSingleWord ? this.buildSingleWordPrompt(escapedText) : this.buildTextPrompt(escapedText);

        try {
            const response = await this.makeRequest(CONFIG.API.ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: CONFIG.API.MODEL,
                    temperature: 0.7,
                    max_completion_tokens: 1024,
                    top_p: 1,
                    stream: false,
                    stop: null
                })
            });

            const result = this.parseTranslationResponse(response, isSingleWord);
            
            if (result) {
                // Cache the result
                this.cache.set(cacheKey, result);
                
                // Limit cache size
                if (this.cache.size > CONFIG.AUDIO.CACHE_SIZE) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
            }

            return result;

        } catch (error) {
            log(`Translation failed: ${error.message}`, 'error');
            throw new Error(CONFIG.ERRORS.TRANSLATION_FAILED);
        }
    }

    /**
     * Build prompt for single word translation
     * @param {string} text - Escaped text
     * @returns {string} Formatted prompt
     */
    buildSingleWordPrompt(text) {
        return `Trả lời từ sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích. Từ này có thể là tiếng Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, hoặc các ngôn ngữ khác. Dịch nghĩa của từ và mô tả chắc chắn phải đúng chuẩn. Trả ra duy nhất 1 JSON ở dưới

Format JSON:

{
  "detectedLanguage": "",
  "meaning": "",
  "transcription": "",
  "partOfSpeech": "",
  "description": "",
  "examples": [],
  "examplesTranslated": [],
  "synonyms": [],
  "otherWordForms": []
}

Từ cần dịch: "${text}"`;
    }

    /**
     * Build prompt for text translation
     * @param {string} text - Escaped text
     * @returns {string} Formatted prompt
     */
    buildTextPrompt(text) {
        return `Trả lời văn bản sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích. Văn bản này có thể là tiếng Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, hoặc các ngôn ngữ khác. Đối với văn bản ghi hoa toàn bộ như này: NOT GIVEN thì tự nhận diện văn bản đang dịch luôn giúp tớ (là Not given ấy, cái khác tương tự mà trả ra kết quả JSON CHÍNH XÁC theo như cho ở dưới đây!). Trả ra duy nhất 1 JSON ở dưới

Format JSON:

{
  "detectedLanguage": "",
  "original": "${text}",
  "transcription": "",
  "translated": ""
}

Văn bản cần dịch: "${text}"`;
    }

    /**
     * Parse translation response
     * @param {Object} response - API response
     * @param {boolean} isSingleWord - Whether response is for single word
     * @returns {Object|null} Parsed result
     */
    parseTranslationResponse(response, isSingleWord) {
        try {
            const text = response.choices?.[0]?.message?.content || "";
            if (!text) {
                log('Empty response from API', 'error');
                return null;
            }

            const cleanedText = cleanJson(text);
            let result = safeJsonParse(cleanedText);

            if (!result) {
                // Try to fix common JSON issues
                const fixedText = cleanedText
                    .replace(/(\w)"/g, '$1\\"')
                    .replace(/\\(\s+)/g, '\\\\$1');
                
                result = safeJsonParse(fixedText);
            }

            if (!result) {
                log('Failed to parse JSON response', 'error');
                return null;
            }

            // Validate required fields
            if (isSingleWord) {
                if (!result.meaning || !result.description) {
                    log('Missing required fields in single word response', 'error');
                    return null;
                }
            } else {
                if (!result.translated) {
                    log('Missing translation in text response', 'error');
                    return null;
                }
            }

            return result;

        } catch (error) {
            log(`Parse response error: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Convert text to speech
     * @param {string} text - Text to convert
     * @returns {Promise<string|null>} Audio URL
     */
    async textToSpeech(text) {
        if (!this.hasValidApiKey()) {
            throw new Error(CONFIG.ERRORS.API_KEY_REQUIRED);
        }

        if (!text || typeof text !== 'string') {
            throw new Error('Invalid text input');
        }

        if (text.length > CONFIG.AUDIO.MAX_TEXT_LENGTH) {
            throw new Error(CONFIG.ERRORS.TEXT_TOO_LONG);
        }

        // Check cache
        if (this.cache.has(`audio_${text}`)) {
            log('Audio found in cache', 'info');
            return this.cache.get(`audio_${text}`);
        }

        try {
            const response = await this.makeRequest(CONFIG.API.TTS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "playai-tts",
                    input: text.slice(0, CONFIG.AUDIO.MAX_TEXT_LENGTH),
                    voice: CONFIG.AUDIO.VOICE,
                    response_format: CONFIG.AUDIO.RESPONSE_FORMAT
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = CONFIG.ERRORS.AUDIO_FAILED;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson?.error?.code === "rate_limit_exceeded") {
                        errorMessage = "Hết lượt sử dụng TTS hôm nay. Vui lòng thử lại sau hoặc nâng cấp tài khoản!";
                    }
                } catch {}
                
                throw new Error(errorMessage);
            }

            const audioBlob = await response.blob();
            if (!audioBlob || !audioBlob.size || !audioBlob.type.includes("audio")) {
                throw new Error("File âm thanh không hợp lệ từ API.");
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Cache the audio URL
            this.cache.set(`audio_${text}`, audioUrl);
            
            // Limit cache size
            if (this.cache.size > CONFIG.AUDIO.CACHE_SIZE) {
                const firstKey = this.cache.keys().next().value;
                const oldUrl = this.cache.get(firstKey);
                if (oldUrl && oldUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(oldUrl);
                }
                this.cache.delete(firstKey);
            }

            log('TTS request successful', 'info');
            return audioUrl;

        } catch (error) {
            log(`TTS failed: ${error.message}`, 'error');
            throw new Error(CONFIG.ERRORS.AUDIO_FAILED);
        }
    }

    /**
     * Check for updates from GitHub
     * @returns {Promise<Object>} Update information
     */
    async checkForUpdates() {
        try {
            const response = await this.makeRequest(CONFIG.API.GITHUB_RELEASES_URL);
            
            const latestVersion = response.tag_name.replace('v', '');
            const releaseName = response.name || `KimiZK-Translator v${latestVersion}`;
            const releaseBody = response.body || 'Không có thông tin chi tiết cho phiên bản này.';
            
            const zipAsset = response.assets?.find(asset => 
                asset.name && asset.name.toLowerCase().includes('.zip')
            );
            
            const downloadUrl = zipAsset ? zipAsset.browser_download_url : response.html_url;
            const currentVersion = chrome.runtime.getManifest().version;
            
            const hasUpdate = latestVersion !== currentVersion;
            
            return {
                hasUpdate,
                currentVersion,
                latestVersion,
                releaseNotes: releaseBody,
                downloadUrl,
                directDownloadUrl: zipAsset ? zipAsset.browser_download_url : null,
                releaseName,
                message: hasUpdate ? 
                    `🚀 Có phiên bản mới ${latestVersion} sẵn sàng cập nhật!` :
                    `✅ Đang sử dụng ${releaseName} - phiên bản mới nhất`
            };

        } catch (error) {
            log(`Update check failed: ${error.message}`, 'error');
            return {
                hasUpdate: false,
                error: error.message,
                currentVersion: chrome.runtime.getManifest().version,
                message: `❌ Không thể kiểm tra cập nhật: ${error.message}`
            };
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        // Revoke all blob URLs
        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('audio_') && value && value.startsWith('blob:')) {
                URL.revokeObjectURL(value);
            }
        }
        this.cache.clear();
        log('Cache cleared', 'info');
    }

    /**
     * Delay function for retry logic
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 