# Project 29 — Visible Quadtree

Project này giữ particle cloud và brute-force oracle của Project 27, nhưng thay fixed cells của Project 28 bằng một Quadtree tự chia theo mật độ. Bạn kéo một selection rectangle trên world để xem node nào được thăm, subtree nào bị loại và bao nhiêu particle thật sự phải qua exact test.

## Sản phẩm cuối

- 100.000 particles với hai distribution deterministic: `clustered` và `uniform`.
- Quadtree lưu node trong một `std::vector`, mỗi internal node giữ bốn child indices và không giữ particle.
- Split theo `leafCapacity`, có `maximumDepth` và `minimumNodeSize` để chặn recursion vô hạn.
- Selection query dùng node AABB overlap để prune, sau đó dùng point-in-box test trong leaf.
- Brute-force oracle, topology validation, checksum benchmark và capacity study.
- Renderer lấy mẫu tối đa khoảng 12.000 leaf outlines và 35.000 points để cửa sổ phản hồi tốt; tree, query và tests vẫn xử lý toàn bộ topology cùng 100.000 particles.

## Điều khiển

- Kéo chuột trái: tạo selection rectangle theo bất kỳ hướng nào.
- `Space`: chạy hoặc dừng selection tự động.
- `D`: đổi `clustered`/`uniform` rồi rebuild tree.
- `C`: chuyển `leafCapacity` qua 4, 8, 16 và 32.
- `B`: benchmark Quadtree và brute force trên cùng workload.
- `S`: chạy capacity study; các cột phía dưới biểu diễn candidate work.
- `R`: reset selection, distribution, capacity và các phép đo.
- `Esc`: thoát.

## Build final

```bash
cmake -S . -B build
cmake --build build --config Debug
```

Chạy `build/Debug/project_29_final.exe` trên Visual Studio generator. Với generator một cấu hình, executable thường nằm trực tiếp trong `build`.

## Build starter và checkpoint

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_29_starter
cmake --build build --config Debug --target project_29_checkpoint_1
cmake --build build --config Debug --target project_29_checkpoint_8
```

Mỗi checkpoint là một snapshot độc lập. Source trong tài liệu được lấy từ đúng snapshot tương ứng.

## Chạy validation không cần SDL window

```bash
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

CTest kiểm split-line policy, storage đúng một leaf, internal node rỗng, capacity guard, exact rectangle hits, oracle agreement, checksum, candidate reduction và capacity trade-off. Timing chỉ cần hữu hạn; test không áp một ngưỡng phụ thuộc máy.

## Cấu trúc thư mục

```text
project-29-visible-quadtree/
├── CMakeLists.txt
├── README.md
├── starter/
├── checkpoints/01 ... 08/
├── final/
├── source-template/
│   ├── include/lab.hpp
│   └── src/main.cpp
└── tests/tests.cpp
```

`source-template` là nguồn chuẩn để sinh starter, checkpoint và final. Hãy sửa template thay vì chỉnh trực tiếp file đã sinh.
