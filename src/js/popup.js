document.addEventListener("DOMContentLoaded", () => {
    // Function to show notification (simplified version)
    function showNotification(message, type = "info", duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Hiển thị phiên bản extension
    try {
        const version = chrome.runtime.getManifest().version;
        document.getElementById("version").textContent = version;
    } catch (error) {
        console.error('Không thể lấy phiên bản từ manifest:', error);
        document.getElementById("version").textContent = "N/A";
    }

    // Tự động kiểm tra cập nhật khi mở popup (sẽ được gọi sau khi định nghĩa hàm)

    // Hiển thị thời gian (UTC+07:00)
    const updateTime = () => {
        const now = new Date();
        const options = {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        };
        try {
            document.getElementById("current-time").textContent =
                now.toLocaleString("vi-VN", options);
        } catch (error) {
            // Fallback
            document.getElementById("current-time").textContent =
                now.toLocaleTimeString('vi-VN');
        }
    };

    updateTime();
    setInterval(updateTime, 1000);

    // Custom checkbox functionality
    const checkbox = document.getElementById('update-notifications');
    const checkboxCustom = document.getElementById('checkbox-custom');

    function updateCheckboxDisplay() {
        if (checkbox.checked) {
            checkboxCustom.classList.add('checked');
        } else {
            checkboxCustom.classList.remove('checked');
        }
    }

    // Load checkbox state from storage
    try {
        chrome.storage.local.get(["updateNotifications"], (result) => {
            checkbox.checked = result.updateNotifications !== false; // Mặc định bật
            updateCheckboxDisplay();
        });
    } catch (error) {
        // Fallback for demo
        checkbox.checked = true;
        updateCheckboxDisplay();
    }

    // Checkbox event handlers
    checkboxCustom.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        updateCheckboxDisplay();

        // Save to storage
        try {
                    chrome.storage.local.set({
            updateNotifications: checkbox.checked
        });
    } catch (error) {
        // console.log('Storage not available in demo mode');
    }
    });

    checkbox.addEventListener('change', () => {
            updateCheckboxDisplay();
    try {
        chrome.storage.local.set({
            updateNotifications: checkbox.checked
        });
    } catch (error) {
        // console.log('Storage not available in demo mode');
    }
    });

    // API Key functionality
    const apiKeyInput = document.getElementById('api-key-input');
    const saveButton = document.getElementById('save-api-key');
    const statusMessage = document.getElementById('api-key-status');

    // Load existing API key
    try {
        chrome.storage.local.get(["API_KEY"], (result) => {
            if (result.API_KEY) {
                apiKeyInput.disabled = false;
                saveButton.disabled = false;
                apiKeyInput.placeholder = "API Key đã được lưu (nhập để thay đổi)";
                statusMessage.style.display = 'none';
            } else {
                enableApiKeyInput();
            }
        });
    } catch (error) {
        // Fallback for demo
        setTimeout(enableApiKeyInput, 1000);
    }

    function enableApiKeyInput() {
        apiKeyInput.disabled = false;
        saveButton.disabled = false;
        statusMessage.style.display = 'none';
    }

    // Real-time API key validation
    apiKeyInput.addEventListener('input', () => {
        const value = apiKeyInput.value.trim();

        if (value.length === 0) {
            saveButton.disabled = true;
            statusMessage.style.display = 'none';
        } else if (value.length < 20) {
            saveButton.disabled = true;
            statusMessage.textContent = 'API Key quá ngắn (tối thiểu 20 ký tự)';
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        } else if (!/^gsk_[a-zA-Z0-9]{32,}$/.test(value)) {
            saveButton.disabled = true;
            statusMessage.textContent = 'API Key không đúng định dạng Groq (bắt đầu bằng gsk_)';
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        } else {
            saveButton.disabled = false;
            statusMessage.style.display = 'none';
        }
    });

    // Save API key
    saveButton.addEventListener('click', () => {
        const newKey = apiKeyInput.value.trim();

        if (!newKey || newKey.length < 20 || !/^gsk_[a-zA-Z0-9]{32,}$/.test(newKey)) {
            statusMessage.textContent = "API Key không hợp lệ!";
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
            return;
        }

        // Show loading state
        saveButton.classList.add('loading');
        saveButton.textContent = 'Đang lưu...';
        saveButton.disabled = true;

        try {
            // Try Chrome extension API first
            chrome.runtime.sendMessage({
                action: "saveApiKey",
                key: newKey
            }, (response) => {
                handleSaveResponse(response);
            });
        } catch (error) {
            // Fallback for demo
            setTimeout(() => {
                handleSaveResponse({
                    success: true
                });
            }, 1500);
        }
    });

    function handleSaveResponse(response) {
        saveButton.classList.remove('loading');
        saveButton.innerHTML = '💾 Lưu API Key';
        saveButton.disabled = false;

        if (response && response.success) {
            statusMessage.textContent = "API Key đã được lưu thành công!";
            statusMessage.className = 'status-message success';
            statusMessage.style.display = 'block';
            apiKeyInput.value = "";
            apiKeyInput.placeholder = "API Key đã được lưu (nhập để thay đổi)";
        } else {
            statusMessage.textContent = "Lỗi khi lưu API Key!";
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        }

        // Hide status message after 3 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    // External links
    document.getElementById("github-link").addEventListener("click", () => {
        try {
            chrome.tabs.create({
                url: "https://github.com/KimiZK-Dev"
            });
        } catch (error) {
            // Fallback for demo
            window.open("https://github.com/KimiZK-Dev", "_blank");
        }
    });

    document.getElementById("facebook-link").addEventListener("click", () => {
        try {
            chrome.tabs.create({
                url: "https://www.facebook.com/nhb.xyz"
            });
        } catch (error) {
            // Fallback for demo
            window.open("https://www.facebook.com/nhb.xyz", "_blank");
        }
    });

    // Enhanced card hover effects
    document.querySelectorAll('.xt-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = 'var(--shadow-lg)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'var(--shadow-sm)';
        });
    });

    // Nút kiểm tra cập nhật
    const checkUpdateBtn = document.getElementById('check-update-btn');

    // Kiểm tra cập nhật và hiện bảng ở giữa màn hình
    function checkForUpdatesAndShowModal() {
        checkUpdateBtn.classList.add('loading');
        checkUpdateBtn.textContent = 'Đang kiểm tra...';
        checkUpdateBtn.disabled = true;

        // Delay 1.5s để tạo cảm giác loading
        setTimeout(() => {
            // Gọi background script để kiểm tra cập nhật
            chrome.runtime.sendMessage({action: "getLatestVersion"}, (response) => {
                if (chrome.runtime.lastError) {
                    // console.log('Error checking updates:', chrome.runtime.lastError);
                    showNotification('Không thể kiểm tra cập nhật', 'error');
                    resetCheckUpdateBtn();
                    return;
                }
                
                // console.log('Update check response:', response);
                
                if (response && response.hasUpdate) {
                    // Hiện modal cập nhật ở giữa màn hình
                    showUpdateModalInPage(response);
                } else if (response && response.latestVersion) {
                    showNotification('Đang sử dụng phiên bản mới nhất', 'success');
                } else {
                    showNotification('Không thể kiểm tra cập nhật', 'error');
                }
                
                resetCheckUpdateBtn();
            });
        }, 1500); // Loading 1.5 giây
    }

    function resetCheckUpdateBtn() {
        checkUpdateBtn.classList.remove('loading');
        checkUpdateBtn.textContent = '🔍 Kiểm tra bản cập nhật';
        checkUpdateBtn.disabled = false;
    }

    // Hiện modal cập nhật ở giữa màn hình (không phải trong popup)
    function showUpdateModalInPage(updateInfo) {
        // Gửi message đến content script để hiện modal
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "showUpdateModal",
                    updateInfo: updateInfo
                }).catch((error) => {
                    // console.log('Failed to send update modal to tab:', error);
                    // Fallback: hiện thông báo trong popup
                    showUpdateNotificationInPopup(updateInfo);
                });
            } else {
                // Fallback: hiện thông báo trong popup
                showUpdateNotificationInPopup(updateInfo);
            }
        });
    }

    if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', checkForUpdatesAndShowModal);
    }

    // Add ripple effect to buttons
    document.querySelectorAll('.btn, .btn-link').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
                    }, 600);
    });



    // Hàm kiểm tra cập nhật khi mở popup
    function checkForUpdatesOnPopupLoad() {
        // console.log('Checking for updates on popup load...');
        
        // Gọi background script để kiểm tra cập nhật
        chrome.runtime.sendMessage({action: "getLatestVersion"}, (response) => {
            if (chrome.runtime.lastError) {
                // console.log('Error checking updates:', chrome.runtime.lastError);
                return;
            }
            
            // console.log('Update check response:', response);
            
            if (response && response.hasUpdate) {
                // Hiện thông báo cập nhật trong popup
                showUpdateNotificationInPopup(response);
            } else if (response && response.latestVersion) {
                // Hiện thông tin phiên bản mới nhất
                showVersionInfoInPopup(response);
            }
        });
    }

    // Hiện thông báo cập nhật trong popup
    function showUpdateNotificationInPopup(updateInfo) {
        // Tạo overlay cho popup
        const overlay = document.createElement('div');
        overlay.className = 'xt-popup-update-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: xt-fadeIn 0.3s ease;
        `;

        // Tạo modal cập nhật
        const modal = document.createElement('div');
        modal.className = 'xt-popup-update-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: xt-slideUp 0.3s ease;
        `;

        // Nội dung modal
        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 20px;">Có phiên bản mới!</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${updateInfo.releaseName}</p>
            </div>
            
            <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #10b981;">
                <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 14px;">📋 Thông tin cập nhật:</h4>
                <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">
                    ${updateInfo.releaseNotes ? updateInfo.releaseNotes.substring(0, 200) + '...' : 'Không có thông tin chi tiết.'}
                </div>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button id="xt-popup-update-btn" style="
                    flex: 1;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">📦 Cập nhật ngay</button>
                <button id="xt-popup-later-btn" style="
                    flex: 1;
                    background: transparent;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">Sau</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Event handlers
        document.getElementById('xt-popup-update-btn').addEventListener('click', () => {
            // Gọi background script để thực hiện cập nhật
            chrome.runtime.sendMessage({action: "performUpdate"}, (response) => {
                if (response && response.success) {
                    showNotification('Đang tải về phiên bản mới...', 'success');
                    overlay.remove();
                } else {
                    showNotification('Không thể cập nhật. Vui lòng thử lại.', 'error');
                }
            });
        });

        document.getElementById('xt-popup-later-btn').addEventListener('click', () => {
            overlay.remove();
        });

        // Đóng khi click ngoài modal
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    // Hiện thông tin phiên bản trong popup
    function showVersionInfoInPopup(versionInfo) {
        // Cập nhật thông tin phiên bản trong popup
        const versionElement = document.getElementById('version');
        if (versionElement && versionInfo.latestVersion) {
            versionElement.textContent = versionInfo.latestVersion;
            versionElement.style.color = '#10b981';
        }
    }

    // Language Management
    const targetLanguageSelect = document.getElementById('target-language-select');
    const customLanguageBtn = document.getElementById('custom-language-btn');
    const recentLanguagesList = document.getElementById('recent-languages-list');
    const favoriteLanguagesList = document.getElementById('favorite-languages-list');

    // Language data
    const languageData = {
        'Vietnamese': { name: 'Tiếng Việt' },
        'English': { name: 'English' },
        'Japanese': { name: '日本語' },
        'Korean': { name: '한국어' },
        'Chinese': { name: '中文' },
        'French': { name: 'Français' },
        'German': { name: 'Deutsch' },
        'Spanish': { name: 'Español' },
        'Italian': { name: 'Italiano' },
        'Russian': { name: 'Русский' },
        'Portuguese': { name: 'Português' },
        'Thai': { name: 'ไทย' },
        'Indonesian': { name: 'Bahasa Indonesia' },
        'Malay': { name: 'Bahasa Melayu' },
        'Arabic': { name: 'العربية' },
        'Hindi': { name: 'हिन्दी' }
    };

    // Load current target language
    async function loadTargetLanguage() {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getTargetLanguage"}, resolve);
            });
            
            if (response && response.success) {
                targetLanguageSelect.value = response.language;
                updateCurrentLanguageDisplay(response.language);
            } else {
                targetLanguageSelect.value = 'Vietnamese';
                updateCurrentLanguageDisplay('Vietnamese');
            }
        } catch (error) {
            console.error('Error loading target language:', error);
            targetLanguageSelect.value = 'Vietnamese';
            updateCurrentLanguageDisplay('Vietnamese');
        }
    }

    // Update current language display
    function updateCurrentLanguageDisplay(language) {
        const displayElement = document.getElementById('current-language-display');
        if (displayElement) {
            const languageInfo = languageData[language];
            if (languageInfo) {
                displayElement.innerHTML = languageInfo.name;
            } else {
                displayElement.innerHTML = language;
            }
        }
    }

    // Save target language
    async function saveTargetLanguage(language) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: "saveTargetLanguage",
                    language: language
                }, resolve);
            });
            
            if (response && response.success) {
                await addRecentLanguage(language);
                updateCurrentLanguageDisplay(language);
                showNotification(`Đã chọn ngôn ngữ: ${languageData[language]?.name || language}`, 'success');
                loadLanguageTags();
            } else {
                showNotification('Lỗi khi lưu ngôn ngữ', 'error');
            }
        } catch (error) {
            console.error('Error saving target language:', error);
            showNotification('Lỗi khi lưu ngôn ngữ', 'error');
        }
    }

    // Load language tags
    async function loadLanguageTags() {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getLanguagePreferences"}, resolve);
            });
            
            if (response && response.success) {
                const preferences = response.preferences;
                
                // Load recent languages
                recentLanguagesList.innerHTML = '';
                preferences.recentLanguages?.forEach(lang => {
                    if (lang !== targetLanguageSelect.value) {
                        const tag = createLanguageTag(lang, 'recent');
                        recentLanguagesList.appendChild(tag);
                    }
                });

                // Load favorite languages
                favoriteLanguagesList.innerHTML = '';
                preferences.favoriteLanguages?.forEach(lang => {
                    const tag = createLanguageTag(lang, 'favorite');
                    favoriteLanguagesList.appendChild(tag);
                });
            }
        } catch (error) {
            console.error('Error loading language tags:', error);
        }
    }

    // Create language tag element
    function createLanguageTag(language, type) {
        const tag = document.createElement('div');
        tag.className = 'language-tag';
        tag.innerHTML = `
            <span>${languageData[language]?.name || language}</span>
            ${type === 'favorite' ? '<span class="remove-btn" title="Xóa khỏi yêu thích">×</span>' : ''}
        `;

        tag.addEventListener('click', () => {
            if (type === 'favorite') {
                // Remove from favorites
                removeFromFavorites(language);
            } else {
                // Set as target language
                targetLanguageSelect.value = language;
                saveTargetLanguage(language);
            }
        });

        // Add right-click context menu for recent languages
        if (type === 'recent') {
            tag.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                addToFavorites(language);
            });
            
            // Add tooltip
            tag.title = 'Click để chọn • Right-click để thêm vào yêu thích';
        }

        if (type === 'favorite') {
            tag.title = 'Click để xóa khỏi yêu thích';
        }

        if (type === 'favorite') {
            const removeBtn = tag.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromFavorites(language);
            });
        }

        return tag;
    }

    // Add recent language
    async function addRecentLanguage(language) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getLanguagePreferences"}, resolve);
            });
            
            if (response && response.success) {
                const preferences = response.preferences;
                const recentLanguages = preferences.recentLanguages || [];
                
                // Remove if already exists
                const filtered = recentLanguages.filter(lang => lang !== language);
                // Add to beginning
                filtered.unshift(language);
                // Keep only top 10
                const updated = filtered.slice(0, 10);
                
                preferences.recentLanguages = updated;
                
                const saveResponse = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "saveLanguagePreferences",
                        preferences: preferences
                    }, resolve);
                });
                
                if (saveResponse && saveResponse.success) {
                    loadLanguageTags();
                }
            }
        } catch (error) {
            console.error('Error adding recent language:', error);
        }
    }

    // Remove from favorites
    async function removeFromFavorites(language) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getLanguagePreferences"}, resolve);
            });
            
            if (response && response.success) {
                const preferences = response.preferences;
                preferences.favoriteLanguages = preferences.favoriteLanguages?.filter(lang => lang !== language) || [];
                
                const saveResponse = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "saveLanguagePreferences",
                        preferences: preferences
                    }, resolve);
                });
                
                if (saveResponse && saveResponse.success) {
                    loadLanguageTags();
                    showNotification(`Đã xóa ${languageData[language]?.name || language} khỏi yêu thích`, 'success');
                }
            }
        } catch (error) {
            console.error('Error removing from favorites:', error);
        }
    }

    // Add to favorites
    async function addToFavorites(language) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getLanguagePreferences"}, resolve);
            });
            
            if (response && response.success) {
                const preferences = response.preferences;
                if (!preferences.favoriteLanguages?.includes(language)) {
                    preferences.favoriteLanguages = [...(preferences.favoriteLanguages || []), language];
                    
                    const saveResponse = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: "saveLanguagePreferences",
                            preferences: preferences
                        }, resolve);
                    });
                    
                    if (saveResponse && saveResponse.success) {
                        loadLanguageTags();
                        showNotification(`Đã thêm ${languageData[language]?.name || language} vào yêu thích`, 'success');
                    }
                }
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
        }
    }

    // Custom language modal
    function showCustomLanguageModal() {
        // Check if modal already exists
        const existingModal = document.querySelector('.custom-language-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'custom-language-modal';
        modal.innerHTML = `
            <div class="custom-language-content">
                <h3>🌍 Thêm ngôn ngữ tùy chỉnh</h3>
                <input type="text" class="custom-language-input" placeholder="Nhập tên ngôn ngữ (ví dụ: Dutch, Swedish, etc.)" maxlength="50">
                
                <div class="language-suggestions">
                    <h4>💡 Gợi ý ngôn ngữ phổ biến:</h4>
                    <div class="suggestion-list">
                        <span class="suggestion-item">Dutch</span>
                        <span class="suggestion-item">Swedish</span>
                        <span class="suggestion-item">Norwegian</span>
                        <span class="suggestion-item">Danish</span>
                        <span class="suggestion-item">Finnish</span>
                        <span class="suggestion-item">Polish</span>
                        <span class="suggestion-item">Czech</span>
                        <span class="suggestion-item">Hungarian</span>
                        <span class="suggestion-item">Turkish</span>
                        <span class="suggestion-item">Greek</span>
                    </div>
                </div>
                
                <div class="custom-language-buttons">
                    <button class="btn-secondary" id="cancel-custom-language">Hủy</button>
                    <button class="btn-primary" id="save-custom-language">Lưu</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('.custom-language-input');
        const saveBtn = modal.querySelector('#save-custom-language');
        const cancelBtn = modal.querySelector('#cancel-custom-language');
        const suggestions = modal.querySelectorAll('.suggestion-item');

        // Focus input
        input.focus();

        // Handle suggestions
        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                input.value = suggestion.textContent;
            });
        });

        // Handle save
        saveBtn.addEventListener('click', () => {
            const language = input.value.trim();
            if (language) {
                // Add to select options
                const option = document.createElement('option');
                option.value = language;
                option.textContent = language;
                targetLanguageSelect.appendChild(option);
                
                // Set as current language
                targetLanguageSelect.value = language;
                saveTargetLanguage(language);
                
                modal.remove();
            }
        });

        // Handle cancel - completely rewrite to fix the issue
        cancelBtn.onclick = function() {
            modal.remove();
        };

        // Close on outside click
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        };

        // Handle Enter key
        input.onkeypress = function(e) {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        };

        // Handle Escape key
        const handleEscape = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Event listeners
    targetLanguageSelect.addEventListener('change', () => {
        saveTargetLanguage(targetLanguageSelect.value);
    });

    // Add right-click to add language to favorites
    targetLanguageSelect.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const selectedLanguage = targetLanguageSelect.value;
        addToFavorites(selectedLanguage);
    });

    customLanguageBtn.onclick = showCustomLanguageModal;

    // Initialize language management
    loadTargetLanguage();
    loadLanguageTags();

    // Không tự động kiểm tra cập nhật nữa, user sẽ nhấn nút để kiểm tra
    // console.log('Popup loaded - ready for manual update check');
});
});