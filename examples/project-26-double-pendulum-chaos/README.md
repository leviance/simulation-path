# Project 26 — Hai con lắc gần giống nhau nhưng cuối cùng khác hẳn

Tự xây một thí nghiệm bằng C++20/SDL3: hai con lắc kép A/B dùng cùng tham số và cùng RK4, chỉ lệch theta2 ban đầu một epsilon nhỏ. Hai khung chuyển động, hai trails và đồ thị cho thấy độ tách tăng dần. Một quỹ đạo h/2 và ba bộ đo năng lượng giúp kiểm xem hiện tượng quan sát được có đang bị sai số số học lấn át hay không.

## Vì sao làm project này?

Ở Project 23 ta học cách đánh giá phép tích phân, còn Project 25 tập quản lý nhiều khối và các phép đo. Project này đặt một câu hỏi khó hơn: solver có thể giữ năng lượng khá tốt, nhưng ta còn dự đoán được tư thế chính xác bao lâu?

Mục tiêu không phải chứng minh toàn bộ lý thuyết chaos từ một ảnh vệt chuyển động. Bạn sẽ tập dựng một phép thử có điều kiện đầu rõ ràng, chạy đồng bộ, so độ phân giải và công bố giới hạn của kết luận.

Cần biết vector/atan2 từ Project 06–07, world/screen và fixed timestep từ Project 22, RK4 từ Project 23.

## Mô hình và giới hạn

- Hai thanh cứng không có khối lượng; hai quả nặng là point mass. Không có self-collision, ma sát hoặc lực cản không khí.
- Cả hai góc là góc tuyệt đối từ phương thẳng đứng hướng xuống; world Y hướng lên.
- Tự tính geometry, giải hệ 2×2 cho gia tốc, tích phân classical RK4 và đo phase-space distance.
- Mặc định mass1=mass2=1 kg, length1=length2=1 m, g=9,81 m/s², h=1/240 s, epsilon=1e-4 rad.
- Không wrap góc đang tích phân hoặc clamp omega để giấu lỗi. Guard chỉ dừng run; một bước lỗi không được commit dở.
- Kéo quả cuối A là đặt lại điều kiện đầu và đưa omega về 0, không phải một mô phỏng lực từ tay người.
- Reference h/2 không phải nghiệm chính xác; ở thời gian dài nó cũng có thể tách xa A dù cơ năng vẫn được giữ tốt.

## Bảy chặng học

1. Từ khung SDL có sẵn, dựng vị trí hai quả từ hai góc và nối vào renderer.
2. Chiếu phương trình Newton lên các tiếp tuyến, giải hai gia tốc từ cùng state.
3. Viết RK4, fixed-step scheduling, history và graph ΔE theo giây/Joule.
4. Tạo A/B, chạy đồng bộ và vẽ hai vệt; mỗi con lắc có E0 riêng.
5. Đo wrapped phase-space distance, khoảng cách quả cuối và đồ thị log.
6. Chạy reference hai half-step, đối chiếu 10 s và giảm h.
7. Ghép presets, input/capture, job 30 s, chế độ sạch và các phép kiểm độc lập.

Số bài theo nội dung của sản phẩm, không theo một khuôn sáu bài. Website trình bày các hàm và chỗ ghép, đồng thời có source chạy được sau mỗi bài.

## Build và chạy

Cần compiler C++20, CMake từ 3.24. SDL khóa **3.4.8**, tải bằng FetchContent có checksum ở lần configure đầu và link qua SDL3::SDL3. Không cần physics engine, OpenGL, trình duyệt hoặc font asset.

Windows / Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_26_final.exe

cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_26_final.exe
```

Linux/macOS với Ninja: thêm -G Ninja -DCMAKE_BUILD_TYPE=Release khi configure, build bằng cmake --build build --parallel 2 rồi chạy ./build/project_26_final. Cài dependency hệ thống cho backend video SDL trên máy.

Mặc định build final và tests. BUILD_CHECKPOINTS=ON thêm project_26_starter và project_26_checkpoint_1…7; mọi executable chạy độc lập.

## Điều khiển C++

- Space: chạy/dừng. Khi job đang chạy, Space hủy job và giữ pause.
- N: dừng job, tiến một h rồi pause.
- R: dựng lại cùng điều kiện đầu, h và epsilon.
- F: clean/debug. Cảnh, trails và graph vẫn có ở chế độ sạch.
- A/D: giảm/tăng theta1 ban đầu; S/W: giảm/tăng theta2.
- Q/E và Z/C: thay omega1/omega2 trong checkpoint 2.
- [: giảm h; ]: tăng h. Đổi h reset phép đo.
- Up/Down: tăng/giảm epsilon 10 lần; 0: initial pair giống nhau.
- 1/2/3 hoặc P: Calm → Chaotic → Near upright, từ checkpoint 7. Preset giữ h và epsilon.
- Enter: +10 s ở checkpoint 6; +30 s ở final/checkpoint 7.
- Backspace: hủy job. Esc: thoát ứng dụng.
- Kéo đúng quả cuối trong khung A: đặt lại theta2 ban đầu, giữ lệch điểm cầm và nhận tọa độ thả cuối. Mất focus/ẩn/resize sẽ hủy capture và pause.

Canvas dùng các control có nhãn tương ứng; có nút chạy thử 10 s, +30 s, dừng job và khôi phục mặc định. Reduced motion tắt chế độ chạy liên tục nhưng vẫn cho phép single-step/job hữu hạn.

## Đọc đồ thị

Trục X là thời gian physics của mẫu, không phải index hoặc render frame. History lấy cách nhau ít nhất 0,04 s trong run liên tục (tối đa 25 Hz), thêm mẫu bước đơn/cuối job và giữ 751 mẫu gần nhất. Các điểm cũ, kể cả t=0, có thể ra khỏi cửa sổ khi chạy lâu hơn hoặc tiến nhiều bước đơn.

Graph trái vẽ phase distance không đơn vị trên log10. Tau=sqrt(meanLength/g) dùng để scale chênh lệch omega; đó là quy ước norm cần giữ cố định khi so các run. Khoảng cách quả cuối được đo riêng bằng mét từ world geometry, không trừ hai pivot màn hình.

Sàn 1e-12 và khoảng log hiển thị chỉ phục vụ vẽ; d=0 vẫn được báo là 0. Log(d/d0)/t chưa xác định ở t=0/d0=0/d=0 và không được coi là Lyapunov exponent đã hội tụ.

Graph phải vẽ ΔE_A/B/reference bằng Joule, mỗi trajectory có E0 đúng của nó. Trục tự đổi thang; đọc số, không so độ cao đường giữa hai run. Max |ΔE| được đo ở mọi accepted step, không chỉ tại các mẫu được vẽ.

## Phép kiểm chính

Với theta1=2, theta2=1,1, omega=0 và epsilon=1e-4, sau 10 s:

- d A/B xấp xỉ 0,2123 ở h=1/240, 1/480 và 1/960.
- numerical separation giảm khi giảm h, nhỏ hơn 0,1% d A/B trong horizon này.
- max relative energy drift của cả A/B dưới 1e-6 ở h=1/240 và cải thiện khi giảm h.

Đó là kết quả của cấu hình và horizon đã nêu, không phải lời bảo đảm cho mọi run. Đến 30 s, numerical separation có thể đã lớn; energy drift nhỏ không chứng minh phase chính xác.

CTest kiểm thêm residual Newton với mass/length khác nhau, đạo hàm năng lượng, hội tụ RK4 trên horizon ngắn, angle seam, epsilon=0, atomic step/clock, budget, cả ba preset 30 s, mô hình kéo và pixel của graph có timestamp không đều. Tests dùng check(), không dùng assert bị tắt ở Release.

## Kiểm đúng bài làm trong Starter

Target tests mặc định include final/include. Trong bản ZIP đã giải nén, sau khi viết xong bảy bài, đổi đúng dòng target_include_directories(project_26_tests PRIVATE final/include) thành target_include_directories(project_26_tests PRIVATE starter/include), rồi configure/build/CTest lại. Không lấy một lượt CTest đang đọc final làm bằng chứng cho phần vừa viết trong Starter.

## Các file chính

- include/lab.hpp: dữ liệu, hình học, phương trình, RK4, norm và API headless có budget.
- include/scene.hpp: đồng hồ thí nghiệm, baseline, history, jobs và mô hình đặt góc.
- include/framebuffer.hpp: các công cụ raster có sẵn từ project trước.
- include/view.hpp: world/screen, hai cảnh và graph; không sửa physics.
- include/presentation.hpp: HUD ASCII trong cửa sổ SDL.
- src/main.cpp: tài nguyên SDL, event/capture, frame scheduling và present.
- tests/tests.cpp và extra-cases.hpp: bộ kiểm số không cần window.

--smoke mở cửa sổ ẩn trong 32 frame để kiểm setup/present/resize/cleanup; không thay kiểm GUI tương tác trực tiếp. Tests headless có trần bước, UI tối đa 32 step/frame và có lệnh dừng; không dùng vòng while chờ divergence vượt ngưỡng.

Các thư mục starter/checkpoints/final và CMakeLists.txt là snapshot đã sinh trong gói tải về. Trong repository của website, chỉ sửa source-template, tests, README, metadata và MDX; output build, SDL tải về và ZIP không đưa vào Git.
