# Project 06 — Vector Playground

Đây là một mô phỏng 2D với hai vector A và B cùng xuất phát từ gốc tọa độ. Người dùng có thể kéo điểm cuối của từng vector và quan sát trực tiếp A+B, A−B, độ lớn, phép nhân scalar, vector đơn vị cùng điểm nội suy trên đoạn A–B.

## Yêu cầu

- C++20
- CMake 3.24+
- Kết nối mạng ở lần configure đầu để tải SDL 3.4.8

## Build bản hoàn chỉnh

```bash
cmake -S . -B build
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
```

## Build starter và sáu checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug
```

Mỗi target sử dụng một bản source độc lập: `starter/`, `checkpoints/01` đến `checkpoints/06`, hoặc `final/`. Mỗi checkpoint chỉ chứa phần code đã được hướng dẫn tới bài tương ứng, không có sẵn lời giải của các bài phía sau.

## Điều khiển

- Kéo điểm cuối màu xanh lá hoặc xanh lam bằng chuột trái để thay đổi vector A hoặc B.
- Phím ↑/↓ thay đổi hệ số nhân của vector A.
- Phím ←/→ thay đổi `t` của điểm nội suy từ A đến B.
- `1`: chỉ hiện A và B; `2`: cộng/trừ; `3`: scalar/distance; `4`: normalize/lerp.
- `0` hiển thị tất cả các lớp để đối chiếu; bản hoàn chỉnh mặc định mở chế độ `4` để hình vẽ không bị rối.
- `R` đưa A, B, scalar và `t` về giá trị ban đầu.
- `Escape` đóng chương trình.

Quy ước màu: A xanh lá, B xanh lam, A+B cam, A−B đỏ, `scalar × A` tím, `normalize(A)` trắng và điểm `lerp` vàng. Thanh tiêu đề hiển thị chế độ hiện tại cùng các số đo cần đối chiếu. Bộ tests kiểm tra phép cộng, phép trừ, nhân scalar, magnitude, distance, normalize với vector thông thường/zero vector và lerp trong cả nội suy lẫn ngoại suy.
