# Project 51 — Khối nước 3D trên GPU

Tự xây một bể nước WCSPH 3D bằng C++20/SDL3/OpenGL 4.3. Khối nước cạnh 0,4 m nằm sát đáy rồi lan ra khi chạy; orbit/zoom quanh thể tích, đổi density/pressure/speed view và mở profiler từng pass. Final mở **paused ở 110.592 hạt thật**, vẽ toàn N bằng sphere impostor có normal, perspective và depth mặt cầu. 512.000/một triệu là mốc nâng cao tùy phần cứng, không phải lời hứa FPS hoặc đã nghiệm thu.

Giáo trình đi từ preview 64 hạt và oracle 512 hạt tới mốc chuẩn ≥100.000. Dự kiến khoảng 26 giờ, chưa tính setup/build. Thử tự viết 180–240 phút trước khi xem lời giải. Nên biết camera/projection (11–15), SDL3/OpenGL/compute (33–38), reduction/prefix sum (37/39), grid (28) và SPH (50). Không cần cài project trước để build gói này.

## Lộ trình và mã đầy đủ

1. Khối 64 điểm CPU, camera perspective, orbit/zoom/resize.
2. Float4/std430, SSBO và initialization 512 hạt trên GPU.
3. Vertex shader đọc SSBO, sphere impostor và gl_FragDepth.
4. Kernel 3D chuẩn hóa, mass theo thể tích, gradient.
5. Density all-pairs có self, một invocation/hạt.
6. EOS, pressure và artificial viscosity từ state cũ.
7. Gravity, semi-implicit Euler, sáu thành, ping-pong.
8. GPU clear/count → scan nhiều tầng → scatter, duyệt 27 cell.
9. GPU reduction extrema/error, adaptive dt và diagnostics.
10. Fence/poll không chặn, UI pause/reset và benchmark hữu hạn.
11. Memory/GL limits, xác nhận N và chạy mốc 110.592.
12. CTest, sáu fixture CPU↔GPU, bản hoàn chỉnh và cách nghiệm thu.

`source-template/` là nguồn biên soạn. `starter/`, `checkpoints/01..12/` và `final/` là các snapshot độc lập, không sửa template để học. Chọn đúng target để chạy đúng bài; mỗi target đi kèm bộ shader của nó. `include/` tách model/kernel/reference, storage/passes/engine, queue/profiler, view/camera và UI/controls. Không dùng ImGui, WebView hoặc thư viện SPH để thay lõi thuật toán. ZIP chứa toàn bộ mã, tests và shaders; không cần Node.js hay website để chạy.

## Build và chạy

