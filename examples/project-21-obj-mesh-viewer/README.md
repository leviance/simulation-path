# Project 21 — OBJ mesh viewer

Project này tự đọc Wavefront OBJ rồi render model bằng CPU pipeline: face-token parser, negative index, triangle-fan triangulation, mesh normalization, Lambert shading, near-plane clipping, top-left rasterization và Z-buffer.

Sản phẩm cuối là một ứng dụng SDL3 tương tác, không phải ảnh render sẵn. Có ba file OBJ CC0-1.0 trong `assets/`: cube (12 triangle), rocket (32 triangle) và faceted sphere (1.490 vertex / 2.976 triangle). Bắt đầu với rocket để học parser; bản cuối mở cube rồi cho phép chuyển model ngay trong cửa sổ.

## Tự xây trước khi đọc bài

Viết một viewer đọc position/index từ file, không hard-code mesh trong renderer. Dùng lại pipeline CPU đã học: model/view transform, face normal, Lambert, near clipping, projection, top-left coverage và Z-buffer. Model phải vừa khung nhưng không bị scale méo. Người dùng cần mở được ít nhất hai model, đổi giữa solid/wireframe, xem normals và orbit quanh model. Khi tắt debug, viewport vẫn phải cho thấy một model 3D có chiều sâu rõ ràng.

File lỗi phải có path, số dòng và nguyên nhân. Không clamp index hỏng để cố vẽ. Khi đang xem một model hợp lệ mà mở file lỗi, giữ model cũ và báo rõ việc nạp thất bại.

## Build final

```powershell
cmake -S . -B build
cmake --build build --config Debug
./build/Debug/project_21_final.exe
```

Windows dùng Visual Studio 2022 với workload **Desktop development with C++** và CMake từ 3.24. Trên Linux/macOS với generator single-config:

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 2
./build/project_21_final
```

Truyền một đường dẫn OBJ để mở file của bạn, ví dụ `./build/Debug/project_21_final.exe "C:/models/model.obj"`. Cũng có thể kéo file OBJ vào cửa sổ. Asset mặc định được tìm cạnh executable trước, sau đó tại `assets/` của working directory; không phụ thuộc thư mục chứa source.

## Điều khiển bản cuối

- `1`, `2`, `3`: mở cube, sphere, rocket từ file thật.
- Kéo chuột trái hoặc giữ các phím mũi tên: điều khiển đối tượng đang chọn.
- `V`: chọn **xoay model** hoặc **camera orbit**. Camera quay quanh origin; chỉ đổi góc nhìn, không sửa model transform.
- Cuộn chuột: thay khoảng cách camera, kể cả đi sát near plane để kiểm clipping.
- `W`: solid/wireframe; `N`: normals; `C`: back-face culling; `O`: đảo thứ tự triangle.
- `F`: ẩn/hiện HUD; `G`: ẩn/hiện grid và axes.
- `Space`: quay tự động/dừng; `.`: tiến đúng 1/60 giây; `R`: đặt lại góc nhìn và điều khiển (giữ model đã mở); `Esc`: thoát.

Logic viewport là 800×500, vùng HUD bên dưới 100 pixel. SDL letterbox khi resize, giữ aspect ratio và chuyển tọa độ sự kiện về cùng hệ logic. Không rasterize theo kích thước màn hình 4K. Khi tạm dừng và không có thay đổi, app không tô lại framebuffer.

## Build starter, checkpoint và tests

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug
ctest --test-dir build-all -C Debug --output-on-failure
cmake --build build-all --config Release --parallel 2
ctest --test-dir build-all -C Release --output-on-failure --timeout 30
```

SDL3 được khóa ở release 3.4.8. `starter`, tám checkpoint và `final` chạy độc lập; CTest chỉ include code thuần trong `final/include` nên không mở window.

## Học theo checkpoint

1. Đọc `v`, báo dòng lỗi và vẽ point cloud.
2. Đọc triangle `f` có position index dương, dựng indexed wireframe.
3. Giải mã slash token và negative index tại dòng face.
4. Chia polygon **phẳng, lồi** bằng triangle fan; từ chối face lõm/non-planar thay vì tô sai.
5. Tính AABB, center và uniform scale.
6. Tính normal và Lambert; dùng normals overlay để kiểm winding.
7. Ghép clipping, rasterization và depth test; kiểm toàn buffer khi đảo thứ tự.
8. Hoàn thiện chọn model, file drop, camera orbit, chế độ xem và nghiệm thu model gần 3.000 triangle.

`include/obj-parser.hpp` giữ parser; `mesh.hpp`, `normalize.hpp`, `geometry.hpp` giữ dữ liệu/toán. `shading.hpp`, `raster.hpp`, `render.hpp` là pipeline CPU. `viewer.hpp` ghép scene; `controls.hpp` và `presentation.hpp` là phần SDL. Mỗi checkpoint có source đầy đủ; `final/` không cần chép bổ sung code từ bài khác.

## Phạm vi OBJ và validation

Đọc `v x y z` và bốn dạng face token `v`, `v/vt`, `v//vn`, `v/vt/vn`. Chỉ dùng position; suffix chưa dùng vẫn được kiểm cú pháp integer khác 0. `vt`, `vn`, `o`, `g`, `s`, `mtllib`, `usemtl` được nhận diện và đếm là metadata chưa dùng, không tải MTL/texture hay dùng normal trong file. Keyword khác bị báo lỗi theo dòng. Parser chỉ nhận position đã xuất hiện trước face.

Giới hạn có thông báo: 8 MiB/file, 16 KiB/dòng, 200.000 position, 400.000 triangle, 128 corner/face, tọa độ trong ±1e6. Dừng thu lỗi sau 64 diagnostic. Không hỗ trợ vertex weight/color, line/curve/surface, polygon lõm hoặc face không phẳng; hãy export triangulated OBJ khi cần.

CTest kiểm parser, geometry, ba asset thật, đổi model có giao dịch, camera/model độc lập, pause/step, normals/wireframe thay đổi pixel thật và order independence. Đối chứng ray–triangle trong `tests/reference.hpp` so depth ở từng pixel với rasterizer, cả khi model cắt near plane; không gọi lại công thức nội suy của rasterizer để tự xác nhận nó. Tests in thời gian render model 2.976 triangle ở 800×500; đây là phép đo trên máy đang chạy, không phải cam kết FPS cho mọi máy.

`--smoke` chạy tối đa tám frame rồi thoát, không dùng thay cho kiểm thử tương tác trực tiếp. Muốn build một mốc: `cmake --build build-all --config Debug --target project_21_checkpoint_4`.
