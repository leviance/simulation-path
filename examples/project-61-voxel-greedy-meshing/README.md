# Project 61 — Gộp tường voxel thành mảng lớn: Greedy Meshing

Giữ nguyên chunk và bề mặt, chỉ thay cách chia mesh: các mặt ngoài cùng plane/hướng/material được gộp thành rectangle lớn. Full chunk 16³ từ 1536 quad/3072 triangle còn 6 quad/12 triangle. Đây không phải xóa block hoặc chỉ render sáu mặt bất kể dữ liệu.

## Tự thử trước khi đọc lời giải

Trong 150–210 phút, thêm chế độ baseline/greedy vào khung đã hiển thị được chunk. Cho xoay camera, đổi preset và đọc bảng 2D của một hướng mặt. Kiểm tường sọc giữ màu, khoang Air không bị lấp, checker không gộp nhầm. Không cần editor hoặc streaming.

Prerequisite: Project 58–59 (storage, neighbor-face elimination, camera/rasterizer CPU). Project 60 hữu ích cho luồng edit/dirty, nhưng ZIP này có đủ nền và không cần chép file từ module khác. Thời gian học 14–18 giờ.

## Chín bài theo công việc thực tế

| Snapshot | Kết quả |
| --- | --- |
| starter | Window, texture, chunk đặc đã bỏ mặt tiếp giáp, camera/rasterizer chạy được |
| 01 | Readout mặt đơn vị/quad/triangle của baseline |
| 02 | Mask một hướng/plane, bảng vật liệu 16×16 |
| 03 | Khóa material, tách culling khỏi merging |
| 04 | Rectangle width-first, height kiểm cả hàng, xóa vùng đã dùng |
| 05 | Tích hợp quad lớn riêng +Y: full=1281 quad |
| 06 | Gộp đủ sáu hướng, cut y: full=6 quad |
| 07 | Preview lưu sẵn, bước tay/playback có giới hạn |
| 08 | Cache mesh/frame, idle không rebuild/raster |
| 09/final | Oracle độc lập, winding, fixture, raster/depth và cache tests |

source-template/ là nguồn chuẩn trong repository website; chạy npm run generate:course ở gốc để sinh CMake/snapshot. ZIP đã có starter, checkpoints/01…09, final, tests và CMake. Mỗi snapshot có mã hoàn chỉnh, comment và các khối cách nhau; không tự ghép snippet rời để build.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows: Visual Studio 2022, Desktop development with C++. Chạy build/Debug/project_61_final.exe. Target final mặc định; BUILD_CHECKPOINTS bật starter và project_61_checkpoint_1…9. Single-config generator dùng CMAKE_BUILD_TYPE và executable ở build. C++20, CMake ≥3.24, SDL3 3.4.8 khóa URL/checksum bằng FetchContent, link SDL3::SDL3. Không assets/font library ngoài SDL runtime.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_61_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke hidden thoát sau một frame. CTest thuần không tạo window và vẫn kiểm trong Release. Dùng tối đa hai compiler, deadline ngoài cho automation/build tree, không retry hoặc benchmark vô hạn.

## Điều khiển final

- P: chín preset (số 8 là mask 4×4 của bài 04); R: reset. M: baseline/greedy.
- Arrow hoặc left drag: orbit; +/−: zoom. Blur/minimize nhả capture và dừng playback.
- F: hướng mặt, [ / ]: plane 0..16. PageUp/PageDown: cut y 0..15.
- N: rectangle tiếp; Space: chạy/dừng preview, chạy lại từ đầu nếu đã hết.
- V: đối chiếu oracle của khối hiện tại; Escape: thoát.

Native dùng nhãn ASCII. Canvas có nút/range/select thay thế keyboard, DPR, pointer capture/cancel, reduced-motion và readout tiếng Việt. Mở tạm dừng; không bắt người học dùng chuột để đi bước.

Canvas đánh dấu seed và ô làm dừng width/height của rectangle đang xem; dữ liệu lấy từ danh sách đã trích và mask sau các rectangle trước đó. Playback chờ đủ 150 ms từ mốc RAF đầu, tạo đồng hồ mới khi Resume và không chạy bù thời gian Pause. Bài 04 có mask 4×4 với bốn rectangle được kiểm chung trong Node/CTest.

## Quy ước và phạm vi

- Chunk 16³, index=x+16*(z+16*y), Air=0, Grass/Dirt/Stone=1/2/3 đều opaque, y lên trên. Mesher chỉ đọc storage.
- Culling: source đặc và neighbor Air/ngoài miền active thì giữ. Khác material vẫn che nhau. Cut dùng cùng activeBlock cho cả source/neighbor.
- Face 0..5 = +X,−X,+Y,−Y,+Z,−Z. axis=face/2; uAxis=(axis+1)%3, vAxis=(axis+2)%3. +Y dùng u=Z, v=X.
- Plane 0..16; source dương=plane−1, âm=plane. Vertex có thể bằng 16 nhưng index block chỉ 0..15.
- Mỗi mask thuộc một direction/plane; material là khóa biến thiên. Duyệt v rồi u, width trước height; kiểm mọi ô hàng mới và xóa đúng w×h.
- Quad corners P,P+wU,P+wU+hV,P+hV; hướng dương 0-1-2/0-2-3, âm đảo. Flat color theo material/hướng; chưa UV/AO/transparency.
- 6×17×256=26112 mask samples cho greedy. comparisons đếm kiểm khóa khi mở rectangle, không phải ms. Baseline samples là neighbor checks, đơn vị khác.
- Preview lưu danh sách rectangle của một mask, chỉ hiện prefix; mesh 3D luôn đầy đủ. Không diễn giả mesher bị tạm dừng giữa thuật toán.
- Idle không rebuild/raster, camera chỉ frameDirty, chunk/cut/merge làm meshDirty. SDL present vẫn chạy. Preview plane/face không rebuild mesh.
- Greedy không cam kết ít quad nhất. T-junction có thể có; demo CPU flat-color không chứng minh watertight cho mọi renderer hoặc thích hợp làm collision mesh.

Chia source theo trách nhiệm: model/preset, quad, baseline, mask, rectangles, mesh, raster, stepper, cache, oracle, app (SDL controls/view), main (lifetime/event loop). Các file nhỏ, snapshot độc lập. Có thể nối edit Project 60 qua meshDirty; chưa tích hợp editor, streaming, controller hoặc texture atlas.

## Nghiệm thu

Fixture: single=6, full=6, cavity=12, empty=0, checker=12288 quad. Full baseline=1536 quad; full cut y=0 có 576 mặt đơn vị/6 quad. Tường sọc không gộp qua vật liệu.

Oracle quét block-neighbor độc lập với makeMask; key gồm x/y/z/direction/material. Bung quad, sort và so multiset để bắt duplicate, mất mặt và đổi material. Test thêm winding/bounds sáu hướng, mask chữ L, cut 0/7/15, storage không đổi, cache idle/camera/mode, raster coverage/depth ở camera hữu hạn. Màu pixel tie đồng phẳng không so byte-for-byte.

Desktop QA riêng: preset/cut/plane/face, M, orbit/zoom, step/pause/reset, repeat/blur/capture, resize/high-DPI. Node/CTest và smoke không thay tương tác desktop. Project 62 (streaming) chưa nằm trong source này.
