# Project 54 — Volume Lightbox

**Nhìn xuyên khối sương 3D bằng fragment shader.** Xoay góc nhìn quanh khối dữ liệu, chuyển MIP/average/alpha, chọn một tia để đọc từng mẫu và đo chất lượng–chi phí khi đổi step. Đây là ứng dụng C++/SDL3/OpenGL độc lập; không cần chạy website hoặc ghép source project khác.

## Mục đích và cách học

Project 53 cho ta đọc scalar ở từng lát; Project 54 đọc cả đoạn dọc ray. Điều cần học không chỉ là tạo một đám mây đẹp mà là giải thích vì sao ba cách gộp mẫu tạo ba ảnh khác nhau, tìm lỗi bằng fixture và biết mình đã đo thời gian gì.

Nên biết SDL/OpenGL/shader từ Project 33–36, ray từ 52, scalar/centre/trilinear từ 53. Camera, GL loader, glyph/UI và dữ liệu tổng hợp là scaffold được cung cấp. Volume shader/compositing vẫn được tự viết, không dùng engine hoặc mesh shell thay tích phân.

Giáo trình có **10 bài**, từ cửa sổ tới ray/box/texture, MIP/average, alpha, transfer/lighting, inspector, đo và kiểm chứng. Dự kiến đọc 4–5 giờ, tự viết 7–10 giờ, thử/kiểm 3–5 giờ; setup/build đầu tính riêng. Đầu module có thử thách để tự xây trước khi đọc hướng dẫn.

Trong repository, `source-template/` là nguồn authored. Generator tạo starter/checkpoints/final; ZIP chỉ chứa các bản chạy độc lập đó, không mang source-template hoặc công cụ Node. Hãy sửa đúng snapshot/target đang học trong bản tải về. Mã hoàn chỉnh không bị chia thành các đoạn phải tự đoán cách ghép.

## Build và chạy

- Compiler C++20, CMake **3.24+**, GPU/context **OpenGL 3.3 core** hỗ trợ texture 3D ít nhất 128³ và render target RGBA32F.
- SDL **3.4.8** được tải bằng FetchContent với SHA-256 và link qua `SDL3::SDL3`. Không tự đổi dependency.
- Windows đã dùng Visual Studio 2022. Hướng dẫn CMake đa nền tảng không đồng nghĩa mọi GPU/driver đều đã được kiểm.

```powershell
cmake -S . -B build
cmake --build build --config Release --parallel 1
.\build\Release\project_54_final.exe
```

Với generator single-config trên Linux/macOS, đặt `-DCMAKE_BUILD_TYPE=Release` khi configure và chạy executable ngay trong `build/`. Máy không có context/format cần thiết sẽ báo lỗi, không thay volume bằng một ảnh giả.

Muốn build cả starter và checkpoint:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Ví dụ Bài 5: target `project_54_checkpoint_5`, thư mục source `checkpoints/05/`. Final là target mặc định. Shader thay đổi theo checkpoint được copy vào `shaders/<target-name>/` cạnh executable; không để các target chép đè shader của nhau.

## Sản phẩm và quy mô thật

- Final mặc định **128³ = 2.097.152 Float32 / 8 MiB** CPU, texture **GL_R32F** tương ứng trên GPU. N=64 dùng 262.144 mẫu / 1 MiB để học/so sánh; không thay mức nghiệm thu 128³.
- Box **[-1,1]³**, spacing **2/N**, tâm i = -1+(i+0.5)*spacing; x-fastest `x+N*(y+N*z)`. World unit tùy chọn, không phải mm/HU.
- Dataset: sương xoắn tổng hợp, hai lõi, slab, constant 0.25, ramp XYZ, empty. Đây là dữ liệu tĩnh, **không phải fluid solver**.
- Viewer perspective dùng drawable thật, không phóng ảnh 240×180 thành sản phẩm cuối. Tab mở toàn cửa sổ; số ray pixels thực luôn hiện ở Tools. Target tối đa **4 Mi pixels**, 4096 mỗi chiều, RGBA32F tối đa 64 MiB payload; quá ngân sách phải giảm và công bố kích thước thật.
- Volume chỉ fill/upload khi đổi dataset/N. Có candidate mới trước khi commit; thất bại giữ dữ liệu trước. Camera/transfer không sửa raw density.

