# Project 64 — Một ngày trong thế giới voxel: đi qua rừng, bão tuyết và bờ biển

Tự hoàn thiện chuyến đi bộ từ bãi cát qua hẻm tới rừng tuyết và bếp lửa. Khi buông chuột, cảnh vẫn sống.

Tuyết khuất sau thông, ngọn cỏ nghiêng, mây và sóng chuyển động, ánh chiều hắt sang mặt kia của vách đá.

## Học bằng bản C++ của mình

Đất, dòng sông, sóng, gió, streaming và các mốc đã chạy từ Project 63. Bạn bổ sung tuyết trong không gian, Mặt Trời, đi bộ có va chạm, bếp lửa và phép đo cả chuyến.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_64_work --parallel 1
.\build-work\Release\project_64_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_64_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Nếu học liền từ Project 63, ZIP đã có mã nền tương đương bản cuối trước và các tệp khung mới cho mốc này. Muốn giữ phần tự viết, đối chiếu `work/include/trail/` cũ với `starter/include/trail/` mới và mang sang các header chung bạn đã sửa; giữ các header mới và `src/main.cpp` của ZIP này. Không chép đè cả thư mục. Nếu API của bạn khác, nối lại ở hàm được chỉ trong bài đầu.

Chỉ sau bài cuối mới build `project_64_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

Cần compiler C++20 và CMake 3.24 trở lên. Trên Windows, mở Developer PowerShell của Visual Studio 2022. Từ thư mục vừa giải nén:

```sh
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 30
```

Chạy `build/Release/project_64_final.exe`. Trên Linux/macOS với generator một cấu hình, thêm `-DCMAKE_BUILD_TYPE=Release` khi configure rồi chạy `./build/project_64_final`. Mặc định CMake dùng SDL 3.4.8 qua FetchContent và link SDL3::SDL3. Có thể chọn `-DCOURSE_USE_INSTALLED_SDL3=ON` nếu đã cài đúng phiên bản.

## Thử ngay trong cửa sổ C++

WASD di chuyển, mũi tên hoặc nhấp chuột rồi di chuột để nhìn; Escape thả chuột. R về vị trí đầu, P dừng giờ, F1 mở số liệu. Phím 1 về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và cảnh rỗng.

1. **Đứng giữa tuyết rơi, không đứng trước một tấm rèm** — Tới mốc F8, nhìn ngang thân thông, tắt rồi bật phát tuyết bằng T. Các hạt cũ vẫn hoàn thành quãng rơi, không biến mất cả màn hình trong một frame.
2. **Một Mặt Trời cho cả trời, đá và sóng** — Dùng dấu trừ và dấu bằng để lùi/tới hai giờ. Quay nhìn cùng vách ở sáng, trưa, chiều, rồi tắt mây với C để loại ảnh hưởng che khuất bầu trời.
3. **Đặt chân lên đất thay vì cho camera bay xuyên đồi** — Đi WASD, Space để nhảy và F để đổi chế độ đi bộ/khảo sát. Dùng bậc thấp, vách cao, chỗ có tán trên đầu và biên hai chunk làm bốn chướng ngại khác nhau.
4. **Một bếp lửa nhỏ làm mốc giữa chiều xuống** — Đến F9, xoay về vòng đá, đổi sang ánh chiều rồi bước vòng quanh. Bếp nhỏ so với rừng; từ xa không cần tính từng đốm không còn nhìn thấy.
5. **Tự đi mười phút để kiểm một thế giới sống** — Đi 10–20 phút từ biển men sông, qua hẻm, lên thông tuyết rồi về bếp. Thử dừng giờ khi camera còn quay, thay đổi hướng gió, tắt mây, nhảy qua bậc và quay về vị trí cũ. Không cần đào hay đặt một block nào.

## Mã nguồn và phép kiểm

`starter/` là điểm xuất phát; mỗi thư mục `checkpoints/NN/` và `final/` mang đủ source riêng. Xem `tests/tests.cpp` cho những ca không cần cửa sổ. Từ chương trình thật có thể chụp một khung hình bằng `--capture scene.png` và chọn mốc bằng `--landmark 0` tới `4`.

Để lặp lại chuyến đi trên cùng seed, chạy `.\build\Release\project_64_final.exe --survey 600`. Nhân vật đi bằng đúng hàm di chuyển của người chơi, qua cả hẻm, rừng tuyết và bếp lửa; cửa sổ ẩn và chương trình tự dừng sau mười phút. Dòng `WALK` ghi quãng đường, số chunk, tuyết và thời gian từng phần. Muốn dò một bậc bị kẹt mà không đợi, dùng `--route-check`; phép thử rút gọn này không đo chi phí vẽ của chuyến đi thật.

- Đi một phiên 10–20 phút, qua biên âm, về lại mốc cũ; ghi số hạt/chunk và chi phí từng khâu.
- C++20/SDL3 độc lập; chỉ khám phá, không đào hoặc đặt block. Không mô phỏng khí quyển hay cháy lan.
- Báo riêng ảnh C++, CTest, số đo của phiên chạy dài và thao tác chưa kiểm. Qua được test toán không tự chứng minh chuyến đi hay hoặc đồ họa đủ dễ đọc.
