# Project 13 — Wireframe Cube

Project này mở rộng pipeline của Project 12 từ một triangle thành một geometry có thể tái sử dụng: tám vertex, mười hai edge và một projection cache. Cube được transform, project, sắp edge theo depth rồi raster hoàn toàn trên CPU; SDL3 chỉ đưa framebuffer lên cửa sổ và cung cấp input.

## Vì sao project có năm checkpoint?

Số checkpoint đi theo nội dung, không theo một khuôn cố định:

- `checkpoint_1`: tạo và chiếu tám vertex có index;
- `checkpoint_2`: nối mười hai edge từ topology;
- `checkpoint_3`: rotate/translate toàn bộ cube;
- `checkpoint_4`: sort edge xa→gần và thêm depth cue;
- `checkpoint_5`: mouse, animation và validation hoàn chỉnh.

Mỗi checkpoint là một chương trình độc lập. Hãy bắt đầu trong `starter/`, tự làm từng bài rồi mới mở snapshot tương ứng để đối chiếu.

## Điều khiển bản final

- `←`, `→`, `↓`, `↑`: dịch model theo X/Y.
- `PageDown`, `PageUp`: dịch model theo Z.
- `W`, `S`: pitch; `A`, `D`: yaw; `Q`, `E`: roll.
- Kéo chuột: điều khiển yaw và pitch.
- `O`: đổi rotation order XYZ/ZYX.
- `C`: bật/tắt depth cue; `V`: bật/tắt vertex marker.
- `Space`: chạy/tạm dừng; `.`: single-step khi pause.
- `R`: đặt lại; `Escape`: thoát.

## Cấu trúc source

```text
project-13-wireframe-cube/
├── CMakeLists.txt
├── README.md
├── starter/
├── checkpoints/01..05/
├── final/
│   ├── include/lab.hpp   # geometry, topology, projection, rotation và validation
│   └── src/main.cpp      # SDL input, framebuffer và render loop
└── tests/tests.cpp       # CTest chạy không cần window
```

## Build

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Target mặc định là `project_13_final`. Khi bật `BUILD_CHECKPOINTS`, CMake tạo thêm `project_13_starter` và `project_13_checkpoint_1` đến `project_13_checkpoint_5`.

Lần configure đầu cần mạng để tải đúng SDL 3.4.8. Với Visual Studio generator, executable thường nằm trong `build/Debug/`; với Ninja, nó thường nằm trực tiếp trong `build/`.
