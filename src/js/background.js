// Service Worker cho KimiZK-Translator (Manifest V3)
const CURRENT_VERSION = chrome.runtime.getManifest().version;
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest';

// Check for updates every 6 hours
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Đảm bảo service worker được kích hoạt
console.log('KimiZK-Translator Service Worker loading... Version:', CURRENT_VERSION);

// Đảm bảo service worker được kích hoạt
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
});

// Test listener đơn giản
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request.action);
    
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
    
    if (request.action === "test") {
        console.log('Test message received');
        sendResponse({ success: true, message: 'Service worker is working', version: CURRENT_VERSION });
        return true;
    }
    
    if (request.action === "checkForUpdates") {
        console.log('Manual update check requested');
        checkForUpdates().then(updateInfo => {
            console.log('Manual update check result:', updateInfo);
            // Hiển thị modal nếu có cập nhật, thông báo nếu không
            if (updateInfo.hasUpdate) {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "showUpdateModal",
                            updateInfo: updateInfo
                        }).catch((error) => {
                            console.log('Failed to send update modal to tab', tab.id, ':', error);
                        });
                    });
                });
            } else if (updateInfo.latestVersion) {
                showUpdateNotification(
                    '📋 Thông tin phiên bản', 
                    `Phiên bản mới nhất trên GitHub: ${updateInfo.releaseName || `KimiZK-Translator v${updateInfo.latestVersion}`}`
                );
            }
            sendResponse(updateInfo);
        }).catch(error => {
            console.error('Error in checkForUpdates:', error);
            sendResponse({ 
                hasUpdate: false, 
                error: error.message,
                currentVersion: CURRENT_VERSION,
                message: "Lỗi khi kiểm tra cập nhật: " + error.message
            });
        });
        return true;
    }
    
    if (request.action === "performUpdate") {
        performUpdate().then(result => {
            sendResponse(result);
        });
        return true;
    }
    
    if (request.action === "getLatestVersion") {
        console.log('Getting latest version info from GitHub');
        checkForUpdates().then(updateInfo => {
            console.log('Latest version info:', updateInfo);
            sendResponse(updateInfo);
        }).catch(error => {
            console.error('Error getting latest version:', error);
            sendResponse({ 
                error: error.message,
                currentVersion: CURRENT_VERSION,
                message: "Không thể lấy thông tin phiên bản mới nhất: " + error.message
            });
        });
        return true;
    }
    
    if (request.action === "openExtensionsPage") {
        console.log('Opening extensions page');
        chrome.tabs.create({ url: 'chrome://extensions/' }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('Error opening extensions page:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('Extensions page opened successfully');
                sendResponse({ success: true });
            }
        });
        return true;
    }
    
    if (request.action === "showUpdateModal") {
        console.log('Showing update modal from popup');
        checkForUpdates().then(updateInfo => {
            if (updateInfo.hasUpdate) {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "showUpdateModal",
                            updateInfo: updateInfo
                        }).catch((error) => {
                            console.log('Failed to send update modal to active tab:', error);
                        });
                    }
                });
            }
            sendResponse(updateInfo);
        }).catch(error => {
            console.error('Error showing update modal:', error);
            sendResponse({ error: error.message });
        });
        return true;
    }
    
    // Default response for unknown actions
    console.log('Unknown action:', request.action);
    sendResponse({ error: 'Unknown action' });
    return false;
});

// Xử lý cài đặt và cập nhật extension - Đã được di chuyển lên trên

// Xử lý khi service worker được kích hoạt (chỉ khi khởi động trình duyệt)
chrome.runtime.onStartup.addListener(() => {
    console.log('KimiZK-Translator Service Worker started - Browser startup');
    // Check update ngay khi khởi động trình duyệt
    setTimeout(() => {
        checkForUpdatesOnStartup();
        scheduleUpdateCheck();
    }, 2000); // Delay 2 giây để đảm bảo browser đã sẵn sàng
});

