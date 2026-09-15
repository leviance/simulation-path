# Project 12 — Rotating Triangle

Project này nối ba vertex đã qua perspective thành một tam giác wireframe, tách local/world space rồi tự cài đặt rotation quanh X/Y/Z bằng `sin` và `cos`. Bản final hỗ trợ pitch, yaw, roll, hai rotation order, mouse drag, animation và các phép kiểm tra hình học mà không dùng matrix hoặc OpenGL.

## Nên bắt đầu ở đâu?

Nếu muốn tự giải thử thách, hãy mở `starter/` và chỉ đối chiếu `checkpoints/` sau khi đã tự viết. Mỗi checkpoint là một chương trình độc lập ở đúng cuối một bài:

- `checkpoint_1`: chiếu và nối ba vertex thành wireframe triangle;
- `checkpoint_2`: tách pivot, local triangle và model position;
- `checkpoint_3`: rotation quanh X;
- `checkpoint_4`: pitch/yaw/roll cùng hai rotation order;
- `checkpoint_5`: mouse drag và capture;
- `checkpoint_6`: animation, inverse và validation.

`final/` là toàn bộ chương trình hoàn chỉnh. `tests/` chỉ include `final/include/lab.hpp`, vì vậy các phép toán được kiểm tra mà không cần mở SDL window.

## Cấu trúc source

```text
project-12-rotating-triangle/
├── CMakeLists.txt
├── README.md
├── starter/
├── checkpoints/01..06/
├── final/
│   ├── include/lab.hpp   # Vec3, projection, rotation và validation thuần C++
│   └── src/main.cpp      # SDL window, input, framebuffer và render loop
└── tests/tests.cpp       # CTest cho pivot, rotation order và invariant
```

## Điều khiển bản final

- `←`, `→`, `↓`, `↑`: dịch model theo X/Y.
- `PageDown`, `PageUp`: dịch model theo Z.
- `W`, `S`: thay đổi pitch; `A`, `D`: thay đổi yaw; `Q`, `E`: thay đổi roll.
- Kéo chuột: điều khiển yaw và pitch bằng mouse delta.
- `O`: đổi rotation order giữa XYZ và ZYX.
- `Space`: chạy hoặc tạm dừng auto rotation; `.`: tiến một bước khi pause.
- `R`: trở về orientation, position và order ban đầu; `Escape`: thoát.

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target mặc định là `project_12_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_12_starter` và `project_12_checkpoint_1` đến `project_12_checkpoint_6`.

Muốn build riêng bài đang học, hãy thêm target, chẳng hạn:

```bash
cmake --build build --config Debug --target project_12_checkpoint_3
```

Với Visual Studio generator, executable thường nằm trong `build/Debug/`. Với generator một cấu hình như Ninja, executable nằm trực tiếp trong `build/`.

Lần configure đầu tiên cần mạng để CMake tải đúng SDL 3.4.8. Những lần build sau dùng source đã có trong thư mục `build/_deps`; không xóa `build/` nếu bạn không muốn tải lại.
