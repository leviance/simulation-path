# Project 69 — Một bàn quan sát, hai stylesheet

Hãy làm cho nút Pause nổi bật trong cả giao diện sẫm và giao diện sáng, nhưng không sửa panel.html hay vẽ lại đàn chim. Nhập một mã màu sai rồi sửa: lúc báo lỗi bảng hiện tại vẫn phải bấm được. Phần này dạy cascade và computed style, chưa dạy Flexbox.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
.\build\Release\project_69_final.exe --assets assets
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Từ thư mục chứa CMakeLists.txt. Ninja/Make dùng -DCMAKE_BUILD_TYPE=Release và ./build/project_69_final. Lần đầu cần CMake ≥3.24, C++20, SDL 3.4.8. Không truyền --assets thì sửa file **assets bên cạnh executable** rồi F5. Cùng ZIP có starter, 5 checkpoint, final, tests, một HTML và ba CSS.

| Mốc | Làm gì trong ứng dụng |
| --- | --- |
| 1 | Đọc style.css từ đĩa; màu chưa đổi. |
| 2 | Tách selector/declaration, đếm rule và thử file sai. |
| 3 | So tag/.class/#id và thứ tự nguồn; màu thắng đi tới SDL. |
| 4 | Thay padding/height và kéo ở vị trí mới; thay riêng màu thì layout không chạy. |
| 5 | I mở inspector, [ ] chọn element, P duyệt property. Xem selector và rule thắng; phím 1/2 đổi giao diện, 3 thử file sai, F5 đọc lại file đang chọn. |

**Hợp đồng.** Một selector đơn theo tag, class hoặc id. Cùng độ ưu tiên lấy declaration sau cùng, từng property xét riêng. Không inheritance, biến, comment, selector ghép, shorthand nhiều giá trị hay !important. background, color, border-color dùng #RRGGBB. width nhận fill hoặc 8–600px; height nhận 8–540px hoặc auto (chỉ div); margin/padding/border/gap một số px áp đều các cạnh (tối đa 64/48/8/32). Dấu chấm phẩy là bắt buộc. File 16 KiB, tối đa 64 rule, 24 declaration/rule. Thông báo tên file, dòng và cột theo byte. HTML và preset Boids như Project 68; stylesheet không có quyền sửa vận tốc. Nút bấm, Tab/Shift+Tab, Home/End và hai thanh kéo dùng được trong cả hai giao diện.

**Kiểm bằng tay.** Trong field.css thay riêng color của #pause; note số layout trước/sau. Thay padding của .sheet: số layout tăng một và vị trí nút dời. Thay width: 8% là lỗi, theme cũ phải còn. Sau đó đánh dấu cú kéo ở giữa Radius: vẫn nhận 80 px. CTest kiểm hai file thật, tie giữa nhiều class, ID thắng tag xuất hiện sau, vùng hit và lỗi không xuất bản nửa stylesheet. Làm thêm ở Debug; một ảnh chụp không thể kiểm cache hoặc đường rollback.
