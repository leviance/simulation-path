# Project 44 — tích hợp học phần điêu khắc thể tích

Mốc 14/11/2026. Học phần mới dùng slug `volume-sculptor`, còn nhãn chờ nghiệm thu. Đây không phải biên bản chứng nhận toàn bộ Project 44 đã đạt đặc tả. Nguồn chuẩn vẫn là Product Specification v4 complete; [hồ sơ native](project-44-progress.md) và [hồ sơ Canvas](project-44-canvas-progress.md) có phạm vi riêng.

## Cập nhật trước khi lưu tiến độ vào Git

Phát hiện mới chưa được sửa: mesh OBJ xuất sau khi khoét bằng chuột có 12 cạnh biên, một component và Euler −2. Phép kiểm độc lập không hàn đỉnh theo epsilon; báo cáo local ở `.validation/p44-ui-obj-audit-1794649315185.json`. Nguyên nhân đang được khoanh vùng ở ngưỡng loại triangle có diện tích nhỏ nhưng vẫn khác 0; chưa có bản sửa thuật toán được nghiệm thu.

Đã thêm fixture `tinyTriangleFixtures()` vào `tests/cpu-stage-fixtures.cpp` để giữ lại ca tái hiện. Build Release target tests thành công, nhưng CTest mới thất bại: sample bên trong có giá trị −0,00001 bị loại cả 24 triangle, còn 0 thay vì 72 vertices. Log `.validation/p44-tiny-before-fix-1794649954998.log`. Không bỏ fixture hoặc đổi kỳ vọng để làm xanh test. Các kết quả CTest đạt bên dưới thuộc gói baseline trước khi thêm regression này; ZIP digest `18b2f86f…` chưa chứa test mới và không còn khớp toàn bộ nguồn hiện tại. Commit lưu tiến độ không đồng nghĩa chốt phát hành hoặc đạt toàn bộ tests.

## Nguồn chuẩn sau khi chuyển thư mục

- C++: `examples/project-44-volume-sculptor/source-template/`, README và tests. Không còn giữ thêm một bản authored trong `examples/drafts/`.
- Giáo trình: `content/volume-sculptor/`, 12 bài, mỗi bài có một Canvas mode và câu hỏi/thí nghiệm riêng.
- Metadata: `course/projects/p44/{manifest,learning,lab}.ts`. Challenge nêu sản phẩm, input/giới hạn, phần tự viết và Definition of Done trước khi đọc hướng dẫn. Thời lượng từng bài khớp tổng đọc/tự viết/kiểm, không tính setup/build lần đầu.
- Canvas: `components/labs/volume-sculptor-lab.tsx`, các component con và `lib/labs/volume-sculptor/`. Vẫn là CPU nhỏ; không thay bản native GPU 128³.
- Thuật ngữ: 12 mục `sculpt-*` trong `lib/glossary-volume-sculptor.ts`, cùng nguồn cho glossary và search.

`course/projects.json` bật 12 checkpoint, `contentRevision: 2` và shader fallback riêng từng target. `roadmap-revisions.ts` giữ `replacement` cùng acceptance note, không xóa dấu vết phạm vi cũ chỉ vì đã có route mới.

## Bản Neighbor List cũ và các liên kết

Đã chuyển source/output cũ, chín MDX, ba metadata và hai component lab sang `.validation/retired-project-44-neighbor-list-skin-20261114-web-integration/`. 22/22 file authored khớp SHA-256 trước/sau khi chuyển. Test case cũ cũng có bản sao kiểm hash ở đó. Đây là thư mục dự phòng bị Git bỏ qua; file tracked cũ còn có thể khôi phục từ lịch sử Git. Không stage/commit/push ở mốc tích hợp.

Các URL `/projects/neighbor-list-skin` và lesson bên dưới chuyển về overview mới, không ghép lesson cũ vào bài mới chỉ vì cùng ID. `/roadmap/44` mở sản phẩm mới. Thêm `previousSlug` có kiểm trùng/xung đột trong generator; slug đang được phát hành không thể bị chiếm làm alias.

