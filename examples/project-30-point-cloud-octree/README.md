# Project 30 — Point Cloud Octree

Project này tổ chức 100.000 điểm 3D bằng Octree, truy vấn một AABB thể tích và đối chiếu kết quả với brute force. Cửa sổ SDL3 vẫn render hoàn toàn trên CPU; phép chiếu 3D chỉ giúp ta quan sát cấu trúc, không tham gia quyết định điểm nào thuộc query.

## Điều khiển bản final

- Kéo chuột trái: xoay orbit camera.
- Cuộn chuột: đổi khoảng cách camera.
- `W/S`, `A/D`, `Q/E`: di chuyển query volume theo Y, X, Z.
- `[` / `]`: thu nhỏ hoặc phóng to query volume.
- `Space`: chạy hoặc dừng query tự động.
- `G`: đổi clustered/uniform distribution.
- `C`: đổi leaf capacity 8, 16, 32, 64.
- `B`: benchmark Octree và brute force trên cùng workload.
- `T`: chạy capacity study.
- `R`: đưa mọi tham số về preset ban đầu; `Esc`: thoát.

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

SDL được khóa tại `3.4.8` bằng `FetchContent`. Target mặc định là `project_30_final`; bật `BUILD_CHECKPOINTS` để build starter và chín checkpoint độc lập.

## Cấu trúc gói source

- `starter/`: point cloud 3D, orbit projection và brute-force volume query có thể chạy ngay.
- `checkpoints/01..09/`: snapshot độc lập tương ứng từng bài học.
- `final/`: source hoàn chỉnh, giống checkpoint 09.
- `tests/tests.cpp`: CTest cho AABB, octant policy, topology, oracle, benchmark và projection; không mở window.
- `source-template/`: nguồn chuẩn dùng để sinh lại starter/checkpoint/final.

Phần đo thời gian luôn tách `rebuild` khỏi `query`. Hãy đọc `visitedNodes`, `candidatesChecked` và checksum trước khi kết luận từ số microsecond trên một máy cụ thể.
