# Project 20 — Dán bàn cờ lên mặt phẳng nghiêng

Tự viết CPU texture mapper bằng C++20 và SDL 3.4.8. Một quad 3D có thể xoay được tô bằng checkerboard tự sinh. Giữ hai cách nội suy cạnh nhau để thấy affine méo ở góc nghiêng lớn, rồi sửa bằng perspective-correct interpolation.

Mục tiêu không phải tải một ảnh lên GPU rồi để API vẽ hộ. Bạn tự đi hết đường từ vertex có UV, near clipping, projection, pixel coverage đến nearest sampling và framebuffer.

## Trước khi đọc lời giải

Thử tự làm một quad rộng 3.2, cao 2; hai triangle dùng chung bốn vertex. Gắn UV vào bốn góc, xoay cả mặt phẳng và dán bàn cờ 64 × 64. Cần có:

- Affine/corrected A/B dùng cùng geometry, texture, coverage và sampler.
- Nghiêng đủ mạnh để nhận ra distortion; thay tư thế không làm đổi kích thước quad.
- Clip qua z=1 và giữ UV ở giao điểm.
- Showcase sạch và debug đọc được số liệu pixel.
- Cách kiểm độc lập, không chỉ tự so hai bản sao của cùng công thức.

Nếu chưa làm được, học từng bản chạy được bên dưới. Kiến thức cần trước: phép quay và perspective (12–15), top-left rasterizer/barycentric (16), near clipping (18). Lighting ở 19 là bối cảnh trước đó, không bắt buộc dùng vào sampler này.

## Tám bước học

| Bản        | Việc thêm vào                                    | Kết quả có thể kiểm                             |
| ---------- | ------------------------------------------------ | ----------------------------------------------- |
| starter    | Window, framebuffer, event loop                  | Nền tối, thoát/reset/resize an toàn             |
| 01         | Quad có UV, phép quay và projection              | Wireframe có thể xoay, chiều dài cạnh không đổi |
| 02         | Checker texture và nearest clamp/repeat          | Preview và texel marker; thử UV âm/UV=1         |
| 03         | Affine UV trong callback raster                  | Bàn cờ được tô nhưng méo khi nghiêng            |
| 04         | Inspector và reference ray–plane                 | Đo sai số UV tại đúng tâm pixel                 |
| 05         | 1/z, u/z, v/z tại vertex                         | Đọc denominator; ảnh vẫn là affine              |
| 06         | Chia lại UV, A/B và compare                      | Corrected khớp ray, không lệ thuộc diagonal     |
| 07         | Clip position và UV trước projection             | Qua near plane không mất phần còn thấy được     |
| 08 / final | Showcase/debug, thời gian, lifecycle, nghiệm thu | Ứng dụng hoàn chỉnh và tests cả ảnh             |

## Build và chạy

Cần compiler hỗ trợ C++20 và CMake ≥3.24. Trên Windows dùng Visual Studio 2022 với workload Desktop development with C++. Lần configure đầu cần mạng để FetchContent tải đúng SDL 3.4.8; CMake khóa cả version lẫn SHA-256 và link bằng `SDL3::SDL3`.

```bash
cmake -S . -B build
cmake --build build --config Release --parallel 2
# Windows / Visual Studio
.\build\Release\project_20_final.exe
# Linux/macOS với generator một cấu hình
./build/project_20_final
```

Với Ninja/Makefiles, thêm `-DCMAKE_BUILD_TYPE=Release` vào configure. Trong repository khóa học, CMake/snapshot được sinh từ `source-template`; ZIP tải về đã chứa mọi bản và không cần script của website.

Để học từng bài:

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_20_starter project_20_checkpoint_1 --parallel 2
.\build\Debug\project_20_checkpoint_1.exe
```

Đổi hậu tố target từ 1 tới 8. Final là target ứng dụng mặc định; không cần bật BUILD_CHECKPOINTS khi chỉ muốn chạy sản phẩm cuối.

## Điều khiển

- Kéo chuột trái hoặc giữ WASD/phím mũi tên: quay quad quanh tâm, không thay hình dạng local.
- Wheel: đổi khoảng cách; resize dùng khung logic 960 × 640 có letterbox, input được convert về khung logic.
- 1/2/3: chính diện/nghiêng vừa/nghiêng mạnh; từ bài 7 có thêm 4 qua near plane.
- T: clamp/repeat, từ bài 2. J/L đổi U, I/K đổi V trong sampler preview bài 2.
- Từ bài 4: click ngắn chọn pixel. Ở compare, hai panel dùng cùng vị trí tương đối; bảng cuối đọc texel của panel phải.
- Từ bài 6: M đổi affine/corrected và về xem một ảnh; C bật/tắt compare.
- Final: F bật/tắt debug, Space chạy/dừng xoay, dấu chấm tiến 1/60 giây, R reset, Escape thoát.

Final mặc định pause, compare và tắt debug. Khi debug tắt, grid và nhãn A/B vẫn hiện. Clamp/repeat không tạo khác biệt đáng kể trong lòng quad có UV 0..1; dùng preview bài 2 để thử addressing ở ngoài miền.

## Code nằm ở đâu?

- `geometry.hpp`: kiểu dữ liệu, quad, rotation và projection.
- `sampler.hpp`: ảnh nguồn và nearest sampling.
- `raster.hpp`, `interpolation.hpp`: coverage, weights, affine/corrected UV.
- `clip.hpp`: near clipping của vertex có thuộc tính.
- `reference.hpp`: ray–plane độc lập dành riêng cho quad này.
- `scene.hpp`: state, preset, drag và thời gian.
- `framebuffer.hpp`, `render.hpp`: vẽ CPU và nối pipeline.
- `controls.hpp`, `presentation.hpp`, `src/main.cpp`: input và tài nguyên SDL.
- `tests/tests.cpp`: test thuần, không cần SDL window.

## Kiểm chứng

```bash
cmake -S . -B build -DBUILD_TESTING=ON -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Tests kiểm sampling ở biên/UV âm, malformed input, rigid edge lengths, near intersections, denominator, pause/step và ảnh của bốn preset. Reference tìm giao ray với mặt phẳng local, đối chiếu coverage, UV tới 10⁻⁹ và màu checker. Đổi diagonal hoặc winding không được thay corrected UV. Màu ngay trên ranh giới ô có tolerance riêng cho rounding; coverage/UV vẫn được kiểm.

`project_20_final --smoke` mở window ẩn, đổi preset, resize và tự thoát sau tám frame. Smoke hữu hạn giúp kiểm khởi tạo; vẫn cần tự thử drag ngoài cửa sổ, mất focus, resize/HiDPI, debug và A/B ở cửa sổ thật.

## Phạm vi và giới hạn

Nearest sampling có thể alias ở góc nghiêng mạnh: các ô nhỏ rung/răng cưa không có nghĩa perspective-correct sai. Chưa có bilinear, mipmap, lighting, Z-buffer hoặc nhiều bề mặt chồng nhau. Quad duy nhất không cần depth test. Không dùng OpenGL, GLM hay SDL_RenderGeometry cho phần cốt lõi.

Hoàn thành khi bạn giải thích được vì sao cùng một pixel có hai UV khác nhau ở affine/corrected, và chứng minh corrected khớp hình học. Project 21 tiếp tục với mesh OBJ, không yêu cầu bạn biến project này thành một engine.
