# Project 31 — Barnes–Hut N-body

Project này xây một thiên hà N-body 3D từ hai implementation có thể đối chiếu: direct summation `O(N²)` và Barnes–Hut dùng Mass Octree. Mỗi node Octree giữ tổng khối lượng cùng tâm khối lượng; một node đủ xa có thể thay cho cả subtree trong phép tính lực.

## Điều khiển bản final

- Kéo chuột trái: xoay orbit camera; cuộn chuột: zoom.
- `Space`: chạy hoặc dừng mô phỏng.
- `[` / `]`: giảm hoặc tăng opening angle `theta`.
- `-` / `=`: giảm hoặc tăng gravitational softening.
- `,` / `.`: chọn body cần theo dõi.
- `T`: chạy theta accuracy sweep và in bảng ra terminal.
- `B`: chạy scaling study 256–2.048 bodies và in thời gian lẫn work count.
- `R`: đưa scene về deterministic preset; `Esc`: thoát.

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

SDL được khóa tại `3.4.8` bằng `FetchContent`. Target mặc định là `project_31_final`; bật `BUILD_CHECKPOINTS` để build starter và mười checkpoint độc lập.

## Cấu trúc gói source

- `starter/`: thiên hà deterministic có orbit camera, chưa tính lực.
- `checkpoints/01..10/`: snapshot độc lập tương ứng từng bài học.
- `final/`: source hoàn chỉnh, giống checkpoint 10.
- `tests/tests.cpp`: CTest cho softening, direct oracle, fixed step, aggregate tree, self-force, theta accuracy, scaling và diagnostics; không mở window.
- `source-template/`: nguồn chuẩn dùng để sinh lại starter/checkpoint/final.

Đừng đánh giá Barnes–Hut chỉ bằng FPS. Hãy đọc song song mean/max force error, số aggregate sources, số exact pairs, topology report và direct `N×(N-1)` baseline.