Revision 2 xóa riêng completion/continue link của P44 cũ; giữ tiến độ các project khác. Các chỗ trong Project 45 cũ nhắc Neighbor List nay ghi rõ phiên bản cũ và gói tự chứa helper, không biến điêu khắc thể tích thành prerequisite của Molecular Dynamics. Math/test Neighbor List legacy vẫn được giữ cho regression của nhánh MD cũ, nhưng không còn lab/tài liệu/ZIP cũ trong catalog P44.

## Bài học và source

Đã bỏ lời mở đầu “bản biên tập/chưa ghép Canvas”, đặt Canvas sau câu hỏi thí nghiệm, nối bài kế tiếp và thêm liên kết ZIP/source đầy đủ ở bài cuối. Không thay các excerpt bằng pseudo-code. Source contract chung nâng P44 lên kiểm token liên tiếp từ đúng checkpoint, cùng hợp đồng GLSL riêng.

Năm kiểm source/metadata của `tests/projects-44.cases.mjs` qua: catalog và migration; 12 bài/7 teaching roles/thời lượng/Canvas; 112 C++ và 16 GLSL excerpts khớp snapshot; ranh giới checkpoint và final bằng checkpoint 12; references/glossary/guides; compiler MDX thật giữ One Dark/KaTeX. Tên test được gom thành năm ca, không phải năm bài.

Bài 10 bổ sung lệnh build target tests trước CTest khi người học mở gói riêng ở checkpoint đó. Sau chỉnh này bài có 32.748 bytes, Bài 11 có 32.701 bytes; còn trong giới hạn 32 KiB, không tăng budget. Không chạy formatter để đổi nội dung C++ hoặc làm các dòng mã wrap lại.

## Sinh source và gói tải về

Lượt sinh source toàn khóa học ban đầu chạm hard timeout 35 giây, đã dừng process tree. Chưa lấy lượt đó làm kết quả hoàn tất. Generator nay reconcile từng project rồi bỏ buffer thay vì giữ mọi snapshot/source payload của cả catalog trong RAM; có `--project=44` và `--check` tường minh.

Hai fixture trong `tests/checkpoint-generation.cases.mjs` qua: từ chối ID/option sai trước ghi, scope không chạm project khác, check thành công/thất bại đều giữ bytes/timestamps, full streaming vẫn dọn output stale và giữ server/public payload giống nhau. `tests/tooling.test.mjs` import bộ hồi quy này. Scope không được dùng làm bằng chứng đã kiểm toàn catalog.

Lượt P44 sau biên tập C++ sinh 1.226 output (CMake, starter/12 checkpoint/final, registry, declaration và source JSON). Đây là output ignored, không phải file cần commit. ZIP hiện có:

- `public/downloads/project-44-volume-sculptor.zip`: 2.136.086 bytes.
- 1.117 file, 6.254.503 bytes dữ liệu giải nén, từng byte khớp package source.
- Digest source: `18b2f86feedfd9bcd7593b9a4e5c8ba392a0ec3e0e74b778872ed41adb6944b6`.
- Bản giải nén hiện tại: `.validation/p44-zip-verify-OmNP8Y`.

Đã giải nén vào thư mục mới để đối chiếu file list/bytes/digest, qua helper async có supervisor và timeout. Không kiểm lại byte của 66 ZIP khác, không dùng browser download tracker hoặc file chooser.

Ma trận đầu lượt dùng gói digest `e5af48e8…`, configure trực tiếp từ `.validation/p44-zip-verify-Ir4jnP`, không lấy CMake cache native cũ: Visual Studio 2022/MSVC 19.33, x64, CMake với `BUILD_TESTING=ON`, `BUILD_CHECKPOINTS=ON` và installed SDL **3.4.8 EXACT**. Đã build starter, checkpoint 01–12 và final ở cả Debug/Release, cùng target tests; mỗi nhóm tối đa bốn target, `--parallel 1`, tắt MSBuild node reuse, hard timeout 70 giây/nhóm. CTest Debug đạt 1/1 trong 2,33 giây; Release đạt 1/1 trong 0,24 giây. Đây là tests CPU, không mở window. Gói mới ở trên có các chỉnh sửa style/comment, runner và banner; cần ghi kết quả build mới riêng, không chuyển nguyên kết quả cũ sang digest mới.

