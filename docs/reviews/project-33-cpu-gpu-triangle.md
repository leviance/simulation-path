# Project 33 — đối chiếu renderer CPU và GPU

Ngày rà soát: 2026-10-30. Đối chiếu Product Specification v4, Project 33 và hợp đồng chung 0.7–0.10, 3.4–3.6. Không thay đổi yêu cầu của đặc tả. Bản gốc được xem xét là commit `34f13d7`.

## Phạm vi xây lại

Giữ hai renderer thực sự độc lập: CPU tự transform, tính coverage, nội suy và ghi RGBA8; OpenGL chỉ trình bày ảnh CPU ở panel trái, còn panel phải rasterize từ VBO bằng shader. Đây là bài chuyển tiếp nền tảng, không thêm camera/ánh sáng không liên quan.

Chín bài phù hợp với nội dung: context → shader → VBO/VAO → renderer CPU → transform → viewport → nội suy → readback → chỉnh sửa và nghiệm thu. Đã viết lại phần mở bài, mô hình, cách nối vào ứng dụng và thí nghiệm của cả chín bài; giữ những đoạn source đúng và bổ sung guard vào đoạn cần sửa. Mỗi bài có source chạy độc lập và code block đối chiếu token liên tiếp với chính checkpoint đó.

Đầu module có thử thách về hành vi sử dụng, dữ liệu chung và Definition of Done. Thời lượng phân biệt đọc, tự viết, thử nghiệm và setup. README chỉ rõ font overlay là scaffold, phần renderer/loader/phép kiểm phải tự xây và source không cần ghép ZIP khác.

## Những vấn đề đã sửa

| Vấn đề | Thay đổi |
| --- | --- |
| Resize cấp phát từ kích thước chưa chặn | Kiểm chiều, budget 4M pixel/panel và giới hạn texture trước khi cấp phát; giữ ảnh cũ khi resize thất bại; minimize không tạo ảnh giả |
| Lỗi runtime vẫn có thể thoát thành công | Đường lỗi đọc size, cấp phát và swap đặt trạng thái thất bại trước cleanup |
| Reset chưa đủ trạng thái | Khôi phục đỉnh, màu, selection, transform, solid/pause và xóa probe cũ |
| Tự so rasterizer với lần chạy khác của chính nó | Giữ phép kiểm lặp lại nhưng thêm fixture 2×2 có đáp án độc lập: RGB (128,64,64), nền (11,16,32) và winding đảo |
| NaN/Inf có thể lọt qua phép so màu | Sai khác không hữu hạn trả infinity; probe/geometry không hữu hạn không được coi là coverage hợp lệ |
| Centroid của tam giác nhỏ vẫn có thể chạm cạnh pixel | Đo khoảng cách theo pixel; báo `EDGE - NO VERDICT` trong dải 1,5 px và `BACKGROUND` cho mẫu nền; chưa đo ghi `not measured` |
| Shortcut nhận cả tổ hợp hệ điều hành | Bỏ qua Ctrl/Alt/GUI và key repeat, tránh Alt+Space vô tình đổi pause |
| Vòng đời program và log chưa chặn đủ | Bỏ binding program trước delete; info log có ngân sách 64 KiB, công bố giới hạn thay vì gọi là log đầy đủ không giới hạn |
| Canvas gọi sai số lượng tử màu như sai khác GPU | Nói rõ cả hai panel đều là JavaScript, chế độ khuếch đại chỉ minh họa làm tròn RGBA8, không đo driver hoặc GPU |
| Canvas tính transform lặp lại cho mỗi pixel | Transform ba đỉnh một lần trước vòng raster, giữ mô hình cùng công thức |
| Pointer phụ sửa được probe; đường viền tràn panel | Kiểm pointer owner, rollback khi cancel, chỉ bắt đầu trong panel; clip outline để hình ra ngoài NDC không vẽ sang panel khác |
| Góc vượt range của slider và input lúc hydration | Normalize góc, pause khi sửa trực tiếp, chờ hydration trước khi nhận controls; thêm preset và phím mũi tên đổi probe |

## Đối chiếu sản phẩm với đặc tả

| Yêu cầu | Nơi triển khai và bằng chứng |
| --- | --- |
| SDL3/OpenGL, shader tự viết, loader nhỏ | `gl_api.hpp`, `gpu_renderer.hpp`, bài 01–03; compile/link failure được kiểm trên driver thật |
| Cùng dữ liệu và quy ước giữa hai renderer | `kSourceTriangle`, mảng `triangle` khi chỉnh sửa và `Transform2D`; hai ảnh dùng cùng input, không dùng cùng rasterizer |
| Tam giác lớn, nhãn và chỉnh đỉnh/màu | Split-view với A/B/C, bảng NDC, local/clip w/screen của đỉnh chọn; mouse drag, keyboard và màu tác động cả hai phía |
| Clip/NDC/screen, resize/aspect, winding | Clip w = 1 được nêu rõ; round-trip CPU/GPU, fixture width lẻ và winding đảo. Không tuyên bố có perspective camera hoặc đọc vertex-shader output qua transform feedback |
| Correctness bằng dữ liệu, không chỉ ảnh giống nhau | CTest thuần CPU, pixel probes và readback toàn panel với CPU reference đúng kích thước; RGB tolerance 2/255, sai khác lớn chỉ được ở dải cạnh ≤1,5 px |
| Giải thích GPU thay phần nào | Bài 04–08 nối CPU transform/raster/interpolation với vertex shader, rasterizer và fragment shader; texture presenter không thay oracle |
| Canvas chỉ hỗ trợ giảng dạy | JavaScript/Canvas 2D, preset/pause/reset/step, keyboard, pointer capture và reduced motion; không thay chương trình C++ hoặc giả GPU readback |

