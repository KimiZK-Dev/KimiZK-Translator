let notificationTimeout = null;

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `xt-notification xt-notification-${type}`;
    let icon = "";
    if (type === "success") icon = "<span class='xt-notification-icon'>✅</span>";
    else if (type === "error") icon = "<span class='xt-notification-icon'>❌</span>";
    else if (type === "warning") icon = "<span class='xt-notification-icon'>⚠️</span>";
    else icon = "<span class='xt-notification-icon'>ℹ️</span>";
    notification.innerHTML = `
        <div class="xt-notification-content">
            ${icon}
            <span class="xt-notification-message">${message}</span>
            <span class="xt-notification-close" title="Đóng">×</span>
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

    notification.querySelector(".xt-notification-close").addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
        clearTimeout(notificationTimeout);
    });

    notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}