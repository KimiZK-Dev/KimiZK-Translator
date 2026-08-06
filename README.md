# 🌐 KimiZK-Translator (v1.0.5)

Chrome Extension dịch đa ngôn ngữ sang tiếng Việt với giao diện hiện đại, tích hợp **Multi-AI Engine** (Groq AI, Puter AI, Microsoft Edge Neural AI, Google Translate & Groq Whisper STT).

---

## 🚀 Tính năng nổi bật

- 🤖 **Multi-AI Engine**: Tích hợp các mô hình AI mạnh mẽ nhất (`llama-3.3-70b-versatile`, `qwen3.6-27b`, `groq/compound-mini`).
- 🔊 **Hệ thống TTS Đa tầng (Multi-Provider Audio Engine)**:
  - **Microsoft Edge Neural AI** (Miễn phí, Không cần Key — Giọng đọc siêu tự nhiên Hoài My, Nam Minh, Ava, Andrew).
  - **Puter AI TTS** (Hỗ trợ AWS Polly, OpenAI TTS, Google Gemini TTS, ElevenLabs, xAI Grok, Speechify qua Puter Auth Token).
  - **Groq Orpheus AI TTS** (Phát âm cảm xúc tiếng Anh & Ả Rập).
  - **Google Translate TTS** (Miễn phí tiêu chuẩn).
- 🔑 **Multi-Key Pool (Dự phòng thông minh)**: Tự động chuyển đổi API Key khi 1 key chạm giới hạn Rate Limit (HTTP 429), đảm bảo trải nghiệm dịch không bị gián đoạn.
- 🎙️ **Nhận diện Giọng nói STT (Groq Whisper)**: Thu âm giọng nói và chuyển đổi thành văn bản dịch nghĩa tức thì (`whisper-large-v3-turbo`).
- 📷 **Chụp màn hình OCR Vision**: Khoanh vùng ảnh bất kỳ trên trang web để trích xuất chữ và dịch nghĩa bằng AI Vision.
- ⌨️ **Command Palette (Ctrl + K / Cmd + K)**: Tìm kiếm & thực thi lệnh nhanh định dạng Raycast / Spotlight.
- 🎨 **Giao diện Hiện đại & Theme Động**: Hỗ trợ Sáng / Tối (Light & Dark Theme) với nút chuyển đổi biểu tượng Mặt Trời ☀️ / Mặt Trăng 🌙 sinh động.
- 📊 **Thống kê Bento Grid (Analytics)**: Theo dõi tổng số từ đã dịch, tốc độ phản hồi API ms, và biểu đồ 7 ngày gần nhất.

---

## 📁 Cấu trúc dự án

```
KimiZK-Translator/
├── manifest.json                 # Cấu hình Chrome Extension (Manifest V3)
├── src/
│   ├── js/
│   │   ├── core/                 # Các module lõi
│   │   │   ├── config.js         # Hằng số & Cấu hình toàn cục
│   │   │   ├── storage.js        # Quản lý Chrome Local Storage & Multi-Key Pool
│   │   │   ├── utils.js          # Hàm tiện ích (cleanJson, detectLanguage...)
│   │   │   ├── api.js            # API Service (Groq, Puter, Edge TTS, Whisper)
│   │   │   ├── audio.js          # Quản lý trình phát & cache âm thanh
│   │   │   ├── notifications.js  # Hệ thống thông báo
│   │   │   └── ui.js             # Quản lý giao diện Popup dịch nổi trên trang web
│   │   ├── background.js         # Service Worker (Background Script)
│   │   ├── popup.js              # Controller cho Popup Extension
│   │   ├── options.js            # Controller cho trang Cấu hình (Options Page)
│   │   └── main.js               # Content Script chính (Text Selection & OCR Snipper)
│   ├── css/                      # Stylesheets (options.css, popup.css, styles.css)
│   ├── html/                     # HTML Templates (options.html, popup.html)
│   └── icons/                    # Bộ Icon chính thức (16px, 24px, 32px, 64px, 128px, 156px, 512px)
├── CHANGELOG.md                  # Nhật ký thay đổi qua từng phiên bản
└── README.md                     # Tài liệu hướng dẫn sử dụng
```

---

## 🛠️ Cài đặt

1. **Clone hoặc tải mã nguồn**:
   ```bash
   git clone https://github.com/KimiZK-Dev/KimiZK-Translator.git
   ```

2. **Cài đặt vào Trình duyệt (Chrome / Brave / Edge / Cốc Cốc)**:
   - Mở trình duyệt và truy cập `chrome://extensions/`
   - Bật **"Developer mode"** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
   - Bấm **"Load unpacked"** (Tải tiện ích đã giải nén) và chọn thư mục `KimiZK-Translator`.

3. **Cấu hình API Key**:
   - Nhấp vào biểu tượng KimiZK-Translator ➔ Mở **Cài đặt (Options)** ➔ Chọn tab **"Cấu hình AI & API"**.
   - Nhập một hoặc nhiều API Key từ [Groq Console](https://console.groq.com/) (Free).
   - *(Tùy chọn)* Nhập **Puter Auth Token** nếu muốn dùng các giọng đọc Puter AI (OpenAI, Gemini, ElevenLabs).

---

## 🎯 Phím tắt tiện ích

- **`Ctrl + Shift + L`** (hoặc `Cmd + Shift + L`): Dịch nhanh đoạn văn bản đang bôi đen.
- **`Ctrl + K`** (hoặc `Cmd + K`): Mở bảng lệnh Command Palette.
- **`Escape`**: Đóng nhanh cửa sổ dịch hoặc bảng lệnh.

---

## 🛡️ Bảo mật & Hiệu năng

- **Bảo mật API Key**: Toàn bộ API Key và Puter Token được lưu trữ cục bộ trong `chrome.storage.local` trên trình duyệt người dùng, tuyệt đối không gửi qua máy chủ trung gian.
- **Tốc độ phản hồi cực nhanh**: Tích hợp thuật toán AbortController quản lý timeout (12s) và bộ nhớ tạm cache âm thanh tái sử dụng.

---

## 📝 Giấy phép (License)

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 📞 Liên hệ & Hỗ trợ

- **Tác giả**: [KimiZK-Dev](https://github.com/KimiZK-Dev)
- **Facebook**: [NgHxBach](https://www.facebook.com/NgHxBach)
- **GitHub Repository**: [KimiZK-Dev/KimiZK-Translator](https://github.com/KimiZK-Dev/KimiZK-Translator)