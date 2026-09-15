# Project 10 — 3D Compass

Project này dựng một la bàn X/Y/Z và một tam giác 3D trên framebuffer SDL3. Toàn bộ phép toán `Vec3`, `cross product`, `unit normal`, diện tích, winding và kiểm tra tam giác suy biến nằm trong header thuần C++ để có thể chạy CTest mà không mở cửa sổ.

## Điều khiển bản final

- `1`, `2`, `3`: chọn đỉnh A, B hoặc C.
- `←`, `→`: thay đổi X của đỉnh đang chọn.
- `↓`, `↑`: thay đổi Y.
- `Q`, `E`: thay đổi Z.
- Kéo trực tiếp một đỉnh bằng chuột để thay đổi X/Y trong mặt phẳng sơ đồ.
- `F`: đổi chỗ B và C để đảo winding.
- `P`: chuyển giữa tam giác mặc định, tam giác vuông, thẳng hàng và gần suy biến.
- `R`: trở về trạng thái ban đầu.
- `Escape`: thoát.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target mặc định là `project_10_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_10_starter` và `project_10_checkpoint_1` đến `project_10_checkpoint_6`.
