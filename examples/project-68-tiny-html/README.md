# Project 68 — Đổi bàn điều khiển đàn chim bằng panel.html

Chạy một executable C++/SDL3, rồi mở `assets/panel.html` bằng editor. Cắt nhóm có hai slider và đưa lên trước nhóm Pause. Bấm F5 trong ứng dụng: cây, thứ tự Tab và vị trí chọn phải thay đổi; đàn chim đã chọn vẫn còn. Hãy thử làm trước khi đọc sáu bài.

## Chạy

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
.\build\Release\project_68_final.exe --assets assets
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Đứng ở thư mục chứa CMakeLists.txt. Không có `--assets`, chương trình mở **assets cạnh executable** (CMake chép khi build). Muốn sửa file nguồn rồi F5 không cần build lại, dùng lệnh trên. Linux/macOS dùng Ninja/Make và `-DCMAKE_BUILD_TYPE=Release`; executable thường ở `./build/project_68_final`. Cần CMake ≥3.24, C++20 và SDL 3.4.8. Làm tương tự ở Debug để chạy cả hai cấu hình.

## Đề bài, từng mốc và thao tác

Starter là bàn Boids chạy được từ Project 67. (1) đọc file an toàn và hiện kích thước; (2) đếm token; (3) phân tích được thứ tự và quan hệ cha–con, chưa thay bàn cũ; (4) dựng đúng các control từ tài liệu; (5) phím 1/2 đổi bản điều khiển, I và [ ] soi từng element; (6) phím 3 thử một file hỏng. F5 nạp lại file vừa chọn, kể cả sau khi sửa lỗi; 1 quay lại bảng chính. Click hoặc Tab tới một nút; Enter/Space kích hoạt. Slider nhận chuột, Left/Right theo step, Home/End; Space ngoài UI để dừng, N bước khi đang Pause. So vòng quanh con chim vàng trước và sau khi kéo. Thử phá cú pháp trong lúc kéo: app phải báo tên file/dòng/cột, giữ bảng hợp lệ trước đó và vẫn cho sửa lại.

File là UTF-8 (chấp nhận BOM), **một** div gốc; chỉ div chứa element con. div, h1, span, label, button và input type=range; input viết tự đóng. Tên phân biệt hoa thường. Thuộc tính id/class và các min/max/step/value trên input; chuỗi thuộc tính phải có nháy. Text gộp khoảng trắng, hỗ trợ &amp;, &lt;, &gt; và &quot;. Không có comment, các entity khác, CSS, link, inline handler hoặc nhúng web. C++ giữ chữ UTF-8; font debug SDL không có đủ glyph tiếng Việt nên nhãn của hai preset dùng ASCII. Mỗi file tối đa 16 KiB; cây tối đa 32 node, độ sâu 0–6, nhãn 40 byte. Chẩn đoán tính cột theo byte UTF-8, gốc 1.

ID pause/reset/observe/radius/separation nối với model qua bảng hữu hạn. value của một slider khởi tạo tham số lần đầu; nạp lại giữ giá trị hiện tại trong miền mới. Domain Radius 20–140, Separation 0–5. Slider không gắn model vẫn có giá trị riêng. Đây chưa phải hệ event tổng quát. Quy tắc style mặc định vẫn là layout Project 67; Project 69 mới đọc CSS.

ZIP chứa starter, sáu checkpoint, final, assets (cả ví dụ lỗi cố ý) và tests. Chọn mốc bằng target project_68_checkpoint_1 … project_68_checkpoint_6. Test đọc file thật, đối chiếu bounds và thứ tự Tab, kéo rồi reload thành công/thất bại. `--smoke` vẽ một frame; `--capture anh.png --take survey` ghi ảnh native.
