# Project 66 — Cây giao diện của bàn quan sát Boids

Đàn chim và năm control vẫn như P65. Điều mới là **ai sở hữu các control**. Dịch một Panel cha: Pause, Reset, Neighbors và các slider theo nó cùng lúc. Xóa cả nhóm trong lúc kéo rồi thả chuột: chương trình vẫn phải an toàn và đàn không bị khởi tạo lại.

## Chạy chương trình

Giải nén ZIP và mở terminal cạnh `CMakeLists.txt`. Cần C++20, SDL3 3.4.8, CMake 3.24+. ZIP chứa sẵn mô hình của P28 và session của P65.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_66_final.exe
```

Single-config: đặt `-DCMAKE_BUILD_TYPE=Release` lúc cấu hình, bỏ `Release/` trong đường dẫn executable. Kiểm thêm Debug với `-C Debug` sau khi build đúng cấu hình.

## Thử ngay

- Pause/Resume, Reset, Neighbors, Radius, Separation: điều khiển thật cùng đàn chim. Bấm vào viewport để chọn cá thể. N tiến đúng một bước khi Pause.
- F2: xem hoặc ẩn ID, local, world và clip của node đang hover/focus; nếu chưa chọn thì xem Pause. Shift+mũi tên: dịch cả Panel.
- P: lần lượt cây thường, Panel bị cắt, hai nút chồng, Panel lệch vị trí. H/E ẩn hoặc disable nhóm. D xóa cả nhánh, A thêm Label, T khôi phục cây.
- Thử giữ một slider, bấm H rồi thả chuột. Không hành động nào được phát tới slider cũ. Reset đàn không phải T: root, ID và cây vẫn giữ nguyên.

## Tám checkpoint

01 quyền sở hữu và ID; 02 duyệt cha–con; 03 clip; 04 chọn node trên cùng; 05 input và binding; 06 focus theo cây; 07 mutation; 08 audit. Mỗi mốc và starter chạy độc lập. Trong các bài đầu, không phải tất cả phím của bản final đã hoạt động.

CTest đối chiếu bounds/clip với tọa độ tính tay, kiểm ẩn/xóa khi đang kéo, giới hạn 32 node và 6 cấp, ID không tái sử dụng và 1.000 frame không thay cây. Ảnh trên web được lấy từ framebuffer của đúng executable; chúng không thay cho việc tự kéo thử control.
