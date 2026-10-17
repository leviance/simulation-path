# Project 65 — Bảng điều khiển C++: Pause, Reset và slider chỉnh trọng lực

Sau phần voxel, ta quay về một cảnh nhỏ để tập trung vào một việc mới: tự viết UI cho simulator. Bóng rơi và nảy trên sàn là nội dung cần điều khiển; ba control bên phải là sản phẩm chính. Không cần kéo theo renderer 3D hay source Project 64.

## Thử tự xây trước khi đọc lời giải

Dành 90–150 phút viết một cửa sổ có bóng rơi, nút Pause/Resume, Reset và slider trọng lực 0..1200. Pause phải giữ UI hoạt động. Thử nhấn nút rồi kéo ra ngoài trước khi thả, kéo slider ngoài cửa sổ và chuyển sang ứng dụng khác giữa thao tác. Giải thích quy tắc Reset trước khi viết code: ở đây Reset giữ gravity và Pause, chỉ khôi phục cảnh.

Prerequisites: Project 01–05 và chuyển động/va chạm cơ bản từ Project 22–24; C++ struct, enum class, hàm và tham chiếu. Thời gian học 9–12 giờ. ZIP tự build độc lập, không cần assets hoặc thư viện UI.

## Một chương trình, bảy bước phát triển

| Snapshot | Kết quả |
| --- | --- |
| starter | Window, renderer, nền cảnh, sàn và hình vuông đánh dấu vị trí bóng; chưa chạy vật lý |
| 01 | Bóng tròn, fixedDt 1/120 s, readout y/v/ticks; Space chạy/dừng, N một bước khi Pause |
| 02 | Panel và hai button được vẽ từ Rect; hover dùng hit-test half-open, chưa click được |
| 03 | Hot/active/focus, press/release, capture, Pause/Reset và clockRevision |
| 04 | Slider gravity cập nhật liên tục, clamp hai đầu và giữ active ngoài panel |
| 05 | Focus ring, Tab/Shift+Tab, Enter/Space, arrows/Home/End, chặn activation repeat |
| 06 | Window resizable, logical letterbox, đổi tọa độ event, UI nhận trước scene; click cảnh đổi Y bóng |
| 07/final | State audit F1 và bộ kiểm chứng thuần, full source, nghiệm thu Debug/Release |

`source-template/` là nguồn chuẩn trong repository website; `npm run generate:course` tạo snapshot và CMake. ZIP đã có starter, checkpoints/01…07, final và tests. Cuối mỗi bài trên web có toàn bộ mã chạy được ở mốc đó.

