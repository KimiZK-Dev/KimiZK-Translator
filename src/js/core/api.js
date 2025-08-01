// API service module for KimiZK-Translator
const ApiService = {
    /**
     * Translate text using Groq API
     * @param {string} input - Text to translate
     * @param {boolean} isSingleWord - Whether input is a single word
     * @param {string} targetLanguage - Target language for translation (default: 'Vietnamese')
     * @returns {Promise<object|null>} Translation result
     */
    async translate(input, isSingleWord, targetLanguage = 'Vietnamese') {
        try {
            const apiKey = await StorageManager.getApiKey();
            if (!apiKey) {
                throw new Error('API_KEY_NOT_FOUND');
            }
            
            const escapedInput = Utils.escapeSpecialChars(input);
            const detectedLanguage = Utils.detectLanguage(input);
            
            const prompt = this._buildTranslationPrompt(escapedInput, isSingleWord, targetLanguage);
            
            const response = await fetch(CONFIG.API.ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
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

            if (!response.ok) {
                throw new Error(`API_ERROR_${response.status}: ${response.statusText}`);
            }

            const { choices } = await response.json();
            const text = choices?.[0]?.message?.content || "";
            const cleanedText = Utils.cleanJson(text);
            
            // console.log('Raw API response:', text);
            // console.log('Cleaned text:', cleanedText);
            
            const result = this._parseTranslationResponse(cleanedText, input);
            
            if (!result) {
                console.error('Failed to parse API response');
                throw new Error('INVALID_API_RESPONSE');
            }
            
            // Validate required fields
            if (isSingleWord) {
                if (!result.meaning || !result.detectedLanguage) {
                    console.error('Missing required fields for single word:', result);
                    throw new Error('INVALID_API_RESPONSE');
                }
            } else {
                if (!result.translated || !result.detectedLanguage) {
                    console.error('Missing required fields for text:', result);
                    throw new Error('INVALID_API_RESPONSE');
                }
            }
            
            return result;
            
        } catch (error) {
            console.error("Translation error:", error);
            
            if (error.message === 'API_KEY_NOT_FOUND') {
                throw error; // Re-throw to trigger API key prompt
            }
            
            return null;
        }
    },
    
    /**
     * Convert text to speech using Groq TTS API
     * @param {string} text - Text to convert to speech
     * @returns {Promise<string|null>} Audio URL
     */
    async textToSpeech(text) {
        try {
            if (text.length > CONFIG.AUDIO.MAX_TEXT_LENGTH) {
                throw new Error('TEXT_TOO_LONG');
            }

            // Check cache first - moved to AudioManager for better control
            const apiKey = await StorageManager.getApiKey();
            if (!apiKey) {
                throw new Error('API_KEY_NOT_FOUND');
            }

            // console.log("Making TTS API request for:", text);

            const response = await fetch(CONFIG.API.TTS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "playai-tts",
                    input: text.slice(0, CONFIG.AUDIO.MAX_TEXT_LENGTH),
                    voice: "Arista-PlayAI",
                    response_format: "wav"
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("TTS API error response:", errText);
                
                let errMsg = "Không thể tạo âm thanh. Vui lòng thử lại.";
                try {
                    const errJson = Utils.safeJsonParse(errText);
                    if (errJson?.error?.code === "rate_limit_exceeded") {
                        errMsg = "Bạn đã hết lượt sử dụng TTS hôm nay. Vui lòng thử lại sau hoặc nâng cấp tài khoản!";
                    }
                } catch {}
                
                throw new Error(errMsg);
            }

            const audioBlob = await response.blob();
            if (!audioBlob || !audioBlob.size || !audioBlob.type.includes("audio")) {
                throw new Error("File âm thanh không hợp lệ từ API.");
            }

            // Create blob URL with explicit type
            const audioUrl = URL.createObjectURL(new Blob([audioBlob], { 
                type: audioBlob.type || 'audio/wav' 
            }));
            // console.log("TTS API request successful for:", text);
            
            return audioUrl;

        } catch (error) {
            console.error("TTS error:", error);
            throw error;
        }
    },
    
    /**
     * Check for updates from GitHub
     * @returns {Promise<object>} Update information
     */
    async checkForUpdates() {
        try {
            const response = await fetch(CONFIG.API.GITHUB_RELEASES_URL);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
            
            const releaseData = await response.json();
            const latestVersion = releaseData.tag_name.replace('v', '');
            const releaseName = releaseData.name || `KimiZK-Translator v${latestVersion}`;
            const releaseBody = releaseData.body || 'Không có thông tin chi tiết cho phiên bản này.';
            
            const zipAsset = releaseData.assets?.find(asset => 
                asset.name && asset.name.toLowerCase().includes('.zip')
            );
            
            const downloadUrl = zipAsset ? zipAsset.browser_download_url : releaseData.html_url;
            const directDownloadUrl = zipAsset ? zipAsset.browser_download_url : null;
            
            const currentVersion = chrome.runtime.getManifest().version;
            
            if (latestVersion !== currentVersion) {
                return {
                    hasUpdate: true,
                    currentVersion: currentVersion,
                    latestVersion: latestVersion,
                    releaseNotes: releaseBody,
                    downloadUrl: downloadUrl,
                    directDownloadUrl: directDownloadUrl,
                    releaseName: releaseName,
                    message: `🚀 Có phiên bản mới ${latestVersion} sẵn sàng cập nhật!`
                };
            } else {
                return { 
                    hasUpdate: false,
                    currentVersion: currentVersion,
                    latestVersion: latestVersion,
                    releaseName: releaseName,
                    message: `✅ Đang sử dụng ${releaseName} - phiên bản mới nhất`
                };
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            return { 
                hasUpdate: false, 
                error: error.message,
                currentVersion: chrome.runtime.getManifest().version,
                message: "❌ Không thể kiểm tra cập nhật: " + error.message
            };
        }
    },
    
    /**
     * Build translation prompt based on input type and target language
     * @private
     */
    _buildTranslationPrompt(input, isSingleWord, targetLanguage = 'Vietnamese') {
        const escapedInput = input.replace(/"/g, '\\"');
        
        // Convert target language to Vietnamese display name
        const targetLanguageDisplay = this._getTargetLanguageDisplay(targetLanguage);
        
        if (isSingleWord) {
            return `Bạn là một AI dịch thuật chuyên nghiệp. Hãy phân tích từ "${escapedInput}" và trả về KẾT QUẢ DUY NHẤT bằng JSON hợp lệ, không có bất kỳ text nào khác.

YÊU CẦU:
- Từ này có thể thuộc bất kỳ ngôn ngữ nào (Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, v.v.)
- Dịch chính xác sang ${targetLanguageDisplay}
- Trả về JSON hoàn chỉnh, không thiếu field nào
- Không có text thừa, chỉ có JSON

JSON FORMAT:
{
  "detectedLanguage": "tên ngôn ngữ gốc bằng ${targetLanguageDisplay}",
  "targetLanguage": "${targetLanguageDisplay}",
  "meaning": "nghĩa chính xác bằng ${targetLanguageDisplay}",
  "transcription": "phiên âm IPA của ngôn ngữ gốc hoặc là dạng của ngôn ngữ gốc",
  "partOfSpeech": "loại từ bằng ${targetLanguageDisplay} (danh từ/đại từ/tính từ/động từ/trạng từ/giới từ/liên từ/từ hạn định/thán từ)",
  "description": "mô tả nội dung chính xác bằng ${targetLanguageDisplay}",
  "examples": ["ví dụ 1 bằng ngôn ngữ gốc", "ví dụ 2 bằng ngôn ngữ gốc"],
  "examplesTranslated": ["dịch ví dụ 1 sang ${targetLanguageDisplay}", "dịch ví dụ 2 sang ${targetLanguageDisplay}"],
  "synonyms": ["từ đồng nghĩa 1 (loại từ): nghĩa", "từ đồng nghĩa 2 (loại từ): nghĩa"],
  "otherWordForms": ["biến thể 1 (loại từ): nghĩa", "biến thể 2 (loại từ): nghĩa"]
}

Từ cần dịch: "${escapedInput}"`;
        } else {
            return `Bạn là một AI dịch thuật chuyên nghiệp. Hãy phân tích văn bản "${escapedInput}" và trả về KẾT QUẢ DUY NHẤT bằng JSON hợp lệ, không có bất kỳ text nào khác.

YÊU CẦU:
- Văn bản này có thể thuộc bất kỳ ngôn ngữ nào (Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, v.v.)
- Dịch chính xác sang ${targetLanguageDisplay}
- Trả về JSON hoàn chỉnh, không thiếu field nào
- Không có text thừa, chỉ có JSON
- Đối với văn bản viết hoa toàn bộ (như "NOT GIVEN"), hãy tự nhận diện và dịch chính xác

JSON FORMAT:
{
  "detectedLanguage": "tên ngôn ngữ gốc bằng ${targetLanguageDisplay}",
  "targetLanguage": "${targetLanguageDisplay}",
  "original": "${escapedInput}",
  "transcription": "phiên âm IPA của ngôn ngữ gốc",
  "translated": "bản dịch chính xác sang ${targetLanguageDisplay}"
}

Văn bản cần dịch: "${escapedInput}"`;
        }
    },
    
    /**
     * Get target language display name in Vietnamese
     * @private
     */
    _getTargetLanguageDisplay(targetLanguage) {
        const languageMap = {
            'Vietnamese': 'tiếng Việt',
            'English': 'tiếng Anh',
            'Japanese': 'tiếng Nhật',
            'Korean': 'tiếng Hàn',
            'Chinese': 'tiếng Trung',
            'French': 'tiếng Pháp',
            'German': 'tiếng Đức',
            'Spanish': 'tiếng Tây Ban Nha',
            'Italian': 'tiếng Ý',
            'Russian': 'tiếng Nga',
            'Portuguese': 'tiếng Bồ Đào Nha',
            'Thai': 'tiếng Thái',
            'Indonesian': 'tiếng Indonesia',
            'Malay': 'tiếng Malaysia',
            'Arabic': 'tiếng Ả Rập',
            'Hindi': 'tiếng Hindi'
        };
        
        return languageMap[targetLanguage] || targetLanguage;
    },
    
    /**
     * Parse translation response from API
     * @private
     */
    _parseTranslationResponse(cleanedText, originalInput) {
        try {
            // First try: direct JSON parse
            const result = Utils.safeJsonParse(cleanedText);
            if (result) return result;
            
            // Second try: extract JSON from text if there's extra content
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonText = jsonMatch[0];
                const result = Utils.safeJsonParse(jsonText);
                if (result) return result;
            }
            
            // Third try: fix common JSON issues
            const fixedText = cleanedText
                .replace(/(\w)"/g, '$1\\"')
                .replace(/\\(\s+)/g, '\\\\$1')
                .replace(/,\s*}/g, '}')  // Remove trailing commas
                .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
            
            const result2 = Utils.safeJsonParse(fixedText);
            if (result2) return result2;
            
            // Fourth try: more aggressive JSON cleaning
            const aggressiveClean = cleanedText
                .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
                .replace(/\s+/g, ' ')         // Normalize whitespace
                .trim();
            
            return Utils.safeJsonParse(aggressiveClean);
            
        } catch (error) {
            console.error("Failed to parse translation response:", error);
            console.error("Original text:", cleanedText);
            return null;
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ApiService = ApiService;
} 