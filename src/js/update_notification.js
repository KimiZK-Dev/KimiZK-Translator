// Update Notification Handler - Hiển thị thông báo update ở giữa màn hình

let updateNotificationShown = false;

// Hàm chuyển đổi markdown changelog sang HTML đơn giản
function convertChangelogToHTML(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // 1. Loại bỏ các header không cần thiết từ GitHub release body
    html = html.replace(/^# .*$/gm, ''); // Loại bỏ H1 headers
    html = html.replace(/^## Release.*$/gm, ''); // Loại bỏ release headers
    html = html.replace(/^## Version.*$/gm, ''); // Loại bỏ version headers
    html = html.replace(/^---$/gm, ''); // Loại bỏ horizontal rules
    
    // 2. Xử lý các loại header khác nhau
    // H4 headers (####) - giữ lại và format đẹp
    html = html.replace(/^#### (.*)$/gm, '<h4 class="xt-changelog-h4">$1</h4>');
    
    // H3 headers (###) - chuyển thành section headers
    html = html.replace(/^### (.*)$/gm, '<h3 class="xt-changelog-h3">$1</h3>');
    
    // H2 headers (##) - chuyển thành main section headers
    html = html.replace(/^## (.*)$/gm, '<h2 class="xt-changelog-h2">$1</h2>');
    
    // 3. Xử lý bold text với nhiều format
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 4. Xử lý inline code
    html = html.replace(/`(.*?)`/g, '<code class="xt-changelog-code">$1</code>');
    
    // 5. Xử lý links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="xt-changelog-link">$1</a>');
    
    // 6. Xử lý bullet points và lists
    const lines = html.split('\n');
    let resultLines = [];
    let inList = false;
    let listItems = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Kiểm tra code blocks
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                // Bắt đầu code block
                inCodeBlock = true;
                codeBlockContent = [];
            } else {
                // Kết thúc code block
                inCodeBlock = false;
                if (codeBlockContent.length > 0) {
                    resultLines.push(`<pre class="xt-changelog-pre"><code class="xt-changelog-code-block">${codeBlockContent.join('\n')}</code></pre>`);
                }
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }
        
        // Xử lý bullet points
        if (/^[-*+]\s+(.+)$/.test(line)) {
            const content = line.replace(/^[-*+]\s+/, '');
            listItems.push(`<li class="xt-changelog-li">${content}</li>`);
            if (!inList) {
                inList = true;
            }
        } else if (line !== '' && inList) {
            // Kết thúc list
            if (listItems.length > 0) {
                resultLines.push(`<ul class="xt-changelog-ul">${listItems.join('')}</ul>`);
                listItems = [];
                inList = false;
            }
            if (line) {
                resultLines.push(line);
            }
        } else if (line !== '') {
            resultLines.push(line);
        }
    }
    
    // Đóng list cuối cùng nếu còn
    if (listItems.length > 0) {
        resultLines.push(`<ul class="xt-changelog-ul">${listItems.join('')}</ul>`);
    }
    
    html = resultLines.join('\n');
    
    // 7. Xử lý horizontal rules
    html = html.replace(/^---$/gm, '<hr class="xt-changelog-hr">');
    
    // 8. Xử lý paragraphs
    html = html.replace(/\n\n/g, '</p><p class="xt-changelog-p">');
    html = '<p class="xt-changelog-p">' + html + '</p>';
    
    // 9. Cleanup empty paragraphs
    html = html.replace(/<p class="xt-changelog-p"><\/p>/g, '');
    html = html.replace(/<p class="xt-changelog-p">\s*<\/p>/g, '');
    
    // 10. Giới hạn độ dài và thêm "Xem thêm..."
    if (html.length > 1500) {
        html = html.substring(0, 1500) + '...<br><br><div class="xt-changelog-more"><em>💡 Xem thêm chi tiết trên GitHub Releases</em></div>';
    }
    
    return html;
}

// Lắng nghe message từ background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showUpdateNotification" && !updateNotificationShown) {
        showUpdateOverlay(request.updateInfo);
        updateNotificationShown = true;
    }
});

// Hiển thị overlay update ở giữa màn hình
function showUpdateOverlay(updateInfo) {
    // Tạo overlay container
    const overlay = document.createElement('div');
    overlay.id = 'xt-update-overlay';
    overlay.className = 'xt-update-overlay';

    // Tạo modal content
    const modal = document.createElement('div');
    modal.className = 'xt-update-modal';

    // Icon và title
    const icon = document.createElement('div');
    icon.className = 'xt-update-icon';
    icon.textContent = '🆕';

    const title = document.createElement('h2');
    title.className = 'xt-update-title';
    title.textContent = '🚀 Có bản cập nhật mới!';

    const subtitle = document.createElement('p');
    subtitle.className = 'xt-update-subtitle';
    subtitle.textContent = `Phiên bản ${updateInfo.latestVersion} đã có sẵn với nhiều cải tiến mới và tính năng hữu ích!`;

    // Version info
    const versionInfo = document.createElement('div');
    versionInfo.className = 'xt-update-version-info';
    versionInfo.innerHTML = `
        <strong>Phiên bản hiện tại:</strong> ${updateInfo.currentVersion}<br>
        <strong>Phiên bản mới:</strong> ${updateInfo.latestVersion}
    `;

    // Add changelog/release notes section
    let changelogSection = null;
    if (updateInfo.releaseNotes) {
        changelogSection = document.createElement('div');
        changelogSection.className = 'xt-update-changelog';
        
        // Convert markdown to simple HTML for changelog
        const changelogHTML = convertChangelogToHTML(updateInfo.releaseNotes);
        changelogSection.innerHTML = `
            <div class="xt-update-changelog-title">📋 Tính năng mới:</div>
            ${changelogHTML}
        `;
    }

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'xt-update-buttons';

    // Update button
    const updateBtn = document.createElement('button');
    updateBtn.className = 'xt-update-btn';
    updateBtn.textContent = '🚀 Cập nhật ngay';

    // Later button
    const laterBtn = document.createElement('button');
    laterBtn.className = 'xt-update-later-btn';
    laterBtn.textContent = '⏰ Để sau';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'xt-update-close-btn';
    closeBtn.textContent = '×';

    // Event handlers
    updateBtn.onclick = () => {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Đang cập nhật...';
        
        // Gửi message đến background script để update
        chrome.runtime.sendMessage({ action: "performUpdate" }, (response) => {
            if (response && response.success) {
                if (response.newVersion) {
                    // Tự động cài đặt thành công
                    modal.innerHTML = `
                        <div class="xt-update-success">
                            <div class="xt-update-success-icon">✅</div>
                            <h2 class="xt-update-success-title">🎉 Cập nhật thành công!</h2>
                            <p class="xt-update-success-message">Đã cập nhật lên phiên bản ${response.newVersion}</p>
                            <div class="xt-update-success-info">
                                <p><strong>🎉 Hoàn tất!</strong><br>
                                Extension sẽ được tải lại trong giây lát...</p>
                            </div>
                            <div class="xt-update-countdown">
                                Tự động reload sau 2 giây...
                            </div>
                        </div>
                    `;
                    
                    // Tự động đóng modal sau 3 giây
                    setTimeout(() => {
                        closeOverlay();
                    }, 3000);
                    
                } else {
                    // Tải về thành công, cần cài đặt thủ công
                    modal.innerHTML = `
                        <div class="xt-update-download">
                            <div class="xt-update-download-icon">📥</div>
                            <h2 class="xt-update-download-title">📦 Tải về thành công!</h2>
                            <p class="xt-update-download-message">Extension mới đã được tải về.</p>
                            <div class="xt-update-instructions">
                                <p><strong>Hướng dẫn cài đặt:</strong><br>
                                1. Mở tab vừa mở<br>
                                2. Tải file .zip về máy<br>
                                3. Giải nén và load extension mới<br>
                                4. Thay thế extension cũ</p>
                            </div>
                            <button onclick="closeOverlay()" class="xt-update-understand-btn">
                                Đã hiểu
                            </button>
                        </div>
                    `;
                }
            } else {
                updateBtn.disabled = false;
                updateBtn.textContent = '🚀 Cập nhật ngay';
                
                modal.innerHTML = `
                    <div class="xt-update-error">
                        <div class="xt-update-error-icon">⚠️</div>
                        <h2 class="xt-update-error-title">⚠️ Không thể cập nhật tự động</h2>
                        <p class="xt-update-error-message">Đã mở trang GitHub để bạn tải về thủ công.</p>
                        <div class="xt-update-error-info">
                            <p><strong>Lỗi:</strong> ${response?.error || 'Unknown error'}</p>
                        </div>
                        <button onclick="closeOverlay()" class="xt-update-error-btn">
                            Đã hiểu
                        </button>
                    </div>
                `;
            }
        });
    };

    const closeOverlay = () => {
        overlay.classList.add('xt-fade-out');
        modal.classList.add('xt-slide-down');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    };

    laterBtn.onclick = closeOverlay;
    closeBtn.onclick = closeOverlay;
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            closeOverlay();
        }
    };

    // Assembly
    buttonsContainer.appendChild(laterBtn);
    buttonsContainer.appendChild(updateBtn);
    
    modal.appendChild(closeBtn);
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(versionInfo);
    if (changelogSection) {
        modal.appendChild(changelogSection);
    }
    modal.appendChild(buttonsContainer);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
} 