# Project 58 — Bờ suối đầu tiên

Hãy tìm một chỗ có cát, đất và cỏ trên cùng một bờ rồi bước tới gốc cây. Khi xoay người, bạn đang nhìn cùng 4.096 ô từ một vị trí khác, không xoay một mô hình quanh tâm. Đây là mảnh đầu của tuyến khám phá thế giới voxel bằng C++20/SDL3; không cần Minecraft, mod, texture tải ngoài hay công cụ xây nhà.

## Thử trước khi đọc

Từ một window chạy được, hãy thử tự vẽ một viên đá, đưa nó vào mảng 16³, rồi lấp thành hai bờ đất có một dòng nước liền giữa chúng. Cây phải mọc trên mặt đất, góc nhìn có phối cảnh. Tự dự đoán số tam giác của một, hai và 4.096 block trước khi bật F1. Thời gian học tham khảo 8–11 giờ, chưa tính cài đặt.

## Học bằng bản C++ của mình

Bộ khung có cửa sổ, framebuffer, raster, camera cơ bản và atlas. Bạn tự tạo mesh đầu tiên, đưa block vào cột, xây bờ suối và điều khiển mắt.

Giải nén ZIP vào thư mục riêng. Ngay cạnh `CMakeLists.txt`, chạy:

```powershell
cmake -S . -B build-work -DVOXEL_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-work --config Release --target project_58_work --parallel 1
.\build-work\Release\project_58_work.exe
```

CMake chỉ tạo `work/` từ `starter/` khi thư mục này chưa tồn tại. Sửa `work/include/trail/` xuyên suốt các bài, rồi build lại **cùng target**. Với Ninja/Make, mở `./build-work/project_58_work`. Các mục **Vị trí sửa và mã cần viết** trong bài cho biết chỗ chèn, đoạn cần thay và đoạn mới. Những dòng `// [snippet …]` là chú thích của sách, không phải lệnh C++.

Chỉ sau bài cuối mới build `project_58_tests` trong `build-work` rồi chạy `ctest --test-dir build-work -C Release --output-on-failure --timeout 30`. Ở cấu hình này tests đọc **work/include**, không đọc `final/`. Đừng lấy một lần chạy checkpoint hoặc CTest của bản mẫu làm kết quả bài làm.

## Chạy bản mẫu để đối chiếu

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --target project_58_final --parallel 1
.\build\Release\project_58_final.exe
```

Dùng CMake 3.24+, C++20 và SDL 3.4.8 đã khóa trong CMakeLists. Windows mặc định build bằng Visual Studio 2022; với generator single-config, thêm `-DCMAKE_BUILD_TYPE=Release` lúc cấu hình và chạy `./build/project_58_final`. Mọi snapshot trong ZIP đều đủ header, không có đường dẫn ngược về repository.

| Bài | Thay đổi nhìn thấy |
| --- | --- |
| 1 | Bầu trời trống có thêm một viên đá với 6 mặt. |
| 2 | Viên đá được đọc từ ô (7,7,7) chứ không còn là hình vẽ rời. |
| 3 | Khối 16³ đặc giữ đủ 49.152 tam giác, kể cả bên trong. |
| 4 | Bờ cát, dòng nước tĩnh và cây làm mốc thay cho khối đặc. |
| 5 | Tự đi lại bằng WASD và nhìn bằng chuột hoặc phím. |
| 6 | H mở bảng lớp; PageUp/PageDown đổi y mà không khoét đất. |
| 7 | V kiểm các fixture; final ghép tất cả bước trên. |

## Điều khiển và kiểm chứng

- Nhấn vào viewport để bắt chuột. WASD di chuyển, Q/E hạ/nâng, mũi tên nhìn; Escape trả chuột, Escape lần nữa đóng cửa sổ. R trở lại vị trí ban đầu. Đây là camera tự do trong một section, chưa phải nhân vật có trọng lực.
- 1 bờ suối, 2 viên đá, 3 toàn đặc, 4 toàn Air. F1 xem bộ đếm, H xem lớp, V kiểm hình học. Tắt các lớp phụ để quan sát cảnh sạch.
- Đi sát bờ, quay lại; bộ đếm mesh không đổi. Họa tiết pixel tự thiết kế lặp theo từng block. Nước ở đây đứng yên; dòng và sóng được học riêng tại Project 63.
- Chạy cả Debug và Release. Smoke chỉ kiểm ứng dụng mở và xuất một khung hình, không thay kiểm chuột/phím.

```powershell
cmake --build build --config Debug --target project_58_tests --parallel 1
ctest --test-dir build -C Debug --output-on-failure --timeout 15
cmake --build build --config Release --target project_58_tests --parallel 1
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_58_final.exe --smoke
.\build\Release\project_58_final.exe --capture streambank.png
```

Source: `src/main.cpp` mở vòng lặp SDL. `include/trail/blocks.hpp` giữ địa chỉ; `bank.hpp` tạo cảnh; `surface.hpp` dựng mesh; `camera.hpp`, `raster.hpp` và `materials.hpp` đưa thế giới lên ảnh. Xem `tests/tests.cpp` để đối chiếu tọa độ âm, mesh chưa tối ưu và near plane.
