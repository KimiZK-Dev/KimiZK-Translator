// Service Worker cho KimiZK-Translator (Manifest V3)
const CURRENT_VERSION = '1.0.2';
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest';

// Check for updates every 6 hours
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveApiKey") {
        chrome.storage.local.set({ API_KEY: request.key }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true });
            }
        });
        return true; // Giữ kết nối cho async response
    }
    
    if (request.action === "checkForUpdates") {
        checkForUpdates().then(updateInfo => {
            sendResponse(updateInfo);
        });
        return true;
    }
    
    if (request.action === "performUpdate") {
        performUpdate().then(result => {
            sendResponse(result);
        });
        return true;
    }
});

// Xử lý cài đặt và cập nhật extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('KimiZK-Translator Service Worker installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Mở trang hướng dẫn khi cài đặt lần đầu
        chrome.tabs.create({
            url: 'https://github.com/KimiZK-Dev/KimiZK-Translator#readme'
        });
        
        // Lưu thời gian cài đặt
        chrome.storage.local.set({ 
            installTime: Date.now(),
            lastUpdateCheck: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    }
    
    if (details.reason === 'update') {
        // Hiển thị thông báo cập nhật thành công
        showUpdateNotification('Cập nhật thành công!', `Đã cập nhật lên phiên bản ${CURRENT_VERSION}`);
        
        // Lưu thời gian cập nhật
        chrome.storage.local.set({ 
            lastUpdateTime: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    }
});

// Xử lý khi service worker được kích hoạt
chrome.runtime.onStartup.addListener(() => {
    console.log('KimiZK-Translator Service Worker started');
    scheduleUpdateCheck();
});

// Kiểm tra cập nhật định kỳ
function scheduleUpdateCheck() {
    chrome.storage.local.get(['lastUpdateCheck', 'updateNotifications'], (result) => {
        const now = Date.now();
        const lastCheck = result.lastUpdateCheck || 0;
        const notificationsEnabled = result.updateNotifications !== false; // Mặc định bật
        
        // Kiểm tra nếu đã qua 6 giờ kể từ lần check cuối
        if (now - lastCheck > UPDATE_CHECK_INTERVAL && notificationsEnabled) {
            // Lưu thời gian check
            chrome.storage.local.set({ lastUpdateCheck: now });
            
            checkForUpdates().then(updateInfo => {
                if (updateInfo.hasUpdate) {
                    // Gửi thông báo đến tất cả tabs
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "showUpdateNotification",
                                updateInfo: updateInfo
                            }).catch(() => {
                                // Tab có thể không load content script
                            });
                        });
                    });
                }
            });
        }
    });
}

// Kiểm tra cập nhật từ GitHub
async function checkForUpdates() {
    try {
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) throw new Error('Failed to fetch release info');
        
        const releaseData = await response.json();
        const latestVersion = releaseData.tag_name.replace('v', '');
        
        if (latestVersion !== CURRENT_VERSION) {
            return {
                hasUpdate: true,
                currentVersion: CURRENT_VERSION,
                latestVersion: latestVersion,
                releaseNotes: releaseData.body,
                downloadUrl: releaseData.html_url
            };
        }
        
        return { hasUpdate: false };
    } catch (error) {
        console.error('Error checking for updates:', error);
        return { hasUpdate: false, error: error.message };
    }
}

// Thực hiện cập nhật
async function performUpdate() {
    try {
        // Reload extension để áp dụng cập nhật
        chrome.runtime.reload();
        return { success: true };
    } catch (error) {
        console.error('Error performing update:', error);
        return { success: false, error: error.message };
    }
}

// Hiển thị thông báo cập nhật
function showUpdateNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'src/icons/icon128.png',
        title: title,
        message: message
    });
} 