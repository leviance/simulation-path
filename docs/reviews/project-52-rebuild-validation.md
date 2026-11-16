# Project 52 — hồ sơ xây lại và kiểm chứng

Ngày ghi nhận: 2026-11-16. Nguồn chuẩn là mục Project 52 cùng Mục 0 và 3 của Product Specification v4; không sửa hoặc hạ yêu cầu trong đặc tả.

## Sản phẩm đã thay đổi

Bản cũ chỉ có khung dây, camera cố định và số liệu chủ yếu ở title/console. Bản mới là công cụ C++20/SDL3 có bề mặt/depth, góc quan sát orbit/pan/zoom độc lập nguồn tia, cửa sổ ngắm, dịch/chọn từng primitive, dịch nguồn và bảng đọc dữ liệu ngay trong ứng dụng. Canvas dùng cùng biến/công thức, renderer CPU riêng, không WebGL/WASM và không thay bản C++.

Giữ tám mốc có vai trò tự nhiên: cảnh → ray → plane → sphere → AABB → triangle → nearest/picking → kiểm chứng. Bài 01–02 được viết lại; 03–08 nối lại với chương trình mới. Mọi hàm mới có đầu vào/kết quả/vị trí gọi; renderer, UI và mesh minh họa được công bố là scaffold. Có thử thách đầu module, phân bổ thời gian, thí nghiệm sai, checklist và mã đầy đủ từng checkpoint/final.

## Đối chiếu yêu cầu

| Yêu cầu đặc tả                             | Thực hiện và bằng chứng                                                                                                                                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Một cảnh tương tác đủ bốn primitive        | Plane, sphere, AABB, triangle có bề mặt/depth thật trong C++; mesh sphere chỉ để vẽ, phép giao vẫn giải tích. Ảnh bốn preset từ executable đã kiểm ở `.validation/p52-final-0..3.bmp`; Canvas thực tế ở DPR 1/2.                                                     |
| Move camera/ray/objects, choose primitive  | `Workshop` tách observer/emitter, giới hạn pose; ray lấy từ emitter. Nút/phím chọn/dịch cả bốn hình; nguồn dịch giữ hướng, AABB giữ extent. Unit tests, Canvas thực và kiểm native bên dưới.                                                                         |
| Hit point/normal cùng world space          | `makeHit` lấy p=o+t·d, outward normal và frontFace; debug drawing dùng chính world point/vector. Bảng đọc kết quả; residual theo phương trình độc lập, ảnh/native và fixtures.                                                                                       |
| Entry/exit đúng đối tượng                  | `sphereInterval`/`boxInterval` giữ nghiệm chưa clip; plane/triangle không có volume interval. Inside, tangent, ray không unit và đoạn nằm trong solid mà chưa tới mặt đều có fixture.                                                                                |
| Nearest positive surface hit theo interval | Mặc định tMin=1e−6, tMax=14, chỉnh [0.1,30]. Thử entry rồi exit trong range; min t, tie chính xác dùng ID nhỏ. Ca biết trước nhiều primitive cùng ray có t=2/5/8; thêm đảo thứ tự/tie/empty.                                                                         |
| Tự viết intersection/debug                 | Plane, stable quadratic q/c, slab và Möller–Trumbore tự viết. Renderer triangle không gọi chúng để giấu lời giải; không engine raycast.                                                                                                                              |
| Các ca biên/độ đúng                        | Parallel/coplanar, inside, tangent/q=0, t âm/out-of-range, direction zero/NaN, bounds/radius sai, triangle hai phía/edge/vertex/degenerate. Nghiệm biết trước, surface residual, barycentric reconstruction, round-trip nhiều aspect; không chỉ so hàm với chính nó. |
| Tài liệu/source đồng bộ                    | 26 đoạn C++ gắn marker của đúng checkpoint; tests so cả marker và token liên tiếp. Starter/01–08/final tự build, tests còn chạy trong Release; ZIP không cần Node.                                                                                                   |
| Showcase/debug đọc được                    | Cảnh có màu/flat shading/depth; ray sáng tới nearest, đoạn khuất nét đứt tối, exit vàng, normal có mũi tên; nút Debug ẩn lưới/trục phụ. Giữ bảng/nút để không mất khả năng sử dụng.                                                                                  |

