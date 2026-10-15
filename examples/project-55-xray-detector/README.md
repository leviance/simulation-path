# Project 55 — Máy X-ray ảo

Tự xây forward projection tổng hợp: nguồn điểm → tia hữu hạn → các box vật liệu → ảnh detector. C++20/SDL3, không cần OpenGL shader. Dự kiến 11–15 giờ; thử challenge 120–150 phút trước khi đọc lời giải.

## Tám bài học

1. Ảnh kiểm RGBA → streaming texture SDL3, chưa physics.
2. Source–detector, ray normalized ở pixel centre và finite segment.
3. Chiều dài qua slab, camera/source inside và object-space rotation.
4. Nhiều lớp, optical depth, Beer–Lambert và overlap-additive.
5. Midpoint có ds/tail; đối chiếu chord analytic và error bound.
6. Flat-field, raw I/ratio/log, display range và đảo palette.
7. Hai thành phần năng lượng: cộng intensity trước log.
8. Audit nhỏ, pure CTest và source hoàn chỉnh.

Prerequisites: Project 01–05 (SDL texture/input),52 (ray/slab),54 (transmittance). Không cần dataset y khoa; mu/energy là tổng hợp, không keV/hệ số vật liệu thật. Đây không phải công cụ chẩn đoán, mô phỏng thiết bị đã hiệu chuẩn hoặc hướng dẫn vận hành nguồn bức xạ.

## Build và chạy

CMake 3.24+, compiler C++20, SDL3 khóa 3.4.8 bằng FetchContent/checksum, link SDL3::SDL3. Windows: Visual Studio 2022 Desktop development with C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_55_final.exe. Single-config generator chọn CMAKE_BUILD_TYPE lúc configure, executable nằm trực tiếp trong build. Final mặc định; BUILD_CHECKPOINTS bật starter/project_55_checkpoint_1…8. ZIP độc lập, không cần website hay source project trước.

Pure CTest không window/SDL_Init; explicit checks hoạt động cả Release/NDEBUG. Native --smoke tạo hidden window, render target 80×60 một frame rồi exit. Smoke không kiểm tương tác desktop.

