# Project 37 — Million Vector GPU

Project này xây một máy tính vector element-wise bằng C++20, SDL3 và OpenGL 4.3 compute shader. Hai mảng input chứa hơn một triệu `Vec4`; GPU chạy Add, AXPY hoặc Difference rồi ghi vào output SSBO. CPU chạy cùng workload như một oracle độc lập để kết quả không chỉ được đánh giá bằng vài cột “trông có vẻ đúng”.

## Sản phẩm hoàn chỉnh

- OpenGL 4.3 Core context và function loader tối thiểu qua `SDL_GL_GetProcAddress`;
- capability report cho local size, invocation count, workgroup count và SSBO bytes;
- `Vec4` C++ có size/alignment 16 byte, khớp `vec4[]` trong layout `std430`;
- ba SSBO ở binding 0/1/2 cho A, B và output;
- compute shader `local_size_x = 256` với `gl_GlobalInvocationID.x` và bounds guard;
- workload mặc định 1.000.003 phần tử: 3.907 workgroups và 189 invocation dư;
- `GL_BUFFER_UPDATE_BARRIER_BIT` trước `glGetBufferSubData`;
- CPU–GPU validation có finite guard, mixed tolerance, maximum error và first mismatch;
- `GL_TIME_ELAPSED` query chỉ bao quanh `glDispatchCompute`;
- 64 cột mẫu lấy từ GPU readback và title diagnostics.

## Cấu trúc source

```text
source-template/
  include/vector_compute_math.hpp    workload, dispatch plan, oracle và validation thuần CPU
  include/gl_api.hpp                 OpenGL 4.3 function loader tối thiểu
  include/vector_compute_engine.hpp  shader, SSBO, dispatch, barrier, readback và timer query
  shaders/vector_ops.comp            compute shader thay đổi theo checkpoint
  src/main.cpp                       SDL/OpenGL lifecycle, controls, output bars và diagnostics
tests/tests.cpp                      CTest thuần CPU, không mở window
```

`starter`, `checkpoints/01..09` và `final` được sinh từ `source-template`. Shader của mỗi snapshot được copy cạnh executable sau build.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --target project_37_final
./build/Debug/project_37_final
```

Với Ninja hoặc generator một cấu hình, executable thường nằm trực tiếp trong `build/`. SDL được khóa ở 3.4.8 và luôn link qua `SDL3::SDL3`.

OpenGL 4.3 là yêu cầu cứng vì compute shader trở thành core ở phiên bản này. Nếu context hoặc capability không đủ, ứng dụng dừng sớm và in giới hạn đã đọc thay vì tiếp tục tới một allocation/dispatch không hợp lệ.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| `1` | Add: `out[i] = A[i] + B[i]` |
| `2` | AXPY: `out[i] = scalar * A[i] + B[i]` |
| `3` | Difference: `out[i] = A[i] - B[i]` |
| `[` / `]` | Đổi 256 → 65.537 → 1.000.003 phần tử |
| `-` / `=` | Giảm/tăng scalar 0,25 trong `[-4, 4]` |
| `B` | Một warm-up và chín timing samples; title báo median |
| `R` | Trở về Add, scalar 1,25 và 1.000.003 phần tử |
| `Escape` | Thoát |

Calculator chỉ recompute khi state đổi hoặc khi nhấn `B`; nó không dispatch một triệu phần tử mỗi frame mà không có lý do.

## Chín checkpoint

1. Khóa `Vec4`, dữ liệu deterministic, phép toán element-wise và CPU oracle.
2. Yêu cầu OpenGL 4.3 rồi đọc/validate compute limits.
3. Tạo ba SSBO `std430` có binding 0/1/2 và output sentinel.
4. Compile compute shader, chạy đúng một workgroup 256 invocation.
5. Mở rộng tới 1.000.003 phần tử bằng ceil division và bounds guard.
6. Thêm memory barrier theo consumer rồi readback output.
7. Đối chiếu toàn bộ output bằng mixed tolerance và finite guard.
8. Đo compute kernel bằng `GL_TIME_ELAPSED`, warm-up và median.
9. Ghép ba operation, controls, output bars, diagnostics và cleanup.

## Nghiệm thu hữu hạn

```bash
cmake --build build --config Debug --target project_37_final project_37_tests
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --target project_37_final project_37_tests
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

CTest chỉ kiểm code CPU thuần: size/alignment, ba operation, deterministic input, dispatch tail, capability report, mixed tolerance, NaN guard và median. Compile/execute compute shader thật cần OpenGL context nên được kiểm bằng app tương tác, không đưa window loop vào CTest.

## Phân biệt ba con số thời gian

- **Compute time**: chỉ vùng `glDispatchCompute`, đo bằng timer query trong project.
- **Transfer time**: upload input hoặc readback output; không nằm trong timer query nói trên.
- **End-to-end time**: toàn bộ chuẩn bị + transfer + compute + validation + UI. Nếu tự đo thêm, hãy giữ nhãn này thay vì gọi nó là GPU kernel time.

## Tài liệu API chính thức

- [SDL_GL_CreateContext](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext)
- [glDispatchCompute](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml)
- [gl_GlobalInvocationID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_GlobalInvocationID.xhtml)
- [glMemoryBarrier](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml)
- [glBeginQuery](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glBeginQuery.xhtml)
