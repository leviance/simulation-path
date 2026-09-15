# Project 38 — Five Million Particle Fountain

Project này xây một đài phun 2D bằng C++20, SDL3 và OpenGL 4.3. Tối đa 5.000.000 particle được khởi tạo một lần, giữ trong cùng một SSBO, cập nhật bằng compute shader rồi đọc trực tiếp trong vertex shader. Frame path không tải 160 MB trạng thái về CPU.

## Sản phẩm hoàn chỉnh

- `Particle` 32 byte gồm `positionAge` và `velocityLife`, khớp hai `vec4` trong `std430`;
- deterministic initialization theo index/seed và age spreading cho trạng thái ban đầu;
- capability check cho OpenGL 4.3, workgroup và SSBO trước allocation;
- bốn preset 100 nghìn, 500 nghìn, 1 triệu và 5 triệu particle;
- compute shader `local_size_x = 256`, bounds guard, gravity, semi-implicit Euler và respawn;
- vertex shader dùng `gl_VertexID` đọc cùng SSBO, không tạo bản sao VBO;
- compute → draw synchronization bằng `GL_SHADER_STORAGE_BARRIER_BIT`;
- additive point-sprite rendering có color/fade theo velocity và lifetime;
- hai timer-query ring bất đồng bộ cho compute và draw;
- validation probe 64 particle dùng CPU oracle và chỉ readback buffer nhỏ;
- pause, single-step, reset, resize/high-DPI, diagnostics và cleanup đầy đủ.

## Cấu trúc source

```text
source-template/
  include/particle_math.hpp        particle contract, initialization, CPU step và validation
  include/gl_api.hpp               OpenGL 4.3 function loader tối thiểu
  include/particle_gpu_engine.hpp  SSBO, programs, dispatch, render, queries và probe
  shaders/particle_update.comp     compute update và respawn
  shaders/particle.vert            đọc SSBO bằng gl_VertexID
  shaders/particle.frag            point sprite tròn và additive color
  src/main.cpp                     SDL/OpenGL lifecycle, controls và diagnostics
tests/tests.cpp                    CTest thuần CPU, không mở window
```

`starter`, `checkpoints/01..10` và `final` được sinh từ `source-template`. Mỗi snapshot có thể build độc lập; shader tương ứng được copy cạnh executable.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --target project_38_final project_38_tests
./build/Debug/project_38_final
```

Với Ninja hoặc generator một cấu hình, executable thường nằm trực tiếp trong `build/`. SDL được khóa ở 3.4.8 và luôn link qua `SDL3::SDL3`.

Máy cần OpenGL 4.3 Core. Preset 5 triệu cần một shader storage block ít nhất 160.000.000 byte. Nếu capability không đủ, app chọn preset lớn nhất hợp lệ và ghi rõ fallback; phím `4` sẽ từ chối thay vì allocation mù.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| `1` | 100.000 particle |
| `2` | 500.000 particle |
| `3` | 1.000.000 particle |
| `4` | 5.000.000 particle nếu capability cho phép |
| `Space` | Pause/resume |
| `N` | Chạy đúng một bước 1/120 giây |
| `R` | Khởi tạo lại preset hiện tại bằng seed ban đầu |
| `V` | Chạy validation probe 64 particle |
| `Escape` | Thoát |

## Mười checkpoint

1. Khóa Particle record, semi-implicit Euler, lifetime và CPU preview.
2. Thêm deterministic initialization và age spreading.
3. Tính byte budget, đọc capability rồi upload một SSBO.
4. Viết compute shader gravity/integration/respawn có bounds guard.
5. Render static SSBO bằng `gl_VertexID`, VAO rỗng và point sprite.
6. Chạy update → `GL_SHADER_STORAGE_BARRIER_BIT` → draw, không full readback.
7. Thêm dt clamp, pause, single-step và reset deterministic.
8. Thêm query rings bất đồng bộ và bốn count presets.
9. Thêm validation probe 64 particle bằng chính compute program.
10. Hoàn thiện controls, title diagnostics, additive rendering và cleanup.

## Nghiệm thu hữu hạn

```bash
cmake --build build --config Debug --target project_38_final project_38_tests
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --target project_38_final project_38_tests
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

CTest kiểm code CPU thuần: layout, deterministic initialization, 5-million dispatch tail, storage budget, capability fallback, integration, respawn, dt clamp, finite validation và median. Shader thật cần OpenGL context nên được kiểm bằng app tương tác; window loop không nằm trong CTest.

## Ba đường dữ liệu cần phân biệt

- **Main frame**: compute ghi main SSBO → `SHADER_STORAGE` barrier → vertex shader đọc → draw. Không readback.
- **Validation action**: compute ghi probe SSBO 64 phần tử → `BUFFER_UPDATE` barrier → `glGetBufferSubData` → CPU oracle.
- **Timing**: query ring chỉ đọc result đã available. Khi bốn slot còn pending, frame bỏ qua timing thay vì chờ GPU.

## Tài liệu API chính thức

- [glDispatchCompute](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml)
- [glMemoryBarrier](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml)
- [gl_VertexID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml)
- [glDrawArrays](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDrawArrays.xhtml)
- [glGetQueryObject](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGetQueryObject.xhtml)
