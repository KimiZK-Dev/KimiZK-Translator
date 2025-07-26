# Hướng dẫn Update Extension KimiZK-Translator

## 🔄 Cách Update Extension

### 1. **Cập nhật code và version**
- Thay đổi version trong `manifest.json`
- Commit và push code lên GitHub
- Tạo Release mới trên GitHub với tag version (ví dụ: v1.0.3)

### 2. **Hệ thống Auto-Update**

Extension sẽ tự động:
- ✅ Kiểm tra cập nhật mỗi 6 giờ
- ✅ Hiển thị thông báo khi có bản mới
- ✅ Cho phép user cập nhật với 1 click
- ✅ Hiển thị thông báo cập nhật thành công

### 3. **Quy trình Update**

#### **Bước 1: Cập nhật version**
```json
// manifest.json
{
  "version": "1.0.3"  // Tăng version number
}
```

#### **Bước 2: Tạo GitHub Release**
1. Vào GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.3`
4. Title: `KimiZK-Translator v1.0.3`
5. Description: Mô tả các thay đổi
6. Upload file ZIP của extension

#### **Bước 3: User sẽ nhận thông báo**
- Extension tự động kiểm tra mỗi 6 giờ
- Hiển thị card "Có bản cập nhật mới!" trong popup
- User click "Cập nhật" để reload extension

### 4. **Tính năng Update**

#### **Auto Check**
- Kiểm tra GitHub API mỗi 6 giờ
- So sánh version hiện tại với latest release
- Chỉ thông báo khi có version mới hơn

#### **User Experience**
- Thông báo rõ ràng trong popup
- Nút cập nhật 1 click
- Thông báo thành công sau khi update
- Có thể tắt/bật thông báo update

#### **Fallback**
- Nếu auto-update thất bại, hướng dẫn user reload thủ công
- Lưu log lỗi để debug

### 5. **Cấu hình**

#### **Thời gian check update**
```javascript
// background.js
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 giờ
```

#### **GitHub API URL**
```javascript
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/KimiZK-Dev/KimiZK-Translator/releases/latest';
```

### 6. **Testing Update**

1. Tạo release test với version cao hơn
2. Kiểm tra extension có nhận thông báo không
3. Test nút update có hoạt động không
4. Verify thông báo thành công

### 7. **Troubleshooting**

#### **Không nhận thông báo update**
- Kiểm tra GitHub API có hoạt động không
- Verify version format đúng (v1.0.3)
- Check console log trong background script

#### **Update không thành công**
- Extension reload có thể mất vài giây
- Nếu fail, user cần reload thủ công
- Check permissions notifications

### 8. **Best Practices**

- ✅ Luôn tăng version number
- ✅ Tạo GitHub release với tag đúng format
- ✅ Mô tả rõ ràng các thay đổi
- ✅ Test update flow trước khi release
- ✅ Monitor GitHub API rate limits

---

**Lưu ý**: Extension này không update qua Chrome Web Store, chỉ update qua GitHub releases. 