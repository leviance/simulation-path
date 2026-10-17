# Project 64 — Minecraft-like sandbox tối giản của riêng bạn

Ghép các phần voxel đã học thành một sandbox dựng khối có thể dùng được: ngắm, phá/đặt, chọn Grass/Dirt/Stone, đi xa rồi quay về, undo/redo và xuất/nhập bản lưu text. Mục tiêu là hiểu cách các subsystem phối hợp và kiểm chứng nhau, không làm một bản sao đầy đủ của Minecraft.

## Thử tự xây trước khi đọc lời giải

Trong 210–300 phút, mở rộng terrain của Project 63 để người dùng xây một công trình qua biên hai chunk. Sau khi đi xa đủ để chunk bị gỡ, quay lại phải thấy đúng phần đã sửa. Thử undo khi công trình đang ngoài vùng resident, rồi xuất bản lưu và nhập vào phiên mới. Nêu rõ những gì chỉ nằm trong cache và những gì thuộc dữ liệu world.

Prerequisites: Project 58–63, đặc biệt picking Project 60, streaming Project 62 và terrain Project 63. C++ array/map/vector, optional và ownership. Thời gian học 16–23 giờ. ZIP mang toàn bộ nền để build độc lập.

## Mười bước, không phải mười chương trình rời nhau

| Snapshot | Kết quả |
| --- | --- |
| starter | Terrain, greedy mesh, streaming, camera trực giao và Z-buffer từ P63 |
| 01 | Tâm ngắm trên ảnh CPU, đọc tọa độ pixel từ input SDL |
| 02 | Ray world đúng offset player, đi qua tâm pixel |
| 03 | DDA nhiều chunk, hit/normal/path và Unknown chặn tia |
| 04 | Phá/đặt một cell, vật liệu 1/2/3; chỉ sửa cache resident |
| 05 | Delta theo world, tombstone Air, regenerate rồi phủ delta |
| 06 | Gộp dirty mesh, xử lý biên và tách counter streaming/edit |
| 07 | Undo/redo hữu hạn, địa chỉ world hoạt động cả sau unload |
| 08 | VXL1 canonical, xuất/nhập có kiểm tra trước mutation |
| 09 | Preset di chuyển giữ edit, IJKL ngắm, hoàn thiện tương tác |
| 10/final | Oracle AABB/surface, snapshot fixture và bộ nghiệm thu |

Trong repository website, source-template/ là nguồn chuẩn; npm run generate:course sinh CMake và snapshot. ZIP đã chứa starter, checkpoints/01…10, final, tests và README. Không cần chép code ở project khác.