CMake 3.24+, compiler C++20, driver OpenGL 4.3/GLSL 430. Windows: Visual Studio 2022 với Desktop development with C++. CMake khóa SDL **3.4.8**/checksum và dùng FetchContent nếu chưa có SDL; cần mạng ở lần configure đầu. Link qua `SDL3::SDL3`. OpenGL của macOS không đạt 4.3; không coi README đa nền tảng là bằng chứng đã kiểm runtime trên Linux/macOS.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
build/Release/project_51_final.exe
```

Mặc định không bật `BUILD_CHECKPOINTS`: build final và tests. Khi học, ví dụ build `--target project_51_checkpoint_5`, executable nằm cạnh final. Starter target là `project_51_starter`. Với generator single-config, configure bằng `-DCMAKE_BUILD_TYPE=Release` và dùng build directory riêng; executable không có thư mục `Release/`. CTest thuần không cần window/GPU; chương trình tương tác có yêu cầu driver thật.

## Điều khiển native

- Kéo chuột trái trong viewport để orbit, wheel để zoom; arrows đổi yaw/pitch, Home đặt lại. Camera không sửa state SPH.
- Space/nút Run: chạy hoặc pause từ bài 10. N/Step: pause và gửi một tick khi idle (bài 5–6 chỉ density/force, chưa tích phân).
- R/Reset: pause, đợi batch hiện tại xong rồi reset cùng N và tham số. C/Cancel: dừng work tương lai, hủy lựa chọn N/benchmark/oracle phụ; không preempt command GPU đã gửi.
- F1/Debug: sạch ↔ số đo. Wheel trong panel hoặc PgUp/PgDn cuộn số đo, không zoom scene.
- L/View: water/density (từ bài 5), thêm pressure/speed/unlit (từ bài 6).
- F: sound speed 8/12/20 m/s. Q: alpha 0/0.15/0.3, đổi khi idle.
- G: grid/all-pairs từ bài 8, all-pairs chỉ cho N≤512.
- Phím 1–5/nút preset: 512/32.768/110.592/512.000/1.000.000. Chỉ chọn và pause, **Enter/Apply mới cấp phát**; C hủy. Đổi N không tự chạy.
- B/Bench: reset cùng N, CSR và camera/mode chuẩn; 30 warm-up + 8 compute + 8 frozen-render samples, deadline 20 s. C/blur hủy phần chưa gửi.
- V/Verify: oracle perturbed 512 hạt ở engine phụ; pause nhưng không đổi N/time/state scene chính.
- Blur/minimize pause, thả capture và không tự chạy lại. Esc đóng ứng dụng.

## Kiểm đúng trước khi đo nhanh

Chạy từng lệnh riêng, không chồng nhiều job GPU:

```bash
build/Release/project_51_final.exe --verify-gpu
build/Release/project_51_final.exe --verify-gpu --tail-case
build/Release/project_51_final.exe --verify-acoustic
build/Release/project_51_final.exe --verify-force
build/Release/project_51_final.exe --verify-perturbed
build/Release/project_51_final.exe --verify-scan
```

Lattice/tail kiểm toàn pipeline với 512/257 hạt; perturbed dùng lattice nén và relative velocity để pressure/viscosity không bằng 0. Scan dùng 257 hạt, 4.096 cell, tám workgroup ở tầng đầu và hai tầng scan. Acoustic buộc acoustic bound chi phối. Prescribed-force dùng gia tốc biết trước (0,10⁶,0), chỉ kiểm reduction/integration, không chứng minh công thức lực SPH.

Verifier kiểm initialization, CSR ranges/ownership/permutation, density/pressure/acceleration, extrema/dt CPU độc lập và integration qua hai tick. Tolerance theo đơn vị nằm trong `validation.hpp`; nonfinite luôn fail. Deadline verifier 15 s, mỗi batch 5 s; tự động hóa cần thêm process timeout khoảng 30 s và dọn descendants. Không tự lặp một job timeout hoặc coi timeout là PASS. Các ca nhỏ không chứng nhận độ hội tụ của nước hay hiệu năng triệu hạt.

## Kiểm quy mô và profiler

```bash
build/Release/project_51_final.exe --side=48 --scale-check --ticks=1200 --seconds=55 --debug
build/Release/project_51_final.exe --side=48 --benchmark --seconds=25 --debug
```

Chạy lần lượt. Mỗi lệnh có thời gian hữu hạn; thiếu ticks/mẫu trước deadline là incomplete. `--hidden` chạy không hiện cửa sổ; `--capture=output.bmp` lưu frame cuối khi có `--seconds`. Không tự gửi workload nâng cao. Dù driver vẫn có thể treo trước deadline của CPU, không có busy wait, `glFinish` hoặc queue không giới hạn để làm trầm trọng thêm rủi ro.

Ghi máy/GPU/driver, Release, N và config. Benchmark dùng cùng lattice/tham số, warm-up 30 tick, lấy 8 tick **liên tiếp** (state vẫn tiến), rồi 8 scene renders ở state cuối đóng băng. Báo median/min/max từng GPU pass và toàn compute batch; CPU enqueue và submit→commit là số riêng. Scene render timer không gồm UI/swap; không dùng nghịch đảo pass time làm FPS ứng dụng. Không có phép đo speedup CPU–GPU từ Canvas.

Counters `allocated/alive/updated/drawn` phải khớp N ở ca hợp lệ. Density là đầu tick cuối, leakage/invalid là sau integration; không gộp với profiler. Histogram 64 bin trên rho/rho0∈[0,1.6], median/p95 là tâm bin xấp xỉ. Fixed readback 16+288 byte thay vì tải cả mảng hạt.

Lỗi fence/deadline là `GpuBatchError`, không phải lỗi thao tác có thể bỏ qua. Cả Controls lẫn oracle phụ phải ném tiếp lỗi này tới main để ứng dụng dừng submit, dọn tài nguyên và thoát thất bại. Chỉ các lỗi kiểm chứng dữ liệu đã hoàn tất mới được hiển thị trong panel rồi trả quyền cho người dùng; không nuốt timeout GPU để tiếp tục chạy scene chính.

## Mô hình, ngân sách và giới hạn

World [0,1]³, y lên. Khối cạnh 0,4 m, x offset .08, đáy y=0, z offset .3. Spacing=.4/side, h=1.3 spacing, support=2h, rho0=1000 kg/m³, m=rho0 spacing³, tổng mass 64 kg cho preset đầy đủ. Kernel cubic 3D có 1/(πh³); pressure=max(0,c²(rho−rho0)) Pa. Monaghan beta=0, alpha là tiêu tán số, không phải độ nhớt thực. Gravity=9.81 m/s²; collision sáu mặt với restitution .1, chỉ phản xạ normal hướng ra.

Boundary không có wall samples/hydrostatic correction, nên density sát thành/mặt thoáng thiếu support. Không clamp rho để che lỗi. Không surface tension, surface reconstruction, refraction hoặc solid hai chiều. Bán kính vẽ .65 spacing khác khoảng cách tâm tới thành .5 spacing và support 2h.

CSR không fixed cell capacity. Quá 4096 ứng viên/hạt thì flag lỗi, không commit tick; không cắt lực ngầm. dt=min(.0005,.25h/(c+vmax),.25sqrt(h/max(amax,1e−12))), dưới 1e−6 dừng. Một batch pending, fence poll timeout 0; pause chỉ ngăn submit tương lai, không thu hồi compute đã gửi.

Plan tính các bank, CSR, scan, scratch và diagnostics; kiểm SSBO/workgroups/shared memory và buffer budget 192 MiB, cả peak cũ+mới khi đổi N. Đây không phải phép đo VRAM rảnh hay tổng bộ nhớ driver. Allocation thất bại giữ workload cũ. Vẽ toàn N, không cap/stride ngầm. Model time tiến theo tick, không bù wall-clock; đây không phải realtime lockstep.

Canvas web chỉ chạy CPU double tối đa 216 hạt để học kernel, support, lực và grid; không WebGL/WebGPU/WASM, không giả GPU benchmark. Nâng cao 512k/1M cần tự kiểm và báo phần cứng/kết quả riêng.

## Checklist tương tác

Run/pause/reset/step; drag ra ngoài rồi thả; zoom/Home; chọn N nhưng Cancel không cấp phát; Apply đổi N vẫn paused; F1/L, cuộn profiler; F/Q; G trên hệ nhỏ; Bench hoàn tất/cancel; Verify không đổi scene chính; blur không tự chạy lại; đóng cửa sổ khi job nhỏ đang pending. Kiểm native riêng với Canvas và CTest.

Tham khảo: [PySPH kernels](https://pysph.readthedocs.io/en/main/reference/kernels.html), [SDL GL context](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext), [Khronos memory barrier](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml).
