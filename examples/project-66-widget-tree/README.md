# Project 66 — Cây giao diện sống qua nhiều frame

Từ ba control riêng lẻ của Project 65, ta xây một cây dữ liệu: Panel chứa Label, Panel con chứa Button và Slider. Cây được tạo một lần, không dựng lại trong `draw`. Cùng node được dùng để vẽ, chọn bằng chuột, đi focus và dọn một nhánh đã bị xóa.

## Tự thử trước khi đọc lời giải

Hãy tự làm một cửa sổ bóng rơi có panel bên phải. Dịch panel phải kéo mọi descendant theo; phần đã bị cắt không được nhận chuột. Khi đang kéo Slider, thử ẩn hoặc xóa cả nhóm control: chương trình phải hủy gesture, không crash hoặc gửi release cho một widget khác. Reset bóng phải giữ cây và trọng lực.

Đây là bước từ các Rect viết riêng sang retained UI, không phải một trình duyệt thu nhỏ. Project 67 mới thêm layout tự động; parser HTML/CSS, TinyFlex, event binding và scripting thuộc các project sau.

## Đi qua tám checkpoint

| Mốc | Sản phẩm nhìn thấy được |
| --- | --- |
| starter | Cửa sổ SDL3, bóng/sàn, Space chạy/dừng, N bước tay, R reset cảnh; chưa có Widget |
| 01 | Widget/Kind/ID, Panel sở hữu Label và Button, cây nằm trong App ngoài vòng while |
| 02 | Panel con chứa Pause/Reset; DFS cộng offset, Shift+arrow dịch root |
| 03 | Giao clip tổ tiên, SDL clip, preset cắt mép Group |
| 04 | Reverse hit-test, hover ID, preset hai Button chồng nhau |
| 05 | Action theo ID, pointer owner, slider world-space và input consumption |
| 06 | Focus order từ cây, Tab, Enter/Space, arrow/Home/End |
| 07 | Ẩn/hiện, enable/disable, thêm Label, xóa cả nhánh, reconcile ID |
| 08/final | Audit cấu trúc, test độc lập, source hoàn chỉnh và nghiệm thu |

`source-template/` là nguồn chuẩn trong repository website. `npm run generate:course` tạo CMake và các snapshot; không sửa trực tiếp output. ZIP có README, starter, tám checkpoint, final và tests, không cần source từ module khác. Mỗi bài trên web cũng có source đầy đủ tại đúng mốc.

## Build và chạy

Yêu cầu C++20, CMake ≥3.24, Visual Studio 2022 hoặc compiler tương đương. CMake dùng FetchContent khóa SDL3 3.4.8 và link qua `SDL3::SDL3`; lần configure đầu cần mạng.

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
./build/Debug/project_66_final.exe
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Với Ninja/Make single-config, configure riêng với `-DCMAKE_BUILD_TYPE=Debug` hoặc Release và chạy executable trong `build/`. Target `project_66_checkpoint_3` chạy riêng bài 03. Final là target ứng dụng mặc định; checkpoint bật bằng `BUILD_CHECKPOINTS`.

Mỗi build phải có watchdog bên ngoài, tối đa hai compiler; CTest `--timeout` không giới hạn thời gian compile. Không chạy một vòng build/retry vô hạn.

