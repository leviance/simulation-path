# Project 44 — nghiệm thu Xưởng điêu khắc thể tích

Ngày 14/11/2026. Nguồn chuẩn: [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), phần Project 44 và hợp đồng chung về source, nội dung, Canvas, kiểm chứng và tài nguyên.

## Quyết định và phạm vi

Người dùng xác nhận trực tiếp: **“tôi đã kiểm tra, project đã đạt yêu cầu.”** Đây là bằng chứng sử dụng và chấp thuận sản phẩm tổng thể của người dùng. Không diễn giải câu này thành trace chi tiết do agent thu cho từng tổ hợp input.

Học phần gồm 12 bài, 12 Canvas mode, starter, checkpoint 01–12, final, tests và ZIP C++ độc lập. Không thay thế ứng dụng GPU bằng Canvas. Bỏ `acceptanceNote` của riêng P44, giữ `replacement`, alias URL cũ và migration revision 2. Các project khác không đổi trạng thái.

Các lỗi kiểm toàn site ngoài P44 được tách sang [báo cáo riêng](site-issues-outside-project-44.md) theo lựa chọn của người dùng. Nghiệm thu P44 không phải tuyên bố CI toàn repository xanh.

## Đối chiếu sản phẩm với đặc tả

| Yêu cầu                                          | Triển khai và bằng chứng                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored scalar grid, world↔grid, spacing và dấu   | `sculpt_grid.hpp`, Bài 01–02/10; CPU fixtures kiểm indexing/mapping/plane. GPU field verifier xử lý 2.097.152 samples và phân biệt 2.048.383 cells ở N=128.                                                                                                                       |
| Cọ add/subtract, falloff và stroke liền          | `sculpt_brush.hpp`, document CPU/GPU, Bài 04–06. Fixture kiểm resampling theo quãng đường; native UI đã tạo khối lồi, bridge và tunnel bằng cọ thật. Không reset preset để thay cho nét cọ.                                                                                       |
| Tự trích topology/edge/normals                   | Sáu tetra Freudenthal có face diagonal nhất quán, edge endpoint order theo sample ID, equality thuộc outside. Fixtures đủ mask/shared face/tie, plane/sphere/refinement; regression mặt nhỏ và oracle topology độc lập.                                                           |
| GPU field/count/scan/emit ở 128³                 | Shader và host tự viết, Bài 06–09. Count/prefix kiểm đủ slots; count trước cấp output, emit đúng range; critical-gradient fixture kiểm 384 fallback trong 3.330 vertices. Không extraction CPU cả field 128³.                                                                     |
| Dirty chunks/generation, camera không remesh     | Chunk 16³ cells có halo phụ thuộc normal, chỉ publish generation hoàn chỉnh, tái sử dụng chunk hợp lệ. GPU jobs/edit fixtures kiểm stale count, partial emit, dirty/full equality và camera no-remesh.                                                                            |
| Last-good khi hủy/overflow/allocation failure    | GPU lifecycle giữ active mesh, trả candidate budget và retry byte-exact. Panel/readout phân biệt requested/current/last-good; browser kiểm capacity và Pause/step/cancel/retry. Không cắt triangle âm thầm.                                                                       |
| Undo/redo, owner/capture, reset/blur             | History tối đa bốn snapshot, rollback/cancel/no-op có fixtures CPU/GPU và Canvas. Các thao tác native được agent kiểm có log riêng; phần sử dụng tổng thể do người dùng xác nhận như trên.                                                                                        |
| Camera, slice/probe, iso/resolution, wire/normal | Native có orbit/pan/zoom, công cụ slice và hai chế độ input riêng. GPU slice kiểm 45 probe/12 sign-color pixels/cache; resample 128→64→128 giữ domain/field chỉnh sửa. Agent đã quan sát wire/normal, orbit/zoom, slice và load domain dịch; không gộp API fixture thành kiểm UI. |
| Sản phẩm 3D có ánh sáng, lỗ và bridge            | Viewport vẽ mesh thật, có brush preview và ground grid. UI cọ tạo tunnel/bridge; topology fixture 128³ kiểm tunnel Euler 0 và bridge từ hai component thành một. OBJ từ đúng field khoét bằng chuột sau sửa có 0 cạnh hở và Euler 0.                                              |
| Save/load field và export/readback mesh          | Bài 11, file jobs theo batch, checksum/bounds/partial publish. So field/mesh bằng bytes, parse/so trực tiếp 408.024 vertices/normals với snapshot. Native S/O/E có trace riêng. Không cần backend.                                                                                |
| Đo chi phí và giới hạn tài nguyên                | Preflight OpenGL 4.3, ngân sách buffer theo dõi 512 MiB, batch/fence/deadline hữu hạn. Benchmark 2 warm-up + 5 measured, 17 nhóm thống kê được tính lại độc lập; tách GPU passes/draw với host total.                                                                             |

