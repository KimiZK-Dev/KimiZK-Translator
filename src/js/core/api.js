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
            
            const systemPrompt = this._buildSystemPrompt();
            const prompt = this._buildTranslationPrompt(input, isSingleWord, targetLanguage);
            
            const savedModel = (typeof StorageManager !== 'undefined' && StorageManager.getSelectedModel) 
                ? await StorageManager.getSelectedModel() 
                : CONFIG.API.MODEL;
            const modelToUse = savedModel || CONFIG.API.MODEL || "llama-3.3-70b-versatile";
            
            const response = await fetch(CONFIG.API.ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    messages: [
                        { role: "user", content: `${systemPrompt}\n\n${prompt}` }
                    ],
                    model: modelToUse,
                    temperature: 0.2,
                    max_completion_tokens: 2048,
                    top_p: 1,
                    stream: false
                })
            });

            // Record rate limit headers if present
            if (typeof StorageManager !== 'undefined' && StorageManager.updateRateLimits) {
                StorageManager.updateRateLimits(response.headers);
            }

            if (!response.ok) {
                const errText = await response.text();
                if (response.status === 413 || errText.includes('request_too_large') || errText.includes('Request Entity Too Large') || errText.includes('Content Too Large')) {
                    throw new Error(`Nội dung cần dịch quá lớn (Lỗi 413: Content Too Large). Vui lòng bôi đen hoặc nhập đoạn văn ngắn hơn.`);
                }
                if (response.status === 429) {
                    const retryAfter = response.headers.get('retry-after') || '2';
                    throw new Error(`Đã chạm giới hạn Groq Rate Limit (429). Vui lòng thử lại sau ${retryAfter} giây.`);
                }
                if (errText.includes('model_decommissioned')) {
                    throw new Error(`Mô hình AI này (${modelToUse}) đã bị Groq ngừng hỗ trợ. Vui lòng đổi sang Model khác trong Options.`);
                }
                if (errText.includes('model_not_found')) {
                    throw new Error(`Không tìm thấy mô hình AI (${modelToUse}). Vui lòng chọn Model khác trong Options.`);
                }
                if (errText.includes('blocked_api_access')) {
                    throw new Error(`Tài khoản Groq API của bạn đã vượt quá Hạn mức Ngân sách hàng tháng (Spend Limit). Vui lòng kiểm tra Bảng điều khiển Groq Console.`);
                }
                if (response.status === 498 || errText.includes('capacity_exceeded')) {
                    throw new Error(`Dung lượng hệ thống Groq Flex tier đang bận (498). Vui lòng thử lại sau vài giây.`);
                }
                throw new Error(`API_ERROR_${response.status}: ${errText || response.statusText}`);
            }

            const responseData = await response.json();
            const { choices, usage } = responseData;
            const message = choices?.[0]?.message;
            const text = message?.content || message?.reasoning || "";
            const cleanedText = Utils.cleanJson(text);
            
            const rawResult = this._parseTranslationResponse(cleanedText, input);
            const result = this._sanitizeTranslationResult(rawResult, input, targetLanguage);
            
            if (result) {
                if (usage) {
                    result.serverLatency = usage.total_time ? Math.round(parseFloat(usage.total_time) * 1000) : null;
                    result.totalTokens = usage.total_tokens || null;
                }
                if (message?.executed_tools) {
                    result.executedTools = message.executed_tools;
                }
            }
            
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
    /**
     * Convert text to speech using Groq TTS API (Orpheus) with Google TTS and Web Speech fallbacks
     * @param {string} text - Text to convert to speech
     * @returns {Promise<string>} Audio URL or status
     */
    async textToSpeech(text) {
        try {
            if (text.length > CONFIG.AUDIO.MAX_TEXT_LENGTH) {
                throw new Error('TEXT_TOO_LONG');
            }

            const apiKey = await StorageManager.getApiKey();
            const savedVoice = await StorageManager.getTtsVoice();
            const savedDirection = await StorageManager.getTtsDirection();
            const savedTtsModel = (typeof StorageManager !== 'undefined' && StorageManager.getTtsModel) ? await StorageManager.getTtsModel() : null;

            // Language detection
            const detectedLang = Utils.detectLanguage ? Utils.detectLanguage(text) : 'english';
            const isArabic = detectedLang === 'arabic' || /[\u0600-\u06ff]/.test(text);
            const isEnglish = detectedLang === 'english' || /^[a-zA-Z\s.,!?;:'"()-]+$/.test(text);

            // Option 1: Groq Orpheus API (Supports English & Arabic)
            if (apiKey && (isEnglish || isArabic)) {
                try {
                    const ttsModel = isArabic ? "canopylabs/orpheus-arabic-saudi" : (savedTtsModel || CONFIG.API.TTS_MODEL || "canopylabs/orpheus-v1-english");
                    const voice = isArabic ? "fahad" : (savedVoice || "hannah");

                    let inputText = text.trim();
                    if (!/[.!?]$/.test(inputText)) {
                        inputText = `${inputText}.`;
                    }
                    inputText = inputText.slice(0, 200);

                    if (!isArabic && savedDirection && savedDirection !== 'none') {
                        inputText = `${savedDirection} ${inputText}`.slice(0, 200);
                    }

                    const response = await fetch(CONFIG.API.TTS_ENDPOINT, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: ttsModel,
                            input: inputText,
                            voice: voice,
                            response_format: "wav"
                        })
                    });

                    if (response.ok) {
                        const audioBlob = await response.blob();
                        if (audioBlob && audioBlob.size > 0) {
                            return URL.createObjectURL(new Blob([audioBlob], { type: audioBlob.type || 'audio/wav' }));
                        }
                    } else {
                        const errText = await response.text();
                        console.warn("Groq Orpheus TTS failed, trying fallback:", errText);
                    }
                } catch (groqErr) {
                    console.warn("Groq TTS error:", groqErr);
                }
            }

            // Option 2: High Quality Google TTS API (Supports all languages: Vietnamese, English, Japanese...)
            try {
                const langCodeMap = {
                    english: 'en', vietnamese: 'vi', japanese: 'ja', korean: 'ko',
                    chinese: 'zh', french: 'fr', german: 'de', spanish: 'es',
                    russian: 'ru', italian: 'it', portuguese: 'pt', thai: 'th', arabic: 'ar'
                };
                const targetLang = langCodeMap[detectedLang] || 'vi';
                const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text.slice(0, 200))}&tl=${targetLang}&client=tw-ob`;
                
                const gRes = await fetch(googleTtsUrl);
                if (gRes.ok) {
                    const gBlob = await gRes.blob();
                    if (gBlob && gBlob.size > 0) {
                        return URL.createObjectURL(new Blob([gBlob], { type: 'audio/mpeg' }));
                    }
                }
            } catch (gErr) {
                console.warn("Google TTS fallback error:", gErr);
            }

            // Option 3: Browser Native Web Speech API
            return await this.speakWebSpeech(text);

        } catch (error) {
            console.error("TTS error:", error);
            return await this.speakWebSpeech(text);
        }
    },

    /**
     * Speak text using browser native Web Speech API (speechSynthesis)
     * @param {string} text - Text to speak
     * @returns {Promise<string>} Special status flag for Web Speech API
     */
    speakWebSpeech(text) {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                return reject(new Error("Trình duyệt không hỗ trợ Web Speech API."));
            }
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                const utterance = new SpeechSynthesisUtterance(text);
                
                const detected = Utils.detectLanguage ? Utils.detectLanguage(text) : 'english';
                const langMap = {
                    english: 'en-US', vietnamese: 'vi-VN', japanese: 'ja-JP',
                    korean: 'ko-KR', chinese: 'zh-CN', french: 'fr-FR',
                    german: 'de-DE', spanish: 'es-ES', russian: 'ru-RU',
                    italian: 'it-IT', portuguese: 'pt-PT', thai: 'th-TH', arabic: 'ar-SA'
                };
                utterance.lang = langMap[detected] || 'en-US';
                utterance.rate = 0.95;

                utterance.onend = () => {
                    if (typeof AudioManager !== 'undefined' && AudioManager._resetAudioButtonState) {
                        AudioManager._resetAudioButtonState();
                    }
                };

                utterance.onerror = (e) => {
                    console.warn("SpeechSynthesis error:", e);
                    if (typeof AudioManager !== 'undefined' && AudioManager._resetAudioButtonState) {
                        AudioManager._resetAudioButtonState();
                    }
                };

                window.speechSynthesis.speak(utterance);
                resolve('WEB_SPEECH_PLAYING');
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Transcribe speech to text using Groq Whisper API (whisper-large-v3-turbo)
     * @param {Blob} audioBlob - Audio Blob recording
     * @returns {Promise<string>} Transcribed text
     */
    async transcribeAudio(audioBlob) {
        try {
            const apiKey = await StorageManager.getApiKey();
            if (!apiKey) {
                throw new Error('API_KEY_NOT_FOUND');
            }

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', CONFIG.API.STT_MODEL || 'whisper-large-v3-turbo');

            const response = await fetch(CONFIG.API.STT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`STT_ERROR_${response.status}: ${errText}`);
            }

            const data = await response.json();
            return data.text || '';
        } catch (error) {
            console.error('Groq Whisper STT error:', error);
            throw error;
        }
    },

    /**
     * Perform OCR and Translate text inside an image using Groq Vision model (qwen/qwen3.6-27b)
     * @param {string} base64Image - Base64 encoded image string
     * @param {string} targetLanguage - Target language (default: 'Vietnamese')
     * @returns {Promise<object>} Translation result
     */
    async translateImage(base64Image, targetLanguage = 'Vietnamese') {
        try {
            const apiKey = await StorageManager.getApiKey();
            if (!apiKey) {
                throw new Error('API_KEY_NOT_FOUND');
            }

            const prompt = `Extract all text in this image (OCR) and translate it into ${targetLanguage}. Return a JSON object with:
{
  "detectedLanguage": "language of extracted text",
  "originalText": "all extracted text from image",
  "translated": "translated text in ${targetLanguage}",
  "explanation": "brief description of image content"
}`;

            const formattedImageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;

            const response = await fetch(CONFIG.API.ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "qwen/qwen3.6-27b",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: { url: formattedImageUrl }
                                }
                            ]
                        }
                    ],
                    temperature: 0.2,
                    max_completion_tokens: 2048,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`VISION_ERROR_${response.status}: ${errText}`);
            }

            const responseData = await response.json();
            const message = responseData.choices?.[0]?.message;
            const text = message?.content || message?.reasoning || "";
            const cleanedText = Utils.cleanJson(text);
            
            return JSON.parse(cleanedText);
        } catch (error) {
            console.error('Groq Vision OCR translation error:', error);
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
                    message: `Có phiên bản mới ${latestVersion} sẵn sàng cập nhật!`
                };
            } else {
                return { 
                    hasUpdate: false,
                    currentVersion: currentVersion,
                    latestVersion: latestVersion,
                    releaseName: releaseName,
                    message: `Đang sử dụng ${releaseName} - phiên bản mới nhất`
                };
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            return { 
                hasUpdate: false, 
                error: error.message,
                currentVersion: chrome.runtime.getManifest().version,
                message: "Không thể kiểm tra cập nhật: " + error.message
            };
        }
    },
    
    /**
     * Build system prompt for AI translation
     * @private
    /**
     * Build system prompt for AI translation
     * @private
     */
    _buildSystemPrompt() {
        return `You are a world-class translation engine and dictionary AI. Output ONLY raw valid JSON starting with '{'. Do NOT include markdown code blocks or extra text.`;
    },

    /**
     * Get English name of target language for LLM prompt
     * @private
     */
    _getTargetLanguageForLLM(targetLanguage) {
        const map = {
            'Vietnamese': 'Vietnamese',
            'tiếng Việt': 'Vietnamese',
            'English': 'English',
            'tiếng Anh': 'English',
            'Japanese': 'Japanese',
            'tiếng Nhật': 'Japanese',
            'Korean': 'Korean',
            'tiếng Hàn': 'Korean',
            'Chinese': 'Chinese',
            'tiếng Trung': 'Chinese',
            'French': 'French',
            'tiếng Pháp': 'French',
            'German': 'German',
            'tiếng Đức': 'German',
            'Spanish': 'Spanish',
            'tiếng Tây Ban Nha': 'Spanish',
            'Italian': 'Italian',
            'tiếng Ý': 'Italian',
            'Russian': 'Russian',
            'tiếng Nga': 'Russian',
            'Portuguese': 'Portuguese',
            'tiếng Bồ Đào Nha': 'Portuguese',
            'Thai': 'Thai',
            'tiếng Thái': 'Thai',
            'Indonesian': 'Indonesian',
            'tiếng Indonesia': 'Indonesian',
            'Malay': 'Malay',
            'tiếng Malaysia': 'Malay',
            'Arabic': 'Arabic',
            'tiếng Ả Rập': 'Arabic',
            'Hindi': 'Hindi',
            'tiếng Hindi': 'Hindi'
        };
        return map[targetLanguage] || targetLanguage;
    },

    /**
     * Build translation prompt based on input type and target language
     * @private
     */
    _buildTranslationPrompt(input, isSingleWord, targetLanguage = 'Vietnamese') {
        const escapedInput = input.replace(/"/g, '\\"');
        const llmTargetLang = this._getTargetLanguageForLLM(targetLanguage);
        const displayTargetLang = this._getTargetLanguageDisplay(targetLanguage);
        
        if (isSingleWord) {
            return `Translate and define term: "${escapedInput}" into ${llmTargetLang}.
