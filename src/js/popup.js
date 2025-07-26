document.addEventListener("DOMContentLoaded", () => {
    // Hiển thị phiên bản
    const version = chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = version;

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
        document.getElementById("current-time").textContent = now.toLocaleString("vi-VN", options);
    };
    updateTime();
    setInterval(updateTime, 1000);

    // Bật/tắt thông báo cập nhật
    const updateNotificationsCheckbox = document.getElementById("update-notifications");
    chrome.storage.local.get(["updateNotifications"], (result) => {
        updateNotificationsCheckbox.checked = result.updateNotifications !== false; // Mặc định bật
    });
    updateNotificationsCheckbox.addEventListener("change", () => {
        chrome.storage.local.set({ updateNotifications: updateNotificationsCheckbox.checked });
    });

    // Quản lý API Key
    const apiKeyInput = document.getElementById("api-key-input");
    const saveApiKeyButton = document.getElementById("save-api-key");
    const apiKeyStatus = document.getElementById("api-key-status");

    chrome.storage.local.get(["API_KEY"], (result) => {
        if (result.API_KEY) {
            apiKeyInput.disabled = false;
            saveApiKeyButton.disabled = false;
            apiKeyInput.placeholder = "API Key đã được lưu (nhập để thay đổi)";
        }
    });

    saveApiKeyButton.addEventListener("click", () => {
        const newKey = apiKeyInput.value.trim();
        if (!newKey || newKey.length < 10) {
            apiKeyStatus.textContent = "API Key không hợp lệ!";
            return;
        }
        chrome.runtime.sendMessage({ action: "saveApiKey", key: newKey }, (response) => {
            if (response && response.success) {
                apiKeyStatus.textContent = "API Key đã được lưu!";
                apiKeyStatus.style.color = "#28a745";
                apiKeyInput.value = "";
            } else {
                apiKeyStatus.textContent = "Lỗi khi lưu API Key!";
            }
            setTimeout(() => { apiKeyStatus.textContent = ""; }, 3000);
        });
    });

    // Liên kết GitHub và Facebook
    document.getElementById("github-link").addEventListener("click", () => {
        chrome.tabs.create({ url: "https://github.com/KimiZK-Dev" });
    });
    document.getElementById("facebook-link").addEventListener("click", () => {
        chrome.tabs.create({ url: "https://www.facebook.com/nhb.xyz" });
    });
});