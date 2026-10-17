# Project 63 — Đồi núi tự sinh: terrain procedural không seam giữa chunks

Từ world streaming của Project 62, tự viết một hàm độ cao theo tọa độ world, thêm value noise và nhiều octave rồi lấp cột cỏ, đất, đá. Mọi chunk dùng chung seed nên địa hình không phụ thuộc thứ tự tải. Mục tiêu là hiểu dữ liệu được tạo ra thế nào và kiểm nó bằng số, không chỉ làm một ảnh đồi núi.

## Tự thử trước khi xem lời giải

Trong 180–240 phút, thay mẫu đất phẳng bằng heightfield 2D trong không gian 3D. Di chuyển qua gốc âm, qua đường chia chunk, đi xa rồi quay lại. Hiện seed, độ cao H, generation và jobs. Đổi cấu hình không được trộn chunk cũ với mới; cùng một world point phải trả cùng kết quả khi hỏi từ hai chunk có halo.

Prerequisites: Project 58–62, uint32_t, vòng lặp, map/set và ownership. Thời gian học 14–19 giờ. ZIP mang theo toàn bộ nền, không cần chép file ở project khác.

## Chín bài, mỗi bài có source chạy độc lập

| Snapshot | Phần được thêm |
| --- | --- |
| starter | World phẳng cao 4, streaming hoàn chỉnh của P62, camera/greedy mesh/raster CPU |
| 01 | Theo luồng tạo Entry, đọc H trong cửa sổ |
| 02 | Hàm sin/cos theo world X/Z, lượng tử hóa số block |
| 03 | Hash uint32_t theo địa chỉ lattice và seed, thử mảng thô |
| 04 | Smoothstep, nội suy bốn góc thành value noise |
| 05 | Tổng nhiều octave có chuẩn hóa, giới hạn lấy mẫu |
| 06 | Air/Grass/Dirt/Stone, vách chênh cao và culling biên resident |
| 07 | Cấu hình mới là thế hệ mới; bootstrap một chunk rồi tải theo budget |
| 08 | Inspector cột nguyên, signal/H, cache raster và lifecycle input |
| 09/final | Golden fixtures, oracle cột và bề mặt, regeneration và bounded tests |

source-template/ là nguồn chuẩn trong repository website; npm run generate:course sinh CMake và snapshot. ZIP đã có starter, checkpoints/01…09, final, tests và CMakeLists.txt. C++ có comment, thụt bốn khoảng trắng và dòng dài không bị ngắt tùy tiện.