## Build/run/test

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Debug/project_64_final.exe
```

Windows dùng Visual Studio 2022 với Desktop development with C++. C++20, CMake ≥3.24, SDL3 khóa 3.4.8 qua FetchContent URL/checksum, link SDL3::SDL3. Không assets hoặc thư viện noise khác. Với single-config Ninja/Make, thêm CMAKE_BUILD_TYPE=Debug, executable ở build/. Final là target mặc định; BUILD_CHECKPOINTS thêm starter và project_64_checkpoint_1…10.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_64_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke mở window ẩn, vẽ một frame rồi thoát; không đọc/ghi clipboard. CTest thuần không mở window, check vẫn chạy trong Release. Automation cần deadline bên ngoài cho cả process tree. Tối đa hai compiler, không benchmark hoặc drain vô hạn.

## Điều khiển và bản lưu

- WASD dịch vị trí quan sát 4 world units; arrow hoặc middle drag orbit; +/− zoom. Đây không phải FPS controller.
- Mouse ngắm; IJKL ngắm bằng phím từ bài 09. Click trái/F phá, phải/G đặt từ bài 04; giữ/kéo không auto-paint. 1/2/3 chọn Grass/Dirt/Stone.
- N xử lý một batch; Space chạy/dừng queue, không tự edit. Thao tác tay pause queue. P chuyển bốn vị trí mẫu từ bài 09, giữ delta; R xóa phiên và trở về terrain gốc, Escape thoát.
- Z undo/Y redo từ bài 07; tối đa 32 lệnh mỗi phía lịch sử.
- Từ bài 08: F5 copy VXL1 vào clipboard. Dán text ra file để giữ sau khi đóng chương trình. Shift+F9 nhập clipboard, thay phiên/config và xóa history; input lỗi giữ nguyên world.
- V từ bài 10 kiểm dữ liệu/surface resident hiện tại, không thay toàn suite hành trình.

Canvas có các nút tương đương, nhập pixel X/Y, map chunk, hotbar, readout, preset, pause/reset và textarea VXL1. Nhập bản lưu khi phiên có edit cần chọn “Cho phép thay thế”. Không tự ghi clipboard hoặc file trong trình duyệt; người dùng sao chép text ra ngoài. DPR, capture/cancel, blur/visibility và reduced-motion được xử lý; giảm chuyển động vẫn dùng Một tick và edit tay được.

Thay đổi chỉ ở RAM cho tới khi xuất text và tự giữ lại. LocalStorage tiến độ học không phải bản lưu sandbox. Reset/import là thao tác thay phiên có chủ đích. Không có backend, account hoặc autosave ngầm.

## Dữ liệu, picking và cache

- Chunk 16³, x-fast index=x+16*(z+16*y). Air=0, Grass/Dirt/Stone=1/2/3 opaque. Một tầng Y=0..15; delta có thể tạo hốc/khối treo trong tầng dù terrain nền là heightfield.
- Terrain giữ công thức P63, default seed42/scale32/octaves3. Khi không edit, chunk (0,0) checksum FNV-1a=4263195062.
- Camera trực giao scale2/center8, ảnh CPU320×240. Ray qua (x+0.5,y+0.5). Near=max(64,ceil(depth lớn nhất của các góc chunk resident)+1), far=near−96; renderer chỉ giữ far<depth≤near. Cả refreshPick và action truyền cùng near cho cameraRay. World x/z cộng player−8 ngược phép dịch mesh; reach≤96 từ origin plane, không từ tay/mắt FPS. Chunk cũ sau teleport có thể tạm đẩy vùng mới ra ngoài lát nhìn cho tới khi unload.
- Ray origin finite±4096, direction normalized; near hữu hạn 64..3072. Domain query [−1024,1024)×[0,16)×[−1024,1024), tolerance theo t=1e-9, tối đa256 DDA iterations. Qua tie step tất cả trục, normal ưu tiên X/Y/Z, bỏ tiếp xúc không có đoạn đi bên trong đủ dài.
- Unknown là chunk chưa resident: ray dừng, không generate hoặc đi xuyên nó để chọn chunk phía sau. Mesher coi neighbor chưa tải là Air để đóng frontier; hai subsystem cố ý dùng hai quy tắc khác nhau.
- Action luôn re-query state mới, không tin cached Hit. Phá thành Air; đặt ở hit+normal nếu Air resident, y hợp lệ, material1..3. Origin trong block có normal zero nên không đặt được. Overlay hit/ghost/path là debug, không quyết định picking bằng pixel/depth.
- Base+delta là dữ liệu world; Entry.blocks/mesh là cache resident. Delta lưu cả Air tombstone khi phá; khôi phục đúng base thì xóa delta. Tối đa512 delta, reject trước mutation khi hết slot. Bài04 chưa delta nên unload có thể mất sửa; bài05 mới giữ session.
- Edit một cell gắn dirty self và neighbor đúng cạnh X/Z, tối đa3 Key ở góc. Từ bài06 gộp nhiều action rồi flush trước frame. Bộ đếm lastMeshes thuộc batch streaming được giữ riêng; editRebuilds ghi việc edit. Bài04–05 remesh eager toàn resident để thấy cách đơn giản trước.
- Undo/redo giữ cell/before/after, không Entry pointer. Undo offline cập nhật delta, không tải chunk. LIFO giới hạn32, edit mới xóa redo; kiểm expected value trước replay. Import/reset xóa cả hai stack.
- Scheduler giữ player±512, resident≤49, pending≤74, 1–2 jobs/tick, keep ring r+1. Job budget không bảo đảm thời gian millisecond. UI chỉ dùng radius1; source scheduler vẫn hỗ trợ radius2.
- Idle không query/rebuild/raster, aim chỉ query, camera chỉ query+raster. SDL present vẫn chạy. Dữ liệu đổi trước mesh nhưng flush xong trước frame; nhiều click trong cùng batch vẫn truy vấn buffer mới.

## VXL1 và kiểm chứng

```text
VXL1 42 32 3
3
-1 0 -1 0
0 0 0 0
16 14 0 3
```

Header là version, seed, scale, octaves; tiếp theo số record và mỗi record x y z BlockID. ASCII≤32768 byte, tối đa512 record; x/z nguyên trong [−1024,1024), y0..15, ID0..3. Reject thiếu/dư, duplicate, redundant so với base, số không nguyên/overflow và config sai. Parser chấp nhận whitespace ASCII được quy định, output chuẩn sắp x/y/z và LF; native/Canvas có cùng fixture byte. Không serialize mesh, resident, player, camera hoặc history. Import giữ player hiện tại và chỉ bootstrap chunk dưới player, phần còn lại tải theo budget.

Oracle picking quét AABB các block đặc và chunk Unknown, không dùng DDA step/tMax/tDelta; nó vẫn chia sẻ helper slab nên các fixture axis/tie/grazing phải kiểm riêng. Oracle surface từ global cell/sáu neighbor độc lập mesher. Kiểm thêm base+delta, snapshot round-trip/malformed, delta cap, offline undo, remesh counter và regeneration. Node và CTest có cùng fixture; test lỗi không được tắt bằng NDEBUG.

Audit có dòng kết quả riêng, không dùng chung với thông báo thao tác. Khi dữ liệu world đổi vì load/unload/edit/undo/redo/import, kết quả cũ chuyển sang cần kiểm lại; tick idle không làm mất kết quả hợp lệ. Canvas cũng vô hiệu hóa khi đổi mục tiêu streaming. Bài 03 có bảng DDA qua x=0 và biến thể Unknown; bài 08 chú giải từng dòng VXL1 trước khi viết parser. Gesture Canvas chỉ nhận up/cancel/lost capture của pointer đang sở hữu nó, không để pointer khác cướp hoặc kết thúc thao tác.

Chưa FPS/collision, survival/crafting, inventory theo số lượng, texture atlas, lighting, multiplayer, lưu vô hạn, streaming Y hoặc thread/network. Project 65 mở phần tự viết UI cho simulator. Các project chưa phát hành được ghi Sắp ra mắt trong roadmap.
