# Project 67 — Bố cục hộp tự động

Xây một layout engine một cột cho cây Widget của Project 66. Panel chứa Label, Button, Slider; thay gap, padding, width constraint, ẩn/thêm/xóa control mà không sửa tọa độ y phía sau. C++20, CMake ≥3.24, SDL3 3.4.8; không dùng thư viện UI ngoài.

## Tự thử trước khi đọc lời giải

Tạo root Panel có tiêu đề, Group điều khiển bóng rơi và footer. Tính content box từ margin/border/padding; Group Auto height, root Fixed height. Đổi width 320→220, ẩn Reset và thêm Label. Cây/ID phải sống qua nhiều frame; layout mới được dùng cho cả vẽ và input. Thử đổi gap khi đang kéo Slider: phải hủy gesture cũ, không crash hoặc thả nhầm control.

Đây chưa phải CSS/Flexbox. Chỉ một cột; không wrap chữ, percent, scrolling, row/column hay flex grow/shrink. Project 68 đọc panel.html, 69 đọc style.css, 70 mới xây TinyFlex.

## Chín checkpoint

| Mốc | Nội dung |
| --- | --- |
| starter | Window, renderer, bóng/sàn và cây phẳng có control chạy được; Rect đặt tay |
| 01 | Thêm describePause và số đọc world bounds để theo đường đi từ builder tới hình vẽ |
| 02 | Style riêng, Edges và content box; vẽ overlay chẩn đoán |
| 03 | Measure Fill/Fixed width và số đo border box; chưa arrange |
| 04 | Arrange một cột phẳng, cursorY, margin cộng và gap giữa child |
| 05 | Group lồng nhau, Auto height; measure rồi arrange, mỗi node một lần mỗi bước |
| 06 | Hidden không chiếm chỗ, thêm/xóa tối đa bốn Label, dọn Style theo ID |
| 07 | Dirty flag, width constraint, ensure trước input, hủy gesture trên geometry cũ |
| 08 | Fixed overflow, clip tổ tiên, bounds khác phần nhìn thấy |
| 09/final | Audit, test fixture/cache/input, mã hoàn chỉnh và nghiệm thu |

`source-template/` là nguồn chuẩn trong repository website. `npm run generate:course` sinh CMake/starter/checkpoints/final, không sửa trực tiếp output. ZIP có mọi snapshot, README và tests; không cần source từ Project 66. Các bài web có đầy đủ source tại đúng mốc, không phải tự ghép snippet.

