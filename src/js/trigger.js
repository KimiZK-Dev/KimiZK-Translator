let triggerIcon = null;
let justCreatedTriggerIcon = false;

function createTriggerIcon(selectionRect) {
    triggerIcon?.remove();
    triggerIcon = document.createElement("div");
    triggerIcon.className = "xt-trigger-icon";
    triggerIcon.innerHTML = `<img src="${chrome.runtime.getURL('src/icons/icon16.png')}" alt="Translate">`;
    document.body.appendChild(triggerIcon);

    const padding = 10;
    Object.assign(triggerIcon.style, {
        position: 'fixed',
        zIndex: '2147483647',
        left: `${selectionRect.left}px`,
        top: `${selectionRect.bottom + padding}px`
    });
    justCreatedTriggerIcon = true;
    setTimeout(() => { justCreatedTriggerIcon = false; }, 200);
}