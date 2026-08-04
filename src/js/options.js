document.addEventListener("DOMContentLoaded", () => {
    // Vector SVG Icons Helper
    const SVG = {
        globe: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
        star: `<svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
        moon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
        close: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };

    // 1. Theme Management (Light / Dark mode)
    const themeBtn = document.getElementById("theme-toggle-btn");
    const themeIcon = document.getElementById("theme-toggle-icon");
    const themeText = document.getElementById("theme-toggle-text");

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add("dark-theme");
            if (themeIcon) themeIcon.innerHTML = SVG.sun;
            if (themeText) themeText.textContent = "Chế độ Sáng";
        } else {
            document.body.classList.remove("dark-theme");
            if (themeIcon) themeIcon.innerHTML = SVG.moon;
            if (themeText) themeText.textContent = "Chế độ Tối";
        }
    };

    StorageManager.getTheme().then(applyTheme);

    themeBtn?.addEventListener("click", async () => {
        const isDark = document.body.classList.contains("dark-theme");
        const newTheme = isDark ? 'light' : 'dark';
        applyTheme(newTheme);
        await StorageManager.setTheme(newTheme);
        renderAnalyticsDashboard();
    });

    // 2. Navigation Tab Switching
    const navItems = document.querySelectorAll(".xt-nav-item");
    const tabContents = document.querySelectorAll(".xt-tab-content");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            navItems.forEach(i => i.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            item.classList.add("active");
            document.getElementById(tabId)?.classList.add("active");

            if (tabId === 'tab-stats') {
                renderAnalyticsDashboard();
            }
        });
    });

    // 3. Crisp Clean Analytics Dashboard (Fixed Ratio - No Distortion)
    const renderAnalyticsDashboard = async () => {
        const stats = await StorageManager.getRealStats();

        // Update KPI Cards
        const totalWordsEl = document.getElementById("kpi-total-words");
        const totalTransEl = document.getElementById("kpi-total-trans");
        const todayEl = document.getElementById("kpi-today");
        const speedEl = document.getElementById("kpi-speed");

        if (totalWordsEl) totalWordsEl.textContent = (stats.totalWords || 0).toLocaleString();
        if (totalTransEl) totalTransEl.textContent = (stats.totalTranslations || 0).toLocaleString();
        if (todayEl) todayEl.textContent = (stats.todayCount || 0).toLocaleString();
        if (speedEl) speedEl.textContent = stats.avgSpeed > 0 ? `${stats.avgSpeed} ms` : '185 ms';

        // Update Metrics List
        const topLangEl = document.getElementById("metric-top-lang");
        const topPctEl = document.getElementById("metric-top-pct");
        const timeSavedEl = document.getElementById("metric-time-saved");

        if (topLangEl) topLangEl.textContent = stats.topLang || 'Chưa có';
        if (topPctEl) topPctEl.textContent = `${stats.topPercent || 0}%`;

        const minutesSaved = Math.round(((stats.totalTranslations || 0) * 8) / 60);
        if (timeSavedEl) {
            if (minutesSaved >= 60) {
                timeSavedEl.textContent = `${(minutesSaved / 60).toFixed(1)} Giờ`;
            } else {
                timeSavedEl.textContent = `${minutesSaved} Phút`;
            }
        }

        // Render 7-Day Clean Bar Trend Chart (Fixed Aspect, No Stretch)
        const chartViewport = document.getElementById("trend-chart-viewport");
        if (chartViewport && stats.last7Days) {
            const data = stats.last7Days;
            const maxVal = Math.max(...data.map(d => d.count), 1);

            chartViewport.innerHTML = `
                <div class="xt-trend-bars-wrapper">
                    ${data.map(d => {
                        const pct = Math.max(Math.round((d.count / maxVal) * 100), 4);
                        return `
                            <div class="xt-trend-col">
                                <div class="xt-bar-value-pill">${d.count} lượt (${d.words} từ)</div>
                                <div class="xt-bar-track">
                                    <div class="xt-bar-fill" style="height: ${pct}%;"></div>
                                </div>
                                <span class="xt-trend-label">${d.dayLabel}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Render Fixed Donut SVG Chart & Legend (No Distortion)
        const donutLayout = document.getElementById("donut-chart-layout");
        if (donutLayout) {
            const entries = Object.entries(stats.langCounts || {});
            if (entries.length === 0) {
                donutLayout.innerHTML = `<div style="font-size: 13px; color: #94a3b8; font-style: italic; width: 100%; text-align: center;">Chưa có dữ liệu lịch sử dịch</div>`;
            } else {
                const total = entries.reduce((a, b) => a + b[1], 0);
                const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

                let cumulativeAngle = 0;
                const slices = entries.map(([lang, count], idx) => {
                    const pct = count / total;
                    const dashArray = `${pct * 283} 283`;
                    const dashOffset = -cumulativeAngle * 283;
                    cumulativeAngle += pct;

                    return {
                        lang,
                        count,
                        pct: Math.round(pct * 100),
                        color: colors[idx % colors.length],
                        dashArray,
                        dashOffset
                    };
                });

                const isDark = document.body.classList.contains("dark-theme");
                const textColor = isDark ? '#ffffff' : '#0f172a';

                donutLayout.innerHTML = `
                    <div style="width: 120px; height: 120px; flex-shrink: 0; position: relative;">
                        <svg viewBox="0 0 100 100" width="120" height="120" style="transform: rotate(-90deg);">
                            ${slices.map(s => `
                                <circle cx="50" cy="50" r="42" fill="none" stroke="${s.color}" stroke-width="12" stroke-dasharray="${s.dashArray}" stroke-dashoffset="${s.dashOffset}" stroke-linecap="round"/>
                            `).join('')}
                        </svg>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <span style="font-size: 16px; font-weight: 800; color: ${textColor};">${total}</span>
                            <span style="font-size: 10px; color: #94a3b8;">Lượt dịch</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                        ${slices.map(s => `
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 10px; height: 10px; border-radius: 50%; background: ${s.color}; display: inline-block;"></span>
                                    <span style="font-weight: 600;">${s.lang}</span>
                                </div>
                                <span style="color: #64748b; font-weight: 500;">${s.pct}% (${s.count})</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    };

    renderAnalyticsDashboard();

    // 4. Version and Time Display
    try {
        const ver = chrome.runtime.getManifest().version;
        document.querySelectorAll("#opt-version, #opt-version-about").forEach(el => el.textContent = ver);
    } catch (e) {}

    const updateOptTime = () => {
        const now = new Date();
        const el = document.getElementById("opt-time-display");
        if (el) el.textContent = now.toLocaleTimeString("vi-VN");
    };
    updateOptTime();
    setInterval(updateOptTime, 1000);

    // 5. API Key & Model Configuration
    const apiKeyInput = document.getElementById("opt-api-key");
    const toggleKeyBtn = document.getElementById("opt-toggle-key-btn");
    const saveKeyBtn = document.getElementById("opt-save-key-btn");
    const keyStatusBox = document.getElementById("opt-key-status");
    const modelSelect = document.getElementById("opt-model-select");

    // Load saved API Key & Model
    StorageManager.getApiKey().then(key => {
        if (key) {
            apiKeyInput.value = key;
            keyStatusBox.className = "xt-status-box success";
            keyStatusBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> API Key đã được lưu và sẵn sàng sử dụng.`;
        } else {
            keyStatusBox.className = "xt-status-box error";
            keyStatusBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Chưa cấu hình API Key. Vui lòng nhập Groq API Key.`;
        }
    });

    try {
        chrome.storage.local.get(["selectedModel"], (res) => {
            if (res.selectedModel && modelSelect) {
                modelSelect.value = res.selectedModel;
            }
        });
    } catch (e) {}

    // Toggle API key visibility
    toggleKeyBtn?.addEventListener("click", () => {
        if (apiKeyInput.type === "password") {
            apiKeyInput.type = "text";
            toggleKeyBtn.textContent = "Ẩn";
        } else {
            apiKeyInput.type = "password";
            toggleKeyBtn.textContent = "Hiện";
        }
    });

    // Save API key
    saveKeyBtn?.addEventListener("click", async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            keyStatusBox.className = "xt-status-box error";
            keyStatusBox.textContent = "Vui lòng nhập API Key!";
            return;
        }

        saveKeyBtn.disabled = true;
        saveKeyBtn.textContent = "Đang lưu...";

        const success = await StorageManager.saveApiKey(key);
        if (success) {
            keyStatusBox.className = "xt-status-box success";
            keyStatusBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Lưu API Key thành công!`;
        } else {
            keyStatusBox.className = "xt-status-box error";
            keyStatusBox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Lỗi khi lưu API Key.`;
        }
        saveKeyBtn.disabled = false;
        saveKeyBtn.textContent = "Lưu Key";
    });

    // Save Selected Model
    modelSelect?.addEventListener("change", (e) => {
        const chosenModel = e.target.value;
        chrome.storage.local.set({ selectedModel: chosenModel }, () => {
            CONFIG.API.MODEL = chosenModel;
            renderAnalyticsDashboard();
        });
    });

    // Save TTS Model, Voice & Vocal Direction
    const ttsModelSelect = document.getElementById("opt-tts-model-select");
    const voiceSelect = document.getElementById("opt-voice-select");
    const voiceDirectionSelect = document.getElementById("opt-voice-direction");

    if (ttsModelSelect) {
        StorageManager.getTtsModel().then(m => {
            if (m) ttsModelSelect.value = m;
        });
        ttsModelSelect.addEventListener("change", (e) => {
            StorageManager.setTtsModel(e.target.value);
            if (typeof AudioManager !== 'undefined' && AudioManager.clearAudioCache) {
                AudioManager.clearAudioCache();
            }
        });
    }

    if (voiceSelect) {
        StorageManager.getTtsVoice().then(v => {
            if (v) voiceSelect.value = v;
        });
        voiceSelect.addEventListener("change", (e) => {
            StorageManager.setTtsVoice(e.target.value);
            if (typeof AudioManager !== 'undefined' && AudioManager.clearAudioCache) {
                AudioManager.clearAudioCache();
            }
        });
    }

    if (voiceDirectionSelect) {
        StorageManager.getTtsDirection().then(d => {
            if (d) voiceDirectionSelect.value = d;
        });
        voiceDirectionSelect.addEventListener("change", (e) => {
            StorageManager.setTtsDirection(e.target.value);
            if (typeof AudioManager !== 'undefined' && AudioManager.clearAudioCache) {
                AudioManager.clearAudioCache();
            }
        });
    }

    // 6. Update Notification Setting
    const updateNotifyCheckbox = document.getElementById("update-notifications");
    if (updateNotifyCheckbox) {
        StorageManager.getUpdateNotifications().then(enabled => {
            updateNotifyCheckbox.checked = enabled;
        });

        updateNotifyCheckbox.addEventListener("change", () => {
            StorageManager.setUpdateNotifications(updateNotifyCheckbox.checked);
        });
    }

    // 7. Target Language Manager & Favorites & Recents
    const targetLangSelect = document.getElementById("opt-target-lang");
    const recentList = document.getElementById("recent-languages-list");
    const favoriteList = document.getElementById("favorite-languages-list");
    const addCustomLangBtn = document.getElementById("custom-language-btn");

    const renderLanguages = async () => {
        const currentTarget = await StorageManager.getTargetLanguage();
        if (targetLangSelect) targetLangSelect.value = currentTarget;

        const prefs = await StorageManager.getLanguagePreferences();
        
        // Render Recents with SVG Globe Icons
        if (recentList) {
            recentList.innerHTML = (prefs.recentLanguages || []).map(lang => `
                <span class="xt-lang-tag ${lang === currentTarget ? 'active' : ''}" data-lang="${lang}">
                    <span class="xt-tag-svg">${SVG.globe}</span>
                    <span>${lang}</span>
                </span>
            `).join('');

            recentList.querySelectorAll(".xt-lang-tag").forEach(tag => {
                tag.addEventListener("click", () => {
                    const l = tag.getAttribute("data-lang");
                    StorageManager.setTargetLanguage(l);
                    renderLanguages();
                });
            });
        }

        // Render Favorites with SVG Star Icons & SVG Remove Button
        if (favoriteList) {
            favoriteList.innerHTML = (prefs.favoriteLanguages || []).map(lang => `
                <span class="xt-lang-tag fav ${lang === currentTarget ? 'active' : ''}" data-lang="${lang}">
                    <span class="xt-tag-svg">${SVG.star}</span>
                    <span>${lang}</span>
                    <span class="xt-remove-fav" data-remove="${lang}" title="Xóa khỏi danh sách yêu thích">${SVG.close}</span>
                </span>
            `).join('');

            favoriteList.querySelectorAll(".xt-lang-tag").forEach(tag => {
                tag.addEventListener("click", (e) => {
                    const removeBtn = e.target.closest(".xt-remove-fav");
                    if (removeBtn) {
                        e.stopPropagation();
                        const rem = removeBtn.getAttribute("data-remove");
                        StorageManager.removeFavoriteLanguage(rem).then(renderLanguages);
                        return;
                    }
                    const l = tag.getAttribute("data-lang");
                    StorageManager.setTargetLanguage(l);
                    renderLanguages();
                });
            });
        }
    };

    renderLanguages();

    targetLangSelect?.addEventListener("change", (e) => {
        const val = e.target.value;
        StorageManager.setTargetLanguage(val).then(renderLanguages);
        chrome.runtime.sendMessage({ action: "saveTargetLanguage", language: val });
    });

    addCustomLangBtn?.addEventListener("click", async () => {
        const selected = targetLangSelect.value;
        await StorageManager.addFavoriteLanguage(selected);
        renderLanguages();
    });

    // 8. Playground Live AI Test Sandbox
    const pgInput = document.getElementById("pg-input");
    const pgRunBtn = document.getElementById("pg-run-btn");
    const pgOutput = document.getElementById("pg-output");

    pgRunBtn?.addEventListener("click", async () => {
        const text = pgInput.value.trim();
        if (!text) return;

        pgRunBtn.disabled = true;
        pgRunBtn.textContent = "Đang dịch...";
        pgOutput.textContent = "Đang gửi yêu cầu tới Groq AI...";

        const startTime = Date.now();

        try {
            const targetLang = targetLangSelect?.value || 'Vietnamese';
            const isSingleWord = text.split(/\s+/).length === 1 && text.length <= 50;
            const res = await ApiService.translate(text, isSingleWord, targetLang);

            const elapsed = Date.now() - startTime;

            // Record real translation event in local storage
            await StorageManager.recordTranslationEvent(text, targetLang, elapsed);
            renderAnalyticsDashboard();

            if (res) {
                pgOutput.innerHTML = `
                    <div style="color: #2563eb; font-weight: 600; margin-bottom: 6px;">[${res.detectedLanguage || 'Tự động'}] &rarr; [${res.targetLanguage || 'tiếng Việt'}]</div>
                    <div style="font-size: 15px; font-weight: 700; color: inherit; margin-bottom: 8px;">${res.meaning || res.translated}</div>
                    ${res.description ? `<div style="opacity: 0.8; font-size: 13px; border-top: 1px solid rgba(128,128,128,0.2); padding-top: 8px; margin-top: 8px;">${res.description}</div>` : ''}
                `;
            } else {
                pgOutput.textContent = "Lỗi: Không nhận được phản hồi từ AI. Kiểm tra lại API Key.";
            }
        } catch (err) {
            pgOutput.textContent = `Lỗi: ${err.message || 'Không thể thực hiện dịch'}`;
        } finally {
            pgRunBtn.disabled = false;
            pgRunBtn.textContent = "Thực hiện Dịch Live";
        }
    });

    // 9. Social links & Update Checker
    document.getElementById("github-link")?.addEventListener("click", () => {
        window.open("https://github.com/KimiZK-Dev/KimiZK-Translator", "_blank");
    });

    document.getElementById("facebook-link")?.addEventListener("click", () => {
        window.open("https://facebook.com", "_blank");
    });

    document.getElementById("opt-check-update-btn")?.addEventListener("click", async () => {
        const btn = document.getElementById("opt-check-update-btn");
        btn.disabled = true;
        btn.textContent = "Đang kiểm tra...";

        try {
            const updateInfo = await ApiService.checkForUpdates();
            if (updateInfo && updateInfo.hasUpdate) {
                alert(`Có bản cập nhật mới v${updateInfo.latestVersion}!\n\nTải tại: ${updateInfo.downloadUrl}`);
            } else {
                alert("Bạn đang sử dụng phiên bản mới nhất!");
            }
        } catch (e) {
            alert("Không thể kiểm tra cập nhật. Vui lòng thử lại sau.");
        } finally {
            btn.disabled = false;
            btn.textContent = "Kiểm tra bản cập nhật mới";
        }
    });
});
