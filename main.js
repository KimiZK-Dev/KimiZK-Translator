const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Làm sạch JSON
function clean(text) {
    return text.replace(/```json\n?|```/g, "").trim();
}

// Gọi API dịch
async function translate(input, isSingleWord) {
    try {
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

Từ cần dịch: ${input}` :
            `Trả lời văn bản sau **chỉ bằng JSON hợp lệ**, không thêm bất kỳ chữ nào khác, 100% không có markdown, không giải thích. Trả ra duy nhất 1 JSON ở dưới 

Format JSON:

{
  "original": "",                       (văn bản gốc)
  "transcription": "",                  (phiên âm của văn bản gốc nếu có, nếu không thì để trống)
  "translated": ""                      (văn bản được dịch sang tiếng Việt chuẩn chỉnh nhất, hợp lí nhất có thể)
}

Văn bản cần dịch: ${input}`;

        const body = {
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
        };

        const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(body)
        });

        const raw = await res.json();
        const text = raw?.choices?.[0]?.message?.content || "";
        return JSON.parse(clean(text));
    } catch (err) {
        console.error("❌ Lỗi dịch:", err);
        return null;
    }
}

let popup = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Tạo popup với khả năng di chuyển
function createPopup() {
    popup?.remove();
    popup = document.createElement("div");
    popup.className = "xt-translator-popup";
    document.body.appendChild(popup);
    
    // Thêm sự kiện drag
    setupDragging(popup);
    
    return popup;
}

// Thiết lập khả năng kéo thả popup
function setupDragging(element) {
    let header;
    
    const startDrag = (e) => {
        if (!header) return;
        isDragging = true;
        const rect = element.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        element.style.transition = 'none';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    };
    
    const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - element.offsetWidth;
        const maxY = window.innerHeight - element.offsetHeight;
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        element.style.left = `${constrainedX}px`;
        element.style.top = `${constrainedY}px`;
    };
    
    const stopDrag = () => {
        isDragging = false;
        element.style.transition = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    };
    
    setTimeout(() => {
        header = element.querySelector('.xt-translator-header');
        if (header) {
            header.style.cursor = 'move';
            header.addEventListener('mousedown', startDrag);
        }
    }, 0);
}

// Tính toán vị trí popup
function calculatePopupPosition(selectionRect) {
    const popupWidth = 280;
    const popupHeight = 400;
    const padding = 15;
    
    let top = selectionRect.bottom + padding;
    let left = selectionRect.left;
    
    if (left + popupWidth > window.innerWidth) {
        left = window.innerWidth - popupWidth - padding;
    }
    
    if (left < padding) {
        left = padding;
    }
    
    if (top + popupHeight > window.innerHeight) {
        top = selectionRect.top - popupHeight - padding;
        if (top < padding) {
            top = Math.max(padding, (window.innerHeight - popupHeight) / 2);
        }
    }
    
    return {
        top: Math.max(padding, top),
        left: Math.max(padding, left)
    };
}

// Hàm xử lý in hoa chỉ chữ cái đầu của từ đầu tiên
function capitalizeFirstWord(text) {
    if (!text) return text;
    return text.replace(/^\w/, c => c.toUpperCase());
}

// Nghe sự kiện bôi đen
document.addEventListener("mouseup", async (e) => {
    const selected = window.getSelection().toString().trim();
    if (!selected) return;
    
    if (e.target.closest('.xt-translator-popup')) return;

    const isSingleWord = selected.split(/\s+/).length === 1 && selected.length <= 50;
    // Chỉ in hoa chữ cái đầu của từ đầu tiên
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

    const selection = window.getSelection().getRangeAt(0);
    const selectionRect = selection.getBoundingClientRect();
    const position = calculatePopupPosition(selectionRect);

    popup.style.top = `${position.top}px`;
    popup.style.left = `${position.left}px`;

    const closeBtn = popup.querySelector(".xt-translator-close");
    const minimizeBtn = popup.querySelector(".xt-translator-minimize");
    const content = popup.querySelector(".xt-translator-content");
    
    closeBtn.onclick = () => popup.remove();
    
    let isMinimized = false;
    minimizeBtn.onclick = () => {
        isMinimized = !isMinimized;
        if (isMinimized) {
            content.style.display = 'none';
            minimizeBtn.textContent = '+';
            minimizeBtn.title = 'Mở rộng';
        } else {
            content.style.display = 'block';
            minimizeBtn.textContent = '−';
            minimizeBtn.title = 'Thu gọn';
        }
    };

    const result = await translate(selected, isSingleWord);
    if (!result) {
        content.innerHTML = `
            <div class="xt-translator-error">
                <div class="xt-error-icon">⚠️</div>
                <p>Không thể dịch "${displayText}"</p>
                <span class="xt-error-subtitle">Vui lòng thử lại sau</span>
            </div>
        `;
        return;
    }

    if (isSingleWord) {
        content.innerHTML = `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title">${displayText}</h2>
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
                    <h3>
                        <span class="xt-section-icon">💡</span>
                        Ví dụ
                    </h3>
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
                    <h3>
                        <span class="xt-section-icon">🔗</span>
                        Từ đồng nghĩa
                    </h3>
                    <div class="xt-tags">
                        ${(result.synonyms || []).map(s => `
                            <span class="xt-tag">${s}</span>
                        `).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                    </div>
                </div>
                <div class="xt-section xt-word-forms">
                    <h3>
                        <span class="xt-section-icon">📝</span>
                        Biến thể khác
                    </h3>
                    <div class="xt-tags">
                        ${(result.otherWordForms || []).map(f => `
                            <span class="xt-tag">${f}</span>
                        `).join('') || '<span class="xt-no-data">Không có dữ liệu</span>'}
                    </div>
                </div>
            </div>
            <div class="xt-translator-footer">
                <div class="xt-footer-brand">
                    <span class="xt-brand-icon">✨</span>
                    KimiZK Translator
                </div>
                <div class="xt-footer-info">Powered by AI</div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="xt-translator-main">
                <div class="xt-main-info">
                    <h2 class="xt-word-title">${displayText}</h2>
                    ${result.transcription ? `<div class="xt-phonetic">${result.transcription}</div>` : ''}
                </div>
                <div class="xt-translation">
                    <h3>Dịch</h3>
                    <p>${result.translated}</p>
                </div>
            </div>
            <div class="xt-translator-footer">
                <div class="xt-footer-brand">
                    <span class="xt-brand-icon">✨</span>
                    KimiZK Translator
                </div>
                <div class="xt-footer-info">Powered by AI</div>
            </div>
        `;
    }

    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-10px) scale(0.95)';
    requestAnimationFrame(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0) scale(1)';
    });
});

// Đóng popup khi click ra ngoài
document.addEventListener('click', (e) => {
    if (popup && !popup.contains(e.target) && !window.getSelection().toString().trim()) {
        popup.remove();
    }
});

// Xử lý khi scroll
document.addEventListener('scroll', () => {
    if (popup && !isDragging) {
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
        }
    }
});