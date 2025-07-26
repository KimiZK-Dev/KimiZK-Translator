const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TTS_ENDPOINT = "https://api.groq.com/openai/v1/audio/speech";

let API_KEY = null;

function loadApiKey() {
    return new Promise(resolve => {
        if (API_KEY) return resolve(API_KEY);
        chrome.storage.local.get(['API_KEY'], result => {
            API_KEY = result.API_KEY || null;
            resolve(API_KEY);
        });
    });
}

function showApiKeyPrompt() {
    stopCurrentAudio();
    popup?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'xt-apikey-overlay';
    overlay.id = 'xt-apikey-overlay';
    const box = document.createElement('div');
    box.className = 'xt-apikey-box';
    box.innerHTML = `
        <div class="xt-apikey-title">
            <span>🔑</span> Nhập API KEY để sử dụng dịch
        </div>
        <div class="xt-apikey-desc">Bạn cần nhập API KEY để sử dụng tiện ích. API KEY sẽ được lưu bảo mật trên máy bạn.<br><br>Liên hệ <a href='https://www.facebook.com/nhb.xyz' target='_blank'>Facebook</a> để được hướng dẫn lấy API KEY.</div>
        <input id="xt-apikey-input" type="text" class="xt-apikey-input" placeholder="Nhập API KEY tại đây..." />
        <button id="xt-apikey-save" class="xt-apikey-save">Lưu & sử dụng</button>
        <div id="xt-apikey-error" class="xt-apikey-error"></div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const input = box.querySelector('#xt-apikey-input');
    const saveBtn = box.querySelector('#xt-apikey-save');
    const errorDiv = box.querySelector('#xt-apikey-error');
    saveBtn.onclick = () => {
        const key = input.value.trim();
        if (!key || key.length < 10) {
            errorDiv.textContent = 'API KEY không hợp lệ!';
            errorDiv.style.display = 'block';
            return;
        }
        chrome.runtime.sendMessage({ action: "saveApiKey", key: key }, (response) => {
            if (response && response.success) {
                overlay.remove();
                showNotification('API KEY đã được lưu!', 'success');
            } else {
                errorDiv.textContent = 'Lỗi khi lưu API Key!';
                errorDiv.style.display = 'block';
            }
        });
    };
    input.onkeydown = e => {
        if (e.key === 'Enter') saveBtn.click();
    };
}

async function translate(input, isSingleWord) {
    await loadApiKey();
    if (!API_KEY) {
        showApiKeyPrompt();
        return null;
    }
    const escapedInput = escapeSpecialChars(input);
    const prompt = isSingleWord ?
        `Trả lời từ sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích, dịch nghĩa của từ và mô tả chắc chắn phải đúng chuẩn theo Oxford dictionary. Trả ra duy nhất 1 JSON ở dưới 

Format JSON:

{
  "meaning": "",                        (nghĩa dịch sang tiếng Việt của từ, ngắn gọn, chính xác)
  "transcription": "",                  (phiên âm theo chuẩn IPA)
  "partOfSpeech": "",                   (tiếng Việt, chỉ dùng: danh từ, đại từ, tính từ, động từ, trạng từ, giới từ, liên từ, từ hạn định, thán từ)
  "description": "",                    (mô tả ngắn gọn, dễ hiểu bằng tiếng Việt)
  "examples": [],                       (2 ví dụ bằng tiếng Anh, ngắn gọn, đúng ngữ cảnh)
  "examplesTranslated": [],             (dịch 2 ví dụ trên sang tiếng Việt, đúng ngữ pháp)
  "synonyms": [],                       (dạng: "từ (loại từ): nghĩa", đầy đủ từ đồng nghĩa)
  "otherWordForms": []                  (dạng: "từ (loại từ): nghĩa", đầy đủ biến thể)
}

Từ cần dịch: "${escapedInput.replace(/"/g, '\\"')}"` :
        `Trả lời văn bản sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích. Đối với văn bản ghi hoa toàn bộ như này: NOT GIVEN thì tự nhận diện văn bản đang dịch luôn giúp tớ (là Not given ấy, cái khác tương tự mà trả ra kết quả JSON CHÍNH XÁC theo như cho ở dưới đây!). Trả ra duy nhất 1 JSON ở dưới 

Format JSON:

{
  "original": "${escapedInput.replace(/"/g, '\\"')}",
  "transcription": "",                  (phiên âm theo chuẩn IPA của ngôn ngữ gốc, nếu theo dạng viết hoa toàn bộ thì để tự nhận diện như trên rồi cho ra kết quả phiên âm chuẩn IPA chuẩn)
  "translated": ""                      (dịch sang tiếng Việt, ngắn gọn, tự nhiên, đúng ngữ pháp)
}

Văn bản cần dịch: "${escapedInput.replace(/"/g, '\\"')}"`;

    try {
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                model: MODEL,
                temperature: 0.7,
                max_completion_tokens: 1024,
                top_p: 1,
                stream: false,
                stop: null
            })
        });

        if (!response.ok) throw new Error(`Translation API error: ${response.statusText}`);

        const { choices } = await response.json();
        const text = choices?.[0]?.message?.content || "";
        const cleanedText = cleanJson(text);

        try {
            return JSON.parse(cleanedText);
        } catch (parseErr) {
            console.error("Failed to parse JSON:", cleanedText, parseErr);
            const fixedText = cleanedText
                .replace(/(\w)"/g, '$1\\"')
                .replace(/\\(\s+)/g, '\\\\$1');
            try {
                return JSON.parse(fixedText);
            } catch (fixErr) {
                console.error("Failed to parse fixed JSON:", fixedText, fixErr);
                return null;
            }
        }
    } catch (err) {
        console.error("❌ Translation error:", err);
        return null;
    }
}

