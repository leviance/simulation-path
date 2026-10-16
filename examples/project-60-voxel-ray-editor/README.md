# Project 60 — Chọn, phá và đặt block bằng tia từ camera

Biến chunk 16³ của Project 59 thành editor nhỏ: ngắm pixel, tạo ray trực giao, clip vào chunk, đi qua từng ô bằng 3D DDA, rồi phá/đặt đúng một block mỗi lần nhấn. Không đọc màu pixel để đoán ID, không dùng Hit cũ để sửa world.

## Tự thử trước khi đọc lời giải

Trong 150–210 phút, tự thêm tâm ngắm, outline hit và ghost đặt block vào khung có sẵn. Click trái phá block gần nhất, click phải đặt vào Air sát mặt vừa chọn. Kiểm được ray âm, song song, biên/góc, MISS và đặt vượt chunk. Chưa cần controller FPS, texture hoặc greedy meshing.

Prerequisite chính: Project 58–59 (storage, mesher, camera/rasterizer, dirty flags); Project 52 ray/AABB là phần ôn hữu ích. Thời gian học khoảng 14–18 giờ. ZIP chứa code nền, không cần chép file từ module khác.

## Chín bước chạy độc lập

| Snapshot | Kết quả mới |
| --- | --- |
| starter | Đất bậc thang đã loại mặt tiếp giáp, camera/window/rasterizer chạy được |
| 01 | Crosshair, mouse/WASD aim, đổi logical coordinate về CPU pixel |
| 02 | Ray từ phép chiếu trực giao, kiểm chiếu ngược đúng pixel |
| 03 | Slab clip, half-open chunk, reach, phương song song |
| 04 | 3D DDA step/tMax/tDelta, xem từng visit, chưa dừng ở đất |
| 05 | Hit đầu tiên, entry normal, quy tắc tie và origin-inside |
| 06 | Break action re-query, mỗi lần nhấn đổi tối đa một ID |
| 07 | Place tại hit+normal, ghost, occupancy/bounds/material |
| 08 | Cache preview/mesh/frame riêng, counter có ý nghĩa rõ ràng |
| 09/final | Oracle AABB hữu hạn, fixture, mutation/cache tests |

Trong repository website, source-template/ là nguồn chuẩn; chạy npm run generate:course ở gốc để sinh snapshot/CMake. Trong ZIP, mọi snapshot và CMake đã sẵn có, không cần Node hoặc web server để build native. Không sửa file generated trong repository.

## Build và test

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows: Visual Studio 2022, workload Desktop development with C++. Final là target mặc định; BUILD_CHECKPOINTS thêm starter và checkpoint_1…9. Chạy build/Debug/project_60_final.exe. Single-config generator đặt CMAKE_BUILD_TYPE, executable trực tiếp trong build. C++20, CMake ≥3.24, SDL3 3.4.8 khóa URL/checksum qua FetchContent, link SDL3::SDL3. Không cần assets/font library ngoài SDL runtime.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_60_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke mở hidden và thoát sau một frame. CTest thuần không tạo SDL window, check còn hiệu lực ở Release. Giới hạn hai compiler; khi dùng automation/CI cần thêm deadline ngoài để giới hạn cả build/process tree. Không retry hoặc benchmark vô hạn.

## Điều khiển final

- Mouse hover hoặc WASD: dịch aim. Middle drag hoặc arrow: orbit. +/−: zoom.
- Left click, Delete/Backspace: phá. Right click hoặc E: đặt. 1/2/3: Grass/Dirt/Stone.
- [ / ]: reach 1..64. Space: chạy/dừng preview DDA. N: bước tiếp theo.
- P: bảy preset. R: reset. V: pure oracle audit hữu hạn. Escape: thoát.
- Một button-down hoặc key-down không repeat là một action; giữ/kéo không auto-paint. Blur/minimize nhả capture và dừng playback. Nhãn native ASCII; bài học/Canvas tiếng Việt.

## Quy ước phải giữ đúng

- y hướng lên, index=x+16*(z+16*y), Air=0, Grass/Dirt/Stone=1/2/3 opaque. Chỉ một chunk [0,16)³, không display cut.
- CPU 320×240, projection scale=6, center=8, zoom=.5..1.5; ray đi qua pixel center (x+.5,y+.5). Camera trực giao: origin khác theo pixel, direction giống nhau.
- Origin trên camera depth=32, direction normalized, t/reach là world distance từ origin plane, không từ mắt FPS. API reach (0,64], UI 1..64. Origin finite trong ±128; reject ray sai trước traversal.
- Slab/visit chỉ nhận đoạn có exit−enter>1e-9 theo t; contact-only và đoạn mỏng không vượt tolerance được bỏ. Direction component 0 dùng infinity, không chia zero.
- Biên nguyên đi chiều âm bắt đầu ở ô phía âm. Tie trong tolerance step mọi trục, normal ưu tiên X/Y/Z. Không chọn ô chỉ chạm cạnh/góc. Tối đa 64 vòng, vượt giới hạn là lỗi.
- Origin trong block: hit t=0, normal zero; được phá nhưng không đặt. Target=hit.cell+normal chỉ hợp lệ khi normal đơn trục, còn Air và trong chunk. Không overwrite hoặc tự sinh chunk kế bên.
- Query không sửa storage. Action re-query dữ liệu hiện tại; preview chỉ đọc. Aim/reach chỉ pickDirty, camera thêm frameDirty, edit thành công thêm meshDirty. Counter queries đếm refresh preview, không đếm query xác nhận action.
- Outline/ghost là debug overlay. Inset XZ có thể chồng các visit khác y; đọc XYZ/t ở text. World chỉ ở RAM, không persistence/undo.

Nguồn chia theo trách nhiệm: model/geometry/mesh/raster/cache kế thừa, ray (camera), clip (slab), traversal (DDA), editing (mutation), editor (state/invalidation), audit (oracle), controls/view, main (SDL lifetime). Snapshot không cần file bên ngoài thư mục project.

## Nghiệm thu

Pure tests: chiếu ngược pixel, axis/parallel/signed-zero/tangent/reach/negative-entry/inside, tie không phantom cell, nearest hit/normal, oracle bảy preset, mutation một ID, stale-preview và cache counters. Oracle dùng chung clipBox nên vẫn cần fixture có đáp án tính tay.

Desktop kiểm riêng: preset, aim/orbit/zoom/reach, break/place/material, một action mỗi nhấn, capture/cancel/blur/reset, resize/high-DPI/letterbox. Canvas thêm reduced-motion/manual step và các nút keyboard-accessible. Sanity UI chỉ kiểm trace hữu hạn, không thay toàn bộ Node/CTest hoặc QA desktop.

Project 61 (greedy meshing) và 62 (streaming) chưa nằm trong source này. Chưa perspective, controller/collision người chơi, texture, undo hoặc lưu world.
