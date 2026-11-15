# Project 48 — hồ sơ kiểm chứng bản xây lại

Ngày 15/11/2026. Nguồn chuẩn: Project 48, các hợp đồng 0.4, 0.7–0.10 và 3.4–3.6 trong [đặc tả](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không sửa/hạ yêu cầu của đặc tả. Xem thêm [kế hoạch ban đầu](project-48-rebuild-plan.md).

## Sản phẩm và giáo trình

Chín bài: mũi tên → trường mẫu/inspector → scalar/gradient → divergence → curl → sai số/mép → bilinear/RK2/tracer → xoáy tương tác → kiểm chứng. Giữ URL cũ; bản mới có `contentRevision:2`, chỉ vô hiệu hóa tiến độ cũ của riêng P48.

Mỗi bài có bảy vai trò giảng dạy, thí nghiệm lỗi và checklist, code lấy từ đúng checkpoint. Có 36 snippet marker với kiểm literal/toán tử liên tiếp, không chỉ subsequence. Nêu rõ scaffold SDL/panel/Workshop và Field được cung cấp, thuật toán nào người học thêm và vị trí gọi. Source hoàn chỉnh sau từng bài và final dùng cùng nguồn với ZIP; One Dark và KaTeX giữ nguyên.

## Đối chiếu yêu cầu

| Yêu cầu                                    | Triển khai và bằng chứng                                                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable tương tác, không chỉ ảnh/Canvas | C++20/SDL3.4.8; starter, checkpoint1–9, final; native window đã mở và thao tác trực tiếp. Canvas chỉ hỗ trợ học.                                                                                   |
| Ít nhất32×32 mẫu                           | Final mặc định65×49=3.185 nút, có129×97=12.513. 33×25 chỉ là lưới học. Log native ghi allocated=sampled=overlay_nodes=3185; có221 glyph và128 tracer, không dùng glyph count giả làm sample count. |
| Tự lưu field và lấy đạo hàm                | Field giữ scalar/vx/vy riêng, node-centered cùng hai đầu miền. Sai phân trung tâm và một phía ba điểm tự viết, chia đúng dx/dy.                                                                    |
| Preset uniform/source/sink/vortex          | Uniform, source, sink, rotation, shear, gradient và một xoáy Gaussian tương tác. Các trường affine có oracle div/curl biết trước tại mọi nút, kể cả mép.                                           |
| Gradient độc lập với velocity              | Lớp Gradient chỉ đọc phi, vẽ ∇phi và màu độ lớn. Chỉ preset velocity=gradient ghi vx/vy; tracer luôn đọc vx/vy. Unit/browser kiểm đổi overlay không reset hạt/tick hoặc sửa vector.                |
| Div/curl là phép đo số thật                | Lớp màu và inspector gọi cùng derivativeX/Y; không tô một màu gán sẵn cho preset. Vortex có đối chiếu continuum và hội tụ33→65→129, không ép div số về0.                                           |
| Tracer với dt, bật/tắt được                | Bilinear trên cùng Field, midpoint RK2 dt1/60;128 hạt, ring buffer24 vị trí; tuổi8s/ra miền/nonfinite thì gieo lại và xóa vệt. Scheduler tối đa8 bước/frame, báo dropped time.                     |
| Mouse edit và switch overlay               | Probe/edit tách riêng, capture khi kéo, Enter đặt tâm bằng bàn phím. Rebuild nền rồi cộng đúng một xoáy, không tích lũy theo event. Native drag/Enter, browser drag/capture và đổi layer đã kiểm.  |
| Hiện tượng đọc được, có xem sạch           | Viewport lớn, mũi tên/vệt, trục, màu có dấu, legend và inspector. Palette cố định giảm chói; số thật không clamp. F1/checkbox clean không che controls.                                            |
| Pause/Reset và an toàn                     | Pause dừng thời gian nhưng vẫn đọc/chỉnh field; reset khôi phục đúng cấu hình checkpoint. CLI hidden/capture bắt buộc thời lượng0.05–60s, flags sai trả lỗi; build dùng một worker và watchdog.    |
| Không lẫn với solver chất lưu              | README/bài học phân biệt field cho trước với velocity state ở49; tracer không mang khối lượng, scalar không phải pressure; không có claim thời tiết thật hoặc bảo toàn từ mật độ chấm.             |

## Bằng chứng native và gói tải

- ZIP **124 file**, danh sách và từng byte khớp nguồn. Source digest **`7835e11eeafbfb0a6fa965953efbbd6698704397bbc5a9ef3617ec9945056a3a`**.
- Visual Studio2022/x64, MSVC19.33:11 app target và một CPU test target trong mỗi Debug/Release; CTest1/1 ở cả hai cấu hình, không có compiler warning. Dùng cache exact SDL3.4.8, không tải lại thư viện; CMake mặc định vẫn FetchContent với URL/SHA-256 và `SDL3::SDL3`.
- Mọi executable được smoke hữu hạn; final chạy60 tick/1 giây mô hình, sampled/overlay3185, glyph221, tracer128, dropped0.
- Reference: affine error0; max curl(gradient)6.66134e−16. Gaussian gradient max interior0.0112938→0.00287085; boundary0.00446525→0.00111592 trên cùng miền.
- Tests CPU có oracle affine/bậc hai/Gaussian, bilinear affine và quỹ đạo quay giải tích, hội tụ vortex, NaN/Inf, lịch15/30/120 FPS, bộ nhớ vệt và CLI hữu hạn. Không dùng assert bị tắt trong Release.
- Computer Use kiểm chuột/phím thật: N, mode edit bằng click, drag vortex, V, G, L; lượt sau kiểm Space, T, R, P, F1, H và Enter. Đã quan sát panel/hình sau từng thao tác. Các cửa sổ có deadline và tự đóng. Không tính lời gọi sau khi window hết hạn là thành công; không tuyên bố đã kiểm native resize/focus-loss bằng phần cứng.

Bằng chứng local ngoài Git: `.validation/p48-package-native-evidence.json`, `p48-package-native.log`, `p48-native-interaction-evidence.json` và ảnh BMP trong thư mục package được ghi ở JSON. Không đưa DLL, build tree, ảnh/log, snapshot hoặc ZIP vào Git.

Sau lượt UI, chỉ bổ sung thống kê `visitedLastStep` và đếm ô màu/glyph theo đúng layer; các marker mới chỉ là comment. Đã đối chiếu token với bản native được thao tác: input, panel, renderer và toàn bộ thuật toán số không đổi; hai file thay đổi lệnh thực thi là `main.cpp` (log) và `workshop.hpp` (counter). Build/CTest, smoke và ZIP ở trên thuộc digest cuối. Hồ sơ đối chiếu ở `.validation/p48-final-audit-evidence.json`.

## Web, nội dung và giới hạn kiểm

- Toán/controller:16/16, gồm overlay không đổi quỹ đạo, reset/toggle/dispose và vortex continuum. Năm kiểm source/nội dung/style riêng đã qua trước build chốt.
- Browser trên server người dùng đang chạy tại localhost:3000:7/7 ở lượt đã kiểm. Có preset/readout, gradient độc lập, pointer/keyboard/edit, tinh lưới, pause/reset/tracer/reduced-motion, source/copy/ZIP, chín route/dark/progress. Copy dùng clipboard giả trong trang, không ghi đè clipboard hệ điều hành.
- Canvas dùng session riêng; không clone mảng hạt/vệt vào React mỗi frame. Readout tối đa8Hz, static field được cache, SSR controls disabled tới khi handler sẵn sàng. Có DPR/resize/reduced-motion, pause/reset, pointer capture và dispose.
- Lượt đọc màu trực tiếp tại các ranh giới ô kiểm trường đều không có vệt tối giả do subpixel; cạnh fill được căn pixel vật lý, không sửa scalar/vx/vy. Thử thách tách yêu cầu hành vi khỏi phương pháp trong phần ràng buộc; các lời gọi overlayValue/drawPanel và lưới mặc định đã đối chiếu lại với bài.
- Production build chốt: **đạt**; sáu kiểm tra P48, gồm overview và chín lesson route, đạt **6/6**. Bằng chứng ở `.validation/p48-site-evidence.json`.
- Browser sau chốt: **7/7**, gồm phép đọc pixel ở các ranh giới ô của trường đều; không có vệt tối giả. Kết quả ở `.validation/p48-browser-evidence.json`. Audit đối chiếu digest, ZIP production, các cấu hình native, thay đổi sau UI và chunk thật ở `.validation/p48-final-audit-evidence.json`: chunk workshop21.066 bytes, wrapper798 bytes, đều dưới32KiB.
- Không chạy lại toàn bộ bài test toàn site để tuyên bố100%. Lượt quét gần nhất trong [hồ sơ P47](project-47-rebuild-verification.md) có10 lỗi ngoài P48 (P38/P39/P42, link roadmap39 và các assertion homepage/downloads). Đây là kết quả lịch sử, không phải số test mới của P48; đợt này không sửa chúng hoặc nới quy tắc kiểm.

Tài liệu toán đối chiếu: [OpenStax gradient](https://openstax.org/books/calculus-volume-3/pages/4-6-directional-derivatives-and-the-gradient), [OpenStax divergence/curl](https://openstax.org/books/calculus-volume-3/pages/6-5-divergence-and-curl), [McMaster sai phân ba điểm](https://dmpeli.mcmaster.ca/Matlab/Math4Q3/NumMethods/Lecture3-2.html). Các fixture và phần giải thích là triển khai riêng, không sao chép bài giảng.
