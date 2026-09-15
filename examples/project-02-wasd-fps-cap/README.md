# Project 02 — WASD FPS Cap

Gói source cho Simulation Path Release 1.

## Yêu cầu

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

## Build bản final

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

## Build starter và checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Mỗi target dùng một source snapshot riêng: `starter/`, `checkpoints/01` … `checkpoints/06`. Snapshot chỉ chứa kiến thức đã xuất hiện đến bài đó; `final/` là bản hoàn chỉnh sạch, không có macro ẩn tính năng.

SDL phụ trách window, input và vẽ ô vuông trực tiếp bằng `SDL_RenderFillRect`. Toán vector và time-based update nằm trong `final/include/lab.hpp` để có thể test mà không cần cửa sổ.

## Điều khiển và kết quả

- `WASD`: di chuyển `SDL_FRect`; hướng chéo được normalize.
- Checkpoint 03–04: `1`/`2`/`3` chạy lại phép đo một giây với delay 33/16/8 ms; `R` lặp preset hiện tại. Checkpoint 03 cố ý update theo frame, checkpoint 04 dùng `dt` để tạo đối chứng trực tiếp.
- Checkpoint 05–06 và final: `1`/`2`/`3` chọn cap 30/60/120 FPS; `0`: uncapped; `F`: bật/tắt mức cap gần nhất.
- `R`: đưa ô vuông về vị trí đầu và đặt quãng đường tích lũy về 0.
- Title bar hiển thị FPS thực, mức cap và quãng đường đã đi.
- `Escape` hoặc nút Close: thoát.

`final/include/lab.hpp` giữ vector math và time-based update thuần C++. `tests/tests.cpp` so timeline đều/không đều, kiểm tra clamp và chuyển động chéo thông qua chính hàm `update`. Test dùng exit code thay cho `assert`, nên các điều kiện vẫn được chạy trong cả Debug và Release.
