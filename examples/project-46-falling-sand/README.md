# Project 46 — Hộp cát số

Tự xây một hộp cát 2D bằng C++20 và SDL3: vẽ tường, rót cát qua phễu,
đổ nước rồi phá đập. Mỗi ô chứa một vật liệu; vài luật đổi chỗ cục bộ tạo nên
chuyển động. Đây là cellular sandbox, **không phải nghiệm phương trình chất lưu**.

Final dùng **512×320 = 163.840 ô thật**, cập nhật và vẽ toàn bộ lưới. Starter và
checkpoint 01–06 dùng 96×64 để đọc từng bước; checkpoint 07 nâng lên lưới lớn.
Không cần OpenGL, Node.js hoặc source của Project 45 để build gói C++ này.

## Trước khi đọc lời giải

Hãy thử tạo một ô cát trên bệ, vẽ thêm tường bằng chuột rồi làm cát rơi khi bấm N.
Khi làm được, thêm nước và giải thích vì sao một hạt không được đi hai lần trong
tick. Phần thử sức 90–120 phút không thay yêu cầu sản phẩm cuối: lưới lớn, bút vẽ,
pause/step/speed, clear/reset, cảnh mẫu và cách kiểm luật đều phải có.

Các bài trên website đi từ lưới đứng yên → brush → rơi thẳng → trượt/thứ tự →
nước/swap → fixed tick/speed → texture/lưới lớn → điều khiển/cảnh mẫu → kiểm chứng.
Thời gian dự kiến 12–17 giờ gồm đọc, viết và thử; chưa tính cài công cụ/build SDL.

## Build và chạy

Cần compiler hỗ trợ C++20, CMake **3.24+** và kết nối mạng ở lượt configure đầu.
CMake tải **SDL 3.4.8** bằng FetchContent, kiểm SHA-256 và link `SDL3::SDL3`.
Nếu build SDL từ source trên Linux/macOS, cài các development dependencies của
nền tảng theo tài liệu SDL; trang Getting Started của khóa học có hướng dẫn.

Windows / Visual Studio 2022, chạy ở thư mục có `CMakeLists.txt`:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build --config Debug --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_46_final.exe
```

Với generator một cấu hình như Ninja/Unix Makefiles:

```sh
cmake -S . -B build-release -DCMAKE_BUILD_TYPE=Release -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-release --parallel 1
ctest --test-dir build-release --output-on-failure --timeout 20
./build-release/project_46_final
```

Dùng `build-debug` riêng với `CMAKE_BUILD_TYPE=Debug` để kiểm cấu hình còn lại.
Mặc định chỉ build final và tests; `BUILD_CHECKPOINTS=ON` thêm
`project_46_starter` cùng `project_46_checkpoint_1` … `project_46_checkpoint_9`.
Không sửa `source-template` trong ZIP để mong executable final đổi theo: mỗi
target đọc đúng thư mục starter/checkpoints/final của nó.

Trong repository website, CMake/snapshots/ZIP là output được sinh bằng
`node scripts/generate-checkpoints.mjs --project=46` và bước package của website.
Nguồn chuẩn để đóng góp nằm ở `source-template/`, tests và README. Gói tải về đã
có sẵn CMake/snapshots, không yêu cầu người học cài Node.js hoặc chạy generator.

## Điều khiển bản hoàn chỉnh

- Chuột trái vẽ, chuột phải tẩy. Giữ chuột để rót theo **tick**, không theo FPS.
- `1` cát, `2` tường, `3` nước, `4` tẩy; `[`/`]` đổi bán kính 0–24 ô.
- Mũi tên chọn ô, Shift+mũi tên đi 16 ô, Enter tô tại vị trí chọn.
- Space chạy/dừng; N dừng rồi tiến một tick; `=` đổi speed 0.25/0.5/1/2/4.
- R đặt lại; K xóa nhưng giữ preset để R khôi phục; P đổi cảnh; B đổi seed;
  O đổi scan order. Các nút trên panel dùng chung lệnh với phím.
- F1 xem sạch, F2 đổi màu phẳng/có bóng, V kiểm fixture nhỏ trên lưới riêng,
  Esc thoát. Chế độ sạch vẫn giữ hotkey; F1 đưa bảng điều khiển trở lại.

Ứng dụng mở ở trạng thái pause. Pause vẫn cho sửa cảnh; reset chọn lại đúng
preset/seed/order, đưa tick về 0 và dừng chạy. Mất focus dừng/kết thúc nét;
resize không tạo lại grid. Các checkpoint đầu chỉ có những thao tác đã học.

Năm preset theo chỉ số CLI: 0 bậc thềm, 1 phễu, 2 vỡ đập, 3 hỗn hợp, 4 trống.
Seed uint32 chỉ đổi cách xếp ban đầu của preset 3; luật không gọi RNG mỗi tick.
Order: 0 alternating bottom-up, 1 left-to-right bottom-up,
2 right-to-left bottom-up, 3 alternating top-down. Muốn so order từ cùng input,
chọn order rồi reset; không so hai cảnh đã tiến khác số tick.

## Luật cần hiểu đúng

Biên ngoài đóng. Cát thử xuống rồi hai chéo; nước thử các hướng ấy trước, sau đó
mới thử hai ô ngang. Cát được swap với nước chưa đi; nước không tự chiếm ô cát.
Chỉ kiểm ô đích khi đi chéo, không kiểm swept collision của một hạt có bán kính.

Mỗi tick xóa moved mask, default duyệt từ dưới lên và đảo chiều ngang qua tick.
Chéo ưu tiên dùng parity `x+y+tick`. Hai đầu swap có cờ nhưng **Empty không giữ
chỗ**: hạt khác được dùng ô vừa trống. Đích Water có cờ thì bị chặn để hạt nước
không đi lần nữa. Mỗi hạt đi tối đa một lần; vacancy có thể truyền lên nhiều hàng.

Đây là cập nhật tại chỗ, không phải CA đồng bộ. Thứ tự quét là một phần mô hình;
đảo chiều không đảm bảo đối xứng tuyệt đối. Không có áp suất, độ nhớt hoặc bảo
toàn động lượng; nước giả có thể tiếp tục đổi chỗ ngang dù bộ đếm đều đúng.

Nhịp chuẩn 30 tick/giây. Mỗi frame nhận tối đa 0,25 giây wall time, nhân speed,
chạy tối đa bốn tick rồi bỏ các tick còn đến hạn. Dropped time tính bằng **giây
mô hình** đã nhân speed, không phải số giây thực đã chờ. Pause không tích nợ.

## Kiểm đúng code đang sửa

`tests/tests.cpp` chạy không cần window, không dùng `assert` bị tắt ở Release.
Fixtures kiểm bounds, brush, vacancy, cát/nước/tường, swap, từng loại vật liệu,
vị trí tường, thứ tự, RGBA/pitch, viewport, clock và commands. Oracle nhỏ gắn ID
đi cùng hạt, không gọi production `tryMove` hoặc dùng cùng moved mask.
Mốc lớn Mixture/seed 46/order 0 chạy 120 tick trên 512×320 và kiểm đủ visits.

CTest mặc định include **final/include**, tức kiểm đáp án mẫu. Muốn kiểm starter
đã tự hoàn thiện và có đủ API, thêm vào CMake ở gốc:

```cmake
if(BUILD_TESTING)
    add_executable(project_46_student_tests tests/tests.cpp)
    target_include_directories(project_46_student_tests PRIVATE starter/include)
    enable_course_warnings(project_46_student_tests)
    add_test(NAME project_46_student_validation COMMAND project_46_student_tests)
