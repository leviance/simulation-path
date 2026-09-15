# Project 45 — Molecular Lab GPU

MD 2D bằng C++20, SDL 3.4.8 và OpenGL 4.3 compute. Mục tiêu từ ca nhỏ 64 hạt tới các preset 100.000–5 triệu, có giới hạn bộ nhớ/công việc; không cam kết realtime hoặc phần cứng nào cũng chạy được.

## Bắt đầu

Windows: Visual Studio 2022 với Desktop development with C++, CMake >=3.24 và driver OpenGL 4.3. Linux: GCC/Clang C++20, CMake và driver OpenGL 4.3. macOS OpenGL 4.1 không hỗ trợ bản compute này.

```bash
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
.\build\Release\project_45_final.exe
```

Linux single-config: thêm `-DCMAKE_BUILD_TYPE=Release`, chạy `./build/project_45_final`. SDL được FetchContent đúng release/hash và luôn link SDL3::SDL3. Máy đã có package SDL chính xác có thể dùng COURSE_USE_INSTALLED_SDL3=ON. Không cần extension loader ngoài gl_api.hpp.

## Học theo từng mốc

Thêm `-DBUILD_CHECKPOINTS=ON`. Starter mở cửa sổ, chưa vẽ hạt. Build một mốc bằng `--target project_45_checkpoint_1`. Mỗi checkpoint là source độc lập; các helper/shader đi kèm đầy đủ nhưng tính năng mới chỉ được bật khi tới bài tương ứng.

1. Dựng cửa sổ và nhìn thấy hệ hạt trước.
2. Đặt dữ liệu lên GPU và khởi tạo hạt.
3. Vẽ hạt trực tiếp từ SSBO.
4. Tính lực trên GPU, bắt đầu từ ca nhỏ.
5. Dựng grid trên GPU để giảm số cặp.
6. Cho hệ chuyển động bằng Velocity Verlet.
7. Tái sử dụng grid mà không bỏ sót lực.
8. Đo năng lượng và động lượng trên GPU.
9. Tăng số hạt có kiểm soát.
10. Kiểm chứng, đo chi phí và chạy bản hoàn chỉnh.

## Điều khiển

- Space: chạy/dừng yêu cầu bước mới; N: một bước; C: hủy ở ranh giới batch; R: reset.
- Home: camera; kéo chuột trái: pan; wheel: cursor-anchored zoom; Esc: thoát.
- Từ bài 9: 1=64, 2=100.000, 3=500.000, 4=1 triệu, 5=5 triệu. Chỉ nhận đổi preset khi idle.
- Bài 10/final: B đo 1 warm-up + 5 mẫu, tối đa 20 giây; quá hạn không báo trung bình chưa đủ mẫu.

Tiêu đề báo phase, E/P, rebuilds, displacement, occupancy và estimate MiB; terminal có GPU/driver-renderer, lỗi, kết quả verifier/benchmark. `drawn` tối đa 100.000 marker lấy mẫu; solver vẫn dùng toàn bộ N.

## Kiểm chứng an toàn

```bash
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
.\build\Release\project_45_final.exe --verify-gpu
.\build\Release\project_45_final.exe --verify-gpu --tail-case
.\build\Release\project_45_final.exe --verify-gpu --rebuild-case
```

CTest không mở GPU, chỉ làm ca nhỏ và tính budget bằng số học. GPU verifier N=64/257: initial + 3 bước, force/U/Verlet/reduction so CPU, deadline nội bộ 15 giây. Automation cần process timeout ngoài 25 giây. Không tự chạy các preset lớn, benchmark dài hoặc nhiều job GPU song song.

## Mô hình và giới hạn

m=epsilon=sigma=1; cutoff=2.5; skin=0.4; dt=0.001. Minimum image và force-shifted LJ. Một invocation ghi riêng F[i], mỗi cặp hai lượt nên U_i giữ một nửa. Hai bank p/v/f bảo vệ state đã commit. Velocity.zw giữ residual của phép cộng position để bước sub-ULP không mất mãi ở hộp lớn; skin cộng độ dời thực sự đã lưu, kể cả qua biên. Float vẫn có sai số lượng tử hóa; đây không phải chuẩn xác nghiên cứu vật liệu.

Grid bucket 16 ID/ô, không phải half pair list hay CSR. Query stencil quanh reference positions, force dùng current positions. D>=skin/2 sau Drift thì rebuild trước Force. positions.zw giữ displacement chưa wrap, đặt zero khi dựng. Overflow, r<0.5, drift>0.1 hoặc dữ liệu non-finite khiến bước bị từ chối; không clamp rồi nhận một mô hình khác.

7 vec4/hạt + counts/bucket indices + 2 reduction scratch + control. Resident budget 1 GiB, peak replacement 1.5 GiB; mỗi block kiểm với GL_MAX_SHADER_STORAGE_BLOCK_SIZE. Không biết VRAM trống thực tế; allocation có thể thất bại. Candidate allocation lỗi giữ storage cũ; khi bắt đầu initialize hệ mới thì không còn rollback toàn bộ preset cũ.

Mỗi batch Force <=2048 hạt, kernels tuyến tính <=65536, reduction <=256 groups; một dispatch đang bay. Poll fence timeout zero, batch deadline 5 giây, không glFinish/busy-wait. Hủy bước giữ bank cũ nhưng cache được vô hiệu hóa. Timeout không preempt kernel đã chạy và không bảo đảm driver không treo; guards chỉ giảm nguy cơ bằng cách giới hạn công việc.

Không vẽ thêm trong lúc job compute đang bận. Điều này giữ hàng đợi ngắn nhưng hình đứng ở lần commit gần nhất. Mô phỏng không cố bù realtime bằng tăng dt. GPU timer đo tổng compute dispatch; wall time gồm overhead/poll/chờ, không đồng nhất với kernel time.

## Cấu trúc

`source-template` là nguồn chuẩn; starter/checkpoints/final được sinh từ đó. Chỉnh template rồi sinh lại trong repository website. ZIP tự chứa shaders/tests, không chứa SDK, build output, node_modules hoặc file nhị phân. Các bài đầy đủ và source browser trên website nằm dưới `/projects/molecular-lab-gpu`.

Primary references: https://wikis.khronos.org/opengl/GLAPI/glMemoryBarrier ; https://wikis.khronos.org/opengl/GLAPI/glClientWaitSync ; https://docs.lammps.org/Developer_par_neigh.html .
