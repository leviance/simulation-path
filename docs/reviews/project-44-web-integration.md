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

Lượt P44 đã sinh 1.155 output (CMake, starter/12 checkpoint/final, registry và source JSON). Đây là output ignored, không phải 1.155 file cần commit. ZIP hiện có:

- `public/downloads/project-44-volume-sculptor.zip`: 2.124.053 bytes.
- 1.117 file, 6.239.645 bytes dữ liệu giải nén, từng byte khớp package source.
- Digest source: `e5af48e875f00ba44aa82c808f17c8f8d17a54a2cdca23be464d443e7da7756a`.

Đã giải nén vào thư mục mới để đối chiếu file list/bytes/digest, qua helper async có supervisor và timeout. Đây chưa phải bằng chứng configure/build/CTest từ gói độc lập, cũng không kiểm lại byte của 66 ZIP khác. Không dùng browser download tracker hoặc file chooser.

## Kiểm trình duyệt trên route thật

`tests/browser/project-44.spec.ts` chạy trên localhost do người dùng bật; không khởi động/restart server. Bộ kiểm gồm URL cũ → overview mới, challenge/12 lessons, migration và reload, dark navigation; 12 route/mode thật; source final/CMake/copy, chỉ fetch `/project-sources/44/`; capacity failure giữ last-good và dựng lại dù cuộn sang phần source ở dưới.

Các lượt đầu phát hiện lỗi thực và lỗi selector của test, không bỏ test hoặc tăng timeout để cho qua:

- Job Canvas bị phụ thuộc IntersectionObserver, có thể đứng ở count khi người học cuộn sang controls/readout. Đã bỏ gate viewport cho công việc hữu hạn; Pause, tab hidden/blur và dispose vẫn đóng/dừng đúng phạm vi.
- Tetra/source reader có thể nhận click khi markup SSR đã hiện nhưng client chưa hydrate. Hook ready dùng chung khóa controls/summary trước khi sẵn sàng; source file có trạng thái khởi tạo thay vì một khung mở mà không tải code.
- Test phải đọc toàn section challenge, không chỉ heading, và chọn `.checkpoint-source` để đọc final chứ không chọn nhầm bản trước trong walkthrough.

Sau sửa scheduler/readiness, bốn kiểm navigation/12 mode đã qua; ca final source/copy/offscreen được chạy riêng qua trong 13,4 giây. Lượt đầy đủ cuối và production được ghi ở phần nghiệm thu tiếp theo, không suy từ tổng hợp này thành kết quả toàn site. Mỗi lượt có deadline 30 giây/ca và watchdog toàn process, worker 1; không chạy cùng compiler/GPU.

## Gate còn lại

1. Chốt lại bộ browser route đầy đủ sau thay đổi cuối, các check registry/source/architecture/type và Git hygiene. Kiểm production build/render/route riêng; không dùng dev HTTP 200 thay production.
2. Configure/build/CTest từ ZIP mới, chạy starter/12 checkpoint/final ở Debug/Release theo batch có giới hạn. Không lấy cache native cũ làm bằng chứng gói độc lập.
3. Hoàn tất native UI matrix: các viewer/editor, capture/focus/resize/reset, camera/slice/probe, grid/iso, Pause/cancel, S/O/E và load domain dịch. Giữ phân biệt test API/GPU với thao tác cửa sổ thật.
4. Audit từng yêu cầu của P44 trong spec với bằng chứng đúng phạm vi rồi mới chốt trạng thái nghiệm thu. Benchmark/GPU 128³ trước đây vẫn có hồ sơ, nhưng không thay các gate trên.
