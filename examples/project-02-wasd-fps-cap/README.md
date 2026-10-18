# Project 02 — Điều khiển nhân vật & Giới hạn tốc độ khung hình 60FPS

Nối tiếp framebuffer của Project 01: tự tô ô vuông bằng putPixel, đọc WASD, đo lỗi phụ thuộc FPS, sửa bằng delta time và tự viết FPS limiter. SDL phụ trách window/input/clock/texture presentation; không dùng SDL_RenderFillRect để thay phần tô hình.

## Thử tự làm trước khi đọc lời giải

- Tô hình 34×34, điều khiển bằng WASD, thả phím thì dừng; phím đối nghịch triệt tiêu.
- Đi chéo không nhanh hơn đi ngang; giữ cả player trong ảnh.
- Đo dt theo giây; tự giới hạn FPS mặc định 60, bật/tắt bằng F1.
- Hiển thị FPS thực và có phép đo đúng năm giây không bị biên cắt quãng đường.
- Resize không bóp méo hình; mất focus/minimize không gây bước nhảy khi trở lại.
- Cùng năm giây ở 30/60/120 FPS cho gần 900 px nếu không có dt bị clamp; giải thích giới hạn của điều kiện này.

## Build và chạy

C++20, CMake 3.24+, compiler hỗ trợ C++20. Windows: Visual Studio 2022, workload Desktop development with C++. Lần configure đầu cần mạng để tải SDL **3.4.8**, kiểm SHA-256 bằng FetchContent và link SDL3::SDL3.

Từ thư mục chứa CMakeLists.txt:

```bash
cmake -S . -B build
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
```

Windows:

```powershell
.\build\Debug\project_2_final.exe
```

Ninja/Makefiles: thêm -DCMAKE_BUILD_TYPE=Debug khi configure; executable thường là ./build/project_2_final. Dùng hai thư mục build riêng cho Debug/Release nếu generator chỉ hỗ trợ một cấu hình.

## Điều khiển và số đo

| Phím | Kết quả |
| --- | --- |
| WASD | Di chuyển; hướng chéo chuẩn hóa |
| 1 / 2 / 3 | Final: cap 30/60/120 FPS; checkpoint 3–4: delay thí nghiệm 33/16/8 ms |
| 0 | Final: uncapped |
| F1 | Final: bật/tắt mức cap gần nhất, không nhận repeat |
| B | Checkpoint 3+: chạy lại phép đo tham chiếu 5 giây, WASD vẫn điều khiển player |
| R | Checkpoint 3+: đặt lại player, quãng đường WASD và phép đo |
| Escape / Close | Thoát sạch |

Title: FPS thực, cap (0=off) hoặc delay, WASD distance, TEST/DONE elapsed/distance, dropped seconds. WASD distance đo sau clamp biên; phép đo B gọi cùng hàm update trên vật tham chiếu không có biên. Nó không tự điều khiển player và không chứng minh SDL nhận phím vật lý. Không đổi mức FPS trong một phép đo nếu muốn so các mức riêng biệt.

## Các chặng học và mã đầy đủ

1. Starter có nền trống; checkpoint 1 thêm fillRectangle và WASD đổi màu, chưa normalize/chuyển động.
2. Normalize hướng chéo; position, velocity, bước /60 cố ý sai và clamp player.
3. Đồng hồ SDL, FPS thật, đối chứng 5 giây ở nhiều delay.
4. Update theo dt; báo phần thời gian bị bỏ; phép đo dùng cùng update.
5. Bỏ delay thí nghiệm, tự tính phần nghỉ; 30/60/120/uncapped.
6. Test thuần C++, final đầy đủ và native smoke hữu hạn.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Mặc định build final và tests. BUILD_CHECKPOINTS bật starter và project_2_checkpoint_1 … project_2_checkpoint_6. Mỗi snapshot có source độc lập. Trong repository website, starter/checkpoints/final/CMakeLists được sinh từ source-template; không sửa output bằng tay. ZIP đã chứa các file này nên không cần Node.js để build C++.

## Tổ chức source

- include/framebuffer.hpp: ảnh logic 960×540, RGBA, putPixel, tự tô hình có clipping.
- include/presentation.hpp: streaming texture RGBA8888, pitch byte, upload/copy/present.
- include/lab.hpp: input mapping, normalize, velocity, update, biên player, limiter thuần.
- include/measurement.hpp: tham chiếu đúng năm giây, partial frame cuối, discarded time.
- src/main.cpp: SDL setup, events, clock, input, update, render, FPS và cleanup.
- tests/tests.cpp: check/exit code luôn chạy ở Debug/Release; không dùng assert.

## Quy ước và giới hạn

Pixel là số 0xRRGGBBAA, texture dùng RGBA8888 và BLENDMODE_NONE. Ảnh logic cố định nên pixel/giây không đổi khi resize. LETTERBOX giữ tỉ lệ; có thể có viền. Khác Project 01, không cấp phát lại framebuffer theo output vật lý mỗi lần kéo cửa sổ.

Variable timestep giới hạn mỗi bước ở 0,05 s. Frame 0,2 s chỉ mô phỏng 0,05 s, bỏ 0,15 s. Vì vậy dưới 20 FPS liên tục hoặc khi có stall, không khẳng định luôn đi đúng 900 px trong 5 giây thật; dropped hiển thị sự đánh đổi này. dt âm/NaN/infinity bị bỏ an toàn. Chuyển động vận tốc hằng không có gia tốc; không suy ra độ chính xác tích phân cho physics phức tạp.

Mất focus/minimize tạm ngưng cập nhật và phép đo, khi trở lại reset mốc đồng hồ. Thời gian này không thuộc năm giây hoạt động. SDL_DelayNS có thể ngủ lâu hơn yêu cầu; cap là giới hạn gần đúng, không bảo đảm đạt FPS trên mọi máy. Không chủ động bật VSync, nhưng driver/compositor có thể ảnh hưởng present.

## Kiểm chứng tự động và desktop

CTest kiểm input mapping thật, normalize, quãng đường 30/60/120, dãy không đều, dt biên/âm/không hữu hạn, clipping/count pixel, unsigned limiter và phép đo 5 giây.

```powershell
.\build\Debug\project_2_final.exe --smoke
.\build\Release\project_2_final.exe --smoke
```

Smoke dùng window ẩn và hướng chéo script sẵn, resize/upload/present 12 frame rồi tự kết thúc. Đặt timeout ngoài 15 giây khi chạy tự động; smoke không kiểm WASD vật lý, focus thật hoặc FPS dài hạn.

Thử trực tiếp: WASD/đối nghịch/chéo/bốn cạnh; B tại từng mức cap; F1 không lặp khi giữ; R; resize/minimize/restore; mất focus; Escape và Close. Kỳ vọng B gần 900 px trong 5 giây khi dropped=0, sai lệch không quá 2%. Ghi cả FPS thật thay vì chỉ mức cap.

## Tài liệu

- https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState
- https://wiki.libsdl.org/SDL3/SDL_GetTicksNS
- https://wiki.libsdl.org/SDL3/SDL_DelayNS
- https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation
