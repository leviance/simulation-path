# Project 61 — Rừng đón gió: gộp mặt đất, giữ gốc cây và cỏ đứng yên

Dựng một bìa rừng có thể xem khung dây mặt đất và nhìn gốc cỏ đứng yên khi ngọn nghiêng theo gió.

Cỏ và lá nhận cùng cơn gió qua nhiều vị trí; họa tiết đất vẫn lặp đúng từng block sau khi gộp.

## Học bằng bản C++ của mình

Dùng quy tắc mặt lộ của Project 59 và giữ ống ngắm của Project 60. Mặt đất được gộp lúc dựng, lá/cỏ chỉ uốn lúc vẽ.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_61_work --parallel 1
.\build-work\Release\project_61_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_61_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 60, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_61_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_61_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_61_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Một vạt đất phẳng cần bao nhiêu quad?** — Chọn khối đặc bằng 3, nhấn F2 đổi giữa mặt đơn vị và mặt gộp, bật M để thấy các cạnh. Tiếp đó nhìn sát vách trong cảnh bờ suối; hạt đá không được to ra khi gộp.
2. **Cho cơn gió đi qua rừng, thay vì lắc cả cảnh** — Đổi hướng bằng G rồi chỉnh cường độ bằng hai phím ngoặc vuông. Nhấn P khi ngọn đang nghiêng, đi vòng sang bên: ngọn vẫn đứng yên trong world khi camera di chuyển.
3. **Gắn chuyển động vào từng ngọn cỏ và tán lá** — Ở gần một bờ cỏ, đứng yên rồi lần lượt tắt gió, bật gió và Pause. Nhìn một nhánh qua khe giữa hai cây để nhận ra phần nào đang di chuyển.
4. **Đo riêng công dựng đất và công vẽ ngọn cây** — Ở final, bật F1 rồi F2, chờ mesh ổn định. Ghi quad và thời gian dựng tại cùng góc; đi ngang với gió còn thổi và theo dõi bộ đếm builds.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png`.

- So tập mặt đơn vị của hai cách dựng, tắt gió và Pause để kiểm gốc, ngọn và bộ đếm mesh.
- Không gộp lá động vào hình học tĩnh, không dựng lại đất để làm gió.
- Bảng kiểm gồm khối đặc, bàn cờ, hốc rỗng và biên hai cột. Gió chạy nhiều nhịp vẫn không làm thay đổi bất kỳ mặt đất tĩnh nào.