All output fields ("meaning", "description", "partOfSpeech", "examplesTranslated") MUST be written 100% in ${llmTargetLang}.
"synonyms" & "otherWordForms" in original language with part-of-speech in ${llmTargetLang}.

Return JSON strictly matching schema:
{
  "detectedLanguage": "input language name",
  "targetLanguage": "${displayTargetLang}",
  "meaning": "concise definition/translation in ${llmTargetLang} (1-5 words)",
  "transcription": "/IPA/ or empty string",
  "partOfSpeech": "part of speech in ${llmTargetLang}",
  "description": "contextual explanation in ${llmTargetLang} (1-2 sentences)",
  "examples": ["example 1 in original lang", "example 2 in original lang"],
  "examplesTranslated": ["example 1 in ${llmTargetLang}", "example 2 in ${llmTargetLang}"],
  "synonyms": ["synonym in original lang (partOfSpeech in ${llmTargetLang})"],
  "otherWordForms": ["word form in original lang (form in ${llmTargetLang})"]
}

INPUT: "${escapedInput}"`;
        } else {
            return `Translate text into ${llmTargetLang}. The "translated" field MUST be 100% in ${llmTargetLang}.

Return JSON strictly matching schema:
{
  "detectedLanguage": "input language name",
  "targetLanguage": "${displayTargetLang}",
  "original": "${escapedInput}",
  "transcription": "",
  "translated": "clean, accurate translation in ${llmTargetLang}"
}

