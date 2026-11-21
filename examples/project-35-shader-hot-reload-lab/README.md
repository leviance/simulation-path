# Project 35 — Nắng qua cửa chớp

Đứng trong căn phòng, nghiêng tám lá cửa rồi đẩy chiếc hộp vào một dải nắng. Hai điểm trên sàn có cùng pháp tuyến nhưng chỉ một điểm được chiếu sáng. Chính vật chắn, không phải màu sơn hay hướng mặt sàn, tạo ra sự khác biệt ấy.

**Thử làm trước khi đọc:** bắt đầu từ một mesh hộp của Project 34. Vẽ căn phòng từ phía Mặt Trời, giữ lại bề mặt gần nhất trên mỗi tia, rồi dùng dữ liệu ấy khi vẽ lại từ mắt người. Đừng vẽ sọc lên sàn: nếu đẩy hộp ngang qua, ánh sáng phải chuyển từ sàn lên mặt hộp và bóng cũ phải biến mất.

## Chạy sản phẩm hoàn chỉnh

Cần C++20, CMake 3.24+, SDL 3.4.8 và driver OpenGL 3.3 Core. ZIP tự chứa toàn bộ C++ và shader. Theo mặc định FetchContent tải SDL ở lần cấu hình đầu; không cần tải model hay texture. Với Visual Studio 2022, chạy trong thư mục chứa CMakeLists.txt:

```sh
cmake -S . -B build
cmake --build build --config Release --target project_35_final project_35_tests --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_35_final.exe
```

Với Ninja một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi cấu hình; chạy `./build/project_35_final`. Máy đã có SDL đúng phiên bản có thể thêm `-DCOURSE_USE_INSTALLED_SDL3=ON -DSDL3_DIR=<thư-mục-SDL3Config.cmake>`. Không có OpenGL desktop thì CTest toán học vẫn không cần mở cửa sổ; ảnh minh họa web không thay cho kiểm driver.

## Tự xây trong work/

1. Chạy `cmake -S . -B build-work -DCOURSE_WORKBOOK=ON`. Lần đầu CMake sao chép starter/ thành work/. Cấu hình lại không ghi đè bài làm.
2. Chạy `cmake --build build-work --config Release --target project_35_work --parallel 1`, rồi mở `.\build-work\Release\project_35_work.exe`. Mốc đầu chỉ có sàn; mở bài 01 trên web và sửa các file được chỉ trong **work/**.
3. Theo bảy mốc: căn phòng → lá nghiêng và hộp di chuyển → depth texture thật → phép so hai độ sâu → bias và PCF → nạp GLSL an toàn → kiểm camera, pixel và lỗi driver.
4. Tại mốc cuối chạy `cmake --build build-work --config Release --target project_35_check_work --parallel 1` và `.\build-work\Release\project_35_work.exe --verify`. Mục CTest có nhãn learner và đọc đúng header work/, không chạy hộ lời giải.
5. Muốn đối chiếu một mốc, bật `-DBUILD_CHECKPOINTS=ON` và build target `project_35_checkpoint_4` (đổi số theo bài). `final/` là toàn bộ mã hoàn chỉnh, không phải một danh sách snippet.

## Trong cửa sổ C++

| Thao tác | Bạn sẽ thấy gì? |
| --- | --- |
| Kéo trái hoặc ←/→; 1/2/3 | Nghiêng lá hoặc mở 42°, hé 23°, khép −38° so với hướng nắng mặc định. |
| A/D; Q/E | Dịch hộp theo X; xoay hướng nắng. Không di chuyển mắt. |
| Kéo phải hoặc J/K, W/S; cuộn hoặc +/− | Xoay ngang, nâng/hạ góc nhìn và zoom. Bóng không chạy theo camera. |
| Space, N, R | Chạy/dừng thay đổi góc lá; tiến một bước; đặt lại cảnh. Esc khi đang kéo hủy thao tác, nếu không thì thoát. |
| V; H | Xem texture độ sâu; bật/tắt phép so bóng. Tắt H không xóa vật liệu hoặc nguồn sáng. |
| F; [ và ] | So biên cứng với chín mẫu PCF; giảm/tăng bias và quan sát chân hộp. |
| M; Tab | Chuyển thành phẩm, depth, phần thấy nguồn sáng, Lambert; bật/tắt bảng thông số. |
| F5; Page Up/Down | Thử nạp lại room.vert và room.frag, đọc log khi lỗi. Thư mục shader đúng target được in ở terminal. |

## Kiểm một điều, giữ những điều khác đứng yên

- Giữ preset hé. Hai điểm ở `x=-0.8` trên sàn, `z≈2.541` và `z≈2.732`, lần lượt dưới lá thứ tư và dưới khe. Lớp visibility cho tối và sáng; lớp Lambert cho hai điểm cùng độ sáng.
- Ở `x=1.03, z≈2.732`, dịch hộp từ `x=0.35` sang `-1.4`: chỗ cũ nhận nắng trở lại. Chỉ đổi camera thì điểm thế giới giữ nguyên bóng.
- CTest đối chiếu ray với các hộp đã xoay. `--verify` thực sự đọc depth texture và pixel màu, so mở/khép, rồi tạo lỗi compile, link và kiểu uniform trong bộ nhớ; program cũ phải tiếp tục vẽ. Với GLSL tự sửa, luôn giữ một bản hợp lệ để khôi phục.
- Chụp trực tiếp back buffer, chẳng hạn `project_35_final --preset ajar --capture shutter.png`. Preset: open, ajar, closed, moved. Lớp: `--view depth|visibility|lambert|unshadowed|beauty`. Dùng `--camera left` hoặc `--camera right` để chụp cùng cảnh từ hai bên; mặc định góc trái thấy cả mặt trên lẫn hông hộp nhận nắng. `--smoke` chạy ba frame rồi thoát.
- Canvas là **mặt cắt hình học và bảng độ sâu một chiều**. Nó không chạy GLSL, không thay phép đo GPU. PCF làm mượt biên của bản đồ có độ phân giải hữu hạn, không phải mô phỏng ánh sáng thể tích.

## Tìm mã ở đâu?

- `include/shutter_scene.hpp`, `room_mesh.hpp`: hộp đơn vị, trục lá và hai phép nhìn.
- `include/shadow_target.hpp`, `room_drawing.hpp`: framebuffer, lượt đèn, lượt mắt; cùng danh sách vật thể cho cả hai.
- `shaders/depth.*`, `shaders/room.*`: ghi vật gần nhất, nhận/so độ sâu, bias, PCF và các lớp kiểm.
- `include/shader_renderer.hpp`, `shader_files.hpp`: compiler thật, reflection, bản hợp lệ gần nhất và watcher.
- `src/main.cpp`, `include/shader_application.hpp`, `shader_input.hpp`, `shader_overlay.hpp`, `shader_validation.hpp`: cửa sổ, thao tác, HUD và nghiệm thu. Không dùng tài nguyên ngoài hoặc yêu cầu các ZIP trước.
