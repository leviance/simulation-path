# Project 39 — GPU Reduction & Prefix Sum

Project này xây một workbench C++20/SDL3/OpenGL 4.3 để cộng `1.000.003` số bằng hierarchical reduction và tạo exclusive prefix sum bằng Blelloch scan. Source cố ý giữ partial sums, block sums và offsets trên GPU qua toàn bộ pass graph; CPU chỉ đọc scalar/output cuối để hiển thị và validation.

## Bạn sẽ học gì?

- 256 invocation hợp tác trên 512 giá trị qua `shared` memory và `barrier()`.
- Hierarchical reduction biến `1.000.003 → 1.954 → 4 → 1`.
- Blelloch upsweep/downsweep tạo exclusive prefix trong từng block.
- Recursive block-sum scan và uniform-add tạo global prefix sum.
- `GL_SHADER_STORAGE_BARRIER_BIT` nối compute pass; `GL_BUFFER_UPDATE_BARRIER_BIT` chuẩn bị readback.
- CPU oracle, named invariants và timer-query ring không block.

## Cấu trúc gói source

- `starter/`: cửa sổ OpenGL và CPU contract ban đầu.
- `checkpoints/01` … `checkpoints/10`: trạng thái source sau từng bài.
- `final/`: Reduction & Scan Workbench hoàn chỉnh.
- `tests/tests.cpp`: CTest thuần CPU, không tạo window và không chạy benchmark.
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

Nếu đã có SDL `3.4.8` đúng phiên bản trong môi trường CI:

```bash
cmake -S . -B build -DCOURSE_USE_INSTALLED_SDL3=ON
```

## Controls của final

- `Tab`: đổi Reduction / Exclusive Scan.
- `1`–`4`: chọn 8, 257, 65.537 hoặc 1.000.003 phần tử.
- `S`: tăng seed và sinh workload mới.
- `R`: khôi phục seed 39 với count hiện tại.
- `V`: chạy lại operation và in validation report.
- `B`: gửi đúng chín sample benchmark; vòng lặp luôn hữu hạn.
- `Esc`: thoát.

## Ghi chú về kết quả float

GPU cộng theo cây, còn CPU oracle tích lũy tuần tự bằng `double`. Hai thứ tự không bắt buộc khớp bit cuối. Validation vì vậy kiểm finite, size, `output[0]`, adjacent delta, total consistency và mixed absolute/relative tolerance thay vì dùng `==` cho output lớn.