Đã đọc đủ 15 compiler dependency logs mỗi cấu hình: 495 workspace input paths/cấu hình đều nằm trong gói hoặc đúng hai include directory do SDL package khai báo. SDL package dùng lại header cache dưới `project-26-cmake/_deps/sdl3-src/include`, nhưng package version và `SDL_version.h` đều là 3.4.8; không cho phép cả thư mục project cũ hay toàn `_deps`. Không có include từ source authored ngoài gói.

Gói hiện tại `18b2f86f…` đã configure mới tại `OmNP8Y/build-release-proof`. Ma trận mới đã build đủ **starter, checkpoint 01–12, final và tests ở cả Debug/Release**, theo nhóm tối đa bốn target, `--parallel 1`, hard timeout 70 giây/nhóm. CTest Debug đạt 1/1 trong 2,29 giây; Release đạt 1/1 trong 0,26 giây. Audit đủ 15 compiler dependency logs mỗi cấu hình: 495 workspace inputs/cấu hình, không có dependency authored ngoài gói; SDL header/package vẫn khớp 3.4.8. Log chốt: `.validation/p44-package-tests-1794643447874.log`. Kết quả này thay phạm vi final/tests Release ban đầu, không thay kiểm runtime hoặc thao tác native.

Runtime trên gói đầu lượt qua analytic GPU 128³: 2.097.152 samples, 2.048.383 cells, 22.778 active cells, 408.024 vertices/136.008 triangles, canaries nguyên. I/O checkpoint 11 kiểm field 8.388.672 bytes, snapshot bất biến khi tiếp tục nặn, restore field/mesh bit-exact; OBJ 39.704.266 bytes được parse và so đủ 408.024 vertices. Cancel save/export/load, checksum failure và trả candidate budget đều qua. Một lượt riêng tạm chuyển `final/shaders` trong bản giải nén sang backup, chạy từ executable với runtime shader fallback, kiểm sphere/layout oracle 32³ rồi khôi phục source; không sửa source authored. Đây vẫn không phải kiểm chuột/phím trong cửa sổ native.

Runtime trên **gói hiện tại `18b2f86f…`** đã qua lại analytic GPU 128³ trong `.validation/p44-zip-runtime-analytic-1794644682440.log`: cùng samples/cells/active/vertex counts, field max error 4,23268×10⁻⁷, surface RMS 7,03696×10⁻⁵ world unit, canaries nguyên. `.validation/p44-zip-runtime-products-1794644685495.log` kiểm stored brush thật: sphere kín Euler 2 → tunnel kín Euler 0 với 257 outside probes; hai sphere, hai components/Euler 4 → bridge một component/Euler 2 với 129 inside probes. Undo/redo đều qua. Đây là verifier topology/numeric độc lập, không thay việc tự tạo tunnel/bridge bằng input UI.

Hai lượt cùng digest này cũng qua: slice/probe ở checkpoint 10 (`.validation/p44-zip-runtime-slice-1794646087748.log`) kiểm 45 probe, max scalar error 3,94783×10⁻⁸, 12 sign-color pixels và cache lifecycle; job ở checkpoint 09 (`.validation/p44-zip-runtime-jobs-1794646094793.log`) kiểm Pause thu hồi fence nhưng không gửi batch mới, bỏ stale count, giấu partial emit, trả candidate bytes khi Cancel và Retry mesh byte-exact. Cả hai xử lý grid 128³ thật.

Benchmark Release final từ chính ZIP hiện tại hoàn tất protocol 2 warm-up + 5 measured trials, không full-field/mesh readback trong workload. `.validation/p44-zip-runtime-benchmark-1794646237101.log` giữ raw samples và `.validation/p44-zip-benchmark-audit-1794646344360.log` xác nhận tính lại độc lập đủ 17 nhóm median/min/max/MAD. Sphere 408.024 → edited 410.616 vertices; dirty 27/512 chunks, reuse 62 nonempty buffers; peak tracked reservation 59.861.328 bytes, cuối trial về baseline 0. Trên máy/driver đã ghi, median local count 4,847616 ms, full count 84,853760 ms, draw mesh-only 0,546816 ms, host total 4.170,4993 ms. Host total gồm orchestration/chờ các job của cả trial, không phải một frame hoặc kernel time; không dùng các số này làm cam kết FPS. App deadline 45 giây, supervisor 50 giây; không đổi deadline của các verifier khác.

