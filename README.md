<div align="center">

  <img src="src/icons/icon128.png" alt="KimiZK Translator Logo" width="96" height="96" />

  # KimiZK Translator

  **Tiện ích dịch thuật đa ngôn ngữ thông minh trên Chrome với Multi-AI Engine, Edge Neural TTS & Vision OCR**

  [![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
  [![Version](https://img.shields.io/badge/version-1.0.6-emerald.svg)](https://github.com/KimiZK-Dev/KimiZK-Translator/releases)
  [![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-slate.svg)](#tuong-thich)

</div>

---

## Tổng quan

**KimiZK Translator** là tiện ích mở rộng Chrome Extension thế hệ mới giúp dịch thuật văn bản bôi đen, tra cứu từ điển chuyên sâu, phát âm AI đa nhà cung cấp và nhận diện chữ từ hình ảnh (OCR) trực tiếp trên mọi trang web.

Dự án được tối ưu hóa với giao diện phẳng hiện đại, tốc độ phản hồi tức thì và tích hợp cơ chế tự động chuyển đổi khóa API dự phòng (**Multi-Key Failover Pool**).

---

## Giao diện tiện ích

<div align="center">
  <img src="assets/images/popup-extension-dark.png" alt="Popup tiện ích - Giao diện Tối" width="280" style="border-radius: 10px; margin-right: 12px;" />
  <img src="assets/images/popup-extension-light.png" alt="Popup tiện ích - Giao diện Sáng" width="280" style="border-radius: 10px;" />
  <p><em>Popup Tiện ích: Chế độ Tối (Dark Mode) và Chế độ Sáng (Light Mode)</em></p>
</div>

<div align="center">
  <img src="assets/images/popup-translate-sentence.png" alt="Popup Dịch nổi - Dịch đoạn văn" width="280" style="border-radius: 10px; margin-right: 12px;" />
  <img src="assets/images/popup-translate-dictionary.png" alt="Popup Dịch nổi - Tra từ điển chi tiết" width="280" style="border-radius: 10px;" />
  <p><em>Cửa sổ Dịch nổi: Dịch đoạn văn ngữ cảnh (Trái) & Phân tích từ điển chi tiết (Phải)</em></p>
</div>

---

## Tính năng chính

### 1. Multi-AI Translation Engine
- Hỗ trợ 8 mô hình AI mạnh mẽ được tối ưu hóa: `llama-3.3-70b-versatile`, `groq/compound`, `groq/compound-mini`, `deepseek-r1-distill-llama-70b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, `llama-3.1-8b-instant`.
- Phân tích từ điển chuyên sâu: Loại từ, phiên âm IPA, định nghĩa chi tiết, từ đồng nghĩa, biến thể ngữ pháp và ví dụ thực tế.

### 2. Phát âm AI Đa nền tảng (Multi-Provider TTS)
- **Microsoft Edge Neural AI (Mặc định)**: Phát âm tự nhiên chuẩn bản ngữ, hoàn toàn miễn phí không cần API Key.
- **Puter AI Cloud TTS**: Hỗ trợ 6 nhà cung cấp cao cấp (AWS Polly, OpenAI TTS, Gemini TTS, ElevenLabs, xAI Grok, Speechify).
- **Groq Orpheus Speech**: Giọng đọc cảm xúc thế hệ mới.

### 3. Tự động luân chuyển API Key (Multi-Key Pool)
- Tự động chuyển đổi sang API Key tiếp theo khi gặp giới hạn Rate Limit (HTTP 429), giúp quá trình dịch không bao giờ bị gián đoạn.

### 4. Thu âm Voice STT & Nhận diện Vision OCR
- **Voice STT**: Chuyển giọng nói từ micro thành văn bản dịch bằng `whisper-large-v3-turbo`.
- **Vision OCR**: Khoanh vùng ảnh bất kỳ trên trang web để trích xuất và dịch nghĩa tức thì.

### 5. Điều khiển nhanh & Giao diện Tinh tế
- **Command Palette (`Ctrl + K` / `Cmd + K`)**: Tìm kiếm và thực thi lệnh nhanh chóng.
- **UI/UX Tối giản**: Xóa bỏ hoàn toàn emoji rườm rà, thay bằng biểu tượng SVG phẳng hiện đại.

---

## Phím tắt mặc định

| Phím tắt | Thao tác |
|---|---|
| **`Ctrl + Shift + L`** | Dịch văn bản bôi đen trên trang web |
| **`Ctrl + K`** | Mở bảng lệnh nhanh Command Palette |
| **`Escape`** | Đóng nhanh cửa sổ dịch hoặc bảng lệnh |

---

## Cài đặt nhanh

1. **Tải mã nguồn**:
   ```bash
   git clone https://github.com/KimiZK-Dev/KimiZK-Translator.git
   ```
2. **Tải vào trình duyệt**:
   - Truy cập `chrome://extensions/` trên Chrome, Edge, Brave hoặc Cốc Cốc.
   - Bật **Chế độ dành cho nhà phát triển (Developer mode)**.
   - Bấm **Tải tiện ích đã giải nén (Load unpacked)** và chọn thư mục project.
3. **Cấu hình API Key**:
   - Mở **Cài đặt** ➔ Nhập API Key từ [Groq Console](https://console.groq.com/) (miễn phí).

---

## Tương thích & Bảo mật

- **Tương thích**: Chrome, Microsoft Edge, Brave, Cốc Cốc.
- **Bảo mật**: API Key và các thiết lập cá nhân được lưu trữ cục bộ trong `chrome.storage.local`. Không gửi dữ liệu tới máy chủ thứ ba không xác định.

---

## Tác giả & Hỗ trợ

- **Tác giả / Tổ chức**: [KimiZK-Dev](https://github.com/KimiZK-Dev)
- **Hỗ trợ trực tiếp**: [Facebook Tác giả (NgHxBach)](https://www.facebook.com/NgHxBach)
- **Giấy phép**: [MIT License](LICENSE)
