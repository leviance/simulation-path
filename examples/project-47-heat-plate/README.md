# Project 47 — Tấm kim loại nóng

Mô phỏng dẫn nhiệt 2D trên lưới 64 × 48, viết bằng C++20 và SDL 3.4.8. Chương trình bắt đầu ở trạng thái tạm dừng; bạn vẽ nhiệt độ, tiến từng bước và so kết quả bằng số.

## Build và chạy

Trong repository website, chạy `npm run generate:course` để sinh CMake và snapshots. ZIP tải về đã chứa các file cần thiết, không phụ thuộc Project 46.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Trên Windows/Visual Studio, chạy `build/Debug/project_47_final.exe`. Với generator một cấu hình, executable ở ngay `build/`; chọn `-DCMAKE_BUILD_TYPE=Debug` khi configure.

```sh
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

CMake mặc định build final và tests. Bật BUILD_CHECKPOINTS để thêm starter và project_47_checkpoint_1 tới project_47_checkpoint_8. SDL tải bằng FetchContent, link SDL3::SDL3; không cần GPU compute.

## Lộ trình

| Mốc | Nội dung mới |
| --- | --- |
| Starter | Window, renderer, logical presentation, event loop |
| 01 | Trường nhiệt độ, thang màu cố định, vẽ SDL_FRect |
| 02 | Brush nóng/lạnh, tọa độ chuột, nối nét |
| 03 | Sai phân một chiều và double buffer |
| 04 | Stencil năm điểm trong hai chiều |
| 05 | Biên cách nhiệt và vành ô giữ lạnh |
| 06 | Giới hạn ổn định, accumulator, ngân sách bước |
| 07 | Inspector, min/max/mean/sum |
| 08 | Cảnh mẫu, kiểm chứng hữu hạn, tests |

Trong repository chỉ sửa source-template. Starter/checkpoints/final là bản sinh tự động và không đưa vào Git. Trong ZIP, bạn có thể sửa starter trực tiếp để học.

## Điều khiển bản hoàn chỉnh

- Chuột trái: đặt nhiệt độ. `1` nóng (theta=1), `2` lạnh (theta=0); `[`/`]` đổi bán kính 0–8.
- `C` xóa field; `R` reset cảnh đang chọn; `P` đổi vùng nóng/đồng đều/checker/tấm lạnh.
- `N` tạm dừng và tiến một bước; `Space` chạy/dừng.
- `B` đổi biên cách nhiệt hoặc giữ vành ở 0.
- `A` đổi alpha qua 3, 6, 12; `T` đổi dt giữa 1/30 và 1/60. Đổi tham số sẽ pause.
- Mũi tên chọn ô; Enter đóng dấu brush; `I` in inspector và thống kê ra terminal.
- `V` chạy hai ca chuẩn, mỗi ca 120 bước, trên field riêng; báo bảo toàn, min/max và biên lạnh.
- Esc thoát. Mất focus tự pause và kết thúc nét; resize không đổi trạng thái lưới.

Brush đặt nhiệt độ khi click/rê, không liên tục giữ nóng khi đứng yên. Input trên vành Cold luôn bị điều kiện biên ghi đè về 0.

## Mô hình và giới hạn

theta là nhiệt độ dư chuẩn hóa, không phải Kelvin hay Joule. Thang màu 0–1 cố định; renderer chỉ clamp màu, không sửa dữ liệu solver.

Công thức: C_new = C + rx*(L-2C+R) + ry*(U-2C+D), rx=alpha*dt/dx², ry=alpha*dt/dy². Double buffer giữ mọi phép đọc ở cùng thời điểm. Điều kiện explicit: rx+ry ≤ 1/2, các hệ số không âm. Không ổn định thì diffuse trả false trước khi thay field; alpha=12 và dt=1/30 là một ví dụ bị từ chối.

Insulated dùng ghost bằng ô sát biên. Cold cố định cả vành ô ngoài ở 0: hai cách đặt biên không cùng miền hình học. Tổng theta bảo toàn với insulated khi không có input; cold có thể rút nhiệt đi. Chưa mô phỏng đối lưu, bức xạ, vật liệu biến thiên hoặc nguồn công suất liên tục.

Scheduler nhận tối đa 0,25 giây/frame, thực hiện tối đa 8 bước rồi bỏ phần quá ngân sách, hiển thị dropped time. Không chạy bù vô hạn.

## Kiểm chứng

Tests thuần không mở SDL window và không dùng assert bị tắt trong Release. Các ca kiểm bounds/brush, xung nhiệt, trường đồng đều, cosine mode với đáp án rời rạc, cấu hình sai không làm đổi state, bảo toàn, biên lạnh và lịch 15/30/120 FPS. Tolerance của phép kiểm không phải thao tác clamp dữ liệu.
