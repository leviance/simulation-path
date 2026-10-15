# Project 57 — Mưa photon ngẫu nhiên

Tự xây Monte Carlo trong môi trường 2D: photon đi một quãng ngẫu nhiên, bị hấp thụ hoặc đổi hướng khi tán xạ, rồi có thể thoát qua bất kỳ cạnh nào. Xem lại một lịch sử theo seed/ID, gom nhiều lịch sử thành thống kê và đọc mức bất định.

Đây là mô hình học thuật toán, không mô phỏng thiết bị X-ray, Compton/Rayleigh, liều bức xạ hoặc công cụ y khoa.

## Thử thách và lộ trình

Tự thử trong 120–180 phút trước khi đọc lời giải; cả module dự kiến 12–16 giờ. Cần SDL3/input (01–05), ray normalized (52), Beer–Lambert/forward projection (55–56).

1. Vẽ môi trường và photon bằng SDL3 từ starter.
2. RNG theo seed/ID; U trong (0,1), inverse CDF của free path.
3. So quãng đường lấy mẫu với khoảng cách tới biên.
4. Hoàn tất lịch sử trong môi trường chỉ hấp thụ.
5. Thêm tán xạ 2D và trạng thái Censored khi hết eventLimit.
6. Tally nhiều photon, giữ đúng nhóm kết thúc/mẫu số.
7. Ballistic estimate, Wilson 95% và sai số Monte Carlo khác censoring.
8. Scheduler có ngân sách, pause/reset/invalidation và kiểm chứng.

Mỗi checkpoint chạy độc lập, có đủ include/src. Website cung cấp mã theo từng thay đổi và source hoàn chỉnh sau mỗi bài/cuối module; đừng chỉ chép main.cpp.

## Build và chạy

C++20, CMake 3.24+, SDL3 khóa 3.4.8 bằng FetchContent/SHA256, link SDL3::SDL3. Windows dùng Visual Studio 2022 Desktop development with C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_57_final.exe. Final mặc định; BUILD_CHECKPOINTS bật starter và project_57_checkpoint_1…8. Single-config generator đặt CMAKE_BUILD_TYPE khi configure, executable trực tiếp trong build. Không cần assets/font library ngoài SDL runtime. SDL_RenderDebugText chỉ dùng nhãn ASCII nhỏ; Canvas và bài học dùng tiếng Việt.