## Ba mode và công thức

Ray normalized, interval entry>=0; camera inside bắt đầu ở mắt. Xử lý direction zero trước phép chia slab. Miss không lấy mẫu. Sampler texture dùng GL_LINEAR/CLAMP_TO_EDGE với `uvw=(world+1)/2`; direct sampler có replication nhưng loop vẫn bị giới hạn bởi ray–box.

Cutoff áp dụng **trước reducer**: `rho'=clamp((rho-cutoff)/(1-cutoff),0,1)`. Nó chủ động thay scalar được tích lũy, không ghi ngược vào volume. Classification trước average khác classification sau average.

| Mode | Kết quả raw / ý nghĩa |
| --- | --- |
| MIP | max rho' dọc đoạn; raw RGB chép scalar, W=1 là ô chưa dùng, không phải T |
| Average | sum(rho'*ds)/L; trung bình có trọng số chiều dài, không phải ảnh X-ray |
| Alpha | C+=T*alpha*color; T*=exp(-sigma*rho'*ds), alpha=1-exp(-sigma*rho'*ds); raw=(C,T) linear |

Count=ceil(L/step); mỗi sample ở midpoint của ds thực, kể cả remainder cuối. Step **0.008..0.16**, sigma **0..12** trên world unit, cutoff **0..0.8**, cap **512 đoạn/ray**. Vượt cap là diagnostic/lỗi, không nhận ray bị cắt ngắn như đúng.

Palette gán màu bounded [0,1]. Gradient lighting tùy chọn trong alpha lấy sáu mẫu phụ ở khoảng spacing và nhân màu bằng local diffuse; không đổi T. Đây **không phải** shadow/multiple-scattering solver. Preset White + lighting off dùng để kiểm công thức medium hằng.

Early chỉ alpha, **T<=0.0005**. Bound áp cho C/T linear và composed color linear với transfer/background bounded, không áp nguyên xi lên ảnh gamma/8-bit. Present alpha là C+T*background, rồi gamma một lần. Density tổng hợp không phải HU hoặc CT reconstruction; không có DICOM/y khoa.

## Điều khiển desktop

| Thao tác | Kết quả |
| --- | --- |
| Kéo / mũi tên | Orbit, không ghi vào volume |
| Wheel | Zoom, có thể tiến vào box; không đổi FOV |
| I / F | Eye tại origin / nhìn thẳng trục Z |
| 1 / 2 / 3 | MIP / average / alpha |
| P / N | Đổi dataset / 64³–128³ |
| Q / hai nút step | Đổi độ dài bước |
| +/- | Sigma, chỉ có ý nghĩa alpha |
| [ / ] | Cutoff trước reducer |
| C / L | Palette / local gradient lighting alpha |
| Shift+click trong scene | Chọn ray; sidebar không nằm trong ảnh |
| , / . | Lùi/tiến con trỏ sample của CPU trace |
| Space | Quay/dừng orbit tự động; mở ở trạng thái dừng |
| R | Đặt lại camera/transfer/ray, giữ dataset/N |
| Tab | Showcase toàn cửa sổ / mở lại Tools |
| B | Bắt đầu/hủy phép đo bốn step |
| Esc | Hủy job đang chạy; nếu không có job thì thoát |

Blur/minimize/reset và mất left-button mask nhả capture, dừng orbit. Đổi tham số/camera/dataset vô hiệu hóa kết quả benchmark cũ. Inspector là **CPU reference** của ray đang chọn, không phải log sample readback từ fragment shader; nó không tự chứng minh shader đúng.

## Đo chất lượng–thời gian

Benchmark dùng cùng dataset/N/camera/mode/cutoff/palette/lighting, early OFF; target **320×240**, step **0.08/0.04/0.02/0.008**, **một warm-up + năm repeats**. `GL_TIME_ELAPSED` đo draw volume trên GPU; báo median/IQR, **không gồm CPU fill/upload, readback, present/swap**.

Max error raw tại **48 pixel cố định** được so CPU fine step **0.002**. Đây là ước lượng ở những ray ấy, không là bound cho toàn ảnh hoặc oracle giải tích; midpoint sets không buộc error giảm đơn điệu. Canvas chỉ đo JavaScript CPU cho một ray, không dùng để kết luận GPU speedup/FPS.

Job gửi tối đa một draw mỗi tick, deadline tổng **15 s**, poll query tối đa **3 s**, có cancel. Cả app/CPU loop/GPU loop đều có ngân sách; watchdog không preempt một command GPU hoặc bảo đảm driver không treo. Không mở rộng benchmark bằng một dispatch/loop vô hạn.

## Kiểm tra hữu hạn

Pure tests không mở window; checks vẫn hoạt động trong Release. Có constant/slab giải tích ở ba mode, centre/corners/boundary, inside/parallel/miss, empty, sigma zero, layer order, actual 64³/128³, histogram, input guard và early bound.

`--verify-gpu` chỉ ở final/checkpoint 10: target **24×18** với texture **128³ thật**, sáu dataset, inside/outside, ba mode/nhiều step, tùy chọn cutoff/palette/early. So raw dimensionless output, abs tolerance **0.0025**, không so gamma screenshot. Trong app giới hạn kiểm 20 s; luôn thêm watchdog ngoài process.

```powershell
$program = (Resolve-Path '.\build\Release\project_54_final.exe').Path
$taskProcess = Start-Process -FilePath $program -ArgumentList '--verify-gpu' -PassThru -WindowStyle Hidden
if (-not $taskProcess.WaitForExit(30000)) {
    Stop-Process -Id $taskProcess.Id -Force
    throw 'GPU verification exceeded its 30-second process budget'
}
if ($taskProcess.ExitCode -ne 0) { throw 'GPU verification failed' }
```

Trong repository dùng ProcessSupervisor/guardian theo ARCHITECTURE.md, không chỉ timeout của lời gọi tool. Các CLI khác:

```powershell
.\build\Release\project_54_final.exe --hidden --frames 3 --seconds 10
.\build\Release\project_54_final.exe --hidden --capture volume.bmp --seconds 10
.\build\Release\project_54_final.exe --hidden --mode mip --capture mip.bmp --seconds 10
.\build\Release\project_54_final.exe --benchmark-gpu
```

`--capture` đọc framebuffer thật trước swap, tự dừng sau ba frame nếu chưa đặt `--frames`. Hỗ trợ `--mode mip|average|alpha`, `--preset 0..5`, `--size 64|128`, `--showcase`. Frame limit tối đa 600, seconds tối đa 60; `--smoke-gpu` dùng target nhỏ và không phải bằng chứng viewport cuối. Bọc mọi lượt tự động bằng supervisor hữu hạn.

## Checklist sử dụng và giới hạn bằng chứng

1. Mở final mặc định, xác nhận 128³/8 MiB và viewport lớn; Tab mở toàn cửa sổ, rồi khôi phục controls.
2. So ba mode trên cùng Cloud/Cores/Slab. F + Constant + sigma=2 + White/light off cho ray giữa dài 2, T=exp(-1).
3. Kéo/zoom/inside, Shift+click, tiến sample; tham chiếu đổi đúng và sidebar không pick thành scene.
4. Pause/Reset/blur/mouse-up ngoài cửa sổ không giữ capture; Reset giữ preset/N.
5. Chạy B đủ 4/4; thử hủy giữa chừng và đổi parameter. Bảng cũ phải mất hiệu lực.
6. Resize/DPI và bàn phím thật cần kiểm riêng, không suy ra chỉ từ build/CTest/GPU oracle hoặc synthetic SDL events.

Kiểm native input, browser/Canvas, thuật toán, benchmark và ZIP là các nhóm bằng chứng riêng. Ảnh chụp không thay executable; test số không tự chứng nhận UX/y khoa. Source/checkpoint/ZIP/ảnh/build/dependency sinh ra không đưa vào Git.