## Build, chạy và kiểm tra

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Debug/project_65_final.exe
```

C++20, CMake ≥3.24, Windows/Visual Studio 2022 Desktop development with C++; SDL khóa 3.4.8 bằng FetchContent và checksum, link SDL3::SDL3. Final là target mặc định; BUILD_CHECKPOINTS thêm starter và project_65_checkpoint_1…7. Với Ninja/Make single-config, thêm CMAKE_BUILD_TYPE=Debug và chạy executable ngay trong build/. Không chạy Debug lẫn Release vào cùng một thư mục single-config.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_65_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Hidden smoke chỉ vẽ một frame rồi thoát, không file/clipboard. CTest không mở window; check vẫn chạy trong Release, không dùng assert bị NDEBUG tắt. Automation cần deadline cho cả process tree, tối đa hai compiler. Smoke không thay kiểm chuột/bàn phím thật. Không có lệnh tự mở dev server.

## Quy tắc điều khiển

- Khởi động Pause. Tab/Shift+Tab đi vòng Pause → Reset → Gravity; Enter/Space nhấn nút một lần. Không còn Space toàn cục từ checkpoint 05 để tránh đụng focus.
- Slider: chuột hoặc arrows từng 20, Home/End về 0/1200; arrow được repeat, button không được repeat. N một bước khi Pause, F1 log audit ở final. Esc hủy gesture, không thoát app.
- Nhấn và thả cùng button mới kích hoạt. Nhấn rồi ra ngoài, thả ngoài thì hủy; ra ngoài rồi quay lại trước khi thả vẫn hợp lệ.
- Khi giữ slider, active vẫn là Gravity dù hot sang control khác. Capture chỉ tồn tại trong gesture. Capture không hỗ trợ thì native log lỗi và hủy gesture; giá trị slider đã cập nhật khi nhấn không rollback.
- Up nhận tọa độ slider cuối trước khi xóa active, kể cả khi không có motion ngay trước đó. Down (800,252) rồi up (1200,252) cho gravity=1200; up (−100,252) cho 0. Cancel không thêm tọa độ cuối và không rollback giá trị đã kéo.
- Gravity đổi ngay, kể cả khi Pause, nhưng không tự đổi vị trí/vận tốc. Reset y=90, v=0, ticks=0, accumulator=0 và giữ gravity/paused. Reset đang chạy vẫn chạy tiếp từ cảnh mới; frame action không tính thời gian cũ.
- Panel, kể cả chỗ trống, nhận input trước scene. Chỉ click trong scene mới đổi Y bóng và tăng scenePresses. Kéo slider qua scene không được di chuyển bóng.
- Resize/focus lost/minimized/hidden hủy kéo và Pause; người dùng chủ động Resume. Vùng letterbox ngoài mặt phẳng logic không hit control.

## Mô hình và giới hạn

Mọi tọa độ dùng mặt phẳng logic 960×540. Y tăng xuống; v += g*h rồi y += v*h với h=1/120 s. Gravity đơn vị logical pixel/s², không phải m/s². Sàn y=460, bán kính 14; tâm bóng nằm trong [48,446]. Va chạm trần/sàn nhân tốc độ với 0.72, sàn cho dừng khi |v|<8 để tránh rung mãi. Đây là cảnh minh họa, không phải bộ giải va chạm tổng quát hoặc bảo toàn năng lượng.

Một frame nhận tối đa 0.1 s, tối đa 12 bước. Frame quá chậm bị bỏ bớt thời gian, không chạy bù vô hạn. Pause xóa accumulator; clockRevision làm main bỏ elapsed cũ khi pause/resume/reset/đổi vị trí. UI/render không bị Pause chặn.

Native dùng SDL_RenderDebugText với nhãn ASCII; đây là font debug nhỏ, không hỗ trợ chữ tiếng Việt. Bài tập mở rộng có thể dùng SDL_ttf sau. Chưa widget tree, layout tự động, HTML/CSS, theme engine, text input, nhiều cửa sổ hoặc lưu trạng thái.

Canvas dùng cùng công thức, Rect và quy tắc input, không chạy C++ qua WebAssembly. Mặc định mỗi bài chạy đúng checkpoint: bài 02 chỉ vẽ/hover, bài 03 nhận click, bài 04 thêm slider, bài 05 thêm focus, bài 06 cho click vào cảnh. Có tùy chọn xem bản hoàn chỉnh; đổi chế độ sẽ reset để không giữ state của tính năng chưa học. Control HTML hỗ trợ trình đọc màn hình, bước thủ công, DPR và reduced-motion. Slider/preset xuất hiện từ bài 04; Tab thoát Canvas ở hai đầu từ bài 05. Preset cố ý Pause rồi reset; Reset thường giữ Pause. Blur/ẩn tab/resize hủy kéo và Pause. Không localStorage cho dữ liệu mô phỏng.

## Nghiệm thu

Kiểm endpoints và biên half-open; round-trip letterbox ở kích thước rộng/cao/2×; release mồ côi, release khác nút, kéo ra rồi vào lại; slider midpoint/clamp; hover không lấy active/focus; keyboard repeat/Tab hai chiều; UI không lọt click xuống scene; reset giữ lựa chọn. Free-flight 60 bước được đối chiếu bằng tổng cấp số cộng độc lập, không gọi lại thuật toán simulator. Test dt partitions, giới hạn frame, NaN/Infinity và stress hữu hạn 12000 frame. Audit chỉ kiểm invariant, không chứng minh toàn bộ UI đúng; capture thực tế cần desktop QA riêng.

Tiếp theo là Project 66: giữ một cây giao diện qua nhiều frame. Các project chưa phát hành được ghi **Sắp ra mắt** trong roadmap.
