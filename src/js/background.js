// Service Worker for KimiZK-Translator (Manifest V3)
const CURRENT_VERSION = chrome.runtime.getManifest().version;

// console.log('KimiZK-Translator Service Worker loading... Version:', CURRENT_VERSION);

// Background notification helper
const BackgroundNotifications = {
    /**
     * Show Chrome notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     */
    show(title, message) {
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
                title: title,
                message: message
            }, (notificationId) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome notification failed:', chrome.runtime.lastError);
                    // Fallback: create without icon
                    chrome.notifications.create({
                        type: 'basic',
                        title: title,
                        message: message
                    });
                }
            });
        } catch (error) {
            console.error('Error creating Chrome notification:', error);
        }
    }
};

/**
 * Compare two version strings
 * @param {string} version1 - First version string (e.g., "1.0.3")
 * @param {string} version2 - Second version string (e.g., "1.0.4")
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(part => parseInt(part, 10) || 0);
    const v2Parts = version2.split('.').map(part => parseInt(part, 10) || 0);
    
    // Pad with zeros to make arrays same length
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
        if (v1Parts[i] < v2Parts[i]) return -1;
        if (v1Parts[i] > v2Parts[i]) return 1;
    }
    
    return 0;
}

// Test function for version comparison (for debugging)
function testVersionComparison() {
    const testCases = [
        { v1: "1.0.3", v2: "1.0.4", expected: -1 },
        { v1: "1.0.4", v2: "1.0.3", expected: 1 },
        { v1: "1.0.4", v2: "1.0.4", expected: 0 },
        { v1: "1.0.3", v2: "1.0.10", expected: -1 },
        { v1: "1.0.10", v2: "1.0.3", expected: 1 },
        { v1: "1.0.0", v2: "1.0.0", expected: 0 },
        { v1: "2.0.0", v2: "1.9.9", expected: 1 },
        { v1: "1.9.9", v2: "2.0.0", expected: -1 }
    ];
    
    // console.log('Testing version comparison logic:');
    testCases.forEach((test, index) => {
        const result = compareVersions(test.v1, test.v2);
        const passed = result === test.expected;
        // console.log(`Test ${index + 1}: ${test.v1} vs ${test.v2} = ${result} (expected: ${test.expected}) - ${passed ? 'PASS' : 'FAIL'}`);
    });
}

// Run test on startup
testVersionComparison();

// Service Worker lifecycle events
self.addEventListener('install', (event) => {
    // console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
    // console.log('Service Worker activated');
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Message received:', request.action);
    
    switch (request.action) {
        case "saveApiKey":
            BackgroundService._handleSaveApiKey(request.key, sendResponse);
            return true;
            
        case "test":
            sendResponse({ success: true, message: 'Service worker is working', version: CURRENT_VERSION });
            return false;
            
        case "checkForUpdates":
            BackgroundService._handleCheckForUpdates(sendResponse);
            return true;
            
        case "performUpdate":
            BackgroundService._handlePerformUpdate(sendResponse);
            return true;
            
        case "getLatestVersion":
            BackgroundService._handleGetLatestVersion(sendResponse);
            return true;
            
        case "openExtensionsPage":
            BackgroundService._handleOpenExtensionsPage(sendResponse);
            return true;
            
        case "showUpdateModal":
            BackgroundService._handleShowUpdateModal(sendResponse);
            return true;
            
        case "saveTargetLanguage":
            BackgroundService._handleSaveTargetLanguage(request.language, sendResponse);
            return true;
            
        case "getTargetLanguage":
            BackgroundService._handleGetTargetLanguage(sendResponse);
            return true;
            
        case "saveLanguagePreferences":
            BackgroundService._handleSaveLanguagePreferences(request.preferences, sendResponse);
            return true;
            
        case "getLanguagePreferences":
            BackgroundService._handleGetLanguagePreferences(sendResponse);
            return true;
            
        default:
            // console.log('Unknown action:', request.action);
            sendResponse({ error: 'Unknown action' });
            return false;
    }
});

// Startup and installation handlers
chrome.runtime.onStartup.addListener(() => {
    // console.log('KimiZK-Translator Service Worker started - Browser startup');
    setTimeout(() => {
        BackgroundService._checkForUpdatesOnStartup();
        BackgroundService._scheduleUpdateCheck();
    }, 2000); // Use direct value instead of CONFIG
});

chrome.runtime.onInstalled.addListener((details) => {
    // console.log('KimiZK-Translator Service Worker installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        BackgroundService._handleFirstInstall();
    } else if (details.reason === 'update') {
        BackgroundService._handleUpdate();
    }
    
    setTimeout(() => {
        BackgroundService._checkForUpdatesOnStartup();
    }, 3000); // Use direct value instead of CONFIG
});

// Background service methods
const BackgroundService = {
    /**
     * Handle API key save request
     * @private
     */
    async _handleSaveApiKey(key, sendResponse) {
        try {
            chrome.storage.local.set({ API_KEY: key }, () => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: true });
                }
            });
        } catch (error) {
            console.error('Error saving API key:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
    
    /**
     * Handle update check request
     * @private
     */
    async _handleCheckForUpdates(sendResponse) {
        try {
            // console.log('Manual update check requested');
            const updateInfo = await this._checkForUpdates();
            // console.log('Manual update check result:', updateInfo);
            
            if (updateInfo.hasUpdate) {
                this._notifyAllTabs({ action: "showUpdateModal", updateInfo });
            } else if (updateInfo.latestVersion) {
                BackgroundNotifications.show(
                    '📋 Thông tin phiên bản', 
                    `Phiên bản mới nhất trên GitHub: ${updateInfo.releaseName || `KimiZK-Translator v${updateInfo.latestVersion}`}`
                );
            }
            sendResponse(updateInfo);
        } catch (error) {
            console.error('Error in checkForUpdates:', error);
            sendResponse({ 
                hasUpdate: false, 
                error: error.message,
                currentVersion: CURRENT_VERSION,
                message: "Lỗi khi kiểm tra cập nhật: " + error.message
            });
        }
    },
    
    /**
     * Handle perform update request
     * @private
     */
    async _handlePerformUpdate(sendResponse) {
        try {
            const result = await BackgroundService._performUpdate();
            sendResponse(result);
        } catch (error) {
            console.error('Error performing update:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                message: 'Không thể thực hiện cập nhật: ' + error.message
            });
        }
    },
    
    /**
     * Handle get latest version request
     * @private
     */
    async _handleGetLatestVersion(sendResponse) {
        try {
            // console.log('Getting latest version info from GitHub');
            const updateInfo = await BackgroundService._checkForUpdates();
            // console.log('Latest version info:', updateInfo);
            sendResponse(updateInfo);
        } catch (error) {
            console.error('Error getting latest version:', error);
            sendResponse({ 
                error: error.message,
                currentVersion: CURRENT_VERSION,
                message: "Không thể lấy thông tin phiên bản mới nhất: " + error.message
            });
        }
    },
    
    /**
     * Handle open extensions page request
     * @private
     */
    _handleOpenExtensionsPage(sendResponse) {
        // console.log('Opening extensions page');
        chrome.tabs.create({ url: 'chrome://extensions/' }, (tab) => {
            if (chrome.runtime.lastError) {
                console.error('Error opening extensions page:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                // console.log('Extensions page opened successfully');
                sendResponse({ success: true });
            }
        });
    },
    
    /**
     * Handle show update modal request
     * @private
     */
    async _handleShowUpdateModal(sendResponse) {
        try {
            // console.log('Showing update modal from popup');
            const updateInfo = await BackgroundService._checkForUpdates();
            if (updateInfo.hasUpdate) {
                BackgroundService._notifyActiveTab({ action: "showUpdateModal", updateInfo });
            }
            sendResponse(updateInfo);
        } catch (error) {
            console.error('Error showing update modal:', error);
            sendResponse({ error: error.message });
        }
    },
    
    /**
     * Handle first installation
     * @private
     */
    _handleFirstInstall() {
        // Open welcome page
        chrome.tabs.create({
            url: 'https://github.com/KimiZK-Dev/KimiZK-Translator#readme'
        });
        
        // Show welcome notification
        BackgroundNotifications.show(
            '🎉 Chào mừng đến với KimiZK-Translator!', 
            `Phiên bản ${CURRENT_VERSION} với Auto-update, hỗ trợ 13+ ngôn ngữ, UI hiện đại, Manifest V3. Hãy cấu hình Groq API key để bắt đầu!`
        );
        
        // Save installation time
        chrome.storage.local.set({ 
            installTime: Date.now(),
            lastUpdateCheck: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    },
    
    /**
     * Handle extension update
     * @private
     */
    _handleUpdate() {
        // Show update success notification
        BackgroundNotifications.show(
            '🎉 Cập nhật thành công!', 
            `KimiZK-Translator đã được cập nhật lên phiên bản ${CURRENT_VERSION}.`
        );
        
        // Save update time
        chrome.storage.local.set({ 
            lastUpdateTime: Date.now(),
            currentVersion: CURRENT_VERSION
        });
    },
    
    /**
     * Check for updates on startup
     * @private
     */
    async _checkForUpdatesOnStartup() {
        // console.log('=== Starting update check on startup ===');
        
        try {
            chrome.storage.local.get(['updateNotifications', 'lastUpdateCheck'], (result) => {
                const notificationsEnabled = result.updateNotifications !== false;
                const now = Date.now();
                const lastCheck = result.lastUpdateCheck || 0;
                
                // console.log('Notifications enabled:', notificationsEnabled);
                // console.log('Last check time:', new Date(lastCheck));
                // console.log('Current time:', new Date(now));
                // console.log('Time since last check:', now - lastCheck, 'ms');
                
                if (notificationsEnabled) {
                    // console.log('Checking for updates on startup...');
                    BackgroundService._checkForUpdates().then(updateInfo => {
                        // console.log('Update check result:', updateInfo);
                        
                        // Save check time
                        chrome.storage.local.set({ lastUpdateCheck: now });
                        
                        if (updateInfo.hasUpdate) {
                            BackgroundNotifications.show(
                                '🚀 Có phiên bản mới!', 
                                `${updateInfo.releaseName} sẵn sàng cập nhật. Nhấn vào icon tiện ích để cập nhật ngay!`
                            );
                        } else if (updateInfo.latestVersion) {
                            BackgroundNotifications.show(
                                '📋 Phiên bản mới nhất trên GitHub', 
                                `${updateInfo.releaseName || `KimiZK-Translator v${updateInfo.latestVersion}`} - Đang sử dụng phiên bản mới nhất`
                            );
                        }
                    }).catch(error => {
                        console.error('Error checking updates on startup:', error);
                    });
                } else {
                    // console.log('Update notifications are disabled');
                }
            });
        } catch (error) {
            console.error('Error checking updates on startup:', error);
        }
    },
    
    /**
     * Schedule periodic update check
     * @private
     */
    async _scheduleUpdateCheck() {
        // console.log('=== Scheduling periodic update check ===');
        
        try {
            chrome.storage.local.get(['lastUpdateCheck', 'updateNotifications'], (result) => {
                const now = Date.now();
                const lastCheck = result.lastUpdateCheck || 0;
                const notificationsEnabled = result.updateNotifications !== false;
                const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
                
                // console.log('Periodic check - Notifications enabled:', notificationsEnabled);
                // console.log('Periodic check - Last check time:', new Date(lastCheck));
                // console.log('Periodic check - Time since last check:', now - lastCheck, 'ms');
                // console.log('Periodic check - Update interval:', UPDATE_CHECK_INTERVAL, 'ms');
                
                if (now - lastCheck > UPDATE_CHECK_INTERVAL && notificationsEnabled) {
                    // console.log('Time to check for updates...');
                    chrome.storage.local.set({ lastUpdateCheck: now });
                    
                    BackgroundService._checkForUpdates().then(updateInfo => {
                        // console.log('Periodic update check result:', updateInfo);
                        
                        if (updateInfo.hasUpdate) {
                            // console.log('Update available in periodic check:', updateInfo);
                            BackgroundNotifications.show(
                                '🚀 Có phiên bản mới!', 
                                `${updateInfo.releaseName} sẵn sàng cập nhật. Nhấn vào icon tiện ích để cập nhật ngay!`
                            );
                        }
                    }).catch(error => {
                        console.error('Error in periodic update check:', error);
                    });
                } else {
                    // console.log('Not time for periodic update check yet');
                }
            });
        } catch (error) {
            console.error('Error in periodic update check:', error);
        }
    },
    
    /**
     * Check for updates from GitHub
     * @private
     */
    async _checkForUpdates() {
        try {
            // console.log('Checking for updates... Current version:', CURRENT_VERSION);
            
            const GITHUB_RELEASES_URL = 'https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest';
            
            // Fetch latest release từ GitHub API
            const response = await fetch(GITHUB_RELEASES_URL);
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }
            
            const releaseData = await response.json();
            
            // Validate release data
            if (!releaseData || !releaseData.tag_name) {
                throw new Error('Invalid release data from GitHub API');
            }
            
            const latestVersion = releaseData.tag_name.replace('v', '');
            const releaseName = releaseData.name || `KimiZK-Translator v${latestVersion}`;
            const releaseBody = releaseData.body || 'Không có thông tin chi tiết cho phiên bản này.';
            
            const zipAsset = releaseData.assets?.find(asset => 
                asset.name && asset.name.toLowerCase().includes('.zip')
            );
            
            const downloadUrl = zipAsset ? zipAsset.browser_download_url : releaseData.html_url;
            const directDownloadUrl = zipAsset ? zipAsset.browser_download_url : null;
            
            // console.log('Latest version from GitHub API:', latestVersion);
            // console.log('Release name:', releaseName);
            // console.log('Direct download URL:', directDownloadUrl);
            
            // So sánh phiên bản chính xác
            const versionComparison = compareVersions(CURRENT_VERSION, latestVersion);
            // console.log('Version comparison result:', versionComparison);
            // console.log('Current version:', CURRENT_VERSION, 'vs Latest version:', latestVersion);
            
            if (versionComparison < 0) {
                // Phiên bản hiện tại < phiên bản mới nhất -> Có cập nhật
                // console.log('Update available! Current version is older than latest');
                return {
                    hasUpdate: true,
                    currentVersion: CURRENT_VERSION,
                    latestVersion: latestVersion,
                    releaseNotes: releaseBody,
                    downloadUrl: downloadUrl,
                    directDownloadUrl: directDownloadUrl,
                    releaseName: releaseName,
                    message: `🚀 Có bản mới v${latestVersion}!`
                };
            } else if (versionComparison > 0) {
                // Phiên bản hiện tại > phiên bản mới nhất -> Đang dùng bản mới hơn
                // console.log('Current version is newer than latest on GitHub');
                return { 
                    hasUpdate: false,
                    currentVersion: CURRENT_VERSION,
                    latestVersion: latestVersion,
                    releaseName: releaseName,
                    message: `Phiên bản ${CURRENT_VERSION} - mới nhất!`
                };
            } else {
                // Phiên bản hiện tại = phiên bản mới nhất -> Đang dùng bản mới nhất
                // console.log('No update available - using latest version');
                return { 
                    hasUpdate: false,
                    currentVersion: CURRENT_VERSION,
                    latestVersion: latestVersion,
                    releaseName: releaseName,
                    message: `Phiên bản ${CURRENT_VERSION} - mới nhất!`
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
    },
    
    /**
     * Perform update download
     * @private
     */
    async _performUpdate() {
        try {
            const updateInfo = await BackgroundService._checkForUpdates();
            
            if (updateInfo.directDownloadUrl) {
                // console.log('Direct download URL found:', updateInfo.directDownloadUrl);
                
                chrome.downloads.download({
                    url: updateInfo.directDownloadUrl,
                    filename: `KimiZK-Translator-v${updateInfo.latestVersion}.zip`,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error('Download error:', chrome.runtime.lastError);
                        // Fallback: open releases page
                        chrome.tabs.create({
                            url: updateInfo.downloadUrl,
                            active: true
                        });
                    } else {
                        // console.log('Download started with ID:', downloadId);
                    }
                });
                
                this._showInstallationGuide(updateInfo.releaseName);
                
                return { 
                    success: true, 
                    message: 'Update downloaded successfully',
                    downloadUrl: updateInfo.directDownloadUrl,
                    newVersion: updateInfo.latestVersion,
                    releaseName: updateInfo.releaseName
                };
            } else {
                // Fallback: open releases page
                // console.log('No direct download URL, opening releases page:', updateInfo.downloadUrl);
                
                chrome.tabs.create({
                    url: updateInfo.downloadUrl,
                    active: true
                });
                
                BackgroundNotifications.show(
                    '📦 Tải về thủ công!', 
                    `${updateInfo.releaseName} - Vui lòng tải về từ trang GitHub Releases trong tab vừa mở!`
                );
                
                return { 
                    success: true, 
                    message: 'Update download page opened successfully',
                    downloadUrl: updateInfo.downloadUrl,
                    newVersion: updateInfo.latestVersion,
                    releaseName: updateInfo.releaseName
                };
            }
        } catch (error) {
            console.error('Error performing update:', error);
            throw error;
        }
    },
    
    /**
     * Show installation guide
     * @private
     */
    _showInstallationGuide(releaseName) {
        BackgroundService._notifyActiveTab({
            action: "showInstallationGuide",
            releaseName: releaseName
        });
    },
    
    /**
     * Notify all tabs
     * @private
     */
    _notifyAllTabs(message) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch((error) => {
                    // console.log('Failed to send message to tab', tab.id, ':', error);
                });
            });
        });
    },
    
    /**
     * Notify active tab
     * @private
     */
    _notifyActiveTab(message) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message).catch((error) => {
                    // console.log('Failed to send message to active tab:', error);
                });
            }
        });
    },
    
    /**
     * Handle save target language
     * @private
     */
    async _handleSaveTargetLanguage(language, sendResponse) {
        try {
            await chrome.storage.local.set({ targetLanguage: language });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error saving target language:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
    
    /**
     * Handle get target language
     * @private
     */
    async _handleGetTargetLanguage(sendResponse) {
        try {
            const result = await chrome.storage.local.get(['targetLanguage']);
            sendResponse({ success: true, language: result.targetLanguage || 'Vietnamese' });
        } catch (error) {
            console.error('Error getting target language:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
    
    /**
     * Handle save language preferences
     * @private
     */
    async _handleSaveLanguagePreferences(preferences, sendResponse) {
        try {
            await chrome.storage.local.set({ languagePreferences: preferences });
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error saving language preferences:', error);
            sendResponse({ success: false, error: error.message });
        }
    },
    
    /**
     * Handle get language preferences
     * @private
     */
    async _handleGetLanguagePreferences(sendResponse) {
        try {
            const result = await chrome.storage.local.get(['languagePreferences']);
            const defaultPreferences = {
                recentLanguages: ['Vietnamese', 'English', 'Japanese', 'Korean', 'Chinese'],
                favoriteLanguages: ['Vietnamese', 'English']
            };
            sendResponse({ 
                success: true, 
                preferences: result.languagePreferences || defaultPreferences 
            });
        } catch (error) {
            console.error('Error getting language preferences:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
};

// Bind methods to handle message events
Object.keys(BackgroundService).forEach(key => {
    if (key.startsWith('_')) {
        this[key] = BackgroundService[key].bind(BackgroundService);
    }
});