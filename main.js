const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TTS_ENDPOINT = "https://api.groq.com/openai/v1/audio/speech";

// Global state
let currentAudio = null;
let currentAudioUrl = null;
let popup = null;
let triggerIcon = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let notificationTimeout = null;
let isTabPressed = false;

// Simple in-memory cache for TTS audio URLs
const ttsAudioCache = {};

// Utility Functions
function cleanJson(text) {
    return text
        .replace(/```json\n?|\n?```/g, "")
        .replace(/`+/g, "")
        .trim();
}

function capitalizeFirstWord(text) {
    return text ? text.replace(/^\w/, c => c.toUpperCase()) : text;
}

function escapeSpecialChars(text) {
    return text.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Audio Management
function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    // Only revoke if not cached
    if (currentAudioUrl && !Object.values(ttsAudioCache).includes(currentAudioUrl)) {
        URL.revokeObjectURL(currentAudioUrl);
    }
    currentAudioUrl = null;
    document.querySelectorAll('.xt-audio-controls').forEach(control => control.remove());
}

// API Calls
async function translate(input, isSingleWord) {
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
            // Check for rate limit error
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
        const audioUrl = URL.createObjectURL(audioBlob);
        ttsAudioCache[text] = audioUrl;
        return audioUrl;
    } catch (err) {
        console.error("❌ TTS error:", err);
        showNotification("Không thể tạo âm thanh. Vui lòng thử lại.");
        return null;
    }
}

// Notification
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `xt-notification xt-notification-${type}`;
    let icon = "";
    if (type === "success") icon = "<span class='xt-notification-icon'>✅</span>";
    else if (type === "error") icon = "<span class='xt-notification-icon'>❌</span>";
    else if (type === "warning") icon = "<span class='xt-notification-icon'>⚠️</span>";
    else icon = "<span class='xt-notification-icon'>ℹ️</span>";
    notification.innerHTML = `
        <div class="xt-notification-content">
            ${icon}
            <span class="xt-notification-message">${message}</span>
            <span class="xt-notification-close" title="Đóng">×</span>
        </div>
    `;
    document.body.appendChild(notification);

    const popupRect = popup?.getBoundingClientRect() || { right: 0, top: 0 };
    Object.assign(notification.style, {
        position: 'fixed',
        zIndex: '2147483648',
        left: `${popupRect.right + 20}px`,
        top: `${popupRect.top}px`,
        opacity: '0',
        transform: 'translateY(-10px) scale(0.95)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    });

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0) scale(1)';
    }, 10);

    notification.querySelector(".xt-notification-close").addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
        clearTimeout(notificationTimeout);
    });

    notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Audio Controls
function createAudioControls(audioId) {
    return `
        <div class="xt-audio-controls" id="audio-controls-${audioId}">
            <div class="xt-audio-player">
                <div class="xt-audio-progress">
                    <div class="xt-progress-bar">
                        <div class="xt-progress-fill" style="width: 0%"></div>
                        <div class="xt-progress-handle"></div>
                    </div>
                    <div class="xt-time-display">
                        <span class="xt-current-time">0:00</span>
                        <span class="xt-total-time">0:00</span>
                    </div>
                </div>
                <div class="xt-audio-volume">
                    <span class="xt-volume-icon">🔊</span>
                    <div class="xt-volume-slider">
                        <input type="range" min="0" max="100" value="100" class="xt-volume-input">
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupAudioControls(audio, controlsId, popup) {
    const controls = document.getElementById(`audio-controls-${controlsId}`);
    if (!controls) return;

    const popupRect = popup.getBoundingClientRect();
    Object.assign(controls.style, {
        position: 'fixed',
        zIndex: '2147483647',
        left: `${popupRect.right + 10}px`,
        top: `${popupRect.top}px`
    });

    const elements = {
        progressBar: controls.querySelector('.xt-progress-bar'),
        progressFill: controls.querySelector('.xt-progress-fill'),
        progressHandle: controls.querySelector('.xt-progress-handle'),
        currentTime: controls.querySelector('.xt-current-time'),
        totalTime: controls.querySelector('.xt-total-time'),
        volumeInput: controls.querySelector('.xt-volume-input'),
        volumeIcon: controls.querySelector('.xt-volume-icon')
    };

    const formatTime = seconds => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const updateProgress = () => {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            elements.progressFill.style.width = `${progress}%`;
            elements.progressHandle.style.left = `${progress}%`;
            elements.currentTime.textContent = formatTime(audio.currentTime);
        }
    };

    audio.addEventListener('loadedmetadata', () => {
        elements.totalTime.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', updateProgress);

    audio.addEventListener('ended', () => {
        elements.progressFill.style.width = '0%';
        elements.progressHandle.style.left = '0%';
        elements.currentTime.textContent = '0:00';
        const button = popup?.querySelector('.xt-listen-btn');
        if (button) {
            button.querySelector('.xt-btn-icon').textContent = "🔊";
            button.querySelector('.xt-btn-text').textContent = "Nghe";
        }
    });

    let isDraggingProgress = false;
    const startProgressDrag = e => {
        e.preventDefault();
        isDraggingProgress = true;
        document.addEventListener('mousemove', updateProgressDrag);
        document.addEventListener('mouseup', stopProgressDrag);
    };

    const updateProgressDrag = e => {
        if (!isDraggingProgress) return;
        const rect = elements.progressBar.getBoundingClientRect();
        const percentage = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        audio.currentTime = audio.duration * percentage;
        updateProgress();
    };

    const stopProgressDrag = () => {
        isDraggingProgress = false;
        document.removeEventListener('mousemove', updateProgressDrag);
        document.removeEventListener('mouseup', stopProgressDrag);
    };

    elements.progressBar.addEventListener('mousedown', startProgressDrag);
    elements.progressHandle.addEventListener('mousedown', startProgressDrag);

    elements.volumeInput.addEventListener('input', e => {
        e.stopPropagation();
        const volume = e.target.value / 100;
        audio.volume = volume;
        elements.volumeIcon.textContent = volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';
    });

    elements.volumeIcon.addEventListener('click', e => {
        e.stopPropagation();
        audio.volume = audio.volume > 0 ? 0 : 1;
        elements.volumeInput.value = audio.volume * 100;
        elements.volumeIcon.textContent = audio.volume === 0 ? '🔇' : '🔊';
    });

    controls.addEventListener('click', e => e.stopPropagation());
}

function setupAudioButton(button, text, isSingleWord) {
    if (!button) return;
    const icon = button.querySelector('.xt-btn-icon');
    const textSpan = button.querySelector('.xt-btn-text');
    const audioId = Date.now();

    const toggleAudio = async () => {
        if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
            currentAudio.pause();
            icon.textContent = "▶️";
            textSpan.textContent = "Tiếp tục";
            return;
        }

        if (!currentAudio || currentAudio.ended) {
            stopCurrentAudio();
            button.disabled = true;
            icon.textContent = "⏳";
            textSpan.textContent = "Đang tải...";

            const audioUrl = await textToSpeech(text);
            if (audioUrl) {
                currentAudioUrl = audioUrl;
                currentAudio = new Audio(audioUrl);
                currentAudio.addEventListener('ended', () => {
                    icon.textContent = "🔊";
                    textSpan.textContent = "Nghe";
                });
                document.body.insertAdjacentHTML('beforeend', createAudioControls(audioId));
                setupAudioControls(currentAudio, audioId, popup);
                currentAudio.play();
            } else {
                icon.textContent = "🔊";
                textSpan.textContent = "Nghe";
                button.disabled = false;
                return;
            }
        } else {
            currentAudio.play();
        }

        icon.textContent = "⏸️";
        textSpan.textContent = "Dừng";
        button.disabled = false;
    };

    button.addEventListener('click', toggleAudio);
}

// Popup Management
function createPopup() {
    stopCurrentAudio();
    popup?.remove();
    popup = document.createElement("div");
    popup.className = "xt-translator-popup";
    popup.style.position = 'fixed';
    popup.style.zIndex = '2147483647';
    popup.style.left = '0px';
    popup.style.top = '0px';
    document.body.appendChild(popup);
    // KHÔNG gọi setupDragging ở đây nữa
    return popup;
}

function setupDragging(element) {
    const header = element.querySelector('.xt-translator-header');
    const dragOverlay = header?.querySelector('.xt-header-drag-overlay');
    if (!header || !dragOverlay) return;

    // Only handle drag events on the overlay
    const startDrag = e => {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = element.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        element.style.transition = 'none';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    };

    const drag = e => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - element.offsetWidth));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - element.offsetHeight));
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
        const audioControls = document.querySelector('.xt-audio-controls');
        if (audioControls) {
            audioControls.style.left = `${newX + element.offsetWidth + 10}px`;
            audioControls.style.top = `${newY}px`;
        }
    };

    const stopDrag = () => {
        isDragging = false;
        element.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    };

    dragOverlay.addEventListener('mousedown', startDrag);
    dragOverlay.querySelectorAll('*').forEach(child => {
        child.addEventListener('mousedown', e => e.stopPropagation());
    });
}