Các Acceptance Criteria của P44 được kiểm bằng ba nhóm bằng chứng: sử dụng, thuật toán và quy mô/chi phí. Không chỉ dựa vào việc build/test thành công. Mục 3.6 của spec còn một ví dụ cũ gọi P44 là bài hạt; hồ sơ này đối chiếu **phần P44 chuyên biệt về scalar grid 128³**, không sửa spec để hợp thức hóa implementation khác.

## Giáo trình, Canvas và website

- Challenge đứng trước hướng dẫn; nêu nhu cầu, kết quả, input/giới hạn, phần cung cấp sẵn và phần tự viết. Bài đi từ một tetra tới CPU field/cọ/history rồi mới sang GPU và editor đầy đủ, không nhảy thẳng vào helper rời.
- 113 excerpt C++ và 16 excerpt GLSL khớp token liên tiếp của đúng checkpoint; source đầy đủ ở từng bài và final. Bài 01 có mã/giải thích helper giữ normal của mặt rất nhỏ, Bài 03/07 giải thích chính sách số học tại nơi dùng.
- C++ thụt 4 spaces, comment/khối trắng có kiểm; MDX thật giữ One Dark, KaTeX/MathML và cuộn code ngang. Không dùng source của project khác làm prerequisite ngầm cho gradient/picking.
- Canvas 2D CPU nhỏ dùng cùng công thức/tên biến, có preset/Pause/Reset, keyboard, pointer capture, DPR, reduced-motion và readout. Không tự nhận là GPU 128³ hoặc I/O file native.
- Bộ browser mở đủ 12 mode, kiểm migration chỉ reset P44 cũ, dark navigation/reload, nguồn/copy/ZIP đúng project và lifecycle/capacity/last-good.
- Catalog 67 project/585 lesson, source registries/payloads toàn catalog, search/glossary và ranh giới kiến trúc được kiểm riêng. Các output và dependency tải về không nằm trong Git.

## Hồ sơ kiểm đã hoàn tất trước bước chốt nhãn

Chi tiết số đo và đường dẫn log trong [hồ sơ topology](project-44-topology-regression.md), [tích hợp web](project-44-web-integration.md) và [tiến độ native](project-44-progress.md).

- Toán/generator: 23/23. Source/giáo trình/MDX: 6/6. Render P44: 10/10. Browser P44: 6/6.
- CTest Debug/Release của ZIP độc lập, đủ starter/12 checkpoint/final/tests và audit compiler inputs. SDL package/header đúng 3.4.8, không có dependency authored ngoài gói.
- 16 mode runtime hữu hạn từ ZIP sửa topology; plane/sphere/layout/probes, field/scan/emit, history/jobs, products, resample, I/O, fallback và benchmark.
- Full cold TypeScript: 2.771 inputs, 732.953 KiB, 33,72 giây; architecture/Git hygiene, format và lint phạm vi thay đổi đều qua.
- UI native source build mở lại đúng field từng gây lỗi và xuất OBJ thật: 422.676 vertex records, 140.892 triangles, 0 cạnh hở, Euler 0, không epsilon welding.

## Gói phát hành cuối và phạm vi thay đổi

ZIP cuối: `project-44-volume-sculptor.zip`, 2.154.602 bytes, 1.117 files, 6.312.521 bytes source. Digest:

```text
015e2714e76f6b38501afd40ae9e7836ab6366234c83494fee1adead094b87a6
```

Lượt cuối chỉ thay README và caption `PROJECT 44 / NATIVE DRAFT` thành `PROJECT 44 / SDL3 EDITOR`. So byte toàn package với ZIP đã kiểm `28a46d97…` xác nhận mọi thuật toán, shader và tests không đổi; checkpoint 10 giữ caption riêng. Log package `.validation/p44-release-package-1794653988358.log`, giải nén mới `.validation/p44-zip-verify-Dqcvow`.

