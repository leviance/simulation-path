# Project 40 — GPU Spatial Grid & Neighbor Query

Project này xây một workbench C++20/SDL3/OpenGL 4.3 để phân tối đa `1.000.003` particles vào uniform grid và tìm hàng xóm song song. Grid dùng layout kiểu CSR: `cellCounts` được exclusive scan thành `cellOffsets`, còn atomic scatter ghi particle indices vào các đoạn liên tiếp. CPU không dựng bucket thay GPU và không đọc intermediate buffers giữa pipeline.

## Bạn sẽ học gì?

- Ánh xạ world position sang row-major cell ID giống nhau trên CPU và GLSL.
- Dùng `atomicAdd` để đếm occupancy mà không làm mất increment.
- Dùng exclusive scan để biến counts thành CSR offsets.
- Copy offsets thành cursors và scatter mỗi particle vào đúng một slot.
- Duyệt candidate cell range tổng quát rồi lọc bằng distance squared.
- Giữ nearest neighbor deterministic dù atomic scatter không giữ thứ tự.
- Kiểm structural invariants trước khi so CPU brute-force oracle.
- Nối compute passes bằng barrier cụ thể và đo bằng query ring không block.

## Cấu trúc gói source

- `starter/`: cửa sổ OpenGL và các data type tối thiểu.
- `checkpoints/01` … `checkpoints/09`: trạng thái source sau từng bài.
- `final/`: GPU Grid Workbench hoàn chỉnh.
- `tests/tests.cpp`: CTest thuần CPU, không tạo window và không benchmark.
- `source-template/`: nguồn chuẩn dùng để sinh starter/checkpoints/final.

## Build bản hoàn chỉnh

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

Release dùng cùng contract:

```bash
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

Nếu CI đã cung cấp đúng SDL `3.4.8`:

```bash
cmake -S . -B build -DCOURSE_USE_INSTALLED_SDL3=ON
```

## Controls của final

- `1`–`4`: chọn 1.024, 65.537, 262.147 hoặc 1.000.003 particles.
- `[` / `]`: giảm/tăng `cellSize` qua 4, 8, 16 và 32.
- `-` / `=`: giảm/tăng neighbor radius.
- `S`: tăng seed và tạo workload deterministic mới.
- `R`: khôi phục cell size 8, radius 6 và seed 40.
- `V`: chạy lại pipeline và in validation report.
- `B`: gửi đúng chín benchmark samples; vòng lặp luôn hữu hạn.
- `Esc`: thoát.

## Đọc kết quả đúng cách

`sortedIndices` không được hứa có thứ tự tăng dần trong từng cell vì thứ tự hoàn tất của atomic operations không xác định. Validation kiểm membership/permutation và neighbor summary, không đòi một thứ tự tình cờ. `GPU ms` chỉ bao quanh compute pass graph; upload, readback và CPU oracle nằm ngoài timer query.