INPUT: "${escapedInput}"`;
        }
    },
    
    /**
     * Get target language display name in Vietnamese
     * @private
     */
    _getTargetLanguageDisplay(targetLanguage) {
        const languageMap = {
            'Vietnamese': 'tiếng Việt',
            'tiếng Việt': 'tiếng Việt',
            'English': 'tiếng Anh',
            'tiếng Anh': 'tiếng Anh',
            'Japanese': 'tiếng Nhật',
            'tiếng Nhật': 'tiếng Nhật',
            'Korean': 'tiếng Hàn',
            'tiếng Hàn': 'tiếng Hàn',
            'Chinese': 'tiếng Trung',
            'tiếng Trung': 'tiếng Trung',
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
     * Sanitize translation result to purge hallucinated placeholder strings and junk forms
     * @private
     */
    _sanitizeTranslationResult(result, originalInput, targetLanguage) {
        if (!result) return null;

        const targetDisplay = this._getTargetLanguageDisplay(targetLanguage);
        result.targetLanguage = targetDisplay;

        // Clean detectedLanguage
        const detected = (result.detectedLanguage || '').toLowerCase();
        if (!result.detectedLanguage || 
            detected.includes('tên ngôn ngữ') || 
            detected.includes('detected') || 
            detected.includes('bằng') ||
            (detected.includes('pháp') && !originalInput.match(/[àâäéèêëïîôöùûüÿç]/i) && originalInput.match(/^[a-zA-Z\s.,!?;:'"()-]+$/))) {
            
            const detectedKey = Utils.detectLanguage ? Utils.detectLanguage(originalInput) : 'english';
            const langNameMap = {
                english: 'tiếng Anh',
                vietnamese: 'tiếng Việt',
                japanese: 'tiếng Nhật',
                korean: 'tiếng Hàn',
                chinese: 'tiếng Trung',
                french: 'tiếng Pháp',
                german: 'tiếng Đức',
                spanish: 'tiếng Tây Ban Nha',
                russian: 'tiếng Nga',
                italian: 'tiếng Ý',
                portuguese: 'tiếng Bồ Đào Nha',
                thai: 'tiếng Thái',
                arabic: 'tiếng Ả Rập'
            };
            result.detectedLanguage = langNameMap[detectedKey] || 'tiếng Anh';
        }

        // Clean transcription (IPA)
        if (result.transcription) {
            const transLower = result.transcription.toLowerCase();
            if (transLower.includes('phiên âm') || 
                transLower.includes('ngôn ngữ gốc') || 
                transLower.includes('nếu có') || 
                transLower.includes('dạng của') ||
                transLower.includes('phát âm ipa')) {
                result.transcription = '';
            }
        }

        // Clean translated
        if (result.translated) {
            let trans = result.translated.trim();
            if (/^(bản dịch chính xác|bản dịch|dịch chính xác)\s*(sang|tiếng)?\s*[\:\-]*/i.test(trans)) {
                trans = trans.replace(/^(bản dịch chính xác|bản dịch|dịch chính xác)\s*(sang\s+[^\:\-]+)?[\:\-]*\s*/i, '');
            }
            result.translated = trans;
        }

        // Clean meaning - ensure short and punchy
        if (result.meaning) {
            let m = result.meaning.trim();
            if (/^(nghĩa chính xác|nghĩa tiếng việt|nghĩa của từ)\s*[\:\-]*/i.test(m)) {
                m = m.replace(/^(nghĩa chính xác|nghĩa tiếng việt|nghĩa của từ)\s*[\:\-]*\s*/i, '');
            }
            // Strip long parenthetical explanations in meaning if description exists
            if (result.description && m.includes('(') && m.length > 40) {
                m = m.replace(/\s*\([^)]*\)/g, '').trim();
            }
            result.meaning = m;
        }

        // Clean description
        if (result.description) {
            let desc = result.description.trim();
            if (/^(giải thích|giải thích ngữ cảnh|ngữ cảnh)\s*[\:\-]*/i.test(desc)) {
                desc = desc.replace(/^(giải thích|giải thích ngữ cảnh|ngữ cảnh)\s*[\:\-]*\s*/i, '');
            }
            result.description = desc;
        }

        // Filter out junk synonyms and word forms
        const origLower = originalInput.toLowerCase().trim();
        const cleanTags = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.filter(item => {
                if (typeof item !== 'string') return false;
                const clean = item.trim().toLowerCase();
                if (!clean || clean === origLower) return false;
                if (clean.includes('-compliant') || clean.includes('versioning') && origLower === 'semver') return false;
                if (clean.includes('từ đồng nghĩa') || clean.includes('biến thể')) return false;
                return true;
            });
        };

        result.synonyms = cleanTags(result.synonyms);
        result.otherWordForms = cleanTags(result.otherWordForms);

        return result;
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
            
            // Fourth try: trailing comma and line-break normalization without stripping Unicode
            const aggressiveClean = cleanedText
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/,\s*([}\]])/g, '$1')
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