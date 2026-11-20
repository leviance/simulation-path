# Project 71 — Nút trong HTML gọi hàm C++ của đàn Boids

Bấm Pause một lần. Với E bật, đường đi phải là #pause → #tools → #desk nhưng đàn chỉ dừng **một** lần. Bật B để dừng truyền ở #tools. Quay về chế độ sạch bằng E. Đây là project về điều phối input và ràng buộc với model, chưa có ngôn ngữ script.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
.\build\Release\project_71_final.exe --assets assets
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Đứng ở thư mục chứa CMakeLists.txt. Không truyền --assets thì sửa assets cạnh executable. Ninja/Make: -DCMAKE_BUILD_TYPE=Release rồi ./build/project_71_final. SDL3 3.4.8, C++20, CMake 3.24+. Starter dùng bàn TinyFlex; 1 nối ID vào nút, 2 truyền qua tổ tiên, 3 đưa chuỗi kéo về một owner, 4 thêm keyboard, 5 thay HTML và phục hồi khi thiếu binding. ZIP có đầy đủ các mốc.

**Sử dụng.** Pause/Resume, Reset, checkbox Links, Radius, Separation: năm binding tác động ngay lên chính đàn. Tab/Shift+Tab chuyển focus, Enter/Space kích hoạt nút, mũi tên/Home/End chỉnh slider. Click ngoài Panel chọn chim; drag slider ra ngoài không chọn chim. E bật trace, B đổi chính sách stop ở nhóm. Phím 1 nạp bảng thường, 2 ưu tiên tham số, 3 thử file HTML hợp lệ nhưng thiếu binding; F4 nạp lại markup, F5 nạp stylesheet. Mất focus/resize hủy thao tác đang dở.

**Hợp đồng sự kiện.** Mỗi (WidgetId, loại event) có tối đa một callback; tra cứu đăng ký dùng ID chuỗi. Click chỉ phát khi thả đúng nút đã nhấn. Input phát khi mẫu đã snap thật sự đổi; Change chốt một gesture khi giá trị cuối khác lúc bắt đầu. Tab là hành vi mặc định của bộ điều hướng, không kích hoạt nút. handled không ngăn ancestor quan sát; stopped chặn các ancestor còn lại. Bảng chiếm cú nhấn trên vùng UI, kể cả nền, không chuyển ngược cho cảnh khi callback không xử lý. Quyền sở hữu kết thúc khi thả hoặc hủy. Reload thành công thay cùng lúc cây, style, layout và callback. Thiếu control bắt buộc giữ phiên cũ, hủy gesture đang mở; không còn callback tới cây đã mất.

Test Debug và Release đọc đúng hai file bố cục, đối chiếu trình tự target/ancestor, số callback, nhấn/thả ngoài, focus, mất capture, generation cũ và tác động lên năm chức năng. Tự kiểm với chuột thật sau khi resize, dùng phím Tab ở hai preset và nhìn đàn bay khi đóng trace.
