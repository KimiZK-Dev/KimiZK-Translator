// Update Modal Handler
class UpdateModal {
    constructor() {
        this.modal = null;
        this.helpModal = null;
        this.isVisible = false;
        this.updateInfo = null;
        this.init();
    }

    init() {
        this.createModal();
        this.createHelpModal();
        this.bindEvents();
    }

    createModal() {
        const modalHTML = `
            <div class="update-modal-overlay" id="updateModalOverlay" style="display: none;">
                <div class="update-modal">
                    <div class="help-btn-overlay" id="helpBtnOverlay" title="Hướng dẫn cập nhật"></div>
                    <button class="help-btn" id="helpBtn" title="Hướng dẫn cập nhật">?</button>
                    
                    <div class="update-modal-header">
                        <div class="update-modal-title">🚀 Cập nhật mới!</div>
                        <div class="update-modal-subtitle">Có phiên bản mới sẵn sàng cập nhật</div>
                    </div>
                    
                    <div class="update-modal-content">
                        <div class="update-version-info">
                            <div class="current-version">Phiên bản hiện tại: <span id="currentVersion">-</span></div>
                            <div class="new-version">Phiên bản mới: <span id="newVersion">-</span></div>
                        </div>
                        
                        <div class="update-features" id="updateFeatures">
                            <div class="update-features-loading">Đang tải thông tin cập nhật...</div>
                        </div>
                    </div>
                    
                    <div class="update-modal-buttons">
                        <button class="update-btn update-now-btn" id="updateNowBtn">
                            <span>🔄 Cập nhật ngay</span>
                        </button>
                        <button class="update-btn remind-later-btn" id="remindLaterBtn">
                            <span>⏰ Để sau</span>
                        </button>
                    </div>
                    
                    <div class="update-loading" id="updateLoading">
                        <div class="spinner"></div>
                        <span>Đang tải về và cài đặt...</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('updateModalOverlay');
    }

    createHelpModal() {
        const helpModalHTML = `
            <div class="help-modal" id="helpModal">
                <div class="help-modal-header">
                    <div class="help-modal-title">📋 Hướng dẫn cập nhật</div>
                    <button class="close-help-btn" id="closeHelpBtn">&times;</button>
                </div>
                <div class="help-content">
                    <h4>Cách cập nhật KimiZK-Translator:</h4>
                    <ol>
                        <li><strong>Cập nhật tự động:</strong> Nhấn "Cập nhật ngay" để tải và cài đặt tự động</li>
                        <li><strong>Cập nhật thủ công:</strong> Nếu tự động không hoạt động, làm theo các bước sau:</li>
                    </ol>
                    
                    <h4>Hướng dẫn cập nhật thủ công:</h4>
                    <ol>
                        <li>Tải file .zip từ GitHub Releases</li>
                        <li>Giải nén file vào thư mục mới</li>
                        <li>Mở Chrome, vào <span class="copyable-url" data-url="chrome://extensions/">chrome://extensions/</span></li>
                        <li>Bật "Developer mode" (góc phải trên)</li>
                        <li>Xóa extension cũ (nếu có)</li>
                        <li>Nhấn "Load unpacked" và chọn thư mục mới</li>
                        <li>Khởi động lại trình duyệt</li>
                    </ol>
                    
                    <div class="note">
                        <strong>Lưu ý:</strong> Extension này không update qua Chrome Web Store, chỉ update qua GitHub releases.
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', helpModalHTML);
        this.helpModal = document.getElementById('helpModal');
        
        // Ensure help modal is properly initialized
        if (!this.helpModal) {
            console.error('Help modal not found after creation');
        } else {
            // console.log('Help modal initialized successfully');
        }
    }

