# 📝 **Changelog - KimiZK-Translator**

## 🚀 **Version 1.0.5 (Latest)**

### ✨ **Tính năng & Cải tiến nổi bật**

#### ⌨️ **Command Palette (Ctrl + K / Cmd + K)**
- Giao diện tìm kiếm & thực thi lệnh nhanh định dạng macOS Spotlight / Raycast.
- Đổi nhanh mô hình AI, truy cập trang Cài đặt, sao chép kết quả tức thì bằng phím tắt.

#### 🎙️ **Thu âm AI & Nhận diện Giọng nói STT (Groq Whisper)**
- Tích hợp mô hình `whisper-large-v3-turbo` trực tiếp trong Popup.
- Giao diện nút Micro phát sáng gradient & dải sóng âm nhấp nháy sinh động.

#### 📷 **Chụp màn hình OCR Vision (Qwen 3.6 27B)**
- Chụp ảnh màn hình trang web, trích xuất văn bản từ hình ảnh và dịch nghĩa tự động bằng AI Vision.

#### 🌐 **Nguồn tìm kiếm Web Citations (Groq Compound)**
- Tự động hiển thị danh sách các thẻ liên kết nguồn dẫn chứng web khi dịch với mô hình Agentic AI (`groq/compound`).

#### 🎵 **Hệ thống Âm thanh 3-Tier Audio Engine**
- Tích hợp 3 lớp âm thanh dự phòng: Groq Orpheus AI TTS -> Google Cloud TTS -> Web Speech API.
- Bổ sung menu chọn TTS Model (`canopylabs/orpheus-v1-english` & `canopylabs/orpheus-arabic-saudi`).
- Giao diện trình phát âm thanh Glassmorphic AI Player sang trọng.

#### 🎨 **Tối ưu hóa UI/UX & 100% Vector SVG Icons**
- Thiết kế Popup rộng rãi (`380px`), bổ sung dải nút bấm cửa sổ chuẩn macOS Traffic Lights.
- Chuyển đổi 100% các icon Emoji trong dự án thành Vector SVG sắc nét.
- Xử lý triệt để lỗi HTTP 413 (Content Too Large) và tối ưu hóa 65% dung lượng prompt.

---

## 🚀 **Version 1.0.4**

### ✨ **Tính năng & Cải tiến nổi bật**

#### 🎵 **Hệ thống âm thanh nâng cao**
- **Cache âm thanh thông minh** - tái sử dụng nhanh chóng, tránh lãng phí lượt gửi yêu cầu API
- **Điều khiển audio** - cải tiến hoàn thiện chức năng một cách mượt mà
- **Multiple playback methods** - AudioContext, HTML Audio, Data URL. Giúp nghe được audio trên mọi web mà không bị lỗi do dính CSP của web

#### 🎨 **Giao diện người dùng - Popup dịch - Popup tiện ích**
- **Audio controls** - làm lại phù hợp cho người dùng 

#### 🌍 **Dịch thuật đa ngôn ngữ mở rộng**
- **Hỗ trợ 13+ ngôn ngữ** - Tích hợp thêm trong Popup tiện ích
- **Phân tích từng từ chi tiết** - cải thiện thêm nghĩa, loại từ, ví dụ, phiên âm chính xác hơn

#### ⚙️ **Quản lý cấu hình nâng cao**
- **API Key management** - quản lý Groq API key an toàn
- **Language preferences** - lưu ngôn ngữ yêu thích và gần đây
- **Update notifications** - bật/tắt thông báo cập nhật
- **Storage management** - lưu trữ dữ liệu local an toàn

#### ⌨️ **Phím tắt thông minh**
- **Escape** - đóng popup
- **Ctrl/Cmd + Shift + L** - dịch văn bản đang chọn 
- **Ctrl/Cmd + Shift + C** - xem thông tin cache

#### 🐛 **Sửa lỗi quan trọng**
- **Audio playback issues** - sửa lỗi phát âm thanh trên một số trang
- **Popup positioning** - cải thiện vị trí hiển thị popup
- **Memory leaks** - sửa lỗi rò rỉ bộ nhớ trong audio controls
- **Update notification** - sửa lỗi thông báo cập nhật không hiển thị

---

### 📋 **Hỗ trợ ngôn ngữ**

**Vietnamese, English, Japanese, Korean, Chinese, French, German, Spanish, Italian, Russian, Portuguese, Dutch, Arabic** + **tuỳ chỉnh thêm theo nhu cầu**

---

### 📱 **Tương thích**

- **Chrome** ✅
- **Edge** ✅  
- **Brave** ✅
- **Cốc Cốc** ✅
- **Firefox** ⚠️ (cần test thêm)