PowerShell giới hạn30s ngoài process:

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_55_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru -RedirectStandardOutput "smoke.log" -RedirectStandardError "smoke-error.log"
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "SDL smoke vượt 30 giây."
}
Get-Content "smoke.log"
Get-Content "smoke-error.log"
if ($smoke.ExitCode -ne 0) { throw "SDL smoke thất bại." }
```

Không tự lặp lại khi timeout. Process timeout không preempt graphics work đã gửi hoặc bảo đảm driver không treo. Automation build/test cần total timeout và process-tree cleanup; không chạy benchmark vô hạn.

## Điều khiển

- Click/kéo detector hoặc mũi tên chọn pixel từ Bài 02. Input SDL đổi sang logical renderer coordinates; letterbox ngoài ảnh bị bỏ qua.
- A/D xoay object quanh y, Space quay/dừng từ Bài 03; mở paused, dt≤0.1, tốc độ0.25rad/s.
- P single/layered/overlap-additive; W/S strength0..3 từ Bài 04.
- N exact/midpoint, Q step 0.05/0.1/0.2/0.4 từ Bài 05.
- L ratio/log, I invert; +/− I0 từ Bài 06.
- B mono/two-energy, J/K lowWeight từ Bài 07.
- V audit từ Bài 08; R reset, Escape thoát.
- Blur/minimize/reset dừng tự quay và hủy capture, không tự resume.

Title đọc measurement của pixel chọn. Sơ đồ XZ là hình chiếu ray 3D, không lát cắt y=0. Geometry hit xét đủ ba trục. Native target 80×60 giữ cố định; render ảnh khi dirty, resize chỉ logical presentation/letterbox. Không assets ngoài source/SDL runtime.

Canvas CPU40×30 preview target 80×60, tính tối đa3 hàng/frame với soft budget10ms và cancel khi input đổi. Tự quay chỉ đổi angle sau khi preview trước xong, cách ít nhất250ms, dt≤0.5; không benchmark C++/GPU. M xem một mẫu midpoint, pointer capture/keyboard/DPR/reduced-motion. Reduced motion dừng persistent, không tự resume.

## Geometry và tín hiệu

Source=(0,0,-6), detector plane z6, rộng6/cao4.5 world units. U=(x+0.5)/80, V=(y+0.5)/60, endpoint=((u−.5)*6,(.5−v)*4.5,6). Direction normalized; maximum=|endpoint−source|. Supported beams finite, length≤20; default corner≈12.572.

Box lưu trong object space; inverse rotateY−angle biến origin/direction, giữ t. Interval clip[0,maximum], parallel xét trước phép chia; inside entry0. Source/detector không quay (Project 56 mới chuyển sang nhiều góc).

Tối đa8 box, muLow/High0..4 theo1/world-unit; strength0..3. Exact tau=sum(strength*mu*chord). Overlap cộng mu là medium bổ sung, không priority/replacement/draw order. Default scenes: một slab, hai layer tách không khí + insert lệch tâm, hoặc overlap minh họa.

Midpoint trên toàn beam, count=ceil(maximum/step), step 0.05..0.5, ds cuối remainder, cap512. Mu gián đoạn nên error có aliasing và không hội tụ đơn điệu mỗi pixel. Bound bảo thủ |tauNum−tauExact|≤2*step*strength*sum(mu). Không trilinear voxel/filter che sai số.

Mono T=exp(−tauLow); I=I0*T. I0 là flat-field lý tưởng không vật thể mỗi pixel, không source power. Uniform I0/exposure1000..50000; không inverse-square/solid-angle/cosine response hoặc photon noise. Tăng I0 đổi raw I, không ratio/log ở mô hình này.

Log p=−ln(max(T,1e-12)), raw ratio giữ nguyên, logClamped flag. Mono unclamped p=tau; ảnh log gray=clamp(p/logRange,0,1), range 4; ratio gray=T; invert1−gray. Display không radiometric/gamma calibration, không sửa raw measurement.

Two-energy T=w*exp(−tauLow)+(1−w)*exp(−tauHigh), w0..1. Cộng intensity trước log, không exp của tau trung bình. MuHigh nhỏ hơn MuLow trong dataset giúp thấy biến đổi tỉ lệ spectral/thickness; không phổ nguồn hay material data đã hiệu chuẩn.

## Kiểm chứng và phạm vi

Slab centre L1.1, muLow.55 → tau.605, T=exp(−.605). Tia u=v=.5 thuận tính không trùng pixel centre của target chẵn80×60. Tests giữ centre/corner, oblique chord, inside/parallel/miss, finite detector clipping, order/overlap, zero strength, exposure invariant, spectrum endpoints/nonlinearity, rotation, input bounds và scene immutability.

Audit nhỏ kiểm expected analytic cùng midpoint boundary fixture max error.055. SDL smoke tách riêng. Kiểm desktop mouse/keyboard/DPI/resize/letterbox/pause/reset/blur; pure tests/smoke không chứng nhận những tương tác này.

Không CT reconstruction/sinogram, HU/DICOM, calibration/liều, noise/Monte Carlo, scatter, energy-dependent detector response hoặc thiết bị phát tia. Không suy vật liệu thật từ toy projection.

source-template/tests/README là authored inputs; starter/checkpoints/final/CMake và ZIP do generator sinh, không đưa vào Git của website. Đừng sửa snapshot trực tiếp hoặc chép mỗi main.cpp.

Tham khảo [PBRT Transmittance](https://www.pbr-book.org/4ed/Volume_Scattering/Transmittance), [SDL_LockTexture](https://wiki.libsdl.org/SDL3/SDL_LockTexture), [NIST XCOM](https://physics.nist.gov/PhysRefData/Xcom/Text/intro.html).

Tiếp theo: Project 56 — Máy CT đồ chơi, quay nguồn và detector để dựng sinogram theo lát cắt 2D.

