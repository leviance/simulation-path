# Project 65 — Bàn quan sát đàn chim

Bạn vừa dừng một đàn 192 con ở giữa đường bay. Chim màu vàng đang nhìn thấy những con nào? Kéo **Sense radius** khi đang Pause: vòng quan sát nở ra, chim mới lọt vào vòng chuyển xanh, nhưng không con nào được dịch chuyển. **Separation** trả lời câu khác: những con đã nhìn thấy nhau sẽ tránh nhau mạnh đến đâu ở bước kế tiếp?

## Tự thử trước khi đọc lời giải

Vẽ bảng điều khiển ngay cạnh đàn bằng SDL3. Làm hai nút Pause/Resume, Reset, một checkbox và hai slider. Thử kéo từ panel ra giữa đàn: không được vô tình chọn một con chim mới. Đừng dùng ImGui; cây widget và layout tự động là việc của Project 66, 67.

## Mở và chạy

Cần C++20, CMake từ 3.24 và SDL 3.4.8 (CMake tự lấy đúng bản khi cấu hình lần đầu). Từ thư mục có `CMakeLists.txt`:

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 15
.\build\Release\project_65_final.exe
```

Với Ninja single-config, thêm `-DCMAKE_BUILD_TYPE=Release` ở bước cấu hình và chạy `./build/project_65_final`. Trên Windows dùng Visual Studio 2022. `starter`, bảy `checkpoints` và `final` đều tự đủ. Không cần tải ZIP Project 28; các header `boids/` và `grid/` được cung cấp từ đúng project đó. Bài này không đổi luật Boids và không đặt lại mục tiêu benchmark 10.000 cá thể.

## Con đường từ starter đến bản hoàn chỉnh

1. Cho đàn bay theo bước 1/60 giây; Pause không khóa cửa sổ.
2. Vẽ panel và thử hover theo cùng bounds được dùng để vẽ.
3. Phân biệt press với click hoàn tất; làm Reset và checkbox.
4. Nối chuột vào bán kính 20–140 px và trọng số tách 0–5.
5. Dùng Tab, Shift+Tab, Enter/Space, mũi tên và Home/End.
6. Chọn chim khi resize hoặc có letterbox; hủy capture khi mất focus.
7. Đối chiếu hàng xóm lưới với vét cạn, rồi nghiệm thu cả panel.

## Checklist trong cửa sổ C++

- Chọn chim bằng click vào viewport. Vàng là chim đang theo dõi; xanh là láng giềng theo khoảng cách tuần hoàn. Một con gần mép có thể thấy một con ở mép đối diện.
- Pause, đổi Radius: ID và tick giữ nguyên. Đổi Separation: quỹ đạo chỉ đổi sau khi chạy hoặc bấm N để tiến đúng một bước.
- Tắt Neighbors, quan sát đàn tiếp tục bay như trước. Reset khôi phục seed 28, bán kính 64, Separation 1,5, bật quan sát và giữ trạng thái chạy/dừng.
- Nhấn một nút, kéo ra ngoài và thả. Lệnh không được chạy. Kéo slider ra khỏi panel thì giá trị vẫn phải cập nhật và dừng ở hai đầu.
- F1 ghi kết quả đối chiếu vào log; chạy thêm `ctest --test-dir build -C Debug --output-on-failure --timeout 15` sau khi build Debug.

Ảnh minh họa trên web lấy từ chính executable bằng `--capture ten-anh.png`. Hai ảnh so bán kính dùng checkpoint 4, cùng tick 0 và seed, với `--take near` hoặc `--take wide`. Không dùng ảnh để thay cho kiểm input thật.
