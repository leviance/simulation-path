# Project 44 — mốc Canvas hỗ trợ học trước tích hợp

Canvas hiện đã ghép vào học phần `volume-sculptor`. Các kết quả route/ZIP/production mới nằm ở [hồ sơ tích hợp web](project-44-web-integration.md); nội dung bên dưới giữ phạm vi của lượt kiểm component ban đầu.

Ngày kiểm: 14/11/2026. Nguồn chuẩn vẫn là mục Project 44 trong Product Specification v4 complete. Hồ sơ native nằm ở [project-44-progress.md](project-44-progress.md). Mốc này bổ sung Canvas và kiểm component riêng; không phải nghiệm thu toàn Project 44.

## Đã triển khai

`components/labs/volume-sculptor-lab.tsx` có 12 mode khớp nhịp 12 bài: tetra, cells, normals, brush, stroke, field, prefix, mesh, dirty, slice, archive và validation. Controls, paint, readout và tetra viewer được tách trong `components/labs/volume-sculptor/`. Toán và state/job nằm trong `lib/labs/volume-sculptor/`, không ghép vào một file trung tâm của khóa học.

- Một tetra: bốn scalar, isovalue, inside/outside, giao điểm theo edge ID chuẩn, số triangle, trường hợp suy biến và bảng `t`/tọa độ. Camera và scalar là hai loại thao tác riêng.
- Volume: `Float32Array` lưu field thật; world↔grid, trilinear probe, gradient có one-sided boundary và fallback face normal. Cube chia cùng sáu tetra như C++; equality thuộc outside, count/emit cùng loại triangle suy biến.
- Cọ add/subtract, radius/strength/falloff, stroke lấy mẫu theo quãng đường, hàng đợi tối đa 256 stamp và tối đa bốn stamp mỗi batch. Cọ nằm trên mặt phẳng slice được chọn; không nhận đó là surface picking theo camera của bản C++.
- Count rồi prefix theo chunk trước emit; mỗi batch meshing tối đa 256 cells. Capacity tối đa 98.304 vertices, có lựa chọn capacity 12 để thử lỗi. Thiếu capacity/hủy tác vụ không công bố mesh dang dở.
- Dirty halo `[low−2; high+1]`, reuse chunk, field revision và requested/active generation. Camera không tạo job. Lát cắt đọc field hiện tại; mesh đang giữ có nhãn last-good nếu chưa khớp.
- Undo/redo tối đa bốn snapshot stroke. Chuyển resolution nội suy lại stored field, giữ domain nhưng có thể mất chi tiết; history khác grid bị xóa. Chọn lại cùng N hoặc isovalue là no-op.
- Có hai nét cọ mẫu để khoét xuyên cầu và nối hai khối rời. Đây là các stamp làm đổi field, không thay bằng một preset torus/primitive đã tạo sẵn.
- Snapshot RAM giữ bản field/iso độc lập với chỉnh sửa sau đó. UI ghi rõ đây không phải save/load `.scl` hoặc export OBJ của ứng dụng C++.
- Orbit/pan/zoom, slice/probe, wireframe/normal/chunk inspector, bàn phím, pointer owner/capture, cancel/blur/reset, Pause/chạy một batch, DPR và resize. Không có vòng lặp animation tự chạy; reduced-motion không bị dùng để tự bật chuyển động.

Camera trực giao và raster Z-buffer Canvas 2D được tách thành presentation dùng chung ở `lib/labs/shared/`. Project 41 giữ API qua wrapper; không chuyển field/meshing của Project 44 vào module Project 41. Thuật toán extraction của hai project vẫn tách riêng.

## Giới hạn được công bố trên UI

Canvas mặc định 24³ samples = 13.824 mẫu, 23³ cells = 12.167 ô. Cho chọn 12³/24³/32³, chunk 4³ cells. Đây là CPU/Canvas 2D, không dùng WebGL/WASM và không dựng số đo GPU giả. Dữ liệu lưu binary32 nhưng JavaScript tính arithmetic binary64; không tuyên bố byte-exact với C++/GPU.

Bản C++ chính vẫn phải đạt GPU 128³ samples/127³ cells, chunk 16³, native interaction, file I/O và export mesh thật. Canvas không thay bất kỳ gate nào của các phần đó.

## Kiểm chứng ở mốc này

### Toán và hồi quy

`tests/lab-math-volume-sculptor.test.mjs` có 18 tests. Đã đăng ký vào `test:labs`. Chạy cùng 12 tests của `lab-math-geometry-workshop.test.mjs`: **30/30 qua**.