## Kiểu dữ liệu source và kiểm toàn repository

Đã tách module runtime source thành `.mjs` và `.d.mts` khai báo API theo `ProjectSourceFile`. Consumer không còn ép `unknown` sang interface: TypeScript kiểm trực tiếp kiểu registry. Không tắt `resolveJsonModule`, không dùng `any`. Việc tách loại module không đổi nội dung source người học nhận được.

Hai test payload kiểm toàn catalog, schema/ngôn ngữ/source/version, runtime import thật và declaration. Fixture TypeScript xác nhận không nạp JSON C++ vào đồ thị kiểu, vẫn từ chối language ngoài union và sửa array readonly. Cùng hai fixture generator scope/read-only/pruning, cả bốn test qua. Output `.mjs`/`.d.mts` vẫn ignored, có regression Git hygiene cho cả hai định dạng.

Full cold typecheck ban đầu chạm heap thử nghiệm 512 MiB; đây không phải lỗi ứng dụng hoặc kết quả pass. Sau khi tách payload, toàn repo vẫn cần hơn 512 MiB: 2.770 compiler inputs, 147.599 dòng TypeScript. Lượt hoàn tất dùng heap cap 1.024 MiB, giữ timeout 120 giây: không còn lỗi, compiler báo 714.022 KiB và 20,68 giây. Không lấy kết quả focused typecheck làm kết quả toàn repo. Khi mở được toàn bộ chẩn đoán, đã sửa một lỗi thật trong browser test: `reducedMotion` phải nằm trong `contextOptions`; test nay kiểm cả `matchMedia`, không chỉ tin cấu hình.

Prettier toàn repo phát hiện 10 file tài liệu/test chưa đúng format. Đã chỉ chuẩn hóa định dạng tám hồ sơ review và hai suite cũ, không đổi nội dung, assertion hay timeout. Các kiểm tra format/lint/production cuối được nghiệm thu riêng sau các thay đổi này.

Kiểm riêng P44 còn tìm thấy 91 điểm căn lề/thiếu comment/khối trắng. Đã chuẩn hóa 12 file bằng formatter kèm so token/literal trước-sau, bổ sung comment giải thích trách nhiệm ở 15 file và tách nhóm kiểm nhỏ cho dễ đọc. Runner vẫn fail-fast bằng exception nhưng dùng `std::string_view` và trả `EXIT_FAILURE`/`EXIT_SUCCESS` tường minh, không phụ thuộc `assert`/`NDEBUG`. Banner native không còn ghi sai rằng Canvas/bài học chưa được tích hợp. Bộ kiểm source/MDX/style/generator/payload chọn đúng phạm vi hiện đạt 11/11; không phải 11 test toàn site.

Lượt production toàn site đầu tiên đạt 320/328 trong 195,9 giây. Ngoài lỗi đường dẫn `.ts` cũ trong test P31 đã sửa theo API `.mjs`, còn các vấn đề ở readout/style/hướng dẫn Debug của P42, link `/roadmap/39`, lesson GLSL của P39 và client chunk P38. Không bỏ test hoặc nâng threshold để che chúng. Riêng source P44 làm một server chunk đạt 487.054 bytes, vượt 200 KiB: dữ liệu runtime nay chia mảnh tối đa 128 KiB, giữ payload public/mirror nguyên vẹn. Import tĩnh bị bundler gộp lại; dynamic JSON có attribute lại giữ đường dẫn JSON không tồn tại trong dist. Đã chuyển sang dynamic import adapter `.mjs` với JSON import tĩnh bên trong, kèm test đi qua graph thật và runtime. Phải kiểm lại cả dung lượng lẫn render/browser, không chỉ thấy build thành công.

## Kiểm trình duyệt trên route thật

`tests/browser/project-44.spec.ts` chạy trên localhost do người dùng bật; không khởi động/restart server. Bộ kiểm gồm URL cũ → overview mới, challenge/12 lessons, migration và reload, dark navigation; 12 route/mode thật; source final/CMake/copy, chỉ fetch `/project-sources/44/`; capacity failure giữ last-good và dựng lại dù cuộn sang phần source ở dưới.

