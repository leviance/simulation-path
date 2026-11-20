# Project 63 — Từ núi tuyết ra đại dương: sinh địa hình, dòng sông và sóng biển

Sinh bằng một seed cả rừng thông tuyết, hẻm đá, rừng lá rộng và bãi cát; đứng yên vẫn thấy dòng sông chạy ra đại dương.

Một bản đồ liên tục có bờ, đáy, nhiều tầng đá, hai dáng cây và mặt biển có độ cao thay đổi.

## Học bằng bản C++ của mình

Bộ nạp gần/xa và tầng mây đã có từ Project 62. Bây giờ thay đầu vào của Region::load: mỗi cột được sinh từ seed và tọa độ world.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_63_work --parallel 1
.\build-work\Release\project_63_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_63_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 62, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_63_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_63_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_63_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Khắc một lòng sông từ núi ra biển** — Bắt đầu ở bờ cát; bay thấp dọc sông với Q/E. Đổi sang bảng lớp để nhìn phần đáy bên dưới mặt thoáng. Ở bài này mặt nước còn tĩnh để dễ thấy hình dạng của lòng dẫn.
2. **Cho tán thông vượt qua đường biên chunk** — Dùng N để thử seed khác. Quay về seed mẫu bằng cách mở lại chương trình, so một tán nằm ngang đường nối sau hai lần nạp ngược thứ tự.
3. **Nhìn vệt nước chạy qua một tảng đá đứng yên** — Đứng bên sông, nhìn một viên đá làm mốc. Bật P để dừng vệt rồi xoay đầu, sau đó cho chạy tiếp. Động tác xoay không được đổi pha nước.
4. **Đỉnh sóng phải nhô lên khỏi mặt biển** — Đứng thấp ở bãi cát, dùng một mỏm đá cố định làm thước. Chụp ở hai giờ mô phỏng, giữ nguyên camera và FOV. So cả đường gợn lẫn vùng sáng.
5. **Theo một con sông qua năm điểm hẹn** — Dùng F5 tới F9 kiểm lần lượt năm mốc, rồi tự đi giữa hai mốc liền nhau không nhảy cảnh. Ghi seed, giờ, hai vị trí và hướng nhìn nếu muốn người khác kiểm đúng bức ảnh.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png` và chọn mốc bằng `--landmark 0` tới `4`.

- So mép đất, tán cây và mặt biển cùng tọa độ/giờ; kiểm hướng vệt nước ở hai mốc dọc sông.
- Bốn section theo chiều đứng, seed ổn định, sóng hình học; không dùng bộ giải chất lưu.
- Ở final nhìn thấy rừng, đồi đá, hẻm sâu, tuyết, bãi cát và nước mở trong cùng bản đồ; vừa thấy gợn sông trôi vừa thấy biển nhấp nhô. CTest so cả tính lặp lại và dấu của chuyển động.
