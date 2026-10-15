# Project 58 — Khối đất 16×16×16

Xây một voxel chunk từ dữ liệu block, không chỉ vẽ một cube lớn rồi gọi đó là thế giới voxel. Bạn đi từ cube chạy được đến mảng 4096 Block ID, mesh sáu mặt cho mỗi ô đặc, đất bậc thang, camera trực giao và bảng lớp cắt.

## Thử sức trước khi đọc lời giải

Tự làm bản nhỏ trong 2–3 giờ: hiển thị một chunk 16³, xoay/zoom được, đọc từng lớp và đối chiếu tọa độ với dữ liệu. Chưa cần texture, noise hoặc tối ưu mặt khuất. Một block phải sinh 12 triangles; hai block kề nhau vẫn 24. Sau đó so với từng checkpoint để tìm chỗ mình hiểu khác.

Prerequisites: Project 01–05 (SDL/framebuffer/input), 10–17 (3D, rasterizer, Z-buffer); Project 53 giúp đọc dữ liệu theo lớp. Thời gian dự kiến 12–16 giờ, tùy mức quen với rasterizer CPU.

## Bảy bước học

| Checkpoint | Kết quả |
| --- | --- |
| starter | Window/renderer/texture, event loop, clear nền |
| 01 | Một cube có sáu quad, 12 triangles; framebuffer lên texture |
| 02 | Block ID, layout x/z/y, một Stone tại (7,7,7), bảng y=7 |
| 03 | Mesh từ mọi block đặc; full=4096 block/49152 triangles |
| 04 | Preset single/full/steps/empty, vật liệu Grass/Dirt/Stone |
| 05 | Orbit, zoom có giới hạn, pause và thí nghiệm tắt depth |
| 06 | Cắt mesh ở y<=slice và đọc ô bảng x/z, không sửa dữ liệu |
| 07/final | Pure audit, CTest và bộ source hoàn chỉnh |

`source-template/` là nguồn chuẩn trong repository. `starter/`, `checkpoints/`, `final/` và CMake được sinh bằng `npm run generate:course` tại gốc website. ZIP đã chứa đầy đủ snapshot và build độc lập, không cần Node hoặc server để chạy C++.

## Build/run/test

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows/Visual Studio 2022: chạy `build/Debug/project_58_final.exe`. Final là target mặc định. BUILD_CHECKPOINTS thêm starter và project_58_checkpoint_1…7. Single-config generator dùng CMAKE_BUILD_TYPE và executable trực tiếp trong build. SDL3 3.4.8 được FetchContent bằng checksum; luôn link SDL3::SDL3. Không cần assets, SDL_ttf hoặc OpenGL.

Hidden smoke có giới hạn, không chạy benchmark hoặc auto rotation:

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_58_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

## Điều khiển final

P đổi preset, R reset, drag/arrow xoay, +/− zoom, Space chạy/dừng xoay, D bật/tắt depth, PageUp/PageDown đổi lớp y, click/drag bảng chọn ô, V chạy pure audit, Escape thoát. Focus loss dừng và nhả capture. Native debug text dùng ASCII; bài học và Canvas bằng tiếng Việt.

## Các quy ước cần giữ

- y lên; ô nguyên 0..15; mỗi block cạnh một unit, chunk trải [0,16] trên mỗi trục.
- Air=0, Grass=1, Dirt=2, Stone=3; index=x+16*(z+16*y). ID không phải màu/vertex index.
- CPU trực giao 320×240; depth lớn hơn gần hơn, clear -infinity. Barycentric tại tâm pixel; không back-face hoặc neighbor-face culling.
- N block đặc sinh 6N quad/12N triangles/36N lượt vertex. Full=49152 triangles; steps height=4+x/4 có 1408 block/16896 triangles; empty=0.
- Slice chỉ cắt mesh, không sửa Chunk; bảng đọc y=slice, mesh giữ y<=slice. Chọn bảng không phải ray picking.
- Chỉ raster khi dirty; tối đa 4096 block, 49152 triangles, 76800 pixel. Không xem thời gian một lượt là benchmark GPU.

Pure tests kiểm index/bounds, normals, counts, slice bất biến, camera và depth độc lập draw order. CTest không mở SDL. Kiểm desktop riêng: preset, resize/high-DPI/letterbox, drag/keyboard, focus, pause/reset và chọn mép bảng.

Project 59 tiếp tục bằng loại mặt tiếp giáp, Project 60 mới ray phá/đặt block. Các phần đó chưa nằm trong source này.