Các lượt đầu phát hiện lỗi thực và lỗi selector của test, không bỏ test hoặc tăng timeout để cho qua:

- Job Canvas bị phụ thuộc IntersectionObserver, có thể đứng ở count khi người học cuộn sang controls/readout. Đã bỏ gate viewport cho công việc hữu hạn; Pause, tab hidden/blur và dispose vẫn đóng/dừng đúng phạm vi.
- Tetra/source reader có thể nhận click khi markup SSR đã hiện nhưng client chưa hydrate. Hook ready dùng chung khóa controls/summary trước khi sẵn sàng; source file có trạng thái khởi tạo thay vì một khung mở mà không tải code.
- Test phải đọc toàn section challenge, không chỉ heading, và chọn `.checkpoint-source` để đọc final chứ không chọn nhầm bản trước trong walkthrough.

Sau sửa scheduler/readiness, lượt production đã qua đủ 5/5. Kiểm browser dùng một production server tạm do supervisor sở hữu, không khởi động/restart `npm run dev` của người dùng; server tạm và browser được dọn khi kết thúc. Mỗi lượt có deadline 30 giây/ca, worker 1, không retry và watchdog toàn process; không chạy cùng compiler/GPU.

Lượt cuối sau tách adapter source và Canvas: build toàn website thành công; cả 1.863 server JS chunks dưới giới hạn 200 KiB, lớn nhất 151.407 bytes. Source lớn không còn làm chunk 487 KiB hoặc tạo đường dẫn JSON thiếu trong dist. Bộ `tests/projects-44.cases.mjs` đạt **10/10** trong 6,73 giây: source/MDX/style, overview, đủ 12 lesson routes, alias, complete-source và budget client. Browser production đạt lại **5/5** trong 35,9 giây, gồm reduced-motion thật, dark navigation, migration/reload, cả 12 mode, source/copy/ZIP và offscreen last-good/retry.

Client P44 trước đó có một chunk 45.410 bytes. Đã tách tetra và workshop thành hai điểm tải theo mode, controls/readout tải riêng; không chỉ đặt một wrapper mỏng trước một chunk lớn. Output cuối: entry 1.409 bytes, tetra 5.480, workshop 13.763, painter dùng chung 14.392; giữ budget 24 KiB cho các mốc chính và có test regression. Focused TypeScript qua; lượt ESLint focused chạm timeout thử nghiệm 30 giây đã được supervisor dừng, không tính là lint pass. Các kết quả kiểm toàn repo được ghi riêng bên dưới.

Cold typecheck toàn repo sau tách mode đã qua lại: 2.771 inputs, 736.290 KiB, 21,20 giây với heap cap 1.024 MiB và timeout 120 giây. Prettier toàn repo cũng qua sau các thay đổi code cuối. Lint vẫn chưa đạt bằng chứng hoàn tất; không gộp nó vào các kết quả pass trên.

Lượt `--check` cuối cho metadata, content registry và source của đủ 67 project qua trong tổng deadline 60 giây giữ nguyên. Architecture và Git hygiene qua; không stage, commit hoặc push các chỉnh sửa của lượt nghiệm thu này. Toàn site chưa được chứng nhận xanh: lỗi trước mắt có thể che các lỗi sau trong cùng vòng lặp test, nên cần audit lại đầy đủ thay vì suy số pass mới từ các ca đã sửa.

## Native UI từ ZIP hiện tại — 14/11/2026

Hai lượt chạy `project_44_final.exe` Release từ `OmNP8Y`, grid 128³, mỗi lượt có app deadline 120 giây và supervisor 135 giây. Computer Use chọn đúng một window theo process path và chụp trạng thái mới sau từng input. Không dùng verifier gọi API thay thao tác chuột/phím. Driver/context báo RTX 3050 Laptop, OpenGL 4.3.0 NVIDIA 546.30.