Về API: `SDL_GetWindowSizeInPixels` cung cấp kích thước vùng vẽ theo pixel ([SDL](https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels)); `glReadPixels` đọc theo tọa độ bottom-left ([Khronos](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glReadPixels.xml)). Program còn được bind chưa được giải phóng thực sự ngay khi delete, vì vậy cleanup bỏ binding khi context vẫn còn sống ([glDeleteProgram](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDeleteProgram.xml)).

## Bằng chứng kiểm và giới hạn

Đã build starter, mọi checkpoint và final ở Debug/Release bằng Visual Studio 2022/MSVC 19.33, SDL 3.4.8. CTest thuần CPU có 51 phép kiểm. `--verify` chạy sáu frame trên RTX 3050 Laptop/OpenGL 3.3.0 NVIDIA 546.30: solid/smooth, transform, winding đảo, sửa vertex/màu và resize width lẻ; mỗi frame kiểm ba interior probes, một background probe và toàn ảnh với dải cạnh công bố. Không dùng timing này làm benchmark hiệu năng.

22 lượt `--smoke` của starter/checkpoint/final đã tự đóng. Native batch có deadline tổng 240 giây, build stage 90 giây với tối đa hai compiler, CTest 20 giây và GPU verification 25 giây; smoke matrix tổng 45 giây, từng process 5 giây. Không nới giới hạn chung hoặc thêm thư viện để vượt bước kiểm.

Qua Computer Use đã quan sát trực tiếp hai hình, đổi solid/smooth, kéo B bên CPU làm cả hai hình đổi, đọc P sau chỉnh sửa cho sai khác 0 ở mẫu đó, R khôi phục vị trí/màu/selection, N tiến 10° và Escape thoát. Sau khi sửa modifier gate, đã mở bản cuối và xác nhận Alt+Space giữ góc 0°, còn phím N đơn vẫn tăng lên 10°. Chưa coi thao tác kéo góc cửa sổ là resize thành công vì kích thước không đổi trong lần thử đó. Resize width lẻ đã được kiểm qua fixture native, nhưng chuyển giữa màn hình có DPI khác nhau, focus loss và Escape trong lúc đang giữ chuột vẫn cần kiểm thủ công riêng.

Lượt nghiệm thu cuối sau khi chốt source và đóng gói lại:

| Kiểm | Kết quả |
| --- | --- |
| Production build | Thành công, prepare/build giữ nguyên các giới hạn 120/240 giây; lượt cuối hoàn tất khoảng 143 giây |
| HTML/nội dung/source contract toàn site | 293/293 đạt, không failed/skipped/cancelled; khoảng 162 giây |
| Toán Canvas toàn khóa học | 908/908 đạt, không failed/skipped/cancelled; khoảng 50,8 giây trong giới hạn 60 giây với hai worker |
| P33 riêng | 12 math tests và ba source/content tests đạt; code block cân bằng và khớp token liên tiếp trong checkpoint |
| Chrome | Ba test authored đạt: route/source, step/reset/capture/reduced motion, preset/pixel center/gutter, ZIP href ở bài cuối và tiến độ qua reload |
| Source tải phía browser | Có request source thật; tất cả JSON đều thuộc P33, không kéo source cả khóa học; không page/console/HTTP error |
| DPR/dung lượng | Browser DPR 1,5; chunk gốc Canvas P33 14.117 byte, trong budget không đổi |
| ZIP | Tất cả 67 ZIP khớp từng byte với source ở lượt cuối, không chỉ riêng P33 |
| Kiểm còn lại | TypeScript, architecture budgets, Git hygiene và git diff whitespace check đạt |

Browser dùng production artifact trong context Chrome riêng, không khởi động dev server hoặc dùng profile cá nhân; probe localhost không tìm thấy server đang bật. Các lần kiểm trước khi cập nhật source không được dùng thay bằng chứng của lượt đóng gói cuối. Một lượt đã phát hiện đúng ZIP cũ sau thay đổi source; đã sinh lại gói và kiểm toàn bộ byte trước khi kết luận đạt. Một test browser mới ban đầu tìm ZIP ở bài 08 thay vì bài cuối; đã sửa vị trí điều hướng của test, không sửa hoặc hạ contract của ứng dụng.

Bằng chứng local: `.validation/p33-native-results.json`, `.validation/p33-checkpoint-smokes.json`, `.validation/p33-quick-results.json`, `.validation/p33-final-results.json`, `.validation/p33-final-site-summary.json`, `.validation/p33-browser-results.json` và CTest LastTest.log của `.validation/p33-rebuilt`. Đây là output ngoài Git. Chưa chạy toàn bộ `npm test`, lint, full MDX development suite hoặc chứng nhận mọi OS/GPU; không suy ra các việc đó từ production build.

Không thay `tests/source-contract.cases.mjs`, `tests/course-content.cases.mjs`, `tests/site-platform.cases.mjs`, `scripts/run-test-suite.mjs` hoặc `scripts/process-supervisor.mjs`. Không stage/commit/push/deploy. Source JSON, snapshot, ZIP, build, ảnh và log trong `.validation` nằm ngoài Git.