Phạm vi kiểm: bounds/index/Float32, affine plane/trilinear/gradient boundary, 16 tetra masks/tie/degenerate/canonical edge, 48 shared-face masks ở ba trục, sphere kín và outward normals ở N=12/24/32, refinement error giảm, count/prefix/emit/capacity, immutable job snapshot và cancel sau emit, brush/boundary/no-op, spacing của stroke thẳng không phụ thuộc cách chia event, dirty/full mesh bằng nhau và reuse đúng object, tail chunk không trùng/bỏ cell, owner/pause/reset/undo/redo/history limit, stale/cancel/failure, resampling và RAM snapshot.

Sản phẩm khoét/ghép ở N=24 có kiểm topology độc lập từ edges của mesh: sphere Euler 2 → lỗ thông Euler 0; hai components/Euler 4 → một component/Euler 2. Mỗi edge có đúng hai mặt với hướng đối nhau; undo/redo trả về trạng thái cũ. Probe độc lập dọc lỗ/cầu nối kiểm dấu field, không chỉ so ảnh.

Test tìm được rồi đã sửa ba lỗi trong bản port Canvas đầu: mất stamp cuối do sai số tích lũy của nhiều event nhỏ; một batch chỉ chứa stamp no-op báo sai là không tiến; reset/preset chưa publish xong nhưng dirty job sau đó reuse chunk của hình cũ. Cờ force-full giờ tồn tại đến khi generation mới công bố hoàn chỉnh.

### TypeScript, kiến trúc và tài nguyên

Focused TypeScript của component, controls/render và các module toán qua. Lượt đầu với heap 128 MiB bị giới hạn heap sau khoảng năm giây; lượt có type roots React tường minh và heap 192 MiB qua, vẫn có deadline 35 giây. Đây không phải lỗi compiler C++ hoặc test chạy hàng giờ.

Architecture budgets qua, không tăng giới hạn file. Mọi job kiểm dùng process supervisor/parent guardian, hard timeout riêng và tổng thời gian hữu hạn; không build lại SDL hoặc chạy native benchmark ở mốc Canvas này. `git diff --check` và kiểm Git không theo dõi generated/compiled artifacts qua.

### Chrome trên server local đang có

Đã tự kiểm `localhost:3000` trả HTTP 200; không khởi động hoặc restart dev server. Fixture local import component client thật qua Vite, dùng React StrictMode, CSS thật và Chrome headless. Nó không thêm route vào ứng dụng hoặc sửa catalog.

Kiểm được cả 12 mode, keyboard camera/probe/stamp, generation không đổi khi chỉ xoay/zoom, undo/redo, Pause/batch/cancel/retry, capacity refusal giữ last-good, mouse stroke đi ra ngoài Canvas rồi thả, DPR 1,5, resize mobile, reduced-motion, RAM snapshot và hai nút chạy nét cọ mẫu. Browser xác nhận capture thật qua `hasPointerCapture`; mất capture giữa nét đã sửa field làm rollback và không thêm history. Không có `pageerror`, kể cả ResizeObserver loop. Ảnh tetra/khoét/nối được xem lại trực tiếp; góc nhìn nét khoét hướng dọc lỗ để thấy khoảng thông, nét nối giữ hai khối và phần cầu ở giữa.

Helpers và ảnh QA ở `.validation/p44-*`, không đưa vào Git. Đây là kiểm browser tự động của **component riêng**, không phải kiểm desktop native bằng chuột/phím, không chứng minh route/navigation/search/download/progress hay build production. Browser regression theo lesson routes sẽ được thêm khi đăng ký học phần.

## Còn phải làm để hoàn thành Project 44

1. Ghép Canvas đúng vị trí/câu hỏi trong 12 MDX; bỏ câu mở đầu draft sau khi đăng ký, kiểm lại code excerpts và dung lượng từng bài sát budget.
2. Thay catalog/manifest/learning/lab và source/content cũ theo kế hoạch dự phòng, cùng content revision/migration. Giữ compatibility chỉ cho các phần legacy còn được dùng; không đổi tên Neighbor List thành sản phẩm điêu khắc.
3. Bổ sung glossary/references, search, roadmap/redirect, downloads và source payload; kiểm source/CMake/shader theo từng checkpoint. Không sửa output sinh bằng tay.
4. Hoàn tất native UI matrix và ma trận starter/checkpoint/final sau mọi thay đổi cuối; giải nén ZIP mới rồi build/CTest độc lập.
5. Kiểm website production và browser theo route thật, bao gồm theme, copy, source, tiến độ/reload và liên kết ZIP. Audit từng yêu cầu trong spec trước khi bỏ nhãn chờ nghiệm thu.

Goal vẫn là toàn bộ học phần và ứng dụng C++/GPU đúng đặc tả; không thu gọn thành một Canvas hoặc coi kết quả component này là phát hành hoàn chỉnh.