## Build và chạy

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
./build/Debug/project_63_final.exe
```

Windows: Visual Studio 2022, Desktop development with C++. C++20, CMake ≥3.24, SDL3 khóa 3.4.8 qua FetchContent URL/checksum, link SDL3::SDL3. Không thư viện noise hay assets ngoài SDL runtime. Với single-config Ninja/Make, thêm CMAKE_BUILD_TYPE=Debug và executable ở build/. Final là target mặc định; BUILD_CHECKPOINTS=ON thêm starter và project_63_checkpoint_1…9.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_63_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke ẩn và thoát sau một frame, không thay kiểm tương tác. CTest không tạo window, check vẫn chạy dưới NDEBUG. Automation cần deadline bên ngoài cho build và process tree; không dùng benchmark/drain vô hạn, chỉ tối đa hai compiler.

## Điều khiển

- WASD dịch player 4 world units mỗi nhấn, không phải FPS controller. Arrow/drag ảnh 3D orbit; +/− zoom.
- N: một batch. Space: chạy/dừng queue. B: budget 1/2. G: radius 1/2. T: bật route hữu hạn của P62, Space mới chạy.
- P: vị trí mẫu, giữ config hiện tại. IJKL/click map: chọn Key; E đến tâm Key nếu trong miền. R reset cả world/config; Escape thoát.
- Từ bài 07: C tăng seed, F đổi scale 16/32/64, O đổi octave 1..4. Thao tác pause và bắt đầu generation mới.
- Từ bài 08: đọc n và H tại floor(player.X/Z). Từ bài 09: V kiểm resident bằng oracle cột/bề mặt và sanity scheduler; không thay toàn suite hành trình.

Canvas có bộ chỉnh draft/Áp dụng cấu hình thay phím C/F/O, preset, pause/reset, bước tay, orbit, nhập X/Z và height map kéo chọn cột. DPR, pointer capture/cancel, keyboard và reduced-motion được xử lý; mất focus/ẩn trang sẽ pause và không tự resume. Canvas có thêm mặt cắt và lỗi local có chủ đích chỉ ở preview 2D; native tập trung mesh, map streaming và inspector. Hai bản dùng cùng công thức và fixtures, không buộc UI giống nhau từng pixel.

## Quy ước dữ liệu và toán

Từ bài 04, Canvas có thí nghiệm riêng trên một ô lattice: đọc bốn góc, kéo tx/tz, bật/tắt smoothstep và theo dõi a/b/n. Mọi thao tác kéo có input HTML tương đương. Thí nghiệm tĩnh dùng seed đang áp dụng, không sửa terrain resident. Bài 05 có bảng đóng góp từng octave tại world (15,8) để tính lại n và H bằng tay.

- Một tầng Y=0..15; Chunk 16³ x-fast: index=x+16*(z+16*y). Air=0, Grass/Dirt/Stone=1/2/3, tất cả block khác Air opaque.
- worldX=Key.x*16+localX, tương tự Z. heightAt trả số block H trong [2,14], lấp y=0..H−1. Đỉnh mesh ở mặt phẳng y=H.
- Seed nguyên 0..65535, dùng chung mọi chunk. Hash không giữ state, nhân unsigned modulo 2³². TypeScript dùng Math.imul/>>>; không dùng random hoặc std::hash.
- Nút lattice chứa giá trị trong [−1,1]. Nội suy hai hàng rồi theo Z với s(t)=t²(3−2t). Đây là value noise, không phải gradient Perlin noise. Floor ở miền âm và kiểm finite trước cast.
- Scale 16/32/64; 1..4 octave, frequency nhân 2, amplitude nhân 0.5; tổng chia tổng trọng số. H=clamp(floor(8+6n),2,14). Lớp chi tiết nhất có bước lattice tối thiểu hai block; không hứa band-limit hoàn toàn.
- C1 nói về tín hiệu noise trước lượng tử hóa; H vẫn có bậc. Không yêu cầu H(15,z)=H(16,z). Cùng một điểm world qua hai halo mới phải bằng nhau.
- Cột H<11 có Grass trên cùng, tối đa hai lớp Dirt ngay dưới, đáy Stone; H≥11 toàn Stone. Đây chỉ là quy tắc tô vật liệu.
- Neighbor resident opaque che mặt chung dù khác material; neighbor chưa tải là Air để đóng frontier. Source luôn thuộc chunk đang dựng. Không generate neighbor trong lookup mesher.
- P62 scheduler giữ player±512, Key±64, resident≤49, pending≤74, wanted r=1/2 và keep r+1; 1–2 jobs/tick, tối đa 5 mesh/job. Budget không bảo đảm millisecond.
- Đổi config tạo generation mới ngoài state hiển thị, bỏ cache/queue cũ, chỉ bootstrap chunk dưới player rồi tải dần. Bootstrap/rebuild=1 là công việc của giao dịch, không phải một tick. Bộ đếm theo thế hệ; camera/player/radius/budget được giữ. R trở về mặc định.
- Native config được copy theo value. Canvas generator giữ snapshot của config; sửa draft chưa áp dụng không đổi world. Không giữ Entry reference qua unload/config reset.

## Kiểm chứng

Mặc định seed42/scale32/octaves3: hash lattice (0,0)=388445122, (−1,0)=4012630698, (17,−23),seed65535=823775260. FNV-1a chunk (0,0)=4263195062, (−1,0)=2291264103, (1,−1)=2892146174, (−64,64)=3054277751. Các fixture final không áp cho checkpoint trung gian. Double không bật fast-math; fixtures kiểm toolchain hỗ trợ, không hứa kết quả bit-exact trên mọi compiler.

Test riêng hash/nội suy/normalization, so các chunk với một vùng world sinh liên tục, kiểm cùng mẫu qua halo, đổi thứ tự gọi, gỡ/quay lại, config snapshot, input sai trước mutation và idle. Oracle cột độc lập vòng fill/address nhưng vẫn dùng heightAt/materialAt nên không thay fixture toán. Oracle bề mặt độc lập mesher, đi từ global cell/sáu neighbor và so multiset có hướng/material. Test mutation chứng minh bắt được local-reset, seed sai và thiếu đỉnh.

Chưa có hang động, overhang, erosion, biome khí hậu, nước, editor/persistence, network/thread hoặc collision/FPS. Regeneration không bảo toàn edit chưa lưu. Terrain procedural không có nghĩa cấp phát vô hạn. Các project chưa phát hành được đánh dấu Sắp ra mắt trong roadmap của website.