async function textToSpeech(text) {
    if (text.length > 10000) {
        showNotification("Văn bản quá dài (hơn 10.000 ký tự). Vui lòng rút ngắn văn bản.");
        return null;
    }
    if (ttsAudioCache[text]) {
        return ttsAudioCache[text];
    }
    try {
        const response = await fetch(TTS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "playai-tts",
                input: text.slice(0, 10000),
                voice: "Arista-PlayAI",
                response_format: "wav"
            })
        });

        if (!response.ok) {
            let errMsg = "Không thể tạo âm thanh. Vui lòng thử lại.";
            try {
                const errJson = await response.json();
                if (errJson?.error?.code === "rate_limit_exceeded") {
                    errMsg =
                        "Bạn đã hết lượt sử dụng chuyển văn bản thành giọng nói hôm nay. Vui lòng thử lại với văn bản ngắn hơn hoặc nâng cấp tài khoản!";
                }
            } catch {}
            showNotification(errMsg);
            return null;
        }

        const audioBlob = await response.blob();
        console.log("Audio Blob Type:", audioBlob.type);
        console.log("Audio Blob Size:", audioBlob.size);
        if (!audioBlob.type.includes("audio") || audioBlob.size === 0) {
            showNotification("File âm thanh không hợp lệ từ API.", "error");
            return null;
        }

        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "saveAudio",
                    audioBlob: audioBlob
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response || {});
                    }
                });
            });

            if (response.error) {
                showNotification(response.error, "error");
                return null;
            }
            const audioUrl = response.fileUrl;
            if (audioUrl) {
                console.log("Generated File URL:", audioUrl);
                ttsAudioCache[text] = audioUrl;
                return audioUrl;
            }
        } catch (err) {
            console.error("Lỗi khi lưu file âm thanh:", err);
            showNotification("Không thể lưu file âm thanh.", "error");
            return null;
        }

        showNotification("Không thể tạo URL âm thanh.", "error");
        return null;
    } catch (err) {
        console.error("❌ TTS error:", err);
        showNotification("Không thể tạo âm thanh. Vui lòng thử lại.", "error");
        return null;
    }
}