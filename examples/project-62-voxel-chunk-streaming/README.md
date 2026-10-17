# Project 62 — Thế giới “vô tận”: tải và gỡ chunk khi người chơi di chuyển

Giữ world trong một working set hữu hạn quanh nhân vật: địa chỉ chunk âm/dương, vùng wanted, vòng giữ dự phòng, hàng đợi có budget và greedy mesh biết neighbor resident. Không nạp toàn world rồi chỉ ẩn phần ở xa.

## Tự thử trước khi đọc lời giải

Trong 180–240 phút, mở rộng khung một chunk thành world trên X/Z. Cho nhân vật qua gốc âm, đi qua biên rồi quay lại, teleport khi còn job chờ. Hiện resident, pending, loads/unloads và mesh rebuild. Quay lại chunk đã gỡ phải ra cùng Block ID.

Prerequisite: Project 58–61; std::map/set, vector và ownership. Thời gian học 16–21 giờ. Starter đã có khối đất, camera trực giao, Z-buffer và SDL window/texture. ZIP mang đủ nền, không cần chép source từ project khác.

## Mười bước chạy độc lập

| Snapshot | Kết quả |
| --- | --- |
| starter | Một chunk phẳng cao 4 đã được vẽ bằng greedy mesh |
| 01 | Marker nhân vật, WASD bước tay, inspector |
| 02 | Floor division, world/chunk/local, vị trí âm |
| 03 | Wanted hình vuông, nhiều Entry, mesh local → world; chưa unload, cap 49 |
| 04 | Gỡ ngay ngoài wanted, regeneration và hash |
| 05 | Queue gỡ xa/tải gần, 1–2 job/tick, bước tay/playback |
| 06 | Keep r+1, đảo chiều không thrash, retarget khi teleport/radius đổi |
| 07 | Lookup resident neighbor, source ownership, bỏ mặt giáp ranh |
| 08 | Dirty Key cục bộ, tối đa 5 mesh/job, batch geometry xong trước frame |
| 09 | Auto route theo mốc, teleport từ inspector, lifecycle input |
| 10/final | Oracle global, bound, hành trình, regeneration và cache tests |

source-template/ là nguồn chuẩn trong repository website. Chạy npm run generate:course ở gốc để sinh CMake/snapshot. ZIP đã có starter, checkpoints/01…10, final, tests và CMake; mỗi snapshot chạy độc lập, có comment và các khối mã được tách rõ.

## Build và kiểm thử