## Kiểm tra tự động đã có kết quả

- **Source/web:** full TypeScript; 18 ca math/snippet/marker; hợp đồng C++ của toàn khóa; architecture budgets và Git generated-output hygiene đều qua trong `.validation/p52-source-evidence.json`. Cả readiness guard và ngưỡng sai số cuối đã được kiểm lại.
- **C++ từ đúng ZIP:** giải nén 203 file, so byte từng file với nguồn và so digest manifest. Build Windows/Visual Studio 2022/MSVC 19.33 x64, Debug và Release, mỗi cấu hình 10 app target (starter, 8 checkpoint, final) cùng tests, `--parallel 1`. CTest qua cả hai; checks không dùng assert bị NDEBUG xóa. Không phát hiện warning Cxxxx trong log build được kiểm.
- **Runtime hữu hạn:** từng app Release chạy hai frame và tự thoát; final chạy/chụp đủ bốn preset. Chế độ capture nằm trước present; CLI giới hạn 1..600 frame. Bằng chứng `.validation/p52-native-final-evidence.json`, nguồn không đổi trong lượt kiểm.
- **Canvas thực:** React development StrictMode, DPR 1/2, gated stage, pointer capture, keyboard, observer không đổi ray, dịch object/source, sphere interval, inside segment, invalidation của PASS cũ, reduced-motion dừng bền vững và dispose không còn RAF. Bằng chứng `.validation/p52-canvas-evidence.json`; không suy diễn thành kiểm C++.
- **Production:** full website 595 lesson đã compile; 19 ca route Project 52, cấu trúc H2 toàn khóa và roadmap/progress qua. Lượt build này phát hiện tiếp lỗi hydration qua kiểm localhost; vì vậy cần build chốt sau bản sửa, không coi output cũ là output cuối.
- **Localhost thật:** hai ca browser của P52 qua sau sửa hydration. Luồng riêng còn kiểm dark theme ngay frame đầu và qua navigation, progress sau reload, copy mã bằng clipboard stub, tìm kiếm bài mới, source viewer chỉ tải payload `/project-sources/52/`, và ZIP thực phục vụ đúng SHA/digest của gói native đã kiểm. Không tự bật/restart server; không dùng download tracking hoặc file chooser. Bằng chứng `.validation/p52-browser-live-evidence.json` và `.validation/p52-live-flows-evidence.json`.

### Lỗi hydration tìm được và đã sửa

Hai ca localhost ban đầu không đổi preset/camera ở thao tác đầu. Chẩn đoán cho thấy Canvas và callback hoạt động sau hydration, không có pageerror/network failure; thao tác ngay khi SSR xuất hiện bị mất. Dùng lại `useClientReady`: controls bị disabled khi SSR/chưa hydrate, Canvas có `data-ray52-ready`, tab/pointer chỉ bật khi ready. Tests chờ đúng readiness, không tăng timeout để che lỗi. Hai ca localhost sau sửa đã qua; thêm kiểm SSR disabled trong suite route.

## Kiểm native trực tiếp và xác nhận người dùng

