# Project 59 — Vách đá bên suối: bỏ những mặt bị đất che kín

Giữ nguyên vật liệu và camera, giảm số mặt của vách mà không làm đổi hình bên ngoài.

Một vách đá có thể đi vòng quanh, khung dây và công tắc để đối chiếu hai mesh.

## Học bằng bản C++ của mình

Giữ cách chiếu, raster và vật liệu của bờ suối ở Project 58. Việc mới là quản lý nhiều cột và bỏ đúng các mặt ở giữa chúng.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_59_work --parallel 1
.\build-work\Release\project_59_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_59_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 58, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_59_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_59_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_59_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Tại sao có thể bỏ hai mặt mà vách đá vẫn nguyên?** — Chọn khối đặc bằng phím 3, bật F1 và đổi F2 khi mắt đứng yên. Sau đó nhấn 1 để quay về bờ suối. Thử nhìn mép cát từ cả hai phía.
2. **Ai chịu trách nhiệm về đường nối giữa hai bờ?** — Đi dọc suối qua z=16. Thử nạp hai khối đặc đứng cạnh nhau trong test; hãy đếm theo vị trí và hướng của mặt, không chỉ nhìn tổng tam giác.
3. **So hai bức hình trước khi tin số tam giác** — Bật M khi nhìn một hốc, thử F2 rồi tắt M. Chọn cả preset rỗng bằng 4 và một viên đá bằng 2. Trong bản final nhấn V để đối chiếu khối đặc chuẩn.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png`.

- Khối đặc từ 24.576 xuống 1.536 quad; hốc, mép nước và đường nối hai cột vẫn kín.
- Mặt giáp nước chỉ có một chủ. Camera không làm đổi dữ liệu block.
- Chạy CTest cho bề mặt kín, mép nước, hốc và hai chunk kề nhau. Trong ứng dụng F1 phải báo các số đo của chính cảnh đang xem; quay đầu không dựng lại mesh.
