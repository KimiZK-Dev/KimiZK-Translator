const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TTS_ENDPOINT = "https://api.groq.com/openai/v1/audio/speech";

// Global audio player state
let currentAudio = null;
let currentAudioUrl = null;
let popup = null;
let isDragging = false;
let dragOffset = {
    x: 0,
    y: 0
};

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

// Audio Management
function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
    }
    document.querySelectorAll('.xt-audio-controls').forEach(control => control.remove());
}

// API Calls
async function translate(input, isSingleWord) {
    const prompt = isSingleWord ?
        `Trả lời từ sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích, dịch nghĩa của từ và mô tả chắc chắn phải đúng chuẩn theo Oxford dictionary. Trả ra duy nhất 1 JSON ở dưới 

Format JSON:

{
  "meaning": "",                        (nghĩa dịch sang tiếng Việt của từ)
  "transcription": "",                  (nhận dạng theo ngôn ngữ được dịch)
  "partOfSpeech": "",                   (tiếng việt, thuộc những cái sau thôi không dài dòng: danh từ, đại từ, tính từ, động từ, trạng từ, giới từ, liên từ, từ hạn định, và thán từ)
  "description": "",                    (tiếng việt, mô tả của từ)
  "examples": [],                       (tiếng anh, 2 ví dụ với 2 phần tử riêng trong 1 mảng)
  "examplesTranslated": [],             (tiếng việt, dịch theo 2 ví dụ trên với 2 phần tử riêng trong 1 mảng)
  "synonyms": [],                       (Dạng: "từ (loại từ): nghĩa" ; Chắc chắn là đầy đủ từ đồng nghĩa khác)
  "otherWordForms": []                  (Dạng: "từ (loại từ): nghĩa" ; Chắc chắn 100 % là đầy đủ loại từ khác của nó)
}

Từ cần dịch: ${input.replace(/"/g, '\\"')}` :
        `Trả lời văn bản sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích. Trả ra duy nhất 1 JSON ở dưới 

Format JSON:

{
  "original": "${input.replace(/"/g, '\\"')}",
  "transcription": "",                  (nhận dạng phiên âm theo ngôn ngữ gốc bị dịch!, không phải tiếng Việt được dịch ra!!!)  
  "translated": ""
}

Văn bản cần dịch: ${input.replace(/"/g, '\\"')}`;

    try {
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: prompt
                }],
                model: MODEL,
                temperature: 1,
                max_completion_tokens: 1024,
                top_p: 1,
                stream: false,
                stop: null
            })
        });

        if (!response.ok) throw new Error(`Translation API error: ${response.statusText}`);

        const {
            choices
        } = await response.json();
        const text = choices?.[0]?.message?.content || "";
        console.log("Raw API response:", text);

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
                voice: "Fritz-PlayAI",
                response_format: "wav"
            })
        });

        if (!response.ok) throw new Error(`TTS API error: ${response.statusText}`);

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    } catch (err) {
        console.error("❌ TTS error:", err);
        return null;
    }
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
    });

    elements.progressBar.addEventListener('click', e => {
        e.stopPropagation();
        const rect = elements.progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        audio.currentTime = audio.duration * percentage;
    });

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
    const icon = button.querySelector('.xt-btn-icon');
    const textSpan = button.querySelector('.xt-btn-text');
    const audioId = Date.now();

    button.addEventListener('click', async () => {
        if (currentAudio && !currentAudio.paused) {
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
                document.body.insertAdjacentHTML('beforeend', createAudioControls(audioId));
                setupAudioControls(currentAudio, audioId, popup);
                currentAudio.play();
            } else {
                alert("Không thể tạo âm thanh. Vui lòng thử lại.");
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

        button.onclick = () => {
            if (currentAudio.paused) {
                currentAudio.play();
                icon.textContent = "⏸️";
                textSpan.textContent = "Dừng";
            } else {
                currentAudio.pause();
                icon.textContent = "▶️";
                textSpan.textContent = "Tiếp tục";
            }
        };
    });
}

