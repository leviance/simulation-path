# Project 56 — Máy CT đồ chơi

Quay nguồn và detector phẳng quanh một phantom 2D, đo từng projection rồi dựng sinogram. Sản phẩm là dữ liệu forward projection, **chưa tái dựng ảnh CT**. Không thiết bị phát tia, dữ liệu y khoa hoặc công cụ chẩn đoán.

## Lộ trình chín bài

Thử tự làm trong 120–180 phút trước khi đọc lời giải. Dự kiến cả module 12–16 giờ; cần SDL3/input (01–05), normalized ray (52), Beer–Lambert và ảnh log (55).

1. Chạy starter rồi vẽ đĩa phantom bằng SDL_RenderFillRect.
2. Dựng basis radial/tangent, quay nguồn và detector cùng nhau.
3. Tính chord của đĩa và clip đoạn source→detector.
4. Cộng optical depth, tạo 128 số đo mono T/p ở một góc.
5. Lưu nhiều góc theo row-major, phân biệt NaN chưa đo và p=0.
6. Quét tối đa hai hàng/frame, pause/reset và xóa dữ liệu khi vật lý đổi.
7. Suy ra vệt điểm fan-beam, không dùng nhầm đường sin parallel-beam.
8. So 30/60/120 góc tại các góc vật lý chung.
9. Kiểm với oracle hình tròn và chạy bản hoàn chỉnh.

Mỗi checkpoint chạy độc lập. Giữ toàn bộ include/src của snapshot, không chỉ chép main.cpp. Bài học trên website có code theo từng thay đổi và toàn bộ source cuối bài/module.

## Build và chạy

C++20, CMake 3.24+, SDL3 khóa 3.4.8 bằng FetchContent và SHA256; link SDL3::SDL3. Windows dùng Visual Studio 2022 với Desktop development with C++.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows chạy build/Debug/project_56_final.exe. Final mặc định; BUILD_CHECKPOINTS bật starter và project_56_checkpoint_1…9. Single-config generator chọn CMAKE_BUILD_TYPE khi configure, executable trực tiếp trong build. Không cần assets ngoài source/SDL runtime.

