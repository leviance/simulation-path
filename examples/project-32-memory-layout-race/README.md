# Project 32 — Memory Layout Race: AoS và SoA

Project này giữ nguyên một triệu particle và thay cách sắp xếp sáu field `position/velocity` trong bộ nhớ. Bản AoS dùng `std::vector<ParticleAoS>`; bản SoA dùng sáu `std::vector<float>`. Hai phía chạy cùng công thức, được đối chiếu field-by-field rồi mới đo thời gian.

## Điều khiển bản final

- `Space`: chạy hoặc dừng particle animation.
- `N`: tiến đúng một bước tích phân.
- `L`: đổi hình đang quan sát giữa AoS và SoA.
- `W`: đổi workload giữa đọc `position.x`, sửa ba velocity và tích phân đủ sáu field.
- `B`: benchmark AoS/SoA trên một triệu particle.
- `S`: chạy scaling study 10.000, 100.000 và 1.000.000 particle rồi in bảng ra terminal.
- `R`: tạo lại state từ seed ban đầu; `Esc`: thoát.

## Build

```bash title="Configure Debug"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
```

```bash title="Build Debug"
cmake --build build --config Debug
```

```bash title="Run tests"
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

SDL được khóa tại `3.4.8` bằng `FetchContent`. Target mặc định là `project_32_final`; bật `BUILD_CHECKPOINTS` để build starter và tám checkpoint độc lập.

## Cấu trúc gói source

- `starter/`: cửa sổ và sơ đồ memory cells, chưa có particle state.
- `checkpoints/01..08/`: snapshot độc lập tương ứng từng bài học.
- `final/`: source hoàn chỉnh, giống checkpoint 08.
- `tests/tests.cpp`: CTest cho deterministic data, wrapping, conversion, kernel agreement, cache-line model và benchmark hữu hạn; không mở window.
- `source-template/`: nguồn chuẩn dùng để sinh lại starter/checkpoint/final.

Không có layout thắng trong mọi trường hợp. Hãy đọc timing cạnh workload, useful bytes, cache lines, checksum và maximum difference; nếu output khác nhau thì cuộc đua chưa công bằng.