// Không kiểm tra cập nhật khi tab mới được tạo để tránh spam
// Chỉ kiểm tra khi khởi động trình duyệt

// Thêm listener cho khi extension được cài đặt/cập nhật
chrome.runtime.onInstalled.addListener((details) => {
    console.log('KimiZK-Translator Service Worker installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Mở trang hướng dẫn khi cài đặt lần đầu
        chrome.tabs.create({
            url: 'https://github.com/KimiZK-Dev/KimiZK-Translator#readme'
        });
        
        // Hiển thị thông báo chào mừng
        showUpdateNotification(
            '🎉 Chào mừng đến với KimiZK-Translator!', 
            `Phiên bản ${CURRENT_VERSION} với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3. Hãy cấu hình Groq API key để bắt đầu!`
        );
        
        // Lưu thời gian cài đặt
        chrome.storage.local.set({ 
            installTime: Date.now(),
            lastUpdateCheck: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    }
    
    if (details.reason === 'update') {
        // Hiển thị thông báo cập nhật thành công
        showUpdateNotification(
            '🎉 Cập nhật thành công!', 
            `KimiZK-Translator đã được cập nhật lên phiên bản ${CURRENT_VERSION}.`
        );
        
        // Lưu thời gian cập nhật
        chrome.storage.local.set({ 
            lastUpdateTime: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    }
    
    // Kiểm tra cập nhật ngay sau khi cài đặt/cập nhật
    setTimeout(() => {
        checkForUpdatesOnStartup();
    }, 3000);
});

// Kiểm tra cập nhật ngay khi khởi động
function checkForUpdatesOnStartup() {
    console.log('=== Starting update check on startup ===');
    
    chrome.storage.local.get(['updateNotifications', 'lastUpdateCheck'], (result) => {
        const notificationsEnabled = result.updateNotifications !== false; // Mặc định bật
        const now = Date.now();
        const lastCheck = result.lastUpdateCheck || 0;
        
        console.log('Notifications enabled:', notificationsEnabled);
        console.log('Last check time:', new Date(lastCheck));
        console.log('Current time:', new Date(now));
        console.log('Time since last check:', now - lastCheck, 'ms');
        
        if (notificationsEnabled) {
            console.log('Checking for updates on startup...');
            checkForUpdates().then(updateInfo => {
                console.log('Update check result:', updateInfo);
                
                // Luôn hiển thị thông tin phiên bản mới nhất từ GitHub
                console.log('Startup version info:', updateInfo);
                
                // Lưu thời gian check
                chrome.storage.local.set({ lastUpdateCheck: now });
                
                // Chỉ hiện thông báo khi khởi động trình duyệt, không gửi modal đến tabs
                if (updateInfo.hasUpdate) {
                    // Hiển thị thông báo cập nhật khi khởi động trình duyệt
                    showUpdateNotification(
                        '🚀 Có phiên bản mới!', 
                        `${updateInfo.releaseName} sẵn sàng cập nhật. Nhấn vào icon tiện ích để cập nhật ngay!`
                    );
                } else {
                    // Hiển thị thông báo về phiên bản mới nhất nếu không có cập nhật
                    if (updateInfo.latestVersion) {
                        showUpdateNotification(
                            '📋 Phiên bản mới nhất trên GitHub', 
                            `${updateInfo.releaseName || `KimiZK-Translator v${updateInfo.latestVersion}`} - Đang sử dụng phiên bản mới nhất`
                        );
                    }
                }
            }).catch(error => {
                console.error('Error checking updates on startup:', error);
            });
        } else {
            console.log('Update notifications are disabled');
        }
    });
}

// Kiểm tra cập nhật định kỳ
function scheduleUpdateCheck() {
    console.log('=== Scheduling periodic update check ===');
    
    chrome.storage.local.get(['lastUpdateCheck', 'updateNotifications'], (result) => {
        const now = Date.now();
        const lastCheck = result.lastUpdateCheck || 0;
        const notificationsEnabled = result.updateNotifications !== false; // Mặc định bật
        
        console.log('Periodic check - Notifications enabled:', notificationsEnabled);
        console.log('Periodic check - Last check time:', new Date(lastCheck));
        console.log('Periodic check - Time since last check:', now - lastCheck, 'ms');
        console.log('Periodic check - Update interval:', UPDATE_CHECK_INTERVAL, 'ms');
        
        // Kiểm tra nếu đã qua 6 giờ kể từ lần check cuối
        if (now - lastCheck > UPDATE_CHECK_INTERVAL && notificationsEnabled) {
            console.log('Time to check for updates...');
            // Lưu thời gian check
            chrome.storage.local.set({ lastUpdateCheck: now });
            
            checkForUpdates().then(updateInfo => {
                console.log('Periodic update check result:', updateInfo);
                
                if (updateInfo.hasUpdate) {
                    console.log('Update available in periodic check:', updateInfo);
                    // Chỉ hiện thông báo, không gửi modal đến tabs
                    showUpdateNotification(
                        '🚀 Có phiên bản mới!', 
                        `${updateInfo.releaseName} sẵn sàng cập nhật. Nhấn vào icon tiện ích để cập nhật ngay!`
                    );
                }
            }).catch(error => {
                console.error('Error in periodic update check:', error);
            });
        } else {
            console.log('Not time for periodic update check yet');
        }
    });
}

// Kiểm tra cập nhật từ GitHub
async function checkForUpdates() {
    try {
        console.log('Checking for updates... Current version:', CURRENT_VERSION);
        
        // Fetch latest release từ GitHub API
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const releaseData = await response.json();
        const latestVersion = releaseData.tag_name.replace('v', ''); // Remove 'v' prefix
        const releaseName = releaseData.name || `KimiZK-Translator v${latestVersion}`;
        const releaseBody = releaseData.body || 'Không có thông tin chi tiết cho phiên bản này.';
        
        // Tìm file .zip trong assets để lấy browser_download_url
        const zipAsset = releaseData.assets?.find(asset => 
            asset.name && asset.name.toLowerCase().includes('.zip')
        );
        
        const downloadUrl = zipAsset ? zipAsset.browser_download_url : releaseData.html_url;
        const directDownloadUrl = zipAsset ? zipAsset.browser_download_url : null;
        
        console.log('Latest version from GitHub API:', latestVersion);
        console.log('Release name:', releaseName);
        console.log('Direct download URL:', directDownloadUrl);
        
        if (latestVersion !== CURRENT_VERSION) {
            console.log('Update available!');
            return {
                hasUpdate: true,
                currentVersion: CURRENT_VERSION,
                latestVersion: latestVersion,
                releaseNotes: releaseBody,
                downloadUrl: downloadUrl,
                directDownloadUrl: directDownloadUrl,
                releaseName: releaseName,
                message: `🚀 Có phiên bản mới ${latestVersion} sẵn sàng cập nhật! ${releaseName} với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3!`
            };
        } else {
            console.log('No update available - using latest version');
            return { 
                hasUpdate: false,
                currentVersion: CURRENT_VERSION,
                latestVersion: latestVersion,
                releaseName: releaseName,
                message: `✅ Đang sử dụng ${releaseName} - phiên bản mới nhất với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3`
            };
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        return { 
            hasUpdate: false, 
            error: error.message,
            currentVersion: CURRENT_VERSION,
            message: "❌ Không thể kiểm tra cập nhật: " + error.message
        };
    }
}

// Thực hiện cập nhật tự động
async function performUpdate() {
    try {
        // Fetch latest release từ GitHub API để lấy thông tin version mới nhất
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const releaseData = await response.json();
        const latestVersion = releaseData.tag_name.replace('v', ''); // Remove 'v' prefix
        const releaseName = releaseData.name || `KimiZK-Translator v${latestVersion}`;
        
        // Tìm file .zip trong assets để lấy browser_download_url
        const zipAsset = releaseData.assets?.find(asset => 
            asset.name && asset.name.toLowerCase().includes('.zip')
        );
        
        if (zipAsset && zipAsset.browser_download_url) {
            console.log('Direct download URL found:', zipAsset.browser_download_url);
            
            // Tải trực tiếp từ browser_download_url
            chrome.downloads.download({
                url: zipAsset.browser_download_url,
                filename: zipAsset.name || `KimiZK-Translator-v${latestVersion}.zip`,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('Download error:', chrome.runtime.lastError);
                    // Fallback: mở trang releases
                    chrome.tabs.create({
                        url: releaseData.html_url,
                        active: true
                    });
                } else {
                    console.log('Download started with ID:', downloadId);
                }
            });
            
            // Hiện bảng hướng dẫn cài đặt thủ công
            showInstallationGuide(releaseName);
            
            return { 
                success: true, 
                message: 'Update downloaded successfully',
                downloadUrl: zipAsset.browser_download_url,
                newVersion: latestVersion,
                releaseName: releaseName
            };
        } else {
            // Fallback: mở trang releases nếu không tìm thấy file zip
            console.log('No zip file found, opening releases page:', releaseData.html_url);
            
            chrome.tabs.create({
                url: releaseData.html_url,
                active: true
            });
            
            showUpdateNotification(
                '📦 Tải về thủ công!', 
                `${releaseName} - Vui lòng tải về từ trang GitHub Releases trong tab vừa mở!`
            );
            
            return { 
                success: true, 
                message: 'Update download page opened successfully',
                downloadUrl: releaseData.html_url,
                newVersion: latestVersion,
                releaseName: releaseName
            };
        }
        
    } catch (error) {
        console.error('Error performing update:', error);
        return { 
            success: false, 
            error: error.message,
            message: 'Không thể thực hiện cập nhật: ' + error.message
        };
    }
}

// Hàm cài đặt extension từ blob đã được loại bỏ vì không cần thiết
// Giờ sử dụng chrome.downloads.download trực tiếp từ browser_download_url

// Hiển thị thông báo cập nhật
function showUpdateNotification(title, message) {
    try {
        // Thử tạo notification với icon
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
            title: title,
            message: message
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error('Notification with icon failed:', chrome.runtime.lastError);
                // Fallback: tạo notification không có icon
                chrome.notifications.create({
                    type: 'basic',
                    title: title,
                    message: message
                }, (fallbackId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Fallback notification failed:', chrome.runtime.lastError);
                    } else {
                        console.log('Fallback notification created successfully');
                    }
                });
            } else {
                console.log('Notification created successfully with icon');
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        // Final fallback: tạo notification đơn giản nhất
        try {
            chrome.notifications.create({
                type: 'basic',
                title: title,
                message: message
            });
        } catch (finalError) {
            console.error('Final fallback notification failed:', finalError);
        }
    }
}

// Hiển thị bảng hướng dẫn cài đặt thủ công
function showInstallationGuide(releaseName) {
    // Gửi message đến content script để hiện bảng hướng dẫn
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "showInstallationGuide",
                releaseName: releaseName
            }).catch((error) => {
                console.log('Failed to send installation guide to tab:', error);
                // Fallback: hiện thông báo đơn giản
                showUpdateNotification(
                    '📦 Tải về thành công!', 
                    `${releaseName} đã được tải về. Vui lòng làm theo hướng dẫn cài đặt thủ công!`
                );
            });
        } else {
            // Fallback: hiện thông báo đơn giản
            showUpdateNotification(
                '📦 Tải về thành công!', 
                `${releaseName} đã được tải về. Vui lòng làm theo hướng dẫn cài đặt thủ công!`
            );
        }
    });
}