// Trigger Icon
function createTriggerIcon(selectionRect) {
    triggerIcon?.remove();
    triggerIcon = document.createElement("div");
    triggerIcon.className = "xt-trigger-icon";
    triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon16.png')}" alt="Translate">`;
    document.body.appendChild(triggerIcon);

    const padding = 10;
    Object.assign(triggerIcon.style, {
        position: 'fixed',
        zIndex: '2147483647',
        left: `${selectionRect.left}px`,
        top: `${selectionRect.bottom + padding}px`
    });
}

// Utility function to calculate popup position
function calculatePopupPosition(selectionRect) {
    const popupWidth = 400;
    const popupHeight = 350;
    const padding = 15;
    let left = selectionRect.left;
    let top = selectionRect.bottom + padding;

    // Adjust if popup would go off-screen
    if (left + popupWidth > window.innerWidth - padding) {
        left = window.innerWidth - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight - padding) {
        top = selectionRect.top - popupHeight - padding;
        if (top < padding) top = padding;
    }
    if (left < padding) left = padding;
    if (top < padding) top = padding;

    return { left, top };
}

// Main Event Handler
document.addEventListener("mouseup", e => {
    const selected = window.getSelection().toString().trim();
    if (!selected || e.target.closest('.xt-translator-popup') || e.target.closest('.xt-audio-controls') || e.target.closest('.xt-trigger-icon')) return;

    triggerIcon?.remove();
    const selectionRect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    createTriggerIcon(selectionRect);

    triggerIcon.addEventListener('click', async () => {
        triggerIcon.remove();
        const isSingleWord = selected.split(/\s+/).length === 1 && selected.length <= 50;
        const displayText = capitalizeFirstWord(selected);

        const popup = createPopup();
        popup.innerHTML = `
            <div class="xt-translator-header" style="position: relative;">
                <div class="xt-header-drag-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: move; z-index: 2; background: rgba(0,0,0,0);"></div>
                <div class="xt-translator-title">
                    <span class="xt-translator-icon">🔍</span>
                    <span class="xt-translator-word">${displayText}</span>
                </div>
                <div class="xt-translator-controls">
                    <span class="xt-translator-minimize" title="Thu gọn">−</span>
                    <span class="xt-translator-close" title="Đóng">×</span>
                </div>
            </div>
            <div class="xt-translator-content">
                <div class="xt-translator-loading">
                    <div class="xt-loading-spinner"></div>
                    <span>Đang dịch...</span>
                </div>
            </div>
        `;
        setupDragging(popup); // GỌI SAU KHI ĐÃ GÁN NỘI DUNG

        const { top, left } = calculatePopupPosition(selectionRect);
        Object.assign(popup.style, {
            top: `${top}px`,
            left: `${left}px`,
            opacity: '0',
            transform: 'translateY(-10px) scale(0.95)'
        });

        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0) scale(1)';
        });

        const content = popup.querySelector(".xt-translator-content");
        const closeBtn = popup.querySelector(".xt-translator-close");
        const minimizeBtn = popup.querySelector(".xt-translator-minimize");
        let isMinimized = false;

        closeBtn.addEventListener('click', () => {
            stopCurrentAudio();
            popup.remove();
        });

        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            content.style.display = isMinimized ? 'none' : 'block';
            minimizeBtn.textContent = isMinimized ? '+' : '−';
            minimizeBtn.title = isMinimized ? 'Mở rộng' : 'Thu gọn';
        });

        const result = await translate(selected, isSingleWord);
        if (!result) {
            content.innerHTML = `
                <div class="xt-translator-error">
                    <div class="xt-error-icon">⚠️</div>
                    <p>Không thể dịch "${displayText}"</p>
                    <span class="xt-error-subtitle">Định dạng phản hồi từ API không hợp lệ. Vui lòng thử lại sau.</span>
                </div>
            `;
            return;
        }

        const renderExamples = (examples, translations) => {
            return (examples || []).map((ex, i) => `
                <div class="xt-example-item">
                    <div class="xt-example-en">${escapeSpecialChars(ex)}</div>
                    <div class="xt-example-vi">${escapeSpecialChars(translations?.[i] || '–')}</div>
                </div>
            `).join('');
        };

        if (isSingleWord) {
            content.innerHTML = `
                <div class="xt-translator-main">
                    <div class="xt-main-info">
                        <h2 class="xt-word-title">${escapeSpecialChars(displayText)}</h2>
                        <div class="xt-action-buttons">
                            <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                                <span class="xt-btn-icon">🔊</span>
                                <span class="xt-btn-text">Nghe</span>
                            </button>
                        </div>
                        <div class="xt-phonetic">${escapeSpecialChars(result.transcription || '')}</div>
                        <div class="xt-part-of-speech">${escapeSpecialChars(result.partOfSpeech)}</div>
                    </div>
                    <div class="xt-meaning">
                        <h3>Nghĩa</h3>
                        <p>${escapeSpecialChars(result.meaning.charAt(0).toUpperCase() + result.meaning.slice(1))}</p>
                    </div>
                    <div class="xt-description">
                        <h3>Giải thích</h3>
                        <p>${escapeSpecialChars(result.description.charAt(0).toUpperCase() + result.description.slice(1))}</p>
                    </div>
                </div>
                <div class="xt-translator-secondary">
                    <div class="xt-section xt-examples">
                        <h3><span class="xt-section-icon">💡</span>Ví dụ</h3>
                        <div class="xt-examples-list">
                            ${renderExamples(result.examples, result.examplesTranslated)}
                        </div>
                    </div>
                    <div class="xt-section xt-synonyms">
                        <h3><span class="xt-section-icon">🔗</span>Từ đồng nghĩa</h3>
                        <div class="xt-tags">
                            ${(result.synonyms || []).map(s => `<span class="xt-tag">${escapeSpecialChars(s)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                        </div>
                    </div>
                    <div class="xt-section xt-word-forms">
                        <h3><span class="xt-section-icon">📝</span>Biến thể khác</h3>
                        <div class="xt-tags">
                            ${(result.otherWordForms || []).map(f => `<span class="xt-tag">${escapeSpecialChars(f)}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                        </div>
                    </div>
                </div>
                <div class="xt-translator-footer">
                    <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                    <div class="xt-footer-info">Powered by AI</div>
                </div>
            `;
            setupAudioButton(content.querySelector('.xt-listen-btn'), displayText, true);
        } else {
            content.innerHTML = `
                <div class="xt-translator-main">
                    <div class="xt-main-info">
                        <h2 class="xt-word-title">${escapeSpecialChars(displayText)}</h2>
                        <div class="xt-action-buttons">
                            <button class="xt-action-btn xt-listen-btn" title="Nghe văn bản gốc">
                                <span class="xt-btn-icon">🔊</span>
                                <span class="xt-btn-text">Nghe</span>
                            </button>
                            <button class="xt-action-btn xt-copy-btn" title="Sao chép văn bản dịch">
                                <span class="xt-btn-icon">📋</span>
                                <span class="xt-btn-text">Copy</span>
                            </button>
                        </div>
                        ${result.transcription ? `<div class="xt-phonetic">${escapeSpecialChars(result.transcription)}</div>` : ''}
                    </div>
                    <div class="xt-translation">
                        <h3>Dịch</h3>
                        <p>${escapeSpecialChars(result.translated)}</p>
                    </div>
                </div>
                <div class="xt-translator-footer">
                    <div class="xt-footer-brand"><span class="xt-brand-icon">✨</span>KimiZK Translator</div>
                    <div class="xt-footer-info">Powered by AI</div>
                </div>
            `;

            setupAudioButton(content.querySelector('.xt-listen-btn'), result.original, false);

            const copyBtn = content.querySelector(".xt-copy-btn");
            const copyIcon = copyBtn.querySelector(".xt-btn-icon");
            const copyText = copyBtn.querySelector(".xt-btn-text");

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(result.translated)
                    .then(() => {
                        copyIcon.textContent = "✅";
                        copyText.textContent = "Đã sao chép";
                        setTimeout(() => {
                            copyIcon.textContent = "📋";
                            copyText.textContent = "Copy";
                        }, 2000);
                    })
                    .catch(() => showNotification("Không thể sao chép văn bản."));
            });
        }
    });
});