- `.validation/p44-native-ui-final-1794644057971.log`: F2 đổi radius 0,280 → 0,305; left drag tạo khối lồi, undo trả sphere, redo khôi phục nét. Mesh field revision lần lượt 2 → 3 → 4; F9 mở slice/probe, Tab chuyển riêng sang camera, left drag orbit và wheel zoom giữ generation 4. Stats hiển thị 2.097.152 samples, 2.048.383 cells, 413.556 emitted vertices/137.852 triangles sau nét và history. Q có trong input trace, process kết thúc exit 0.
- `.validation/p44-native-ui-final-1794644173505.log`: click tab Files, S lưu field; D + left drag khoét rãnh; O tải lại snapshot, sphere trở về và history được xóa. E xuất OBJ, panel báo read-back verified. File thật được công bố trong `.runtime/volume-sculptor` của bản giải nén: field 8.388.672 bytes, OBJ 39.704.266 bytes. Log có `FIELD SAVED`, `FIELD LOADED AND REMESHED`, `MESH EXPORTED AND PARSED`. Đây là thao tác S/O/E, không phải mở OBJ trong phần mềm ngoài.
- Trong lượt thứ hai, Space Pause giữ viewport; F5 yêu cầu remesh, C hủy; sau Space panel báo cancelled, Enter retry rồi về ready mà sphere không mất. Lượt này tự kết thúc exit 0 ở deadline. Yêu cầu Q cuối đến sau khi window đã đóng nên helper không còn PID foreground; đã quan sát lại danh sách window rỗng, không gửi lại input vào handle cũ.
- `.validation/p44-native-ui-final-translated-1794645417456.log`: nạp fixture có origin (2; −2; 3), extent 4,5, cùng nguyên payload scalar của file native đã lưu. Header/checksum được tạo độc lập; payload SHA-256 `02b054fa64bfcbf7ee1b2178fb5b52979a46c36cfffbc7b903d48110302abc09`. Camera bám khối đã dịch, floor/guide nằm cùng domain; F9/X hiện và đổi slice/probe theo tọa độ mới. F12 normal và F11 wireframe hiển thị mesh thật; Ctrl+2 hoàn tất resample 128→64, giữ khối và domain, log `resampled=1`. Fixture ban đầu có max Z=9,5 bị từ chối đúng giới hạn [−8; 8]; không nới giới hạn để cho fixture sai qua. Lượt hợp lệ tự kết thúc exit 0. Input keysym `Right` lại tới SDL dưới dạng keypad 6, nên không tính thao tác ấy là đã kiểm isovalue; thao tác resize cuối cũng đến sau deadline, chưa được thực hiện trong lượt này.
- `.validation/p44-native-ui-final-1794645717130.log`: double-click caption maximize rồi xem lại bố cục/viewport; không đổi field/mesh. Đổi focus sang cửa sổ checkpoint 01 do cùng runner sở hữu, quan sát editor báo `JOBS PAUSED / CAMERA LIVE`; lấy lại focus vẫn Pause, Space mới đưa về ready. F10 thu gọn panel, viewport mở rộng, Q thoát exit 0. Viewer 01 chỉ xác nhận bề mặt nhập môn ban đầu (một triangle/revision 1), không tính là đã kiểm hết phím của viewer. Cả hai process hữu hạn đều kết thúc và danh sách window kiểm đã rỗng.

Còn thiếu kiểm trực tiếp: pan bằng middle drag, capture/focus loss/resize giữa stroke, đổi isovalue bằng đúng arrow key, chỉnh layer/probe và các viewer/checkpoint chưa đủ ma trận. Resize và focus loss khi idle, grid 128→64, normal/wireframe và load domain dịch đã có bằng chứng riêng ở trên; không gộp chúng thành kiểm giữa stroke. Việc đã xem slice hoặc sửa một rãnh chưa chứng minh tạo tunnel/bridge bằng UI; các fixture topology vẫn là phạm vi riêng.

## Lint — chẩn đoán có kết quả, chưa xanh toàn repo

Lượt toàn repo `.validation/p44-lint-1794644327607.log` hoàn tất với exit 1: **178 errors, 13 warnings**. Không phải process bị treo. Log focused 30 giây trước dừng trong lúc tải config/rules, chưa đủ căn cứ kết luận hàm Canvas là nguyên nhân chậm. Không tăng timeout stage lint toàn repo hoặc tắt rule.

