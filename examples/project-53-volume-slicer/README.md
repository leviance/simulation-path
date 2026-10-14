# Project 53 — Máy cắt lát khối 3D

Tự xây viewer scalar 3D tổng hợp bằng C++20/SDL3: thấy lát cắt trước, rồi lưu voxel, đọc ba hướng, chỉnh tương phản và nội suy. Dự kiến 9–12 giờ; thử challenge 90–120 phút trước khi đọc lời giải.

## Lộ trình 7 bài

1. Phantom analytic → RGBA → streaming texture và lát đầu tiên.
2. Volume 64×48×40, x-fast row-major, voxel centre và nearest.
3. XY/XZ/YZ, trục giữ cố định và physical aspect.
4. Window/level sau sampling, không sửa raw scalar.
5. Trilinear tám mẫu, fractional cut và boundary policy.
6. Ba view qua cùng world point, crosshair/input/scan/pause.
7. Phím V audit nhỏ, affine oracle và CTest Debug/Release.

Prerequisites: Project 01–06,09,20,48; Project 52 giúp phân biệt thể tích và bề mặt. Không cần GPU/OpenGL hoặc dataset y khoa. Đây là phantom phục vụ học tập, không CT/Hounsfield Units và không dùng cho chẩn đoán.

## Build/run

C++20, CMake 3.24+, SDL 3.4.8 khóa checksum bằng FetchContent, link SDL3::SDL3. Windows dùng Visual Studio 2022 Desktop development with C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_53_final.exe. Single-config generator dùng build directory riêng với CMAKE_BUILD_TYPE; executable nằm trực tiếp trong build directory. Final mặc định; BUILD_CHECKPOINTS bật starter và project_53_checkpoint_1…7. ZIP chạy độc lập, không cần website/generator/project trước.

CTest không window, GPU hoặc benchmark. Checks không dùng assert nên Release vẫn kiểm thực sự. Automation bên ngoài cần hard timeout hữu hạn và process-tree cleanup.

## Điều khiển

- PageUp/Down dời cut một voxel từ Bài 02, 0.1 voxel từ Bài 05; clamp vào centre đầu/cuối.
- P phantom/ramp từ Bài 02. Phím 1/2/3 chọn XY/XZ/YZ từ Bài 03.
- W/S level, A/D width từ Bài 04; I in world point và sampled scalar, không phải byte màu.
- L nearest/trilinear từ Bài 05; SDL texture filter vẫn nearest.
- Click/kéo ảnh, mũi tên dời cursor trong active plane từ Bài 06; Space quét/dừng.
- Scan 4 voxel/s, dt≤0.1; tới centre cuối dừng. Blur/minimize và R hủy drag/capture, không tự resume.
- V từ Bài 07 audit min/max và 16 point affine interior; không thay state. R reset, Esc thoát.

Title ghi active view, world cursor, level/width và sampler. Active border/crosshair xanh. C++ logic 900×660 letterbox, texture 128×128/view; Canvas CPU 96×96/view có readout chi tiết, pointer capture, keyboard, DPR và reduced motion. Tối đa ba lát nhỏ, không ray marching toàn framebuffer.

## Dữ liệu và quy ước

Count (64,48,40), spacing (0.05,0.08,0.12) world units; 122.880 double cần 960 KiB. Lower=−count*spacing/2, centre i=lower+(i+0.5)*spacing. Index=x+nx*(y+ny*z). Dimensions giới hạn 1..128 mỗi trục; spacing dương hữu hạn.

Phantom gồm ba Gaussian bất đối xứng clamp [0,1]. Ramp=(x+2y+4z)/(nx−1+2(ny−1)+4(nz−1)), singleton trả 0. X-fast là storage, không bắt mọi view quét theo x/y. XY x phải/y lên/giữ z; XZ x phải/z lên/giữ y; YZ y phải/z lên/giữ x. Không radiology orientation.

Aspect từ count*spacing, không count alone. Input SDL chuyển sang render coordinates rồi xét fitted image, bỏ letterbox. Một Point world giữ ba crosshair, pick chỉ đổi hai trục trong plane.

Nearest floor(g+0.5), g=(world−lower)/spacing−0.5. Trilinear lấy tám centre, replicate nửa voxel sát edge sau inside check; outside box miss. Affine oracle chỉ đúng interior centre, không ở replicated boundary. Nội suy không phục hồi chi tiết đã voxel hóa mất.

Window/level brightness=clamp((value−(level−width/2))/width,0,1), quantize sau sampling. Dataset không đổi khi chỉnh window; RGBA32 ghi byte R/G/B/A, lock/unlock theo pitch thật. Dirty tránh tính và upload ảnh đứng yên.

Không DICOM/VTK loader, physical density calibration, oblique slice, MIP, CT reconstruction hoặc ray integration. CTest không chứng nhận hành vi desktop: kiểm riêng mouse/keyboard/resize/DPI/letterbox/pause/reset trên máy chạy.

## Source chuẩn và tài liệu

source-template, tests và README là authored inputs. Starter/checkpoints/final/CMake và ZIP được sinh bởi npm run generate:course/predev trong repository website, không commit generated output hoặc sửa snapshot trực tiếp. ZIP đã chứa mọi snapshot để build độc lập.

Tham khảo [SDL_LockTexture](https://wiki.libsdl.org/SDL3/SDL_LockTexture), [SDL_RenderTexture](https://wiki.libsdl.org/SDL3/SDL_RenderTexture), [SDL input conversion](https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates).

Tiếp theo: Project 54 — Volume Ray Marching, hiện Sắp ra mắt.
