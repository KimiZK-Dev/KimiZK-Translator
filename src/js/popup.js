document.addEventListener("DOMContentLoaded", () => {
    // Hiển thị phiên bản extension
    try {
        const version = chrome.runtime.getManifest().version;
        document.getElementById("version").textContent = version;
    } catch (error) {
        // Fallback for demo
        document.getElementById("version").textContent = "1.2.0";
    }

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
            console.log('Storage not available in demo mode');
        }
    });

    checkbox.addEventListener('change', () => {
        updateCheckboxDisplay();
        try {
            chrome.storage.local.set({
                updateNotifications: checkbox.checked
            });
        } catch (error) {
            console.log('Storage not available in demo mode');
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

    // Check for updates (background script handles this automatically)
    // No need to show update notification in popup anymore

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
});
});