Pure CTest không SDL_Init/window, dùng check tường minh hoạt động cả Release/NDEBUG. Hidden SDL smoke render một frame, không tự chạy lượt thống kê và không thay thế QA tương tác:

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_57_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru -RedirectStandardOutput "smoke.log" -RedirectStandardError "smoke-error.log"
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "SDL smoke vượt 30 giây."
}
Get-Content "smoke.log"
Get-Content "smoke-error.log"
if ($smoke.ExitCode -ne 0) { throw "SDL smoke thất bại." }
```

Không tự retry khi timeout. Automation cần outer timeout/process-tree cleanup; watchdog không bảo đảm preempt graphics driver. Không benchmark vô hạn hoặc GPU workload lớn cho mô hình CPU nhỏ này.

## Điều khiển

- Mở paused. Escape thoát; các phím chỉ hiện từ checkpoint tương ứng.
- Bài 02: Up/Down chọn preview ID, A/D đổi muA, B đổi seed 42/2026/1, P đổi preset, R reset. Trước Bài 05 chỉ có chân không/hấp thụ thuần và muS=0.
- Bài 05: J/K đổi muS, L chọn eventLimit 1/8/64, Left/Right hoặc kéo timeline xem vertex. Preset thêm mixed/scatter-only.
- Bài 06: N thêm 1 photon, M thêm 32, Q chọn count 512/2048/8192; xem lại ID không tally.
- Bài 08: Space chạy/dừng, V chạy audit nhỏ. Blur/minimize/reset dừng và hủy capture; không tự resume. Input dùng logical coordinates, bỏ letterbox.

Timeline chỉ xem lịch sử đã ghi, không lấy thêm RNG. Màu điểm theo event ở vertex đang xem. Hồng=absorption, xanh=escape, tím=Censored. Thước S là trục số 0..6, không trajectory và không cắt dữ liệu S thành 6. Title đọc preview, Counts và ballistic CI khi N>0.

Canvas có preset/reset, mouse/keyboard, pointer capture, DPR/reduced-motion. Reduced motion chỉ cho thêm mẫu thủ công, không tự resume khi tắt. Đổi hệ số/seed/limit/count tạo lượt mới; xem ID/vertex không sửa thống kê.

## Mô hình

Medium XY=[-1.5,1.5]×[-1,1], y lên. Photon phát ở x=-1.5, y=.75*(2U-1), hướng (1,0). Chùm ban đầu đi L=3. MuA/muS hữu hạn 0..3 theo 1/world-unit; muT=muA+muS. S không nhân dt/FPS.

Xorshift32 uint32; seed 0 ánh xạ 0x6d2b79f5. photonSeed dùng seed+0x9e3779b9*(id+1), rồi fmix32 của MurmurHash3 (Austin Appleby, public domain). TS dùng Math.imul và >>> để khớp wrap/shift. Không mật mã hay chứng minh IID. ID 0..8191 có RNG riêng, draw đầu chọn y, draw sau chọn S; đổi thứ tự sẽ đổi fixture.

U=(nextUint32+.5)/2^32 thuộc (0,1). S=-log1p(-U)/muT; chân không cho∞, sampleFlight không lấy draw khoảng cách. Đi min(S,dBoundary); S>=boundary thì thoát, không tương tác ngoài medium. Hướng normalized; trục song song không chia0. Clamp chỉ sửa endpoint thoát, không đẩy epsilon vào medium.

Analog unit photon: tại collision, hấp thụ với muA/muT, còn lại tán xạ. Dùng U mới cho loại sự kiện và U khác cho angle=2πU. Đều góc trên đường tròn 2D, không đều trên sphere 3D. Không nhân thêm transmission để giảm trọng số.

Tối đa 64 tương tác/photon, 8192 photon/lượt. Chạm limit chưa kết thúc là Censored; không gán absorbed, không bỏ mẫu khỏi N. Trace≤limit+1 vertices. Giữ tối đa 24 trace đã tính và một preview hữu hạn. Mỗi frame thêm tối đa 32 photon mới, không catch-up; manual batch ưu tiên trước auto.

N=absorbed+escaped+censored. Ballistic là subset escaped chưa từng tán xạ; scatteredPhotons và scatterEvents không phải nhóm terminal. Tổng escaped tính mọi cạnh. [escaped/N,(escaped+censored)/N] là khoảng kết cục chưa biết, không CI của xác suất.

P ballistic=exp(-(muA+muS)*3); chỉ khi muS=0 mới trùng tổng escape probability. Wilson 95% áp dụng ballistic/N; N=0 chưa có ước lượng, k=0/N vẫn có interval. Sai số chuẩn cỡ 1/sqrt(N) không bảo đảm mỗi seed giảm error đều. Tăng N không sửa sai mô hình/censoring; không lọc seed để giữ lượt đẹp.

## Kiểm chứng và nguồn chuẩn

RNG seed 1: 270369,67634689,2647435461. Seed trộn (42,ID 0/1): 939911724/3948730756. Inverse CDF muT=2,U=.5 cho ln2/2. Tests kiểm boundary inward/outward/tangent/diagonal, vacuum, conservation, subset, budgets, batch 1/32, settings/preview và Wilson endpoints.

Fixture seed 42,N=512,limit 64: hấp thụ thuần (.4,0) có A=338 / E=174 / C=0 / B=174; mixed(.4,.9) có A=259 / E=253 / C=0 / B=8, 368 photon từng scatter và 681 scatter events. Chỉ tán xạ (0,2),limit 1 có 512 Censored trong fixture này. Đây là regression chung C++/TS, không tỷ lệ bắt buộc cho seed khác.

Audit 4096 photon seed 42 hấp thụ thuần so exp(-1.2), tolerance 5 sai số chuẩn+1/N. Không chứng nhận mọi seed trong CI 95%; tọa độ dùng tolerance, không hứa sin/cos/log bit-identical trên mọi platform. Kiểm desktop riêng pointer/keyboard, preset, pause/blur/reset, DPI/resize và ZIP.

Không năng lượng photon, Compton/Rayleigh, detector response, phản xạ/khúc xạ, medium không đồng nhất, liều hay thiết bị phát tia. source-template/tests/README là authored inputs của website; snapshots/CMake/ZIP do generator sinh, không đưa vào Git. ZIP chạy độc lập, không cần node_modules hoặc server.

Tham khảo [PBRT sampling](https://pbr-book.org/3ed-2018/Light_Transport_II_Volume_Rendering/Sampling_Volume_Scattering), [phase functions](https://www.pbr-book.org/4ed/Volume_Scattering/Phase_Functions), [NIST Wilson](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm), [MurmurHash3 public-domain source](https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp).

Tiếp theo: Project 58 — Khối đất 16×16×16, phần Voxel World, hiện Sắp ra mắt.