## Build/run/test

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Debug/project_67_final.exe
```

Target final mặc định; bật BUILD_CHECKPOINTS để build starter và chín checkpoint, ví dụ project_67_checkpoint_5. Ninja/Make dùng hai build directory với CMAKE_BUILD_TYPE tương ứng, executable nằm trực tiếp trong build/. SDL3 được khóa 3.4.8 qua FetchContent với checksum, link bằng SDL3::SDL3. Configure đầu cần mạng. CI có thể dùng exact installed SDL3 thay FetchContent.

Mỗi build cần watchdog ngoài, tối đa hai compiler. CTest timeout không giới hạn compile; không retry vô hạn. Một smoke chỉ vẽ một frame ẩn, không ghi clipboard/file và không thay desktop QA:

```powershell
$trial = Start-Process -FilePath ".\build\Debug\project_67_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $trial.WaitForExit(10000)) {
    taskkill.exe /PID $trial.Id /T /F
    throw "Smoke vượt 10 giây."
}
if ($trial.ExitCode -ne 0) { throw "Smoke thất bại." }
```

## Điều khiển

- Chuột, Tab/Shift+Tab, Enter/Space, arrow/Home/End cho Slider kế thừa Project 66. Native Tab đi vòng; Canvas cho thoát ở hai đầu. Esc hủy gesture, đóng window bằng nút hệ điều hành.
- Space chạy/dừng khi không bị UI consume; N bước 1/120 s khi pause, R reset cảnh. Reset cảnh giữ layout, Style, gravity và trạng thái Pause.
- T khôi phục layout/cây và Ui, giữ y/v/gravity nhưng pause; đây là phiên ID mới, không phải Reset cảnh.
- Từ 02: B hiện/ẩn overlay của Pause; Canvas cho chọn node trong Inspector.
- Từ 04: `[`/`]` giảm/tăng gap 2 (0..32); Canvas có range padding root 0..48, Group nhận max(0,paddingRoot−4).
- Từ 06: H ẩn/hiện Reset, A thêm Label, D xóa Label cuối (tối đa bốn).
- Từ 07: Shift+←/→ đổi root width 20 (220..420), không gửi mũi tên này cho Slider. Resize native cấp constraint clamp(windowWidth/3,220,420); logical space vẫn 960×540. Window units không phải framebuffer pixels.
- Từ 08: O bật/tắt Slider Fixed width=320. Từ 09: F1 audit state hiện tại.

Canvas có preset, HTML control thay thế, pause/reset/bước tay, DPR, pointer ownership/capture/cancel, keyboard và reduced-motion. Resize Canvas chỉ scale logical space; range width mô phỏng constraint. HTML controls không nằm trong node count và không biến Canvas thành accessibility tree. Không WebAssembly, backend hoặc lưu cây/layout qua reload.

## Quy tắc layout

Style là input, Widget::local là output. Border-box width/height bao gồm border/padding; margin nằm ngoài. Fill trừ margin ngang khỏi availableWidth, Fixed giữ nguyên kể cả tràn. Auto height chỉ cho Panel; leaf height 24/36/32 đã gồm inset, không đo font hoặc wrap chữ.

Measure xác định width khi đi xuống rồi height khi quay lên; arrange dùng Measures để đặt local từ parent xuống child. Không đo lại trong arrange. Child visible tham gia theo thứ tự cây; margin cộng, không collapse; N child có max(0,N−1) gap, không có gap đầu/cuối. Hidden không chiếm chỗ, disabled vẫn chiếm chỗ.

Root mặc định x=616,y=24,width=320,height=492,border=2,padding=16,gap=8,margin=0. Group margin=4,padding=12,border=2,gap=8, Auto height. Group width=276, content width=248, height=252. Pause world=(656,96), width=240,height=36. Root naturalHeight=360, không đồng nghĩa height=492. Ẩn Reset giảm Group 52; thêm bốn Label tăng Group lên 412 và root naturalHeight lên 520.

Clip theo border bounds tổ tiên, không theo content box. Fixed Slider rộng 320 trong root width=220 có world x=756, clip width=158; phần ngoài clip không down được, nhưng capture đang có vẫn nhận tọa độ cuối ở move/up. Tính gravity theo bounds đầy đủ, không chia clip.width. Chưa có scroll, shrink hoặc wrap.

Tối đa 32 node/depth 6; tối đa bốn Label thêm; margin≤64,padding≤48,border≤8,gap≤32; Fixed width 8..600,height 8..540. Content width có thể bằng 0, không âm. Output của Panel Auto có thể cao hơn viewport; không áp validRect dành cho Rect tạm của add lên output rồi từ chối overflow hợp lệ.

Từ checkpoint 07, mọi thay đổi layout đi qua setter/invalidate; ensure chạy trước input và render. Mutation trực tiếp Style/children phải invalidate, engine không tự phát hiện mọi lần ghi. Gravity/ticks/hover/reset physics không dirty. Thay geometry hủy gesture/capture cũ; focus reconcile sau arrange. Không giữ Widget* hoặc iterator qua mutation.

## Kiểm chứng và giới hạn

Tests thuần dùng check/EXIT_FAILURE, không assert/NDEBUG và không mở window. Fixture world/height được tính độc lập; kiểm asymmetric edges, gap/hidden, Fill/Fixed, zero width, nested Auto, Style cleanup, ID lifetime, dirty no-op, input sau đổi constraint, cancel và 1000 frame giữ cache/owner. Audit state chỉ kiểm shape/count/style/finite, không chứng minh công thức hoặc thứ tự input.

Desktop QA cần ghi riêng: resize rồi click, drag ra ngoài window, release cuối, hai pointer/cancel/lost capture, blur/DPR, Tab/Shift+Tab, key repeat và reduced-motion. Smoke không thay phần đó. Project 68–78 vẫn Sắp ra mắt.
