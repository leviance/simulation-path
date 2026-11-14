# Project 44 — tích hợp học phần điêu khắc thể tích

Mốc 14/11/2026. Học phần mới dùng slug `volume-sculptor`, còn nhãn chờ nghiệm thu. Đây không phải biên bản chứng nhận toàn bộ Project 44 đã đạt đặc tả. Nguồn chuẩn vẫn là Product Specification v4 complete; [hồ sơ native](project-44-progress.md) và [hồ sơ Canvas](project-44-canvas-progress.md) có phạm vi riêng.

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

Gói hiện tại `18b2f86f…` đã configure mới tại `OmNP8Y/build-release-proof`, build **Release final/tests** và CTest 1/1 trong 0,29 giây. Hai compiler logs mới có 122 workspace inputs, không có dependency authored ngoài gói; SDL header/package vẫn khớp 3.4.8. Phạm vi này chưa bao gồm Debug hoặc starter/12 checkpoint của digest mới.

Runtime trên gói đầu lượt qua analytic GPU 128³: 2.097.152 samples, 2.048.383 cells, 22.778 active cells, 408.024 vertices/136.008 triangles, canaries nguyên. I/O checkpoint 11 kiểm field 8.388.672 bytes, snapshot bất biến khi tiếp tục nặn, restore field/mesh bit-exact; OBJ 39.704.266 bytes được parse và so đủ 408.024 vertices. Cancel save/export/load, checksum failure và trả candidate budget đều qua. Một lượt riêng tạm chuyển `final/shaders` trong bản giải nén sang backup, chạy từ executable với runtime shader fallback, kiểm sphere/layout oracle 32³ rồi khôi phục source; không sửa source authored. Đây vẫn không phải kiểm chuột/phím trong cửa sổ native.

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

## Gate còn lại

1. Chốt lại bộ browser route đầy đủ sau thay đổi cuối, các check registry/source/architecture/type và Git hygiene. Kiểm production build/render/route riêng; không dùng dev HTTP 200 thay production.
2. Kiểm build/runtime từ ZIP digest mới sau sửa C++; giữ riêng bằng chứng của gói trước. Không dùng ma trận build hoặc verifier GPU thay kiểm window.
3. Hoàn tất native UI matrix: các viewer/editor, capture/focus/resize/reset, camera/slice/probe, grid/iso, Pause/cancel, S/O/E và load domain dịch. Giữ phân biệt test API/GPU với thao tác cửa sổ thật.
4. Audit từng yêu cầu của P44 trong spec với bằng chứng đúng phạm vi rồi mới chốt trạng thái nghiệm thu. Benchmark/GPU 128³ trước đây vẫn có hồ sơ, nhưng không thay các gate trên.
