// API service module for KimiZK-Translator
const ApiService = {
    // Cooldown tracker for rate-limited API keys (key -> timestamp)
    keyCooldowns: {},

    /**
     * Translate text using Groq API
     * @param {string} input - Text to translate
     * @param {boolean} isSingleWord - Whether input is a single word
     * @param {string} targetLanguage - Target language for translation (default: 'Vietnamese')
     * @returns {Promise<object|null>} Translation result
     */
    async translate(input, isSingleWord, targetLanguage = 'Vietnamese') {
        try {
            const apiKeys = (typeof StorageManager !== 'undefined' && StorageManager.getApiKeys) 
                ? await StorageManager.getApiKeys() 
                : [];
            
            if (apiKeys.length === 0) {
                const singleKey = await StorageManager.getApiKey();
                if (singleKey) apiKeys.push(singleKey);
            }

            if (apiKeys.length === 0) {
                throw new Error('API_KEY_NOT_FOUND');
            }
            
            const systemPrompt = this._buildSystemPrompt();
            const prompt = this._buildTranslationPrompt(input, isSingleWord, targetLanguage);
            
            const savedModel = (typeof StorageManager !== 'undefined' && StorageManager.getSelectedModel) 
                ? await StorageManager.getSelectedModel() 
                : CONFIG.API.MODEL;
            const primaryModel = savedModel || CONFIG.API.MODEL || "llama-3.3-70b-versatile";
            
            // Priority ordered fallback models list
            const fallbackModels = [primaryModel, "llama-3.1-8b-instant", "groq/compound-mini", "qwen/qwen3.6-27b"].filter((v, i, a) => a.indexOf(v) === i);
            
            let response = null;
            let errText = "";
            let usedModel = primaryModel;
            let usedKeyIndex = 0;
            let success = false;

            // SMART MATRIX FALLBACK STRATEGY:
            // Outer loop tries highest quality models first.
            // Inner loop tries all available API keys before downgrading model quality!
            matrixLoop: for (const currentModel of fallbackModels) {
                for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
                    const key = apiKeys[keyIdx];
                    
                    // Skip key if it's currently on a active 60s rate-limit cooldown (unless all keys are in cooldown)
                    if (this.keyCooldowns[key] && Date.now() < this.keyCooldowns[key] && apiKeys.length > 1) {
                        console.info(`[Groq Fallback] Key #${keyIdx + 1} is in 60s rate limit cooldown. Trying next key...`);
                        continue;
                    }

                    usedModel = currentModel;
                    usedKeyIndex = keyIdx;

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 12000);

                        response = await fetch(CONFIG.API.ENDPOINT, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${key}`
                            },
                            body: JSON.stringify({
                                messages: [
                                    { role: "user", content: `${systemPrompt}\n\n${prompt}` }
                                ],
                                model: currentModel,
                                temperature: 0.2,
                                max_completion_tokens: 2048,
                                top_p: 1,
                                stream: false
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);

                        if (response.ok) {
                            success = true;
                            // Clear cooldown for working key
                            delete this.keyCooldowns[key];
                            break matrixLoop;
                        }

                        errText = await response.text();
                        console.warn(`[Groq API Fallback] Key #${keyIdx + 1} with model "${currentModel}" returned status ${response.status}:`, errText);

                        // If 429 Rate Limit Exceeded (Tokens/Requests limit hit)
                        if (response.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('TPM') || errText.includes('RPM')) {
                            // Put this key in 60-second cooldown
                            this.keyCooldowns[key] = Date.now() + 60000;
                            console.info(`[Groq Fallback] 429 Rate Limit hit on Key #${keyIdx + 1}. Auto-switching to next key/model...`);
                            continue;
                        } else if (response.status === 401 || errText.includes('invalid_api_key')) {
                            console.warn(`[Groq Fallback] Key #${keyIdx + 1} invalid (401). Skipping key...`);
                            continue;
                        } else {
                            // Non-rate-limit error (e.g. model unavailable/decommissioned), try next model
                            break;
                        }
                    } catch (netErr) {
                        console.warn(`Network error on Key #${keyIdx + 1} (${currentModel}):`, netErr);
                    }
                }
            }

            // Record rate limit headers if present
            if (response && typeof StorageManager !== 'undefined' && StorageManager.updateRateLimits) {
                StorageManager.updateRateLimits(response.headers);
            }

            if (!success || !response || !response.ok) {
                if ((response && response.status === 413) || errText.includes('request_too_large') || errText.includes('Request Entity Too Large') || errText.includes('Content Too Large')) {
                    throw new Error(`Nội dung cần dịch quá lớn (Lỗi 413: Content Too Large). Vui lòng bôi đen hoặc nhập đoạn văn ngắn hơn.`);
                }
                if ((response && response.status === 429) || errText.includes('rate_limit_exceeded')) {
                    throw new Error(`Tất cả ${apiKeys.length} API Key & mô hình Groq hiện đã chạm giới hạn 100k token/ngày của Groq Free Tier. Vui lòng thêm thêm API Key phụ trong Cấu hình (Options) hoặc thử lại sau 1 phút.`);
                }
                if (errText.includes('model_decommissioned')) {
                    throw new Error(`Mô hình AI này (${usedModel}) đã bị Groq ngừng hỗ trợ. Vui lòng đổi sang Model khác trong Options.`);
                }
                if (errText.includes('model_not_found')) {
                    throw new Error(`Không tìm thấy mô hình AI (${usedModel}). Vui lòng chọn Model khác trong Options.`);
                }
                if (errText.includes('blocked_api_access')) {
                    throw new Error(`Tài khoản Groq API của bạn đã vượt quá Hạn mức Ngân sách hàng tháng (Spend Limit). Vui lòng kiểm tra Bảng điều khiển Groq Console.`);
                }
                if ((response && response.status === 498) || errText.includes('capacity_exceeded')) {
                    throw new Error(`Dung lượng hệ thống Groq Flex tier đang bận (498). Vui lòng thử lại sau vài giây.`);
                }
                throw new Error(`API_ERROR_${response ? response.status : 'FETCH'}: ${errText || (response ? response.statusText : 'Lỗi kết nối mạng')}`);
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

            // Automatically record recent language & translation history
            if (StorageManager.addRecentLanguage) {
                StorageManager.addRecentLanguage(targetLanguage);
            }
            if (StorageManager.addTranslationHistory && result) {
                StorageManager.addTranslationHistory({
                    type: 'text',
                    originalText: input,
                    translatedText: result.translated || result.meaning || '',
                    targetLang: targetLanguage,
                    timestamp: Date.now()
                });
            }
            
            if (!result) {
                console.error('Failed to parse API response');
                return null;
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
            if (!text || !String(text).trim()) {
                console.warn('Cannot perform TTS on empty text');
                return null;
            }
            const cleanText = String(text).trim();
            if (cleanText.length > CONFIG.AUDIO.MAX_TEXT_LENGTH) {
                throw new Error('TEXT_TOO_LONG');
            }

            const apiKey = await StorageManager.getApiKey();
            const savedVoice = await StorageManager.getTtsVoice();
            const savedDirection = await StorageManager.getTtsDirection();
            const savedTtsModel = (typeof StorageManager !== 'undefined' && StorageManager.getTtsModel) ? await StorageManager.getTtsModel() : null;

            // Language detection (use English key names, NOT Vietnamese display names)
            const detectedLang = this._detectLangKey(text);
            const isArabic = detectedLang === 'arabic' || /[\u0600-\u06ff]/.test(text);
            const isEnglish = detectedLang === 'english' || /^[a-zA-Z\s.,!?;:'"()-]+$/.test(text);



            const puterToken = (typeof StorageManager !== 'undefined' && StorageManager.getPuterToken) ? await StorageManager.getPuterToken() : null;

            // Option 0: Puter AI TTS (Requires Puter Auth Token)
            if (savedTtsModel && savedTtsModel.startsWith('puter-') && puterToken) {
                try {
                    const puterDriversUrl = "https://api.puter.com/drivers/call";
                    const langCodeMap = {
                        english: 'en-US', vietnamese: 'vi-VN', japanese: 'ja-JP', korean: 'ko-KR',
                        chinese: 'zh-CN', french: 'fr-FR', german: 'de-DE', spanish: 'es-ES',
                        russian: 'ru-RU', italian: 'it-IT', portuguese: 'pt-PT', thai: 'th-TH', arabic: 'ar-SA'
                    };
                    const bcp47Lang = langCodeMap[detectedLang] || 'vi-VN';
                    const shortLang = bcp47Lang.split('-')[0];

                    let providerName = "aws-polly";
                    let providerArgs = { text: cleanText.slice(0, 2500), provider: "aws-polly", language: bcp47Lang, voice: "Joanna", engine: "neural" };

                    if (savedTtsModel === 'puter-openai') {
                        providerName = "openai";
                        providerArgs = { text: cleanText.slice(0, 2500), provider: "openai", model: "gpt-4o-mini-tts", voice: "nova", response_format: "mp3" };
                    } else if (savedTtsModel === 'puter-gemini') {
                        providerName = "gemini";
                        providerArgs = { text: cleanText.slice(0, 2500), provider: "gemini", model: "gemini-2.5-flash-preview-tts", voice: "Puck" };
                    } else if (savedTtsModel === 'puter-elevenlabs') {
                        providerName = "elevenlabs";
                        providerArgs = { text: cleanText.slice(0, 2500), provider: "elevenlabs", model: "eleven_multilingual_v2" };
                    } else if (savedTtsModel === 'puter-xai') {
                        providerName = "xai";
                        providerArgs = { text: cleanText.slice(0, 2500), provider: "xai", voice: "eve", language: shortLang };
                    } else if (savedTtsModel === 'puter-speechify') {
                        providerName = "speechify";
                        providerArgs = { text: cleanText.slice(0, 2500), provider: "speechify", model: "simba-3.2", voice: "geffen_32" };
                    }

                    // Try requested provider, then fallback to aws-polly / openai if needed
                    const providersToTry = [providerName, "aws-polly", "openai"].filter((v, i, a) => a.indexOf(v) === i);

                    for (const currentProvider of providersToTry) {
                        try {
                            const currentArgs = { ...providerArgs, provider: currentProvider };
                            const puterRes = await fetch(puterDriversUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${puterToken}`
                                },
                                body: JSON.stringify({
                                    interface: "puter-tts",
                                    driver: "ai-tts",
                                    method: "synthesize",
                                    args: currentArgs
                                })
                            });

                            if (puterRes.ok) {
                                const contentType = puterRes.headers.get("content-type") || "";
                                if (contentType.includes("audio") || contentType.includes("octet") || contentType.includes("mpeg") || contentType.includes("mp3") || contentType.includes("wav")) {
                                    const pBlob = await puterRes.blob();
                                    if (pBlob && pBlob.size > 100) {
                                        return URL.createObjectURL(new Blob([pBlob], { type: pBlob.type || 'audio/mp3' }));
                                    }
                                } else {
                                    const pJson = await puterRes.json();
                                    const audioSrc = pJson.result?.audio || pJson.result?.audio_url || pJson.audio || pJson.audio_url || pJson.result?.url || pJson.result;
                                    if (typeof audioSrc === 'string' && audioSrc.startsWith('http')) {
                                        return audioSrc;
                                    }
                                    if (pJson.result && pJson.result instanceof Blob) {
                                        return URL.createObjectURL(pJson.result);
                                    }
                                }
                            } else {
                                const errBody = await puterRes.text();
                                console.warn(`Puter Provider "${currentProvider}" returned status ${puterRes.status}:`, errBody);
                            }
                        } catch (providerErr) {
                            console.warn(`Puter Provider "${currentProvider}" fetch error:`, providerErr);
                        }
                    }
                } catch (puterErr) {
                    console.warn("Puter Drivers TTS failed, falling back to Edge Neural AI:", puterErr);
                }
            }

            // Option 0.5: Microsoft Edge Neural AI TTS (Primary - Free, No Key, High Quality Neural Voice)
            if (!savedTtsModel || savedTtsModel === 'edge-tts' || savedTtsModel === 'google-translate') {
                try {
                    const edgeAudioUrl = await this.speakEdgeTts(cleanText, savedVoice);
                    if (edgeAudioUrl) return edgeAudioUrl;
                } catch (edgeErr) {
                    console.warn("Edge Neural TTS failed, trying Google TTS fallback:", edgeErr);
                }
            }

            // Option 1: Groq Orpheus API (Supports English & Arabic when valid key and model present)
            if (apiKey && (isEnglish || isArabic)) {
                try {
                    const validGroqModel = (savedTtsModel && savedTtsModel.startsWith("canopylabs/")) 
                        ? savedTtsModel 
                        : (isArabic ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english");
                    const VALID_GROQ_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy', 'fahad', 'lulwa', 'noura', 'aisha', 'abdullah', 'sultan'];
                    const groqVoice = isArabic ? "fahad" : (VALID_GROQ_VOICES.includes(savedVoice) ? savedVoice : "hannah");

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
                            model: validGroqModel,
                            input: inputText,
                            voice: groqVoice,
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
     * Synthesize natural speech using Microsoft Edge Neural TTS (Free, No Key required)
     * @param {string} text 
     * @param {string} voice 
     * @returns {Promise<string>} Audio Blob URL
     */
    async speakEdgeTts(text, voice = '') {
        return new Promise((resolve, reject) => {
            try {
                const detectedLang = ApiService._detectLangKey(text);
                const isEnglish = detectedLang === 'english' || /^[a-zA-Z\s.,!?;:'"()-]+$/.test(text);
                const selectedVoice = voice || (isEnglish ? 'en-US-AvaNeural' : 'vi-VN-HoaiMyNeural');

                const TRUSTED_TOKEN = "6A5AA1D4E5C54E9C8150F55F759D4184";
                const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}`;
                const ws = new WebSocket(wsUrl);
                const audioChunks = [];

                const timeout = setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                        ws.close();
                    }
                    if (audioChunks.length > 0) {
                        const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject(new Error('Edge TTS Timeout'));
                    }
                }, 8000);

                ws.binaryType = 'arraybuffer';

                ws.onopen = () => {
                    const configMsg = "Path: speech.config\r\nContent-Type: application/json; charset=utf-8\r\n\r\n" + JSON.stringify({context:{synthesis:{audio:{metadataversion:"2020-02-25",format:"audio-24khz-48kbitrate-mono-mp3"}}}});
                    ws.send(configMsg);

                    const reqId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                        .map(b => b.toString(16).padStart(2, '0')).join('');

                    const safeText = String(text)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');

                    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'>` +
                                 `<voice name='${selectedVoice}'>${safeText}</voice></speak>`;

                    const ssmlMsg = "Path: ssml\r\nX-RequestId: " + reqId + "\r\nContent-Type: application/ssml+xml\r\n\r\n" + ssml;
                    ws.send(ssmlMsg);
                };

                ws.onmessage = (event) => {
                    if (typeof event.data === 'string') {
                        if (event.data.includes('Path: turn.end')) {
                            clearTimeout(timeout);
                            ws.close();
                            if (audioChunks.length > 0) {
                                const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                                resolve(URL.createObjectURL(blob));
                            } else {
                                reject(new Error('No audio data received'));
                            }
                        }
                    } else if (event.data instanceof ArrayBuffer) {
                        const view = new DataView(event.data);
                        if (event.data.byteLength > 2) {
                            const headerLength = view.getUint16(0);
                            if (event.data.byteLength > 2 + headerLength) {
                                const audioBuffer = event.data.slice(2 + headerLength);
                                audioChunks.push(new Blob([audioBuffer], { type: 'audio/mp3' }));
                            }
                        }
                    }
                };

                ws.onerror = (err) => {
                    clearTimeout(timeout);
                    ws.close();
                    if (audioChunks.length > 0) {
                        const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject(err);
                    }
                };

                ws.onclose = () => {
                    clearTimeout(timeout);
                    if (audioChunks.length > 0) {
                        const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                        resolve(URL.createObjectURL(blob));
                    }
                };
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Detect language key (returns English key name like 'english', 'vietnamese', NOT Vietnamese display name)
     * @param {string} text - Text to detect language
     * @returns {string} Language key in English
     */
    _detectLangKey(text) {
        if (!text || !CONFIG || !CONFIG.LANGUAGES) return 'english';
        for (const [langKey, pattern] of Object.entries(CONFIG.LANGUAGES)) {
            if (pattern.test(text)) {
                return langKey; // Returns 'english', 'vietnamese', 'japanese', etc.
            }
        }
        return 'english';
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
                
                const detected = ApiService._detectLangKey(text);
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
            const apiKeys = (typeof StorageManager !== 'undefined' && StorageManager.getApiKeys) 
                ? await StorageManager.getApiKeys() 
                : [];
            
            if (apiKeys.length === 0) {
                const singleKey = await StorageManager.getApiKey();
                if (singleKey) apiKeys.push(singleKey);
            }

            if (apiKeys.length === 0) {
                throw new Error('API_KEY_NOT_FOUND');
            }

            const prompt = `Extract all text in this image (OCR) line by line and translate it into ${targetLanguage}.
CRITICAL FORMATTING INSTRUCTION: Preserve the exact original line breaks, paragraph structure, and bullet points from the image using newline characters (\\n). Do NOT merge separate lines or paragraphs into one continuous block.

Return a JSON object with:
{
  "detectedLanguage": "language of extracted text",
  "originalText": "all extracted text with original line breaks (\\n)",
  "translated": "translated text in ${targetLanguage} preserving all original line breaks (\\n)",
  "explanation": "brief description of image content"
}`;

            const formattedImageUrl = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`;

            let response = null;
            let errText = "";
            let success = false;

            for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
                const key = apiKeys[keyIdx];

                if (this.keyCooldowns[key] && Date.now() < this.keyCooldowns[key] && apiKeys.length > 1) {
                    console.info(`[Groq Vision Fallback] Key #${keyIdx + 1} is in 60s cooldown. Trying next key...`);
                    continue;
                }

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    response = await fetch(CONFIG.API.ENDPOINT, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${key}`
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
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        success = true;
                        delete this.keyCooldowns[key];
                        break;
                    }

                    errText = await response.text();
                    console.warn(`[Groq Vision API] Key #${keyIdx + 1} failed (${response.status}):`, errText);

                    if (response.status === 429 || errText.includes('rate_limit_exceeded')) {
                        this.keyCooldowns[key] = Date.now() + 60000;
                        continue;
                    }
                } catch (netErr) {
                    errText = netErr.message;
                }
            }

            if (!success || !response || !response.ok) {
                throw new Error(`Vision API Error: ${response ? response.status : 'Network Fail'} - ${errText}`);
            }

            const responseData = await response.json();
            const message = responseData.choices?.[0]?.message;
            const text = message?.content || message?.reasoning || "";
            const cleanedText = Utils.cleanJson(text);
            const parsedResult = JSON.parse(cleanedText);

            // Automatically record OCR translation in History and Recent Languages
            if (typeof StorageManager !== 'undefined') {
                if (StorageManager.addRecentLanguage) {
                    StorageManager.addRecentLanguage(targetLanguage);
                }
                if (StorageManager.addTranslationHistory && parsedResult) {
                    StorageManager.addTranslationHistory({
                        type: 'ocr',
                        originalText: parsedResult.originalText || 'Trích xuất OCR từ ảnh',
                        translatedText: parsedResult.translated || '',
                        targetLang: targetLanguage,
                        timestamp: Date.now()
                    });
                }
            }

            return parsedResult;
        } catch (error) {
            console.error("Failed to parse vision response:", error);
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
CRITICAL FORMATTING INSTRUCTION: Preserve the exact original line breaks, paragraph structure, and bullet points from the source text using newline characters (\\n). Do NOT merge separate paragraphs or lines into a single continuous block.

Return JSON strictly matching schema:
{
  "detectedLanguage": "input language name",
  "targetLanguage": "${displayTargetLang}",
  "original": "${escapedInput}",
  "transcription": "",
  "translated": "clean, accurate translation in ${llmTargetLang} with preserved line breaks (\\n)"
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