endif()
```

Build target ấy ở Debug/Release rồi chạy CTest với `-R project_46_student_validation`.
Chủ động làm sai một luật để xác nhận test thất bại. Một lượt tests final xanh
không chứng minh phần bạn vừa sửa trong starter đúng.

## Đo/chụp hữu hạn

```powershell
.\build\Release\project_46_final.exe --benchmark --preset 3 --seed 46 --order 0 --steps 120 --repeats 7
.\build\Release\project_46_final.exe --hidden --run --seconds 5 --capture frame.bmp
```

Benchmark CPU không mở window: warm-up 32 tick, reset cùng input mỗi repeat,
đo riêng `stepGrid`, công bố raw samples/median/p95, compiler/configuration/máy,
grid/seed/order/visits/swaps. Loại allocation/copy/reset, kiểm đếm, encode,
upload, draw và present khỏi số update. Median chẵn lấy trung bình hai giá trị
giữa; p95 lấy phần tử `floor(0.95*(N-1))` sau khi sort. Không suy FPS/speedup chung.

Giới hạn benchmark: 1–600 bước/repeat, 1–15 repeat, tối đa 500 triệu cell visits
và deadline 30 giây. Viewer nhận `--seconds` trong 0.05–60 giây; `--hidden` hoặc
`--capture` bắt buộc có thời lượng. Capture đọc frame một lần trước present,
ngoài draw timing. Không gộp benchmark với viewer flags. `--help` liệt kê CLI.

UI tách update, encode/upload CPU và draw-submission CPU; đây không phải GPU
time. Bộ đếm phân biệt ô cấp phát, movable, visits và số ô vẽ; grid+mask bytes
không phải tổng RAM/VRAM. Kiểm native, website, ZIP và benchmark là các phạm vi
riêng; hồ sơ nghiệm thu trong repository ghi rõ phần nào đã thực sự kiểm.

## Đọc source

`grid/rules/timing/presets/layout/pixels/commands/validation/benchmark/options`
là code thuần; `workshop` quản lý state và lệnh. `view/panel/input` nối với SDL;
`sdl_resources` giữ cleanup texture → renderer → window → SDL. `main` ghép chúng
thành vòng event/update/draw, không giấu một bộ luật thứ hai trong renderer.

Xem `REFERENCES.md` cho API và nguồn tham khảo. Các cảnh/palette do project tạo,
không có asset tải từ thư viện bên ngoài.
