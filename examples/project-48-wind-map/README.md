# Project 48 — Bản đồ gió

Tự xây một công cụ quan sát trường vector 2D bằng C++20/SDL 3.4.8. Bạn sẽ nhìn cùng một trường qua mũi tên, gradient, divergence, curl và tracer: hình nào cho thấy hướng chuyển động, hình nào cho thấy độ dốc, hình nào đo sự tỏa/hút hoặc xu hướng quay?

Bản cuối mở ở **65×49 = 3.185 nút thật**, trong miền [−2,2]×[−1,5;1,5], y hướng lên. Có inspector và legend ngay trong cửa sổ, 128 tracer/vệt 24 vị trí, preset và xoáy đặt bằng chuột. 221 glyph là tập con để đọc hình, không phải toàn bộ dữ liệu. Có tùy chọn 129×97=12.513 nút; 33×25 chỉ là lưới học, không phải mốc nghiệm thu.

## Trước khi xem lời giải

Hãy thử dựng một cửa sổ có bản đồ gió đều, tỏa/hút và xoay. Cho người dùng đổi trường, chọn một nút, bật lớp divergence/curl và thả hạt. Kết quả phải tính từ dữ liệu, không gán sẵn một màu cho mỗi preset. Tại gốc, nguồn (x,y) có vector 0 nhưng divergence 2: riêng độ lớn vector không đủ giải thích hiện tượng.

Cần nền SDL/input/toạ độ và vector 2D của Project 01–09. Sai phân, đạo hàm riêng, nội suy và RK2 được giải thích trong chín bài; không cần OpenGL, Navier–Stokes hoặc tự ghép ZIP trước đó. Dự kiến khoảng 15 giờ: 4 giờ đọc, 8 giờ viết, 3 giờ kiểm; setup/build không tính vào thời lượng này.

## Build độc lập

ZIP có CMake, starter, checkpoints/01..09, final, README và tests; không cần Node.js để học C++. Trong repository website, sinh các output trước bằng `npm run generate:course`. Không chỉnh source đã sinh trong repository; khi tự học từ ZIP, có thể viết tiếp trong starter.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Visual Studio 2022/x64: chạy `build/Debug/project_48_final.exe`. Final và tests là target mặc định; `BUILD_CHECKPOINTS=ON` thêm starter và `project_48_checkpoint_1`..`9`. Muốn kiểm riêng bài 3: `cmake --build build --config Debug --target project_48_checkpoint_3 --parallel 1`.

Linux/macOS với generator một cấu hình: thêm `-DCMAKE_BUILD_TYPE=Debug` lúc configure, executable nằm ngay trong build; dùng thư mục khác cho Release. CMake tối thiểu 3.24, compiler hỗ trợ C++20. FetchContent dùng URL/SHA-256 khóa SDL 3.4.8 và luôn link `SDL3::SDL3`. Không cần SDL_ttf, engine hoặc assets bên ngoài.

## Học qua những thay đổi nhìn thấy được

| Bài | Phần tự xây và kiểm |
| --- | --- |
| 01 | Đọc Field/Vec2, đổi world/screen, vẽ mũi tên và xử lý vector 0 |
| 02 | Preset, Scene→Field, chuột/mũi tên chọn nút và inspector |
| 03 | Scalar bowl/hill, đạo hàm riêng, gradient và lớp xem riêng |
| 04 | Divergence từ chênh lệch dòng, màu có dấu |
| 05 | Curl z, dấu quay, rotation khác shear |
| 06 | Sai phân mép, oracle giải tích, tinh lưới và đo sai số |
| 07 | Lưới 65×49, bilinear/RK2, scheduler, tracer và vệt hữu hạn |
| 08 | Xoáy Gaussian, probe/edit riêng, mouse capture và tái tạo trường |
| 09 | Validator trên dữ liệu riêng, CTest và bản hoàn chỉnh |

Scaffold cung cấp window, renderer, panel dùng chữ ASCII của SDL_RenderDebugText, dispatch input và cấu trúc Workshop. Field được khai báo sẵn để scaffold mở được; từng thuật toán được thêm theo bài, không giấu solver hoàn chỉnh trong starter. `main → handleInput → Workshop → drawWorkshop` là đường gọi chính. `view.hpp` chỉ hiển thị; `field.hpp`, `derivatives.hpp`, `scenes.hpp`, `particles.hpp`, `diagnostics.hpp` là phần toán; `input.hpp` và `panel.hpp` không thay công thức.

## Điều khiển

