# Project 53 — Scalar / Slice Workbench

## Từ starter tới chương trình của bạn

Bắt đầu từ tâm hốc của viên mã não tại (−16, −9, −14) mm. Chuyển XY → XZ → YZ, rồi xoay mẫu để kiểm mặt đang cắt. Giữ y = −9 và z = −14 mm. Ở 128³ với trilinear, x = −16 cho 0,015; x = −40 cho khoảng 0,928. Đây là số scalar của mẫu tổng hợp, không phải giá trị y khoa.

Giải nén ZIP vào một thư mục riêng, mở terminal cạnh CMakeLists.txt. CMake sẽ tạo thư mục work từ starter đúng một lần. Bạn viết tiếp trong đó qua tất cả các bài; không chép final lên bài làm.

```bash
cmake -S . -B build-work -DCOURSE_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_53_work --parallel 1
```

Với Visual Studio, mở build-work/Release/project_53_work.exe; với generator một cấu hình, mở build-work/project_53_work. Cuối học phần, build thêm target project_53_tests và chạy ctest --test-dir build-work -C Release --output-on-failure --timeout 20. Lần này CTest đọc header trong work/include, không đọc đáp án final/include.


Tự xây máy cắt lát một khối scalar 3D. Chương trình mở một viên đá mã não có vỏ thô, vành khoáng và hốc tinh thể, cho phép cắt theo XY/XZ/YZ, xoay góc nhìn rồi lần ngược một giá trị về tám voxel dùng để nội suy. Ba ảnh không phải ba dataset riêng.

Đây **không phải** DICOM, Hounsfield Units, ảnh bệnh nhân, ray marching hoặc CT reconstruction. Đơn vị mm được gán cho mẫu tổng hợp để kiểm hướng và tỉ lệ; scalar không có đơn vị y khoa.

## Chạy bản hoàn chỉnh

Cần compiler C++20, CMake 3.24 trở lên và kết nối mạng trong lần configure đầu để tải SDL **3.4.8** đã khóa SHA-256. Không cần Node.js để chạy source trong ZIP. Không dùng OpenGL/GLM, engine hoặc thư viện volume viewer.

```powershell
cmake -S . -B build
cmake --build build --config Release --parallel 1
.\build\Release\project_53_final.exe
```

Với generator single-config, executable nằm ngay trong `build/`; dùng `-DCMAKE_BUILD_TYPE=Release` khi configure. Phần trình bày dùng CPU và SDL3, không yêu cầu GPU compute. Không có cam kết FPS chung cho mọi máy.

## Cách học

Thử dựng ba ảnh cắt trước khi đọc lời giải. Lộ trình chín bài đi từ cửa sổ và ảnh đầu tiên → storage → ba hướng → trilinear → display → bối cảnh 3D → picking → cache/quét → kiểm chứng. Dành khoảng 12–16 giờ, gồm đọc, tự viết và kiểm tra; setup/build lần đầu tính riêng.

