# Project 59 — Ẩn các mặt nằm trong đất

Nâng cấp chunk 16³ của Project 58 bằng neighbor-face elimination: không tạo mặt tiếp giáp giữa hai block opaque. Cùng dữ liệu và camera, full chunk giảm từ 49152 xuống 3072 triangles; Z-buffer vẫn bật, bề mặt ngoài không đổi.

## Thử sức trước lời giải

Trong 2–3 giờ, tự giữ baseline và thêm chế độ chỉ dựng mặt giáp Air. Phải đúng ở cả sáu biên, khác vật liệu, khoang rỗng, checker và lớp cắt. Thêm bộ đếm và công cụ đọc từng mặt; đừng chỉ báo “hình trông ổn”. Chưa cần OpenGL, texture hoặc greedy meshing.

Prerequisite chính là Project 58: Block ID/layout, mesh sáu mặt, camera, rasterizer/Z-buffer và bảng lớp. Tất cả code nền đã có trong ZIP, không cần chép header từ project cũ. Thời gian học dự kiến 12–16 giờ.

## Tám bước

| Snapshot | Nội dung |
| --- | --- |
| starter | SDL/window/texture, camera và rasterizer chạy được, mesh rỗng |
| 01 | Baseline đủ sáu mặt mỗi block và bộ đếm |
| 02 | appendFace sinh hai triangles, refactor chưa đổi hình |
| 03 | Sáu neighbor, biên an toàn, chuyển baseline/culled bằng M |
| 04 | Opaque khác ID, cavity, checker, empty, steps |
| 05 | Cắt y<=slice, giữ nắp, không sửa Chunk |
| 06 | Chọn block/hướng, đọc nguyên nhân giữ/bỏ |
| 07 | meshDirty/frameDirty và counters đúng việc |
| 08/final | Oracle F=6N−2E, tập mặt theo plane sweep, winding/depth/cache tests |

Trong repository, source-template/ là nguồn chuẩn; starter/checkpoints/final và CMake được sinh bởi npm run generate:course ở gốc website. ZIP đã có các snapshot độc lập và không cần Node hoặc web server để chạy native.

## Build và kiểm tra

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Visual Studio 2022 cần Desktop development with C++. Chạy build/Debug/project_59_final.exe. Final là target mặc định; BUILD_CHECKPOINTS thêm starter và checkpoint_1…8. Single-config generator đặt CMAKE_BUILD_TYPE, executable trực tiếp trong build. SDL3 3.4.8 được FetchContent với checksum, link SDL3::SDL3, không cần asset/font library ngoài SDL runtime.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_59_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke chỉ một frame, không benchmark hoặc auto rotation. CTest thuần không mở SDL; check tường minh còn hoạt động ở Release. Các build/test cần timeout ngoài và tối đa 2 compiler; không tự thử lại vô hạn nếu một bước lỗi.

## Điều khiển final

P preset, M baseline/culled, R reset, drag/arrow orbit, +/− zoom, Space chạy/dừng, PageUp/PageDown cut. Inspector: U/I x, J/K y, N/O z, F hướng +X/−X/+Y/−Y/+Z/−Z; click/drag bảng đọc x/z tại selected y. V pure audit, Escape thoát. Focus loss dừng/nhả capture. Nhãn native ASCII, bài học và Canvas tiếng Việt.

## Quy ước và đáp án

- y hướng lên; index=x+16*(z+16*y), local 0..15. Air=0, mọi ID còn lại opaque, kể cả khi khác vật liệu.
- Giữ mặt khi neighbor không active solid. Ngoài chunk đơn lẻ và trên display cut là Air hiển thị; không wrap/clamp hoặc get ngoài mảng.
- Từng mặt có hai triangles CCW; không gộp quad. Z-buffer trực giao 320×240, clear -infinity, depth lớn hơn gần hơn.
- Quad single/pair/full/cavity/checker/empty/steps: 6/10/1536/1542/12288/0/912. Full giảm 93.75% triangles, checker không giảm.
- Full slice=0 là 16×1×16: 576 quad/1152 triangles, storage không đổi. Bảng inspector y độc lập với display cut.
- Geometry change mới meshDirty, camera chỉ frameDirty, selection chỉ overlay. Giảm triangles không hứa FPS tăng cùng tỷ lệ.

Nguồn được chia theo trách nhiệm: model (storage/presets), geometry (quad/triangles), mesh (neighbor rules), inspection (lý do), cache (invalidation), raster (CPU/Z-buffer), controls/view và main. Chưa ray picking, phá/đặt block, trong suốt, greedy meshing hoặc dữ liệu chunk lân cận.

Kiểm desktop riêng: bảy preset, chuyển M giữ camera, cut caps, inspector, keyboard, capture/cancel, resize/high-DPI/letterbox và blur/pause/reset. Project 60 mới ray chọn/phá/đặt block, Project 61 mới greedy meshing, Project 62 mới streaming; chúng không nằm trong source này.
