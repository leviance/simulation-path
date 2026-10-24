# Project 25 — Chuỗi lò xo treo

Tự viết một mô phỏng 2D bằng C++20/SDL3: 32 khối nối bằng 31 lò xo, một đầu cố định. Kéo một khối để quan sát dao động truyền qua hàng xóm, bật/tắt damping và đọc đồ thị năng lượng. Có các cấu hình 20, 32, 64 và 100 mass.

Canvas trên website là minh họa TypeScript/Canvas 2D. Gói này là ứng dụng C++ độc lập, không cần trình duyệt hay physics engine.

## Học gì và cần biết gì?

Project nối tiếp phép toán vector của Project 06, fixed timestep và kiểm sai số ở Project 22–23, cùng inverse mass và thao tác ngoài hệ ở Project 24. Trọng tâm là tự tính lực cục bộ rồi cộng lực cho cả hệ trước khi tích phân, không phải dựng một animation có sẵn.

Đây là point-mass spring chain: không có self-collision, bending, rotation của thanh hay giới hạn chiều dài cứng. Radius chỉ dùng để vẽ/chọn khối. Mô hình damping chỉ cản chuyển động dọc trục spring; không phải lực cản không khí toàn cục.

## Build, test, run

Cần compiler C++20, CMake từ 3.24 và mạng ở lần configure đầu để FetchContent tải SDL **3.4.8** với checksum cố định. Chỉ link qua SDL3::SDL3.

Windows / Visual Studio 2022:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 30
.\build\Debug\project_25_final.exe

cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 30
.\build\Release\project_25_final.exe
```

Trên Linux/macOS với Ninja, configure bằng cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON, build bằng cmake --build build --parallel 2 rồi chạy ./build/project_25_final. Cài các dependency hệ thống mà SDL cần cho backend video của máy.

Mặc định chỉ build final và tests. BUILD_CHECKPOINTS=ON mở thêm project_25_starter và project_25_checkpoint_1 … project_25_checkpoint_8. Mỗi target chạy độc lập.

## Tám bước học

1. Tạo 32 Particle, 31 Spring và điểm neo; nối dữ liệu world space với khung vẽ SDL có sẵn.
2. Đo lực Hooke trên cặp hai khối để kiểm dấu/hướng trước khi chạy cả dây.
3. Xóa lực cũ, cộng trọng lực và lực spring đối nhau cho toàn hệ.
4. Tích phân semi-implicit Euler bằng fixed timestep; đọc trace và đếm bước được chấp nhận.
5. Thêm damping dọc trục, kiểm công suất −c·u².
6. Kéo/thả khối, giữ grab offset, pointer owner và mẫu up cuối.
7. Mở 20–100 khối, k/m/dt, số đo và các preset kiểm ổn định.
8. Vẽ graph E/K/Us/Ug, chạy job 20 giây hữu hạn và nghiệm thu bài làm bằng tests.

Viết bài làm trong starter/include và starter/src. Checkpoint là bản tham khảo sau mỗi bài; build checkpoint không chứng minh Starter đúng. Các hàm vẽ/window/event scaffold đã có trong Starter để tập trung vào hệ vật lý.

Sau khi hoàn thành bài 8, đổi target_include_directories(project_25_tests PRIVATE final/include) thành target_include_directories(project_25_tests PRIVATE starter/include) trong CMakeLists.txt để CTest kiểm chính bài làm. Output phải có nhóm “canonical scale, analytic physics, energy, interaction and graph groups tested”.

## Điều khiển bản cuối

- Space: chạy/pause, đồng thời hủy job tua nhanh đang chạy.
- N: một bước physics; R: trả về cảnh mặc định 32 mass; Esc: thoát.
- F: ẩn/hiện debug; chế độ sạch giữ chuỗi và đồ thị.
- G: bật/tắt gravity và dựng lại fixture.
- D: bật/tắt axial damping, giữ vị trí/vận tốc, pause và bắt lại mốc đo.
- C: đổi 20/32/64/100 mass; K: đổi k; M: đổi m.
- [ / ]: dt 1/960, 1/480, 1/240, 1/120, 1/30 s; đổi cấu hình dựng lại initial state.
- 1: không gravity/damping; 2: cùng initial state nhưng bật damping; 3: cấu hình cố ý mất ổn định.
- Enter: chạy thêm 20 giây mô phỏng, không sleep 20 giây và không khóa event loop.
- Chuột trái: kéo một khối động; không chọn anchor. Click lệch tâm giữ grab offset, target được giới hạn trong vùng tương tác.
- Mũi tên: dịch khối được chọn 0,08 m. Trong bài 2, mũi tên điều chỉnh distance/angle của cặp thử nghiệm.

Trong Canvas có control riêng cho các tham số và node được chọn. Tab rời Canvas. Reduced motion khóa chạy liên tục, vẫn cho bước đơn và job hữu hạn. Blur/hidden/resize/reset hủy thao tác, nhả capture và dừng job.

Release velocity lấy từ hai target gần nhất, tối đa 6 m/s; nếu up trùng target trước thì velocity thả bằng zero. Khối đang cầm là kinematic, không được tích phân. Spring vẫn đọc target để tạo lực lên hàng xóm.

## Đọc mô hình và số đo

Với n từ A sang B, d là khoảng cách hiện tại, L0 là restLength:

- Hooke: F_A = k(d−L0)n, F_B = −F_A.
- Damping: thêm c·dot(vB−vA,n)·n vào F_A và lực đối dấu vào B.
- Trọng lực: m·g cho mỗi khối động.
- Integrator: a=F·inverseMass; v mới=v+a·dt; p mới=p+v mới·dt.

InverseMass=0 là điểm neo. Lực spring lên neo vẫn được tính; giá treo cung cấp phản lực. Không tích phân neo rồi dùng một phép clamp để giả nó đứng yên.

K là động năng, Us là thế năng đàn hồi. Ug lấy mốc tại anchor, có thể âm. E=K+Us+Ug; ΔE so với E0 của đoạn đo hiện tại. Kéo/thả/đổi hệ là tác động từ bên ngoài nên bắt đầu đoạn đo mới; không quy năng lượng do chuột đưa vào cho solver.

Graph năng lượng có trục s/J và bốn đường riêng. Graph displacement dùng index/m, không chia trục với năng lượng. Vector lực được giới hạn chiều dài hiển thị 80 logical pixel; đọc số N để so lực. Plot độ lệch cắt phần ngoài khoảng trục hiển thị, không clamp physical state.

History ghi t=0 khi bắt đầu đo, lấy mẫu định kỳ sau bước physics tối đa 60 Hz và thêm mẫu sau bước đơn/cuối job. Chỉ 1201 mẫu gần nhất được giữ lại; mốc t=0 có thể ra khỏi cửa sổ khi chạy lâu hơn. Ở dt mặc định 1/480, một job 20 giây từ mốc đo mới có 9600 bước và 1201 mẫu. Mỗi frame tối đa 32 bước; frame time nhận tối đa 0,05 s và thời gian bị bỏ được báo rõ.

q=dt√(k/m) là chỉ số so sánh, không phải chứng chỉ ổn định cho mọi mode của cả chuỗi. Guard dừng nếu candidate không hợp lệ, |position| theo từng trục vượt 1000 m hoặc speed vượt 10000 m/s. Guard không sửa state cho “trông ổn”.

Không damping: fixture 32 mass, g=0, displacement giữa 0,35 m cho max drift trong 2 giây khoảng 7,8% ở 1/480 và 4,1% ở 1/960; giảm dt phải làm sai số giảm. Có damping 0,24 kg/s với cùng fixture, E sau 10 giây dưới 15% E0. Không bắt từng step rời rạc giảm tuyệt đối đơn điệu.

Đổi N với cùng m/k/restLength làm hệ dài và nặng hơn; đó không phải chia mịn một sợi dây có cùng tổng khối lượng/chiều dài.

## Tệp và kiểm chứng

- include/lab.hpp: dữ liệu, topology, force accumulation, integration, damping và drag.
- include/metrics.hpp: stability index và số đo độc lập.
- include/scene.hpp: trạng thái thí nghiệm, scheduling, baseline và history.
- include/framebuffer.hpp, view.hpp: vẽ CPU, world/screen và graph.
- include/presentation.hpp: HUD ngay trong cửa sổ.
- src/main.cpp: SDL resources, input, capture, lifecycle và event loop.
- tests/tests.cpp, extra-cases.hpp: đáp án force/integrator, nghiệm oscillator, dây treo cân bằng, damping power, drift, scale 20–100 và pixel graph.

CTest không mở window và không dùng assert bị loại ở Release. --smoke mở window ẩn, chạy 32 frame, thử render/resize và cấu hình 100 mass rồi thoát; nó không thay kiểm GUI thật.

Trong repository khóa học, chỉ source-template, tests, README, lesson và metadata là nguồn authored. Starter/checkpoints/final, CMake và ZIP được sinh; không đưa output hoặc file biên dịch vào Git.
