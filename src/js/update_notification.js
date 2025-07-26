// Update Notification Handler - Hiển thị thông báo update ở giữa màn hình

let updateNotificationShown = false;

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
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: xt-fadeIn 0.3s ease;
    `;

    // Tạo modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: xt-slideUp 0.4s ease;
        position: relative;
    `;

    // Icon và title
    const icon = document.createElement('div');
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
    `;
    icon.textContent = '🆕';

    const title = document.createElement('h2');
    title.style.cssText = `
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
    `;
    title.textContent = 'Có bản cập nhật mới!';

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 16px;
        color: #6b7280;
        line-height: 1.5;
    `;
    subtitle.textContent = `Phiên bản ${updateInfo.latestVersion} đã có sẵn với nhiều cải tiến mới.`;

    // Version info
    const versionInfo = document.createElement('div');
    versionInfo.style.cssText = `
        background: #f3f4f6;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        font-size: 14px;
        color: #374151;
    `;
    versionInfo.innerHTML = `
        <strong>Phiên bản hiện tại:</strong> ${updateInfo.currentVersion}<br>
        <strong>Phiên bản mới:</strong> ${updateInfo.latestVersion}
    `;

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
    `;

    // Update button
    const updateBtn = document.createElement('button');
    updateBtn.style.cssText = `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
        max-width: 140px;
    `;
    updateBtn.textContent = 'Cập nhật ngay';
    updateBtn.onmouseenter = () => {
        updateBtn.style.transform = 'translateY(-2px)';
        updateBtn.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
    };
    updateBtn.onmouseleave = () => {
        updateBtn.style.transform = 'translateY(0)';
        updateBtn.style.boxShadow = 'none';
    };

    // Later button
    const laterBtn = document.createElement('button');
    laterBtn.style.cssText = `
        background: transparent;
        color: #6b7280;
        border: 2px solid #e5e7eb;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
        max-width: 140px;
    `;
    laterBtn.textContent = 'Để sau';
    laterBtn.onmouseenter = () => {
        laterBtn.style.borderColor = '#d1d5db';
        laterBtn.style.color = '#374151';
    };
    laterBtn.onmouseleave = () => {
        laterBtn.style.borderColor = '#e5e7eb';
        laterBtn.style.color = '#6b7280';
    };

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
    `;
    closeBtn.textContent = '×';
    closeBtn.onmouseenter = () => {
        closeBtn.style.color = '#6b7280';
        closeBtn.style.background = '#f3f4f6';
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.color = '#9ca3af';
        closeBtn.style.background = 'none';
    };

    // Event handlers
    updateBtn.onclick = () => {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Đang cập nhật...';
        updateBtn.style.opacity = '0.7';
        
        // Gửi message đến background script để update
        chrome.runtime.sendMessage({ action: "performUpdate" }, (response) => {
            if (response && response.success) {
                modal.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                        <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #10b981;">Cập nhật thành công!</h2>
                        <p style="margin: 0; color: #6b7280;">Extension sẽ được tải lại trong giây lát...</p>
                    </div>
                `;
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                updateBtn.disabled = false;
                updateBtn.textContent = 'Cập nhật ngay';
                updateBtn.style.opacity = '1';
                alert('Không thể cập nhật tự động. Vui lòng tải lại extension thủ công.');
            }
        });
    };

    const closeOverlay = () => {
        overlay.style.animation = 'xt-fadeOut 0.3s ease';
        modal.style.animation = 'xt-slideDown 0.3s ease';
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
    modal.appendChild(buttonsContainer);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add CSS animations
    if (!document.getElementById('xt-update-styles')) {
        const style = document.createElement('style');
        style.id = 'xt-update-styles';
        style.textContent = `
            @keyframes xt-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes xt-fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes xt-slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            @keyframes xt-slideDown {
                from { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                to { 
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
            }
        `;
        document.head.appendChild(style);
    }
} 