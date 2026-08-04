# KimiZK-Translator

Chrome Extension dịch đa ngôn ngữ sang tiếng Việt với giao diện hiện đại và AI tích hợp.

## 🚀 Tính năng

- **Dịch đa ngôn ngữ**: Hỗ trợ 13+ ngôn ngữ (Anh, Pháp, Đức, Tây Ban Nha, Ý, Nhật, Hàn, Trung, Nga, Ả Rập, Thái, Bồ Đào Nha)
- **AI tích hợp**: Sử dụng Groq API với model `qwen/qwen3.6-27b` hoặc `openai/gpt-oss-120b` chuẩn xác cao
- **Giao diện hiện đại**: Popup đẹp mắt với animation mượt mà
- **Phát âm chuẩn**: Text-to-Speech với phát âm IPA
- **Kéo thả tự do**: Di chuyển popup theo ý muốn
- **Auto-update**: Tự động kiểm tra và cập nhật phiên bản mới
- **Manifest V3**: Tuân thủ chuẩn mới nhất của Chrome

## 📁 Cấu trúc dự án (Đã được tối ưu hóa)

```
kimizk-translator/
├── manifest.json                 # Cấu hình extension
├── src/
│   ├── js/
│   │   ├── core/               # Core modules (MỚI)
│   │   │   ├── config.js       # Cấu hình toàn cục
│   │   │   ├── storage.js      # Quản lý Chrome Storage
│   │   │   ├── utils.js        # Hàm tiện ích
│   │   │   ├── api.js          # API service
│   │   │   ├── audio.js        # Quản lý âm thanh
│   │   │   ├── notifications.js # Quản lý thông báo
│   │   │   └── ui.js          # Quản lý giao diện
│   │   ├── background.js       # Service Worker
│   │   └── main.js            # Content Script chính
│   ├── css/                   # Stylesheets
│   ├── html/                  # HTML templates
│   └── icons/                # Icons
└── README.md
```

## 🔧 Cải thiện trong phiên bản 1.0.4

### 1. **Tối ưu hóa cấu trúc code**
- **Modular Architecture**: Chia nhỏ code thành các module riêng biệt
- **Separation of Concerns**: Tách biệt rõ ràng các chức năng
- **Clean Code**: Code sạch, dễ đọc và bảo trì

### 2. **Cải thiện hiệu suất**
- **Lazy Loading**: Load module khi cần thiết
- **Memory Management**: Quản lý bộ nhớ tốt hơn với cache
- **Debounce/Throttle**: Tối ưu hóa event handlers
- **Error Handling**: Xử lý lỗi toàn diện

### 3. **Tối ưu hóa logic**
- **Async/Await**: Sử dụng Promise hiện đại
- **Event Delegation**: Tối ưu hóa event listeners
- **State Management**: Quản lý state tập trung
- **Configuration**: Cấu hình tập trung và dễ thay đổi

### 4. **Cải thiện UX**
- **Keyboard Shortcuts**: Phím tắt nhanh (Ctrl+Shift+L, Escape)
- **Better Notifications**: Thông báo thông minh hơn
- **Responsive Design**: Giao diện responsive
- **Accessibility**: Cải thiện khả năng tiếp cận

## 🛠️ Cài đặt

1. **Clone repository**:
   ```bash
   git clone https://github.com/KimiZK-Dev/KimiZK-Translator.git
   cd KimiZK-Translator
   ```

2. **Cài đặt extension**:
   - Mở Chrome và vào `chrome://extensions/`
   - Bật "Developer mode"
   - Click "Load unpacked" và chọn thư mục dự án

3. **Cấu hình API Key**:
   - Lấy API key từ [Groq](https://console.groq.com/)
   - Click vào icon extension và nhập API key

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

## 🔧 Cấu hình

### API Configuration (config.js)
```javascript
const CONFIG = {
    API: {
        MODEL: "meta-llama/llama-4-scout-17b-16e-instruct",
        ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
        TTS_ENDPOINT: "https://api.groq.com/openai/v1/audio/speech"
    },
    UI: {
        POPUP_WIDTH: 400,
        POPUP_HEIGHT: 350,
        Z_INDEX: 2147483647
    }
};
```

### Storage Management (storage.js)
```javascript
// Lưu API key
await StorageManager.saveApiKey('your-api-key');

// Lấy API key
const apiKey = await StorageManager.getApiKey();
```

## 🚀 Tính năng mới

### 1. **Module System**
- **Config Module**: Quản lý cấu hình tập trung
- **Storage Module**: Quản lý Chrome Storage an toàn
- **Utils Module**: Hàm tiện ích tái sử dụng
- **API Module**: Xử lý API calls với error handling
- **Audio Module**: Quản lý âm thanh với cache
- **Notification Module**: Hệ thống thông báo thống nhất
- **UI Module**: Quản lý giao diện tập trung

### 2. **Performance Optimizations**
- **Memory Leak Prevention**: Tự động cleanup resources
- **Event Optimization**: Debounce/throttle cho scroll events
- **Cache Management**: LRU cache cho audio files
- **Lazy Loading**: Load modules khi cần

### 3. **Error Handling**
- **Graceful Degradation**: Xử lý lỗi mượt mà
- **User Feedback**: Thông báo lỗi thân thiện
- **Retry Logic**: Tự động thử lại khi lỗi
- **Fallback Mechanisms**: Phương án dự phòng

### 4. **Developer Experience**
- **Clean Code**: Code dễ đọc và bảo trì
- **Modular Design**: Dễ mở rộng và thay đổi
- **Documentation**: JSDoc comments đầy đủ
- **Type Safety**: Validation và type checking

## 🔄 Auto-Update System

Extension tự động kiểm tra cập nhật:
- **Startup Check**: Kiểm tra khi khởi động browser
- **Periodic Check**: Kiểm tra định kỳ mỗi 6 giờ
- **Manual Check**: Kiểm tra thủ công từ popup
- **Smart Notifications**: Thông báo thông minh

## 🎨 UI/UX Improvements

- **Modern Design**: Giao diện hiện đại với glassmorphism
- **Smooth Animations**: Animation mượt mà với CSS transitions
- **Responsive Layout**: Tự động điều chỉnh kích thước
- **Accessibility**: Hỗ trợ keyboard navigation
- **Dark Mode Ready**: Sẵn sàng cho dark mode

## 🛡️ Security

- **API Key Protection**: Lưu trữ an toàn trong Chrome Storage
- **Content Security Policy**: CSP nghiêm ngặt
- **Input Validation**: Validate tất cả input
- **XSS Prevention**: Escape HTML content
- **CORS Handling**: Xử lý CORS đúng cách

## 📊 Performance Metrics

- **Load Time**: < 100ms
- **Memory Usage**: < 50MB
- **CPU Usage**: < 5% khi idle
- **Network Requests**: Tối ưu hóa với caching
- **Bundle Size**: < 500KB

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

- **Facebook**: [KimiZK](https://www.facebook.com/nhb.xyz)
- **GitHub**: [KimiZK-Dev](https://github.com/KimiZK-Dev)
- **Email**: [Contact via Facebook]

## 🙏 Acknowledgments

- **Groq**: Cung cấp AI API
- **Chrome Extensions**: Documentation và examples
- **Community**: Feedback và suggestions

---

**Made with ❤️ by KimiZK** 