Hai lỗi trong phạm vi tích hợp đã sửa: đổi tên biến `module` trong fixture generator; đóng gói Pause/notice của `SculptSession` thành getter chỉ đọc và command, thay việc UI ghi trực tiếp vào instance do React giữ. Giữ nguyên ý nghĩa Pause/step/cancel và thêm fixture kiểm field/history/generation không đổi khi phát lệnh trạng thái. Lint focused 20 file đạt 0 errors/0 warnings, report `.validation/p44-focused-lint-current.json`; toán/lifecycle và generator đạt 21/21. Không lấy hai sửa đổi này làm bằng chứng đã sửa các lỗi lint cũ của những project khác.

Kiểm nhịp bài còn phát hiện Canvas nằm sau code thay vì cạnh mô hình trực giác, năm bài đầu chưa đánh số hai thí nghiệm lỗi. Đã đưa nguyên câu hỏi/Canvas của đủ 12 bài lên cuối phần giải thích trước code, giữ thí nghiệm C++ sau bước chạy; đánh số hai thí nghiệm ở Bài 01–05. Không đổi code excerpts, modes hoặc giảm yêu cầu; test riêng kiểm vị trí/đủ thí nghiệm để ca lỗi ở project khác không che regression P44. Render/browser sau thay đổi được nghiệm thu lại riêng.

Sau thay đổi này: cold typecheck toàn repo đạt (734.892 KiB; 23,47 giây); production build hoàn tất trong deadline 240 giây, log `.validation/p44-production-1794645023883.log`. Render P44 đạt 10/10 trong 7,56 giây, `.validation/p44-p44-render-1794645219779.log`; browser P44 ban đầu đạt 5/5 trong 42,7 giây, `.validation/p44-p44-browser-1794645227776.log`.

Bộ browser mở rộng cuối đạt **6/6 trong 45,5 giây**, `.validation/p44-p44-browser-1794646039685.log`: thêm Pause/step/cancel/retry giữ last-good, camera trong Pause không đổi generation, keyboard stamp tạo history, đổi grid rồi Reset đưa về 24³/history rỗng. Ca mới ban đầu dừng do selector `getByLabel` không khớp control; đổi sang role combobox/name đúng cây accessibility, giữ mọi assertion và deadline 30 giây/ca. Không tăng timeout, retry hoặc coi lượt 5/6 là đạt.

Chốt nguồn sau ca browser mới: `.validation/p44-final-source-checks-1794646428382.log` qua đủ metadata/search, lesson registry và snapshot/payload của toàn catalog, với deadline 60 giây chung cho ba bước course. Architecture, Git hygiene và format của các web input thay đổi đều qua. Lint focused cuối vẫn 20 files/0 errors/0 warnings (`.validation/p44-focused-lint-final.json`). Cold TypeScript toàn repo qua lại: 2.771 inputs, 735.562 KiB, 34,58 giây, heap cap 1.024 MiB/timeout 120 giây. Không có process kiểm/browser server/native window còn chạy sau khi các handle báo terminal; không stage hoặc commit các sửa đổi tiếp tục này.

## Gate còn lại

1. Kiểm lại và xử lý các ca production toàn site còn báo lỗi, cùng lint ngoài phạm vi P44; không dùng bộ P44 đạt để tuyên bố CI toàn repo xanh.
2. Bổ sung runtime từ ZIP hiện tại cho starter, các nhánh CPU/field/count/emit, I/O cancellation/checksum và shader fallback còn chỉ có bằng chứng gói trước. Ma trận build/CTest độc lập và các lượt GPU mới đã qua nhưng không thay các phạm vi này.
3. Hoàn tất phần native UI còn thiếu đã liệt kê ở trên, gồm các viewer/checkpoint chưa đủ ma trận. Giữ riêng resize/focus khi idle với giữa stroke, verifier tạo sản phẩm với thao tác tự khoét/nối và API với cửa sổ thật.
4. Audit từng yêu cầu của P44 trong spec với bằng chứng đúng phạm vi rồi mới chốt trạng thái nghiệm thu. Benchmark/GPU 128³ trước đây vẫn có hồ sơ, nhưng không thay các gate trên.
