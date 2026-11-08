# Project 40 — Bảng bằng chứng nghiệm thu xưởng vải 3D

Nguồn chuẩn: [Product Specification v4, Project 40](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md#project-40--xưởng-vải-3d-kéo-ghim-và-thả-vải-phủ-lên-vật-thể). Bảng này ghi bằng chứng theo từng cổng; không suy từ build xanh sang tính đúng vật lý, tương tác native hay quy mô GPU.

**Trạng thái: PARTIAL — các gate tự động hiện tại đã có bằng chứng, chưa nghiệm thu toàn project.** Cập nhật ngày 2026-11-09 trên NVIDIA RTX 3050 Laptop GPU, driver 546.30, context OpenGL 4.3; các số đo ngày 2026-11-08 được giữ với phạm vi riêng bên dưới. Full matrix, shader smoke, native verify, website payload build, route/browser và ZIP hiện tại đã kiểm lại sau preset/debug/prose mới. Native OS capture và thao tác bằng tay vẫn chờ lựa chọn người dùng; roadmap revision 40 giữ nguyên. npm test đã dừng ở bước format. File test thuộc đợt sửa này đã được chuẩn hóa; bảy file còn lại nằm ngoài P40. Global lint vẫn còn lỗi ngoài P40.

| Cổng                           | Bằng chứng đã có                                                                                                                                                                                                                                                    | Giới hạn / còn chờ                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Giáo trình và source contracts | 14 bài có bảy vai trò/một Canvas trong AST; 44 snippet khớp checkpoint. Global C++ contracts 4/4 và support suite 14/14 PASS trên snapshot hiện tại.                                                                                                                | Không suy các gate này thành manual input/capture PASS.                                                                      |
| C++ Debug                      | Full matrix hiện tại gồm 16 apps: starter, 14 checkpoints, final; build và CTest 1/1 PASS.                                                                                                                                                                          | Không có cổng Debug còn chờ rerun trong đợt này.                                                                             |
| C++ Release                    | Cùng full matrix hiện tại 16 apps và CTest 1/1 PASS, gồm preset_tests và timing summary.                                                                                                                                                                            | Build/CTest không thay kiểm GPU/hình ảnh/tương tác.                                                                          |
| GLSL thực tế                   | Actual-GLSL smoke cả 16 snapshots PASS. DEBUG/PICK mở rộng kiểm world rings 2t, target vector và probe age PASS.                                                                                                                                                    | Không thay manual OS capture.                                                                                                |
| Ràng buộc, grid và analytic    | Final --verify PASS: independent primitives, CSR, rollback, parity 6×4 và cả ba native presets side 321 × 120 bước, gồm TABLE/CAPSULE mới.                                                                                                                          | Không coi parity/finite state là solver vật liệu chính xác ở mọi trạng thái.                                                 |
| Solver hữu hạn                 | Sáu sensitivity fixtures 289 đỉnh tại t=0,5 s finite/full coverage, penetration≤1,2e-7 m. TABLE/CAPSULE có stretch 0,493038, residual 0,0160671 m và penetration khoảng 5,96e-8 m.                                                                                  | Sai số stretch/residual vẫn là WARNING, không accuracy PASS; bảng số đo giữ bên dưới.                                        |
| GPU tối thiểu                  | Ba preset side 321 × 120 bước đủ vertices/constraints/grid/normals; updated/pinned/drawn được tách rõ. Ảnh native cả ba cảnh đã được xem.                                                                                                                           | Không chứng minh mọi tốc độ hoặc mọi self-intersection đều được xử lý.                                                       |
| GPU mở rộng                    | Một triệu bị từ chối: peak planned 878611976 byte, budget 536870912 byte.                                                                                                                                                                                           | Chưa có million-scale execution PASS; đường từ chối không hạ mốc tối thiểu.                                                  |
| Hình ảnh native                | SphereDrape có nếp gấp/pattern/hai mặt; Hanging đứng và ghim đúng; TABLE/CAPSULE khác vòm sphere, vải phủ thanh ở bàn Y=0,7 m. Ảnh đã xem không có nổ hình/xuyên rõ.                                                                                                | Kiểm ảnh giới hạn, không phải chứng minh chống xuyên mọi tốc độ hoặc manual interaction.                                     |
| Input native qua sự kiện       | Native event checks 21 assertions PASS, gồm probe pending và cancel debug khi Pause.                                                                                                                                                                                | OS CAPTURE UNVERIFIED: hidden window từ chối capture đúng chính sách; thao tác chuột/capture OS bằng tay vẫn chờ người dùng. |
| Input GPU trực tiếp            | Fixture GPU riêng PASS: pin/unpin thật, 24 movable patch nodes + một pin, ba driven frames với raw driver≤6h và hai released frames raw driver zero; reset 17→9 với fresh Input, rest error 0 m.                                                                    | Fixture dùng Input trực tiếp, không chứng minh OS capture; inertia sau release có thể tiếp tục.                              |
| Jobs và ngân sách              | Benchmark mới nhất COMPLETE 71 bước, 1181364 analytic events trong chín mẫu; median/MAD mới ở bảng riêng. Preflight/refusal và event lifecycle tự động đã kiểm.                                                                                                     | Completion không phải accuracy PASS; không dùng GPU-only baseline để tạo speedup ratio.                                      |
| Website, Canvas và TypeScript  | Full site build hiện tại PASS trong 194,5 s; route tests 2/2 PASS gồm 14 lessons, overview và old-route 404. Browser mới nhất 4/4 PASS trong 18,2 s: 14 modes, pointer/keyboard/DPR/progress và oracle cancel với late RAF. Typecheck, target lint và math 12 PASS. | Chưa tuyên bố deployment hoặc manual native capture.                                                                         |
| Lint và toàn bộ suite          | Scoped lint 21 files: 0 errors, 0 warnings PASS. Global npm run lint FAIL: 176 errors, 13 warnings ngoài P40.                                                                                                                                                       | npm test FAIL tại check:format; bảy file còn lại nằm ngoài P40. Không gọi toàn repository xanh.                              |
| Source và ZIP                  | Generated check PASS; ZIP hiện tại sau sửa phạm vi câu README có 549 files byte-identical, digest PASS.                                                                                                                                                             | Không dùng ZIP PASS để tự bỏ roadmap revision hoặc kết thúc nghiệm thu manual.                                               |

## CPU/GPU parity và workload

Các giá trị định lượng đã ghi ngày 2026-11-08 được giữ ở đây; lượt final --verify ngày 2026-11-09 tiếp tục PASS đầy đủ, không biến các giá trị đã lưu thành cam kết sai số cho mọi lần chạy.

Sáu ca CPU/GPU gồm ba preset với hai hoặc bốn substeps, mỗi ca bốn bước. Sai khác lớn nhất trên các vertex theo chuẩn Euclid:

| Đại lượng | Sai khác lớn nhất đã đo | Đơn vị       |
| --------- | ----------------------: | ------------ |
| Position  |              1.45055e-6 | m            |
| Velocity  |             0.000173312 | m/s          |
| Normal    |              1.92404e-6 | Không đơn vị |

Đây là kết quả parity của các ca đã chạy, không phải ngưỡng sai số dùng chung hoặc bằng chứng quỹ đạo dài hạn.

Ba preset native side 321 có 103041 đỉnh tổng, 204800 tam giác và 615038 constraints duy nhất. Với hai substeps và bốn iterations, mỗi bước có 4920304 constraint visits:

| Preset      | Ghim | Động/cập nhật | Normals/vẽ | Bước đã chạy |
| ----------- | ---: | ------------: | ---------: | -----------: |
| Hanging     |  321 |        102720 |     103041 |          120 |
| SphereDrape |    0 |        103041 |     103041 |          120 |
| DropTable   |    0 |        103041 |     103041 |          120 |

Telemetry/preflight của state solver/grid báo GPU buffers 36754424 byte và host planned 26382592 byte. Đây không phải phép đo tổng VRAM/RAM của toàn tiến trình. Mốc một triệu được báo riêng: peak planned 878611976 byte, budget 536870912 byte, kết quả REFUSED.

## DropTable mới: mặt bàn và thanh capsule

Preset mới dùng plane Y=0,7 m, sphere nhỏ nằm hoàn toàn dưới bàn và capsule nhô lên; ảnh native side 321 sau 120 bước đã được xem, cho thấy vải phủ qua thanh capsule thay vì tạo lại vòm SphereDrape.

| Telemetry của bước đã báo |    Giá trị |
| ------------------------- | ---------: |
| Updated vertices          |     103041 |
| Pinned vertices           |          0 |
| Normals                   |     103041 |
| Constraint visits         |    4920304 |
| Candidates                |  117368330 |
| Contact events            |     194111 |
| Max stretch dương         |   0.493038 |
| Constraint residual (m)   |  0.0160671 |
| Analytic penetration (m)  | 5.96046e-8 |
| Invalid / overflow        |      0 / 0 |

Các counters candidate/contact là telemetry theo phạm vi bước solver, không được đọc thành số cặp duy nhất. Stretch dương 0,493038 tương ứng khoảng 49,3% và residual 0,0160671 m vẫn là sai số hữu hạn đáng chú ý; finite/full coverage hoặc ảnh đọc được không tự tạo accuracy PASS.

## Fixture input GPU riêng

Fixture kiểm riêng trong vùng validation bị Git ignore gọi Input trực tiếp trên GPU, không đi qua chuột hoặc cơ chế capture của hệ điều hành. Kết quả PASS gồm:

- Pin/unpin thật trên GPU state; vùng kéo có 24 đỉnh động và một đỉnh ghim.
- Ba driven frames kiểm raw driver không quá 6h. Với h=1/120 s, giới hạn này là 0,05 m; đây là displacement của driver, không phải giới hạn tổng correction do mọi constraint/contact.
- Hai released frames có raw driver bằng zero. Inertia của vải có thể tiếp tục sau release; không đòi position bất động để chứng minh input đã được buông.
- Reset từ side 17 sang side 9 trong khi có thao tác pending, sau đó dùng fresh Input; rest error của state mới bằng 0 m.

Bằng chứng này bổ sung cho 21 native event assertions, nhưng **không xác minh OS mouse capture hoặc cảm giác thao tác bằng tay**. Native capture vẫn chờ lựa chọn người dùng.

## Benchmark có tiếp xúc

Benchmark side 321 mới nhất ngày 2026-11-09 COMPLETE sau 71 bước: 60 settling, hai warm-up và chín cặp step/draw đại diện. Nhóm chín mẫu có 1181364 analytic contact events, không chỉ đo rơi tự do. Peak memory 126282224 byte là giá trị đã ghi ở lượt ngày 2026-11-08, không phải phép đo mới của lượt này. Trong 60 settling steps, chỉ chín bước đầu được giữ làm GPU-only baseline; không gọi baseline đó là thời gian đo toàn bộ 60 bước.

| Lượt đo                    | Phạm vi        | Median |   MAD | Đơn vị |
| -------------------------- | -------------- | -----: | ----: | ------ |
| 2026-11-08, giữ tham chiếu | GPU whole step | 14.402 | 0.128 | ms     |
| 2026-11-08, giữ tham chiếu | GPU draw       |  0.165 | 0.001 | ms     |
| 2026-11-09, mới nhất       | GPU whole step | 17.029 | 1.181 | ms     |
| 2026-11-09, mới nhất       | GPU draw       |  0.177 | 0.002 | ms     |

Các số thuộc cấu hình/máy và lượt đo tương ứng, không phải FPS hoặc speedup chung. Không suy thay đổi giữa hai lượt thành speedup do một thay đổi mã đơn lẻ. Max stretch dương 1,884 tương ứng 188,4% và residual 0,067 m vẫn là **WARNING về sai số hữu hạn**, không được gắn accuracy PASS chỉ vì timing/coverage hợp lệ.

Website build trước đã PASS trong 173 s; payload build hiện tại PASS trong 194,5 s. Đây là thời gian build ở các lượt khác nhau, không phải benchmark solver.

## Độ nhạy theo h và iteration

Sáu fixture 289 đỉnh tiến tới cùng thời điểm t=0,5 s. Stretch dương cuối bước không có đơn vị; residual cuối bước tính bằng mét.

| h (s) | Iterations | Stretch dương cuối | Residual cuối (m) |
| ----- | ---------: | -----------------: | ----------------: |
| 1/120 |          1 |           0.102410 |          0.063321 |
| 1/120 |          4 |           0.052678 |          0.031052 |
| 1/120 |          8 |           0.034156 |          0.017078 |
| 1/240 |          1 |           0.058322 |          0.042944 |
| 1/240 |          4 |           0.017183 |          0.013127 |
| 1/240 |          8 |           0.011332 |          0.014406 |

Cả sáu ca finite, đủ coverage và penetration không quá 1,2e-7 m. Không khẳng định sai số giảm đơn điệu: tại h=1/240, residual của I=8 lớn hơn I=4 dù stretch dương nhỏ hơn. Đây là phép kiểm độ nhạy của solver hữu hạn, không phải bằng chứng XPBD hoàn toàn độc lập timestep/iteration.

## Phạm vi mô hình và các cổng còn mở

- Bend-distance chỉ xấp xỉ chống gập, không phải mô hình góc nhị diện đầy đủ.
- Self-contact theo vertex không phải edge/triangle CCD và không chống xuyên mọi tốc độ.
- Compliance (m/N), damping rate (1/s), friction fraction theo substep contact và thickness (m) có ý nghĩa khác nhau.
- Final matrix, website payload build, routes/browser và ZIP hiện tại đã PASS. npm test FAIL tại check:format (bảy file ngoài P40 chưa chuẩn hóa); global lint còn 176 errors/13 warnings ngoài P40. Visible OS capture và thao tác native bằng tay vẫn chờ lựa chọn người dùng.
- Chưa đánh dấu project hoàn thành, chưa bỏ roadmap revision 40 và không hứa FPS chung.

## Kiểm trực tiếp cửa sổ native còn chờ

Trên workspace đã build ma trận, có thể mở bản final trong hai phút bằng PowerShell tại thư mục gốc repository:

```powershell
.\.validation\p40-matrix\Release\project_40_final.exe --seconds 120
```

1. Nhấn Space để Pause. Dùng chuột phải orbit, chuột giữa pan và wheel zoom; camera đổi nhưng số bước mô phỏng không tăng. N chỉ tiến một bước.
2. Chọn DRAG, kéo trên vải rồi Resume hoặc nhấn N khi vẫn giữ chuột. Vùng vải phải phản ứng; đường hồng là đích kéo từ probe cuối, không phải lực Newton. Buông chuột bên ngoài cửa sổ hoặc chuyển focus không được để lại thao tác kéo bị kẹt.
3. Chọn PIN, click rồi N khi Pause. HUD phải chuyển inverse mass sang zero; lặp lại để bỏ ghim. Thao tác đang xếp chờ phải được hủy khi X hoặc mất focus.
4. Đổi HANG/SPHERE/DROP, đổi độ phân giải hoặc Reset trong lúc đang kéo hoặc chạy validation. Selection, drag và job cũ phải bị hủy; ba preset phải có hình dạng đúng, không giữ ID của topology trước. Benchmark khóa thay đổi cấu hình trong lúc đo: nhấn X để hủy rồi mới đổi cảnh.

Esc đóng ngay; cửa sổ tự đóng sau 120 giây. Chưa có kết quả thao tác OS cho checklist này, nên các kiểm tự động ở trên không được dùng để đánh dấu nó PASS.
