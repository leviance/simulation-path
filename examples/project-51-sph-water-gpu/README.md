# Project 51 — Khối nước 3D trên GPU

Tự xây WCSPH 3D bằng C++20/SDL 3/OpenGL 4.3, từ preview 64 hạt đến solver giữ state trên GPU. Học từ ca nhỏ có oracle, không bắt đầu bằng benchmark triệu hạt. Dự kiến 20–26 giờ; thử challenge 180–240 phút trước khi xem lời giải.

## Lộ trình 12 bài

1. Khối 64 hạt CPU và camera orbit.
2. Float4/std430, SSBO và initialization 512 hạt trên GPU.
3. Vertex shader đọc SSBO, depth test, point sprites.
4. Kernel chuẩn hóa 3D, mass theo thể tích và gradient.
5. Density all-pairs có self, một invocation/hạt.
6. EOS, pressure và artificial viscosity từ state cũ.
7. Gravity, integration, sáu thành và ping-pong.
8. Clear/count→exclusive scan→scatter,27 cell và oracle.
9. Reduction extrema/error và adaptive dt trên GPU.
10. Fence/poll không chặn, cancel/pause và benchmark 8 tick.
11. Memory plan, GPU limits và xác nhận 512/32.768/110.592/1.000.000 hạt.
12. CTest, GPU verify 257/512 hạt và source hoàn chỉnh.

Nên học Project 11–15,33–40,45 và 50 trước. Không cần cài project trước để build ZIP này. source-template là nguồn biên soạn; starter/checkpoints/final được sinh tự động. ZIP chứa mọi header/shader cần thiết, không cần website để chạy.

## Build/run

Compiler C++20, CMake 3.24+, SDL 3.4.8 khóa checksum qua FetchContent. Windows dùng VS 2022 Desktop development with C++; runtime cần driverOpenGL 4.3/GLSL 430. macOS native OpenGL tối đa 4.1 không phù hợp; CTest thuần vẫn không cần GPU/window.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_51_final.exe. Với generator single-config, dùng build directory riêng và CMAKE_BUILD_TYPE; executable nằm trực tiếp trong build directory. Shader lấy từ snapshot tương ứng qua COURSE_SHADER_DIRECTORY. Không trộn shader của hai checkpoint.

GPU smoke tests chỉ dùng hệ nhỏ, không chạy benchmark lớn tự động:

```bash
build/Debug/project_51_final.exe --verify-gpu
build/Debug/project_51_final.exe --verify-gpu --tail-case
build/Debug/project_51_final.exe --verify-acoustic
build/Debug/project_51_final.exe --verify-force
```

Chạy từng lệnh riêng với hard timeout ngoài process 30 s; không tự chạy lại nếu timeout. Verify có total timeout 15 s trong app, mỗi batch 5 s. Hai fixture mới chỉ dùng 512 hạt. Acoustic dùng vận tốc lớn trong pipeline SPH; force dùng gia tốc (0,10⁶,0) biết trước và chỉ kiểm reduction/integration, cố ý bỏ qua force SPH. Lattice/tail vẫn kiểm toàn pipeline. Chúng không phải benchmark. CPU tự tính extrema và dt trước khi so integration, không dùng GPU dt làm đáp án. Không thể dùng timeout để preempt một GPU command đã gửi hoặc bảo đảm driver không treo. Không tự động gửi triệu hạt khi mở app/test.

## Điều khiển

- Drag/orbit, wheel/zoom, arrows/yaw-pitch; Home reset camera. Camera không sửa physics.
- R reset khi idle; N density/force từ Bài 05, một tick từ Bài 07.
- F sound speed 8/12/20; Q alpha 0/0.15/0.3, chỉ đổi khi idle.
- G grid/all-pairs từ Bài 08, chỉ N≤512 được all-pairs.
- Space run/pause từ Bài 10; C hủy tick/benchmark chưa gửi; B benchmark đúng 8 tick.
- Phím 1–4 từ Bài 11:512/32.768/110.592/1.000.000 hạt. App dừng, in N/MiB rồi yêu cầu Enter. C hủy. Lựa chọn lớn không tự chạy.
- Blur/minimize dừng submit, hủy capture. Esc thoát.

Một batch pending; event loop poll timeout 0. Không enqueue render phía sau batch dài. Title đọc N/drawn/tick/time/dt/GPUms/rhoMax của state trước tick gần nhất. Thời gian mô phỏng không bằng wall-clock: đây là chế độ theo throughput/work budget, không bù thời gian đã bỏ qua.

## Mô hình và giới hạn

World [0,1]³, khối cạnh 0.4 m; spacing=0.4/side, h=1.3*spacing, support 2 h, rho0=1000 kg/m³, m=rho0 spacing³. Preset đầy đủ giữ 64 kg. Cubic spline 3D có 1/(πh³); pressure=max(0,c²(rho−rho0)). Monaghan beta 0, alpha là tiêu tán số, không phải độ nhớt thực.

Boundary chỉ collision sáu thành, restitution 0.1, không wall samples/hydrostatic correction. Density sát thành/mặt thoáng bị thiếu support; báo rho thật. Không surface tension, reconstruction mặt nước hoặc tương tác solid hai chiều. Màu dùng density trước integration; không là chứng nhận độ chính xác chất lưu.

CSR không fixed cell capacity. Mỗi hạt quá 4096 ứng viên thì flag lỗi và không commit tick; không dùng force truncated. Reduction chọn dt=min(0.0005,0.25 h/(c+vmax),0.25 sqrt(h/amax)). Nonfinite hoặc dt < 1e−6 dừng/báo lỗi.

Plan tính mọi buffer, kiểm SSBO/workgroup/shared limits và budget 192 MiB, kể cả peak khi chuyển workload. Reset cùng N reuse allocation. Draw dùng stride tối đa 100.000 điểm; physics vẫn toàn N. Một triệu là workload được hỗ trợ có điều kiện, không cam kết 60 FPS hoặc đã kiểm trên mọi GPU.

Canvas web là oracleCPU double tối đa 216 hạt, không WebGL/WebGPU/WASM hoặc GPU benchmark. Header GL loader/program/scan trong ZIP dùng scaffold đã học ở các project trước để mỗi ZIP tự build; công thức SPH được chia riêng, không nhân bản kernel trong density/force shader.

## Kiểm chứng

CTest giữ checks trong Release, kiểm volume normalization/gradient, mass/layout, pair power, collision và hai bound dt chủ động. GPU verify 257/512 hạt kiểm CSR ranges/ownership/permutation, density/pressure/acceleration và integration hai tick với CPU double. Tolerance ghi trong validation.hpp, nonfinite luôn fail. Bộ kiểm nhỏ không chứng nhận độ hội tụ, hydrostatic correctness hoặc tốc độ của workload triệu hạt.

Đối chiếu [PySPH kernels](https://pysph.readthedocs.io/en/main/reference/kernels.html), [SDL GL context](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext), [Khronos memory barrier](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml).
