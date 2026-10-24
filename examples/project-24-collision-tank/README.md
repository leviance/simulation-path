# Project 24 — Bể bóng va chạm 2D và 3D

Tự viết collision detection, impulse response và positional correction, rồi áp dụng cho hai cảnh chính: 256 circle trong bể 2D và 256 sphere trong bể 3D. Khối lượng, kích thước và restitution khác nhau; preset đàn hồi cho phép kiểm trường hợp mọi e=1.

Đây là ứng dụng C++/SDL3 độc lập. Canvas trên website chỉ là bản minh họa bằng TypeScript/Canvas 2D, không chạy C++ trong trình duyệt.

## Mục đích và kiến thức cần có

Project nối tiếp vector/dot product, fixed timestep và kiểm sai số ở Project 06, 10, 22–23. Phần 3D dùng lại camera basis, phối cảnh, depth buffer và tô sáng CPU từ Project 17–19. Mục tiêu không phải tạo một physics engine hoàn chỉnh: bạn phải giải thích được normal, impulse, inverse mass, sai số chồng lấn và điều kiện bảo toàn của đúng hệ đang xét.

Không có gravity, rotation, friction, spatial grid hay CCD. Tường đứng yên, tiếp tuyến không nhận impulse. Solver rời rạc có thể bỏ lỡ va chạm khi dt/vận tốc không phù hợp; nhiều iterations không thay thế được CCD.

## Build và chạy

Cần compiler hỗ trợ C++20, CMake từ 3.24 và mạng ở lần configure đầu để FetchContent tải SDL **3.4.8** với checksum cố định. Chỉ link qua SDL3::SDL3. Không cần tải thư viện va chạm hoặc physics engine.

Windows / Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 45
.\build\Debug\project_24_final.exe

cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 45
.\build\Release\project_24_final.exe
```

Với Ninja trên Linux/macOS, cấu hình bằng cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON; build bằng cmake --build build --parallel 2, chạy ./build/project_24_final. Cài compiler/CMake và các dependency hệ thống mà SDL yêu cầu cho backend video của máy. Hướng dẫn nền tảng nằm ở Getting Started trên website.

Bản mặc định chỉ build final và tests. BUILD_CHECKPOINTS=ON mở thêm project_24_starter và project_24_checkpoint_1 … project_24_checkpoint_11.

## Học theo từng bước

1. Tạo lưới 256 bóng không chồng lấn, seed cố định, vật liệu khác nhau.
2. Cho bóng chuyển động bằng fixed dt; giới hạn catch-up và đo dropped time.
3. Giải tường có xét radius, hướng vận tốc và xung lực bên ngoài.
4. Tìm contact giữa hai circle; chưa phản ứng va chạm.
5. Tính impulse cho hai vật khác khối lượng.
6. Sửa chồng lấn mà không đổi vận tốc.
7. Giải toàn bộ 256 bóng bằng i<j và iterations hữu hạn.
8. Đo độc lập, lưu history và kiểm đúng các invariant 2D.
9. Mở rộng công thức sang sphere–sphere, kiểm đủ X/Y/Z.
10. Dựng camera và renderer sphere CPU có depth buffer.
11. Ghép spawn, input, debug và nghiệm thu cả hai không gian.

Viết bài làm trong starter/include và starter/src. Checkpoint là bản tham khảo chạy độc lập, không phải một thư mục cần sửa và cũng không chứng minh Starter đúng.

Tests mặc định include final/include. Sau bài 8, có thể đổi target_include_directories(project_24_tests PRIVATE starter/include) để kiểm riêng phần 2D của Starter. Bộ tests in rõ các nhóm đã chạy. Khi Starter có đủ bài 11, phải có cả bốn nhóm: 2D, 3D physics, 3D renderer và spawn. Không coi một lượt chỉ chạy 2D là đã nghiệm thu phần 3D.

## Điều khiển bản cuối

- Space: chạy/pause; N: một fixed step; R: trả về cảnh mặc định 2D.
- 2/3: đổi không gian; mỗi lần đổi dựng lại cảnh và mốc đo.
- E: giảm restitution scale; H: đổi giữa vật liệu khác nhau và preset mọi e=1 (đặt scale=1).
- [ / ]: dt 1/60, 1/120, 1/240 s; I: 1–8 solver iterations.
- C: đổi cảnh 64/256 vật thể; D: bật/tắt sửa chồng lấn.
- F: ẩn/hiện debug. Normal vàng, vector impulse đỏ chỉ hiện ở debug; cảnh sạch vẫn giữ bóng, bể và đồ thị.
- B: thử thêm tối đa 16 vật thể không chồng lấn, giới hạn tổng 512. Không tìm chỗ bằng một vòng lặp ngẫu nhiên vô hạn.
- Enter: tua thêm 2 giây mô phỏng, tối đa bốn bước mỗi frame; Space hoặc đổi cấu hình để hủy.
- 2D: kéo đúng bóng rồi thả để truyền một delta velocity, độ lớn tối đa 6 m/s. Đây là tác động bên ngoài.
- 3D: kéo để orbit camera; wheel đổi khoảng cách; mũi tên đổi yaw/pitch. Camera không xoay position/velocity trong world.
- Esc: thoát.

Chỉ pointer bắt đầu giữ gesture. Mẫu thả cuối được dùng ngay cả khi không có motion event tương ứng. Blur, resize, minimize và reset nhả capture, pause và hủy job. Input đi qua logical presentation 1100×820 đúng một lần; không nhân DPR thêm lần nữa.

Trong Canvas, mọi control có thể dùng bàn phím. Reduced motion khóa chạy liên tục nhưng vẫn cho phép bước đơn, orbit thủ công và job hữu hạn.

## Đọc số liệu cho đúng

Restitution hiệu dụng của cặp là scale × min(eA,eB), của tường là scale × eBody. Đây là quy ước vật liệu của project, không phải định luật duy nhất. Hai vật đang tách nhau không nhận thêm impulse.

Pair checks hiển thị chỉ tính lượt solver: I×N(N−1)/2. Với N=256, I=3, con số là **97.920**. Contact visits có thể gặp lại một cặp qua nhiều iterations; không gọi nó là số cặp độc nhất. Lượt đo overlap sau bước cũng tốn một lần quét N(N−1)/2 và không nằm trong counter solver.

Độ xuyên trong contact là giá trị trước khi giải. Maximum remaining penetration được đo lại sau solver và lần khóa tường cuối. Hai số không thay thế nhau.

Cặp cô lập với e=1 giữ động lượng và động năng. Riêng đàn bóng trong bể nhận xung lực tường: kiểm residual |P−P0−ΣJwall|, không bắt P cố định. Với e<1, động năng giảm là hành vi mong đợi, không phải lỗi tích phân.

History có t=0 và một mẫu sau mỗi bước physics, tối đa 601 mẫu gần nhất, gồm bước cuối của job. Hai đồ thị dùng thang độc lập. Thêm bóng hoặc kick bắt đầu lại baseline/time/history vì đã can thiệp từ bên ngoài; đổi camera/debug không làm việc đó.

## Source và kiểm chứng

- include/lab.hpp: lõi circle 2D, tường, impulse, correction, brute force, số đo.
- include/sphere.hpp: vector và lõi sphere 3D, sáu tường, số đo.
- include/scene.hpp: trạng thái thí nghiệm, fixed-step scheduling, history và spawn.
- include/framebuffer.hpp, view.hpp, projection.hpp: renderer CPU, ray/sphere front surface và Z-buffer.
- include/presentation.hpp: HUD ngay trong cửa sổ, không dồn thông tin lên title bar.
- src/main.cpp: SDL resources, event/input, loop và hữu hạn --smoke.
- tests/tests.cpp, extra-cases.hpp: đáp án tính tay, invalid inputs, conservation, wall ledger, stress, projection và spawn.

CTest không mở window và không dùng assert bị loại ở Release. Smoke mode mở window ẩn, chạy 32 frame, thử hai không gian, spawn, clean mode và resize rồi thoát. Nó không thay thế kiểm GUI thật.

Trong repository khóa học, source-template, tests, README, lesson và metadata là nguồn authored. Starter/checkpoints/final, CMake và ZIP là output sinh tự động; không đưa output hoặc file biên dịch vào Git.
