# Project 09 — Square Transformer

Ứng dụng SDL3 biến đổi một hình vuông từ local space sang world space bằng scale, rotation, shear và translation. Bản hoàn chỉnh ghép các phép toán bằng ma trận affine 3×3, cho phép đổi thứ tự thực hiện và dùng determinant để kiểm tra tỉ lệ diện tích cùng phép phản chiếu.

## Yêu cầu và cách build

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

```bash
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Build mặc định tạo `project_9_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm starter và sáu target `project_9_checkpoint_1` đến `project_9_checkpoint_6`.

## Điều khiển bản hoàn chỉnh

- `A` / `D`: giảm hoặc tăng `scaleX`.
- `S` / `W`: giảm hoặc tăng `scaleY`.
- `←` / `→`: xoay hình vuông mỗi lần 5°.
- `J` / `L`: giảm hoặc tăng `shearX`.
- `K` / `I`: giảm hoặc tăng `shearY`.
- Kéo chuột trái: đặt lại vị trí của vật thể trong world space.
- `O`: đổi giữa `Scale → Shear → Rotate` và `Rotate → Shear → Scale`.
- `R`: khôi phục mọi tham số ban đầu.
- `Escape`: thoát.

Đường xám là hình vuông chưa scale/rotate/shear tại vị trí hiện tại. Đường xanh lá là kết quả. Hai đường đỏ và xanh dương là vector cơ sở X/Y sau biến đổi; chấm vàng là local origin sau khi chuyển sang world space.

## Cấu trúc source

- `starter/`: cửa sổ, framebuffer, lưới và resize đã chạy được.
- `checkpoints/01..06/`: sáu chương trình độc lập, mỗi bản chỉ dùng kiến thức đã học đến bài tương ứng.
- `final/`: ứng dụng hoàn chỉnh, không chứa macro checkpoint.
- `tests/`: kiểm tra từng phép biến đổi, matrix composition, ảnh hưởng của thứ tự và mối liên hệ giữa determinant với diện tích mà không cần mở cửa sổ.
