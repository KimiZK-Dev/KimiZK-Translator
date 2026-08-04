document.addEventListener("DOMContentLoaded", () => {
    // 1. Version info
    try {
        const version = chrome.runtime.getManifest().version;
        document.querySelectorAll("#version").forEach(el => el.textContent = version);
    } catch (e) {
        console.warn('Could not load version:', e);
    }

    // 2. Open options page handlers
    const openOptionsPage = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('src/html/options.html'));
        }
    };

    document.getElementById("open-options-btn")?.addEventListener("click", openOptionsPage);
    document.getElementById("full-settings-link")?.addEventListener("click", openOptionsPage);

    // 3. Mode Tabs Logic (Text | Voice STT | Screen OCR)
    const modeTabs = document.querySelectorAll(".xt-mode-tab");
    const modeViews = {
        text: document.getElementById("view-text-mode"),
        voice: document.getElementById("view-voice-mode"),
        ocr: document.getElementById("view-ocr-mode")
    };

    modeTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const selectedMode = tab.getAttribute("data-mode");
            modeTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            Object.keys(modeViews).forEach(m => {
                if (modeViews[m]) {
                    modeViews[m].style.display = m === selectedMode ? "block" : "none";
                }
            });
        });
    });

    // 4. Load target language from storage & sync Segmented Control
    const targetSelect = document.getElementById("popup-target-lang");
    const segBtns = document.querySelectorAll(".xt-seg-btn");

    const updateSegPillActive = (lang) => {
        segBtns.forEach(btn => {
            if (btn.getAttribute("data-lang") === lang) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    };

    StorageManager.getTargetLanguage().then(lang => {
        if (lang) {
            if (targetSelect) targetSelect.value = lang;
            updateSegPillActive(lang);
        }
    });

    targetSelect?.addEventListener("change", (e) => {
        const selectedLang = e.target.value;
        StorageManager.setTargetLanguage(selectedLang);
        chrome.runtime.sendMessage({ action: "saveTargetLanguage", language: selectedLang });
        updateSegPillActive(selectedLang);
    });

    segBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.getAttribute("data-lang");
            if (lang) {
                if (targetSelect) targetSelect.value = lang;
                updateSegPillActive(lang);
                StorageManager.setTargetLanguage(lang);
                chrome.runtime.sendMessage({ action: "saveTargetLanguage", language: lang });
                
                const inputArea = document.getElementById("popup-input-text");
                if (inputArea && inputArea.value.trim()) {
                    handlePopupTranslate();
                }
            }
        });
    });

    // 5. Quick Translation Logic inside Popup with Skeleton Loader & Web Citations
    const inputArea = document.getElementById("popup-input-text");
    const translateBtn = document.getElementById("popup-translate-btn");
    const resultBox = document.getElementById("popup-result-container");
    const resultText = document.getElementById("popup-result-text");
    const resultDesc = document.getElementById("popup-result-desc");
    const detectedBadge = document.getElementById("popup-detected-lang");
    const listenBtn = document.getElementById("popup-listen-btn");
    const copyBtn = document.getElementById("popup-copy-btn");
    const skeletonBox = document.getElementById("popup-skeleton");
    const citationsBox = document.getElementById("popup-citations-container");
    const citationsList = document.getElementById("popup-citations-list");

    let lastResult = null;

    const renderCitations = (executedTools) => {
        if (!citationsBox || !citationsList) return;
        if (!executedTools || !Array.isArray(executedTools) || executedTools.length === 0) {
            citationsBox.style.display = "none";
            return;
        }

        let citationsHTML = '';
        executedTools.forEach((tool, index) => {
            if (tool.url || tool.link) {
                const url = tool.url || tool.link;
                const title = tool.title || tool.name || `Nguồn ${index + 1}`;
                citationsHTML += `
                    <a href="${url}" target="_blank" class="xt-citation-chip" title="${url}">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        [${index + 1}] ${title.length > 25 ? title.substring(0, 25) + '...' : title}
                    </a>
                `;
            }
        });

        if (citationsHTML) {
            citationsList.innerHTML = citationsHTML;
            citationsBox.style.display = "flex";
        } else {
            citationsBox.style.display = "none";
        }
    };

    const handlePopupTranslate = async (customQuery) => {
        const query = customQuery || inputArea.value.trim();
        if (!query) return;

        if (inputArea && !customQuery) inputArea.value = query;
        translateBtn.disabled = true;
        translateBtn.innerHTML = `Đang dịch...`;
        
        if (resultBox) resultBox.style.display = "none";
        if (skeletonBox) skeletonBox.style.display = "flex";

        try {
            const targetLang = targetSelect.value || 'Vietnamese';
            const isSingleWord = query.split(/\s+/).length === 1 && query.length <= 50;
            
            const startTime = Date.now();
            const result = await ApiService.translate(query, isSingleWord, targetLang);
            const elapsed = Date.now() - startTime;

            if (skeletonBox) skeletonBox.style.display = "none";

            if (result) {
                if (typeof StorageManager !== 'undefined' && StorageManager.recordTranslationEvent) {
                    StorageManager.recordTranslationEvent(query, targetLang, elapsed);
                }
                lastResult = result;
                resultBox.style.display = "flex";
                
                const mainResult = isSingleWord ? (result.meaning || result.translated) : result.translated;
                resultText.textContent = mainResult;
                detectedBadge.textContent = `${result.detectedLanguage || 'Tự động'} → ${result.targetLanguage || 'tiếng Việt'}`;
                
                if (result.description) {
                    resultDesc.style.display = "block";
                    resultDesc.textContent = result.description;
                } else {
                    resultDesc.style.display = "none";
                }

                // Render web citations if available (Groq Compound model)
                renderCitations(result.executedTools);
            } else {
                resultBox.style.display = "flex";
                resultText.textContent = "Không thể dịch văn bản. Vui lòng kiểm tra API Key trong cài đặt.";
                resultDesc.style.display = "none";
            }
        } catch (err) {
            console.error(err);
            if (skeletonBox) skeletonBox.style.display = "none";
            resultBox.style.display = "flex";
            resultText.textContent = err.message || "Lỗi kết nối API. Vui lòng thử lại.";
        } finally {
            translateBtn.disabled = false;
            translateBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Dịch ngay
            `;
        }
    };

    translateBtn?.addEventListener("click", () => handlePopupTranslate());
    inputArea?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handlePopupTranslate();
        }
    });

    listenBtn?.addEventListener("click", () => {
        const textToSpeak = lastResult?.translated || lastResult?.meaning || inputArea.value.trim();
        if (textToSpeak) {
            ApiService.textToSpeech(textToSpeak);
        }
    });

    copyBtn?.addEventListener("click", () => {
        const textToCopy = lastResult?.translated || lastResult?.meaning || resultText.textContent;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 2000);
            });
        }
    });

    // 6. Voice Recording STT Feature (Groq Whisper)
    const micBtn = document.getElementById("mic-record-btn");
    const voiceStatus = document.getElementById("voice-status-text");
    const voiceWaves = document.getElementById("voice-waves");
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;

    micBtn?.addEventListener("click", async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());

                    if (voiceStatus) voiceStatus.textContent = "Đang nhận diện giọng nói bằng Groq Whisper...";
                    if (skeletonBox) skeletonBox.style.display = "flex";

                    try {
                        const transcribedText = await ApiService.transcribeAudio(audioBlob);
                        if (transcribedText) {
                            if (voiceStatus) voiceStatus.textContent = `Đã nhận diện: "${transcribedText}"`;
                            if (inputArea) inputArea.value = transcribedText;
                            
                            // Switch back to text mode & trigger translation
                            document.querySelector('.xt-mode-tab[data-mode="text"]')?.click();
                            handlePopupTranslate(transcribedText);
                        } else {
                            if (voiceStatus) voiceStatus.textContent = "Không thể nhận diện âm thanh. Vui lòng nói rõ hơn.";
                            if (skeletonBox) skeletonBox.style.display = "none";
                        }
                    } catch (err) {
                        console.error("STT Error:", err);
                        if (voiceStatus) voiceStatus.textContent = "Lỗi nhận diện giọng nói: " + (err.message || "Kiểm tra API Key.");
                        if (skeletonBox) skeletonBox.style.display = "none";
                    }
                };

                mediaRecorder.start();
                isRecording = true;
                micBtn.classList.add("recording");
                if (voiceWaves) voiceWaves.classList.add("active");
                if (voiceStatus) voiceStatus.textContent = "Đang thu âm... Nhấn lại nút micro để hoàn tất & dịch.";
            } catch (err) {
                console.error("Mic Access Error:", err);
                if (voiceStatus) voiceStatus.textContent = "Chưa cấp quyền Micro. Vui lòng cấp quyền trong Chrome.";
            }
        } else {
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
            isRecording = false;
            micBtn.classList.remove("recording");
            if (voiceWaves) voiceWaves.classList.remove("active");
        }
    });

    // 7. Screen OCR Vision Feature (Groq Vision qwen/qwen3.6-27b)
    const captureOcrBtn = document.getElementById("capture-ocr-btn");
    captureOcrBtn?.addEventListener("click", () => {
        if (!chrome.tabs || !chrome.tabs.captureVisibleTab) {
            alert("Tính năng chụp màn hình cần mở trên một trang web bất kỳ.");
            return;
        }

        captureOcrBtn.disabled = true;
        captureOcrBtn.textContent = "Đang chụp màn hình & OCR...";

        if (skeletonBox) skeletonBox.style.display = "flex";
        if (resultBox) resultBox.style.display = "none";

        chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
            captureOcrBtn.disabled = false;
            captureOcrBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                Chụp màn hình & Dịch OCR
            `;

            if (chrome.runtime.lastError || !dataUrl) {
                if (skeletonBox) skeletonBox.style.display = "none";
                alert("Không thể chụp màn hình: " + (chrome.runtime.lastError?.message || "Lỗi không xác định"));
                return;
            }

            try {
                const targetLang = targetSelect.value || 'Vietnamese';
                const ocrResult = await ApiService.translateImage(dataUrl, targetLang);

                if (skeletonBox) skeletonBox.style.display = "none";

                if (ocrResult) {
                    lastResult = ocrResult;
                    if (resultBox) resultBox.style.display = "flex";
                    if (resultText) resultText.textContent = ocrResult.translated || ocrResult.originalText || "Hoàn tất trích xuất OCR";
                    if (detectedBadge) detectedBadge.textContent = `${ocrResult.detectedLanguage || 'Ảnh'} → ${targetLang}`;
                    if (resultDesc) {
                        resultDesc.style.display = "block";
                        resultDesc.textContent = `[Gốc trích xuất OCR]: ${ocrResult.originalText || ''}`;
                    }
                }
            } catch (err) {
                console.error("Vision OCR Error:", err);
                if (skeletonBox) skeletonBox.style.display = "none";
                if (resultBox) resultBox.style.display = "flex";
                if (resultText) resultText.textContent = "Lỗi nhận diện hình ảnh OCR: " + (err.message || "Vui lòng thử lại.");
            }
        });
    });

    // 8. Command Palette Modal Logic
    const cmdBtn = document.getElementById("cmd-palette-btn");
    const cmdOverlay = document.getElementById("cmd-palette-overlay");
    const cmdInput = document.getElementById("cmd-input");
    const cmdItems = document.querySelectorAll(".xt-cmd-item");

    const openCmdPalette = () => {
        if (cmdOverlay) {
            cmdOverlay.style.display = "flex";
            if (cmdInput) {
                cmdInput.value = "";
                cmdInput.focus();
            }
        }
    };

    const closeCmdPalette = () => {
        if (cmdOverlay) cmdOverlay.style.display = "none";
    };

    cmdBtn?.addEventListener("click", openCmdPalette);

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (cmdOverlay && cmdOverlay.style.display === "flex") {
                closeCmdPalette();
            } else {
                openCmdPalette();
            }
        }
        if (e.key === "Escape" && cmdOverlay && cmdOverlay.style.display === "flex") {
            closeCmdPalette();
        }
    });

    cmdOverlay?.addEventListener("click", (e) => {
        if (e.target === cmdOverlay) closeCmdPalette();
    });

    cmdInput?.addEventListener("input", (e) => {
        const val = e.target.value.toLowerCase().trim();
        cmdItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (!val || text.includes(val)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }
        });
    });

    cmdItems.forEach(item => {
        item.addEventListener("click", () => {
            const action = item.getAttribute("data-action");
            const val = item.getAttribute("data-value");
            closeCmdPalette();

            if (action === "set-model" && val) {
                StorageManager.setSelectedModel(val);
                alert(`Đã đổi sang mô hình: ${val}`);
            } else if (action === "open-options") {
                openOptionsPage();
            } else if (action === "copy-last") {
                if (lastResult?.translated) {
                    navigator.clipboard.writeText(lastResult.translated);
                    alert("Đã sao chép bản dịch vào clipboard!");
                }
            }
        });
    });

    // 9. Update notifications toggle
    const notifyToggle = document.getElementById("popup-notify-toggle");
    if (notifyToggle) {
        chrome.storage.local.get(["updateNotifications"], (res) => {
            notifyToggle.checked = res.updateNotifications !== false;
        });

        notifyToggle.addEventListener("change", () => {
            chrome.storage.local.set({ updateNotifications: notifyToggle.checked });
        });
    }
});