- Đã quan sát bản executable thật, số liệu/điểm chạm/normal thay đổi khi nhấn nút X+ và phím D: tâm sphere đổi −1.5 → −1.4 → −1.3, ray giữ nguyên, hit cập nhật và residual failures=0.
- Phím 7 đặt nguồn trong AABB: origin=(1,−0.1,0.7), direction=(0,0,1), t=0.7, geometric interval=[−0.7,0.7], frontFace=false, nearest ID 2.
- Kéo tâm ngắm ra ngoài ô nhỏ rồi buông: ray/point/interval cập nhật; capture/input không bị giữ ở ô cũ. Điều khiển Canvas đã có kiểm riêng ở cả DPR.
- Phím mũi tên gửi qua Computer Use không cho kết quả đủ để kết luận. Bản chẩn đoán chỉ ghi sự kiện SDL trong `.validation` bị **Computer Use app approval timed out**; không tiếp tục điều khiển cửa sổ bị chặn hoặc sửa shortcut để né kiểm.
- **Người dùng xác nhận trên bàn phím thật:** “Cả hai hoạt động đúng” cho mũi tên đổi ray và Ctrl+mũi tên xoay camera. Đây là xác nhận thủ công của đúng bản P52 từ ZIP đã kiểm, không mượn xác nhận nghiệm thu P51.
- Không tuyên bố đã tự động thử mọi tổ hợp chuột/phím native hoặc mọi hệ điều hành. Các cửa sổ kiểm có guardian 120/180 giây; chúng đã được dọn khi hết hạn. Timeout của phiên kiểm không được ghi thành PASS.

## Gói tải về

- Tên: `project-52-ray-intersections.zip`; 216.487 byte, 203 file nguồn/tài liệu/CMake/snapshots/tests.
- Source/package digest: `c501f339027ea2af47d1bac081761e6d7f05328e90b8ffac44802a4df4691b2a`.
- SHA-256 của ZIP thực phục vụ trên localhost: `e63254f505bbfa5858886ace9e0b727189b487f04c8ef4c87d6947af8ba6819f`.
- C++20, CMake 3.24+, SDL3 3.4.8 EXACT; ZIP mặc định FetchContent có URL/hash và link SDL3::SDL3. Khi kiểm máy này dùng package SDL 3.4.8 đã có để không tải/build lại thư viện.

## Giới hạn và phạm vi

Đây là geometry/picking lab, không phải ray tracer hoàn chỉnh hoặc cam kết robust cho tọa độ cực lớn. AABB không xoay; triangle hai phía nhưng không watertight. Plane toán học vô hạn, patch minh họa hữu hạn. Runtime residual kiểm record được báo, không chứng minh không bỏ sót hit; round-trip cũng cần bổ sung nghiệm biết trước.

Chỉ source authored của P52 cùng các cập nhật liên quan về marker/roadmap/glossary được thay. Snapshot, ZIP, payload, binary, build, thư viện và bằng chứng tạm ở đường dẫn ignored; không stage/commit/push. Bản cũ giữ trong `.validation/retired-project-52-fixed-camera`.

## Lượt chốt

Đã hoàn tất lượt chốt sau sửa readiness, tách ngưỡng sai số và gỡ ghi chú chờ nghiệm thu:

- TypeScript toàn repository, 18 ca math/marker, hợp đồng C++ toàn khóa và các budget/hygiene qua.
- ZIP mới được đối chiếu 203 file và build/CTest Debug/Release lại, chạy hữu hạn toàn bộ target và chụp bốn preset. Tái dùng build cache; một worker, không tải/build lại SDL.
- Validator tách worldTolerance=1e−8 đơn vị world và normalTolerance=1e−10 không đơn vị; projection fixture dùng 1e−7 pixel. Ca normal nhân (1+5e−9) bị từ chối ở C++/TypeScript. Không thay input/camera sau xác nhận phím của người dùng.
- Canvas hiện tại qua đủ tám nhóm kiểm tại DPR 1/2; localhost qua hai ca browser và năm luồng tích hợp, ZIP/source viewer đúng gói mới.
- Output production cuối đã compile toàn bộ 595 bài, qua 19 ca route/SSR/section/roadmap và chạy tiếp hai ca browser localhost thành công. Không dùng output trước bản sửa để chốt. Cảnh báo plugin timing/route classification của Vinext không được mô tả là build warning-free.

Project 52 đáp ứng phạm vi sản phẩm đã đối chiếu ở trên. Đây không phải tuyên bố mọi test/browser của toàn site hoặc mọi tổ hợp native trên mọi hệ điều hành đều đã được chạy.
