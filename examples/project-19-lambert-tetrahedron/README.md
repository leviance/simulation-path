# Project 19 — CPU Lambert Lighting

Xây một cube đặc có mặt sáng tối theo hướng đèn, không dùng GPU geometry hoặc thư viện lighting. Sản phẩm cuối dùng tám vertex, mười hai triangle, Z-buffer và near clipping; đèn orbit, mô hình và camera điều khiển riêng.

## Trước khi đọc hướng dẫn

Hãy thử dựng cube có perspective/depth đúng, rồi làm cho mặt cùng hướng đèn sáng hơn mặt nghiêng. Giữ một màu chung cho mọi mặt để phân biệt material với ánh sáng. Bật lớp normal/light vectors để kiểm hướng, tắt debug để quan sát scene sạch.

Cần kiến thức Project 10 (cross/normal), 14–15 (camera/projection), 16–18 (raster, depth, clipping). Thời gian học dự kiến: 10–13 giờ; có thể dành 4–6 giờ tự thử trước.

## Bảy checkpoint

1. Cube đặc: indexed mesh → near clip → project → raster → depth → SDL texture.
2. World-space unit normal và outward winding.
3. Directional light, preset, hai góc hướng đèn và orbit theo dt.
4. Lambert diffuse = max(0, N·L), hiển thị xám để tách công thức.
5. Material, ambient và diffuse strength; palette để đối chiếu.
6. Xoay mô hình/đổi góc nhìn riêng; culling độc lập với diffuse.
7. Chế độ trình diễn sạch, telemetry và kiểm chứng ảnh độc lập.

Starter chỉ có window, framebuffer, grid và loop an toàn. Checkpoint 1 đã vẽ cube đặc; không đợi tới cuối mới có bề mặt.

## Build và chạy

Yêu cầu C++20, CMake 3.24+, Visual Studio 2022 / GCC / Clang. CMake mặc định tải SDL **3.4.8** bằng FetchContent với SHA-256 và link SDL3::SDL3 theo [hướng dẫn CMake của SDL](https://wiki.libsdl.org/SDL3/README-cmake). Trên Linux cần các development packages cho video/audio theo tài liệu SDL.

```bash
cmake -S . -B build
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Windows/Visual Studio: chạy build/Release/project_19_final.exe. Linux/macOS với generator một cấu hình: dùng -DCMAKE_BUILD_TYPE=Release khi configure, chạy build/project_19_final.

Để build starter và tất cả checkpoint:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Target: project_19_starter, project_19_checkpoint_1 … project_19_checkpoint_7, project_19_final, project_19_tests. Không chỉ build final nếu muốn chạy CTest.

## Điều khiển bản cuối

- Kéo trái hoặc WASD/phím mũi tên: xoay đối tượng đang chọn.
- M: chọn Xoay mô hình / Đổi góc nhìn; wheel thay khoảng cách camera.
- Q/E: azimuth đèn; [ / ]: elevation.
- 1–4: đèn phía trước / trên / phải / sau.
- Space: chạy/dừng orbit đèn; dấu chấm: tiến đúng 1/60 giây.
- L: bật/tắt lighting; P: material một màu/sáu màu.
- 5/6: giảm/tăng ambient; 7/8: giảm/tăng diffuseStrength.
- N: vectors; T: chọn triangle; F: trình diễn/debug; C: culling.
- R: đặt lại mọi state; Escape: thoát.

Controls được giới thiệu theo từng checkpoint. Trong trình duyệt, Tab thoát Canvas bình thường; chọn face bằng select hoặc T, không giữ Tab.

## Source và hệ tọa độ

- geometry.hpp: cube, vector, model rotation và camera transforms.
- lighting.hpp: light, material và Lambert.
- raster.hpp: near clip, projection, top-left coverage và nội suy 1/z.
- render.hpp: vòng qua triangle và depth-test fragments.
- scene.hpp: state, drag và cập nhật thời gian.
- framebuffer.hpp / view.hpp: ảnh CPU, grid và debug arrows.
- controls.hpp / presentation.hpp / src/main.cpp: SDL input, upload, loop và cleanup.
- tests/tests.cpp: code thuần, không cần mở window hay link SDL.

Normal và surfaceToLight đều ở **world space**. View transformation chỉ dùng cho projection; direction không nhận camera translation. Directional light không suy giảm theo khoảng cách. Ký hiệu đèn trên quỹ đạo không phải point light. Không có specular, shadow hoặc color management vật lý trong project này.

## Kiểm chứng

CTest kiểm normal/winding, độ dài cạnh sau rotation, ba trường hợp diffuse 1/0/0, ambient/intensity, near half-space, camera-invariant irradiance và state input.

Reference ray/AABB độc lập đi qua từng pixel của bốn tư thế: kiểm coverage, inverse depth và RGB dự đoán từ normal mặt cube. Các phép đối chiếu đảo draw order, culling off và lighting off khóa ranh giới geometry/visibility/lighting.

`project_19_final --smoke` chạy ẩn hữu hạn tám frame, thử preset, resize và đổi debug. Luôn đặt timeout ngoài process khi dùng trong CI.

## Quy ước nguồn trong repository khóa học

Sửa source-template, tests và README; starter/checkpoints/final/CMakeLists và ZIP được generator tạo. ZIP tải về đã có đầy đủ các snapshot để build độc lập. Không đưa build, _deps, executable hoặc ZIP sinh ra vào Git.