```bash
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Windows: Visual Studio 2022, workload Desktop development with C++. Chạy build/Debug/project_62_final.exe. Final là target mặc định, BUILD_CHECKPOINTS thêm starter và checkpoint_1…10. Single-config generator đặt CMAKE_BUILD_TYPE và executable ở build. C++20, CMake ≥3.24; SDL3 3.4.8 khóa URL/checksum bằng FetchContent, link SDL3::SDL3. Không assets/font library ngoài SDL runtime.

```powershell
$smoke = Start-Process -FilePath ".\build\Debug\project_62_final.exe" -ArgumentList "--smoke" -WindowStyle Hidden -PassThru
if (-not $smoke.WaitForExit(30000)) {
    $smoke.Kill()
    throw "Smoke quá 30 giây."
}
if ($smoke.ExitCode -ne 0) { throw "Smoke thất bại." }
```

Smoke hidden thoát sau một frame; không chứng minh tương tác đúng. CTest code thuần không mở window, check vẫn chạy trong Release. Tối đa hai compiler; automation/CI cần deadline ngoài cho build/process tree. Không benchmark/drain vô hạn hoặc retry không giới hạn.

## Điều khiển final

- WASD/nút: dịch nhân vật 4 world units mỗi nhấn, không phải controller theo vận tốc. Thao tác tay pause playback.
- Mũi tên hoặc left drag vùng 3D: orbit; +/−: zoom.
- Click map hoặc IJKL: chọn chunk, không sửa data. E: đến tâm chunk đã chọn nếu trong miền di chuyển.
- P: bốn preset vị trí; R: reset. N: một tick. Space: chạy/dừng queue.
- Preset chỉ đổi vị trí trong World hiện tại, không xóa resident, radius, budget hay bộ đếm. Dùng nó để thử hủy queue sau teleport; chỉ R mới khởi tạo lại toàn bộ.
- B: budget 1/2. G: radius 1/2. T: bật/tắt auto route chín mốc; Space mới chạy.
- V: sanity giới hạn của state hiện tại. Escape: thoát.

Blur/minimize nhả capture và pause; trở lại không tự resume. Canvas có nút/select/range keyboard-accessible, DPR, pointer capture/cancel, reduced-motion và readout tiếng Việt. Reduced-motion vẫn bước tay được. Native dùng nhãn ASCII.

## Quy ước phải giữ đúng

- Một tầng Y=0..15, chunk 16³ x-fast index=x+16*(z+16*y). Air=0, Grass/Dirt/Stone=1/2/3 opaque. Dữ liệu phẳng cao 4; lớp trên đổi theo modulo dương của Key, không noise.
- Player X/Z trong [−512,512], Key trong [−64,64]. “Vô tận” mô tả chiến lược working set, không world vô hạn thật. Không cấp phát theo toàn miền tọa độ.
- chunk=floor(world/16), local=world−16*chunk; −0.5→−1/15.5, −16→−1/0. Block index=floor(local). Int / của C++ về zero; floorDiv phải xử lý dư âm.
- Wanted Chebyshev r=1/2 có 9/25 chunk. Keep r+1 chỉ giữ resident đã có, không tự tải thêm vòng ngoài. Ngoài keep xếp unload; sau teleport/radius shrink có thể còn resident xa trong vài tick.
- Cap global 49 resident, queue≤74. Gỡ xa trước, tải gần theo squared distance, tie z rồi x. Plan chỉ đọc; job chỉ giữ Key.
- Final khởi đầu một resident và tám job chờ. Pump xử lý tối đa 1–2 job/tick, không drain tất cả ở UI. Retarget thay queue chưa chạy, không hủy thread vì chưa có thread.
- Load/unload ảnh hưởng chunk đó và bốn neighbor X/Z; dùng set gộp dirty Key. Mỗi job tối đa 5 rebuild, budget 2 tối đa 10. Xong geometry của batch mới raster frame, không giữ mesh lỗi seam chờ queue khác.
- Source phải nằm trong chunk đang dựng; neighbor được vượt biên qua world lookup. Neighbor resident opaque che mặt kể cả khác material; chưa resident là Air để đóng frontier. Không generate neighbor khi query.
- Entry sở hữu buffer/mesh; erase giải phóng Entry, không giữ reference qua erase. Regeneration bằng Key trả cùng dữ liệu; FNV-1a fixture (0,0)=2424852421 và (−1,0)=3845785541, thêm so buffer trực tiếp.
- Mesh local không đổi khi camera/player di chuyển trong một chunk. Chỉ ảnh mới cần raster; idle không rebuild/raster. SDL present vẫn chạy.
- lastJobs/lastMeshes thuộc batch trước; lastBudget là budget khi batch đó chạy, không phải setting mới. Payload resident×4096 chỉ tính Block ID, chưa mesh/map/allocator. Job budget không bảo đảm thời gian ms cố định.
- Map chỉ vẽ 7×7 quanh player, không phải toàn bộ resident sau teleport. Marker hồng là debug overlay, chưa collision/FPS. Auto route nhảy theo mốc để thử queue, không tích phân vận tốc.

Chưa đọc disk/network, threading, editor/persistence/undo, streaming Y, noise, lighting hoặc controller FPS. Không gắn phá/đặt Project 60 rồi regenerate mà mong edit tự được lưu.

## Source và nghiệm thu

model/quad/mask/rectangles/raster là nền tự chứa từ Project 61. coordinates xử lý địa chỉ; world giữ ownership/generation; meshing xử lý halo và invalidation; scheduler lập/thực thi batch; controller giữ frame cache/playback; controls/view/main dùng SDL; oracle phục vụ kiểm thuần.

Node/CTest kiểm round-trip âm/dương, hash chung, cap/queue/job bounds, idle, hysteresis, stale teleport, radius shrink, regeneration và camera cache. Surface oracle tạo global solid map độc lập với makeWorldMask/worldBlock, bung quad rồi so multiset (world x,y,z,face,material). Kiểm sau từng tick, không chỉ khi queue hết.

Một chunk phẳng có 768 mặt đơn vị; hai chunk kề là 1408; vùng 3×3 có 5376. Test chủ động làm sai lookup/source guard để bảo đảm oracle có thể phát hiện seam.

Desktop QA riêng: preset, qua biên âm, radius/budget khi queue chưa xong, pause/reset, auto route, inspector/teleport, mouse capture/blur và resize/high-DPI. Sanity UI chỉ kiểm state hiện tại. Project 63 sẽ thêm địa hình procedural không seam; không nằm trong source này.