Ma trận mới từ chính bản giải nén cuối đã qua đủ **30 target** ở Debug/Release: starter, checkpoint 01–12, final và tests. CTest Debug 1/1 trong 2,47 giây, Release 1/1 trong 0,24 giây. Audit 15 compiler dependency logs/495 workspace inputs mỗi cấu hình không có authored dependency ngoài ZIP; SDL package/header đúng 3.4.8. Log `.validation/p44-release-native-matrix-1794654064937.log`.

Runtime của gói cuối qua analytic sphere 128³, tiny-face/tunnel/bridge/history và I/O/readback/cancel; `.validation/p44-release-native-runtime-1794654466917.log`. Framebuffer thật của editor sau chốt caption ở `.validation/p44-release-final-1794654466917.bmp` đã được quan sát: mesh có ánh sáng, ground grid, panel Tools/Stats/Files, trạng thái current và caption SDL3 EDITOR; không còn NATIVE DRAFT.

Benchmark gói cuối cũng hoàn tất protocol 2 warm-up + 5 measured; raw log `.validation/p44-zip-runtime-benchmark-1794654497420.log`, audit độc lập 17 nhóm `.validation/p44-zip-benchmark-audit-1794654635022.log`. Median local count 13,728768 ms (min 6,677504/max 14,558208/MAD 0,829440), full count 249,591808 ms, draw mesh-only 1,671168 ms, host total 4.279,7093 ms. Lượt này biến động và chậm hơn lượt baseline dù code tính toán/shader giữ nguyên; không loại mẫu hoặc chọn lại số đẹp, cũng không kết luận nguyên nhân khi chưa đo. Không dùng các số này làm cam kết FPS. Workload/counters và tính đúng vẫn qua.

Trạng thái đã nghiệm thu qua full cold TypeScript: 2.771 inputs, 739.480 KiB, 24,39 giây, cùng source/MDX và lint phạm vi thay đổi; `.validation/p44-release-web-source-1794654629740.log`. Production build mới hoàn tất, `.validation/p44-production-1794654830370.log`.

Render P44 hiện đạt **10/10 trong 6,84 giây**, `.validation/p44-p44-render-1794655061360.log`, kiểm thêm không còn notice chờ nghiệm thu/bản cũ và source final không còn caption DRAFT. Browser hiện đạt **6/6 trong 39,4 giây**, `.validation/p44-p44-browser-1794655213936.log`; đầu tiên phát hiện test cũ còn đòi notice chờ hiển thị, sau đó đổi thành assertion notice phải vắng mặt theo trạng thái mới và giữ nguyên mọi kiểm migration/theme/source/Canvas cùng deadline. Không lấy lượt 5/6 ban đầu làm kết quả đạt.

Các runner đã kết thúc và dọn server/process do mình quản lý; không mở Computer Use lại hoặc khởi động dev server. Không chuyển nguyên log của digest trước thành kết quả của digest mới.

Kiểm nguồn cuối `.validation/p44-release-final-1794655415516.log` qua read-only registries/checkpoints toàn catalog, **30/30** ca payload/Git hygiene/toán P44/generator, so đủ 1.117 files với bản ZIP đã build, định dạng/lint của các test nghiệm thu mới và architecture budgets. Các bằng chứng local được dẫn trong biên bản đều có file thật; Git không theo dõi output được sinh hoặc binary biên dịch. Không còn gate P44 cần agent thực hiện; lỗi ngoài phạm vi giữ ở báo cáo riêng và chưa được sửa.

## Giới hạn và việc không tính là test pass

- Computer Use từng bị người dùng dừng bằng Esc. Harness kiểm controller bổ sung `.validation/p44-input-proof` đã build nhưng bị dừng trước F8; lượt `.validation/p44-native-input-proof-1794653292873.log` **không chạy các assertions và không phải pass**. Process do agent sở hữu đã dừng, không tiếp tục gửi input sau yêu cầu dừng.
- Việc chốt sử dụng native dựa trên xác nhận trực tiếp của người dùng và các bằng chứng đã nêu, không bịa thêm trace pan/focus/resize giữa stroke của agent.
- Cấu hình kiểm native là Windows/VS 2022 và RTX 3050 Laptop/OpenGL 4.3 NVIDIA 546.30. Không tuyên bố đã chạy macOS/Linux hay đạt FPS trên mọi GPU. Grid 192³ là mở rộng theo budget; 128³ mới là mốc bắt buộc đã xử lý thật.
- Không tự chạy/restart `npm run dev`, không tạo tài khoản/backend, không publish hosted Site. Không stage/commit/push các thay đổi tiếp tục khi chưa có yêu cầu mới.