```powershell
$trial = Start-Process -FilePath ".\build\Debug\project_66_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $trial.WaitForExit(10000)) {
    taskkill.exe /PID $trial.Id /T /F
    throw "Smoke vượt 10 giây."
}
if ($trial.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke chỉ vẽ một frame ẩn, không ghi file/clipboard và không thay desktop QA.

## Điều khiển native

- Space chạy/dừng khi chưa focus button; N bước 1/120 s lúc Pause, R reset cảnh. Esc hủy gesture, đóng bằng nút window.
- T dựng lại cây mặc định; giữ y/v/gravity nhưng pause và xóa Ui/capture. ID mở phiên mới.
- Từ bài 02: P đổi preset phù hợp checkpoint; Shift+arrow dịch Panel 4 logical pixel. Rect local của con không đổi.
- Từ bài 05: chuột nhấn/thả cùng Button; Slider cập nhật cả mẫu ở release, kể cả kéo ngoài khung. Capture thất bại thì hủy gesture.
- Từ bài 06: Tab/Shift+Tab đi vòng control; Enter/Space không repeat action; arrow/Home/End cho Slider. Shift+arrow chỉ dịch Panel, không chỉnh gravity.
- Từ bài 07: H ẩn/hiện Group, E enable/disable Group, D xóa Group, A thêm tối đa bốn Label vào root.
- Từ bài 08: F1 audit state hiện tại. Kết quả không thay test thứ tự input hoặc kiểm toàn bộ tương tác desktop.

Native dùng nhãn ASCII của SDL_RenderDebugText. Canvas có nhãn tiếng Việt, Inspector cây/local/world/clip, preset, control HTML thay thế, pause/reset/bước tay, DPR, pointer capture/cancel và reduced-motion. Canvas cho Tab thoát ở hai đầu; native Tab đi vòng. Website không chạy C++ qua WebAssembly, không dùng backend để lưu cây.

## Ownership, tọa độ và input

- Root depth=0; tối đa 32 node, depth≤6; chỉ Panel được chứa children. C++ parent sở hữu child bằng `unique_ptr`, TypeScript dùng object tree có cùng cấu trúc.
- ID 0 là None, ID tăng tới 1,000,000 và không tái dùng trong cùng cây; thêm sai bị reject trước khi đổi count/nextId. Không có reparent hoặc nhận một subtree bên ngoài nên API không tạo cycle.
- Local Rect dùng góc parent; world là tổng offset. Chưa scale/rotation/layout tự động. Ví dụ dùng tọa độ nguyên; SDL clip nguyên và Canvas raster có thể khác pixel ở mép phân số, test không đòi ảnh byte-identical.
- Root ở (664,24), Group ở local (24,56), Pause ở (0,0): Pause world (688,80), kích thước 224×44. Trong preset clip Group cao 96, Reset vẫn 224×44 nhưng phần nhìn thấy chỉ cao 36.
- Paint preorder parent→children; pick child cuối trước, rồi parent. Label pass-through. Panel trống và control disable chặn input xuống cảnh; control disable không nhận action/focus.
- `find` đọc ownership, `locate` đọc view có visibility/clip kế thừa. WidgetView có con trỏ chỉ hợp lệ trong thao tác hiện tại; Ui chỉ giữ ID. Không giữ Widget* hoặc iterator qua mutation.
- Hide giữ node/ID; remove nhánh hủy descendants; reconcile hủy active/focus không còn tương tác được. Host giải phóng capture khi active về 0. Cancel không tự hoàn tác gravity đã áp dụng.
- Model là owner riêng: Reset cảnh giữ Tree và gravity/Pause; preset/rebuild tree pause, giữ y/v/gravity, xóa Ui. Cây và mô phỏng không lưu qua reload; localStorage tiến độ bài học là việc khác.

## Giới hạn và kiểm chứng

Vật lý kế thừa Project 65: gravity logical px/s², fixedDt=1/120, tối đa 0.1 s/12 bước mỗi frame. Cây không được cấp phát lại bởi render/input hoặc bước vật lý; builds chỉ tăng khi người dùng chọn dựng lại/preset.

CTest dùng check/EXIT_FAILURE, vẫn có hiệu lực ở Release. Fixture tính world Rect bằng hằng số độc lập, kiểm reverse paint order, clip, ID, node/depth caps, input/cancel, ẩn/xóa trong lúc active, ID không tái dùng, root protection và 1000 lần đọc/cập nhật không dựng lại cây. Audit chỉ kiểm cấu trúc và ID hiện tại, không chứng minh UI dùng thuận tiện. Node test dùng cùng fixture và thêm callback thật của Canvas; test trình duyệt kiểm riêng.

Trước nghiệm thu desktop: thử preset chồng/cắt, slider kéo ngoài window, hai pointer, cancel/blur/resize, keyboard repeat, Tab thoát Canvas, DPR và reduced-motion. Tiếp tục với Project 67 về bố cục hộp tự động; Project 68–78 chưa phát hành vẫn ghi Sắp ra mắt trên roadmap.
