# Project 52 — Bắn tia vào hình học

Tự xây công cụ chọn điểm chạm plane, sphere, AABB và triangle bằng C++20/SDL3. Nhìn thấy cảnh trước, tạo ray từ chuột, thêm từng phép giao rồi ghép nearest hit. Dự kiến 10–13 giờ; thử challenge 90–120 phút trước khi đọc lời giải.

## Lộ trình 8 bài

1. SDL window/renderer, camera perspective và cảnh khung dây.
2. Input → logical coordinates → camera ray; round-trip với projection.
3. Plane, Hit, ray range, parallel/coplanar và geometric normal.
4. Sphere quadratic, hai nghiệm, tangent, inside và nonunit direction.
5. AABB, ba slab, interval và surface hit khác volume overlap.
6. Triangle hai phía, Möller–Trumbore, barycentric và suy biến.
7. Nearest hit độc lập thứ tự, preset inside/miss, scan/pause và inspector.
8. CTest Debug/Release, residual, source hoàn chỉnh và nghiệm thu.

Prerequisites: Project 01–06,10–15; Project 16–17 giúp đọc barycentric và che khuất. Project 36 giúp so với ray marching nhưng không bắt buộc GPU. ZIP chạy độc lập; không cần website hoặc build project trước.

## Build và run

C++20, CMake 3.24+, SDL 3.4.8 khóa checksum bằng FetchContent; link SDL3::SDL3. Không yêu cầu OpenGL compute. Windows dùng Visual Studio 2022 Desktop development with C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_52_final.exe. Target final mặc định; BUILD_CHECKPOINTS bật starter và project_52_checkpoint_1…8. Generator single-config dùng build directory riêng, đặt CMAKE_BUILD_TYPE rồi chạy executable trực tiếp trong build directory.

CTest chỉ chạy toán, không mở window. Check không dựa vào assert nên Release vẫn thực sự kiểm. Không benchmark hoặc GPU workload trong tests; khi tự viết automation, đặt hard timeout ngoài process và dọn process tree.

## Điều khiển

- Rê chuột/mũi tên ngắm ray; R reset, Esc thoát từ Bài 02.
- Phím 1 cảnh thường, 2 trong sphere, 3 trong box, 4 nhìn ra ngoài cảnh từ Bài 07.
- Space quét/dừng; +/- tMax trong [0.1,30]; I in ứng viên với ID/t/point/normal/frontFace/barycentric.
- Blur/minimize dừng quét. Mouse input dừng scan. Mũi tên vẫn hoạt động khi paused.
- V từ Bài 08: dừng quét, kiểm các hit hiện tại bằng phương trình bề mặt, normal và range; console ghi checks/failures. Kết quả này không chứng minh query đã tìm đủ hit, nên không thay thế CTest với ca nghiệm biết trước.

Title có direction/range/t của từng hit; nearest xanh lá, các hit khác xám. Khung dây không depth test. Ô XZ giúp nhìn tia vì ray của camera chiếu thành một pixel trong view chính. Plane toán là vô hạn dù lưới chỉ vẽ một vùng nhỏ.

SDL logical presentation 900×640 letterbox; event được ConvertEventToRenderCoordinates trước khi lấy u/v. Bỏ input ngoài content. Canvas trên website dùng aspect của vùng CSS, backing bitmap theo DPR và cùng công thức; không chạy C++/GPU.

## Quy ước và phạm vi

World y lên, z xa camera ban đầu. Camera (0,1.5,−7) nhìn (0,0.3,0), vertical FOV 55°. Ray tMin=1e−6,tMax=30; camera ray unit, hàm giao vẫn giữ hệ số a cho nonunit direction. t là distance chỉ khi direction unit.

Hit normal giữ hướng hình học, frontFace=(dot(direction,normal)<0). Inside sphere/box lấy exit. Box interval không cắt range trước khi chọn mặt: đoạn nằm trọn trong volume có thể không có surface hit. Tie t chính xác chọn ID nhỏ hơn; normal box tại cạnh/góc chọn trục x→y→z đại diện.

Plane gần song song/coplanar miss. Triangle hai phía, miền barycentric đóng, ngưỡng tương đối 1e−10; không bảo đảm watertight mesh hoặc tọa độ cực lớn. Sphere dùng q/c để giảm triệt tiêu, không kẹp discriminant âm. AABB không xoay; không transformed-ray API, reflection, shadow, texture hay rendering từng pixel.

Kiểm desktop riêng: resize/DPI/letterbox, ngắm chuột/bàn phím, inside/miss, scan/pause/blur/reset. CTest không chứng minh các hành vi UI này.

## Nguồn chuẩn

source-template và tests là authored inputs; starter/checkpoints/final/CMake được sinh bằng npm run generate:course từ repository website, không sửa trực tiếp và không commit output. ZIP chứa snapshot đầy đủ, dùng được mà không cần generator.

Tham khảo: [SDL input conversion](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates), [PBRT bounds](https://www.pbr-book.org/4ed/Shapes/Basic_Shape_Interface), [PBRT sphere](https://www.pbr-book.org/4ed/Shapes/Spheres), [Möller–Trumbore paper](https://my.eng.utah.edu/~cs6965/papers/MT97.pdf).

Tiếp theo: Project 53 — cắt lát volume 3D, hiện Sắp ra mắt.
