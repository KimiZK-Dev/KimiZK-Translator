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
                    '📋 Phiên bản mới nhất trên GitHub', 
                    `${updateInfo.releaseName || `KimiZK-Translator v${updateInfo.latestVersion}`} - Đang sử dụng phiên bản mới nhất`
                );
            }
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
    
    // Default response for unknown actions
    console.log('Unknown action:', request.action);
    sendResponse({ error: 'Unknown action' });
    return false;
});

// Xử lý cài đặt và cập nhật extension - Đã được di chuyển lên trên

// Xử lý khi service worker được kích hoạt
chrome.runtime.onStartup.addListener(() => {
    console.log('KimiZK-Translator Service Worker started');
    // Check update ngay khi khởi động
    setTimeout(() => {
        checkForUpdatesOnStartup();
        scheduleUpdateCheck();
    }, 2000); // Delay 2 giây để đảm bảo browser đã sẵn sàng
});

// Thêm listener cho khi tab được tạo mới
chrome.tabs.onCreated.addListener((tab) => {
    // Kiểm tra cập nhật khi tab mới được tạo (ngầm)
    setTimeout(() => {
        chrome.storage.local.get(['lastUpdateCheck', 'updateReminderTime'], (result) => {
            const now = Date.now();
            const lastCheck = result.lastUpdateCheck || 0;
            const reminderTime = result.updateReminderTime || 0;
            
            // Kiểm tra nếu đã qua 6 giờ hoặc reminder time đã đến
            if ((now - lastCheck > UPDATE_CHECK_INTERVAL) || (now > reminderTime)) {
                console.log('Checking for updates on new tab creation...');
                checkForUpdates().then(updateInfo => {
                    if (updateInfo.hasUpdate) {
                        // Gửi modal cập nhật đến tab mới
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "showUpdateModal",
                                updateInfo: updateInfo
                            }).catch((error) => {
                                console.log('Failed to send update modal to new tab:', error);
                            });
                        }, 3000); // Delay 3 giây để tab load xong
                    }
                }).catch(error => {
                    console.error('Error checking updates on new tab:', error);
                });
            }
        });
    }, 1000);
});

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
                
                // Hiển thị modal cập nhật nếu có phiên bản mới
                if (updateInfo.hasUpdate) {
                    chrome.tabs.query({}, (tabs) => {
                        console.log('Found tabs:', tabs.length);
                        tabs.forEach(tab => {
                            console.log('Sending update modal to tab:', tab.id);
                            chrome.tabs.sendMessage(tab.id, {
                                action: "showUpdateModal",
                                updateInfo: updateInfo
                            }).catch((error) => {
                                console.log('Failed to send update modal to tab', tab.id, ':', error);
                            });
                        });
                    });
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
                    // Gửi modal cập nhật đến tất cả tabs
                    chrome.tabs.query({}, (tabs) => {
                        console.log('Found tabs for periodic check:', tabs.length);
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: "showUpdateModal",
                                updateInfo: updateInfo
                            }).catch((error) => {
                                console.log('Failed to send update modal to tab', tab.id, ':', error);
                            });
                        });
                    });
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
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) throw new Error('Failed to fetch release info');
        
        const releaseData = await response.json();
        const latestVersion = releaseData.tag_name.replace('v', '');
        
        console.log('Latest version from GitHub:', latestVersion);
        
        // Luôn trả về thông tin phiên bản mới nhất từ GitHub
        console.log('Latest version from GitHub:', latestVersion);
        
        if (latestVersion !== CURRENT_VERSION) {
            console.log('Update available!');
            return {
                hasUpdate: true,
                currentVersion: CURRENT_VERSION,
                latestVersion: latestVersion,
                releaseNotes: releaseData.body,
                downloadUrl: releaseData.html_url,
                releaseName: releaseData.name || `KimiZK-Translator v${latestVersion}`,
                message: `🚀 Có phiên bản mới ${latestVersion} sẵn sàng cập nhật! ${releaseData.name || `KimiZK-Translator v${latestVersion}`} với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3!`
            };
        } else {
            console.log('No update available - using latest version');
            return { 
                hasUpdate: false,
                currentVersion: CURRENT_VERSION,
                latestVersion: latestVersion,
                releaseName: releaseData.name || `KimiZK-Translator v${latestVersion}`,
                message: `✅ Đang sử dụng ${releaseData.name || `KimiZK-Translator v${latestVersion}`} - phiên bản mới nhất với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3`
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
        // Lấy thông tin release mới nhất
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) throw new Error('Failed to fetch release info');
        
        const releaseData = await response.json();
        const downloadUrl = releaseData.assets?.[0]?.browser_download_url;
        
        if (!downloadUrl) {
            throw new Error('No download URL found in release');
        }
        
        console.log('Downloading update from:', downloadUrl);
        
        // Download file extension mới
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) throw new Error('Failed to download update');
        
        const blob = await downloadResponse.blob();
        
        // Tạo URL cho blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Tự động cài đặt extension mới
        try {
            // Sử dụng chrome.management API để cài đặt extension
            const installResult = await installExtensionFromBlob(blob);
            
            if (installResult.success) {
                            showUpdateNotification(
                '🎉 Cập nhật thành công!', 
                `${releaseData.name || `KimiZK-Translator v${releaseData.tag_name}`} đã được cập nhật thành công!`
            );
                
                // Reload extension sau khi cài đặt
                setTimeout(() => {
                    chrome.runtime.reload();
                }, 2000);
                
                return { 
                    success: true, 
                    message: 'Update installed successfully',
                    newVersion: releaseData.tag_name
                };
            } else {
                throw new Error(installResult.error);
            }
            
        } catch (installError) {
            console.error('Installation failed:', installError);
            
            // Fallback: Mở tab download để user cài đặt thủ công
            chrome.tabs.create({
                url: downloadUrl,
                active: true
            });
            
                    showUpdateNotification(
            '📦 Tải về thành công!', 
            `${releaseData.name || `KimiZK-Translator v${releaseData.tag_name}`} đã được tải về. Vui lòng làm theo hướng dẫn trong tab vừa mở để cài đặt phiên bản mới với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3!`
        );
            
            return { 
                success: true, 
                message: 'Update downloaded successfully',
                downloadUrl: downloadUrl
            };
        }
        
    } catch (error) {
        console.error('Error performing update:', error);
        
        // Fallback: Mở trang releases để user download thủ công
        chrome.tabs.create({
            url: 'https://github.com/KimiZK-Dev/KimiZK-Translator/releases',
            active: true
        });
        
        showUpdateNotification(
            '⚠️ Không thể tải tự động', 
            'Đã mở trang GitHub Releases để bạn tải về và cài đặt thủ công. Phiên bản mới có Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3!'
        );
        
        return { 
            success: false, 
            error: error.message,
            fallbackUrl: 'https://github.com/KimiZK-Dev/KimiZK-Translator/releases'
        };
    }
}

// Hàm cài đặt extension từ blob
async function installExtensionFromBlob(blob) {
    return new Promise((resolve) => {
        try {
            // Tạo file reader để đọc blob
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    // Chuyển đổi blob thành base64
                    const base64Data = e.target.result.split(',')[1];
                    
                    // Sử dụng chrome.management API để cài đặt
                    chrome.management.install({
                        data: base64Data,
                        callback: (result) => {
                            if (chrome.runtime.lastError) {
                                resolve({
                                    success: false,
                                    error: chrome.runtime.lastError.message
                                });
                            } else {
                                resolve({
                                    success: true,
                                    result: result
                                });
                            }
                        }
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        error: error.message
                    });
                }
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            resolve({
                success: false,
                error: error.message
            });
        }
    });
}

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