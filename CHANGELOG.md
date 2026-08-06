# 📝 **Changelog - KimiZK-Translator**

## 🚀 **Version 1.0.5 (Latest)**

### ✨ **Tính năng & Cải tiến nổi bật**

#### 🤖 **Hệ thống TTS Multi-Provider (Edge Neural AI & Puter.ai)**
- **Microsoft Edge Neural AI (Primary)**: Tích hợp giọng đọc AI tự nhiên chất lượng cao (Hoài My, Nam Minh, Ava, Andrew, Nanami, Sun-Hi, Xiaoxiao), hoàn toàn miễn phí, không cần API Key.
- **Puter.ai TTS Driver Alignment**: Chuẩn hóa 100% cấu trúc driver (`interface: "puter-tts"`, `driver: "ai-tts"`) hỗ trợ đầy đủ 6 nhà cung cấp (AWS Polly, OpenAI TTS, Google Gemini TTS, ElevenLabs, xAI Grok, Speechify).
- **Phục hồi thông minh (Smart Driver Pool)**: Tự động chuyển đổi nhà cung cấp âm thanh khi driver không khả dụng hoặc chạm giới hạn.

#### 🔑 **Multi-Key Failover Pool & Anti-Hang Timouts**
- Tự động luân chuyển danh sách Groq API Key phụ khi xảy ra lỗi HTTP 429 Rate Limit (100k token/ngày).
- Tích hợp `AbortController` giới hạn thời gian phản hồi (12s-15s), loại bỏ triệt để hiện tượng dịch bị treo loading vô tận.

#### 🎨 **Thương hiệu & Giao diện Nhất quán (Brand & UI Polish)**
- **Bộ Icon Tiện ích mới**: Chuẩn hóa toàn bộ 7 kích thước icon (`16px` - `512px`) độ phân giải cao theo chuẩn Chrome Extension Manifest V3.
- **Logo Thương hiệu Đồng bộ**: Thay thế icon mẫu cũ bằng Logo KimiZK mới tại Popup, Options Sidebar, Thẻ Thông tin, và Nút dịch bôi đen nổi trên trang web.
- **Theme Icon Động**: Tự động chuyển đổi biểu tượng **Mặt Trời ☀️ / Mặt Trăng 🌙** mượt mà trên nút đổi giao diện Sáng/Tối.
- **Badge Trạng thái & Nút Xóa**: Tối ưu hóa CSS cho `.xt-status.ok` với vòng viền mỏng & dot phát sáng; làm mới icon nút xóa thẻ ngôn ngữ (`12x12` close cross).

#### 🔗 **Liên kết Tác giả & Hỗ trợ**
- Cập nhật thông tin liên kết trực tiếp tới trang cá nhân [Facebook Tác giả (NgHxBach)](https://www.facebook.com/NgHxBach).

---

## 🚀 **Version 1.0.4**

### ✨ **Tính năng & Cải tiến nổi bật**

#### 🎵 **Hệ thống âm thanh nâng cao**
- **Cache âm thanh thông minh** - tái sử dụng nhanh chóng, tránh lãng phí lượt gửi yêu cầu API
- **Multiple playback methods** - AudioContext, HTML Audio, Data URL giúp nghe âm thanh trên mọi trang web mà không bị chặn CSP.

#### 🌍 **Dịch thuật đa ngôn ngữ mở rộng**
- **Hỗ trợ 13+ ngôn ngữ** - Tích hợp phân tích từng từ chi tiết (nghĩa, loại từ, ví dụ, phiên âm IPA).

---

### 📱 **Tương thích Trình duyệt**

- **Chrome** ✅
- **Edge** ✅  
- **Brave** ✅
- **Cốc Cốc** ✅
