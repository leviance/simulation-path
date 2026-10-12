# Project 46 — Hộp cát số

Xây một mô phỏng ô lưới 96 × 64 bằng C++20 và SDL 3.4.8. Cát rơi/trượt, nước lan ngang, tường đứng yên. Đây là luật cellular automata cập nhật tại chỗ, không phải fluid solver có áp suất hay bảo toàn động lượng.

## Build và chạy

ZIP đã chứa CMake, starter, checkpoints và final. Trong repository website, chạy `npm run generate:course` trước để sinh những file này.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Windows: chạy `build/Debug/project_46_final.exe`. Với generator một cấu hình trên Linux/macOS, executable thường nằm ngay trong `build/`; chọn `-DCMAKE_BUILD_TYPE=Debug` ở bước configure. SDL được tải qua FetchContent; không cần OpenGL compute.

```sh
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Mặc định CMake build final và tests. `BUILD_CHECKPOINTS=ON` thêm `project_46_starter` và `project_46_checkpoint_1` tới `project_46_checkpoint_7`.

## Học theo checkpoint

| Mốc | Phần được thêm |
| --- | --- |
| Starter | Window, renderer, logical presentation, event loop, nền tối |
| 01 | Grid row-major, cát đứng yên, tường và SDL_FRect |
| 02 | Brush, nội suy nét vẽ, chuyển mouse coordinates |
| 03 | Rơi thẳng từng tick, bottom-up, moved mask |
| 04 | Trượt chéo và đổi chiều duyệt |
| 05 | Nước lan ngang, cát đổi chỗ với nước |
| 06 | 30 tick/giây, pause, accumulator và budget |
| 07 | Cảnh mẫu, inspector, bộ đếm và kiểm chứng |

Trong repository, chỉ sửa `source-template/`; các mốc độc lập được sinh tự động. Trong ZIP, có thể sửa trực tiếp `starter/` để học từ đầu. Không cần source của Project 45.

## Điều khiển bản hoàn chỉnh

- Chuột trái: vẽ. `1`: cát; `2`: tường; `3`: nước; `4`: tẩy.
- `[` / `]`: giảm/tăng bán kính, từ 0 đến 8 ô.
- `Space`: chạy/tạm dừng; `N`: tạm dừng và tiến một tick.
- `R`: đặt lại cảnh đang chọn; `P`: đổi cảnh cát trên bệ/phễu/lưới trống.
- Mũi tên: chọn ô; `Enter`: tô tại ô đang chọn. Tiêu đề hiển thị tọa độ, index và bộ đếm.
- `V`: tạm dừng rồi kiểm chứng 120 tick trên cảnh riêng, không sửa hộp đang vẽ; terminal in từng điều kiện, tiêu đề báo PASS/FAIL tổng hợp.
- `Esc`: thoát. Mất focus tự tạm dừng và kết thúc nét vẽ. SDL tự capture chuột trong lúc nhấn nút; vùng ngoài lưới không được clamp vào biên.

## Giới hạn mô hình

Mỗi tick xóa moved mask rồi duyệt từ dưới lên. Cát thử xuống, hai ô chéo; nước thử thêm hai ô ngang. Tick lẻ đảo chiều ngang, parity x+y+tick chọn hướng chéo ưu tiên. Đây là mô hình có thứ tự, không đảm bảo đối xứng tuyệt đối.

Một lần swap đánh dấu cả hai ô. Cát có thể đổi chỗ với nước chưa di chuyển, không được ghi đè mất nước. Đi chéo chỉ kiểm tra ô đích. Nước có thể dao động ngang mãi; không suy ra áp suất hoặc thể tích vật lý từ số ô xanh.

Không vẽ/tẩy/reset khi đo bảo toàn. Các thao tác đó cố ý thay số lượng vật liệu. Timing chỉ bù tối đa 4 tick/frame, nhận tối đa 0,25 giây/frame; thời gian còn lại được báo là dropped, không mô phỏng bù vô hạn.

Tests thuần không mở window, không dùng assert bị tắt trong Release. Kiểm bounds, brush, một lần đi/tick, swap, bảo toàn, tính lặp lại, wall positions và các chuỗi frame 15/30/120 FPS. Tất cả vòng kiểm thử đều có giới hạn.
