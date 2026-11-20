# Project 62 — Theo con đường xa: tải chunk theo bước chân dưới tầng mây trôi

Đi qua hàng trăm block mà bộ nhớ không tăng theo tổng quãng đường; chọn một đám mây làm mốc khi quay lại.

Một thế giới nạp theo bước chân với cửa sổ 5×5 và mây vẫn dịch khi camera đứng yên.

## Học bằng bản C++ của mình

Dùng lại mesh và rừng đón gió ở Project 61. Bây giờ người đi thay đổi cột đang đứng, nên tập cột giữ trong bộ nhớ cũng phải đi theo.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_62_work --parallel 1
.\build-work\Release\project_62_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_62_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 61, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_62_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_62_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_62_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Khi bước qua mép chunk, đất mới đến từ đâu?** — Bật F1 và đi một mạch qua nhiều bờ đất. Đứng yên vài giây ở cuối đường: hàng đợi phải về 0 dù số chunk đang ở bộ nhớ có thể lớn hơn 25.
2. **Đừng sinh cả con đường trong một khung hình** — Nhấn J để đổi ngân sách một/hai lượt. Đi nhanh qua biên rồi đổi hướng lúc hàng còn dài. Ghi queue, dirty và số cột đã gỡ sau khi dừng.
3. **Vì sao đám mây không được dán lên màn hình?** — Dừng chân, chụp cùng góc ở hai thời điểm. Bấm C để bỏ mây rồi bật lại. Nhấn P dừng giờ, bước qua một biên và quay mặt về cùng đám mây.
4. **Đi xa rồi quay về: bộ nhớ có chịu buông không?** — Ở final hãy thử đi hơn 200 block, ghi mốc ban đầu, mốc xa nhất và mốc quay về. Đọc số chunk, số việc chờ và số đã gỡ, không lấy cả bộ nhớ của trình duyệt làm số đo C++.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png`.

- Đi vùng âm, đổi hướng giữa hàng đợi, quay về; kiểm resident, queued, dirty và unloaded.
- Ngân sách theo frame, vùng đệm hữu hạn; mây gắn tọa độ world, không dán lên màn hình.
- Quay lại phải nhận cùng mẫu đất/cây. Tại một tâm ổn định, cửa sổ hoạt động đủ 5×5 và toàn bộ vùng giữ không vượt 7×7.
