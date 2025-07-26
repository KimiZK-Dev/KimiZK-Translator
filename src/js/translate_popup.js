let popup = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function createPopup() {
    stopCurrentAudio();
    popup?.remove();
    popup = document.createElement("div");
    popup.className = "xt-translator-popup";
    popup.style.position = 'fixed';
    popup.style.zIndex = '2147483647';
    popup.style.left = '0px';
    popup.style.top = '0px';
    document.body.appendChild(popup);
    return popup;
}

function setupDragging(element) {
    const header = element.querySelector('.xt-translator-header');
    const dragOverlay = header?.querySelector('.xt-header-drag-overlay');
    if (!header || !dragOverlay) return;

    const startDrag = e => {
        if (e.button !== 0) return;
        isDragging = true;
        const rect = element.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        element.style.transition = 'none';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    };

    const drag = e => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - element.offsetWidth));
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - element.offsetHeight));
        element.style.left = `${newX}px`;
        element.style.top = `${newY}px`;
        const audioControls = document.querySelector('.xt-audio-controls');
        if (audioControls) {
            audioControls.style.left = `${newX + element.offsetWidth + 10}px`;
            audioControls.style.top = `${newY}px`;
        }
    };

    const stopDrag = () => {
        isDragging = false;
        element.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
    };

    dragOverlay.addEventListener('mousedown', startDrag);
    dragOverlay.querySelectorAll('*').forEach(child => {
        child.addEventListener('mousedown', e => e.stopPropagation());
    });
}

function calculatePopupPosition(selectionRect) {
    const popupWidth = 400;
    const popupHeight = 350;
    const padding = 15;
    let left = selectionRect.left;
    let top = selectionRect.bottom + padding;

    if (left + popupWidth > window.innerWidth - padding) {
        left = window.innerWidth - popupWidth - padding;
    }
    if (top + popupHeight > window.innerHeight - padding) {
        top = selectionRect.top - popupHeight - padding;
        if (top < padding) top = padding;
    }
    if (left < padding) left = padding;
    if (top < padding) top = padding;

    return { left, top };
}