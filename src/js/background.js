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
            this._handleSaveApiKey(request.key, sendResponse);
            return true;
            
        case "test":
            sendResponse({ success: true, message: 'Service worker is working', version: CURRENT_VERSION });
            return false;
            
        case "checkForUpdates":
            this._handleCheckForUpdates(sendResponse);
            return true;
            
        case "performUpdate":
            this._handlePerformUpdate(sendResponse);
            return true;
            
        case "getLatestVersion":
            this._handleGetLatestVersion(sendResponse);
            return true;
            
        case "openExtensionsPage":
            this._handleOpenExtensionsPage(sendResponse);
            return true;
            
        case "showUpdateModal":
            this._handleShowUpdateModal(sendResponse);
            return true;
            
        case "saveTargetLanguage":
            this._handleSaveTargetLanguage(request.language, sendResponse);
            return true;
            
        case "getTargetLanguage":
            this._handleGetTargetLanguage(sendResponse);
            return true;
            
        case "saveLanguagePreferences":
            this._handleSaveLanguagePreferences(request.preferences, sendResponse);
            return true;
            
        case "getLanguagePreferences":
            this._handleGetLanguagePreferences(sendResponse);
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
        this._checkForUpdatesOnStartup();
        this._scheduleUpdateCheck();
    }, 2000); // Use direct value instead of CONFIG
});

chrome.runtime.onInstalled.addListener((details) => {
    // console.log('KimiZK-Translator Service Worker installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        this._handleFirstInstall();
    } else if (details.reason === 'update') {
        this._handleUpdate();
    }
    
    setTimeout(() => {
        this._checkForUpdatesOnStartup();
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
            const result = await this._performUpdate();
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
            const updateInfo = await this._checkForUpdates();
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
            const updateInfo = await this._checkForUpdates();
            if (updateInfo.hasUpdate) {
                this._notifyActiveTab({ action: "showUpdateModal", updateInfo });
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
                    this._checkForUpdates().then(updateInfo => {
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
                    
                    this._checkForUpdates().then(updateInfo => {
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
            
            if (latestVersion !== CURRENT_VERSION) {
                // console.log('Update available!');
                return {
                    hasUpdate: true,
                    currentVersion: CURRENT_VERSION,
                    latestVersion: latestVersion,
                    releaseNotes: releaseBody,
                    downloadUrl: downloadUrl,
                    directDownloadUrl: directDownloadUrl,
                    releaseName: releaseName,
                    message: `🚀 Có phiên bản mới ${latestVersion} sẵn sàng cập nhật!`
                };
            } else {
                // console.log('No update available - using latest version');
                return { 
                    hasUpdate: false,
                    currentVersion: CURRENT_VERSION,
                    latestVersion: latestVersion,
                    releaseName: releaseName,
                    message: `✅ Đang sử dụng ${releaseName} - phiên bản mới nhất`
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
            const updateInfo = await this._checkForUpdates();
            
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
        this._notifyActiveTab({
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