// Popup Management
function createPopup() {
    stopCurrentAudio();
    popup?.remove();
    popup = document.createElement("div");
    popup.className = "xt-translator-popup";
    document.body.appendChild(popup);
    setupDragging(popup);
    return popup;
}

function setupDragging(element) {
    const header = element.querySelector('.xt-translator-header');
    if (!header) return;

    const startDrag = e => {
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
        element.style.transition = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    };

    header.style.cursor = 'move';
    header.addEventListener('mousedown', startDrag);
}

function calculatePopupPosition(selectionRect) {
    const popupWidth = 280;
    const popupHeight = 400;
    const padding = 15;

    let top = selectionRect.bottom + padding;
    let left = selectionRect.left;

    if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - padding;
    if (left < padding) left = padding;
    if (top + popupHeight > window.innerHeight) {
        top = selectionRect.top - popupHeight - padding;
        if (top < padding) top = Math.max(padding, (window.innerHeight - popupHeight) / 2);
    }

    return {
        top: Math.max(padding, top),
        left: Math.max(padding, left)
    };
}

// Main Event Handler
document.addEventListener("mouseup", async e => {
    const selected = window.getSelection().toString().trim();
    if (!selected || e.target.closest('.xt-translator-popup') || e.target.closest('.xt-audio-controls')) return;

    const isSingleWord = selected.split(/\s+/).length === 1 && selected.length <= 50;
    const displayText = capitalizeFirstWord(selected);

    const popup = createPopup();
    popup.innerHTML = `
        <div class="xt-translator-header">
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

    const {
        top,
        left
    } = calculatePopupPosition(window.getSelection().getRangeAt(0).getBoundingClientRect());
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

    if (isSingleWord) {
        content.innerHTML = `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title">${displayText}</h2>
                    <div class="xt-action-buttons">
                        <button class="xt-action-btn xt-listen-btn" title="Nghe phát âm">
                            <span class="xt-btn-icon">🔊</span>
                            <span class="xt-btn-text">Nghe</span>
                        </button>
                    </div>
                    <div class="xt-phonetic">${result.transcription || ''}</div>
                    <div class="xt-part-of-speech">${result.partOfSpeech}</div>
                </div>
                <div class="xt-meaning">
                    <h3>Nghĩa</h3>
                    <p>${result.meaning.charAt(0).toUpperCase() + result.meaning.slice(1)}</p>
                </div>
                <div class="xt-description">
                    <h3>Giải thích</h3>
                    <p>${result.description}</p>
                </div>
            </div>
            <div class="xt-translator-secondary">
                <div class="xt-section xt-examples">
                    <h3><span class="xt-section-icon">💡</span>Ví dụ</h3>
                    <div class="xt-examples-list">
                        ${(result.examples || []).map((ex, i) => `
                            <div class="xt-example-item">
                                <div class="xt-example-en">${ex}</div>
                                <div class="xt-example-vi">${result.examplesTranslated?.[i] || '–'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="xt-section xt-synonyms">
                    <h3><span class="xt-section-icon">🔗</span>Từ đồng nghĩa</h3>
                    <div class="xt-tags">
                        ${(result.synonyms || []).map(s => `<span class="xt-tag">${s}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                    </div>
                </div>
                <div class="xt-section xt-word-forms">
                    <h3><span class="xt-section-icon">📝</span>Biến thể khác</h3>
                    <div class="xt-tags">
                        ${(result.otherWordForms || []).map(f => `<span class="xt-tag">${f}</span>`).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
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
                    <h2 class="xt-word-title">${displayText}</h2>
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
                    ${result.transcription ? `<div class="xt-phonetic">${result.transcription}</div>` : ''}
                </div>
                <div class="xt-translation">
                    <h3>Dịch</h3>
                    <p>${result.translated}</p>
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
                .catch(() => alert("Không thể sao chép văn bản."));
        });
    }
});

// Close popup on outside click
document.addEventListener('click', e => {
    if (popup && !popup.contains(e.target) && !e.target.closest('.xt-audio-controls') && !window.getSelection().toString().trim()) {
        stopCurrentAudio();
        popup.remove();
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