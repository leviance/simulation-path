# Project 70 — Thanh công cụ co giãn cho bàn Boids

Để Pause, Reset và Links trên cùng một hàng, còn Radius và Separation vẫn nằm dưới nhau. Dùng đúng file HTML đó ở bảng rộng 420, vừa 320 và hẹp 220; không sửa tọa độ theo từng kích thước. Nhìn vùng Links bị clip trong trường hợp cuối rồi thử bấm ra ngoài clip.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --parallel 2
.\build\Release\project_70_final.exe --assets assets
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Không có --assets thì lần F5 sau sẽ đọc thư mục assets cạnh executable. Cần C++20, CMake ≥3.24, SDL 3.4.8. Linux/macOS thêm -DCMAKE_BUILD_TYPE=Release và chạy ./build/project_70_final. Thử lại ở Debug. ZIP chứa starter (bố cục cột Project 69), sáu checkpoint, final, ba stylesheet và tests.

| Bài | Nhìn hoặc làm gì |
| --- | --- |
| 1 | Nhận ra main/cross axis trong style.css; X minh họa hướng trước khi xếp hàng. |
| 2 | Dùng kích thước cơ sở và gap để đặt nút trên cùng một hàng. |
| 3 | Nới cửa sổ: phần dư được chia theo grow (Pause 1 phần, Links 2 phần). |
| 4 | Nhấn 2 để đọc column.css: main/cross đổi vai; quan sát căn cuối và căn giữa. |
| 5 | H ẩn Links; phần trống và gap biến mất. Chuột, Tab luôn theo đúng node còn sống. |
| 6 | 4/5/6 cho ba width 220/320/420. X bật/tắt hai trục và viền kết quả; 1 quay lại hàng ngang, 3 về bố cục cột cơ bản. |

**Quy ước.** display:flex hoặc block, flex-direction row/column, flex-basis auto hay 0–600px, flex-grow số 0–8, gap px; justify-content start/center/end/space-between; align-items start/center/end/stretch. Dư chỗ thì grow nhận phần dư trước justify. Thiếu chỗ giữ nguyên basis và clip, không shrink. Stretch chỉ kéo phần tử có kích thước cross tự động; kích thước cross viết rõ được tôn trọng. Không wrap, CSS Grid hay bố trí văn bản. Khi không khai báo width, leaf có preferred width 84px; đây là quy ước của engine nhỏ, không giả vờ đã đo glyph. Panel Auto cộng nội dung và inset; child ẩn không đóng góp base, margin hoặc gap. Thay đổi hình học hủy gesture cũ trước lần bấm tiếp theo.

**Nghiệm thu.** CTest kiểm hàng/cột rỗng, một/nhiều item, mọi align/justify đã công bố, tỷ lệ grow, thiếu chỗ, ba width và click sau reflow. Xem CSS thật trong assets để tự viết preset mới. Thu hẹp, kéo một slider, đổi chiều toolbar, dùng Tab và nhấn Pause; trong lúc đó solver và lịch sử bước đàn không được khởi tạo lại.
