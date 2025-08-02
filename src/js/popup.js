document.addEventListener("DOMContentLoaded", () => {
    // Function to show notification (modern design)
    function showNotification(message, type = "info", duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Get color scheme based on type
        const colors = {
            success: {
                bg: '#f0fdf4',
                border: '#22c55e',
                text: '#166534',
                icon: '#22c55e'
            },
            error: {
                bg: '#fef2f2',
                border: '#ef4444',
                text: '#991b1b',
                icon: '#ef4444'
            },
            info: {
                bg: '#eff6ff',
                border: '#3b82f6',
                text: '#1e40af',
                icon: '#3b82f6'
            }
        };
        
        const colorScheme = colors[type] || colors.info;
        
        // Get icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        const icon = icons[type] || icons.info;
        
        notification.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            left: 12px;
            background: ${colorScheme.bg};
            border: 1px solid ${colorScheme.border};
            color: ${colorScheme.text};
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            transform: translateY(-100%);
            opacity: 0;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 6px;
            backdrop-filter: blur(6px);
            max-width: calc(100vw - 24px);
            word-wrap: break-word;
            line-height: 1.3;
        `;
        
        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.style.cssText = `
            font-size: 14px;
            flex-shrink: 0;
            color: ${colorScheme.icon};
        `;
        iconElement.textContent = icon;
        
        // Create message element
        const messageElement = document.createElement('span');
        messageElement.style.cssText = `
            flex: 1;
            line-height: 1.4;
        `;
        messageElement.textContent = message;
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: ${colorScheme.text};
            cursor: pointer;
            padding: 2px;
            border-radius: 3px;
            font-size: 12px;
            opacity: 0.6;
            transition: opacity 0.2s;
            flex-shrink: 0;
            line-height: 1;
        `;
        closeButton.innerHTML = '×';
        closeButton.onmouseenter = () => closeButton.style.opacity = '1';
        closeButton.onmouseleave = () => closeButton.style.opacity = '0.7';
        closeButton.onclick = () => {
            notification.style.transform = 'translateY(-100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        };
        
        // Assemble notification
        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        notification.appendChild(closeButton);
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 100);
        
        // Auto dismiss
        setTimeout(() => {
            notification.style.transform = 'translateY(-100%)';
            notification.style.opacity = '0';
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
    
    // Debug: Check if button exists
    if (checkUpdateBtn) {
        // console.log('Update button found and initialized');
    } else {
        console.error('Update button not found in DOM');
    }

    // Kiểm tra cập nhật và hiện bảng ở giữa màn hình
    function checkForUpdatesAndShowModal() {
        if (!checkUpdateBtn) {
            console.error('Update button not found');
            return;
        }
        
        checkUpdateBtn.classList.add('loading');
        checkUpdateBtn.textContent = 'Đang kiểm tra...';
        checkUpdateBtn.disabled = true;

        // Delay 1.5s để tạo cảm giác loading
        setTimeout(() => {
            // Gọi background script để kiểm tra cập nhật
            chrome.runtime.sendMessage({action: "getLatestVersion"}, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error checking updates:', chrome.runtime.lastError);
                    showNotification('Không thể kiểm tra cập nhật: ' + chrome.runtime.lastError.message, 'error');
                    resetCheckUpdateBtn();
                    return;
                }
                
                // console.log('Update check response:', response);
                
                if (response && response.hasUpdate) {
                    // Hiện modal cập nhật ở giữa màn hình
                    showUpdateModalInPage(response);
                } else if (response && response.latestVersion) {
                    // Hiển thị thông báo phù hợp dựa trên message từ background
                    showNotification(response.message || 'Đang sử dụng phiên bản mới nhất', 'success');
                } else if (response && response.error) {
                    showNotification('Lỗi kiểm tra cập nhật', 'error');
                } else {
                    showNotification('Không thể kiểm tra cập nhật', 'error');
                }
                
                resetCheckUpdateBtn();
            });
        }, 1500); // Loading 1.5 giây
    }

    function resetCheckUpdateBtn() {
        checkUpdateBtn.classList.remove('loading');
        checkUpdateBtn.textContent = 'Kiểm tra bản cập nhật';
        checkUpdateBtn.disabled = false;
    }

    // Hiện modal cập nhật ở giữa màn hình (không phải trong popup)
    function showUpdateModalInPage(updateInfo) {
        // console.log('Attempting to show update modal in page:', updateInfo);
        
        // Kiểm tra xem có tab active không
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            // console.log('Found tabs:', tabs);
            
            if (tabs && tabs[0]) {
                // console.log('Sending message to tab:', tabs[0].id);
                
                // Kiểm tra xem tab có phải là trang web thông thường không
                if (tabs[0].url && (tabs[0].url.startsWith('http://') || tabs[0].url.startsWith('https://'))) {
                    // Thử gửi message với timeout
                    const messagePromise = new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "showUpdateModal",
                            updateInfo: updateInfo
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    
                    // Timeout sau 2 giây
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Message timeout')), 2000);
                    });
                    
                    Promise.race([messagePromise, timeoutPromise])
                        .then((response) => {
                            // console.log('Message sent successfully:', response);
                        })
                        .catch((error) => {
                            console.error('Failed to send update modal to tab:', error);
                            // console.log('Falling back to popup notification');
                            
                            // Thử inject content script nếu có thể
                            if (chrome.scripting && chrome.scripting.executeScript) {
                                chrome.scripting.executeScript({
                                    target: { tabId: tabs[0].id },
                                    files: ['src/js/update_modal.js']
                                }).then(() => {
                                    // console.log('Content script injected, retrying message');
                                    // Thử gửi message lại
                                    setTimeout(() => {
                                        chrome.tabs.sendMessage(tabs[0].id, {
                                            action: "showUpdateModal",
                                            updateInfo: updateInfo
                                        }, (response) => {
                                            if (chrome.runtime.lastError) {
                                                // console.log('Still failed, using popup fallback');
                                                showUpdateNotificationInPopup(updateInfo);
                                            } else {
                                                // console.log('Message sent successfully after injection');
                                            }
                                        });
                                    }, 500);
                                }).catch((injectError) => {
                                    // console.log('Failed to inject content script, using popup fallback');
                                    showUpdateNotificationInPopup(updateInfo);
                                });
                            } else {
                                // Fallback: hiện thông báo trong popup
                                showUpdateNotificationInPopup(updateInfo);
                            }
                        });
                } else {
                    // console.log('Tab is not a regular web page, showing in popup');
                    showUpdateNotificationInPopup(updateInfo);
                }
            } else {
                // console.log('No active tab found, showing in popup');
                // Fallback: hiện thông báo trong popup
                showUpdateNotificationInPopup(updateInfo);
            }
        });
    }

    if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', () => {
            // console.log('Update button clicked');
            checkForUpdatesAndShowModal();
        });
        
        // Add a test function to window for debugging
        window.testUpdateCheck = () => {
            // console.log('Testing update check...');
            checkForUpdatesAndShowModal();
        };
    } else {
        console.error('Cannot add event listener: Update button not found');
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

    // Hiện thông báo cập nhật trong popup (fallback)
    function showUpdateNotificationInPopup(updateInfo) {
        // console.log('Showing update notification in popup (fallback)');
        
        // Hiển thị notification đơn giản thay vì modal phức tạp
        const message = `🚀 Có bản mới v${updateInfo.latestVersion}! Nhấn để cập nhật.`;
        
        // Tạo notification với action button
        const notification = document.createElement('div');
        notification.className = 'notification notification-update';
        
        notification.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            left: 12px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(6px);
            max-width: calc(100vw - 24px);
            word-wrap: break-word;
            line-height: 1.3;
        `;
        
        // Icon
        const iconElement = document.createElement('span');
        iconElement.style.cssText = `
            font-size: 16px;
            flex-shrink: 0;
        `;
        iconElement.textContent = '🚀';
        
        // Message
        const messageElement = document.createElement('span');
        messageElement.style.cssText = `
            flex: 1;
            line-height: 1.4;
        `;
        messageElement.textContent = message;
        
        // Update button
        const updateButton = document.createElement('button');
        updateButton.style.cssText = `
            background: #f59e0b;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            flex-shrink: 0;
        `;
        updateButton.textContent = 'Cập nhật';
        updateButton.onmouseenter = () => updateButton.style.background = '#d97706';
        updateButton.onmouseleave = () => updateButton.style.background = '#f59e0b';
        updateButton.onclick = () => {
            // Gọi background script để thực hiện cập nhật
            chrome.runtime.sendMessage({action: "performUpdate"}, (response) => {
                if (response && response.success) {
                    showNotification('📦 Đang tải bản cập nhật...', 'success');
                } else {
                    showNotification('❌ Không thể cập nhật', 'error');
                }
            });
            notification.remove();
        };
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: #92400e;
            cursor: pointer;
            padding: 2px;
            border-radius: 3px;
            font-size: 12px;
            opacity: 0.6;
            transition: opacity 0.2s;
            flex-shrink: 0;
            line-height: 1;
        `;
        closeButton.innerHTML = '×';
        closeButton.onmouseenter = () => closeButton.style.opacity = '1';
        closeButton.onmouseleave = () => closeButton.style.opacity = '0.6';
        closeButton.onclick = () => notification.remove();
        
        // Assemble notification
        notification.appendChild(iconElement);
        notification.appendChild(messageElement);
        notification.appendChild(updateButton);
        notification.appendChild(closeButton);
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
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
        `;

        // Left click to select language
        tag.addEventListener('click', () => {
            targetLanguageSelect.value = language;
            saveTargetLanguage(language);
            showNotification(`Đã chọn ngôn ngữ: ${languageData[language]?.name || language}`, 'success');
        });

        // Right click to remove from list
        tag.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            if (type === 'recent') {
                // Remove from recent languages
                removeFromRecentLanguages(language);
            } else if (type === 'favorite') {
                // Remove from favorites
                removeFromFavorites(language);
            }
        });

        // Set tooltips
        if (type === 'recent') {
            tag.title = 'Click để chọn • Chuột phải để xóa khỏi gần đây';
        } else if (type === 'favorite') {
            tag.title = 'Click để chọn • Chuột phải để xóa khỏi yêu thích';
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

    // Remove from recent languages
    async function removeFromRecentLanguages(language) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: "getLanguagePreferences"}, resolve);
            });
            
            if (response && response.success) {
                const preferences = response.preferences;
                preferences.recentLanguages = preferences.recentLanguages?.filter(lang => lang !== language) || [];
                
                const saveResponse = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "saveLanguagePreferences",
                        preferences: preferences
                    }, resolve);
                });
                
                if (saveResponse && saveResponse.success) {
                    loadLanguageTags();
                    showNotification(`Đã xóa "${languageData[language]?.name || language}" khỏi ngôn ngữ gần đây`, 'success');
                }
            }
        } catch (error) {
            console.error('Error removing from recent languages:', error);
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
                    showNotification(`Đã xóa "${languageData[language]?.name || language}" khỏi yêu thích`, 'success');
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
                <input type="text" class="custom-language-input" placeholder="Nhập tên ngôn ngữ" maxlength="100">
                <div class="input-help">💡 Để thêm nhiều ngôn ngữ, nhập theo định dạng: ngôn ngữ 1, ngôn ngữ 2, ngôn ngữ 3</div>
                
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

        // Function to update suggestion states based on input value
        const updateSuggestionStates = () => {
            const currentValue = input.value.trim();
            const selectedLanguages = currentValue ? currentValue.split(',').map(lang => lang.trim()) : [];
            
            suggestions.forEach(suggestion => {
                const suggestionText = suggestion.textContent.trim();
                if (selectedLanguages.includes(suggestionText)) {
                    suggestion.classList.add('selected');
                } else {
                    suggestion.classList.remove('selected');
                }
            });
        };

        // Handle suggestions
        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const currentValue = input.value.trim();
                const clickedLanguage = suggestion.textContent.trim();
                
                // Check if this language is already in the input
                const existingLanguages = currentValue ? currentValue.split(',').map(lang => lang.trim()) : [];
                
                if (existingLanguages.includes(clickedLanguage)) {
                    // Remove if already exists
                    const filteredLanguages = existingLanguages.filter(lang => lang !== clickedLanguage);
                    input.value = filteredLanguages.join(', ');
                } else {
                    // Add to existing languages
                    if (currentValue) {
                        input.value = currentValue + ', ' + clickedLanguage;
                    } else {
                        input.value = clickedLanguage;
                    }
                }
                
                // Update visual states
                updateSuggestionStates();
            });
        });

        // Update suggestion states when input changes
        input.addEventListener('input', updateSuggestionStates);

        // Handle save
        saveBtn.addEventListener('click', () => {
            const inputValue = input.value.trim();
            if (!inputValue) {
                showNotification('Vui lòng nhập tên ngôn ngữ!', 'error');
                return;
            }

            // Check if input contains commas (multiple languages)
            if (inputValue.includes(',')) {
                const languages = inputValue.split(',').map(lang => lang.trim()).filter(lang => lang.length > 0);
                
                if (languages.length === 0) {
                    showNotification('Vui lòng nhập đúng định dạng: ngôn ngữ 1, ngôn ngữ 2, ngôn ngữ 3', 'error');
                    return;
                }

                // Validate each language name
                const invalidLanguages = languages.filter(lang => !/^[a-zA-Z\s]+$/.test(lang));
                if (invalidLanguages.length > 0) {
                    showNotification(`Tên ngôn ngữ không hợp lệ: ${invalidLanguages.join(', ')}. Chỉ cho phép chữ cái và khoảng trắng.`, 'error');
                    return;
                }

                // Add all languages
                languages.forEach(language => {
                    // Check if language already exists
                    const existingOption = Array.from(targetLanguageSelect.options).find(option => 
                        option.value.toLowerCase() === language.toLowerCase()
                    );
                    
                    if (!existingOption) {
                        const option = document.createElement('option');
                        option.value = language;
                        option.textContent = language;
                        targetLanguageSelect.appendChild(option);
                    }
                });

                // Set first language as current
                targetLanguageSelect.value = languages[0];
                saveTargetLanguage(languages[0]);
                
                showNotification(`Đã thêm ${languages.length} ngôn ngữ mới!`, 'success');
                modal.remove();
            } else {
                // Single language
                const language = inputValue;
                
                // Validate single language name
                if (!/^[a-zA-Z\s]+$/.test(language)) {
                    showNotification('Tên ngôn ngữ không hợp lệ. Chỉ cho phép chữ cái và khoảng trắng.', 'error');
                    return;
                }

                // Check if language already exists
                const existingOption = Array.from(targetLanguageSelect.options).find(option => 
                    option.value.toLowerCase() === language.toLowerCase()
                );
                
                if (existingOption) {
                    showNotification('Ngôn ngữ này đã tồn tại trong danh sách!', 'error');
                    return;
                }

                // Add to select options
                const option = document.createElement('option');
                option.value = language;
                option.textContent = language;
                targetLanguageSelect.appendChild(option);
                
                // Set as current language
                targetLanguageSelect.value = language;
                saveTargetLanguage(language);
                
                showNotification(`Đã thêm ngôn ngữ "${language}"!`, 'success');
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

    // Function to show language management modal
    function showLanguageManagementModal() {
        // Remove existing modal if any
        const existingModal = document.querySelector('.language-management-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Get current languages from select
        const languages = Array.from(targetLanguageSelect.options).map(option => ({
            value: option.value,
            text: option.textContent,
            isDefault: ['Vietnamese', 'English', 'Japanese', 'Korean', 'Chinese', 'French', 'German', 'Spanish', 'Italian', 'Russian', 'Portuguese', 'Thai', 'Indonesian', 'Malay', 'Arabic', 'Hindi'].includes(option.value)
        }));

        const modal = document.createElement('div');
        modal.className = 'language-management-modal';
        modal.innerHTML = `
            <div class="language-management-content">
                <div class="modal-header">
                    <h3>Chọn ngôn ngữ bạn muốn</h3>
                    <button class="close-btn" id="close-language-management">×</button>
                </div>
                
                <div class="language-list-container">
                    <div class="language-tags">
                        ${languages.map((lang, index) => `
                            <div class="language-tag ${lang.isDefault ? 'default-language' : ''}" data-value="${lang.value}">
                                <span class="language-tag-text">${lang.text}</span>
                                ${!lang.isDefault ? '<span class="remove-btn" title="Xóa ngôn ngữ này">×</span>' : ''}
                            </div>
                        `).join('')}
                        <div class="language-tag add-language-tag" id="add-language-tag">
                            <span class="language-tag-text">➕ Thêm</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <div class="bulk-actions">
                        <button class="btn-secondary" id="select-all-languages">Chọn tất cả</button>
                        <button class="btn-danger" id="delete-selected-languages" disabled>🗑️ Xóa đã chọn</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Get modal elements
        const closeBtn = modal.querySelector('#close-language-management');
        const addLanguageTag = modal.querySelector('#add-language-tag');
        const deleteSelectedBtn = modal.querySelector('#delete-selected-languages');
        const selectAllBtn = modal.querySelector('#select-all-languages');
        const languageTags = modal.querySelectorAll('.language-tag:not(.add-language-tag)');

        // Handle close button
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);

        // Handle outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle add language tag
        addLanguageTag.addEventListener('click', () => {
            closeModal();
            showCustomLanguageModal();
        });

        // Handle individual remove buttons
        modal.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const languageTag = btn.closest('.language-tag');
                const languageName = languageTag.querySelector('.language-tag-text').textContent;
                
                if (confirm(`Bạn có chắc chắn muốn xóa ngôn ngữ "${languageName}"?`)) {
                    // Remove from select
                    const optionToRemove = Array.from(targetLanguageSelect.options).find(option => 
                        option.value === languageTag.dataset.value
                    );
                    if (optionToRemove) {
                        targetLanguageSelect.removeChild(optionToRemove);
                    }
                    
                    // Remove from modal
                    languageTag.remove();
                    
                    showNotification(`Đã xóa ngôn ngữ "${languageName}"!`, 'success');
                }
            });
        });

        // Handle select all
        selectAllBtn.addEventListener('click', () => {
            const nonDefaultTags = Array.from(languageTags).filter(tag => !tag.classList.contains('default-language'));
            const allSelected = nonDefaultTags.every(tag => tag.classList.contains('selected'));
            
            nonDefaultTags.forEach(tag => {
                if (allSelected) {
                    tag.classList.remove('selected');
                } else {
                    tag.classList.add('selected');
                }
            });
            
            updateDeleteButton();
            selectAllBtn.textContent = allSelected ? 'Chọn tất cả' : 'Bỏ chọn tất cả';
        });

        // Handle individual language tag clicks for selection
        languageTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-btn')) return; // Don't select when clicking remove button
                
                if (!tag.classList.contains('default-language')) {
                    tag.classList.toggle('selected');
                    updateDeleteButton();
                }
            });

            // Handle right-click to select language for translation
            tag.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const languageValue = tag.dataset.value;
                const languageText = tag.querySelector('.language-tag-text').textContent;
                
                // Set as current language
                targetLanguageSelect.value = languageValue;
                saveTargetLanguage(languageValue);
                
                showNotification(`Đã chọn ngôn ngữ dịch: ${languageText}`, 'success');
                closeModal();
            });
        });

        // Handle delete selected
        deleteSelectedBtn.addEventListener('click', () => {
            const selectedTags = Array.from(languageTags).filter(tag => 
                tag.classList.contains('selected') && !tag.classList.contains('default-language')
            );
            
            if (selectedTags.length === 0) {
                showNotification('Vui lòng chọn ngôn ngữ cần xóa!', 'error');
                return;
            }
            
            const selectedLanguages = selectedTags.map(tag => 
                tag.querySelector('.language-tag-text').textContent
            );
            
            const confirmMessage = selectedLanguages.length === 1 
                ? `Bạn có chắc chắn muốn xóa ngôn ngữ "${selectedLanguages[0]}"?`
                : `Bạn có chắc chắn muốn xóa ${selectedLanguages.length} ngôn ngữ: ${selectedLanguages.join(', ')}?`;
            
            if (confirm(confirmMessage)) {
                selectedLanguages.forEach(languageName => {
                    // Remove from select
                    const optionToRemove = Array.from(targetLanguageSelect.options).find(option => 
                        option.textContent === languageName
                    );
                    if (optionToRemove) {
                        targetLanguageSelect.removeChild(optionToRemove);
                    }
                });
                
                // Remove from modal
                selectedTags.forEach(tag => tag.remove());
                
                // Reset selection
                languageTags.forEach(tag => tag.classList.remove('selected'));
                updateDeleteButton();
                selectAllBtn.textContent = 'Chọn tất cả';
                
                showNotification(`Đã xóa ${selectedLanguages.length} ngôn ngữ!`, 'success');
            }
        });

        // Function to update delete button state
        function updateDeleteButton() {
            const hasSelected = Array.from(languageTags).some(tag => 
                tag.classList.contains('selected') && !tag.classList.contains('default-language')
            );
            deleteSelectedBtn.disabled = !hasSelected;
        }

        // Handle Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
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

    // Add click to open language management modal
    targetLanguageSelect.addEventListener('mousedown', (e) => {
        e.preventDefault();
        showLanguageManagementModal();
    });

    customLanguageBtn.onclick = showCustomLanguageModal;



    // Disable right-click context menu except for language tags
    document.addEventListener('contextmenu', (e) => {
        // Allow right-click on language tags
        if (e.target.closest('.language-tag')) {
            return true;
        }
        
        e.preventDefault();
        return false;
    });

    // Disable devtools shortcuts
    document.addEventListener('keydown', (e) => {
        // Disable F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        
        // Disable Ctrl+Shift+I (Windows/Linux) and Cmd+Option+I (Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }
        
        // Disable Ctrl+Shift+C (Windows/Linux) and Cmd+Option+C (Mac)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }
        
        // Disable Ctrl+U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            return false;
        }
    });

    // Initialize language management
    loadTargetLanguage();
    loadLanguageTags();

    // Không tự động kiểm tra cập nhật nữa, user sẽ nhấn nút để kiểm tra
    // console.log('Popup loaded - ready for manual update check');
});
});