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
                    messages: [{
                        role: "user",
                        content: prompt
                    }],
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

            const responseData = await response.json();
            // console.log('Full API response:', responseData);
            
            const {
                choices
            } = responseData;
            
            if (!choices || !Array.isArray(choices) || choices.length === 0) {
                console.error('Invalid API response structure:', responseData);
                throw new Error('INVALID_API_RESPONSE');
            }
            
            const text = choices[0]?.message?.content || "";
            if (!text) {
                console.error('Empty content in API response');
                throw new Error('INVALID_API_RESPONSE');
            }
            
            const cleanedText = Utils.cleanJson(text);

            // console.log('Raw API response:', text);
            // console.log('Cleaned text:', cleanedText);

            const result = this._parseTranslationResponse(cleanedText, input);

            if (!result || typeof result !== 'object') {
                console.error('Failed to parse API response or result is not an object:', result);
                throw new Error('INVALID_API_RESPONSE');
            }

            // Log the parsed result for debugging
            // console.log('Parsed API result:', result);

            // Add fallback values and validate required fields
            if (isSingleWord) {
                // Ensure all required fields exist with fallbacks
                const validatedResult = {
                    detectedLanguage: result.detectedLanguage || 'tiếng Anh',
                    targetLanguage: result.targetLanguage || targetLanguageDisplay,
                    meaning: result.meaning || 'Không có dữ liệu',
                    transcription: result.transcription || '',
                    partOfSpeech: result.partOfSpeech || 'Không xác định',
                    examples: Array.isArray(result.examples) ? result.examples : [],
                    examplesTranslated: Array.isArray(result.examplesTranslated) ? result.examplesTranslated : [],
                    synonyms: Array.isArray(result.synonyms) ? result.synonyms : [],
                    otherWordForms: Array.isArray(result.otherWordForms) ? result.otherWordForms : [],
                    description: result.description || result.meaning || 'Không có dữ liệu'
                };

                // Validate required fields
                if (!validatedResult.meaning || validatedResult.meaning === 'Không có dữ liệu') {
                    console.error('Missing required meaning field for single word:', result);
                    throw new Error('INVALID_API_RESPONSE');
                }

                // Ensure examples and translations have same length
                if (validatedResult.examples.length !== validatedResult.examplesTranslated.length) {
                    const minLength = Math.min(validatedResult.examples.length, validatedResult.examplesTranslated.length);
                    validatedResult.examples = validatedResult.examples.slice(0, minLength);
                    validatedResult.examplesTranslated = validatedResult.examplesTranslated.slice(0, minLength);
                }

                // console.log('Validated single word result:', validatedResult);
                return validatedResult;
            } else {
                // Ensure all required fields exist with fallbacks
                const validatedResult = {
                    detectedLanguage: result.detectedLanguage || 'tiếng Anh',
                    targetLanguage: result.targetLanguage || targetLanguageDisplay,
                    original: result.original || input,
                    translated: result.translated || 'Không có dữ liệu',
                    transcription: result.transcription || ''
                };

                if (!validatedResult.translated || validatedResult.translated === 'Không có dữ liệu') {
                    console.error('Missing required translated field for text:', result);
                    throw new Error('INVALID_API_RESPONSE');
                }

                // console.log('Validated text result:', validatedResult);
                return validatedResult;
            }

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
                    voice: "Nia-PlayAI",
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
            return `BẠN LÀ AI DỊCH THUẬT CHUYÊN NGHIỆP. PHÂN TÍCH VÀ DỊCH TỪ "${escapedInput}" SANG ${targetLanguageDisplay}.
        
        ===== QUY TẮC BẮT BUỘC =====
        1. CHỈ TRẢ VỀ JSON HỢP LỆ - KHÔNG CÓ BẤT KỲ TEXT NÀO KHÁC
        2. PHẢI ĐẦY ĐỦ TẤT CẢ 10 TRƯỜNG THÔNG TIN
        3. MỖI TRƯỜNG PHẢI CÓ THÔNG TIN CHÍNH XÁC - KHÔNG ĐƯỢC ĐỂ TRỐNG
        4. NẾU KHÔNG CÓ THÔNG TIN, GHI "không có" THAY VÌ ĐỂ TRỐNG
        5. KIỂM TRA KỸ TỪNG CHI TIẾT TRƯỚC KHI TRẢ VỀ
        
        ===== TEMPLATE JSON BẮT BUỘC =====
        {
          "detectedLanguage": "[TÊN NGÔN NGỮ GỐC BẰNG ${targetLanguageDisplay} - BẮT BUỘC]",
          "targetLanguage": "${targetLanguageDisplay}",
          "meaning": "[NGHĨA CHÍNH XÁC NHẤT BẰNG ${targetLanguageDisplay} - BẮT BUỘC]",
          "transcription": "[PHIÊN ÂM IPA CHUẨN HOẶC PHIÊN ÂM GỐC - BẮT BUỘC]",
          "partOfSpeech": "[LOẠI TỪ CHÍNH XÁC: danh từ/đại từ/tính từ/động từ/trạng từ/giới từ/liên từ/từ hạn định/thán từ - BẮT BUỘC]",
          "description": "[MÔ TẢ CHI TIẾT VỀ TỪ NÀY BẰNG ${targetLanguageDisplay} - BẮT BUỘC]",
          "examples": ["[VÍ DỤ THỰC TẾ 1 BẰNG NGÔN NGỮ GỐC - BẮT BUỘC]", "[VÍ DỤ THỰC TẾ 2 BẰNG NGÔN NGỮ GỐC - BẮT BUỘC]"],
          "examplesTranslated": ["[DỊCH CHÍNH XÁC VÍ DỤ 1 SANG ${targetLanguageDisplay} - BẮT BUỘC]", "[DỊCH CHÍNH XÁC VÍ DỤ 2 SANG ${targetLanguageDisplay} - BẮT BUỘC]"],
          "synonyms": ["[TỪ ĐỒNG NGHĨA NGÔN NGỮ GỐC 1 (loại từ): nghĩa - BẮT BUỘC]", "[TỪ ĐỒNG NGHĨA NGÔN NGỮ GỐC 2 (loại từ): nghĩa - BẮT BUỘC]", "[THÊM NẾU CÓ]"],
          "otherWordForms": ["[DẠNG KHÁC 1 (loại từ): nghĩa - BẮT BUỘC]", "[DẠNG KHÁC 2 (loại từ): nghĩa - BẮT BUỘC]", "[THÊM NẾU CÓ]"]
        }
        
        ===== KIỂM TRA CUỐI CÙNG =====
        - ĐẢM BẢO CÓ ĐỦ 10 TRƯỜNG
        - ĐẢM BẢO KHÔNG CÓ TRƯỜNG NÀO TRỐNG
        - ĐẢM BẢO JSON HỢP LỆ
        - ĐẢM BẢO KHÔNG CÓ TEXT NGOÀI JSON
        
        BẮT ĐẦU PHÂN TÍCH TỪ: "${escapedInput}"`;
        
        } else {
            return `BẠN LÀ AI DỊCH THUẬT CHUYÊN NGHIỆP. PHÂN TÍCH VÀ DỊCH VĂN BẢN "${escapedInput}" SANG ${targetLanguageDisplay}.
        
        ===== QUY TẮC BẮT BUỘC =====
        1. CHỈ TRẢ VỀ JSON HỢP LỆ - KHÔNG CÓ BẤT KỲ TEXT NÀO KHÁC
        2. PHẢI ĐẦY ĐỦ TẤT CẢ 5 TRƯỜNG THÔNG TIN
        3. MỖI TRƯỜNG PHẢI CÓ THÔNG TIN CHÍNH XÁC - KHÔNG ĐƯỢC ĐỂ TRỐNG
        4. DỊCH CHÍNH XÁC 100% Ý NGHĨA, NGỮ CẢNH, NGỮ PHÁP
        5. GIỮ NGUYÊN Ý NGHĨA GỐC, KHÔNG THÊM BỚT
        
        ===== TEMPLATE JSON BẮT BUỘC =====
        {
          "detectedLanguage": "[TÊN NGÔN NGỮ GỐC BẰNG ${targetLanguageDisplay} - BẮT BUỘC]",
          "targetLanguage": "${targetLanguageDisplay}",
          "original": "${escapedInput}",
          "transcription": "[PHIÊN ÂM IPA CỦA TOÀN BỘ VĂN BẢN GỐC - BẮT BUỘC]",
          "translated": "[BẢN DỊCH HOÀN CHỈNH, CHÍNH XÁC 100% SANG ${targetLanguageDisplay} - BẮT BUỘC]"
        }
        
        ===== KIỂM TRA CUỐI CÙNG =====
        - ĐẢM BẢO CÓ ĐỦ 5 TRƯỜNG
        - ĐẢM BẢO KHÔNG CÓ TRƯỜNG NÀO TRỐNG
        - ĐẢM BẢO JSON HỢP LỆ
        - ĐẢM BẢO BẢN DỊCH CHÍNH XÁC HOÀN TOÀN
        - ĐẢM BẢO KHÔNG CÓ TEXT NGOÀI JSON
        
        BẮT ĐẦU DỊCH VĂN BẢN: "${escapedInput}"`;
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
            // console.log('Parsing translation response:', cleanedText);
            
            // First try: direct JSON parse
            const result = Utils.safeJsonParse(cleanedText);
            if (result) {
                // console.log('Successfully parsed JSON:', result);
                return result;
            }

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
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

            const result2 = Utils.safeJsonParse(fixedText);
            if (result2) return result2;

            // Fourth try: more aggressive JSON cleaning
            const aggressiveClean = cleanedText
                .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
                .replace(/\s+/g, ' ') // Normalize whitespace
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