// Close popup and icon on outside click
document.addEventListener('click', e => {
    if (popup && !popup.contains(e.target) && !e.target.closest('.xt-audio-controls') && !e.target.closest('.xt-trigger-icon') && !window.getSelection().toString().trim()) {
        stopCurrentAudio();
        popup.remove();
        triggerIcon?.remove();
    }
});

// Adjust popup position on scroll
document.addEventListener('scroll', () => {
    if (!popup || isDragging) return;

    const rect = popup.getBoundingClientRect();
    const padding = 15;
    let needsAdjustment = false;
    let newTop = parseInt(popup.style.top);
    let newLeft = parseInt(popup.style.left);

    if (rect.top < padding) {
        newTop = padding;
        needsAdjustment = true;
    }
    if (rect.bottom > window.innerHeight - padding) {
        newTop = window.innerHeight - rect.height - padding;
        needsAdjustment = true;
    }
    if (rect.left < padding) {
        newLeft = padding;
        needsAdjustment = true;
    }
    if (rect.right > window.innerWidth - padding) {
        newLeft = window.innerWidth - rect.width - padding;
        needsAdjustment = true;
    }

    if (needsAdjustment) {
        popup.style.top = `${Math.max(padding, newTop)}px`;
        popup.style.left = `${Math.max(padding, newLeft)}px`;
        const audioControls = document.querySelector('.xt-audio-controls');
        if (audioControls) {
            audioControls.style.left = `${Math.max(padding, newLeft) + popup.offsetWidth + 10}px`;
            audioControls.style.top = `${Math.max(padding, newTop)}px`;
        }
    }
});