Pure CTest không window hay SDL_Init, dùng explicit checks hoạt động cả Release/NDEBUG. SDL smoke mở hidden window và render một frame, không thay thế kiểm tương tác desktop:

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_56_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru -RedirectStandardOutput "smoke.log" -RedirectStandardError "smoke-error.log"
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "SDL smoke vượt 30 giây."
}
Get-Content "smoke.log"
Get-Content "smoke-error.log"
if ($smoke.ExitCode -ne 0) { throw "SDL smoke thất bại." }
```

Không tự lặp khi timeout; automation cần total timeout và cleanup process tree. Timeout không bảo đảm preempt graphics driver. Không benchmark lớn hoặc vòng quét vô hạn.

## Điều khiển

- Mở paused. Left/Right chọn pixel, Up/Down chọn góc từ Bài 02.
- P chọn phantom; W/S đổi strength 0..2 từ Bài 04.
- N đo đúng một hàng; I đảo palette, L đổi display range 1..4 từ Bài 05.
- Space quét/tiếp tục/dừng từ Bài 06, tối đa 2 hàng×128 tia/frame; hoàn tất tự dừng.
- T bật trace của điểm (.65,.3) từ Bài 07; chọn phantom đĩa lệch tâm để đối chiếu.
- Q chọn 30/60/120 góc từ Bài 08, xóa lượt cũ.
- V chạy oracle nhỏ từ Bài 09. R reset thông số và dữ liệu; Escape thoát.
- Click/kéo sinogram từ Bài 05 chọn ô; input được đổi sang logical coordinates, bỏ letterbox. Blur/minimize hủy capture và dừng, không tự resume.

Mở ứng dụng có hàng 0 đo sẵn từ Bài 05; reset hoặc đổi vật lý tạo dữ liệu toàn NaN, không tự đo lại. Title tách preview p/T và stored p (hoặc UNMEASURED). Chọn hàng chưa đo chỉ tính preview, không thêm dữ liệu.

Canvas cùng công thức/biến: DPR, pointer capture, keyboard và reduced-motion. Reduced motion chỉ cho đo từng hàng, không tự resume khi tắt. Canvas không benchmark C++/GPU. Đổi palette/range không sửa dữ liệu; resize không tăng resolution.

## Quy ước mô hình

Lát cắt XY, y lên. θ=0 có nguồn (4,0), detector centre (-4,0), chiều tăng pixel (0,1). radial=(cosθ,sinθ), tangent=(-sinθ,cosθ); S=4r, D=-4r, Q=D+s*t, s=8*(u-.5). Direction normalized, maximum=|Q-S|, beam length≤12. 128 pixel dùng u=(column+.5)/128, không có pixel đúng tia tâm liên tục u=.5.

Phantom 1–3 đĩa, centre/radius/mu hữu hạn, radius>0, mu 0..2, |centre|+radius≤1.5. Detector width 8 bao phủ phantom trong hình học này. Các insert cộng mu, không thay nền. measure kiểm beam/scene/strength; chordLength là helper nhận đầu vào đã validate. tau=sum(strength*mu*L), T=exp(-tau), p=-ln(T). Bound bảo thủ tau≤36 nên T vẫn dương, không cần log floor trong miền hỗ trợ. Không suy từ byte màu về p.

Scan 30/60/120 góc, θ=2π*row/views trên [0,2π), không hàng 360°. Sinogram values[column+128*row] lưu p. NaN=chưa đo, acquired=số hàng hoàn chỉnh. Scan chụp settings/scene. Đổi preset/strength/views tạo scan mới; chọn cell/góc, invert, range/trace không thay measurement.

Fan-beam detector phẳng: điểm P có p_r=dot(P,r),p_t=dot(P,t), offset s=8*p_t/(4-p_r). Vệt không phải đường sin thuần và không áp quy tắc θ+π đảo cột. Trace là vị trí điểm, không intensity hoặc cực đại bắt buộc của đĩa hữu hạn. Phantom ở tâm có các hàng giống nhau; đĩa lệch tâm giúp nhìn angular sampling. Row j của 30 góc khớp row 4j của 120, không cùng index.

Oracle hình tròn r=1, mu=.5: h=4*abs(s)/hypot(8,s); p=sqrt(1-h²) nếu h<1, ngược lại 0. Kiểm 30×128 ray, max error≤1e-10, không gọi lại chordLength để tạo expected. Tests thêm norm/endpoint, miss/tangent/inside/clip, overlap/order, finite/bounds/budget, scan snapshot/completion và ray qua pointOffset.

## Phạm vi và source

Mô hình mono lý tưởng, một ray tại tâm mỗi pixel; không tích phân diện tích detector, noise, scattering, inverse-square response, phổ đa năng lượng, HU/DICOM hay reconstruction. Không phải mô phỏng thiết bị CT đã hiệu chuẩn. Không lấy inverse Radon parallel-beam áp trực tiếp vào fan-beam rồi gọi kết quả chuẩn.

source-template/tests/README là authored inputs. Starter/checkpoints/final/CMake/ZIP do generator sinh, không đưa vào Git của website. Kiểm desktop riêng mouse/keyboard/resize/DPI/letterbox/blur/reset; CTest/smoke không chứng nhận các tương tác này.

Tham khảo [ASTRA 2D geometries](https://astra-toolbox.com/docs/geom2d.html), [scikit-image Radon](https://scikit-image.org/docs/stable/auto_examples/transform/plot_radon_transform.html), [SDL_LockTexture](https://wiki.libsdl.org/SDL3/SDL_LockTexture).

Tiếp theo: Project 57 — Mưa photon ngẫu nhiên, theo dõi hấp thụ, tán xạ và thoát bằng Monte Carlo trong 2D.
