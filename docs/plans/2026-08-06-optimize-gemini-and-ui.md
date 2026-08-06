# Optimize Gemini, UI/UX and PDF Features Implementation Plan

> **REQUIRED:** Follow TDD for every task. No production code without failing test first.

**Goal:** Hoàn thiện app PDF Pro: Thêm cấu hình SPA cho Vercel, chuyển đổi gọi API Gemini trực tiếp từ client-side, thiết lập giao diện chọn model AI, cảnh báo API key, cơ chế fallback/retry lỗi quota, và sắp xếp lại 4 tính năng thành hàng nằm ngang rực rỡ sắc màu.
**Stack:** React + TypeScript + Vite + Tailwind CSS + pdfjs-dist + pdf-lib + Google Gemini API

## User Review Required

> [!IMPORTANT]
> - **CAM KẾT BẢO MẬT TÀI LIỆU**: Ứng dụng chạy **100% Client-side** (trên trình duyệt của người dùng). Tài liệu PDF, ảnh xem trước và thông tin nhạy cảm của bạn hoàn toàn **KHÔNG** được lưu trữ, sao lưu hay gửi lên bất kỳ máy chủ trung gian nào. Các tính năng như tách, gộp, xoá trang trắng đều xử lý cục bộ; chỉ có ảnh xem trước trang được gửi trực tiếp tới API chính thức của Google Gemini để nhận diện hướng chữ khi bạn bấm nút "Tự động xoay bằng AI".
> - **Cách tiếp cận**: Gọi Gemini API trực tiếp từ Client-side (trình duyệt) thông qua API Key cá nhân của người dùng thay vì thông qua backend Express. Điều này giúp chạy độc lập trên Vercel mà không phát sinh lỗi 404/timeout.
> - **Bố cục giao diện**: 4 tính năng ở trang chủ được chuyển thành 1 hàng ngang duy nhất (`grid-cols-4`), thu nhỏ thẻ một chút và tô điểm bằng 4 dải màu gradient tương phản bắt mắt.
> - **Cơ chế Fallback/Retry**: Nếu một model bị lỗi hoặc hết quota, client sẽ tự động thử lại với model tiếp theo trong chuỗi. Nếu toàn bộ chuỗi lỗi hoặc hết quota, hiển thị thông báo hướng dẫn đổi API key khác.

## Proposed Changes

### 1. SPA Routing & Deployment

#### [NEW] [vercel.json](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/vercel.json)
- Cấu hình rewrites để Vercel route toàn bộ request về `index.html` nhằm hỗ trợ SPA routing.

### 2. Layout & Colors (Home Grid)

#### [MODIFY] [HomeGrid.tsx](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/components/HomeGrid.tsx)
- Sắp xếp 4 thẻ tính năng thành hàng ngang trên màn hình lớn (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5`).
- Thu nhỏ kích thước padding, font chữ và chiều cao thẻ để phù hợp với hiển thị 4 cột nằm ngang mà không bị rối.
- Đảm bảo mỗi tính năng có màu sắc đặc trưng riêng biệt:
  - **Tách Trang**: Rose-Red (`from-rose-500 via-pink-500 to-red-500`)
  - **Gộp Trang**: Indigo-Purple (`from-indigo-500 via-purple-500 to-pink-500`)
  - **Xóa Trang Trắng**: Teal-Emerald (`from-emerald-400 via-teal-500 to-cyan-500`)
  - **Xoay Trang**: Orange-Amber (`from-amber-400 via-orange-500 to-rose-500`)

### 3. Header & API Key Alert

#### [MODIFY] [Header.tsx](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/components/Header.tsx)
- Nút **Settings (API Key)** kèm dòng chữ màu đỏ **"Lấy API key để sử dụng app"** sẽ luôn hiển thị trên Header nếu chưa cấu hình key.
- Khi đã có key, nút hiển thị trạng thái đã kích hoạt (màu xanh lá).

#### [MODIFY] [App.tsx](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/App.tsx)
- Thêm logic kiểm tra xem nếu chưa có API key trong `localStorage` thì tự động hiển thị Modal cấu hình ngay lần đầu load trang để người dùng bắt buộc cấu hình trước khi dùng các chức năng AI.

### 4. Settings Model & Gemini Client API Helper

#### [MODIFY] [ApiKeyModal.tsx](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/components/ApiKeyModal.tsx)
- Bổ sung giao diện chọn Model AI dưới dạng thẻ Card 3D đẹp mắt.
- Các model hiển thị:
  1. `gemini-3-flash-preview` (Mặc định)
  2. `gemini-3-pro-preview`
  3. `gemini-2.5-flash`
- Lưu lựa chọn model vào `localStorage` (`pdfpro_selected_model`).
- Thêm liên kết hướng dẫn lấy API key tại `https://aistudio.google.com/api-keys`.

#### [NEW] [geminiApi.ts](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/utils/geminiApi.ts)
- Viết helper gọi trực tiếp API Google Gemini: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`.
- Tích hợp logic **Fallback & Retry**:
  - Chuỗi fallback: `gemini-2.5-flash` $\rightarrow$ `gemini-3-flash-preview` $\rightarrow$ `gemini-2.5-flash-lite` $\rightarrow$ `gemini-2.5-pro`.
  - Nếu request thất bại (quá tải, hết quota, lỗi model), helper tự động thử lại với model tiếp theo trong danh sách.
  - Trả về kết quả hoặc ném ra lỗi quota chi tiết.

### 5. Rotate PDF Page AI Integration

#### [MODIFY] [ToolRotatePdf.tsx](file:///c:/Users/Admin/Downloads/Tach-Gop-PDF-main/src/components/tools/ToolRotatePdf.tsx)
- Cập nhật hàm `handleAutoRotateWithAi` để gọi qua helper `geminiApi.ts` mới.
- Xử lý thông báo lỗi quota rõ ràng hơn để người dùng biết cách thay đổi key.

## Verification Plan

### Automated Tests
- Kiểm tra tính đúng đắn của code bằng lệnh kiểm tra cú pháp và build sản phẩm:
  - `tsc --noEmit` (Kiểm tra kiểu dữ liệu TypeScript)

### Manual Verification
- Tải app và kiểm tra xem trang chủ hiển thị 4 cột nằm ngang rực rỡ và đẹp mắt hay không.
- Xóa API key trong local storage và kiểm tra xem Header có hiển thị cảnh báo màu đỏ và Modal nhập key có tự động mở ra hay không.
- Nhập API Key, chọn model, chạy tính năng xoay trang tự động bằng AI để xem tính năng hoạt động trực tiếp client-side trơn tru hay không.
- Kiểm tra file `vercel.json` xem cấu hình đã sẵn sàng cho deploy Vercel chưa.
