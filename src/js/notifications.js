let notificationTimeout = null;

function showNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `xt-notification xt-notification-${type}`;
    
    let icon = "";
    let title = "";
    
    switch(type) {
        case "success":
            icon = "<span class='xt-notification-icon'>✅</span>";
            title = "Thành công";
            break;
        case "error":
            icon = "<span class='xt-notification-icon'>❌</span>";
            title = "Lỗi";
            break;
        case "warning":
            icon = "<span class='xt-notification-icon'>⚠️</span>";
            title = "Cảnh báo";
            break;
        case "audio-error":
            icon = "<span class='xt-notification-icon'>🔇</span>";
            title = "Lỗi âm thanh";
            break;
        default:
            icon = "<span class='xt-notification-icon'>ℹ️</span>";
            title = "Thông báo";
    }
    
    const timeLeft = Math.ceil(duration / 1000);
    
    notification.innerHTML = `
        <div class="xt-notification-header">
            <div class="xt-notification-title">
                ${icon}
                <span>${title}</span>
            </div>
            <span class="xt-notification-close" title="Đóng">×</span>
        </div>
        <div class="xt-notification-body">
            <span class="xt-notification-message">${message}</span>
        </div>
        <div class="xt-notification-footer">
            <div class="xt-notification-timer">
                <span class="xt-timer-text">Tự đóng sau: </span>
                <span class="xt-timer-count">${timeLeft}s</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);

    const popupRect = popup?.getBoundingClientRect() || { right: 0, top: 0 };
    Object.assign(notification.style, {
        position: 'fixed',
        zIndex: '2147483648',
        left: `${popupRect.right + 20}px`,
        top: `${popupRect.top}px`,
        opacity: '0',
        transform: 'translateY(-10px) scale(0.95)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    });

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0) scale(1)';
    }, 10);

    // Timer countdown
    let timeRemaining = timeLeft;
    const timerElement = notification.querySelector('.xt-timer-count');
    const timerInterval = setInterval(() => {
        timeRemaining--;
        if (timerElement) {
            timerElement.textContent = `${timeRemaining}s`;
        }
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Close button
    notification.querySelector(".xt-notification-close").addEventListener('click', () => {
        clearInterval(timerInterval);
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
        clearTimeout(notificationTimeout);
    });

    // Auto close
    notificationTimeout = setTimeout(() => {
        clearInterval(timerInterval);
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Special function for audio errors
function showAudioErrorNotification(errorMessage) {
    let userFriendlyMessage = "Không thể phát âm thanh.";
    
    if (errorMessage.includes("Content Security Policy") || errorMessage.includes("blob:")) {
        userFriendlyMessage = "Website này không cho phép phát âm thanh do chính sách bảo mật.";
    } else if (errorMessage.includes("Failed to load") || errorMessage.includes("no supported source")) {
        userFriendlyMessage = "Trang hiện tại không hỗ trợ phát âm thanh vì chính sách bảo mật của họ.";
    } else if (errorMessage.includes("rate_limit_exceeded")) {
        userFriendlyMessage = "Hết lượt sử dụng phát âm hôm nay.";
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyMessage = "Lỗi kết nối mạng.";
    }
    
    showNotification(userFriendlyMessage, "audio-error", 5000);
}