- P/nút PRESET: Uniform, Source, Sink, Rotation, Shear, Gradient. H: Bowl/Hill.
- L/nút OVERLAY: velocity arrows, scalar phi, gradient phi / độ lớn, divergence v, curl z của v. Lớp gradient không ghi lại vx/vy. Chỉ preset Gradient dùng gradient làm vận tốc.
- Chuột hoặc mũi tên: chọn nút; inspector đọc mẫu tại nút gần nhất, không giả là nội suy ngay tại con trỏ. G: 33×25→65×49→129×97.
- Space: chạy/dừng; N: dừng rồi tiến 1/60 giây; T: bật/tắt tracer và dừng. Bật lại không tự chạy. F1: xem sạch/hiện probe.
- M: chọn đọc nút hoặc đặt/kéo xoáy. Trong edit, kéo trái đặt tâm; Enter đặt xoáy tại nút bằng bàn phím. B bật/tắt, S đảo dấu strength ±2. Chuột ngoài bản đồ/letterbox không sửa field.
- R khôi phục đúng preset, lưới, layer và tracer ban đầu của checkpoint. V kiểm reference trên field riêng, dừng nhưng không sửa tick/field hiện tại. Esc thoát.

Đổi preset/scalar/lưới/xoáy bắt đầu thí nghiệm mới: pause, gieo lại tracer, tick 0. Đổi overlay hoặc clean view không đổi field/quỹ đạo. Resize không đổi miền; mất focus hủy kéo, release capture và pause.

## Mô hình và những điều không nên suy ra từ hình

Lưới **node-centered**, gồm cả hai đầu miền: dx=4/(width−1), dy=3/(height−1). Khác lưới cell-centered ở 47. Sai phân trong miền dùng hai phía, ở mép dùng một phía ba điểm bậc hai. Đây là cách lấy đạo hàm dữ liệu đã biết, không phải điều kiện biên cách nhiệt/tường rắn của một PDE.

Gradient(phi)=(∂phi/∂x,∂phi/∂y), divergence(v)=∂vx/∂x+∂vy/∂y, curl_z(v)=∂vy/∂x−∂vx/∂y. Curl dương ngược kim đồng hồ theo world y lên; quay cứng cho curl = 2omega, shear(y,0) vẫn có curl −1 dù đường dòng thẳng. Gradient phi độc lập với velocity, trừ khi người dùng chọn velocity=gradient phi.

World unit và giây mô hình là đơn vị quy ước, không phải dự báo thời tiết. Velocity: world unit/s; div/curl: 1/s. Khi gán velocity=gradient(phi), phi mang world unit²/s. Thang màu cố định −2..2; giá trị lớn hơn chỉ bão hòa màu. Giới hạn nét mũi tên không đổi độ lớn vận tốc. Lớp Gradient tô |gradient| ≥ 0, không phải phi hoặc curl.

Tracer dùng bilinear trên vx/vy và midpoint RK2 dt=1/60. Ra ngoài miền, có dữ liệu không hữu hạn, hoặc quá 8 s thì gieo lại theo seed cố định và xóa vệt. Đây không phải chất lỏng có khối lượng: mật độ chấm không đo bảo toàn, pressure hoặc một phân bố hạt ổn định. Scheduler nhận tối đa 0,25 s/frame, thực hiện tối đa 8 bước và báo thời gian bỏ qua; không chạy bù vô hạn.

Xoáy là `strength*exp(-|q|²/0.55²)*(-qy,qx)`, q=p−center. Có đúng một tâm; thay đổi tâm dựng lại nền rồi cộng một lần, không tích lũy theo số event chuột. Divergence giải tích của phần xoáy bằng 0; sai phân vẫn có sai số, không ép giá trị về 0. Chưa có pressure solve, advection velocity hoặc Navier–Stokes; đó là phạm vi Project 49.

## Kiểm chứng và chạy hữu hạn

Tests CPU không cần SDL/window, không dùng assert bị tắt trong Release. Oracle gồm trường affine, scalar bậc hai/Gaussian, bilinear affine và quỹ đạo quay giải tích. Lỗi gradient là max norm vector, tách interior/boundary; div/curl affine dùng absolute tolerance 1e−10, NaN/Inf luôn fail. Refinement 33×25→65×49 giữ miền và giảm spacing một nửa, yêu cầu lỗi Gaussian giảm hơn 3 lần, không coi tỉ số 4 là đẳng thức. Curl(gradient)≈0 kiểm quan hệ toán tử, không tự chứng minh gradient đúng.

```sh
build/Release/project_48_final.exe --verify
build/Release/project_48_final.exe --hidden --run --seconds=1 --capture=wind.bmp
```

`--verify` là CPU command độc lập. Hidden/capture bắt buộc `--seconds` hữu hạn trong [0.05,60]; cờ sai trả lỗi. Smoke tự thoát không thay kiểm chuột/phím thật. Lưới tối đa 129×129, tracer 128, vệt 24, số bước/frame 8; dữ liệu không lớn lên trong lúc chạy. Không hứa FPS chung hoặc dùng tốc độ Canvas thay kết quả C++.

## Đóng góp source

Nguồn authored là `source-template/` và `tests/`. Generator tạo snapshots/CMake/JSON/ZIP ngoài Git. Code block trong MDX gắn `// [snippet id]`; sau khi sửa, chạy `node scripts/generate-checkpoints.mjs --project=48` rồi `node scripts/sync-marked-snippets.mjs --project=48`. Thêm `--check` để đối chiếu read-only. Không sửa test/tolerance để che việc source hoặc công thức sai.
