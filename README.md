# KimiZK-Translator

Chrome Extension dịch đa ngôn ngữ sang tiếng Việt với giao diện hiện đại và AI tích hợp.

## 🚀 Tính năng chính

- **Dịch đa ngôn ngữ**: Hỗ trợ 13+ ngôn ngữ (Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, Ả Rập, Thái, Bồ Đào Nha)
- **AI tích hợp**: Sử dụng Groq API với model Llama 4 Scout
- **Giao diện thân thiện**: Popup đẹp mắt với animation mượt mà
- **Kéo thả tự do**: Di chuyển popup theo ý muốn
- **Auto-update**: Tự động kiểm tra và cập nhật phiên bản mới
- **Manifest V3**: Tuân thủ chuẩn mới nhất của Chrome

## 🛠️ Cài đặt

### **Cài đặt tiện ích:**
1. [Nhấp vào đây để tải](https://github.com/KimiZK-Dev/KimiZK-Translator/releases/download/1.0.4/KimiZK-Translator.zip)
2. Sau khi tải xong, hãy giải nén file vừa tải.
3. Mở trình duyệt, truy cập trang quản lý tiện ích thông qua thanh tìm kiếm: `chrome://extensions/`
4. Bật chế độ "Developer mode" (Chế độ nhà phát triển).
5. Chọn "Tải tiện ích đã giải nén" (Upload unpacked).
6. Chọn tới thư mục vừa giải nén ở bước 2.

### **Cấu hình API Key:**
- Lấy API key từ [Groq](https://console.groq.com/)
- Click vào icon extension và nhập API key
- **LƯU Ý**: Khi mới nhập tiện ích vào thì nhớ load lại những trang hiện tại đang dùng để tiện ích hoạt động

## 🎯 Sử dụng

1. **Dịch văn bản**:
   - Bôi đen văn bản cần dịch
   - Click vào icon translate xuất hiện
   - Xem kết quả dịch trong popup

2. **Phát âm**:
   - Click nút "Nghe" để phát âm
   - Điều chỉnh âm lượng bằng thanh trượt

3. **Sao chép**:
   - Click nút "Copy" để sao chép bản dịch

4. **Di chuyển popup**:
   - Kéo header để di chuyển popup
   - Thu gọn/mở rộng bằng nút minimize

## ⌨️ Phím tắt

- **Escape**: Đóng popup
- **Ctrl/Cmd + Shift + L**: Dịch văn bản đang chọn
- **Ctrl/Cmd + Shift + C**: Xem thông tin cache

## 🌍 Hỗ trợ ngôn ngữ

**Vietnamese, English, Japanese, Korean, Chinese, French, German, Spanish, Italian, Russian, Portuguese, Dutch, Arabic** + **tuỳ chỉnh thêm theo nhu cầu**

## 📱 Tương thích

- **Chrome** ✅
- **Edge** ✅  
- **Brave** ✅
- **Cốc Cốc** ✅
- **Firefox** ⚠️ (cần test thêm)

## 📁 Cấu trúc dự án

```
kimizk-translator/
├── manifest.json                 # Cấu hình extension
├── src/
│   ├── js/
│   │   ├── core/               # Core modules
│   │   │   ├── config.js       # Cấu hình toàn cục
│   │   │   ├── storage.js      # Quản lý Chrome Storage
│   │   │   ├── utils.js        # Hàm tiện ích
│   │   │   ├── api.js          # API service
│   │   │   ├── audio.js        # Quản lý âm thanh
│   │   │   ├── notifications.js # Quản lý thông báo
│   │   │   └── ui.js          # Quản lý giao diện
│   │   ├── background.js       # Service Worker
│   │   ├── popup.js           # Popup tiện ích
│   │   ├── update_modal.js    # Modal cập nhật
│   │   └── main.js            # Content Script chính
│   ├── css/                   # Stylesheets
│   ├── html/                  # HTML templates
│   └── icons/                # Icons
└── README.md
```

## 💖 Donate

Ủng hộ tác giả phát triển tiện ích qua mã QR bên dưới. Xin cảm ơn!

<p align="center">
  <img src="./CUỘC SỐNG KHÓ KHĂN QUÁ.png" alt="Donate QR" width="220" />
</p>

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

