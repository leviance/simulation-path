# Project 48 — Bản đồ gió

Một công cụ quan sát trường vector 2D bằng C++20 và SDL 3.4.8: mũi tên, gradient, divergence, curl, inspector và hạt đánh dấu. Miền world là [−2,2] × [−1,5;1,5], y hướng lên. Chương trình mở ở trạng thái tạm dừng.

## Build và chạy

ZIP đã có CMake, starter, chín checkpoint, final và tests. Trong repository website, chạy `npm run generate:course` trước để sinh các bản source.

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Windows/Visual Studio: chạy `build/Debug/project_48_final.exe`. Target final và tests được build mặc định; `BUILD_CHECKPOINTS=ON` thêm starter và `project_48_checkpoint_1` đến `project_48_checkpoint_9`.

```sh
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Linux/macOS với generator một cấu hình: chọn `-DCMAKE_BUILD_TYPE=Debug` khi configure, executable nằm trực tiếp trong `build/`; dùng một build directory khác cho Release. CMake dùng FetchContent khóa SDL 3.4.8 và link `SDL3::SDL3`.

## Lộ trình

| Mốc | Nội dung mới |
| --- | --- |
| Starter | Window, renderer, logical presentation, event loop |
| 01 | Vec2, lưới nút, mũi tên và world/screen |
| 02 | Gió đều, source, sink, rotation, shear và inspector |
| 03 | Scalar bowl/hill, đạo hàm riêng và gradient |
| 04 | Divergence và màu có dấu |
| 05 | Curl z, dấu quay và shear |
| 06 | So gradient với đáp án giải tích, tinh lưới, sai số mép |
| 07 | Bilinear, midpoint RK2 và fixed timestep cho tracer |
| 08 | Một xoáy Gaussian có tâm kéo bằng chuột |
| 09 | Validator riêng, tests độc lập và bản hoàn chỉnh |

Source chuẩn nằm ở `source-template/`; starter/checkpoints/final được sinh tự động và không đưa vào Git. Trong ZIP, có thể viết tiếp ngay trong starter.

## Điều khiển bản hoàn chỉnh

- `P`: Uniform, Source, Sink, Rotation, Shear, Gradient; `H`: scalar Bowl/Hill.
- `L`: lớp Arrows/Potential/Divergence/Curl; thang màu cố định −2..2, inspector đọc số chưa clamp.
- Chuột hoặc phím mũi tên: chọn nút; `I`: in tọa độ, vector, scalar và đạo hàm ra terminal.
- `G`: lưới 33×25 hoặc 65×49; `I` báo sai số gradient trong miền và mép khi preset Gradient và không có xoáy.
- `Space`: chạy/dừng hạt; `N`: tiến một bước 1/60 giây.
- Kéo chuột trái hoặc `Enter`: đặt tâm xoáy; `B`: bật/tắt; `S`: đổi dấu xoáy.
- `R`: khôi phục scene, lưới và lớp màu ban đầu; `V`: kiểm chứng trên field riêng; `Esc`: thoát.

Đổi preset, scalar, lưới hoặc xoáy sẽ dừng và gieo lại hạt. Mất focus dừng chuyển động, hủy kéo chuột và xóa accumulator. Resize không đổi miền world hoặc số nút.

## Mô hình và giới hạn

Grid lưu mẫu tại nút, gồm cả hai đầu miền. Vì vậy dx=4/(width−1), dy=3/(height−1). Đây là cách lấy mẫu khác với lưới cell-centered của Project 47.

Gradient(phi)=(∂phi/∂x,∂phi/∂y); div(v)=∂vx/∂x+∂vy/∂y; curl_z(v)=∂vy/∂x−∂vx/∂y. Đạo hàm trong miền dùng sai phân trung tâm; mép dùng sai phân một phía ba điểm bậc hai. Curl dương tương ứng ngược kim đồng hồ trong world y lên. Trong trường quay cứng, curl bằng hai lần tốc độ góc.

Scalar độc lập với vector, trừ khi chọn preset Gradient. Hill có phi=exp(−x²−y²); bowl có phi=(x²+y²)/2. Màu bão hòa và độ dài mũi tên bị giới hạn chỉ phục vụ hiển thị, không sửa dữ liệu.

128 tracer dùng bilinear và midpoint RK2; hạt ra khỏi miền hoặc quá tám giây được gieo lại. Mật độ chấm không đại diện cho bảo toàn khối lượng. Scheduler nhận tối đa 0,25 giây/frame, thực hiện tối đa tám bước rồi báo thời gian bỏ qua.

Xoáy thêm vào nền bằng `strength*exp(−|q|²/0.55²)*(−qy,qx)`. Chỉ có một tâm, strength bằng ±2. Mỗi thay đổi dựng lại nền rồi cộng một lần, không phụ thuộc số event chuột. Đây là trường được cho trước; chưa có giải pressure hoặc Navier–Stokes.

## Kiểm chứng

Tests không mở window và không dùng assert bị tắt trong Release. Các oracle gồm đạo hàm giải tích của trường affine, gradient bowl/hill, quỹ đạo quay giải tích, bilinear của trường affine và lịch 15/30/120 FPS. Validator `V` kiểm trường tuyến tính, curl(gradient) và giảm sai số khi tinh lưới; nó không khẳng định mọi tham số tương tác đã được kiểm.
