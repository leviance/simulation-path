# Project 60 — Ống ngắm địa hình: đọc cảnh vật bằng một tia nhìn

Tự làm một ống ngắm đọc được từng viên đá: chỉ vào đâu, cách mắt bao xa, nhìn trúng mặt nào?

Khi tâm ngắm đi từ thân cây ra trời, tên vật liệu nhường chỗ cho kết quả không gặp gì.

## Học bằng bản C++ của mình

Bờ suối đã có mặt ngoài và các phép đọc qua biên chunk từ Project 59. Ống ngắm chỉ hỏi dữ liệu; không có lệnh đặt hoặc phá block.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_60_work --parallel 1
.\build-work\Release\project_60_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_60_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 59, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_60_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_60_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_60_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Từ tâm màn hình đến hướng nhìn trong thế giới** — Nhấn F3 để bật/tắt tâm ngắm. Dùng mũi tên xoay đầu tại chỗ, sau đó W đi về phía thân cây. Tia đổi gốc khi đi, đổi hướng khi quay.
2. **Theo tia đến mặt đầu tiên, không bỏ sót block** — Ngắm mặt nước từ bờ, rồi ngẩng lên trời. Ống ngắm coi mặt nước là vật liệu có thể đọc; không xuyên qua nước để chọn đất đáy.
3. **Đóng băng phép đo và đi quanh vật vừa ngắm** — Nhấn I khi đang ngắm vách, bước sang phải rồi nhìn lại. Khung chọn vẫn chỉ ô cũ cho tới khi mở khóa. F3 cất ống ngắm để chỉ còn phong cảnh.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png`.

- Phân biệt trống với chưa nạp. Đóng băng và tắt được ống ngắm; hash địa hình bất biến.
- 3D DDA chỉ đọc, tầm hữu hạn; không đặt hoặc phá block.
- Qua lần lượt đá, cát, nước và trời; đồng thời kiểm hash ô, số quad và số lần dựng mesh trước/sau một loạt phép dò. Tất cả số đo về hình học phải bất biến.