- `starter/`: shell SDL, chưa có volume hay lời giải sampler.
- `checkpoints/01..09/`: các chương trình độc lập, không cần chép đè hoặc ghép thủ công.
- `final/`: toàn bộ source của sản phẩm cuối.
- `tests/`: phép kiểm CPU không cần mở window; không dùng `assert` bị bỏ khi bật NDEBUG.
- `source-template/`: chỉ có trong repository giáo trình để sinh snapshot, không cần đưa vào ZIP; người tải ZIP học trực tiếp từ `checkpoints/` và `final/`.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --target project_53_checkpoint_4 --parallel 1
.\build\Debug\project_53_checkpoint_4.exe
```

Phần tự viết cốt lõi nằm trong `grid.hpp`, `volume.hpp`, `sampling.hpp`, `slice.hpp` và `display.hpp`. `camera.hpp`, `context-mesh.hpp` và `raster.hpp` là scaffold có source đầy đủ để đặt các lát trong không gian; bài 6 giải thích cách nối chúng, không bắt người học tự xây thêm một engine.

## Dữ liệu và quy ước

Bản cuối mặc định **128³ = 2.097.152 Float32 / 8 MiB**. Preset 64³ cấp phát đúng 262.144 mẫu / 1 MiB. World box luôn 160 × 192 × 224 mm, origin (-80,-96,-112); tại 128³, spacing là (1.25,1.5,1.75) mm. X đổi nhanh nhất: `index = x + nx * (y + ny * z)`.

Mỗi mẫu nằm tại `origin + (index + 0.5) * spacing`. Nearest tie lấy chỉ số lớn hơn. Truy vấn ngoài physical box trả miss; trong nửa voxel sát biên, sampler dùng mẫu tâm gần nhất ở biên. Trilinear cộng tám trọng số không âm, tổng một; nó không tạo lại chi tiết đã mất khi lấy mẫu.

- XY: x phải, y lên, giữ z.
- XZ: x phải, z lên, giữ y.
- YZ: y phải, z lên, giữ x.

Đây là quy ước toán của ứng dụng, không phải quy ước hiển thị radiology. Mỗi ảnh 256² dùng scalar đầy đủ. Vỏ định hướng dựng từ iso 0.12/stride 2, có zero padding riêng cho mesh và cap 240.000 triangle. Inspector không đọc mesh; 3D có shading nên không dùng màu trên vỏ để đo scalar.

## Điều khiển desktop

| Thao tác | Kết quả |
| --- | --- |
| Dataset / phím 1–5 | Mẫu vật, Sphere, Gaussian, Layers, Ramp |
| N | Đổi 64³/128³, giữ kích thước world |
| T / C / O | Nearest–trilinear / palette–gray / cắt mở–nguyên khối |
| Kéo trong khối 3D / wheel | Orbit / zoom; không đổi probe |
| Ctrl+mũi tên / +/- / Home | Camera bằng bàn phím |
| Click/drag trên ảnh | Chọn hai tọa độ; giữ tọa độ vuông góc với ảnh |
| Tab, mũi tên, PageUp/Down | Chọn view; dời probe ngang/dọc; dời lát |
| Ba thanh XY/XZ/YZ | Dời z/y/x theo mm |
| J/K, U/I hoặc thanh tương ứng | Level, window width; không sửa scalar |
| Space/Q | Quét/dừng theo view đang chọn, 12 mm/s |
| R | Đặt lại probe, camera và window; giữ dataset/độ phân giải |
| V | Audit storage và fixture affine, không chứng nhận giao diện hay y khoa |
| Esc | Thoát |

Quét bị chặn dt animation ở 0.05 s và dừng khi tới biên. Blur dừng quét/hủy capture. Nạp dataset chuẩn bị volume/mesh/statistics mới trước khi thay state; lỗi giữ dữ liệu cũ. Raw slice, RGBA và upload texture có cache riêng; không fill N³ mỗi frame.

## Kiểm chứng

```powershell
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_53_final.exe --verify --frames 3 --seconds 10
.\build\Release\project_53_final.exe --hidden --capture specimen.bmp --seconds 10
```

`--capture` tự dừng sau ba frame nếu chưa đặt `--frames`; đọc pixels sau vẽ/trước present, không readback mỗi frame. `--frames` giới hạn 600, `--seconds` giới hạn 60. Có thể chọn `--size 64` hoặc `--preset 1` (0–4 theo thứ tự trên). Khi kiểm tự động, luôn dùng thêm process supervisor/guardian của repository, không coi giới hạn trong app là thay thế watchdog độc lập.

Fixture 3×2×4 lưu `x+10y+100z`; đáp số tại (1,0,3) mm là 50.5. Test affine dùng các giá trị biểu diễn chính xác bằng Float32, tính trọng số bằng double và ngưỡng scalar tuyệt đối 1e−10. Có kiểm tâm/cạnh/góc/sáu mặt biên, singleton, NaN/Inf, allocation 64³/128³, histogram, đối xứng và display không sửa data. Không áp epsilon ấy cho mọi dataset hoặc đại lượng khác.

### Checklist tương tác

1. Dời từng slider; đúng ảnh giữ trục, hai crosshair còn lại dời tương ứng.
2. Chọn điểm trên ảnh rồi orbit/zoom: probe/scalar giữ nguyên. Click vùng trống ngoài ảnh không dời điểm.
3. So nearest/trilinear tại cùng world point, xem tám giá trị/trọng số. Đổi window/palette không đổi chúng.
4. Quét, dừng, reset, đổi preset/resolution và alt-tab khi đang kéo. Không còn capture hoặc quét âm thầm.
5. Resize/DPI/letterbox không làm lệch điểm chọn; Esc vẫn thoát.

Kết quả CTest, smoke vài frame, kiểm thao tác OS và đánh giá chất lượng hình ảnh là các bằng chứng riêng. Không coi cửa sổ mở được là đã kiểm hết checklist. Source sinh, ZIP, build, thư viện SDL và ảnh nghiệm thu không đưa vào Git.
