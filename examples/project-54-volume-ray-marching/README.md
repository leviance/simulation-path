# Project 54 — Nhìn xuyên khối sương 3D

Xây ứng dụng C++20/SDL3/OpenGL 3.3 core: mỗi fragment phát một ray xuyên scalar volume, lấy density bằng sampler3D rồi tích lũy màu/transmittance theo front-to-back. Dự kiến 13–17 giờ; thử challenge 120–180 phút trước khi đọc lời giải.

## Lộ trình chín bài

1. Window/context → fullscreen triangle → gradient trong target 240×180.
2. Camera orbit, basis, perspective ray normalized và pixel centre.
3. Ray–box interval, parallel/miss và camera inside.
4. Density float/R32F, x-fast, upload texture 3D và trilinear.
5. Beer–Lambert có ds; một midpoint để kiểm medium hằng.
6. Midpoint marching, partial tail, C/T và thứ tự front-to-back.
7. Transfer warm/cool, ghép nền rồi mới gamma.
8. Step size, early termination có bound và giới hạn workload.
9. Pure CTest, shader smoke và GPU numeric verify nhỏ.

Prerequisites: Project 33–36 (SDL/OpenGL/GLSL), 52 (ray/camera/slab), 53 (volume/spacing/centre/interpolation). Đây là visualization emission–absorption, không renderer scattering/lighting vật lý và không dữ liệu y khoa.

## Build/run

CMake 3.24+, compiler C++20; SDL3 khóa 3.4.8/checksum qua FetchContent, link SDL3::SDL3. Windows: Visual Studio 2022 Desktop development with C++. Runtime cần driver/context OpenGL 3.3 core (không compute shader). Linux/macOS cần SDL platform dependencies và context phù hợp.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_54_final.exe. Final mặc định; BUILD_CHECKPOINTS bật starter và project_54_checkpoint_1…9. Với single-config generator, chọn CMAKE_BUILD_TYPE lúc configure và executable nằm trực tiếp trong build. ZIP độc lập, không cần website/Project 53/generator.

Shader đọc từ thư mục shader của checkpoint đang build; fallback sang shaders cạnh executable. CMake copy shader cho từng target. Không chỉ chép main.cpp: cần headers, shader và SDL runtime. Compile/link failure in tên shader và log driver; uniform active thiếu tên báo lỗi.

## Điều khiển

- Drag trái/mũi tên orbit, wheel đổi distance 4..12; pitch ±1.2.
- Space bắt đầu/dừng tự quay 0.3 rad/s, mở paused. dt≤0.1s.
- I camera inside (origin zero, forward +z cố định), R reset, Escape thoát.
- P phantom/ramp/constant từ Bài 04; +/− sigma từ Bài 05.
- Q step 0.02/0.04/0.08/0.16 từ Bài 06.
- C warm/cool từ Bài 07; E early T≤0.001 từ Bài 08.
- Blur/minimize/reset hủy capture, dừng tự quay, không tự resume.

Canvas web là CPU oracle nhỏ 48×36, không WebGL và không GPU benchmark. Kéo/mũi tên orbit, Ray u/v chọn tia, N tiến một sample, Space chạy/dừng profile, R reset. Reduced motion chỉ cho tiến thủ công. Preview dựng batch tối đa hai hàng mỗi frame, hủy batch cũ khi đổi input; soft deadline 10ms không preempt một row đã bắt đầu.

## Dữ liệu và công thức

Count 64×48×40; spacing (0.05,0.08,0.12) world units; box min=(-1.6,-1.92,-2.4), max=(1.6,1.92,2.4). Density R32F/float x-fast chiếm 480 KiB. Index=x+nx*(y+ny*z). Phantom cùng công thức Project 53; ramp=(x+2y+4z)/313, constant rho=0.25.

Texture GL_R32F/GL_RED/GL_FLOAT, GL_LINEAR ở level0, CLAMP_TO_EDGE ba trục. UVW=(world−min)/extent; centre=(i+0.5)/N; CPU g=uvw*N−0.5 và replicate nửa ô sát edge. Box interval loại miss trước sampler clamp.

