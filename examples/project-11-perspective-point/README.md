# Project 11 — Bay xuyên trường sao: tự viết phép chiếu phối cảnh

Giữ **W**. Ngôi sao màu hổ phách chạy dần ra mép ảnh; ngôi sao ngay trên trục nhìn vẫn ở giữa. Thả phím, cả khung hình đứng lại. Không cần vẽ tàu: từ đầu đến cuối, thứ duy nhất bạn cần vẽ là **một điểm sáng**.

Ở Project 10, la bàn 3D đã có sẵn hàm chiếu. Bài này mở chiếc hộp đó ra. Bạn sẽ tự trả lời câu hỏi “ngôi sao này hiện ở pixel nào?”, rồi dùng chính hàm ấy cho 96 sao. Project 12 lấy lại phép chiếu để vẽ ba đỉnh của tam giác.

## Thử trước khi đọc hướng dẫn

Dành 25–35 phút đặt hai sao: A ở `(1, 0.6, 4)`, B ở `(0, 0, 10)`. Máy ảnh nhìn thẳng theo +Z, Y hướng lên. Khi máy ảnh tiến hai đơn vị mà tọa độ A và B trong thế giới giữ nguyên, hãy đoán xem ảnh của chúng đi về phía nào. Nếu chỉ đổi bán kính chấm, bạn đã thể hiện được hết hiện tượng chưa?

## Chạy bản hoàn chỉnh

Cần C++20, CMake từ 3.24 và SDL **3.4.8**. CMake dùng FetchContent lấy SDL phiên bản cố định nếu không dùng bản cài local.

```powershell
cmake -S . -B build-final
cmake --build build-final --config Release --target project_11_final --parallel 1
.\build-final\Release\project_11_final.exe
```

Trên Linux/macOS với generator một cấu hình, cấu hình thêm `-DCMAKE_BUILD_TYPE=Release` rồi chạy `./build-final/project_11_final`.

| Muốn thử | Phím trong cửa sổ |
| --- | --- |
| Bay tới hoặc lùi, thả để dừng | Giữ W hoặc S. Hai phím cùng lúc triệt tiêu nhau. |
| Cho camera chạy mà không giữ phím | Space để bật/tắt bay tự động; N để tiến thêm 0,1 giây khi dừng. |
| Chỉnh vị trí thật chậm | J / L giảm / tăng Z của camera 0,1. Hành trình từ 0 đến 12. |
| Đổi ống kính hoặc hình dạng khung | + / − chỉnh FOV dọc; V đổi 16:9, 4:3, 1:1. |
| Khảo sát một sao độc lập | F hiện/ẩn dụng cụ; mũi tên chỉnh X/Y, Q/E chỉnh Z; có thể kéo chuột ở độ sâu đã biết. |
| So hai độ sâu | M hiện sao thử A và vòng đo B. B không phải một sao thứ hai trong danh mục. |
| Kiểm các biên | F1–F6 chọn điểm thử; [ và ] đổi near; ; và ' đổi far. |
| Về xuất phát, thoát | R, Esc. |

Hết vùng sao, chương trình dừng và chờ bạn lùi hoặc bắt đầu lại. Đây không phải bầu trời vô tận: quay về chỗ cũ, bạn gặp đúng những sao cũ, không phải một tập điểm được gieo lại.

## Tự làm từ starter

```powershell
cmake -S . -B build-work -DCOURSE_WORKBOOK=ON
cmake --build build-work --config Debug --target project_11_work --parallel 1
.\build-work\Debug\project_11_work.exe
```

Cấu hình lần đầu sao `starter/` thành `work/`. Lần sau CMake không ghi đè bài đang làm. Sửa `work/` theo từng bài rồi build lại. `checkpoints/01` đến `checkpoints/08` là các đáp án trung gian chạy độc lập; `final/` chứa toàn bộ mã của thành phẩm.

1. Thắp một ngôi sao trên framebuffer. Chỉnh Z và nhận ra hình vẽ XY chưa có chiều sâu.
2. Lấy tọa độ thế giới trừ vị trí camera. Khi người xem tiến, độ sâu của sao giảm.
3. Dùng hai tam giác đồng dạng để tìm X/Z, Y/Z; tự đoán một pixel.
4. Đưa FOV, tỷ lệ khung và gốc viewport vào phép tính. Đổi ống kính khác với tiến máy.
5. Tạo một danh sách sao đúng một lần. Chiếu từng sao, loại điểm ở ngoài hoặc sau vùng nhìn trước khi vẽ.
6. Đọc W/S, nhân vận tốc với thời gian giữa hai frame. Thử thả phím, trả camera về chỗ cũ và chuyển sang cửa sổ khác.
7. **Tùy chọn:** dùng con trỏ để kéo sao thử. Nếu muốn đi tiếp, bài 7 chỉ cách dùng hai tệp đã hoàn chỉnh; trường sao không phụ thuộc thao tác này.
8. Chạy bản cuối, đối chiếu kết quả với nghiệm tính tay và tự kiểm mã trong `work/`.

Sau bài 8:

```powershell
cmake --build build-work --config Debug --target project_11_tests --parallel 1
ctest --test-dir build-work -C Debug --output-on-failure --timeout 25
```

Khi bật `COURSE_WORKBOOK`, target này kiểm header trong `work/`. Nếu không bật, nó kiểm `final/`. Để chạy đáp án của từng bài, bật `-DBUILD_CHECKPOINTS=ON` rồi chọn target như `project_11_checkpoint_3`.

## Ba phép thử đáng làm

- Khung **800×800, FOV dọc 90°**: A đi từ (500, 340) đến (600, 280) khi camera đi từ Z=0 đến Z=2. B vẫn ở (400, 400) cho đến khi không còn nhìn thấy nó. Đừng dùng số này để so trực tiếp với cửa sổ mặc định, vốn có FOV 60° và gốc viewport khác.
- Hai sao (1, 0, 4) và (2, 0, 8) nằm trên cùng tia nhìn lúc xuất phát. Đổi FOV: chúng vẫn chồng lên nhau. Tiến camera: chúng tách ra. Vì thế không thể làm chuyến bay bằng cách phóng to một ảnh.
- Dừng ở một vị trí rồi bay tới và lùi đúng quãng đường vừa đi. So ảnh, không chỉ so số frame. Điểm nằm sau camera không được bất ngờ hiện lại bên kia màn hình.

## Đọc mã

`include/lab.hpp` chứa phép chiếu và các hàm kiểm biên; `include/scene.hpp` giữ camera và phím bay. `include/starfield.hpp` tạo danh mục bất biến và vẽ mọi sao bằng cùng một vòng lặp; có thể thay hàm tô quầng sáng bằng một chấm đặc mà mọi phép đo vẫn đúng. `include/view.hpp` vẽ lớp khảo sát tùy chọn, `include/framebuffer.hpp` quản lý pixel. Vòng sự kiện nằm ở `src/main.cpp`; `include/presentation.hpp` đưa ảnh lên SDL. `tests/tests.cpp` chạy ngay cả khi không mở được cửa sổ.

Các tuỳ chọn nghiệm thu của bản cuối: `--smoke-flight` (thử W/S, thả phím, mất focus và N qua sự kiện SDL); `--capture frame.png` (chụp từ executable), thêm `--in-flight` để đặt máy tại Z=2 hoặc `--ruler` để xem thước. Không có OpenGL, ảnh nền chụp sẵn hay mô phỏng hấp dẫn.
