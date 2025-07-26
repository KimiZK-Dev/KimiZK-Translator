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
        setupDragging(popup);

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
                        <h2 class="xt-word-title-single">${escapeSpecialChars(displayText)}</h2>
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
                        <h2 class="xt-word-title-text">${escapeSpecialChars(displayText)}</h2>
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

document.addEventListener('click', e => {
    if (popup && !popup.contains(e.target) && !e.target.closest('.xt-audio-controls') && !e.target.closest('.xt-trigger-icon') && !window.getSelection().toString().trim()) {
        stopCurrentAudio();
        popup.remove();
        triggerIcon?.remove();
    }
});

document.addEventListener('click', e => {
    if (triggerIcon && !triggerIcon.contains(e.target) && !e.target.closest('.xt-trigger-icon') && !justCreatedTriggerIcon && e.button === 0) {
        triggerIcon.remove();
    }
});

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