Ray direction normalized, vertical FOV55°, tMax20. Inside entry=0. StepLength 0.02..0.25, sigma0..8; count=ceil(L/step), sample midpoint, ds cuối là remainder. C+=Told*(1−exp(−sigma*rho*ds))*transfer(rho); T*=exp(−sigma*rho*ds). Tiny floating-point tail có thể làm sample count CPU/GPU khác một, không làm thay optical length đáng kể.

Result RGBA32F chứa (C,T), alpha không phải opacity. Present C+T*background, gamma gần đúng1/2.2 sau cùng; GL_BLEND/GL_DEPTH_TEST/GL_FRAMEBUFFER_SRGB tắt. Warm đổi RGB, không đổi extinction. Density [0,1], transfer/background bounded; chưa có HDR.

Target 240×180 cố định, tối đa512 samples/ray; resize chỉ letterbox/present. Cap error trả diagnostic magenta, CPU throw, không partial result. Early tùy chọn T≤0.001 có bound sai khác C/T và mỗi channel màu compose≤0.001 cho transfer/background [0,1]; khác cap cắt ray.

## Kiểm chứng có giới hạn

CTest pure không SDL/window/GPU. Checks không dùng assert nên Debug và Release đều kiểm interval, layout/edge, medium hằng analytic, partial tail, zero sigma, miss, early bound, ramp convergence, input bounds và dataset immutability.

--smoke-gpu ở checkpoint1–9 render hidden16×12 một lần, kiểm shader compile/link/uniform, một pixel hữu hạn và GL errors. --verify-gpu chỉ checkpoint9/final: target16×12, bốn pixel/config, phantom/ramp/constant, outside/inside, step0.04/0.17. So linear C/T với CPU double, tolerance0.0025; không screenshot/gamma.

Ví dụ PowerShell hard timeout30s ngoài process:

```powershell
$gpuCheck = Start-Process -FilePath ".\build\Debug\project_54_final.exe" -ArgumentList "--verify-gpu" -WindowStyle Hidden -PassThru -RedirectStandardOutput "gpu-verify.log" -RedirectStandardError "gpu-verify-error.log"
if (-not $gpuCheck.WaitForExit(30000)) {
    $gpuCheck.Kill()
    throw "GPU verify vượt 30 giây."
}
Get-Content "gpu-verify.log"
Get-Content "gpu-verify-error.log"
if ($gpuCheck.ExitCode -ne 0) { throw "GPU verify thất bại." }
```

App kiểm deadline10s giữa readback. ReadPixels có thể chặn: timeout ngoài process cần thiết, nhưng không preempt GPU command đã gửi hoặc bảo đảm driver không treo. Không lặp lại khi timeout; xem log/driver trước. Không readback mỗi interactive frame.

Numeric verify không kiểm mouse capture, keyboard, DPI/resize, pause/reset hoặc chất lượng driver. Kiểm tương tác desktop riêng. Không báo GPU PASS nếu môi trường không tạo được context.

## Phạm vi và source

Không DICOM/HU, CT reconstruction, calibration vật liệu, scattering, shadow, multiple scattering, animated volume, empty-space skipping, jitter hay adaptive step. Trilinear/step nhỏ không phục hồi resolution voxel.

source-template, tests và README là authored inputs; starter/checkpoints/final/CMake/ZIP được sinh từ source chuẩn và không commit vào repository website. Không sửa snapshot trực tiếp; ZIP đã gồm đủ snapshot chạy độc lập.

Tham khảo: [SDL_GL_CreateContext](https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext), [glTexImage3D](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTexImage3D.xhtml), [glTexParameter](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTexParameter.xhtml), [PBRT Transmittance](https://www.pbr-book.org/4ed/Volume_Scattering/Transmittance).

Tiếp theo: Project55 — Máy X-ray ảo, tính tín hiệu detector sau khi tia xuyên các lớp vật liệu.