    bindEvents() {
        // Update modal events
        document.getElementById('updateNowBtn').addEventListener('click', () => this.performUpdate());
        document.getElementById('remindLaterBtn').addEventListener('click', () => this.remindLater());
        
        // Help modal events - bind to both overlay and button
        const helpBtnOverlay = document.getElementById('helpBtnOverlay');
        const helpBtn = document.getElementById('helpBtn');
        
        // console.log('Help button elements found:', { helpBtnOverlay: !!helpBtnOverlay, helpBtn: !!helpBtn });
        
        if (helpBtnOverlay) {
            helpBtnOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Help overlay clicked');
                this.showHelp();
            });
        }
        
        if (helpBtn) {
            helpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Help button clicked');
                this.showHelp();
            });
        }
        
        document.getElementById('closeHelpBtn').addEventListener('click', () => this.hideHelp());
        
        // Close help modal when clicking outside
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelp();
            }
        });
        
        // Close modal when clicking overlay
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Close help modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelp();
            }
        });
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.helpModal.classList.contains('show')) {
                    this.hideHelp();
                } else if (this.isVisible) {
                    this.hide();
                }
            }
        });
        
        // Copyable URL functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copyable-url')) {
                this.copyToClipboard(e.target.dataset.url, e.target);
            }
        });
    }

    show(updateInfo) {
        if (!updateInfo || !updateInfo.hasUpdate) return;
        
        this.updateInfo = updateInfo;
        this.isVisible = true;
        
        // Update modal content
        document.getElementById('currentVersion').textContent = updateInfo.currentVersion || '1.0.2';
        document.getElementById('newVersion').textContent = updateInfo.latestVersion || '1.0.3';
        
        // Hiển thị đầy đủ release notes markdown convert sang HTML
        if (updateInfo.releaseNotes) {
            this.updateFeaturesList(updateInfo.releaseNotes);
        }
        
        // Show modal with animation
        this.modal.style.display = 'flex';
        setTimeout(() => {
            this.modal.style.opacity = '1';
        }, 10);
        
        // Log for debugging
        // console.log('Update modal shown with info:', updateInfo);
    }

    hide() {
        this.isVisible = false;
        this.modal.style.opacity = '0';
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    showHelp() {
        // console.log('Help button clicked - showing help modal');
        this.helpModal.classList.add('show');
    }

    hideHelp() {
        this.helpModal.classList.remove('show');
    }

    async copyToClipboard(text, element) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Show success feedback
            const originalText = element.textContent;
            element.textContent = 'Đã copy!';
            element.style.background = 'linear-gradient(135deg, var(--success), var(--success-light))';
            
            // Reset after 2 seconds
            setTimeout(() => {
                element.textContent = originalText;
                element.style.background = 'linear-gradient(135deg, var(--pastel-blue), var(--pastel-purple))';
            }, 2000);
            
            // console.log('URL copied to clipboard:', text);
        } catch (err) {
            console.error('Failed to copy URL:', err);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            // Show success feedback
            const originalText = element.textContent;
            element.textContent = 'Đã copy!';
            element.style.background = 'linear-gradient(135deg, var(--success), var(--success-light))';
            
            setTimeout(() => {
                element.textContent = originalText;
                element.style.background = 'linear-gradient(135deg, var(--pastel-blue), var(--pastel-purple))';
            }, 2000);
        }
    }

    updateFeaturesList(releaseNotes) {
        const featuresList = document.getElementById('updateFeatures');
        
        if (releaseNotes) {
            // Convert markdown to HTML and display full content
            const markdownContent = this.convertMarkdownToHTML(releaseNotes);
            if (markdownContent) {
                featuresList.innerHTML = markdownContent;
                return;
            }
        }
        
        // Fallback to default features
        const defaultFeatures = [
            'Auto-update tự động',
            'Hỗ trợ 13+ ngôn ngữ', 
            'UI hiện đại và responsive',
            'Manifest V3 compliance'
        ];
        featuresList.innerHTML = `<ul>${defaultFeatures.map(feature => `<li>${feature}</li>`).join('')}</ul>`;
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        let html = markdown;

        // Convert horizontal rules
        html = html.replace(/^(---|\*\*\*|___)$/gim, '<hr>');

        // Convert headers
        html = html.replace(/^###### (.*)$/gim, '<h6>$1</h6>');
        html = html.replace(/^##### (.*)$/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*)$/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*)$/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*)$/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*)$/gim, '<h1>$1</h1>');

        // Convert bold and italic
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Convert inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert blockquotes
        html = html.replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>');

        // Convert horizontal rules again (in case --- was surrounded by spaces)
        html = html.replace(/<br>\s*<hr>\s*<br>/g, '<hr>');

        // Convert bullet points and numbered lists properly
        const lines = html.split('\n');
        let inList = false;
        let listType = '';
        let listItems = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Check for bullet points
            if (/^[-*]\s+(.+)$/.test(trimmedLine)) {
                const content = trimmedLine.replace(/^[-*]\s+/, '');
                if (!inList || listType !== 'ul') {
                    if (inList) {
                        // Close previous list
                        lines[i - 1] = `</${listType}>`;
                    }
                    inList = true;
                    listType = 'ul';
                    lines[i] = `<ul><li>${content}</li>`;
                } else {
                    lines[i] = `<li>${content}</li>`;
                }
            }
            // Check for numbered lists
            else if (/^\d+\.\s+(.+)$/.test(trimmedLine)) {
                const content = trimmedLine.replace(/^\d+\.\s+/, '');
                if (!inList || listType !== 'ol') {
                    if (inList) {
                        // Close previous list
                        lines[i - 1] = `</${listType}>`;
                    }
                    inList = true;
                    listType = 'ol';
                    lines[i] = `<ol><li>${content}</li>`;
                } else {
                    lines[i] = `<li>${content}</li>`;
                }
            }
            // If not a list item and we were in a list, close it
            else if (inList && trimmedLine !== '') {
                lines[i - 1] = `</${listType}>`;
                inList = false;
                listType = '';
            }
        }
        
        // Close any remaining list
        if (inList) {
            lines[lines.length - 1] = `</${listType}>`;
        }
        
        html = lines.join('\n');

        // Convert paragraphs (lines not already in block elements)
        html = html.replace(/(?:^|\n)(?!<h\d|<ul>|<ol>|<li>|<blockquote>|<hr>|<\/ul>|<\/ol>|<\/li>|<\/blockquote>|<\/h\d>)([^<\n][^\n]*)/g, function(match, p1) {
            if (p1.trim() === '' || /^\s*<.*>\s*$/.test(p1)) return match;
            return '<p>' + p1.trim() + '</p>';
        });

        // Remove excessive <br>
        html = html.replace(/(<br>\s*){2,}/g, '<br>');

        // Remove <br> before/after block elements
        html = html.replace(/<br>\s*(<(ul|ol|li|h\d|blockquote|hr|\/ul|\/ol|\/li|\/blockquote|\/h\d|p|\/p)>)/g, '$1');
        html = html.replace(/(<(ul|ol|li|h\d|blockquote|hr|\/ul|\/ol|\/li|\/blockquote|\/h\d|p|\/p)>)\s*<br>/g, '$1');

        // Remove the first header if it's just version info
        html = html.replace(/<h2>.*?Version.*?<\/h2>/i, '');

        // Clean up extra spaces
        html = html.replace(/\s+$/g, '');

        return html;
    }

    parseMarkdownFeatures(releaseNotes) {
        const features = [];
        
        if (!releaseNotes) return features;
        
        // Split by lines and process
        const lines = releaseNotes.split('\n');
        let inFeaturesSection = false;
        let currentSection = '';
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Check if we're entering a features section
            if (trimmedLine.includes('### ✨ **Tính năng mới**') || 
                trimmedLine.includes('### 🚀 **Tính năng mới**') ||
                trimmedLine.includes('## 🚀 Version') ||
                trimmedLine.includes('### ✨')) {
                inFeaturesSection = true;
                continue;
            }
            
            // Check if we're leaving features section
            if (inFeaturesSection && (trimmedLine.startsWith('### 🎨') || 
                                     trimmedLine.startsWith('### 🔧') || 
                                     trimmedLine.startsWith('### 🐛') ||
                                     trimmedLine.startsWith('## 📋'))) {
                break;
            }
            
            // Process features within the section
            if (inFeaturesSection) {
                // Handle subsections
                if (trimmedLine.startsWith('#### ')) {
                    currentSection = trimmedLine.replace(/^####\s*/, '').replace(/\*\*/g, '');
                    continue;
                }
                
                // Handle feature items with bold formatting
                if (trimmedLine.startsWith('- **') || trimmedLine.startsWith('* **')) {
                    let feature = trimmedLine.replace(/^[-*]\s*\*\*/, '').replace(/\*\*:\s*/, ': ').trim();
                    
                    // Remove remaining markdown formatting
                    feature = feature.replace(/\*\*/g, '').replace(/`/g, '');
                    
                    // Add section context if available
                    if (currentSection && !feature.includes(':')) {
                        feature = `${currentSection}: ${feature}`;
                    }
                    
                    if (feature && feature.length > 3) {
                        features.push(feature);
                    }
                }
                
                // Handle simple bullet points
                if (trimmedLine.startsWith('- ') && !trimmedLine.startsWith('- **')) {
                    let feature = trimmedLine.replace(/^-\s*/, '').trim();
                    
                    // Remove markdown formatting
                    feature = feature.replace(/\*\*/g, '').replace(/`/g, '');
                    
                    // Add section context if available
                    if (currentSection && !feature.includes(':')) {
                        feature = `${currentSection}: ${feature}`;
                    }
                    
                    if (feature && feature.length > 3) {
                        features.push(feature);
                    }
                }
            }
        }
        
        // If no features found in markdown, try alternative parsing
        if (features.length === 0) {
            return this.extractSimpleFeatures(releaseNotes);
        }
        
        return features.slice(0, 8); // Limit to 8 features
    }

    extractSimpleFeatures(releaseNotes) {
        const features = [];
        const lines = releaseNotes.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Look for lines with emojis and features
            if (trimmedLine.includes('✨') || 
                trimmedLine.includes('🚀') || 
                trimmedLine.includes('🎨') || 
                trimmedLine.includes('🔧') ||
                trimmedLine.includes('🛡️') ||
                trimmedLine.includes('🔐') ||
                trimmedLine.includes('🎯')) {
                
                let feature = trimmedLine.replace(/^[✨🚀🎨🔧🛡️🔐🎯\s-]+/, '').trim();
                
                // Remove markdown formatting
                feature = feature.replace(/\*\*/g, '').replace(/`/g, '');
                
                if (feature && feature.length > 5) {
                    features.push(feature);
                }
            }
        }
        
        return features.slice(0, 6);
    }

    updateReleaseDetails(releaseNotes) {
        const releaseInfo = document.getElementById('releaseInfo');
        const releaseDetails = document.getElementById('releaseDetails');
        
        if (!releaseNotes) {
            releaseInfo.style.display = 'none';
            return;
        }
        
        // Parse and format release notes
        const formattedNotes = this.formatReleaseNotes(releaseNotes);
        
        if (formattedNotes) {
            releaseDetails.innerHTML = formattedNotes;
            releaseInfo.style.display = 'block';
        } else {
            releaseInfo.style.display = 'none';
        }
    }

    formatReleaseNotes(releaseNotes) {
        if (!releaseNotes) return '';
        
        // Convert markdown to HTML
        let html = releaseNotes;
        
        // Convert headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        
        // Convert bold text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert bullet points
        html = html.replace(/^[-*] (.*$)/gim, '<li>$1</li>');
        
        // Wrap lists
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Convert line breaks
        html = html.replace(/\n/g, '<br>');
        
        // Extract only the main features section
        const sections = html.split('<h3>');
        let featuresSection = '';
        
        for (const section of sections) {
            if (section.includes('Tính năng mới') || section.includes('✨') || section.includes('🚀')) {
                featuresSection = section;
                break;
            }
        }
        
        if (featuresSection) {
            // Clean up the section
            featuresSection = featuresSection.replace(/^.*?<\/h3>/, ''); // Remove header
            featuresSection = featuresSection.split('<h3>')[0]; // Take only this section
            
            // Limit content length
            if (featuresSection.length > 500) {
                featuresSection = featuresSection.substring(0, 500) + '...';
            }
            
            return featuresSection;
        }
        
        return '';
    }

    async performUpdate() {
        if (!this.updateInfo) return;
        
        const updateBtn = document.getElementById('updateNowBtn');
        const loading = document.getElementById('updateLoading');
        
        // Show loading state
        updateBtn.style.display = 'none';
        loading.classList.add('show');
        
        try {
            // console.log('Starting update process...');
            
            // Send message to background script to perform update
            const response = await chrome.runtime.sendMessage({
                action: 'performUpdate'
            });
            
            // console.log('Update response:', response);
            
            if (response.success) {
                // Hiện hướng dẫn cài đặt thủ công
                const releaseName = this.updateInfo.releaseName || `KimiZK-Translator-v${this.updateInfo.latestVersion}`;
                this.showInstallationGuide(releaseName);
            } else {
                this.showUpdateError(response.error || 'Không thể cập nhật');
            }
            
        } catch (error) {
            console.error('Update error:', error);
            this.showUpdateError(error.message || 'Lỗi khi cập nhật');
        } finally {
            // Hide loading state
            loading.classList.remove('show');
            updateBtn.style.display = 'inline-flex';
        }
    }



    showUpdateError(error) {
        const title = document.querySelector('.update-modal-title');
        const content = document.querySelector('.update-modal-content');
        const buttons = document.querySelector('.update-modal-buttons');
        
        title.textContent = '⚠️ Lỗi cập nhật';
        title.style.color = '#f87171';
        
        content.innerHTML = `
            <div class="update-version-info">
                <div style="color: #f87171; margin-bottom: 15px;">${error}</div>
                <div>Vui lòng thử cập nhật thủ công theo hướng dẫn.</div>
            </div>
        `;
        
        buttons.innerHTML = `
            <button class="update-btn update-now-btn" onclick="window.open('${this.updateInfo.downloadUrl || 'https://github.com/KimiZK-Dev/KimiZK-Translator/releases'}', '_blank')">
                <span>📥 Tải về thủ công</span>
            </button>
            <button class="update-btn remind-later-btn" onclick="updateModal.hide()">
                <span>❌ Đóng</span>
            </button>
        `;
    }

    remindLater() {
        // Save reminder time (24 hours from now)
        const reminderTime = Date.now() + (24 * 60 * 60 * 1000);
        chrome.storage.local.set({ 
            updateReminderTime: reminderTime,
            lastUpdateCheck: Date.now()
        });
        
        this.hide();
        
        // Show notification
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('src/icons/icon128.png'),
                title: '⏰ Nhắc nhở cập nhật',
                message: 'Bạn sẽ được nhắc cập nhật sau 24 giờ'
            });
        }
    }

    getExtensionsUrl() {
        // Trả về URL an toàn cho mọi trình duyệt
        return 'chrome://extensions/';
    }

    showInstallationGuide(releaseName) {
        // Hiện help modal với hướng dẫn cài đặt thủ công
        this.showHelp();
        
        // Cập nhật nội dung help modal
        const helpContent = document.querySelector('.help-content');
        helpContent.innerHTML = `
            <h4>📦 ${releaseName} đã được tải về!</h4>
            <p style="color: #10b981; margin-bottom: 20px; font-weight: 600;">
                ✅ Vui lòng làm theo hướng dẫn bên dưới để cài đặt.
            </p>
            
            <h4>🔧 Hướng dẫn cài đặt thủ công:</h4>
            <ol style="margin: 16px 0; padding-left: 20px;">
                <li><strong>Giải nén file:</strong> Tìm file <code>${releaseName}.zip</code> trong thư mục bạn vừa tải về và giải nén</li>
                <li><strong>Mở trang quản lý tiện ích:</strong> 
                    <button id="openExtensionsBtn" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 4px 0;">
                        🔗 Mở trang quản lý tiện ích
                    </button>
                    <br><small style="color: #6b7280;">Hoặc gõ <code>chrome://extensions/</code> vào thanh địa chỉ</small>
                </li>
                <li><strong>Bật Developer mode:</strong> Tìm và bật công tắc "Developer mode" (thường ở góc phải trên)</li>
                <li><strong>Tải extension mới:</strong> Nhấn "Load unpacked" (Tải tệp đã giải nén) và chọn thư mục đã giải nén</li>
                <li><strong>Khởi động lại:</strong> Nhấn nút Refresh (🔄) trên extension và refresh trang web, hoặc khởi động lại trình duyệt</li>
            </ol>
            
            <div style="background: #1f2937; border: 1px solid #374151; border-radius: 8px; padding: 12px; margin-top: 16px; color: #f9fafb;">
                <strong>💡 Lưu ý quan trọng:</strong>
                <ul style="margin: 8px 0 0 16px;">
                    <li>Extension này không update qua Chrome Web Store</li>
                    <li>Chỉ update qua GitHub releases</li>
                    <li>Sau khi cài đặt, hãy cấu hình lại API Key nếu cần</li>
                </ul>
            </div>
        `;
        
        // Thêm event listener cho button
        setTimeout(() => {
            const openExtensionsBtn = document.getElementById('openExtensionsBtn');
            if (openExtensionsBtn) {
                // Xóa event listener cũ nếu có
                openExtensionsBtn.replaceWith(openExtensionsBtn.cloneNode(true));
                const newBtn = document.getElementById('openExtensionsBtn');
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    chrome.runtime.sendMessage({action: 'openExtensionsPage'});
                });
            }
        }, 100);
    }
}

// Initialize update modal
let updateModal;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('Update modal received message:', request.action);
    
    if (request.action === 'showUpdateModal') {
        // console.log('Showing update modal with info:', request.updateInfo);
        if (!updateModal) {
            updateModal = new UpdateModal();
        }
        updateModal.show(request.updateInfo);
        sendResponse({ success: true });
    }
    
    if (request.action === 'showInstallationGuide') {
        // console.log('Showing installation guide for:', request.releaseName);
        if (!updateModal) {
            updateModal = new UpdateModal();
        }
        updateModal.showInstallationGuide(request.releaseName);
        sendResponse({ success: true });
    }
});

// Auto-check for updates when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we should show update modal
    chrome.storage.local.get(['updateReminderTime', 'lastUpdateCheck'], (result) => {
        const now = Date.now();
        const reminderTime = result.updateReminderTime || 0;
        
        // If reminder time has passed, check for updates
        if (now > reminderTime) {
            chrome.runtime.sendMessage({ action: 'checkForUpdates' }, (response) => {
                if (response && response.hasUpdate) {
                    if (!updateModal) {
                        updateModal = new UpdateModal();
                    }
                    updateModal.show(response);
                }
            });
        }
    });
});

// Export for global access
window.updateModal = updateModal; 