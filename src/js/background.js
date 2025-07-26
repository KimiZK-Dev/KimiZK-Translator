chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "saveAudio") {
        const audioBlob = request.audioBlob;
        const fileName = `audio_${Date.now()}.mp3`;

        try {
            if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
                sendResponse({ error: "Dữ liệu âm thanh không hợp lệ." });
                return true;
            }

            chrome.runtime.getPackageDirectoryEntry(directory => {
                directory.getDirectory('src/audio', { create: true }, audioDir => {
                    audioDir.getFile(fileName, { create: true, exclusive: true }, fileEntry => {
                        fileEntry.createWriter(writer => {
                            writer.onwriteend = () => {
                                const fileUrl = chrome.runtime.getURL(`src/audio/${fileName}`);
                                sendResponse({ fileUrl });
                                // Xóa file sau 5 phút
                                setTimeout(() => {
                                    fileEntry.remove(() => console.log(`Đã xóa ${fileName}`), err => console.error(`Lỗi xóa ${fileName}:`, err));
                                }, 5 * 60 * 1000);
                            };
                            writer.onerror = err => {
                                console.error("Lỗi khi ghi file:", err);
                                sendResponse({ error: "Không thể ghi file âm thanh." });
                            };
                            writer.write(audioBlob);
                        }, err => {
                            console.error("Lỗi khi tạo writer:", err);
                            sendResponse({ error: "Không thể tạo writer." });
                        });
                    }, err => {
                        console.error("Lỗi khi tạo file:", err);
                        sendResponse({ error: "Không thể tạo file." });
                    });
                }, err => {
                    console.error("Lỗi khi tạo thư mục:", err);
                    sendResponse({ error: "Không thể tạo thư mục src/audio." });
                });
            });
        } catch (err) {
            console.error("Lỗi trong background:", err);
            sendResponse({ error: "Lỗi xử lý trong background." });
        }
        return true; // Bật xử lý bất đồng bộ
    }
    sendResponse({ error: "Hành động không được hỗ trợ." });
    return true;
});

// Phát hiện cài đặt hoặc cập nhật tiện ích
chrome.runtime.onInstalled.addListener((details) => {
    try {
        const thisVersion = chrome.runtime.getManifest().version;
        if (details.reason === "install") {
            console.info("Tiện ích được cài lần đầu: " + thisVersion);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "src/icons/icon128.png",
                title: "Chào mừng bạn đến với KimiZK-Translator!",
                message: "Tiện ích đã được cài đặt. Bôi đen văn bản tiếng Anh và nhấn biểu tượng để dịch!",
                priority: 0
            });
        } else if (details.reason === "update") {
            console.info("Tiện ích đã cập nhật lên phiên bản: " + thisVersion);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "src/icons/icon128.png",
                title: `KimiZK-Translator đã cập nhật lên v${thisVersion}!`,
                message: "Cải thiện phát âm, dịch nhanh hơn, giao diện đẹp hơn. Tải phiên bản mới nhất từ GitHub nếu cần!",
                buttons: [{ title: "Xem chi tiết" }],
                priority: 2
            });
        }
        // Lưu phiên bản hiện tại
        chrome.storage.local.set({ previousVersion: thisVersion });
    } catch (e) {
        console.error("Lỗi khi xử lý onInstalled:", e);
    }
});

// Xử lý nút nhấn trên thông báo
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        chrome.tabs.create({ url: "https://github.com/KimiZK-Dev/KimiZK-Translator/releases" });
    }
});

// Kiểm tra phiên bản mới từ GitHub
async function checkForUpdates() {
    try {
        const response = await fetch("https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest", {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });
        if (!response.ok) {
            console.error("Lỗi khi kiểm tra cập nhật:", response.statusText);
            return;
        }
        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, ""); // Loại bỏ tiền tố "v" nếu có
        const currentVersion = chrome.runtime.getManifest().version;

        if (latestVersion !== currentVersion) {
            console.info(`Có phiên bản mới: ${latestVersion} (hiện tại: ${currentVersion})`);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "src/icons/icon128.png",
                title: `Có bản cập nhật KimiZK-Translator v${latestVersion}!`,
                message: "Tải phiên bản mới từ GitHub để trải nghiệm các tính năng cải tiến!",
                buttons: [{ title: "Tải ngay" }],
                priority: 2
            });
        } else {
            console.info("Đang dùng phiên bản mới nhất:", currentVersion);
        }
    } catch (e) {
        console.error("Lỗi khi kiểm tra cập nhật:", e);
    }
}

// Kiểm tra cập nhật khi khởi động và mỗi 24 giờ
chrome.runtime.onStartup.addListener(() => {
    checkForUpdates();
});
setInterval(checkForUpdates, 24 * 60 * 60 * 1000); // 24 giờ