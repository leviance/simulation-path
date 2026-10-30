# Lộ trình 78 Simulation Project C++ + SDL3 — Product Specification cho AI Agent

> **Mục đích của tài liệu này:** định nghĩa **sản phẩm cuối cùng** của từng project đủ rõ để một AI Agent có thể tự xây giáo trình mà không thu nhỏ, đổi bản chất hoặc biến simulation thành toy demo.  
> Tài liệu **không cố định bài học, chương, milestone học tập hay thứ tự lý thuyết**. AI Agent được tự quyết cách dạy; specification chỉ cố định **đích đến, phạm vi tối thiểu, quy mô, tương tác, ràng buộc kỹ thuật và chất lượng trực quan**.

> **Phạm vi:** 78 project, gồm lộ trình chính **Project 01–72** và sáu project cầu nối tùy chọn **Project 73–78**. Widget Tree, Box Layout, TinyHTML, TinyCSS, TinyFlex, C++ binding và scripting là các project riêng, giữ nguyên số thứ tự từ 66 đến 72.

> **Cách dùng:** số project là định danh sản phẩm, không phải điều kiện buộc phải học tuần tự từ 01 đến 78. Xem Mục 3 để chọn tuyến học, nhận biết phần kế thừa và chuẩn bị kiến thức cầu nối. Mỗi project vẫn có chương trình C++/SDL3 chạy độc lập và phải đạt hợp đồng sản phẩm riêng.

---

# 0. HỢP ĐỒNG DÀNH CHO AI AGENT

## 0.1. Agent được tự quyết định cách dạy

AI Agent **được quyền tự quyết định**:

- cần dạy kiến thức nào trước;
- chia project thành bao nhiêu chương/bài;
- có cần bài tập cầu nối hay mini experiment hay không;
- thứ tự giải thích toán học, vật lý, graphics, algorithms;
- cách tổ chức code và milestone nội bộ;
- dùng cách diễn giải, hình minh họa, kiểm thử và bài tập nào;
- bổ sung kiến thức hoặc kỹ thuật nếu giúp đạt sản phẩm tốt hơn.

Tài liệu này **không phải syllabus cố định**. Không được hiểu danh sách specification là danh sách bài học.

## 0.2. Những thứ Agent không được tự thay đổi

AI Agent **không được**:

- giảm quy mô project vì cho rằng “dễ học hơn”;
- đổi một thế giới 3D thành minimap/2D/isometric;
- đổi simulation động thành animation hard-code;
- đổi hàng trăm nghìn/hàng triệu phần tử thành vài chục phần tử ở sản phẩm cuối;
- bỏ camera/input/interaction bắt buộc;
- thay algorithm/solver phải tự viết bằng engine/library high-level nếu specification cấm;
- bỏ các output trực quan chính và chỉ giữ console, bảng số hoặc benchmark;
- gọi một prototype nhỏ là “hoàn thành” khi mới đạt một milestone trung gian.

Agent có thể **xây từ phiên bản nhỏ trong quá trình học**, nhưng **bản cuối của project phải đạt toàn bộ specification**.

## 0.3. “Mini project” không có nghĩa là “demo nhỏ”

Từ “mini project” chỉ nói về vai trò của project trong curriculum. Nó **không cho phép giảm tham vọng của sản phẩm cuối**.

Ví dụ:

- Project voxel cuối nhánh phải là một **world 3D có thể đi lại**, không phải 30 cube trong cửa sổ.
- Project 5 triệu particle phải có **hàng triệu particle thật ở preset lớn**, không phải 5.000 particle rồi ghi chú “có thể scale”.
- Project fluid 3D phải cho thấy **một khối/dòng chất lỏng 3D động**, không phải đồ thị hoặc 2D trick.
- Project molecular dynamics phải có **force/neighbor/integration thật**, không phải particle effect đẹp mắt.
- Project X-ray phải cho thấy **volume/ray/detector output**, không phải chỉ ảnh grayscale giả.

## 0.4. Hợp đồng về chất lượng trực quan

Các project trong roadmap này là simulation/graphics projects. Vì vậy, từ các project trung cấp trở lên, đầu ra phải **đáng xem**, không chỉ “đúng về thuật toán”.

Nguyên tắc:

1. **Main viewport là sản phẩm chính.**  
   Với ứng dụng mô phỏng, graph/debug/UI bổ trợ cho hiện tượng trong viewport. Với bài thí nghiệm toán, số học hoặc compute, biểu đồ, dữ liệu trung gian và dashboard kiểm chứng có thể là đầu ra chính; không phải dựng thêm một scene không liên quan chỉ để có hình ảnh đẹp.

2. **Hiện tượng phải nhìn thấy được.**  
   Dùng color mapping, trails, vectors, lighting, depth, opacity, field glyphs, heatmap, particles, slice, detector image… phù hợp với project.

3. **Có Showcase Mode và Debug Mode khi hợp lý.**  
   - Showcase Mode: sạch, trực quan, phù hợp quay GIF/video portfolio.
   - Debug Mode: normals, grids, cells, pressure, neighbors, profiler, bounding boxes…

4. **Độ đẹp phải tăng theo độ khó.**  
   Project nền tảng có thể đơn giản nhưng rõ ràng.  
   Project GPU/3D/scientific advanced phải có viewport lớn, camera/tương tác, bố cục sạch và visualization giàu thông tin.

5. **Không yêu cầu photorealistic hoặc asset art.**  
   “Ấn tượng” ở đây đến từ simulation, scale, chuyển động, lighting/color/depth và cách trình bày dữ liệu — không bắt buộc model/texture thương mại.

6. **Không dùng visual polish để che solver giả.**  
   Simulation đúng vẫn là điều kiện bắt buộc.

## 0.5. Khi specification ghi “3D world”

Phải có:

- tọa độ X/Y/Z thật;
- perspective/depth;
- camera/player nằm trong hoặc di chuyển xuyên qua world;
- world rộng hơn một object đơn lẻ;
- nếu project có streaming/procedural generation, nội dung mới phải xuất hiện khi player di chuyển.

Một model viewer có orbit camera quanh vài cube **không phải 3D world**.

## 0.6. Khi specification ghi “simulation”

State phải tiến triển bởi:

- phương trình;
- solver;
- luật cập nhật;
- interaction model;
- stochastic process;

đúng với project.

Keyframe animation, random motion không liên quan hoặc shader effect chỉ “trông giống” hiện tượng **không được tính**.

## 0.7. Công nghệ mặc định

- C++20 là chuẩn bắt buộc của source tải về; C++23 chỉ dùng trong phần mở rộng được ghi rõ, không làm tăng yêu cầu của bản chuẩn.
- SDL3 cho window, input, event, timing và presentation.
- Khóa SDL 3.4.8, CMake tối thiểu 3.24; tải SDL bằng FetchContent với URL và SHA-256, link qua `SDL3::SDL3`. Không tự nâng dependency khi viết thêm project.
- Không dùng game engine/physics engine trong critical path.
- Trước phần OpenGL: không dùng OpenGL/GLM để né phần renderer/toán phải tự học.
- Từ phần OpenGL trở đi: OpenGL + GLSL được phép.
- UI core: không dùng ImGui/WebView/Chromium thay TinyUI/TinyHTML/TinyCSS.
- AI Agent được chọn thư viện hỗ trợ không làm thay phần cốt lõi phải tự viết.

## 0.8. Vai trò học tập và sự nối tiếp của sản phẩm

- **Bài thí nghiệm:** trả lời một câu hỏi cụ thể bằng thao tác, dự đoán và phép kiểm chứng. Một điểm chiếu, hai vector hoặc một mảng số là đầu vào hợp lệ nếu đúng mục tiêu; không cần tạo game hay simulation giả để làm lớn sản phẩm.
- **Mốc phát triển ứng dụng:** thêm một khả năng cần thiết vào ứng dụng đã có. Phải nói rõ phần giữ lại, phần thay đổi và hành vi mới mà người dùng nhận được.
- **Project tổng hợp:** tích hợp các khả năng thành ứng dụng có quy trình sử dụng hoàn chỉnh, không chỉ tập hợp nhiều màn hình demo.
- Những vai trò này không thay đổi số thứ tự, trạng thái chính/tùy chọn hoặc Acceptance Criteria. Không gọi một prototype nhỏ là bài thí nghiệm để né quy mô bắt buộc.
- Không cố định số bài hoặc số checkpoint. Độ dài phụ thuộc kiến thức mới và sản phẩm; không tạo thêm bài chỉ để đủ một khuôn.
- Khi nhiều project phát triển cùng sản phẩm, source tải về của mỗi project vẫn tự chứa phần nền cần thiết. Không bắt người học ghép thủ công nhiều ZIP mới chạy được.

## 0.9. Kiểm chứng và đo hiệu năng

Mỗi project phải chỉ rõ ba nhóm bằng chứng: **hành vi sử dụng**, **kết quả thuật toán/mô hình** và **quy mô/chi phí** nếu có yêu cầu về hiệu năng.

- Test phải có fixture hoặc oracle độc lập thích hợp. Gọi cùng một hàm hai lần rồi so kết quả không đủ chứng minh thuật toán đúng.
- Khi so số thực, công bố đại lượng, đơn vị, chuẩn sai số, ngưỡng tuyệt đối/tương đối và cách xử lý NaN/Inf. Không dùng một epsilon chung cho mọi đại lượng.
- Với simulation, tách sai số mô hình, sai số không gian, sai số tích phân theo thời gian và sai số số thực. Không dùng hình ảnh đẹp thay kiểm chứng, cũng không mặc định sai khác quỹ đạo dài hạn là bug.
- Với thống kê, dùng nhiều seed/lần chạy và ghi uncertainty. Không yêu cầu sai số phải giảm đơn điệu ở từng lần lấy mẫu.
- Benchmark dùng cùng dữ liệu đầu vào, seed, số bước và kernel tương đương; ghi máy, build configuration, N, warm-up, số lần lặp, median và độ phân tán. Benchmark chính dùng Release; phép kiểm tra correctness vẫn chạy Debug và Release.
- Tách build/rebuild, query/force/update, rendering và thời gian toàn bước. Đối với GPU, tách thời gian kernel đã đồng bộ đúng với thời gian gồm upload/readback; không so thời gian enqueue CPU với thời gian thực thi CPU rồi kết luận GPU nhanh hơn.
- Công bố số phần tử cấp phát, đang sống, thực sự cập nhật và thực sự vẽ. Nếu chỉ vẽ một tập con để đọc hình rõ hơn, phải ghi rõ; dữ liệu mô phỏng bắt buộc vẫn được cập nhật đầy đủ.
- Mỗi mốc quy mô phải ghi rõ là **tối thiểu bắt buộc** hay **mở rộng theo phần cứng**. Preset nhỏ dùng để học/debug không thay preset nghiệm thu; máy thiếu khả năng phải báo chưa kiểm chứng được mốc lớn, không tự hạ spec.
- Không hứa FPS hoặc speedup chung cho mọi máy. Giữ cả các ca mà grid/tree/GPU/SoA không có lợi và giải thích chi phí gây ra kết quả đó.

## 0.10. Phần cứng, giới hạn tài nguyên và an toàn khi chạy

- Trước nhánh GPU phải có bước kiểm tra phiên bản context, extension cần dùng, giới hạn buffer/workgroup và ngân sách bộ nhớ. Nhánh compute cần OpenGL 4.3 hoặc các extension tương đương được kiểm tra cụ thể; hỗ trợ graphics không mặc nhiên đồng nghĩa hỗ trợ compute.
- Ghi rõ cấu hình đã kiểm thử theo từng nhánh. Hướng dẫn SDL đa nền tảng không phải lời cam kết mọi máy đều chạy được mọi nhánh GPU.
- Kiểm tra kích thước và phép nhân trước cấp phát; có giới hạn N, timestep, số iteration và số batch. Khi không đủ RAM/VRAM, giữ ứng dụng phản hồi và báo lý do.
- Benchmark/validation dài phải chia batch hữu hạn, báo tiến độ và cho hủy giữa các batch; không khởi chạy một dispatch GPU không có giới hạn rồi trông chờ nút Cancel có thể ngắt nó.
- Tuân thủ supervisor, hard timeout và dọn process tree trong ARCHITECTURE.md. Không chạy lại toàn bộ build/test chỉ vì sửa tài liệu; không tự bật dev server khi người dùng chưa yêu cầu.
- Pause/Reset phải có nghĩa rõ: Pause dừng tiến thời gian mô phỏng; camera, kiểm tra dữ liệu và input UI vẫn sử dụng được. Reset tái tạo đúng preset/seed đã chọn.

---

# 1. CẤU TRÚC SPECIFICATION CỦA MỖI PROJECT

Mỗi Project chỉ cố định các mục sau:

- **Đề bài / mục tiêu sản phẩm**
- **Trải nghiệm cuối cùng phải nhìn thấy**
- **Phạm vi chức năng tối thiểu**
- **Quy mô/độ phức tạp tối thiểu**
- **Tương tác bắt buộc**
- **Mức đồ họa/trình bày tối thiểu**
- **Ràng buộc kỹ thuật / phần phải tự viết**
- **Không được coi là hoàn thành nếu…**
- **Acceptance Criteria**

**Không có mục “Bài học phải dạy” hay “Milestone bắt buộc”.**  
AI Agent tự thiết kế curriculum để đưa người học từ kiến thức hiện có tới Acceptance Criteria.

---

# 2. PROJECT INDEX

01. **Cửa sổ “Hello Pixels”: tự quản lý framebuffer đầu tiên** — Một cửa sổ có thể tô nền, gradient, checkerboard và noise; resize an toàn.
02. **Điều khiển nhân vật & Giới hạn tốc độ khung hình 60 FPS** — Ô vuông di chuyển mượt, có toggle capped/uncapped và hiển thị FPS.
03. **Ứng dụng Paint tí hon: vẽ bằng chuột trên framebuffer** — Mini paint có brush tròn, stroke liền khi rê nhanh và vài màu.
04. **Bộ công cụ vẽ 2D: đường thẳng, hình chữ nhật và đường tròn** — Có `drawLine`, `drawRect`, `fillRect`, `drawCircle`; không nhờ SDL vẽ.
05. **Bản đồ tọa độ kéo-thả: pan, zoom và đổi World ↔ Screen** — Mini GeoGebra: trục X/Y, grid động, pan/zoom quanh cursor, đặt và kéo điểm.
06. **Bảng Vector kéo-thả: cộng, trừ và đo hai mũi tên** — Vector playground có arrow, tọa độ, magnitude và phép cộng hình bình hành.
07. **Chiếc kim quay trên vòng tròn: biến góc thành chuyển động bằng sin/cos** — Unit-circle visualizer có point, projections X/Y và đồ thị sin/cos.
08. **Tháp pháo ngắm theo chuột: học dot product, góc và projection** — Turret tracking mượt, có vector debug và projection trực quan.
09. **Trình biến đổi hình vuông: xoay, scale, shear và ghép phép biến đổi** — Square/grid rotate-scale-shear-translate; toggle order cho kết quả khác.
10. **La bàn 3D: dựng ba trục và vector pháp tuyến của tam giác** — Scene 3D tối giản có X/Y/Z, A, B và normal vuông góc.
11. **Điểm sáng bay trong không gian: chiếu một điểm 3D xuống màn hình** — Một point có cảm giác xa gần rõ ràng; FOV/focal length thay đổi được.
12. **Tam giác 3D xoay bằng chuột: học rotation trước matrix** — Triangle wireframe xoay tự do; normal quay theo.
13. **Khối lập phương wireframe tương tác hoàn toàn bằng CPU** — Cube wireframe ổn định, perspective/orthographic toggle, có world axes.
14. **Đi bộ trong căn phòng wireframe bằng camera kiểu FPS** — FPS camera có forward/right/up và relative mouse mode.
15. **Máy soi pipeline 3D: xem một vertex đi qua Model → View → Projection** — Có bảng model/world/view/clip/NDC/screen cập nhật realtime.
16. **Tô kín tam giác bằng pixel: từ ba đỉnh đến một bề mặt** — Triangle đặc có thể kéo vertex; RGB biểu diễn α/β/γ.
17. **Khối lập phương đặc với 6 mặt màu và Z-buffer** — Solid cube có depth đúng và back-face culling toggle.
18. **Cho tam giác đi xuyên camera mà không “nổ” hình: Near-plane Clipper** — Object đi sát/xuyên camera không tạo spike vô hạn.
19. **Chiếu đèn lên mô hình: mặt quay về đèn sáng hơn** — Cube/OBJ có mặt sáng tối theo normal; light orbit được.
20. **Dán bàn cờ lên mặt phẳng nghiêng: sửa texture méo do perspective** — Toggle A/B cho thấy texture affine méo và bản corrected đúng hơn.
21. **Trình xem mô hình OBJ: xoay một mesh thật bằng renderer tự viết** — Có thể mở cube/icosphere/Suzanne nhỏ, bật wireframe/solid/normals.
22. **Pháo bắn đạn: kéo chuột chọn góc và vận tốc, so quỹ đạo với công thức** — Nhắm mục tiêu 2D, xem độ lệch lần bắn và đối chiếu quỹ đạo numerical/analytic.
23. **Cuộc đua Integrator: Euler, Verlet và RK4 chạy cạnh nhau** — Một dashboard có 3–4 simulation chạy song song và plot sai số.
24. **Bể bóng va chạm: hàng trăm quả bóng nảy vào tường và nhau** — Bóng mass/restitution khác nhau va chạm hợp lý, có normal/contact/impulse debug.
25. **Chuỗi lò xo treo: kéo một khối và xem dao động truyền qua cả dây** — Chain 20–100 mass có damping toggle và graph tổng năng lượng.
26. **Hai con lắc gần giống nhau nhưng cuối cùng khác hẳn: trực quan hóa chaos** — Nhìn trực tiếp sensitivity to initial conditions mà không nhầm với numerical instability.
27. **Đàn Boids 2D: hành vi tập thể từ những quy tắc cục bộ** — Đàn tự di chuyển theo separation, alignment và cohesion; tìm hàng xóm brute force làm bản chuẩn.
28. **Đàn Boids lớn với Spatial Grid** — Nâng cùng mô phỏng lên ít nhất 10.000 cá thể; đối chiếu hàng xóm, steering và chi phí toàn bước với brute force.
29. **Biên tập bản đồ 2D lớn bằng Quadtree** — Pan/zoom, chọn, di chuyển và xóa đối tượng trên bản đồ ít nhất 100.000 đối tượng có kích thước.
30. **Khảo sát point cloud 3D bằng Octree** — Khám phá dữ liệu phòng/xưởng ít nhất 100.000 điểm, truy vấn vùng, thống kê và xuất tập điểm đã chọn.
31. **Thiên hà hạt: N-body từ O(N²) đến Barnes–Hut** — Hệ ít nhất 4.096 vật thể có theta, runtime và force-error plot, tách sai số xấp xỉ khỏi integration error.
32. **Đài phun hạt CPU: một triệu particle với AoS và SoA** — Hạt có emission, chuyển động, lifetime và tái sử dụng; so hai layout trên cùng workload.
33. **Vẽ lại tam giác cũ bằng GPU và đối chiếu từng bước với renderer CPU** — CPU triangle và GPU triangle chạy cạnh nhau hoặc toggle.
34. **Một model viewer, hai renderer CPU và GPU** — Chuyển model viewer tự viết sang OpenGL, dùng chung mesh/camera và so chi phí hai backend.
35. **Phòng thí nghiệm shader: sửa GLSL và thấy kết quả ngay** — Compile/reload nhanh; lỗi shader hiện rõ; có gradient/circle/Mandelbrot/noise toy.
36. **Căn phòng hình khối không mesh: ray-march sphere, box và torus** — Scene 3D procedural với camera, normal, lighting và step-count heatmap.
37. **Máy tính vector 1 triệu phần tử trên GPU** — Dashboard kiểm chứng vòng đời compute; tách kernel time và chi phí upload/readback.
38. **Buồng hạt tích điện 3D: quỹ đạo trong điện trường và từ trường** — GPU giữ/cập nhật state và render trực tiếp ít nhất một triệu hạt; quan sát quỹ đạo, đối chiếu nghiệm tham chiếu và thử mốc năm triệu theo phần cứng.
39. **Khám phá thành phố 3D với một triệu vật thể** — GPU lọc object theo camera, compact visible IDs và dựng lệnh vẽ; reduction/scan phục vụ cảnh có thể khám phá, không chỉ xuất bảng số.
40. **Xưởng vải 3D: kéo, ghim và thả vải phủ lên vật thể** — GPU giải constraints và tiếp xúc cho ít nhất 100.000 đỉnh động; quan sát nếp gấp, strain và va chạm, có mốc một triệu đỉnh mở rộng theo phần cứng.
41. **Hai “nguyên tử” hút và đẩy nhau: trực quan hóa Lennard–Jones** — Graph V(r), force arrow và equilibrium region cập nhật realtime.
42. **Hộp khí 1.000 hạt: Molecular Dynamics CPU đầu tiên** — Box có particles, energy graphs và timestep controls.
43. **Hộp phân tử tuần hoàn: hạt đi ra một phía và quay lại phía đối diện** — Particles wrap liền mạch; pair distance qua biên đúng.
44. **Danh sách hàng xóm có vùng đệm: không tìm lại mọi cặp ở mỗi bước** — MD CPU tối thiểu 10.000 hạt; mở rộng 100.000 theo máy, đo build-list và force.
45. **Molecular Lab GPU: tăng từ 100.000 tới mục tiêu 5 triệu hạt** — MD GPU tối thiểu 100.000 hạt, có profiler và các mốc nâng cao theo phần cứng.
46. **Hộp cát số: cát rơi, nước giả và cellular automata** — Paint sand/wall/water toy và xem material rơi/chảy.
47. **Tấm kim loại nóng: nhiệt lan từ nơi bạn click ra toàn mặt phẳng** — Heat map có mouse injection và slider dt/D; có thể cố tình làm solver mất ổn định.
48. **Bản đồ gió: nhìn thấy gradient, divergence và curl** — Tracer đi theo vector field, kèm arrows và các bản đồ toán tử để giải thích chuyển động.
49. **Khói bị chuột khuấy: Stable Fluids 2D từng bước** — Khói chảy theo field; debug pressure/divergence.
50. **Bể nước bằng hạt: SPH 2D có thể đổ và va vào thành** — Bể SPH 2D tối thiểu 5.000 hạt, có kiểm density/pressure; các mốc lớn hơn là mở rộng.
51. **Khối nước 3D trên GPU: SPH hàng trăm nghìn tới hàng triệu hạt** — 3D fluid có camera, profiler và scale ladder.
52. **Bắn tia vào hình học: chọn điểm chạm plane, sphere, box và triangle** — Geometry lab cho 4 intersection cơ bản.
53. **Máy cắt lát khối 3D: xem từng lớp mật độ như ảnh CT giả** — Synthetic sphere/Gaussian/layers, slider slice và voxel inspector.
54. **Nhìn xuyên khối sương 3D: Volume Ray Marching bằng fragment shader** — Volume viewer có MIP, average và alpha compositing modes.
55. **Máy X-ray ảo: tia xuyên các lớp vật liệu và tạo ảnh detector** — Synthetic phantom air/soft/dense tạo ảnh grayscale detector.
56. **Máy CT đồ chơi: quay nguồn quanh vật thể và dựng sinogram** — Phantom→projections→sinogram→reconstruction toy.
57. **Mưa photon ngẫu nhiên: Monte Carlo hấp thụ, tán xạ và thoát** — Heatmap/histogram absorb/scatter/escape có uncertainty.
58. **Khối đất 16×16×16: dựng voxel chunk đầu tiên** — Một chunk voxel có camera và block types/colors.
59. **Ẩn các mặt nằm trong đất: giảm mạnh số tam giác voxel** — Toggle naive/visible-face cho thấy triangle count giảm.
60. **Chọn, phá và đặt block bằng tia từ camera** — Highlight, left-remove, right-add kiểu Minecraft.
61. **Gộp tường voxel thành mảng lớn: Greedy Meshing** — Triangle count giảm mạnh ở vùng phẳng.
62. **Thế giới “vô tận”: tải và gỡ chunk khi người chơi di chuyển** — Đi liên tục, chunks xuất hiện trước và giải phóng sau.
63. **Đồi núi tự sinh: tạo terrain procedural không seam giữa chunks** — Terrain có đồi/thung lũng, deterministic, liền biên.
64. **Minecraft-like sandbox tối giản của riêng bạn** — Một voxel sandbox chơi được 10–20 phút với debug stats.
65. **Bảng điều khiển cho Simulation: Pause, Reset, Checkbox và Slider tự vẽ bằng C++** — Một panel tương tác có Label, Button, Checkbox và Slider; ví dụ slider thay gravity/temperature, Pause dừng simulation và Reset khởi tạo lại trạng thái.
66. **Cây giao diện sống qua nhiều frame: Panel chứa Button, Slider và Label** — Một cây UI được giữ qua nhiều frame; Panel sở hữu các control, phép vẽ và hit-test dùng chung hình học, thêm/xóa nhánh không làm hỏng input.
67. **Bố cục hộp tự động: xếp control từ trên xuống mà không ghi tọa độ tay** — Một engine box layout một cột tự tính kích thước và vị trí control từ margin, border, padding, gap; hỗ trợ Panel lồng nhau và resize.
68. **Đọc `panel.html` và biến nó thành cây UI** — Load và reload file panel.html thật; tokenizer/parser tạo cây UI nhiều cấp rồi dùng engine của Project 66–67 để vẽ và tương tác.
69. **Đọc `style.css`: đổi màu, kích thước và khoảng cách không cần biên dịch C++** — Tự parse style.css, match tag/class/id và tính computed style; đổi màu, kích thước và khoảng cách của UI mà không biên dịch C++.
70. **Thanh công cụ tự co giãn: TinyFlex cho row/column, gap và căn chỉnh** — Mở rộng layout thành TinyFlex row/column có gap, phân phối không gian và căn chỉnh; thanh công cụ tự thích nghi khi resize.
71. **Nút HTML gọi hàm C++: DOM-like events và binding vào simulation** — Nối event của element HTML với callback C++; giao diện TinyHTML/CSS điều khiển một mô phỏng thật trong cùng cửa sổ SDL3.
72. **Ngôn ngữ script tí hon: `let`, `if`, `function` để điều khiển UI** — Tự xây ngôn ngữ script có let, if và function; script nối event UI với các host function C++ để điều khiển mô phỏng.
73. **Camera xoay mượt không gimbal-lock: Quaternion Playground** — Quaternion Playground cho camera 3D: quay qua tư thế dễ gây gimbal lock ở Euler, nội suy mượt và kiểm chứng phép quay.
74. **Chọn tam giác trong model 100k faces: BVH Ray Picker** — Chọn tam giác gần nhất trên mesh ít nhất 100.000 faces bằng BVH; đối chiếu brute force và quan sát các node được duyệt/cắt.
75. **Một triệu particle trên nhiều CPU core: Thread Pool Playground** — Cập nhật ít nhất một triệu particle bằng thread pool CPU tự viết; so sánh một luồng/nhiều luồng với cùng workload và kết quả.
76. **Nghe thấy Fourier: tự viết DFT và tách tín hiệu thành tần số** — Tạo và nghe tín hiệu nhiều tone, tự tính DFT rồi xem phổ biên độ/pha; liên hệ trực tiếp waveform, tần số và âm thanh.
77. **Ném điểm ngẫu nhiên để ước lượng π: Monte Carlo Statistics Lab** — Ước lượng π bằng điểm ngẫu nhiên, quan sát sai số và khoảng tin cậy qua nhiều lần chạy; không chỉ xem một con số tiến gần π.
78. **Máy soi số thực: khi 0.1 + 0.2 không đúng tuyệt đối** — Quan sát float/double ở dạng số và bit; thử làm tròn, mất phần nhỏ, sai số cộng dồn và lựa chọn phép so sánh phù hợp.

---

# 3. BẢN ĐỒ HỌC VÀ CHUẨN GIẢNG DẠY

## 3.1. Chọn tuyến theo sản phẩm muốn xây

Project 01–72 vẫn thuộc lộ trình chính; Project 73–78 vẫn tùy chọn. Các tuyến dưới đây giúp chọn thứ tự học, không đổi số project và không yêu cầu hoàn thành mọi nhánh nằm trước nó trong tài liệu.

| Tuyến | Kiến thức đầu vào và hướng đi |
| --- | --- |
| Nền tảng 2D — 01–05 | C++ cơ bản → SDL, input, timing, framebuffer, primitive và tọa độ. 03–05 có thể dùng chung không gian làm việc 2D. |
| Toán tương tác — 06–10 | Dùng tọa độ và cách vẽ ở 01–05; liên hệ vector với steering, sin/cos với chuyển động, transform với chỉnh sửa hình và normal với ánh sáng. |
| Renderer CPU — 11–21 | Dùng nền 2D, vector, lượng giác và transform. Đích chung là OBJ viewer 21; không yêu cầu dựng lại application shell trong mỗi project. |
| Vật lý — 22–26 | Cần input, vector và timing; không buộc học toàn bộ renderer. Nếu chọn cảnh 3D, chuẩn bị camera/presentation cần thiết. Mỗi hệ có mô hình và phép kiểm chứng riêng. |
| Không gian và hiệu năng — 27–32 | 27–28 dùng vector, timestep và tọa độ 2D; 29 dùng camera 2D/AABB; 30 cần camera 3D, AABB và frustum; 31 thêm integration và tổng hợp lực bằng cây. 32 không bắt buộc học N-body ở 31. |
| Graphics GPU — 33–36 | 33 đối chiếu triangle CPU/GPU; 34 chuyển viewer 21 sang hai backend; 35 xây công cụ shader; 36 thêm SDF và ray marching. Không bắt buộc học xong 22–32. |
| GPU compute — 37–40 | Cần OpenGL/GLSL và kiểm tra phần cứng. 37 dạy vòng đời compute; 38 dựng buồng hạt tích điện; 39 dùng reduction/scan, compaction và indirect draw để khám phá thành phố 3D; 40 dùng solver/grid/contact để dựng xưởng vải 3D. 38 cần vector/cross, camera và timestep; lực/Boris được giải thích tại chỗ. 39 có thể đi thẳng từ 37 và nền graphics 34 bằng scaffold nhiều pass. 40 cần kiến thức constraint và grid được chuẩn bị tại chỗ hoặc từ 25/28; không bắt học luật Boids hay điện từ trước. |
| Molecular Dynamics — 41–45 | Cần vector, lực và integration; bổ sung đạo hàm của potential ngay lúc dùng. 41–44 là các mốc của Molecular Lab CPU; 45 cần compute, scan và grid GPU. |
| Trường và chất lưu — 46–51 | 46 là cellular automata độc lập. 47–49 đi theo dữ liệu trên lưới; 50–51 đi theo hạt. SPH cần integration và tìm hàng xóm; không bắt học MD. Trước 51 phải mở rộng grid, kernel và đơn vị sang 3D. |
| Ray và tạo ảnh — 52–57 | 52 cần vector/camera; 53 cần mảng 3D và nội suy; 54 thêm graphics GPU. 55–56 nối tích phân theo tia với detector/reconstruction; 57 thêm xác suất. Không bắt học chất lưu trước. |
| Voxel — 58–64 | Cần mesh, graphics GPU và camera; học phần ray cần thiết trước 60. Không yêu cầu MD, SPH hoặc CT. Dùng một voxel application xuyên suốt bảy mốc. |
| UI/runtime — 65–72 | Cần input, cách vẽ và một simulation chạy được, có thể chọn 02 hoặc 22. Phát triển cùng control panel qua tree, layout, markup, style, binding và script. |
| Cầu nối — 73–78 | Học xen kẽ theo Mục 3.3. Không biến project tùy chọn thành prerequisite bắt buộc mà không cung cấp đường học thay thế. |

## 3.2. Sự nối tiếp và vai trò trong từng phần

Các yêu cầu dưới đây xác định bối cảnh sử dụng và phần được kế thừa. Agent vẫn tự chọn số bài, checkpoint và thứ tự giải thích bên trong mỗi project.

- **01–05:** 01 tạo nền pixel; 02 là thí nghiệm input/timing có sản phẩm ô vuông điều khiển được; 03 tạo Paint; 04 đưa primitive vào công cụ vẽ; 05 phát triển không gian 2D có pan/zoom và chỉnh sửa điểm. Không giới thiệu phép trừ trạng thái phím trước khi người học đã thấy cách vẽ và điều khiển ô vuông.
- **06–10:** giữ visualizer toán có câu hỏi cụ thể. 06 nối vector với vận tốc/steering; 07 nối vòng tròn với đồ thị và thời gian; 08 dùng góc để điều khiển turret có tốc độ quay hữu hạn; 09 là công cụ biến đổi hình. 10 phải công bố bộ chiếu tối thiểu được cung cấp và vị trí gọi nó; 11 mới giải thích/tự xây phần projection, không để prerequisite bị giấu.
- **11–21:** 11–12 là thí nghiệm projection/rotation; 13–14 xây object viewer và camera; 15 là công cụ chẩn đoán dùng tiếp ở 16–20; 16–18 hoàn thiện bề mặt, depth và clipping; 19–20 thêm ánh sáng/texture; 21 tích hợp thành model viewer. Mesh ở 19 được cung cấp dưới dạng dữ liệu đã đọc nếu parser chưa được dạy ở 21.
- **22–26:** 22 gắn quỹ đạo với việc nhắm mục tiêu; 23 so integrator trên cùng hệ và giải thích lực lò xo đơn trước chain ở 25; 24 dùng ca va chạm có kiểm chứng trước bể nhiều bóng; 25 phân biệt damping vật lý với sai số số học; 26 phân biệt chaos với integration error.
- **27–32:** 27–28 là cùng ứng dụng Boids trước/sau tối ưu; 29 là bản đồ có đối tượng mang diện tích; 30 là công cụ khảo sát dữ liệu 3D; 31 giải bài toán tương tác xa bằng xấp xỉ; 32 khảo sát chi phí bộ nhớ bằng đài phun hạt CPU. Không thay sản phẩm bằng việc rê chuột tô màu các điểm hoặc chỉ vẽ các hộp của cây.
- **33–36:** 33 là bài chuyển tiếp nền tảng, không bị ép thành showcase nâng cao. 34 kế thừa viewer 21; 35 là công cụ làm việc với shader có reload/báo lỗi; 36 tạo cảnh SDF. SDF tìm bề mặt ở 36 khác tích lũy mật độ thể tích ở 54.
- **37–40:** 37 là bài thí nghiệm phép tính độc lập và chi phí truyền dữ liệu. 38 giữ state qua nhiều bước để dựng buồng hạt tích điện 3D, không lặp đài phun CPU 32. 39 dùng reduction/scan/compaction để chọn object và dựng lệnh vẽ cho một thành phố 3D có thể khám phá. 40 nối constraint solver, grid 3D và tiếp xúc vào bề mặt vải có thể kéo/ghim/thả; chuỗi lò xo 25 chỉ là kiến thức cầu nối, không thay sản phẩm mesh. 38–40 có viewport 3D làm đầu ra chính, dashboard/debug hỗ trợ hiện tượng và kiểm chứng; không giới thiệu primitive hoặc số phần tử lớn như sản phẩm duy nhất.
- **41–45:** cùng một Molecular Lab. 41 giải thích mô hình hai hạt, 42 tích hợp nhiều hạt, 43 đổi hình học tương tác qua biên, 44 đổi cách tìm hàng xóm, 45 đổi nơi thực thi sang GPU. Giữ nhất quán đơn vị hoặc reduced units, potential, cutoff, timestep và cách đo năng lượng; nếu đổi mô hình phải có bước đối chiếu riêng.
- **46–51:** cát/nước cellular ở 46 không phải solver chất lưu. 47 đặt câu hỏi nguồn nhiệt/điều kiện biên; 48 dùng tracer để thấy tác dụng của trường; 49 là công cụ khói Eulerian; 50 mở cách biểu diễn Lagrangian bằng SPH; 51 mở rộng SPH sang 3D/GPU. Không gọi mô hình sau là bản chính xác hơn của mô hình trước chỉ vì trông đẹp hơn.
- **52–57:** 52 là công cụ hình học dùng lại cho picking; 53–56 dùng chung phantom và các phép quan sát khi hợp lý. Slice của volume, volume compositing, attenuation X-ray và reconstruction CT là bốn công việc khác nhau. 57 là nhánh lấy mẫu ngẫu nhiên, có uncertainty; không gọi kết quả là công cụ chẩn đoán hoặc mô phỏng lâm sàng đã được kiểm định.
- **58–64:** phát triển một voxel world: chunk → visible faces → edit → greedy mesh → streaming → terrain → sandbox. Cung cấp dataset nhiều chunk đủ rõ trước khi dạy procedural terrain; không giấu terrain generator chưa học trong streaming. 62 có thể dùng job queue có ngân sách mỗi frame; thread pool 75 là mở rộng, không phải prerequisite ngầm.
- **65–72:** cùng control panel cho simulation thật. 65 là điều khiển trực tiếp; 66 là ownership/input; 67 là measure/arrange; 68 là markup; 69 là cascade/style; 70 là flex layout; 71 là binding; 72 là runtime script. Giữ riêng 66/67 và 69/70. Mỗi mốc phải cho thấy một thay đổi sử dụng được, không chỉ một cây parse hoặc bảng thuộc tính.
- **73–78:** là công cụ bổ trợ có sản phẩm riêng. Không ép mọi bài cầu nối thành một game; kết quả quan trọng là dự đoán được hành vi, quan sát dữ liệu và kiểm chứng đúng khái niệm.

## 3.3. Kiến thức cầu nối đúng lúc

| Khi cần | Chuẩn bị |
| --- | --- |
| Camera/phép quay 12–14 và về sau | Giới thiệu orientation; có thể học 73 khi cần quaternion/SLERP, không buộc học toàn bộ quaternion để đi tiếp. |
| Picking 3D ở 30, 60 hoặc mesh viewer | Dạy phần ray/AABB/intersection cần dùng từ 52 trước thao tác đó, hoặc công bố rõ phương pháp chọn khác. Mesh lớn có thể học thêm BVH 74. |
| Integrator 23, 25, 26, 38, 42 | State, đạo hàm, phương trình vi phân và ý nghĩa một bước thời gian được giải thích trên hệ nhỏ trước khi gọi solver. |
| Điện trường/từ trường ở 38 | Giải thích lực Lorentz, dấu q, khối lượng dương, đơn vị và trường ngoài. Dạy Boris pusher cùng mốc cả bước/nửa bước; kiểm một hạt trước khi mở rộng số lượng. Không yêu cầu học Maxwell/Poisson hoặc mô phỏng plasma ở phần khác. |
| GPU visibility/indirect draw ở 39 | Chuẩn bị camera/frustum, bounding volume và mesh instancing từ nền graphics; giải thích mask, prefix, ID và draw command trên fixture nhỏ trước khi đưa vào scene triệu object. Phân biệt frustum culling với occlusion, không giấu occlusion/streaming trong scaffold. |
| Vải/constraint/contact ở 40 | Dạy inverse mass, rest shape, gradient của constraint, compliance và multiplier trên một/hai ràng buộc; giải thích coloring/gather và residual trước khi tăng mesh. Grid từ 28 phải được mở rộng indexing/stencil/predicate sang 3D, không mặc định chỉ đổi hằng số. |
| Potential/force 41–42 | Giải thích đạo hàm, hướng lực và đơn vị; kiểm lực bằng đạo hàm số độc lập ở điểm hợp lệ. |
| Heat/field/fluid 47–51 | Dạy stencil, gradient/divergence/curl và điều kiện biên tại nơi sử dụng; SPH có kernel/support radius và kiểm tra đơn vị riêng cho 2D/3D. |
| Reconstruction 56 | Giải thích forward model và backprojection trước. Nếu thêm filtered backprojection, cung cấp cầu nối lọc/Fourier; 76 là nhánh thực hành thêm, không bắt buộc hoàn thành project audio trước CT. |
| Photon 57 | Giải thích phân phối lấy mẫu, seed, ước lượng và uncertainty; có thể dùng 77 làm bài chuẩn bị nếu thiếu nền thống kê. |
| Hiệu năng CPU và background jobs | 75 phù hợp sau 32. Dùng ownership, job lifecycle và cancellation đã giải thích; không đưa đa luồng vào chỉ để có thêm kỹ thuật. |
| So sánh số thực ở 16, 23, 38, 39, 41 và các solver | Giới thiệu tolerance/cancellation/NaN tại chỗ; 78 là project đào sâu, không trì hoãn cảnh báo sai số tới cuối khóa. |

## 3.4. Hợp đồng của bài hướng dẫn, source và Canvas

- Đầu project có thử thách: nhu cầu, kết quả quan sát được, input, giới hạn và Definition of Done. Tách hành vi cần đạt khỏi gợi ý cách giải; thuật toán bắt buộc đặt trong ràng buộc riêng. Có thể đưa gợi ý theo mức để người học tự thử trước.
- Đầu mỗi bài nói rõ chương trình đang có gì, còn thiếu gì và thay đổi sắp làm giải quyết vấn đề nào. Không dùng câu mở đầu bằng một công thức/idiom chưa có bối cảnh.
- Đi từ code đang chạy được tới thay đổi nhỏ có thể quan sát; giải thích dữ liệu, biến trạng thái và vị trí gọi hàm. Không chỉ đưa helper rời mà bỏ phần kết nối vào ứng dụng.
- Có source đầy đủ ở mỗi checkpoint và final, README, assets và tests. Code trong bài phải lấy/đối chiếu từ source checkpoint bằng snippet markers và hợp đồng token; không có lời giải chỉ tồn tại trong bài viết.
- Code giảng dạy ưu tiên tuyến tính, tên biến rõ, kiểm lỗi tài nguyên từng bước, comment giải thích quyết định và khoảng cách hợp lý giữa các khối. Thụt dòng 4 spaces; không dùng toán tử/lambda/abstraction chỉ để rút ngắn code. Dòng dài có thể cuộn ngang; code block không wrap tùy tiện, dùng One Dark.
- Nội dung viết bằng tiếng Việt tự nhiên; API, identifier và thuật ngữ cần tra cứu giữ bằng tiếng Anh. Giải thích thuật ngữ trong bối cảnh, không xâu chuỗi danh từ tiếng Anh thay cho một câu rõ nghĩa.
- Bài có dự đoán trước khi chạy, một thí nghiệm lỗi có mục đích, checklist có thể thực hiện và bài tập chuyển kiến thức sang trường hợp mới. Không lặp cùng một mẫu câu cho đủ cấu trúc.
- Mỗi Canvas phải trả lời một câu hỏi học tập. Có preset, Pause/Reset, thao tác keyboard, pointer capture khi kéo, DPR, reduced-motion và giải thích văn bản; tham số/tên biến tương ứng với C++. Không dùng Canvas thay bản C++ đúng quy mô.
- Tách thời gian đọc, tự viết và kiểm chứng; nêu build/setup không tính vào thời lượng học thuần. Không dùng thời gian dự kiến để chấm người học nhanh/chậm.
- Phần nâng cao giữ profiler/debug khi cần nhưng có chế độ quan sát sạch; giới hạn tài nguyên và controls vẫn tìm được, không bị ẩn khỏi người dùng chỉ vì tắt overlay.

## 3.5. Các phần chung của website và tài liệu

- **Homepage:** giới thiệu sản phẩm đích, đối tượng học và vài tuyến khuyến nghị. Số project/bài/lab lấy từ catalog, không hard-code; công thức minh họa phải đúng, ví dụ `index = y * width + x`.
- **Roadmap:** mỗi phần có mục đích, sản phẩm đích, prerequisite bắt buộc và hướng đi tiếp. Phân biệt phần cung cấp sẵn với phần tự viết. Project chưa phát hành vẫn có mô tả sản phẩm theo spec và trạng thái rõ, không tạo liên kết tutorial giả.
- **Getting Started:** tách người tải ZIP để học C++ khỏi người clone website để đóng góp. Nói rõ configure/build/run/debug, target đang sửa và lỗi thường gặp. Dùng `checkpoints/01..NN/` cho cấu trúc tổng quát; ví dụ sáu checkpoint phải ghi là riêng Project 01.
- **README:** giải thích mục đích, đầu vào, đầu ra, cách chọn tuyến, cách học và phạm vi; thống kê phải khớp catalog. Không mô tả trạng thái phát hành như chứng nhận đã đạt spec.
- **Downloads:** mỗi project có gói độc lập, yêu cầu compiler/GPU, cách chạy, controls và kết quả mẫu; hiển thị rõ mốc quy mô đã kiểm chứng. Không cần Node.js để build ZIP C++.
- **Glossary:** định nghĩa theo bối cảnh, công thức/đơn vị khi phù hợp, ví dụ nhỏ và liên kết tới bài sử dụng. Trang thuật ngữ và tìm kiếm dùng cùng nguồn dữ liệu.
- **Website local:** người dùng tự bật bằng `npm run dev`; không có tài khoản/backend bắt buộc. Theme và tiến độ dùng localStorage; navigation không reset theme hoặc tải nội dung/source của mọi project. Có tìm kiếm, breadcrumb, mục lục, trước/sau, copy code, tải ZIP và giao diện mobile.
- **Đóng góp mã nguồn mở:** giữ nguồn authored, license/attribution của assets và chỉ dẫn contribution rõ. Output build, thư viện tải về, ZIP và snapshot sinh tự động không đưa vào Git; áp dụng giới hạn file/thư mục của ARCHITECTURE.md.

## 3.6. Nghiệm thu khác với trạng thái phát hành

- Đối chiếu từng yêu cầu với lesson, source C++, Canvas hỗ trợ và bằng chứng kiểm chứng. Chưa có bằng chứng thì ghi **chưa kiểm chứng**, không tự coi là đạt.
- Tách kết quả unit test, build checkpoint, smoke hữu hạn, kiểm thử desktop và benchmark phần cứng. Một loại bằng chứng không thay các loại còn lại.
- Khi implementation thấp hơn spec, ghi rõ phần thiếu và kế hoạch đáp ứng. Ví dụ bản 1.000 hạt không đạt Project 44 yêu cầu tối thiểu 10.000 hạt; không sửa tài liệu xuống 1.000 để hợp thức hóa.
- Đồng bộ tên, mô tả và dependency của spec, roadmap, metadata, thử thách, lesson và source trong đợt triển khai tương ứng. Cập nhật đặc tả không tự biến những bản đang phát hành thành sản phẩm đã đáp ứng yêu cầu mới.

---

# PHẦN I — SDL3, PIXEL VÀ TƯƠNG TÁC CƠ BẢN

## Project 01 — Cửa sổ “Hello Pixels”: tự quản lý framebuffer đầu tiên

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Tạo một cửa sổ SDL3 và tự quản lý mảng pixel trên CPU; không dùng API vẽ primitive có sẵn.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một cửa sổ có thể tô nền, gradient, checkerboard và noise; resize an toàn.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Một desktop window SDL3 thật.
- Framebuffer CPU có kích thước theo window.
- Ít nhất 4 scene pixel: solid, gradient, checkerboard, noise.

### Quy mô / độ phức tạp tối thiểu

- Framebuffer phải phủ toàn client area.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Resize cửa sổ; thoát bằng event.

### Mức đồ họa / trình bày tối thiểu

- Đầu ra phải là một ứng dụng desktop tương tác, không phải console-only.
- Nội dung chính phải chiếm phần lớn vùng hiển thị; các thông số/debug chỉ là lớp bổ trợ.
- Hình vẽ phải rõ, ổn định khi resize và đủ tương phản để quan sát hành vi của thuật toán.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Framebuffer
- Color packing
- Pixel bounds checking
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ in pixel values ra console.
- Dùng SDL_Renderer/OpenGL để vẽ thay framebuffer tự viết.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture màu/RGBA, row-major 4×3, ảnh 1×1 và tọa độ ngoài bốn cạnh có kết quả biết trước; kiểm signed bounds trước khi đổi index sang kiểu không dấu.
- Resize/minimize/restore có giới hạn cấp phát; kiểm pitch theo byte và pixel output, không chỉ thấy cửa sổ chưa crash.
- Không ghi ngoài buffer.
- Resize liên tục không crash.
- Giải thích được `index = y*width+x`.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 02 — Điều khiển nhân vật & Giới hạn tốc độ khung hình 60 FPS

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Di chuyển một ô vuông bằng WASD và làm tốc độ di chuyển độc lập FPS; thêm chế độ khóa 60 FPS.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Ô vuông di chuyển mượt, có toggle capped/uncapped và hiển thị FPS.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Một ô vuông/nhân vật nhìn thấy được trong window.
- Movement tính theo thời gian, không theo số frame.
- Có cả capped 60 FPS và uncapped mode.

### Quy mô / độ phức tạp tối thiểu

- Chạy ít nhất vài phút để so quãng đường ở các FPS.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- WASD; F1 hoặc phím tương đương đổi cap mode.

### Mức đồ họa / trình bày tối thiểu

- Đầu ra phải là một ứng dụng desktop tương tác, không phải console-only.
- Nội dung chính phải chiếm phần lớn vùng hiển thị; các thông số/debug chỉ là lớp bổ trợ.
- Hình vẽ phải rõ, ổn định khi resize và đủ tương phản để quan sát hành vi của thuật toán.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Movement update
- FPS limiter
- Rectangle fill
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Animation tự chạy không nhận keyboard.
- Hard-code mỗi frame dịch N pixel mà không dùng dt.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture cùng input chạy nhiều chuỗi dt trong cùng tổng thời gian; so quãng đường với speed × time theo tolerance, kể cả hai phím đối nghịch và mất focus.
- Hướng dẫn có code vẽ ô vuông, đọc keyboard, cập nhật state và render trong chương trình đầy đủ trước khi giải thích cách gộp trạng thái phím.
- Đi cùng quãng đường trong 5 giây ở các FPS khác nhau.
- Giải thích render FPS khác simulation rate thế nào.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 03 — Ứng dụng Paint tí hon: vẽ bằng chuột trên framebuffer

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Biến cửa sổ thành canvas; kéo chuột để vẽ nét, đổi bán kính bút và xóa màn hình.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Mini paint có brush tròn, stroke liền khi rê nhanh và vài màu.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Canvas phủ phần lớn window.
- Brush liên tục khi drag nhanh.
- Có clear và thay brush size/color.

### Quy mô / độ phức tạp tối thiểu

- Cho phép vẽ nhiều stroke liên tiếp.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse down + drag; keyboard/control thay brush.

### Mức đồ họa / trình bày tối thiểu

- Đầu ra phải là một ứng dụng desktop tương tác, không phải console-only.
- Nội dung chính phải chiếm phần lớn vùng hiển thị; các thông số/debug chỉ là lớp bổ trợ.
- Hình vẽ phải rõ, ổn định khi resize và đủ tương phản để quan sát hành vi của thuật toán.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Brush rasterization
- Stroke interpolation
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ vẽ một chấm tại click.
- Nét bị đứt rõ khi rê nhanh nhưng vẫn coi là xong.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture hai sample xa nhau kiểm khoảng cách giữa các dấu brush không vượt ngưỡng theo radius; kiểm stroke một điểm, sát biên và pointer rời vùng vẽ.
- Đổi sampling rate/interpolation cho triệu chứng dự đoán được; palette và brush size tác động vào nét mới, không làm biến đổi sai ảnh đã vẽ.
- Nét không đứt ở tốc độ chuột hợp lý.
- Không ghi ngoài framebuffer.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 04 — Bộ công cụ vẽ 2D: đường thẳng, hình chữ nhật và đường tròn

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Tự viết các thuật toán rasterization primitive và dùng chúng để vẽ một bảng hình học.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Có `drawLine`, `drawRect`, `fillRect`, `drawCircle`; không nhờ SDL vẽ.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Line ở mọi octant, rect outline/fill, circle outline/fill.
- Có pixel-zoom/debug mode.
- Có benchmark DDA vs Bresenham.

### Quy mô / độ phức tạp tối thiểu

- Test hàng trăm hướng/kích thước.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Phím đổi primitive/test mode hoặc scene tự sinh nhiều case.

### Mức đồ họa / trình bày tối thiểu

- Đầu ra phải là một ứng dụng desktop tương tác, không phải console-only.
- Nội dung chính phải chiếm phần lớn vùng hiển thị; các thông số/debug chỉ là lớp bổ trợ.
- Hình vẽ phải rõ, ổn định khi resize và đủ tương phản để quan sát hành vi của thuật toán.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- DDA
- Bresenham
- Circle rasterizer
- Benchmark harness
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Gọi API primitive của SDL.
- Chỉ demo một đường chéo đơn giản.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Kiểm endpoints, tám octant, đường dốc/đứng/ngang, đoạn một điểm và clipping/bounds; circle kiểm đối xứng và radius 0/không hợp lệ.
- Primitive được dùng như công cụ trong ứng dụng vẽ; benchmark dùng cùng tập đoạn/hình và tách thuật toán khỏi chi phí presentation.
- Line đúng mọi hướng.
- Circle đối xứng.
- Có benchmark, không kết luận cảm tính.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 05 — Bản đồ tọa độ kéo-thả: pan, zoom và đổi World ↔ Screen

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Xây mặt phẳng tọa độ có grid; pan bằng chuột, zoom bằng wheel và click để biết world coordinate.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Mini GeoGebra: trục X/Y, grid động, pan/zoom quanh cursor, đặt và kéo điểm.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Grid world-space có trục X/Y.
- Pan và zoom thật, không chỉ scale bitmap.
- Mouse hiển thị world coordinate.

### Quy mô / độ phức tạp tối thiểu

- Grid phải hoạt động khi resize window.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Drag pan; wheel zoom; click/drag point.

### Mức đồ họa / trình bày tối thiểu

- Đầu ra phải là một ứng dụng desktop tương tác, không phải console-only.
- Nội dung chính phải chiếm phần lớn vùng hiển thị; các thông số/debug chỉ là lớp bổ trợ.
- Hình vẽ phải rõ, ổn định khi resize và đủ tương phản để quan sát hành vi của thuật toán.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Camera2D
- Coordinate transforms
- Grid generation
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ vẽ grid tĩnh.
- Zoom làm sai mapping world/screen.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Zoom quanh cursor giữ world point dưới cursor trong tolerance; pan/resize không sửa tọa độ world của đối tượng.
- Fixture forward/inverse transform có negative coordinates và zoom gần giới hạn; kiểm click/drag ở cùng điểm sau nhiều lần pan/zoom.
- `screenToWorld(worldToScreen(p))≈p`.
- Resize không làm đổi logic world position.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN II — TOÁN HỌC ĐƯỢC HỌC THÔNG QUA CHƯƠNG TRÌNH TƯƠNG TÁC

## Project 06 — Bảng Vector kéo-thả: cộng, trừ và đo hai mũi tên

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Cho hai vector A/B kéo bằng chuột và trực quan hóa A+B, A−B, độ dài, normalize.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Vector playground có arrow, tọa độ, magnitude và phép cộng hình bình hành.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Hai vector A/B draggable.
- Hiển thị A+B, A-B, magnitude.
- Có numeric labels hoặc debug console.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 2 vector + kết quả hiển thị đồng thời.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Drag endpoints A/B.

### Mức đồ họa / trình bày tối thiểu

- Trực quan hóa phải cho phép người học nhìn thấy trực tiếp khái niệm đang tác động lên hình học/chuyển động.
- Các vector, trục, điểm, góc hoặc vùng hình học cần được vẽ rõ và có nhãn/giá trị khi hữu ích.
- Không chấp nhận thay visualizer tương tác bằng bảng số, console log hoặc sơ đồ tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Vec2
- length
- normalize
- distance
- lerp
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ in công thức vector.
- Không có hình trực quan.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Zero vector có quy tắc normalize rõ và không sinh NaN; fixture add/sub/lerp kiểm bằng giá trị biết trước, không chỉ nhìn hình.
- Người học giải thích cách dùng vector hiệu để lấy hướng/vận tốc trong một ví dụ chuyển động nhỏ.
- `length(normalize(v))≈1` với v khác 0; zero vector có quy tắc riêng.
- A+B khớp hình bình hành.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 07 — Chiếc kim quay trên vòng tròn: biến góc thành chuyển động bằng sin/cos

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Làm kim quay quanh tâm, đồng thời vẽ sin/cos của góc theo thời gian.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Unit-circle visualizer có point, projections X/Y và đồ thị sin/cos.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Unit circle + rotating point.
- Projection lên trục X/Y.
- Đồ thị sin/cos theo cùng angle.

### Quy mô / độ phức tạp tối thiểu

- Angle phải thể hiện bằng radian và có thể chạy nhiều vòng.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Slider/drag point hoặc mouse để thay angle.

### Mức đồ họa / trình bày tối thiểu

- Trực quan hóa phải cho phép người học nhìn thấy trực tiếp khái niệm đang tác động lên hình học/chuyển động.
- Các vector, trục, điểm, góc hoặc vùng hình học cần được vẽ rõ và có nhãn/giá trị khi hữu ích.
- Không chấp nhận thay visualizer tương tác bằng bảng số, console log hoặc sơ đồ tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Angle normalization
- Unit-circle mapping
- Simple plotter
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ vẽ một vòng tròn quay trang trí.
- Không liên hệ tọa độ với sin/cos.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture tại 0, π/2, π và 3π/2 kiểm dấu/giá trị; công bố radian và cách chuyển degree, đối chiếu point trên vòng tròn với đồ thị cùng thời điểm.
- Tốc độ góc theo giây cho cùng góc sau cùng thời gian ở nhiều FPS; pause và đổi tham số giữ quan hệ phase nhất quán giữa các hình.
- 2π rad đúng một vòng.
- `sin²+cos²≈1`.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 08 — Tháp pháo ngắm theo chuột: học dot product, góc và projection

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Vẽ turret 2D quay về mouse với tốc độ giới hạn; hiển thị forward, target direction và góc sai lệch.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Turret tracking mượt, có vector debug và projection trực quan.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Turret/body 2D có hướng.
- Target direction tới mouse.
- Hiển thị dot/góc/projection.

### Quy mô / độ phức tạp tối thiểu

- Scene phải cho thấy forward và target vectors.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse di chuyển target; turret quay có giới hạn tốc độ.

### Mức đồ họa / trình bày tối thiểu

- Trực quan hóa phải cho phép người học nhìn thấy trực tiếp khái niệm đang tác động lên hình học/chuyển động.
- Các vector, trục, điểm, góc hoặc vùng hình học cần được vẽ rõ và có nhãn/giá trị khi hữu ích.
- Không chấp nhận thay visualizer tương tác bằng bảng số, console log hoặc sơ đồ tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- dot
- project
- signed angle 2D
- steering
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Turret snap thẳng mouse bằng atan2 mà không trực quan dot/projection.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Kiểm target trùng turret, hai phía qua biên ±π và hướng đối nghịch; mỗi bước không quay quá angularSpeed × dt và không sinh NaN.
- Đổi target làm turret quay theo giới hạn tốc độ; phép chiếu và dot được đối chiếu bằng fixture vector đã chuẩn hóa.
- Với hai vector đơn vị, dot≈1 khi cùng hướng, 0 khi vuông góc và -1 khi ngược hướng.
- Turret chọn chiều quay ngắn hợp lý.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 09 — Trình biến đổi hình vuông: xoay, scale, shear và ghép phép biến đổi

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Tạo editor có slider transform một square bằng matrix và đổi thứ tự transform.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Square/grid rotate-scale-shear-translate; toggle order cho kết quả khác.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Square + basis/grid chịu matrix transform.
- UI/sliders cho rotate/scale/shear/translate.
- Toggle thứ tự transform.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 3 transform kết hợp.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Thay tham số runtime.

### Mức đồ họa / trình bày tối thiểu

- Trực quan hóa phải cho phép người học nhìn thấy trực tiếp khái niệm đang tác động lên hình học/chuyển động.
- Các vector, trục, điểm, góc hoặc vùng hình học cần được vẽ rõ và có nhãn/giá trị khi hữu ích.
- Không chấp nhận thay visualizer tương tác bằng bảng số, console log hoặc sơ đồ tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Mat2
- Mat3
- Matrix multiplication
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ gọi hàm transform thư viện.
- Không minh họa sự khác nhau của transform order.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture một điểm với rotate rồi translate và thứ tự ngược có kết quả tính tay; kiểm identity và inverse khi ma trận khả nghịch.
- Shape, pivot và gizmo dùng cùng transform; singular scale có chính sách rõ, không gọi inverse không tồn tại.
- Identity giữ shape.
- Giải thích được vì sao order transform quan trọng.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 10 — La bàn 3D: dựng ba trục và vector pháp tuyến của tam giác

**Mức tham vọng trực quan:** Foundation / trực quan hóa rõ ràng

### Đề bài / mục tiêu sản phẩm

Bước vào Vec3 bằng cách vẽ axes, hai vector A/B và cross product A×B.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Scene 3D tối giản có X/Y/Z, A, B và normal vuông góc.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Scene 3D có X/Y/Z axes.
- Hai vector A/B và cross vector.
- Triangle với normal và winding toggle.

### Quy mô / độ phức tạp tối thiểu

- Perspective view đủ thấy ba chiều.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Điều chỉnh vector/triangle hoặc camera để quan sát.

### Mức đồ họa / trình bày tối thiểu

- Trực quan hóa phải cho phép người học nhìn thấy trực tiếp khái niệm đang tác động lên hình học/chuyển động.
- Các vector, trục, điểm, góc hoặc vùng hình học cần được vẽ rõ và có nhãn/giá trị khi hữu ích.
- Không chấp nhận thay visualizer tương tác bằng bảng số, console log hoặc sơ đồ tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Vec3
- cross
- 3D debug arrows
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ hiển thị coordinate text 3D.
- Không có normal/cross visualization.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Normal bằng 0 ở tam giác suy biến có cách hiển thị/xử lý; camera đổi nhưng quan hệ vuông góc không đổi.
- Tách rõ phép chiếu cung cấp sẵn cho bài này khỏi Vec3/cross người học tự xây; liên kết tới bài projection 11.
- `dot(cross(a,b),a)≈0` và với b.
- Đảo order làm normal đảo chiều.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN III — TỰ DỰNG ĐỒ HỌA 3D TRÊN CPU, CHƯA DÙNG OPENGL

## Project 11 — Điểm sáng bay trong không gian: chiếu một điểm 3D xuống màn hình

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Điều khiển một điểm bằng WASD/QE trong 3D và tự tính vị trí 2D trên màn hình.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một point có cảm giác xa gần rõ ràng; FOV/focal length thay đổi được.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Một object/point có tọa độ 3D thật.
- Perspective projection tự tính.
- Có near-plane guard và FOV/focal parameter.

### Quy mô / độ phức tạp tối thiểu

- Điểm phải di chuyển xuyên nhiều giá trị depth.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- WASD/QE hoặc controls thay x/y/z.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Perspective projection
- Near-plane rejection
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Dùng OpenGL projection.
- Fake depth chỉ bằng thay size không có x/z,y/z.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Kiểm điểm tại tâm, lệch trục, trên/gần near và phía sau camera; công bố convention, FOV/aspect và điều kiện reject trước phép chia.
- Fixture tọa độ screen có giá trị tính tay; đổi FOV và z tác động khác nhau nhưng không làm state world tự đổi.
- Tăng z làm displacement trên screen giảm.
- Không nổ số khi z→0.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 12 — Tam giác 3D xoay bằng chuột: học rotation trước matrix

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Tạo triangle 3D, kéo chuột yaw/pitch và Q/E roll bằng công thức sin/cos trực tiếp.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Triangle wireframe xoay tự do; normal quay theo.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Triangle có 3 vertices 3D.
- Rotation X/Y/Z tự tính bằng sin/cos.
- Normal hiển thị.

### Quy mô / độ phức tạp tối thiểu

- Cho đổi rotation order để quan sát.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse yaw/pitch, Q/E roll.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Axis rotation functions
- Mouse look mapping
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Dùng Mat4/GLM ngay từ đầu để né hiểu rotation.
- Chỉ auto-rotate không có input.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Phép quay bảo toàn độ dài/cạnh tam giác trong tolerance; đổi thứ tự quay hai trục có fixture thể hiện kết quả khác nhau.
- Xoay mô hình và đổi camera nếu cùng tồn tại có mode/nhãn riêng; kéo model không vô tình xoay cả hệ tọa độ.
- 0 rad giữ nguyên.
- 2π đưa về gần vị trí cũ.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 13 — Khối lập phương wireframe tương tác hoàn toàn bằng CPU

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Tự dựng cube 8 đỉnh/12 cạnh; mouse xoay, keyboard di chuyển, wheel zoom.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Cube wireframe ổn định, perspective/orthographic toggle, có world axes.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Khối lập phương 3D 8 vertex/12 edge.
- Perspective projection tự viết trên CPU.
- Full-window 3D viewport với depth perception.

### Quy mô / độ phức tạp tối thiểu

- Cube phải có thể được quan sát từ nhiều orientation và khoảng cách.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse drag rotate; WASD/QE move; wheel zoom; reset; perspective/orthographic toggle.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.
- Cube phải đủ lớn trong viewport để nhìn rõ perspective; có floor/grid hoặc world axes tạo cảm giác chiều sâu.
- Kéo chuột phải cho phản hồi xoay mượt; chuyển perspective/orthographic phải thấy khác biệt rõ.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Cube data
- Transform chain
- Wireframe renderer
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Một ảnh cube 2D/isometric.
- Dùng OpenGL/SDL line primitives.
- Chỉ cho orbit bằng mouse mà không có world movement/zoom.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture cube có vertex/edge biết trước; chuyển perspective/orthographic và resize giữ convention/aspect nhất quán.
- Xoay model không vô tình quay axes world; near handling, camera và input có checklist độc lập.
- Mô tả được vertex đi từ model tới pixel.
- Không dùng SDL line drawing/OpenGL.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 14 — Đi bộ trong căn phòng wireframe bằng camera kiểu FPS

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Dựng room/grid và cho người dùng đi lại bằng WASD + mouse look.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

FPS camera có forward/right/up và relative mouse mode.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Một căn phòng/grid world 3D, không chỉ một cube.
- Camera FPS đứng trong scene và di chuyển qua world.
- Basis forward/right/up rõ ràng.

### Quy mô / độ phức tạp tối thiểu

- Người dùng phải có cảm giác đi xuyên không gian 3D.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- WASD + mouse look + vertical/fly control tùy mode.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.
- Căn phòng phải có nhiều cạnh/mặt phẳng hoặc nhiều cube để người dùng cảm nhận mình đang **đi trong** không gian, không phải orbit quanh một object.
- Movement xuyên qua room phải đủ dài để kiểm tra camera basis và depth.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Camera basis
- World→view transform
- FPS movement
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Xoay cả world/object thay vì camera transform.
- Orbit camera quanh một object duy nhất.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Đi trong phòng theo hướng nhìn với dt; relative mouse bật/tắt khi focus/Escape đúng và không gây cú nhảy camera lúc nhận lại focus.
- Fixture basis và view transform kiểm camera translation/rotation; giới hạn pitch hoặc quy tắc tránh suy biến được công bố.
- Basis gần orthonormal.
- Movement nhất quán với convention đã chọn.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 15 — Máy soi pipeline 3D: xem một vertex đi qua Model → View → Projection

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Tạo inspector hiển thị tọa độ cùng một vertex sau từng stage matrix.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Có bảng model/world/view/clip/NDC/screen cập nhật realtime.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Inspector cho một/một nhóm vertex.
- Hiển thị giá trị sau model/world/view/clip/NDC/screen.
- Mat4 tự viết.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất một vertex có bảng số cập nhật runtime.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- UI/phím thay transform, FOV, near/far.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Mat4
- MVP matrices
- Perspective divide
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ render cube mà không expose intermediate coordinates.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture vertex có giá trị model/world/view/clip/NDC/screen tính độc lập; chia w đúng giai đoạn và xử lý w không hợp lệ.
- Thay một stage làm bảng và hình đổi nhất quán; công cụ còn dùng được để debug clipping/depth ở các bài tiếp theo.
- Tự tính tay một case đơn giản và khớp.
- Giải thích được vai trò w.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 16 — Tô kín tam giác bằng pixel: từ ba đỉnh đến một bề mặt

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Tự xác định pixel nằm trong triangle và tô màu theo barycentric coordinates.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Triangle đặc có thể kéo vertex; RGB biểu diễn α/β/γ.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Triangle đặc rasterized pixel-by-pixel.
- Barycentric RGB visualization.
- Draggable vertices hoặc test cases.

### Quy mô / độ phức tạp tối thiểu

- Test nhiều winding/degenerate cases.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Drag vertices hoặc keyboard đổi shape.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Edge function
- Barycentric
- Triangle fill
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Scanline library/API geometry.
- Chỉ outline triangle.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Triangle suy biến và tọa độ ngoài viewport không chia cho 0/ghi ngoài buffer; kiểm các winding và quy tắc cạnh được công bố.
- Hai tam giác chung cạnh có fixture coverage không để lỗ theo fill rule; màu barycentric khớp vertex và một điểm trong.
- `α+β+γ≈1` bên trong.
- Winding convention nhất quán.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 17 — Khối lập phương đặc với 6 mặt màu và Z-buffer

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Biến cube thành 12 triangles; mặt gần phải che mặt xa bất kể thứ tự vẽ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Solid cube có depth đúng và back-face culling toggle.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cube 12 triangles solid.
- Depth buffer CPU.
- Back-face culling toggle.

### Quy mô / độ phức tạp tối thiểu

- Nhiều mặt overlap khi quay mà visibility vẫn đúng.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Rotate/move camera/object; toggle depth/culling.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- DepthBuffer
- Depth test
- Back-face culling
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Painter order hard-code thay z-buffer.
- Chỉ một face nhìn chính diện.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Hai bề mặt depth khác nhau cho cùng visibility khi đảo thứ tự vẽ; coplanar/tie có chính sách riêng, không hứa mọi màu tie bất biến.
- Clear/resize depth buffer đúng mỗi frame; culling có ca front/back và không thay thế depth test.
- Đảo draw order không làm visibility sai.
- Tắt z-buffer thấy lỗi rõ.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 18 — Cho tam giác đi xuyên camera mà không “nổ” hình: Near-plane Clipper

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Clip triangle khi nó cắt near plane và sinh 0/1/2 triangle hợp lệ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Object đi sát/xuyên camera không tạo spike vô hạn.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Triangle/object đi xuyên near plane liên tục.
- Clip sinh 0/1/2 triangles đúng.
- Debug before/after clipping.

### Quy mô / độ phức tạp tối thiểu

- Phải xử lý 0,1,2,3 vertices inside.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Điều khiển object tiến/lùi xuyên camera.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Plane
- Segment-plane intersection
- Triangle clipper
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ discard cả triangle khi một vertex qua near plane.
- Clamp z để che lỗi.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture 0/1/2/3 vertex trong near plane cho số polygon/triangle và vị trí giao biết trước; attribute được nội suy cùng tham số giao.
- Triangle qua near không bị discard toàn bộ khi vẫn còn phần hợp lệ; không sửa bằng clamp z hoặc chỉ giới hạn tọa độ screen.
- Transition ổn định, không spike.
- Có debug before/after clip.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 19 — Chiếu đèn lên mô hình: mặt quay về đèn sáng hơn

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Thêm directional light và tính flat Lambert shading.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Cube/OBJ có mặt sáng tối theo normal; light orbit được.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Model/cube có face lighting phụ thuộc orientation.
- Nguồn sáng có thể di chuyển/orbit.
- Debug normals/light vectors.

### Quy mô / độ phức tạp tối thiểu

- Dot-based diffuse phải thay đổi liên tục khi rotate.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Điều khiển light hoặc object.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Face normals
- Lambert shading
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Màu mặt hard-code theo face ID.
- Shader/OpenGL thay calculation CPU.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Normal/light cùng hướng, vuông góc, ngược hướng có diffuse biết trước; normal dùng đúng space và chuẩn hóa.
- Nếu có non-uniform scale, dùng normal transform phù hợp hoặc tính lại normal từ hình đã biến đổi; parser chưa học thì mesh được cung cấp rõ.
- Mặt quay khỏi light không có diffuse dương.
- Normal/winding nhất quán.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 20 — Dán bàn cờ lên mặt phẳng nghiêng: sửa texture méo do perspective

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Texture một quad bằng checkerboard tự sinh và so affine interpolation với perspective-correct.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Toggle A/B cho thấy texture affine méo và bản corrected đúng hơn.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Một quad nghiêng có checker texture.
- A/B toggle affine vs perspective-correct.
- Texture sampler tự viết tối thiểu.

### Quy mô / độ phức tạp tối thiểu

- Góc nghiêng đủ lớn để thấy distortion.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Rotate/tilt quad; toggle mode.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Texture sampling nearest
- Perspective-correct interpolation
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ texture quad đối diện camera.
- Không có so sánh affine sai.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture pixel trong mặt phẳng nghiêng đối chiếu UV bằng phép nội suy perspective-correct độc lập; affine/correct dùng cùng camera, texture và geometry.
- Kiểm UV boundaries, near clipping và division hợp lệ; không dùng cảm giác checker đẹp hơn làm oracle duy nhất.
- Checkerboard không trượt/méo như affine ở góc nghiêng lớn.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 21 — Trình xem mô hình OBJ: xoay một mesh thật bằng renderer tự viết

**Mức tham vọng trực quan:** 3D Foundation / viewport chính rõ ràng

### Đề bài / mục tiêu sản phẩm

Đọc OBJ nhỏ và render bằng toàn bộ CPU pipeline đã xây.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Có thể mở cube/icosphere/Suzanne nhỏ, bật wireframe/solid/normals.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Load mesh từ file OBJ thật.
- Render bằng chính software renderer CPU.
- Camera orbit/FPS và debug normals/wireframe.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất một model vài nghìn triangles nếu performance cho phép.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mở ít nhất 2 model khác nhau; rotate/camera controls.

### Mức đồ họa / trình bày tối thiểu

- Viewport 3D phải là phần chính của cửa sổ, có perspective/depth rõ ràng và camera tương tác khi project yêu cầu.
- Scene phải có nền/grid/axes hoặc depth cues đủ để người xem cảm nhận không gian 3D, không phải vài hình 2D giả lập chiều sâu.
- Debug overlays như normals, wireframe, depth, clipping phải có thể bật/tắt; khi tắt debug, scene vẫn phải là một demo 3D sạch và dễ quan sát.
- Model phải chiếm tỷ lệ hợp lý trong viewport và có ít nhất solid shading hoặc face lighting cơ bản; wireframe chỉ là debug mode.
- Phải xem được model từ nhiều góc bằng camera/orbit thay vì ảnh tĩnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tiny OBJ parser
- Mesh structure
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Hard-code model vertices.
- Dùng thư viện model viewer/render engine.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Parser có fixture record hợp lệ, index sai, mặt suy biến và record ngoài subset công bố; lỗi có vị trí và không làm mất tài nguyên.
- Ít nhất hai mesh trong phạm vi quy mô đã nêu chạy với camera, solid/wireframe/normals; dùng pipeline 11–20, không dùng renderer thư viện.
- Model nhỏ render đúng convention.
- Unsupported line báo lỗi rõ.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN IV — MÔ PHỎNG VẬT LÝ VÀ NUMERICAL METHODS

## Project 22 — Pháo bắn đạn: kéo chuột chọn góc và vận tốc, so quỹ đạo với công thức

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Tạo cannon; drag chọn initial velocity rồi bắn projectile dưới gravity.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Quỹ đạo numerical và analytic được vẽ cùng nhau với error.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Khẩu pháo + projectile + trajectory trail.
- Numerical và analytic trajectory vẽ cùng lúc.
- Timestep adjustable.
- Mục tiêu 2D chọn được và độ lệch lần bắn so mục tiêu.

### Quy mô / độ phức tạp tối thiểu

- Nhiều lần bắn với tham số khác.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Drag chọn hướng/tốc độ; fire/reset; thay gravity/dt.

### Mức đồ họa / trình bày tối thiểu

- Simulation phải chuyển động liên tục và thể hiện hiện tượng vật lý bằng hình ảnh, không chỉ bằng số liệu.
- Ngoài scene chính, ít nhất một dạng visualization định lượng phù hợp phải có: vector lực/vận tốc, trail, graph, energy/error plot hoặc contact debug.
- Số lượng vật thể và độ phong phú chuyển động phải đủ để hiện tượng nhìn rõ ngay, không phải demo 1–2 object nếu đề bài nói hàng chục/hàng trăm.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Particle state
- Integrator cơ bản
- Trajectory logger
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ dùng công thức analytic để animate.
- Không đo sai số numerical.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Có mục tiêu 2D chọn được; hiển thị độ lệch lần bắn so mục tiêu và đối chiếu analytic/numerical, không cần solver tự ngắm.
- Error tính tại cùng thời điểm vật lý trên khoảng hữu hạn; không so điểm rơi đã va chạm với nghiệm chưa có va chạm.
- dt giảm → error giảm theo xu hướng hợp lý.
- Có max/mean position error.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 23 — Cuộc đua Integrator: Euler, Verlet và RK4 chạy cạnh nhau

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Chạy cùng spring oscillator bằng nhiều integrator, vẽ energy drift/error và runtime.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một dashboard có 3–4 simulation chạy song song và plot sai số.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cùng một oscillator chạy bằng nhiều integrator cạnh nhau.
- Graph error/energy drift.
- Runtime benchmark.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất Euler, semi-implicit/Verlet và RK4 hoặc Velocity Verlet.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Đổi dt/integrator runtime.

### Mức đồ họa / trình bày tối thiểu

- Simulation phải chuyển động liên tục và thể hiện hiện tượng vật lý bằng hình ảnh, không chỉ bằng số liệu.
- Ngoài scene chính, ít nhất một dạng visualization định lượng phù hợp phải có: vector lực/vận tốc, trail, graph, energy/error plot hoặc contact debug.
- Số lượng vật thể và độ phong phú chuyển động phải đủ để hiện tượng nhìn rõ ngay, không phải demo 1–2 object nếu đề bài nói hàng chục/hàng trăm.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Integrators
- Error/energy logger
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ list công thức integrator.
- Không cùng initial condition để so sánh.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Oscillator có nghiệm tham chiếu hoặc reference độc lập; mọi integrator dùng cùng force, state đầu và thời gian mô phỏng.
- Đo nhiều dt và cùng ngân sách đánh giá lực bên cạnh so cùng dt; không kết luận một integrator luôn tốt nhất từ một biểu đồ.
- Có số liệu, không chỉ nhìn.
- Giải thích trade-off accuracy/cost.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 24 — Bể bóng va chạm: hàng trăm quả bóng nảy vào tường và nhau

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Tạo collision playground 2D rồi mở rộng sphere-sphere 3D.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Bóng mass/restitution khác nhau va chạm hợp lý, có normal/contact/impulse debug.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Hàng trăm ball/circle hoặc spheres.
- Mass/restitution khác nhau.
- Debug contact normal/impulse.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất dozens-to-hundreds bodies trong 2D trước 3D.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Spawn/reset; có thể kéo/thả hoặc thay restitution.

### Mức đồ họa / trình bày tối thiểu

- Simulation phải chuyển động liên tục và thể hiện hiện tượng vật lý bằng hình ảnh, không chỉ bằng số liệu.
- Ngoài scene chính, ít nhất một dạng visualization định lượng phù hợp phải có: vector lực/vận tốc, trail, graph, energy/error plot hoặc contact debug.
- Số lượng vật thể và độ phong phú chuyển động phải đủ để hiện tượng nhìn rõ ngay, không phải demo 1–2 object nếu đề bài nói hàng chục/hàng trăm.
- Bể phải chứa **hàng trăm** bóng ở preset chính nếu hiệu năng cho phép, với màu/kích thước khác nhau để dễ theo dõi va chạm.
- Contact normals/impulses chỉ bật khi debug để tránh làm scene chính rối.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Collision detection
- Impulse response
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ bounce với wall.
- Teleport objects ra khỏi nhau mà không impulse response.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Ca hai bóng cô lập kiểm hướng normal, mass khác nhau và impulse khi đang tách nhau; không tính overlap correction như một lực bảo toàn.
- Khi có tường/ngoại lực, ghi trao đổi động lượng với môi trường; không yêu cầu tổng động lượng riêng của các bóng luôn bảo toàn.
- Va chạm đàn hồi giữa hai bóng cô lập gần bảo toàn động lượng và động năng.
- Với va chạm không đàn hồi, động năng giảm theo restitution khi không có nguồn làm công bên ngoài.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 25 — Chuỗi lò xo treo: kéo một khối và xem dao động truyền qua cả dây

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Nối nhiều mass bằng spring; kéo một node bằng chuột và quan sát dao động lan truyền.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Chain 20–100 mass có damping toggle và graph tổng năng lượng.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Chain 20–100 masses nối spring.
- Một đầu cố định hoặc constraints.
- Energy graph.

### Quy mô / độ phức tạp tối thiểu

- Dao động phải lan truyền qua nhiều nodes.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse kéo một mass; toggle damping.

### Mức đồ họa / trình bày tối thiểu

- Simulation phải chuyển động liên tục và thể hiện hiện tượng vật lý bằng hình ảnh, không chỉ bằng số liệu.
- Ngoài scene chính, ít nhất một dạng visualization định lượng phù hợp phải có: vector lực/vận tốc, trail, graph, energy/error plot hoặc contact debug.
- Số lượng vật thể và độ phong phú chuyển động phải đủ để hiện tượng nhìn rõ ngay, không phải demo 1–2 object nếu đề bài nói hàng chục/hàng trăm.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Spring force
- Force accumulator
- Chain topology
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ một lò xo đơn.
- Animation sine hard-code.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture hai mass và chain ngắn kiểm lực hai đầu bằng nhau/ngược chiều, fixed node và chiều lực khi kéo/nén; chain cuối vẫn đủ 20–100 mass.
- Tách thời gian đang kéo (ngoại lực làm công) với giai đoạn thả; giảm dt để phân biệt damping và numerical drift.
- Không damping: đo energy drift.
- Có damping và không còn thao tác kéo/ngoại lực làm công: mechanical energy giảm theo xu hướng trong giới hạn sai số tích phân.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 26 — Hai con lắc gần giống nhau nhưng cuối cùng khác hẳn: trực quan hóa chaos

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Chạy hai double pendulum lệch điều kiện đầu rất nhỏ và vẽ khoảng cách giữa chúng.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Nhìn trực tiếp sensitivity to initial conditions mà không nhầm với numerical instability.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Hai double pendulums chạy cạnh nhau.
- Initial conditions lệch rất nhỏ.
- Separation/error graph và energy monitor.

### Quy mô / độ phức tạp tối thiểu

- Chạy đủ lâu để thấy divergence.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Start/reset; thay dt/initial delta.

### Mức đồ họa / trình bày tối thiểu

- Simulation phải chuyển động liên tục và thể hiện hiện tượng vật lý bằng hình ảnh, không chỉ bằng số liệu.
- Ngoài scene chính, ít nhất một dạng visualization định lượng phù hợp phải có: vector lực/vận tốc, trail, graph, energy/error plot hoặc contact debug.
- Số lượng vật thể và độ phong phú chuyển động phải đủ để hiện tượng nhìn rõ ngay, không phải demo 1–2 object nếu đề bài nói hàng chục/hàng trăm.
- Hai double pendulum phải được render song song hoặc overlay rõ ràng, có trail và graph separation theo thời gian.
- Scene phải cho người xem nhìn ra divergence dần dần chứ không chỉ in số.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Pendulum solver
- State comparison plot
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ render một pendulum đẹp.
- Divergence do timestep không ổn định nhưng gọi là chaos.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Hai hệ dùng cùng solver/dt, khác điều kiện đầu ε công bố; thêm đối chiếu cùng điều kiện đầu ở dt và dt/2 trong cửa sổ ngắn trước khi phân kỳ lớn.
- Không suy ra chaos chỉ từ solver nổ số; theo dõi năng lượng và loại ca NaN/Inf, ghi thời gian tin cậy của phép so.
- Divergence vẫn xuất hiện khi dt đủ nhỏ.
- Energy behavior được theo dõi.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN V — CẤU TRÚC KHÔNG GIAN, QUY MÔ LỚN VÀ HIỆU NĂNG

## Project 27 — Đàn Boids 2D: hành vi tập thể từ những quy tắc cục bộ

**Vai trò:** Ứng dụng mô phỏng; bản chuẩn trước khi tối ưu ở Project 28

**Mức tham vọng trực quan:** Đàn chuyển động có cấu trúc, đọc được hướng và tương tác cục bộ

### Đề bài / mục tiêu sản phẩm

Tự xây dựng một mô phỏng 2D trong đó các cá thể tự điều chỉnh vận tốc theo ba quy tắc separation, alignment và cohesion. Hành vi đàn phải hình thành từ tương tác cục bộ; brute force là cách tìm hàng xóm để có bản chuẩn dễ kiểm chứng.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Các cá thể có hướng di chuyển, tụ thành đàn và tách nhau khi quá gần. Người dùng thay trọng số để quan sát vai trò từng quy tắc, chọn một cá thể để xem hàng xóm và các vector steering. Không phải một đám điểm chỉ đổi màu khi con trỏ tới gần.

### Phạm vi chức năng tối thiểu bắt buộc

- State có ID, position và velocity; tính separation, alignment, cohesion trên hàng xóm nằm trong bán kính đã công bố.
- Tổng hợp steering, giới hạn acceleration/speed và tích phân theo giây; có quy tắc rõ cho không có hàng xóm, hai cá thể trùng vị trí và velocity bằng 0.
- Đọc cùng một snapshot cho toàn bước và ghi state mới riêng; không để cá thể cập nhật trước ảnh hưởng cá thể cập nhật sau.
- Domain 2D hữu hạn với quy tắc biên công bố rõ. Nếu wrap, khoảng cách/hướng tới hàng xóm phải dùng quy tắc biên tương ứng, không chỉ wrap hình vẽ.
- Preset seed tái lập, Pause/Reset, single-step; hiển thị thời gian tìm hàng xóm, steering/update và tổng số phép kiểm tra.

### Quy mô / độ phức tạp tối thiểu

- Có preset 256, 512 và 1.024 cá thể; bản cuối chạy được 1.024 cá thể tương tác thật bằng brute force.
- Tính hàng xóm cho mọi cá thể ở mỗi bước; không chỉ query quanh cá thể đang chọn. Không dùng grid/tree ở bản chuẩn này.
- Không đặt yêu cầu FPS chung cho mọi máy; benchmark theo Mục 0.9.

### Tương tác bắt buộc

- Đổi số cá thể, seed, bán kính và ba trọng số; Pause/Reset và tiến một bước.
- Chọn cá thể để xem hàng xóm, ba steering vector và vector tổng. Chế độ quan sát đàn có thể tắt các lớp debug.

### Mức đồ họa / trình bày tối thiểu

- Dùng hình có hướng như tam giác/mũi tên; màu và kích thước giúp đọc đàn mà không che toàn cảnh.
- Bán kính và vector của cá thể được chọn có nhãn/giá trị. Controls không che vùng chuyển động chính.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết neighbor loop, ba quy tắc steering, giới hạn vector, bước cập nhật và benchmark; không dùng flocking/physics engine.
- C++20/SDL3, presentation CPU theo quy định trước phần OpenGL. Kế thừa vector, timing và camera 2D nhưng giải thích đường đi của dữ liệu.

### Không được coi là hoàn thành nếu

- Chuyển động được tạo bằng quỹ đạo, random velocity mới mỗi frame hoặc animation định sẵn thay cho steering.
- Có một query con trỏ nhưng không tính tương tác cho toàn đàn.
- Cập nhật in-place làm thay đổi kết quả theo thứ tự duyệt, hoặc dùng displacement cố định mỗi frame.
- Chỉ có Canvas/video hoặc vài cá thể ở bản cuối.

### Acceptance Criteria

- Fixture nhỏ có neighbor IDs và steering biết trước: không hàng xóm, một hàng xóm, đối xứng, trùng vị trí và trường hợp qua biên nếu wrap.
- Self không nằm trong neighbor set; distance/radius và điều kiện tại biên được kiểm độc lập.
- Cùng seed, snapshot, tham số và dt cho kết quả tái lập; đổi thứ tự lưu trữ rồi ánh xạ theo ID cho cùng bước cập nhật trong tolerance công bố.
- Speed/acceleration không vượt giới hạn; không có NaN/Inf ở các ca suy biến; so cùng thời gian mô phỏng với nhiều dt để thấy sai số tích phân.
- Ở preset 1.024 cá thể, thay trọng số làm thay đổi hành vi có thể giải thích; Pause/step/reset và debug cá thể hoạt động.
- Có bảng công việc/thời gian theo N, source đầy đủ, tests và checklist desktop riêng.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 28 — Đàn Boids lớn với Spatial Grid

**Vai trò:** Nâng cấp hiệu năng của chính ứng dụng Project 27

**Mức tham vọng trực quan:** Đàn lớn có chuyển động thật; grid là công cụ phục vụ mô phỏng

### Đề bài / mục tiêu sản phẩm

Giữ nguyên luật Boids, quy tắc biên và integrator của Project 27, thay cách tìm hàng xóm bằng uniform spatial grid để chạy đàn lớn. Người học phải biết grid giảm công việc ở đâu và tốn chi phí gì để dựng lại khi đàn di chuyển.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Đàn ít nhất 10.000 cá thể chuyển động theo ba quy tắc. Có thể chuyển Brute/Grid ở preset nhỏ trên cùng state, kiểm neighbor/steering và xem toàn bước nhanh hay chậm hơn. Grid và cell occupancy chỉ là lớp debug.

### Phạm vi chức năng tối thiểu bắt buộc

- Dựng lại grid từ snapshot position của mỗi bước; ánh xạ cell xử lý đúng tọa độ âm và biên domain.
- Duyệt mọi cell có thể giao bán kính query theo cell size đang chọn, rồi lọc bằng khoảng cách chính xác.
- Không thay luật steering, không giới hạn số hàng xóm và không bỏ cá thể để tạo speedup.
- Bản brute force vẫn dùng được cho validation và benchmark nhỏ; có ca phân bố đều, tụ cụm và cell size bất lợi.
- Tách build grid, candidate query, steering/update và tổng bước; đếm candidate/actual neighbors và occupancy.

### Quy mô / độ phức tạp tối thiểu

- Preset nghiệm thu ít nhất 10.000 cá thể được cập nhật đầy đủ; có preset nhỏ tái dùng fixture Project 27.
- Dùng cùng snapshot nhỏ để đo cả hai thuật toán. Không buộc chạy brute force 10.000 cá thể liên tục trong UI; phép so lớn phải hữu hạn và hủy được.
- Scale cao hơn là mở rộng theo máy, không thay ngưỡng bắt buộc.

### Tương tác bắt buộc

- Đổi N, radius, cell size, seed và trọng số; chọn cá thể; Pause/Reset/single-step.
- Toggle Brute/Grid ở preset phù hợp và bật cell boundaries, occupancy, candidate/actual neighbors.

### Mức đồ họa / trình bày tối thiểu

- Giữ cách đọc hướng đàn ở 27; có chế độ quan sát sạch và chế độ debug grid trên cùng ứng dụng.
- Hiển thị chi phí dựng grid bên cạnh thời gian query, không chỉ một con số speedup.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết cell indexing/storage, build/query và validator so với brute force; không dùng thư viện spatial index.
- Dùng double buffering như 27. Quy tắc wrap nếu có phải nhất quán ở cả cell lookup và phép đo khoảng cách; không duyệt trùng cell khi radius lớn.

### Không được coi là hoàn thành nếu

- Chỉ vẽ đường kẻ grid hoặc đổi màu theo cell.
- Tăng hiệu năng bằng cách đổi luật đàn, cắt hàng xóm hoặc bỏ qua chi phí rebuild.
- Query đúng cho một con trỏ nhưng sai khi cập nhật toàn đàn.
- Chỉ đạt preset nhỏ hơn 10.000 cá thể.

### Acceptance Criteria

- Neighbor IDs khớp brute force trên cùng snapshot; kiểm radius nhỏ/bằng/lớn hơn cell size, biên cell, biên domain và cụm rất đặc.
- Steering và state sau một bước khớp 27 theo tolerance công bố; không dùng quỹ đạo dài phải trùng bit làm oracle duy nhất.
- Mỗi cá thể được đưa vào đúng cell, candidate không làm đếm trùng actual neighbor và không mất hàng xóm qua biên.
- Preset 10.000 cá thể có hành vi đàn thực sự; UI và hủy benchmark vẫn phản hồi.
- Báo median và độ phân tán của toàn bước ở nhiều N/phân bố/cell size, có ca grid không thắng; không tuyên bố luôn nhanh hơn.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 29 — Biên tập bản đồ 2D lớn bằng Quadtree

**Vai trò:** Công cụ biên tập; cấu trúc không gian phục vụ thao tác trên bản đồ

**Mức tham vọng trực quan:** Bản đồ có đối tượng mang diện tích, không phải scatter plot

### Đề bài / mục tiêu sản phẩm

Tự xây dựng công cụ xem và chỉnh sửa một bản đồ 2D lớn gồm nhà, cây hoặc vùng chức năng biểu diễn bằng hình có kích thước. Quadtree hỗ trợ chọn đối tượng và loại bỏ những đối tượng ngoài viewport khi pan/zoom.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Người dùng tìm một vùng trên bản đồ, kéo chọn các đối tượng, di chuyển hoặc xóa chúng rồi thấy kết quả cập nhật ngay. Bật debug để giải thích node nào được duyệt/cắt; tắt debug vẫn là một công cụ bản đồ sử dụng được.

### Phạm vi chức năng tối thiểu bắt buộc

- Dataset seed tái lập với ID, loại đối tượng, world position và AABB có diện tích khác nhau; hình vẽ tương ứng với bounds truy vấn.
- Camera World ↔ Screen, pan/zoom quanh cursor, click-select và rectangle range selection theo giao AABB.
- Thêm, di chuyển, xóa đối tượng; cập nhật index và selection theo ID ổn định, không để lại bản ghi cũ.
- Quadtree xử lý đối tượng vắt qua đường chia; công bố quy tắc lưu ở cha hoặc nhân bản có dedup, giới hạn depth/capacity và chính sách root bounds.
- Viewport culling dùng cùng index; brute-force reference cho query và thống kê số đối tượng/node được xét.

### Quy mô / độ phức tạp tối thiểu

- Bản đồ ít nhất 100.000 đối tượng có kích thước thật; có phân bố đều, cụm dày và đối tượng lớn cắt nhiều quadrant.
- Pan/zoom chỉ cần vẽ những đối tượng liên quan viewport, nhưng tổng dataset/index phải chứa đủ quy mô nghiệm thu.

### Tương tác bắt buộc

- Pan/zoom, click chọn, kéo vùng chọn, kéo nhóm đối tượng, thêm/xóa và reset dataset.
- Toggle tree/query debug và reference check; hiển thị số đã chọn và thao tác đang thực hiện.

### Mức đồ họa / trình bày tối thiểu

- Loại đối tượng có màu/hình phân biệt, selection và drag preview rõ. Cảnh quan là bản đồ có cấu trúc chứ không chỉ hàng trăm nghìn chấm.
- Node boxes và visited/pruned nodes bật được nhưng không phải đầu ra duy nhất.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết Quadtree insert/remove/update/query, AABB intersection và camera interaction; không dùng thư viện spatial index.
- Công bố quy tắc inclusive/exclusive ở cạnh và thứ tự chọn khi các đối tượng chồng nhau. Không chỉ index tâm của một đối tượng lớn.

### Không được coi là hoàn thành nếu

- Quadtree chỉ chứa point rồi dùng point-in-rectangle thay giao hình có diện tích.
- Cây chỉ vẽ để minh họa, còn mọi thao tác vẫn quét toàn dataset không có so sánh.
- Di chuyển/xóa làm còn kết quả cũ, trùng ID hoặc mất đối tượng cắt đường chia.
- Chỉ có dataset vài nghìn đối tượng hoặc ảnh cây tĩnh.

### Acceptance Criteria

- Query IDs khớp brute force trước và sau chuỗi thêm/di chuyển/xóa; có fixture nằm trên/cắt split, root edge, ngoài root và nhiều đối tượng chồng nhau.
- Query không trả ID đã xóa hoặc trùng; di chuyển nhóm giữ selection và có chính sách rollback/báo lỗi nếu vượt root được công bố.
- Culling không bỏ đối tượng đang giao viewport; kết quả hiển thị ở cùng camera tương đương bản brute force.
- Tại ít nhất 100.000 đối tượng, hoàn thành được quy trình tìm vùng → chọn → di chuyển → xóa → kiểm lại; có số đo query/update/culling riêng.
- Test biến đổi tọa độ, thao tác pointer/keyboard và source C++ độc lập được ghi nhận.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 30 — Khảo sát point cloud 3D bằng Octree

**Vai trò:** Công cụ quan sát và trích xuất dữ liệu 3D

**Mức tham vọng trực quan:** Point cloud có ngữ cảnh không gian, camera/depth và kết quả khảo sát

### Đề bài / mục tiêu sản phẩm

Tự xây dựng công cụ khảo sát một point cloud của căn phòng hoặc nhà xưởng, dùng Octree để tìm vùng quan tâm và culling. Người dùng phải lấy được thông tin và xuất dữ liệu đã chọn, không chỉ xem hộp cây.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Di chuyển camera quanh/qua dữ liệu 3D, chọn vùng hộp hoặc cầu, xem count/bounds/centroid và xuất tập điểm. Color theo chiều cao hoặc thuộc tính giúp đọc sàn, tường và vật thể; frustum culling giảm dữ liệu cần vẽ.

### Phạm vi chức năng tối thiểu bắt buộc

- Có ít nhất một dataset phòng/xưởng có cấu trúc, được cung cấp dưới dạng XYZ hoặc CSV với schema và đơn vị công bố. Dữ liệu tổng hợp được phép nếu có hình học rõ, không chỉ random cloud.
- Đọc dataset, giữ ID điểm ổn định và báo lỗi input hỏng; có fixture nhỏ độc lập.
- Octree với AABB node, giới hạn depth/capacity, sphere query, box query và frustum culling.
- Di chuyển/đổi kích thước vùng chọn trong world space; lọc theo khoảng chiều cao hoặc thuộc tính có trong dataset.
- Thống kê count, AABB, centroid của tập đã chọn; export tọa độ và ID ra file theo định dạng đã công bố.
- Brute-force validator và thống kê visited/pruned nodes; layer debug chỉ bật khi cần.

### Quy mô / độ phức tạp tối thiểu

- Dataset nghiệm thu ít nhất 100.000 điểm 3D thật; không thay bằng một minimap hoặc chỉ vẽ hộp node.
- Có dữ liệu đều và dữ liệu tập trung trên bề mặt/cụm để khảo sát ảnh hưởng phân bố; giới hạn file/bộ nhớ rõ.

### Tương tác bắt buộc

- Camera orbit/free-fly, chọn kiểu box/sphere, đổi vị trí/kích thước vùng, lọc và xóa selection.
- Export tập đã chọn, toggle frustum culling và node debug; có reset camera về toàn dataset.

### Mức đồ họa / trình bày tối thiểu

- Perspective, depth cue và point size/color có chủ đích để đọc cấu trúc phòng/xưởng.
- Vùng chọn và thống kê rõ, camera không bị reset khi thay filter; empty selection có thông báo, không tạo NaN centroid.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết Octree build/query, AABB-sphere/box/frustum tests và tính thống kê; không dùng thư viện point-cloud/spatial index thay phần cốt lõi.
- Nếu dùng ray để đặt vùng chọn, giải thích bài cầu nối ray/camera theo Mục 3.3. Presentation vẫn theo giới hạn CPU trước phần OpenGL.

### Không được coi là hoàn thành nếu

- Chỉ có cloud ngẫu nhiên và các hộp debug, không khảo sát hoặc xuất được dữ liệu.
- Dùng culling nhưng không kiểm tra mất điểm tại cạnh frustum/query.
- Bản cuối ít hơn 100.000 điểm hoặc không có camera 3D thật.

### Acceptance Criteria

- Sphere/box query và filter trả đúng tập ID so brute force; kiểm điểm trên biên, trùng vị trí, negative coordinates, node split và tập rỗng.
- Culling không có false negative trên các fixture cạnh/near plane và ảnh so với chế độ không culling tại cùng camera.
- Count/bounds/centroid khớp fixture độc lập; export đọc lại giữ đúng tập ID và tọa độ trong precision công bố.
- Với dataset ít nhất 100.000 điểm, hoàn thành quy trình mở → khảo sát → chọn/lọc → xem thống kê → xuất → đọc lại.
- Báo build/query/culling/render và bộ nhớ riêng; không coi việc giảm điểm trước truy vấn là tăng tốc thuật toán.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 31 — Thiên hà hạt: N-body từ O(N²) đến Barnes–Hut

**Vai trò:** Ứng dụng mô phỏng và thí nghiệm đánh đổi độ chính xác/chi phí

**Mức tham vọng trực quan:** Thiên hà có cấu trúc động, camera và thông tin xấp xỉ

### Đề bài / mục tiêu sản phẩm

Mô phỏng một hệ hấp dẫn nhiều vật thể rồi dùng Barnes–Hut để xấp xỉ ảnh hưởng của các cụm ở xa. Khác grid ở Boids, đây là tương tác xa được tổng hợp theo khối lượng và tâm khối, không phải cắt bỏ mọi vật ngoài một bán kính.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Hệ nhiều nghìn vật thể tạo cụm hoặc đĩa/quỹ đạo theo lực hấp dẫn thật. Người dùng chỉnh theta để quan sát chi phí và sai số lực; chế độ debug chỉ ra node nào được mở hoặc được chấp nhận làm nguồn tổng hợp.

### Phạm vi chức năng tối thiểu bắt buộc

- Position, velocity, mass và gravity solver có softening công bố; integrator/timestep cố định giữa hai mode khi so sánh.
- Direct all-pairs làm reference ở hệ nhỏ hoặc tập đích được chọn; Barnes–Hut có aggregate mass/center of mass và opening criterion.
- Bỏ self interaction; không chấp nhận node chứa chính target như một nguồn tổng hợp. Có giới hạn depth cho vật thể trùng/gần trùng.
- Preset seed tái lập, force-error report tại cùng snapshot; năng lượng/động lượng theo thời gian để phân biệt với integration error.
- Có thể dùng quadtree cho hệ 2D hoặc octree cho hệ 3D, nhưng công bố lựa chọn và không gọi bản 2D là thế giới 3D.

### Quy mô / độ phức tạp tối thiểu

- Bản cuối có preset ít nhất 4.096 vật thể cập nhật bằng gravity thật; reference nhỏ có tối thiểu các ca 2, 3 và 256 vật thể.
- Force-error sweep theo nhiều theta trên snapshot cố định; reference lớn chạy hữu hạn theo ngân sách, không treo UI.

### Tương tác bắt buộc

- Camera pan/zoom hoặc orbit khi 3D, Pause/Reset/single-step, chọn theta và timestep, chọn preset.
- Chọn target hoặc tập mẫu để xem direct force, approximate force và accepted/opened nodes.

### Mức đồ họa / trình bày tối thiểu

- Hạt có color/brightness/size theo đại lượng công bố; có cấu trúc đàn sao đọc được và trails có giới hạn tài nguyên.
- Biểu đồ sai số/chi phí bổ trợ cho simulation, không thay cảnh động.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết tree aggregation/traversal, gravity và integration; không dùng N-body/physics engine.
- Công bố softening, đơn vị hoặc reduced units, cách tính norm và chuẩn hóa sai số khi reference force gần 0.

### Không được coi là hoàn thành nếu

- Dùng quỹ đạo định sẵn/random motion thay gravity.
- Gọi radius cutoff là Barnes–Hut hoặc không có force reference.
- Dùng khác integrator/dt giữa hai mode rồi quy mọi sai khác cho cây.
- Chỉ mô phỏng vài chục vật thể ở bản cuối.

### Acceptance Criteria

- Aggregate mass/center of mass khớp fixture; tree không tự tác động và kết thúc với điểm trùng vị trí.
- Direct force ở hệ hai/ba vật thể khớp tính tay; Barnes–Hut so với direct tại cùng snapshot bằng absolute error và RMS/relative error có mẫu số được công bố.
- Sweep theta cho thấy đánh đổi độ chính xác/chi phí trên các dataset tham chiếu; không yêu cầu sai số hay runtime giảm đơn điệu ở mọi snapshot.
- Thí nghiệm giảm dt giữ theta cố định tách được integration error; giới hạn tolerance không chỉ dựa vào hai quỹ đạo hỗn loạn dài hạn.
- Preset ít nhất 4.096 vật thể, camera, pause/step, seed và benchmark hữu hạn hoạt động; ghi nhận Debug/Release và desktop riêng.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 32 — Đài phun hạt CPU: một triệu particle với AoS và SoA

**Vai trò:** Ứng dụng hệ hạt và thí nghiệm bố trí bộ nhớ; không phụ thuộc N-body

**Mức tham vọng trực quan:** Đài phun động, vòng đời hạt rõ và benchmark có thể giải thích

### Đề bài / mục tiêu sản phẩm

Tự xây dựng đài phun hạt CPU có emission, gravity, lifetime và tái sử dụng hạt. Lưu cùng state bằng AoS và SoA để đo cách truy cập dữ liệu ảnh hưởng tới chi phí cập nhật; không mặc định một layout luôn thắng.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Hạt được phát ra, bay, hết thời gian sống và được tái sử dụng. Người dùng chuyển layout/workload mà không đổi mô hình; thấy số hạt thực sự được cập nhật, throughput và chi phí render tách riêng.

### Phạm vi chức năng tối thiểu bắt buộc

- Particle có ID/slot ổn định, position, velocity, age/lifetime và thuộc tính hiển thị; có emitter, gravity và quy tắc respawn theo seed.
- Hai container AoS/SoA cùng mô hình, precision và thứ tự ngẫu nhiên theo ID/bước; chuyển layout bảo toàn state.
- Có workload cập nhật một nhóm field và workload cập nhật đầy đủ vòng đời; tránh kết luận từ một access pattern duy nhất.
- Benchmark Release có warm-up, nhiều lần lặp, checksum/kết quả quan sát được để tránh dead-code elimination; công bố flags và mọi khác biệt vectorization.
- Vẽ đài phun và số đo update/render/toàn frame. Nếu vẽ subset, công bố số được vẽ riêng, không giảm số được mô phỏng.

### Quy mô / độ phức tạp tối thiểu

- Có preset một triệu hạt sống được cập nhật trên CPU ở mỗi bước nghiệm thu; không chỉ cấp phát một triệu record rồi cập nhật vài nghìn.
- Preset nhỏ để debug vòng đời, preset lớn để đo; không yêu cầu một FPS cố định trên mọi CPU.

### Tương tác bắt buộc

- Pause/Reset/single-step, đổi AoS/SoA, chọn workload/N, điều chỉnh emitter/gravity/lifetime và chạy/hủy benchmark.
- Quan sát số alive/updated/rendered, thời gian và lượng bộ nhớ từng container.

### Mức đồ họa / trình bày tối thiểu

- Đài phun có hướng phát và quỹ đạo/lifetime nhìn được qua color/size; không dùng mảng số hoặc bảng benchmark làm toàn bộ sản phẩm.
- Sampling hiển thị nếu có phải tái lập và được ghi rõ; luôn giữ chương trình phản hồi.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết container, loop cập nhật, vòng đời và benchmark; giữ thuật toán tương đương, không trộn đổi layout với đổi solver.
- Baseline một luồng CPU, không cần thread pool 75. Không dùng OpenGL/compute để cập nhật hoặc né phần presentation CPU trước 33.

### Không được coi là hoàn thành nếu

- Chỉ benchmark một phép cộng trên struct không có ứng dụng hệ hạt.
- Khác seed/precision/công việc giữa hai bản hoặc tính render/copy cho chỉ một bản.
- Tuyên bố SoA luôn nhanh hơn, hoặc chỉ cấp phát mà không cập nhật đủ một triệu hạt.
- Chỉ có Canvas hoặc throughput in console.

### Acceptance Criteria

- Fixture nhỏ kiểm emission, gravity, age, hết lifetime và respawn; không có hạt rò rỉ slot hoặc sinh NaN/Inf.
- AoS/SoA cùng snapshot/seed/dt cho state/checksum tương đương theo tolerance; round-trip layout giữ các field.
- Tại preset một triệu hạt sống, công bố số updated thực tế và dung lượng; kết quả benchmark phải được sử dụng và đối chiếu.
- Báo median/độ phân tán cho cả workload ít field và toàn state; tách conversion, update, render và thời gian toàn bước.
- Giữ các kết quả không có speedup; ghi cấu hình máy/build, giới hạn phép đo và quy trình tái lập.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---


# PHẦN VI — OPENGL, GLSL VÀ GRAPHICS PIPELINE TRÊN GPU

## Project 33 — Vẽ lại tam giác cũ bằng GPU và đối chiếu từng bước với renderer CPU

**Vai trò:** Bài thí nghiệm chuyển tiếp CPU → GPU

**Mức tham vọng trực quan:** Foundation GPU / đối chiếu pipeline rõ ràng

### Đề bài / mục tiêu sản phẩm

Render cùng triangle bằng OpenGL và map từng stage GPU với code CPU đã viết.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

CPU triangle và GPU triangle chạy cạnh nhau hoặc toggle.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- SDL3 window có OpenGL context.
- CPU triangle và GPU triangle để so.
- Shader source tự viết.

### Quy mô / độ phức tạp tối thiểu

- Cùng input triangle/camera conventions.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Toggle CPU/GPU hoặc split-view.

### Mức đồ họa / trình bày tối thiểu

- Tam giác đủ lớn, có nhãn vertex và viewport tương ứng; có thể kéo vertex/đổi màu để so hai pipeline trên cùng input.
- Có bảng tọa độ/coverage hoặc chế độ difference cho fixture. Không cần thêm camera/lighting không liên quan vào bài chuyển tiếp.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Shader loader tối thiểu
- OpenGL setup
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Bỏ software renderer cũ và chỉ vẽ GPU.
- Dùng engine abstraction che pipeline.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Cùng input cho hình tương đương theo quy tắc coverage/color đã công bố; kiểm vertex ở clip/NDC/screen, resize/aspect và winding.
- Fixture xác định trước kiểm các pixel nằm trong tam giác; khác biệt pixel cạnh do fill rule/precision phải được giải thích và có giới hạn, không dùng ảnh nhìn giống làm bằng chứng duy nhất.
- Giải thích GPU thay phần nào của CPU pipeline.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 34 — Một model viewer, hai renderer CPU và GPU

**Vai trò:** Nâng cấp model viewer Project 21; so sánh hai backend trên cùng dữ liệu

**Mức tham vọng trực quan:** Mesh thực có camera, depth, culling và frame statistics

### Đề bài / mục tiêu sản phẩm

Chuyển model viewer CPU đã xây sang OpenGL, giữ chung Mesh, Camera, Math và state ứng dụng. Người dùng chọn backend để hiểu GPU thay phần nào của pipeline và đo chi phí tương ứng.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Cùng mô hình OBJ có thể xoay, xem bằng CPU hoặc GPU mà không đổi tư thế camera/object. Depth/culling và chế độ shading tương ứng có thể đối chiếu; khối lập phương chỉ là fixture debug, không phải toàn bộ sản phẩm cuối.

### Phạm vi chức năng tối thiểu bắt buộc

- Tái dùng loader/dataset và cấu trúc scene từ 21; không viết hai application tách rời.
- Backend CPU giữ transform/clipping/raster/depth; backend GPU có vertex/index buffers, shader, uniforms và depth/culling đúng.
- Ít nhất hai mesh từ viewer 21, gồm một mesh nhiều nghìn triangle; có cube nhỏ để tìm lỗi convention.
- Camera/object transform, resize, viewport/aspect, light/shading và lựa chọn mesh là state chung.
- Frame statistics tách CPU preparation/submission, GPU execution khi đo được và presentation; không ép hai bộ đo không tương đương thành một speedup.

### Quy mô / độ phức tạp tối thiểu

- Giữ khả năng xem mesh thực của 21, không giảm về một cube sau khi chuyển GPU.
- Cùng input/convention cho hai backend; công bố khác biệt hợp lệ do rasterization/precision và định nghĩa phép so.

### Tương tác bắt buộc

- F1 CPU/F2 GPU hoặc toggle rõ; đổi mesh, orbit/pan/zoom, reset camera, depth/culling và debug normals/wireframe nếu chế độ tương ứng được chọn.
- Chuyển backend khi đang quan sát không reset scene hoặc làm input mất tác dụng.

### Mức đồ họa / trình bày tối thiểu

- Model đủ lớn trong viewport, depth/lighting giúp đọc hình; debug convention và chế độ xem sạch đều sử dụng được.
- Không trang trí scene để che clipping/culling sai; stats không che mô hình chính.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết GPU mesh wrapper, shader/uniform handling và phép đối chiếu; không dùng engine che backend.
- Shared state tách khỏi resource theo backend; cleanup/resize/switch không rò tài nguyên hoặc tạo state lệch.

### Không được coi là hoàn thành nếu

- Hai demo có camera/mesh state riêng hoặc CPU renderer cũ bị bỏ.
- Chỉ có cube và bỏ model viewer/mesh thật.
- Chỉ so FPS mà không giải thích khác biệt công việc hoặc không có kiểm chứng convention.

### Acceptance Criteria

- Tại cùng snapshot, các vertex mẫu có clip/NDC/screen và depth nhất quán trong tolerance; chỉ rõ origin, handedness, winding và depth range.
- So ảnh fixture ở vùng nội thất tam giác và mặt trước/sau bằng quy tắc coverage/color/depth đã công bố; không yêu cầu mọi pixel cạnh giống bit nếu quy tắc raster khác nhau.
- Hai mesh thực hoạt động ở cả backend; switch ít nhất 20 lần rồi resize, đổi mesh và kiểm tài nguyên.
- Camera/shading/culling state không reset khi switch; benchmark dùng cùng scene, resolution và cấu hình sync/VSync.
- Ghi riêng kết quả build/tests, desktop và phép đo phần cứng.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3; bản cuối phải đạt đầy đủ hợp đồng sản phẩm này. Source C++/SDL3 chạy độc lập; Canvas chỉ hỗ trợ học và kiểm chứng.

---

## Project 35 — Phòng thí nghiệm shader: sửa GLSL và thấy kết quả ngay

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Làm app hot-reload shader, truyền time/resolution/mouse và tạo gallery effect.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Compile/reload nhanh; lỗi shader hiện rõ; có gradient/circle/Mandelbrot/noise toy.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Fullscreen shader playground.
- Hot reload GLSL.
- Uniform time/resolution/mouse.
- Compile errors hiển thị.

### Quy mô / độ phức tạp tối thiểu

- Gallery ít nhất 4 effects.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Reload key; mouse input; chọn shader.

### Mức đồ họa / trình bày tối thiểu

- Demo GPU phải chạy real-time và có chất lượng trình bày xứng đáng với việc chuyển sang GPU: viewport lớn, chuyển động mượt, depth/lighting/color rõ ràng.
- Shader project phải có ít nhất một chế độ 'showcase' sạch bên cạnh debug mode.
- Không chấp nhận chỉ render tam giác/cube rất nhỏ ở giữa cửa sổ mà không có camera, nền hoặc context trực quan phù hợp với đề bài.
- Shader gallery phải có ít nhất 4 effect có chuyển động/tham số rõ ràng; fullscreen rendering, không chỉ một quad nhỏ.
- Hot reload phải giữ ứng dụng chạy và hiển thị lỗi compile trong overlay/log dễ đọc.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Shader loader
- Compile/link logger
- Reload trigger
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ một shader hard-code trong C++.
- Không báo compile errors.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Lỗi compile/link chỉ rõ file/dòng hoặc log tương ứng; shader hỏng không thay program tốt đang dùng và có thể sửa/reload tiếp mà không restart.
- Giữ gallery ít nhất bốn hiệu ứng theo phạm vi đã nêu, nhưng tất cả chạy trong cùng công cụ; resize/time/mouse uniforms và cleanup có test/checklist riêng.
- Compile error hữu ích.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 36 — Căn phòng hình khối không mesh: ray-march sphere, box và torus

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Mỗi pixel tự phát ray và dùng signed distance field để tìm bề mặt.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Scene 3D procedural với camera, normal, lighting và step-count heatmap.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 3D procedural SDF scene nhìn bằng camera.
- Sphere, box, torus tối thiểu.
- Normal + lighting + step heatmap.

### Quy mô / độ phức tạp tối thiểu

- Ray march per pixel in fragment shader.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera move/look; parameter controls.

### Mức đồ họa / trình bày tối thiểu

- Demo GPU phải chạy real-time và có chất lượng trình bày xứng đáng với việc chuyển sang GPU: viewport lớn, chuyển động mượt, depth/lighting/color rõ ràng.
- Shader project phải có ít nhất một chế độ 'showcase' sạch bên cạnh debug mode.
- Không chấp nhận chỉ render tam giác/cube rất nhỏ ở giữa cửa sổ mà không có camera, nền hoặc context trực quan phù hợp với đề bài.
- Scene ray-march phải có nhiều primitive phối hợp thành một scene, không phải chỉ một sphere.
- Có camera di chuyển, lighting, shadow/ambient đơn giản hoặc normal-based shading đủ để hình khối đọc rõ.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- SDFs
- Ray marcher
- Normal estimate
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Mesh sphere/box thay ray marching.
- Chỉ 2D signed-distance art.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Ray-sphere có nghiệm giao giải tích để đối chiếu hit distance; ray miss, tiếp tuyến/gần bề mặt và camera trong vật thể có chính sách rõ.
- Giới hạn max steps/distance/hit epsilon công bố; kiểm ảnh hưởng epsilon và sai số normal, phân biệt tìm bề mặt SDF với tích lũy mật độ ở 54.
- Có max steps/distance.
- Phân biệt SDF ray marching với general ray tracing.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN VII — GPU COMPUTE VÀ HÀNG TRIỆU PHẦN TỬ

Sau phần OpenGL, người học đã biết GPU tạo ra hình ảnh như thế nào. Ở phần này, GPU còn giữ và cập nhật dữ liệu của ứng dụng. Ta bắt đầu bằng phép tính có đáp án dễ kiểm, dùng compute để dựng buồng hạt, lọc dữ liệu cho một thành phố lớn và giải biến dạng/tiếp xúc của tấm vải.

Bốn project trả lời bốn câu hỏi khác nhau. Quy mô lớn dùng để kiểm khả năng mở rộng; tăng số phần tử không tự tạo ra một mục tiêu học tập mới.

| Project | Câu hỏi chính | Sản phẩm và khả năng mới |
| --- | --- | --- |
| 37 — Máy tính vector trên GPU | Làm sao biết GPU tính đúng và việc truyền dữ liệu tốn bao nhiêu? | Workbench đối chiếu CPU/GPU, vòng đời compute và phạm vi từng phép đo |
| 38 — Buồng hạt tích điện 3D | Làm sao giữ trạng thái qua nhiều bước rồi vẽ trực tiếp kết quả GPU đang cập nhật? | Quỹ đạo trong điện trường/từ trường, camera 3D và phép kiểm chuyển động |
| 39 — Khám phá thành phố 3D | Làm sao chọn vật thể và dựng lệnh vẽ cho một scene triệu object ngay trên GPU? | Frustum culling, reduction/scan và compaction nối trực tiếp vào cảnh có thể đi xuyên qua |
| 40 — Xưởng vải 3D | Làm sao một bề mặt nhiều đỉnh phản ứng với kéo, ghim và va chạm mà không có race? | Constraint solver, grid/contact, mesh normals và rendering từ state biến dạng |

Tuyến chính là 37 → 38 → 39 → 40. Khi học riêng, 39 có thể bắt đầu từ 37 và nền graphics 34 với khung nhiều pass được cung cấp; kiến thức điện từ của 38 không phải prerequisite ngầm. Project 38 cần vector/cross, camera 3D và timestep; mô hình lực/Boris được giải thích tại chỗ. Project 40 tái sử dụng scan ở 39, chuẩn bị constraint/contact từ nền 25 và grid từ 28 hoặc fixture cầu nối; luật Boids không phải điều kiện để học mô phỏng vải. Mỗi gói source vẫn chạy độc lập.

## Project 37 — Máy tính vector 1 triệu phần tử trên GPU

**Vai trò:** Bài thí nghiệm vòng đời compute, đối chiếu kết quả và đo chi phí

**Mức tham vọng trực quan:** Dashboard đọc được input/output, cấu hình và ba phạm vi đo

### Đề bài / mục tiêu sản phẩm

Tự xây dựng một máy tính vector chạy trên CPU và GPU với Add, AXPY (`s*A+B`) và Difference. Người dùng chọn phép toán, kích thước mảng và scalar, kiểm kết quả rồi so thời gian trên cùng dữ liệu.

Câu hỏi chính không phải GPU có thể vẽ bao nhiêu điểm, mà là làm sao giao việc cho GPU, biết công việc đã hoàn tất và chứng minh kết quả đúng. Đây là nền để giữ state trên GPU ở 38 và nối nhiều pass ở 39–40; không cần dựng thêm một particle scene không liên quan.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một workbench có bảng CPU/kernel/end-to-end theo N và inspector đọc đủ các thành phần của A, B, CPU output, GPU output. Người dùng phân biệt được cấu hình đang chọn với cấu hình đã đo; đổi lựa chọn chưa được làm số đo cũ mang nhãn cấu hình mới.

Ứng dụng báo tiến độ và kết quả validation, không chỉ in milliseconds lên console. Phép đo chỉ được công bố khi đủ mẫu và thuộc đúng cấu hình của lượt chạy.

### Phạm vi chức năng tối thiểu bắt buộc

- Compute shader thực hiện các phép toán trên mảng; CPU reference dùng cùng input, scalar và precision đã công bố.
- Tự tổ chức upload → dispatch → đồng bộ → readback → validation. Kiểm toàn bộ output của lượt chạy, không chỉ vài phần tử được vẽ.
- Benchmark nhiều N, có warm-up, nhiều mẫu và min/median/max hoặc một cách biểu diễn độ phân tán tương đương.
- Tách CPU loop time, GPU kernel time và end-to-end upload/dispatch/readback; giải thích phần nào nằm trong từng khoảng đo.
- Mỗi job giữ cấu hình/seed riêng, có deadline và hủy. Không trộn mẫu của hai phép toán hoặc hai N trong một hàng kết quả.
- Inspector đọc từ kết quả đã công bố; validation thất bại, timeout hoặc hủy không được trở thành kết quả hoàn tất.

### Quy mô / độ phức tạp tối thiểu

- Có ít nhất một preset từ một triệu phần tử được GPU tính và kiểm thật, cùng preset nhỏ và N không chia hết workgroup.
- Công bố layout/stride, dung lượng các buffer, giới hạn phần cứng và ngân sách ứng dụng trước cấp phát.
- Preset nhỏ là bước học và debug, không thay mốc nghiệm thu. Không hứa một speedup hoặc FPS chung cho mọi máy.

### Tương tác bắt buộc

- Chọn operation, N, scalar và seed; chạy một lượt hoặc benchmark hữu hạn, xem tiến độ và hủy.
- Duyệt inspector theo index, tới đầu/cuối và đọc đủ các thành phần.
- Phân biệt rõ cấu hình SELECTED với MEASURED; khi busy phải khóa hoặc hủy cấu hình cũ theo quy tắc đã giải thích.

### Mức đồ họa / trình bày tối thiểu

- Bảng kết quả có N, đơn vị, số warm-up/mẫu và độ phân tán. Màu và biểu đồ không được thay cho số liệu có nhãn.
- Input/output, sai số, first mismatch và trạng thái phần cứng tìm được trong cửa sổ.
- Cửa sổ phản hồi trong khi đo; không ép bài thí nghiệm thành một showcase particle để che thiếu dữ liệu kiểm chứng.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết compute wrapper, shader, CPU reference, validation và benchmark/job lifecycle.
- Kiểm giới hạn dispatch/storage, layout và tail trước khi coi workload là hợp lệ.
- Giữ pending timer query tới lúc có kết quả hoặc hủy; không đo thời gian enqueue trên CPU rồi gắn nhãn GPU kernel time.
- Không dùng fragment shader, thư viện vector compute hoặc kết quả đã tính sẵn thay phần compute.

### Không được coi là hoàn thành nếu

- Chỉ dispatch rồi vẽ vài cột, không kiểm toàn bộ output hoặc không có CPU reference.
- Số đo không tách upload/readback khỏi kernel, không có warm-up/mẫu lặp hoặc trộn cấu hình.
- Chỉ cấp phát một triệu phần tử nhưng không tính/kiểm đủ; chỉ có console, ảnh chụp hoặc Canvas thay executable.
- Tuyên bố GPU luôn nhanh hơn và bỏ những trường hợp GPU không có lợi.

### Acceptance Criteria

- Fixture độc lập chứa số 0, số âm, các thành phần khác nhau và scalar biết trước; cả ba phép toán khớp CPU theo absolute/relative tolerance công bố.
- Có N nhỏ, N không chia hết workgroup và preset ít nhất một triệu. Kiểm phần đuôi, phần tử chưa được ghi, NaN/Inf và input không bị ghi đè.
- Validation nêu index/component sai đầu tiên và sai số lớn nhất; không dùng inspector vài phần tử thay phép kiểm toàn output.
- Đổi SELECTED không sửa dữ liệu MEASURED; chạy lại công bố kết quả đúng generation. Hủy/timeout không giữ một hàng thiếu mẫu dưới nhãn hoàn tất.
- Bảng có CPU, GPU kernel và end-to-end với cùng workload, warm-up và độ phân tán; ghi cấu hình máy/build và giữ cả kết quả không có speedup.
- Trigger, hủy và inspector hoạt động trong ứng dụng C++/SDL3. Bản nhỏ, Canvas và ảnh dashboard không thay cho executable đúng quy mô.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài, checkpoint và cách giải thích theo Mục 3. Đi từ CPU reference có đáp án biết trước tới một lượt compute rồi mới benchmark; không thu nhỏ sản phẩm để vừa một khuôn bài học. Source C++/SDL3 chạy độc lập; Canvas hỗ trợ quan sát đường dữ liệu, không tạo số đo GPU giả.

---

## Project 38 — Buồng hạt tích điện 3D: quỹ đạo trong điện trường và từ trường

**Vai trò:** Ứng dụng compute có trạng thái lâu dài và rendering trực tiếp từ GPU

**Mức tham vọng trực quan:** Buồng quan sát 3D với hàng triệu hạt, quỹ đạo đọc được và inspector có kiểm chứng

### Đề bài / mục tiêu sản phẩm

Tự xây dựng một mô phỏng 3D trong đó các hạt chuyển động dưới tác dụng của điện trường và từ trường cho trước. Đổi dấu điện tích, hướng trường hoặc vận tốc ban đầu phải làm quỹ đạo thay đổi theo mô hình, không chỉ đổi màu hay góc nhìn.

Compute shader cập nhật vị trí và vận tốc qua nhiều bước; renderer đọc trực tiếp state đang nằm trên GPU. Người học dùng thí nghiệm một hạt để hiểu chuyển động, kiểm bằng nghiệm tham chiếu, rồi mở rộng cùng kernel tới hàng triệu hạt.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một buồng quan sát có trục/mốc không gian, hướng E/B, camera orbit/pan/zoom và các hạt mang hai dấu điện tích. Các preset cho thấy chuyển động thẳng khi không có trường, quỹ đạo tròn hoặc xoắn khi chỉ có từ trường đều, và chuyển động gia tốc khi chỉ có điện trường đều.

Có thể chọn một số ít hạt để xem state, sai số và vệt quỹ đạo. Góc nhìn thể hiện chiều sâu thật; một nhóm hạt nhiều màu trên mặt phẳng không đáp ứng sản phẩm 3D.

### Phạm vi chức năng tối thiểu bắt buộc

- Mô hình phi tương đối tính: `dx/dt = v`, `dv/dt = (q/m) * (E + v × B)`, với khối lượng dương và trường ngoài cho trước. Công bố đơn vị hoặc hệ chuẩn hóa cùng miền tham số.
- Hạt có ID/slot ổn định, position, velocity và q/m hoặc dữ liệu tương đương. Khởi tạo từ snapshot/seed tái lập được; hai dấu điện tích cùng quan sát được.
- Tự viết Boris pusher phi tương đối tính trên CPU và GLSL. Giải thích lực phụ thuộc vận tốc, cách chia bước và mốc thời gian của state trước khi dùng integrator.
- Bốn preset chuẩn: E=B=0; E=0 và v vuông góc B đều; E=0 và v có cả thành phần song song/vuông góc B đều; B=0 và E đều khác 0.
- State tồn tại trên GPU qua nhiều dispatch. Graphics đọc trực tiếp buffer GPU; không tính lại toàn bộ trên CPU hoặc readback toàn bộ state mỗi frame.
- Có bounds guard, kiểm layout, barrier theo consumer và validation readback hữu hạn. Tách thời gian update, draw và toàn frame.
- Preset kiểm quỹ đạo không có biên phản xạ hoặc respawn làm đổi nghiệm. Hạt ra khỏi vùng camera vẫn tồn tại và được cập nhật; Reset khôi phục snapshot/seed.
- Chỉ lưu vệt quỹ đạo cho subset có giới hạn. Trường đều là phạm vi bắt buộc; emitter, va chạm, trường biến thiên và tương tác giữa các hạt không phải yêu cầu hoàn thành.

### Quy mô / độ phức tạp tối thiểu

- Bắt buộc có ít nhất một triệu hạt thật được cập nhật trên GPU ở mỗi bước nghiệm thu; năm triệu là mốc mở rộng riêng theo RAM/VRAM và giới hạn driver.
- Có preset nhỏ để xem quỹ đạo/đối chiếu CPU và preset lớn để kiểm khả năng mở rộng. Không dùng preset nhỏ thay mốc một triệu.
- Công bố allocated/updated/drawn, dung lượng state, buffers phụ và lịch sử quỹ đạo; mọi sampling hiển thị phải được ghi rõ, không giảm số được cập nhật.
- Kiểm capability, phép nhân kích thước, buffer/workgroup limits và ngân sách trước cấp phát. Máy không đủ tài nguyên phải báo rõ mốc chưa kiểm chứng, không âm thầm giảm N rồi ghi đã đạt.

### Tương tác bắt buộc

- Chọn preset, N/seed, vận tốc ban đầu, hướng/độ lớn E/B và dấu hoặc tỉ số q/m trong miền hợp lệ.
- Chọn hạt, bật/tắt vệt quỹ đạo của subset và đọc position/velocity cùng sai số với reference khi có.
- Pause/Reset/single-step; camera orbit/pan/zoom vẫn hoạt động khi Pause.
- Chạy/hủy validation hoặc benchmark theo batch hữu hạn. Đổi trường khi chạy có mốc áp dụng rõ; không trộn các cấu hình trong một phép đo.

### Mức đồ họa / trình bày tối thiểu

- Không gian X/Y/Z và perspective thật, có mốc giúp phân biệt quay camera với quỹ đạo đổi hướng.
- Màu theo dấu điện tích hoặc tốc độ có chú giải; point size/depth/opacity phải giúp đọc hình ở mật độ cao, không biến cảnh thành một mảng sáng bệt.
- Vệt của một số hạt được chọn đủ để nhận ra đường thẳng, đường tròn và đường xoắn. Không cấp phát lịch sử dài cho cả triệu hạt chỉ để có trails.
- Chế độ quan sát sạch ưu tiên quỹ đạo; chế độ debug cho xem E/B, state, sai số và profiler. Controls và giới hạn tài nguyên vẫn tìm được khi tắt overlay.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết force/update, CPU reference, Boris pusher, particle layout, compute kernel, renderer và validator. Không dùng particle/physics engine thay phần cốt lõi.
- Nêu rõ position/velocity được lưu ở cả bước hay nửa bước và chuyển về cùng mốc khi so reference. [Tài liệu BorisIntegrator của PlasmaPy](https://docs.plasmapy.org/en/stable/api/plasmapy.simulation.particle_integrators.BorisIntegrator.html) là tài liệu tham khảo về hợp đồng thời gian, không phải dependency của source tải về.
- Công bố fixed timestep, cách giới hạn catch-up và miền tham số an toàn; không lấy việc quỹ đạo còn nằm trên màn hình làm bằng chứng bước thời gian đúng.
- Đây là các hạt độc lập trong trường ngoài: không giải Maxwell/Poisson, không tính Coulomb giữa hạt và không gọi sản phẩm là plasma tự nhất quán hoặc máy gia tốc thực.
- Không thay bằng tracer chỉ đi theo một trường vận tốc có sẵn như ở Project 48. Ở đây velocity là state được lực cập nhật.

### Không được coi là hoàn thành nếu

- Chỉ đổi màu, shader hoặc camera của một đài phun rồi gọi đó là buồng hạt tích điện.
- Dùng đường tròn/đường xoắn hard-code theo thời gian thay bước cập nhật từ mô hình lực.
- CPU cập nhật rồi upload mỗi frame, hoặc hàng triệu điểm chỉ được vẽ mà không cập nhật đủ state.
- Chỉ có mô phỏng 2D, Canvas, ảnh/video hoặc preset nhỏ hơn một triệu hạt ở sản phẩm cuối.
- Có chỉ số năng lượng/tốc độ nhưng không kiểm quỹ đạo, sai số pha, timestep và mốc thời gian của reference.

### Acceptance Criteria

- E=B=0 khớp nghiệm chuyển động thẳng; B=0, E đều khớp chuyển động gia tốc đều sau khi căn cùng mốc position/velocity với reference.
- Với E=0, B đều khác 0, kiểm chiều quay khi đổi dấu q, thành phần vận tốc song song B và độ lớn vận tốc. Đối chiếu quỹ đạo tròn/xoắn với nghiệm tham chiếu trong sai số đã công bố.
- Thí nghiệm giảm dt ở cùng thời điểm quan sát cho thấy sai số quỹ đạo/pha được kiểm soát; tốc độ gần như không đổi một mình chưa đủ chứng minh quỹ đạo đúng.
- CPU/GPU cùng snapshot và lịch bước khớp position/velocity trong tolerance. Phép đối chiếu CPU mirror không thay các nghiệm độc lập ở trên.
- Fixture có N nhỏ, N không chia hết workgroup, v=0, B=0 và input không hữu hạn hoặc khối lượng không hợp lệ; xử lý rõ ràng, không truy cập ngoài buffer hoặc coi NaN/Inf là kết quả đúng.
- Tại mốc ít nhất một triệu, cập nhật state thật trên GPU rồi render từ state ấy, không full-buffer readback mỗi frame. Ghi riêng kết quả thử năm triệu, bộ nhớ, timings và cấu hình máy.
- Đổi camera không sửa state; chọn hạt đọc đúng ID; Pause/single-step/reset và giới hạn lịch sử quỹ đạo hoạt động. Đổi N/cấu hình lỗi không phá kết quả đang hợp lệ.
- Có executable C++/SDL3 hoàn chỉnh, source checkpoint, tests và hướng dẫn kiểm hữu hạn. Không dùng benchmark/build hoặc Canvas thay kiểm tương tác và quy mô native.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài và checkpoint. Giải thích mô hình lực, cross product đang dùng và mốc thời gian trên một hạt trước khi chuyển lên GPU; không giấu kiến thức điện từ hoặc Boris trong scaffold chưa giải thích. Có thể dùng kiến thức timestep ở 23 hoặc cung cấp cầu nối tại chỗ. Source C++/SDL3 chạy độc lập; Canvas giúp dự đoán quỹ đạo, không thay bản GPU đúng quy mô.

---

## Project 39 — Khám phá thành phố 3D với một triệu vật thể

**Vai trò:** Ứng dụng graphics có bước lọc dữ liệu và dựng lệnh vẽ trên GPU

**Mức tham vọng trực quan:** Thành phố 3D có thể đi xuyên qua, cảnh dày và chế độ quan sát vùng nhìn

### Đề bài / mục tiêu sản phẩm

Tự xây dựng một trình khám phá thành phố 3D gồm ít nhất một triệu vật thể/instance được tạo từ seed. Khi camera di chuyển, GPU xác định những vật thể có bounding volume giao vùng nhìn, tạo danh sách ID cần vẽ và điền lệnh vẽ từ kết quả ấy.

Reduction và prefix sum là công cụ bên trong ứng dụng: gom thống kê, tính offsets rồi compact danh sách ID. Người học thấy lợi ích và chi phí của chúng ngay trong cùng cảnh, không chỉ xuất một tổng hay một mảng prefix.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một thành phố có đường, khối nhà với độ cao/hình dáng khác nhau, vật liệu và mốc định hướng. Người dùng đi ở tầm đường phố hoặc bay lên để quan sát các khu; camera không bị khóa quanh một mô hình đơn lẻ.

Bật/tắt GPU culling trên cùng snapshot để so số instance gửi đi vẽ và thời gian từng pass. Chế độ debug giữ một camera quan sát phụ hoặc ảnh frustum để thấy vật thể được nhận/loại khi camera chính quay. Vật thể không biến mất chỉ vì thay đổi thứ tự compaction.

### Phạm vi chức năng tối thiểu bắt buộc

- Sinh cảnh tái lập từ seed, có vị trí, kích thước, mesh/material ID, bounding volume và object ID ổn định. Có thể tạo scene một lần trên CPU; bước lọc và danh sách/lệnh vẽ mỗi frame phải do GPU tạo.
- Graphics dùng instancing với nhóm mesh được cung cấp hoặc tự dựng. Một triệu vật thể là một triệu instance có dữ liệu riêng, không phải số tam giác hoặc số pixel trên ảnh.
- Pipeline GPU có bounds/frustum test → visibility mask/counts → reduction/scan → compact visible IDs → indirect draw commands → draw.
- Tự viết sum/min/max reduction và hierarchical exclusive scan qua nhiều workgroup. Dùng số nguyên cho counts/offsets/ID; dữ liệu float và tolerance được kiểm riêng khi tính thống kê khoảng cách/bounds.
- Renderer đọc visible IDs và object data trên GPU. Không đọc mask về CPU để lọc hoặc tính instanceCount mỗi frame; không tạo một draw call từ CPU cho mỗi vật thể.
- Có thống kê count và min/max khoảng cách của tập được nhận, với quy tắc rõ khi tập rỗng; debug cho xem mask, prefix, ID và command của một fixture nhỏ.
- So culling on/off trên cùng scene/camera/build, có warm-up và mẫu lặp hữu hạn. Tách cull, scan/compaction, command generation, draw và toàn frame; giữ cả ca overhead compute không có lợi.
- Bounding-volume frustum culling là phạm vi bắt buộc, không đồng nghĩa occlusion culling. Vật thể trong frustum vẫn có thể bị vật thể khác che; occlusion/LOD/streaming là mở rộng, không phải prerequisite giấu trong source.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất một triệu object records thật nằm trong scene và được bước culling xử lý ở mỗi frame nghiệm thu. Cảnh có vùng thưa/dày và camera khiến tập nhận thay đổi rõ.
- Preset nhỏ kiểm từng ID và preset N không chia hết workgroup. Không cấp phát một triệu record rồi chỉ xét vài nghìn.
- Công bố resident/tested/accepted/submitted, dung lượng object/visibility/scan/command buffers và số draw command. Accepted theo bounding volume không phải số vật thể có pixel cuối cùng trên màn hình.
- Scene generation phải có ngân sách và tiến độ hữu hạn. Kiểm RAM/VRAM, kích thước scratch và limits trước cấp phát; không hứa FPS chung.

### Tương tác bắt buộc

- Camera di chuyển tự do ở tầm phố và góc nhìn trên cao; đổi FOV, culling on/off, preset N/seed.
- Bật chế độ xem frustum/accepted/rejected, chọn object để đọc ID, bounds và lý do được nhận/loại.
- Chạy/hủy validation và benchmark trên camera path tái lập được; Reset trở về cùng scene/camera.
- Đổi seed/N có thể thất bại an toàn, không phá scene đang hợp lệ hoặc khóa cửa sổ trong một batch vô hạn.

### Mức đồ họa / trình bày tối thiểu

- Thành phố 3D có perspective/depth, ánh sáng cơ bản, đường/quảng trường và hình khối đủ đa dạng để định hướng; không thay bằng mảng điểm, minimap hoặc một triệu cube cùng màu xếp kín nền.
- Chế độ quan sát sạch ưu tiên khám phá cảnh; chế độ debug thể hiện trực tiếp quan hệ giữa frustum và danh sách được vẽ.
- Có chú giải cho tested/accepted/submitted và timings; số liệu bổ trợ cho cảnh đang tương tác, không thay viewport bằng dashboard.
- Với cùng camera, culling bật/tắt phải giữ nội dung hình học đáng lẽ xuất hiện. Hiệu ứng hậu kỳ/ánh sáng không được che lỗi mất vật thể.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết frustum/bounds test, reduction, scan, compaction, command generation và renderer instancing; không dùng scene/visibility engine thay phần cốt lõi.
- Dùng lệnh indirect phù hợp OpenGL 4.3; có thể giữ số command cố định theo nhóm mesh và cho GPU ghi instanceCount. Không mặc định API đọc draw-count của OpenGL 4.6 đã có.
- Công bố consumer của từng buffer. Khi compute ghi cả indirect command và dữ liệu shader sẽ đọc, phải xử lý cả visibility của command lẫn dữ liệu, không chỉ đặt một workgroup barrier. Tham khảo [glDrawElementsIndirect](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDrawElementsIndirect.xml) và [glMemoryBarrier](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glMemoryBarrier.xml).
- Scan không đi qua CPU giữa các mức. Integer offsets phải exact và không overflow; atomic/scatter nếu dùng không được làm mất/trùng object ID.
- Giải thích hoặc công bố scaffold camera, mesh và picking. Không yêu cầu ngầm học occlusion, voxel streaming hoặc một engine scene graph trước khi bắt đầu.

### Không được coi là hoàn thành nếu

- Chỉ có dashboard reduction/scan hoặc một ảnh thành phố, không có scene 3D khám phá được.
- CPU lọc danh sách, tính số instance hoặc phát một draw call cho từng object rồi gọi đó là GPU-driven rendering.
- Không thực sự xét đủ một triệu object, không xử lý nhiều workgroup, hoặc scan/compaction chỉ nằm trong bài tập tùy chọn.
- Lọc sai object nhưng giấu bằng fog/LOD, không có reference hoặc nhầm frustum culling với loại mọi vật thể bị che.
- Chỉ đổi tên workbench cũ mà không xây renderer, camera và đường dữ liệu từ visible IDs tới draw command.

### Acceptance Criteria

- Fixture độc lập kiểm các bounds ở trong/ngoài/cắt từng plane của frustum; có empty set, all-visible, ID rời rạc và N không chia hết workgroup. GPU mask khớp CPU trên toàn preset nhỏ và sample tái lập của preset lớn.
- Reduction/scan có fixture N=0/1, N lẻ và nhiều mức. Sum/min/max số nguyên khớp exact trên miền không overflow; float có reference/tolerance riêng, không yêu cầu giống bit với thứ tự cộng CPU.
- Mask→prefix→visible IDs cho đúng tập, không mất/trùng/ghi ngoài buffer và giữ quy tắc thứ tự đã công bố. Counts→offsets có fixture riêng để primitive dùng tiếp ở 40.
- Mỗi command có count/index range/instanceCount/baseInstance hoặc offset tương đương đúng nhóm mesh. Zero-visible tạo draw rỗng, không dùng lại count của frame trước.
- Bản một triệu object xét đủ N trên GPU và renderer dùng danh sách/command GPU; không full-buffer readback hoặc CPU compaction mỗi frame.
- Camera đi xuyên cảnh, culling toggle/debug/picking/reset và hủy batch hoạt động. So culling on/off ở các camera snapshot cho hình hợp lệ và báo rõ phạm vi culling.
- Báo bộ nhớ, thời gian từng pass/toàn frame, số object đã xét và đã gửi đi vẽ; có ca nhỏ hoặc all-visible không có speedup.
- Có executable C++/SDL3 độc lập và source checkpoint. Tests, biểu đồ hay Canvas không thay scene thật đúng quy mô.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài và checkpoint. Bắt đầu từ một khu phố chạy được, thêm object IDs/bounds, nối từng pass vào chính scene ấy rồi mới tăng quy mô. Mảng nhỏ và cây scan là thí nghiệm hỗ trợ, không phải sản phẩm cuối. Tự giải thích camera/culling, integer offsets và indirect draw tại nơi dùng, không cố nhét vào một số bài cố định.

---

## Project 40 — Xưởng vải 3D: kéo, ghim và thả vải phủ lên vật thể

**Vai trò:** Mô phỏng bề mặt biến dạng bằng nhiều pass GPU và truy vấn tiếp xúc không gian

**Mức tham vọng trực quan:** Tấm vải có nếp gấp và ánh sáng, phản ứng trực tiếp với kéo/thả, trọng lực và vật cản

### Đề bài / mục tiêu sản phẩm

Tự xây dựng một xưởng vải tương tác: người dùng ghim một mép, kéo một điểm, thả vải xuống bàn/quả cầu hoặc thay lực gió để quan sát bề mặt biến dạng. Đầu ra là mesh đang được mô phỏng, không phải một lớp điểm tô theo cell hoặc một animation uốn mặt phẳng bằng sin.

Compute thực hiện dự đoán vị trí, giải ràng buộc, xử lý tiếp xúc và cập nhật velocity/normals. Reduction/scan từ 39 cùng grid 3D phục vụ thống kê và tìm ứng viên tiếp xúc; không để CPU giải hộ phần vật lý mỗi frame.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Có các preset vải treo, vải phủ qua quả cầu và vải rơi lên bàn/vật cản. Người dùng thêm/bỏ ghim, kéo/thả bằng chuột và quan sát nếp gấp, độ giãn cùng vùng tiếp xúc.

Camera orbit/pan/zoom cho xem cả hai mặt. Chế độ debug có wireframe, ghim, lực kéo, strain/constraint residual, collision thickness và cell/contact candidates; khi tắt debug vẫn là một bề mặt vải có ánh sáng đọc được.

### Phạm vi chức năng tối thiểu bắt buộc

- Mesh tam giác có rest positions, topology, masses/inverse masses, velocity và các ràng buộc stretch/shear/bend hoặc mô hình tương đương được giải thích. Pin có inverse mass bằng 0; normals phải theo mesh sau biến dạng.
- Tự viết solver XPBD trên GPU, giải thích compliance, timestep, lambda và cách reset/giữ multiplier ở từng phạm vi. Có baseline CPU nhỏ và fixture ràng buộc với đáp án độc lập; không dùng tên XPBD cho một phép kéo vertex về vị trí tùy ý.
- Pipeline có external forces/prediction → các vòng constraint/contact solve → velocity update → normals → draw. Giới hạn substeps/iterations và báo residual còn lại, không dùng số vòng vô hạn để ép hội tụ.
- Giải ràng buộc không có race: dùng coloring hoặc constraint contributions/gather/ping-pong có ownership rõ. Barrier trong workgroup không thay đồng bộ giữa các pass.
- Va chạm với mặt phẳng, sphere và capsule hoặc obstacle analytic tương đương; có thickness, friction/damping được định nghĩa và miền chuyển động an toàn.
- Có self-contact xấp xỉ theo đỉnh với thickness công bố: grid 3D/CSR dựng từ state hiện tại, counts → scan → scatter → candidate traversal → distance/contact predicate. Loại các đỉnh kề nhau theo topology và kiểm mỗi ID được phân đúng cell.
- Nêu rõ self-contact theo đỉnh không bảo đảm loại mọi giao cắt edge/triangle. Triangle/edge contact và continuous collision detection là mở rộng; không quảng bá bản chuẩn là solver may mặc chính xác hoặc chống xuyên cho mọi tốc độ.
- Pin/drag là ràng buộc input trên cùng state GPU, có giới hạn lực/độ dời theo mô hình. Khi mất capture/focus hoặc hủy, giải phóng thao tác kéo an toàn.
- Renderer đọc mesh biến dạng trực tiếp trên GPU; chỉ readback probe/diagnostics hữu hạn khi cần. Không copy toàn mesh hoặc giải solver CPU mỗi frame.

### Quy mô / độ phức tạp tối thiểu

- Bản cuối có ít nhất 100.000 đỉnh vải động, cùng topology và toàn bộ constraints tương ứng được xử lý trên GPU ở mỗi bước nghiệm thu; số đỉnh ghim báo riêng, không dùng một lưới lớn nhưng chỉ cập nhật vài hàng.
- Có preset nhỏ để kiểm CPU và preset một triệu đỉnh làm mốc mở rộng theo RAM/VRAM, số constraints, iterations và mật độ tiếp xúc; không hứa FPS chung.
- Công bố dynamic/pinned/updated/drawn vertices, số triangles/constraints, iterations/substeps, contacts/candidates, bộ nhớ và thời gian từng pass/toàn bước.
- Grid, scratch, contact/history và mesh buffers có ngân sách trước cấp phát. Cấu hình tạo quá nhiều candidates phải bị từ chối/báo rõ; không âm thầm cắt contacts để giữ FPS.

### Tương tác bắt buộc

- Ghim/bỏ ghim, chọn và kéo/thả vùng vải; đổi preset, độ phân giải, compliance, damping, gió và gravity trong miền hợp lệ.
- Điều chỉnh/vị trí vật cản trong giới hạn vận tốc đã công bố; bật strain, wireframe, cell/contact debug cho subset.
- Camera orbit/pan/zoom, Pause/Reset/single-step; camera và inspector vẫn dùng được khi Pause. Nêu rõ chỉnh pin/drag khi Pause có sửa state hay chỉ chuẩn bị bước tiếp theo.
- Chạy/hủy validation hoặc benchmark hữu hạn; đổi topology/resolution/reset phải hủy drag/job cũ trước khi công bố state mới.

### Mức đồ họa / trình bày tối thiểu

- Bề mặt có normals, ánh sáng hai mặt hoặc quy tắc culling rõ, pattern/checker để đọc độ giãn và nếp gấp. Không chỉ vẽ lưới dây hoặc điểm.
- Vải phản ứng với trọng lực, ghim, thao tác kéo và vật cản trên cùng scene; preset chuẩn không được xuyên vật cản rõ rệt hoặc nổ hình rồi vẫn báo PASS.
- Main viewport ưu tiên bề mặt đang biến dạng. Grid, contacts và biểu đồ là công cụ giải thích, không thay sản phẩm bằng heatmap.
- Không buộc asset vải thương mại hoặc photorealistic; độ thuyết phục đến từ biến dạng, tiếp xúc, normal và cách quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết constraint solver, contact/grid, CPU oracle, compute kernels và mesh presentation. Không dùng cloth/physics engine thay phần cốt lõi.
- [Bài báo XPBD gốc](https://mmacklin.com/xpbd.pdf) là nguồn tham khảo về compliance/multiplier; giáo trình phải giải thích scheme được triển khai, không hứa số vòng hữu hạn cho kết quả hoàn toàn không phụ thuộc timestep/iteration.
- Reuse scan ở 39, nhưng phải dạy cell indexing/stencil/ranges 3D và predicate tiếp xúc riêng. Kiến thức spatial grid CPU có thể lấy từ 28 hoặc fixture cầu nối; luật Boids không phải prerequisite.
- Phân biệt compliance, damping, friction, thickness và sai số solver; công bố đơn vị, timestep và giới hạn. Không đổi nhiều đại lượng rồi gọi đó là đổi một loại vải.
- Picking/ray/mesh helpers nếu được cung cấp phải nói rõ và có chỗ nối vào app; không bắt người học tự ghép một engine chọn điểm chưa được dạy.

### Không được coi là hoàn thành nếu

- Chỉ dùng vertex shader uốn mặt phẳng theo thời gian hoặc chỉ có một chuỗi lò xo/mesh vài chục đỉnh.
- CPU cập nhật vật lý rồi upload, race bị che bằng một barrier chung, hoặc bỏ constraints/contacts ở preset lớn.
- Chỉ có grid/neighbor query, strain chart hoặc Canvas mà không có tấm vải tương tác được.
- Vải không phản ứng với pin/drag/vật cản, không công bố sai số/giới hạn self-contact, hoặc gắn nhãn chống xuyên tuyệt đối cho mô hình theo đỉnh.
- Chỉ đổi tên GPU Grid Workbench cũ mà chưa có topology, solver, normals và renderer bề mặt.

### Acceptance Criteria

- Fixture một/hai ràng buộc kiểm correction theo khối lượng/compliance, giữ pin cố định và xử lý khoảng cách 0/input không hợp lệ. CPU/GPU so cùng snapshot, timestep, topology và thứ tự/scheme được công bố.
- Grid 3D tạo phân hoạch hợp lệ, tổng count=N và không mất/trùng ID. Candidate/contact IDs khớp brute force trên fixture nhỏ có cell rỗng/đông, vị trí trùng, đỉnh kề topology và sát thickness.
- Tiếp xúc analytic có test độc lập về normal, khoảng cách và penetration. Self-contact kiểm đúng mô hình theo đỉnh; không dùng test này để tuyên bố đã xử lý mọi giao cắt tam giác.
- Theo dõi max stretch/constraint residual và penetration qua số vòng hữu hạn; có thử timestep/iteration để tách sai số solver khỏi tham số vật liệu. Không đòi bảo toàn năng lượng khi có damping, friction hoặc thao tác người dùng.
- Preset ít nhất 100.000 đỉnh động cập nhật đầy đủ constraints, contacts, velocity và normals trên GPU; scene vải treo/phủ sphere/rơi lên bàn chạy thật, không dùng mesh đã bake.
- Pin/drag/cancel/blur, đổi preset/topology, Pause/Reset/single-step và camera hoạt động; không giữ reference vào vertex/buffer cũ sau reset.
- Báo số phần tử/candidates, bộ nhớ, substeps/iterations, thời gian solver/grid/contact/normals/draw/toàn bước và kết quả mốc mở rộng một triệu riêng.
- Có executable C++/SDL3 độc lập, source từng checkpoint và quy trình kiểm hữu hạn. Bằng chứng thuật toán, hình ảnh native và tương tác phải được kiểm riêng; build hoặc Canvas không thay sản phẩm.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent tự chọn số bài và checkpoint theo độ khó. Giải thích một ràng buộc trước, đưa nó vào một mảnh vải đang chạy rồi mới thêm tiếp xúc/grid và tăng resolution. Có thể nhắc lại chuỗi lò xo 25 hoặc cung cấp cầu nối tại chỗ, nhưng sản phẩm cuối là bề mặt vải 3D có topology và tương tác hoàn chỉnh. Không thu nhỏ đích đến để khớp một số bài cố định.

---


# PHẦN VIII — MOLECULAR DYNAMICS

## Project 41 — Hai “nguyên tử” hút và đẩy nhau: trực quan hóa Lennard–Jones

**Vai trò:** Bài thí nghiệm mô hình lực; nền cho Molecular Lab 42–45

**Mức tham vọng trực quan:** Scientific foundation / hai hạt, đồ thị và kiểm chứng rõ

### Đề bài / mục tiêu sản phẩm

Kéo hai particle gần/xa và xem potential/force đổi dấu.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Graph V(r), force arrow và equilibrium region cập nhật realtime.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Two interactive particles + V(r) graph.
- Attraction/repulsion force arrows.
- Analytic vs numerical derivative check.

### Quy mô / độ phức tạp tối thiểu

- Sweep across repulsive, minimum, attractive ranges.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Drag distance; change epsilon/sigma.

### Mức đồ họa / trình bày tối thiểu

- Molecular simulation phải có viewer động, thể hiện rõ các hạt đang tương tác chứ không phải point cloud tĩnh.
- Ở project 3D/GPU, phải có depth cue, camera tự do/orbit, atom/particle shading hoặc impostor đủ rõ và color mapping theo đại lượng phù hợp như loại hạt, tốc độ hoặc năng lượng.
- Energy/temperature/profiler overlays phải bổ trợ cho scene, không thay thế scene.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- LJ potential/force
- Plot
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ plot công thức không particle interaction.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Kiểm lực từ âm đạo hàm potential ở vùng hút/đẩy và quanh cực tiểu; sweep bước đạo hàm số để tránh một tolerance che mọi lỗi.
- r quá nhỏ, đơn vị/reduced units, tham số và giới hạn đồ thị có chính sách rõ. Hai hạt là thí nghiệm mô hình LJ, không đại diện mọi tương tác nguyên tử.
- Numerical derivative gần analytic.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 42 — Hộp khí 1.000 hạt: Molecular Dynamics CPU đầu tiên

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Mô phỏng nhiều particle với Lennard–Jones + velocity Verlet.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Box có particles, energy graphs và timestep controls.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Actual MD box with many particles moving from forces.
- Velocity Verlet.
- Kinetic/potential/total energy plots.

### Quy mô / độ phức tạp tối thiểu

- Start 100 then 1k; optionally 10k.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Pause/reset; timestep; initial temperature/velocity scale.

### Mức đồ họa / trình bày tối thiểu

- Molecular simulation phải có viewer động, thể hiện rõ các hạt đang tương tác chứ không phải point cloud tĩnh.
- Ở project 3D/GPU, phải có depth cue, camera tự do/orbit, atom/particle shading hoặc impostor đủ rõ và color mapping theo đại lượng phù hợp như loại hạt, tốc độ hoặc năng lượng.
- Energy/temperature/profiler overlays phải bổ trợ cho scene, không thay thế scene.
- Box MD phải thể hiện 1.000 particle thật ở preset chính hoặc mức tương đương hợp lý, với motion liên tục và màu theo speed/energy.
- Energy graphs nên cập nhật theo thời gian trong overlay nhỏ hoặc panel bên cạnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- CPU MD loop
- Pair force
- Observables
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Random particle animation.
- Collision-only gas without Lennard–Jones.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture hai/ba hạt kiểm pair force đối nhau và một bước Velocity Verlet; lực/đơn vị nối rõ với 41.
- Đo energy drift trên cùng state đầu và thời gian hữu hạn ở nhiều dt; giữ preset 1.000 hạt thật, không che force blow-up bằng clamp không được công bố.
- Energy drift được định lượng.
- Không che force blow-up.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 43 — Hộp phân tử tuần hoàn: hạt đi ra một phía và quay lại phía đối diện

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Thêm periodic boundary và minimum-image convention.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Particles wrap liền mạch; pair distance qua biên đúng.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Periodic box visualization.
- Positions wrap; forces use minimum image.
- Boundary test cases.

### Quy mô / độ phức tạp tối thiểu

- At least 2D/3D box with cross-boundary interaction.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Toggle periodic/debug ghost copies.

### Mức đồ họa / trình bày tối thiểu

- Molecular simulation phải có viewer động, thể hiện rõ các hạt đang tương tác chứ không phải point cloud tĩnh.
- Ở project 3D/GPU, phải có depth cue, camera tự do/orbit, atom/particle shading hoặc impostor đủ rõ và color mapping theo đại lượng phù hợp như loại hạt, tốc độ hoặc năng lượng.
- Energy/temperature/profiler overlays phải bổ trợ cho scene, không thay thế scene.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Periodic wrapping
- Minimum-image displacement
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ teleport display position nhưng force vẫn non-periodic.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Wrap position và minimum-image displacement được kiểm riêng tại hai biên, negative coordinates và nhiều lần qua box; nếu có unwrapped state phải giữ nhất quán.
- Hai hạt qua biên cho lực tương đương ca cùng displacement trong box; công bố cutoff/box constraints để tránh tính ảnh tuần hoàn sai.
- Hai hạt sát hai biên tương tác như gần nhau.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 44 — Danh sách hàng xóm có vùng đệm: không tìm lại mọi cặp ở mỗi bước

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Kết hợp cell list + Verlet neighbor list với cutoff/skin.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

MD CPU 10k–100k hạt có profiler build-list vs force.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cell-list + Verlet neighbor list integrated into MD.
- Cutoff + skin + rebuild logic.
- Profiler components.

### Quy mô / độ phức tạp tối thiểu

- Bắt buộc đạt ít nhất 10.000 hạt CPU; 100.000 là mục tiêu mở rộng theo phần cứng, với cùng mô hình và kiểm chứng.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Change cutoff/skin; show rebuild count.

### Mức đồ họa / trình bày tối thiểu

- Molecular simulation phải có viewer động, thể hiện rõ các hạt đang tương tác chứ không phải point cloud tĩnh.
- Ở project 3D/GPU, phải có depth cue, camera tự do/orbit, atom/particle shading hoặc impostor đủ rõ và color mapping theo đại lượng phù hợp như loại hạt, tốc độ hoặc năng lượng.
- Energy/temperature/profiler overlays phải bổ trợ cho scene, không thay thế scene.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Neighbor list
- Rebuild tracker
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Rebuild full O(N²) list every step.
- Không compare force correctness.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Ít nhất 10.000 hạt MD thật ở preset nghiệm thu; 100.000 là mở rộng CPU theo máy, không thay bằng mức 1.000 hạt rồi gọi hoàn thành.
- Neighbor list không bỏ cặp tiến vào cutoff trước lần rebuild tiếp theo; fixture có hạt qua biên tuần hoàn và chuyển động sát ngưỡng skin.
- Đo build/rebuild/force/toàn bước; so force cùng snapshot với all-pairs và kiểm cả skin quá nhỏ/quá lớn.
- Forces trong cutoff khớp reference.
- Không bỏ neighbor.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 45 — Molecular Lab GPU: tăng từ 100.000 tới mục tiêu 5 triệu hạt

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Port grid, neighbor lookup, force compute và integration sang compute shader.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

GPU MD prototype có profiler và scale ladder.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Full GPU MD pipeline: binning, neighbor force, integration, render.
- Profiler per pass.
- CPU reference small N.

### Quy mô / độ phức tạp tối thiểu

- 100k required milestone; 1M strong milestone; 5M stretch target.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera + pause/reset + N presets + debug selected atom.

### Mức đồ họa / trình bày tối thiểu

- Molecular simulation phải có viewer động, thể hiện rõ các hạt đang tương tác chứ không phải point cloud tĩnh.
- Ở project 3D/GPU, phải có depth cue, camera tự do/orbit, atom/particle shading hoặc impostor đủ rõ và color mapping theo đại lượng phù hợp như loại hạt, tốc độ hoặc năng lượng.
- Energy/temperature/profiler overlays phải bổ trợ cho scene, không thay thế scene.
- Ở 100k+ atoms, scene phải là viewer 3D thực sự với free/orbit camera, depth shading/impostors và color mapping theo atom type/speed/energy.
- Có chế độ chọn một atom để highlight local neighbor cells/neighbors mà không làm mất showcase mode.
- Profiler và scale controls phải tồn tại, nhưng demo chính phải nhìn như một molecular simulation quy mô lớn chứ không phải benchmark điểm.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- GPU MD kernels
- Profiler counters
- GPU render
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- 5M static particles.
- Only gravity particles.
- No neighbor-based force.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Đối chiếu small-N force, integration và diagnostics theo từng pass, không chỉ so ảnh; tail workgroup và overflow cell list có kiểm tra.
- 100.000 hạt là tối thiểu, một triệu là mốc nâng cao và năm triệu là stretch theo phần cứng. Mọi mốc chỉ ghi đạt khi force/neighbor/integration thật đều được thực thi.
- Giữ nhất quán mô hình ở 41–44; nếu đổi cutoff/precision/integrator phải có phép đo riêng, không quy mọi speedup cho GPU.
- Small-N GPU step khớp CPU tolerance.
- 5M chỉ thành công nếu update thật, không chỉ render.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN IX — FLUID, PDE VÀ PARTICLE-BASED SIMULATION

## Project 46 — Hộp cát số: cát rơi, nước giả và cellular automata

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Làm falling-sand sandbox với cell rules cục bộ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Paint sand/wall/water toy và xem material rơi/chảy.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Interactive cellular sandbox grid.
- Sand, wall, toy water materials.
- Visible local-rule evolution.

### Quy mô / độ phức tạp tối thiểu

- Grid at least hundreds of cells per dimension if performance allows.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse paint materials; clear/pause/speed.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Grid simulation
- Material rules
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Pre-rendered animation.
- Only Game of Life if sand/water target omitted.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture nhỏ kiểm sand/wall/water, biên và số ô vật liệu nếu luật không có source/sink hoặc chuyển loại; seed và update order công bố.
- Không gọi chuyển động cellular là nghiệm phương trình chất lưu hoặc dùng nó làm bằng chứng solver ở 49–51.
- Giải thích được update order ảnh hưởng kết quả.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 47 — Tấm kim loại nóng: nhiệt lan từ nơi bạn click ra toàn mặt phẳng

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Giải heat/diffusion equation trên grid 2D bằng finite differences.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Heat map có mouse injection và slider dt/D; có thể cố tình làm solver mất ổn định.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 2D heat field with source injection.
- Finite-difference diffusion.
- Boundary modes + stability experiment.

### Quy mô / độ phức tạp tối thiểu

- Preset nghiệm thu ít nhất 128×128 cells; ghi rõ dx/dy và timestep tương ứng.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse add heat; sliders D/dt; reset.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Discrete Laplacian
- PDE loop
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Blur filter every frame without equation interpretation.
- No timestep instability experiment.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Chọn được nguồn nhiệt và điều kiện biên; công bố diffusivity, dt, dx/dy và điều kiện ổn định của chính scheme được dùng.
- Fixture trường hằng và một nghiệm/tình huống diffusion tham chiếu kiểm update; năng lượng chỉ bảo toàn khi điều kiện biên/nguồn tương ứng cho phép.
- Có experiment stability vs dt/dx.
- Nguồn đối xứng giữ symmetry gần đúng.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 48 — Bản đồ gió: nhìn thấy gradient, divergence và curl

**Vai trò:** Bài thí nghiệm vector calculus và chuyển động trong trường

**Mức tham vọng trực quan:** Trường, tracer và các toán tử đọc được trực tiếp

### Đề bài / mục tiêu sản phẩm

Tạo vector-field inspector với presets vortex/source/sink và overlays.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Grid arrows + color maps divergence/curl cập nhật realtime.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 2D vector field arrows.
- Presets source/sink/vortex/uniform.
- Gradient/divergence/curl overlays.
- Tracer tiến theo cùng vector field với dt để quan sát tác dụng của trường.

### Quy mô / độ phức tạp tối thiểu

- At least 32×32 sampled field, preferably more.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse edit/inject field; switch overlays.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Field storage
- Discrete operators
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Only decorative arrow field.
- No numerical differential operators.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Scalar potential cho gradient tách khỏi vector field cho divergence/curl; fixture hằng, tuyến tính, source/sink và vortex có đạo hàm biết trước.
- Tracer di chuyển theo field với dt, bật/tắt được; overlay và tracer dùng cùng dữ liệu chứ không phải hai animation độc lập.
- Uniform flow divergence≈0.
- Source/sink có dấu hợp lý.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 49 — Khói bị chuột khuấy: Stable Fluids 2D từng bước

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Xây solver 2D: mouse tạo velocity, click thêm dye/smoke.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Khói chảy theo field; debug pressure/divergence.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Interactive dye/smoke fluid in 2D.
- Velocity field, pressure solve, projection.
- Debug divergence/pressure.

### Quy mô / độ phức tạp tối thiểu

- Preset nghiệm thu ít nhất 128×128 cells; công bố điều kiện biên, iteration budget và giới hạn timestep.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse drag inject velocity; click add dye; pause/reset.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.
- Khói/dye phải tạo được các xoáy và dòng chảy liên tục khi kéo chuột; color map/opacity phải làm flow đọc rõ.
- Debug velocity/pressure/divergence là chế độ riêng có thể bật/tắt.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Advection sampler
- Pressure solver
- Projection
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Particle animation pretending to be Stable Fluids.
- No pressure projection.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Ghi chuẩn divergence, residual/iteration pressure trước/sau projection trên fixture có ngưỡng đặt trước; kiểm boundary consistency.
- Tách ổn định khỏi độ chính xác: dt lớn có thể gây diffusion/lệch quỹ đạo dù không nổ số; ghi giới hạn bước và cách kiểm chứng advection.
- Projection làm divergence norm giảm mạnh.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 50 — Bể nước bằng hạt: SPH 2D có thể đổ và va vào thành

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Mô phỏng fluid particle bằng SPH + uniform grid.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

1k→100k particles chảy trong container toy model.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- SPH particle fluid inside container.
- Density/pressure/viscosity based on neighbors.
- Uniform grid.

### Quy mô / độ phức tạp tối thiểu

- Bắt đầu từ 1.000 hạt; tối thiểu 5.000 hạt ở bản cuối. Các mốc cao hơn, kể cả 100.000, là mở rộng theo phần cứng.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Pour/spawn/reset; container interaction; parameter sliders.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.
- Bể SPH phải có đủ particle để tạo một khối/chất lỏng liên tục về thị giác; dùng màu theo density/pressure/speed.
- Container và collision boundaries phải nhìn thấy rõ; có preset đổ nước hoặc dam-break toy để tạo chuyển động ấn tượng.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- SPH kernels
- Neighbor loops
- Boundary forces
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Ball particles with collision only.
- No density/pressure calculation.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Preset cuối ít nhất 5.000 hạt SPH 2D thật; 1.000 là bước khởi đầu và các mốc cao hơn là mở rộng được ghi rõ.
- Kernel/support radius và đơn vị 2D được công bố; density/pressure/viscosity và grid neighbors khớp all-pairs trên fixture nhỏ.
- Có dam-break/đổ nước và ca equilibrium; theo dõi density error, dt, boundary leakage và giới hạn ổn định, không thay fluid bằng bóng nảy.
- Log density distribution/timestep.
- Không chỉ đánh giá bằng hình ảnh.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 51 — Khối nước 3D trên GPU: SPH hàng trăm nghìn tới hàng triệu hạt

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Port SPH sang compute shader, dùng GPU grid.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

3D fluid có camera, profiler và scale ladder.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 3D SPH particles in real 3D scene.
- GPU grid + density + force + integration passes.
- Camera and profiler.

### Quy mô / độ phức tạp tối thiểu

- 100k required target; 500k/1M advanced targets.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- FPS/orbit camera; pause/reset; N presets.

### Mức đồ họa / trình bày tối thiểu

- Fluid/PDE output phải làm người xem nhìn ra ngay hiện tượng dòng chảy/khuếch tán; dùng color map, velocity glyphs, dye, particles hoặc density visualization phù hợp.
- Project 3D GPU phải có camera tự do/orbit, depth shading và cách hiển thị hạt đủ dày để tạo cảm giác thể tích/chất lỏng thay vì vài điểm rời rạc.
- Debug pressure/divergence/density có thể bật/tắt; showcase mode phải ưu tiên hiện tượng chính và có bố cục trực quan sạch.
- Scene phải là bể/khối nước **3D**, không phải 2D projected. Camera phải orbit/free-fly quanh thể tích hạt.
- Render dùng sphere impostor/point sprite có depth và shading/color theo density/speed; raw debug points đơn sắc không đủ cho showcase mode.
- Có ít nhất một scenario trực quan mạnh như dam-break, falling block of fluid hoặc jet/fountain.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- GPU SPH passes
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- 2D simulation rendered with perspective tricks.
- Only render particles without SPH solver.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Kernel normalization và đơn vị phải đúng 3D; không dùng nguyên hằng số 2D ở 50 cho density/force 3D.
- Kiểm grid/neighbor, density, pressure, viscosity và một bước integration với CPU oracle nhỏ; reduction/scan dùng được qua nhiều workgroup.
- 100.000 hạt là tối thiểu, 500.000/một triệu là mốc nâng cao; cảnh động và thống kê density/boundary leakage ghi riêng với profiler.
- Small-N GPU density/force so CPU reference.
- Profiler tách từng pass.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN X — RAY, VOLUME, X-RAY VÀ MONTE CARLO

## Project 52 — Bắn tia vào hình học: chọn điểm chạm plane, sphere, box và triangle

**Vai trò:** Công cụ hình học và bài cầu nối cho picking, volume, voxel

**Mức tham vọng trực quan:** Ray/hit/normal rõ, dữ liệu giao có thể kiểm chứng

### Đề bài / mục tiêu sản phẩm

Tạo ray inspector: aim/click và hiển thị intersection, normal, entry/exit.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Geometry lab cho 4 intersection cơ bản.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 3D scene with ray + plane/sphere/AABB/triangle targets.
- Show hit point, normal, entry/exit t values.

### Quy mô / độ phức tạp tối thiểu

- Interactive scene with all 4 intersection types.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Move camera/ray/objects; choose primitive.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Intersection routines
- Debug drawing
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Only console math tests.
- Use engine raycast.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture ray song song, origin trong solid, tiếp tuyến, t âm và hit nhiều object kiểm nearest positive hit theo interval công bố.
- Entry/exit áp dụng đúng cho solid sphere/AABB; plane/triangle là giao bề mặt, không tự tạo hai mặt vào/ra.
- Hit point, normal và ray vẽ cùng world space; bài có thể dùng sớm để chuẩn bị picking, không phụ thuộc volume/CT.
- Unit tests edge cases.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 53 — Máy cắt lát khối 3D: xem từng lớp mật độ như ảnh CT giả

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Tạo volume 64³/128³ và viewer XY/XZ/YZ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Synthetic sphere/Gaussian/layers, slider slice và voxel inspector.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Actual 3D scalar volume array.
- Three orthogonal slice viewers.
- Nearest + trilinear sampling.

### Quy mô / độ phức tạp tối thiểu

- 64³ minimum synthetic volume; 128³ preferred.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Slice sliders XY/XZ/YZ; inspect voxel.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Volume storage
- 3D sampling
- Slice renderer
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- A stack of unrelated 2D images with no 3D indexing.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture volume nhỏ có giá trị voxel biết trước kiểm indexing và nearest/trilinear ở tâm, cạnh, góc và boundary policy.
- Slice orientation/spacing/unit ghi rõ, thống nhất với camera/phantom; xem slice không được gọi là tái tạo CT từ projections.
- Synthetic symmetry tạo slice symmetry.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 54 — Nhìn xuyên khối sương 3D: Volume Ray Marching bằng fragment shader

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Mỗi pixel phát ray qua 3D texture và tích lũy density.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Volume viewer có MIP, average và alpha compositing modes.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Perspective 3D volume rendering.
- Ray-box + sampling a 3D texture.
- MIP/average/alpha compositing.

### Quy mô / độ phức tạp tối thiểu

- 128³ volume or comparable; full-screen viewport.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Free/orbit camera; step-size and mode controls.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.
- Volume phải được nhìn như một object 3D có thể xoay camera; không chỉ hiển thị từng slice.
- Có transfer/compositing controls đủ để chuyển giữa MIP/average/alpha và thấy khác biệt.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Volume shader
- Compositing
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Displaying only axial slices.
- Rendering a mesh shell instead of volume integration.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Volume hằng và slab có kết quả tham chiếu cho từng mode; MIP/average/alpha compositing phân biệt rõ, không gán cùng ý nghĩa vật lý.
- Đổi sampling step có so error/time và quy tắc opacity theo độ dài bước khi áp dụng; ray-box interval, empty volume và camera trong volume có fixture.
- Step size cho tradeoff quality/performance rõ.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 55 — Máy X-ray ảo: tia xuyên các lớp vật liệu và tạo ảnh detector

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Dùng Beer–Lambert toy model để tích phân hệ số suy giảm dọc ray.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Synthetic phantom air/soft/dense tạo ảnh grayscale detector.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- A source/view direction, 3D phantom, detector image.
- Beer–Lambert integration through multiple material regions.
- Interactive orientation/material parameters.

### Quy mô / độ phức tạp tối thiểu

- 3D phantom with at least 3 material classes.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Rotate phantom/source/detector; adjust coefficients; view detector.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.
- Hiển thị đồng thời hoặc chuyển đổi được giữa geometry 3D source-volume-detector và ảnh detector 2D.
- Detector image phải có contrast mapping rõ; thay material/path/source phải cập nhật tức thời.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Attenuation shader
- Synthetic phantom
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- A grayscale texture labeled X-ray.
- Simple alpha blending with no attenuation integral.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Phantom đồng nhất/slab cho kết quả attenuation giải tích; kiểm I0, path length, đơn vị μ và ray không đi qua vật.
- Giữ ít nhất ba nhóm vật liệu trong phantom 3D; nêu giả thiết nguồn/attenuation, phần scattering không mô hình hóa và giới hạn giáo dục, không suy ra hiệu lực lâm sàng.
- Tăng mu/path length làm intensity giảm đơn điệu.
- Ghi rõ là mô hình giáo dục.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 56 — Máy CT đồ chơi: quay nguồn quanh vật thể và dựng sinogram

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Bắt đầu 2D phantom; chiếu nhiều góc và thử backprojection.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Phantom→projections→sinogram→reconstruction toy.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 2D phantom rotates relative to many projection rays.
- Sinogram built from multiple angles.
- Backprojection reconstruction view.

### Quy mô / độ phức tạp tối thiểu

- At least ~180 angular samples in final demo or configurable comparable range.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Angle count controls; play acquisition; compare phantom/reconstruction.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Projection geometry
- Sinogram builder
- Toy backprojection
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Only rotate an X-ray image.
- No sinogram.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Công bố parallel-beam hoặc fan-beam và dùng forward/backprojection nhất quán; nếu đầu vào là intensity thì giải thích đổi về line integral thay vì backproject grayscale trực tiếp.
- Phantom đơn giản có projection tính độc lập; đo sai số projection và reconstruction sau normalization công bố, không chỉ kiểm đối xứng.
- Giữ khoảng 180 góc theo phạm vi; so unfiltered backprojection với phantom để thấy blur. Filtered backprojection là mở rộng có cầu nối lọc/Fourier và phép so riêng, không phải điều kiện ngầm của bản chuẩn.
- Symmetric phantom cho output symmetry hợp lý.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 57 — Mưa photon ngẫu nhiên: Monte Carlo hấp thụ, tán xạ và thoát

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Mô phỏng photon stochastic CPU trước rồi mới GPU.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Heatmap/histogram absorb/scatter/escape có uncertainty.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Photon particles with stochastic state and events.
- Statistics/heatmaps of outcomes.
- Multiple runs/seeds + uncertainty.

### Quy mô / độ phức tạp tối thiểu

- 10k CPU photons minimum; higher or GPU optional.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Run/reset; photon count; material parameters; seed.

### Mức đồ họa / trình bày tối thiểu

- Volume/X-ray/Monte Carlo project phải có ít nhất một viewport khoa học trực quan rõ ràng và một visualization kết quả như detector image, slice, volume, heatmap hoặc histogram.
- Nếu có scene 3D, source/ray/volume/detector hoặc camera phải được bố trí để người xem hiểu hình học phép đo.
- Output phải thay đổi liên tục theo tham số/camera/nguồn và đủ đẹp để quan sát hiện tượng, không chỉ hiển thị ma trận grayscale thô không context.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Photon state
- Random sampling
- Statistics accumulator
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Deterministic ray marching mislabeled Monte Carlo.
- One random animation with no statistics.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Mỗi photon có trạng thái kết thúc rõ; tổng absorbed/escaped/còn sống hoặc bị dừng theo budget khớp số phát. Scatter là sự kiện có thể lặp, không cộng số scatter events vào tổng trạng thái cuối.
- Giữ tối thiểu 10.000 photon CPU; có nhiều seed/lần chạy, mô tả estimator, uncertainty và truncation bias; không yêu cầu sai số từng seed giảm đơn điệu.
- Báo uncertainty, không chỉ ảnh.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN XI — VOXEL WORLD 3D KIỂU MINECRAFT

## Project 58 — Khối đất 16×16×16: dựng voxel chunk đầu tiên

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Lưu chunk 3D và sinh mesh cho block.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một chunk voxel có camera và block types/colors.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- **Một viewport 3D perspective chiếm phần chính cửa sổ.**
- Chunk thật lưu tối thiểu 16×16×16 voxel.
- Mesh các block trong không gian 3D với camera có depth.
- Scene phải là nền móng của một thế giới mà người chơi sẽ đi vào, không phải biểu đồ/minimap.

### Quy mô / độ phức tạp tối thiểu

- Chunk storage tối thiểu 16³ = 4096 cells; nhiều block solid/air tạo được cấu trúc địa hình nhỏ.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera 3D có mouse look/orbit ở giai đoạn đầu; nên ưu tiên FPS/free camera để chuẩn bị Project 60–64.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Chunk phải được nhìn trong một **viewport 3D perspective lớn**, không phải minimap. Camera nên free/FPS để chuẩn bị cho thế giới thật.
- Chunk phải có địa hình nhỏ đủ cao/thấp/air/solid để nhìn như một phần world, không phải khối 16³ đặc.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Chunk storage
- Naive mesher
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- **Một minimap 2D/isometric chứa vài chục ô vuông/cube.**
- Một ảnh/render tĩnh chỉ xoay object như model viewer.
- Một cube duy nhất được subdivide bằng texture nhưng không có voxel storage 3D.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture empty/solid/single block kiểm indexing và mesh; tọa độ âm/biên chunk có quy tắc ánh xạ rõ.
- Camera/model/world conventions nối với các bài trước; đủ 16³ cells thật và scene có solid/air, không thay bằng list cube rời không có chunk storage.
- Indexing đúng biên.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 59 — Ẩn các mặt nằm trong đất: giảm mạnh số tam giác voxel

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Chỉ sinh face nếu neighbor là air/outside.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Toggle naive/visible-face cho thấy triangle count giảm.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cùng chunk 3D Project 58.
- Mesher chỉ tạo face tiếp giáp air.
- Có số liệu triangle/face count trước và sau.

### Quy mô / độ phức tạp tối thiểu

- Chunk tối thiểu 16³ với solid regions đủ lớn để thấy giảm mesh.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera 3D di chuyển quanh/qua chunk; toggle naive vs culled.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Toggle naive/culled phải cho phép nhìn cùng một chunk/world region; UI hiển thị triangle count trước/sau.
- Kết quả hình ảnh phải giống nhau về bề mặt nhìn thấy dù mesh bên trong khác.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Visible-face mesher
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ ẩn face bằng back-face culling GPU.
- Không kiểm tra neighbor voxel khi generate mesh.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Fixture solid chunk, cavity và hai chunk kề nhau kiểm đúng tập mặt theo occupancy; GPU back-face culling không thay visible-face meshing.
- Không có lỗ hoặc mặt trùng tại biên chunk khi neighbor có/không có dữ liệu theo chính sách công bố.
- Outer surface không lỗ.
- Internal faces biến mất.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 60 — Chọn, phá và đặt block bằng tia từ camera

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Bắn ray qua crosshair và traverse voxel grid để chọn block.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Highlight, left-remove, right-add kiểu Minecraft.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Người dùng **đứng/di chuyển trong scene 3D** và nhìn từ camera.
- Crosshair/ray từ camera chọn block trong voxel grid.
- Left remove/right add block và remesh chunk.

### Quy mô / độ phức tạp tối thiểu

- World/chunk phải đủ lớn để user có thể tiến/lùi vài chục block.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- WASD + mouse look; click phá/đặt.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Camera first-person/free phải đặt người dùng **trong** world/chunk; crosshair hoặc selection outline phải rõ.
- Phá/đặt block phải cập nhật mesh ngay để người dùng cảm nhận interaction kiểu voxel sandbox.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Voxel ray traversal
- Block editing
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Orbit một mô hình chunk bên ngoài như 3D editor đơn giản.
- Click trực tiếp lên minimap 2D để sửa block.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Grid traversal kiểm ray trên mặt/cạnh/góc, hướng có thành phần 0, tọa độ âm, origin trong block và giới hạn reach.
- Phá đúng first solid hit, đặt ở ô kề đúng normal; cập nhật mesh chunk lân cận khi sửa biên, không đặt block xuyên player nếu policy cấm.
- Không skip block theo ray.
- Place cell đúng mặt hit.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 61 — Gộp tường voxel thành mảng lớn: Greedy Meshing

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Gộp các face coplanar cùng material thành quad lớn.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Triangle count giảm mạnh ở vùng phẳng.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Voxel terrain 3D thật.
- Greedy meshing gộp coplanar faces.
- Visual equivalence với visible-face mesher.

### Quy mô / độ phức tạp tối thiểu

- Benchmark trên dense chunk/chunks với hàng nghìn blocks.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera 3D; toggle mesher/debug wireframe.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Greedy meshing phải được trình diễn trên địa hình/structures đủ lớn để thấy các mặt lớn được gộp, không chỉ test 2–3 blocks.
- Có overlay triangle/quad count và toggle so sánh với visible-face mesher.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Greedy mesher
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ merge draw calls nhưng vẫn giữ mọi small quad.
- Tối ưu trên một vài block demo không có terrain surface.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Greedy mesh khớp tập mặt và vật liệu của visible-face reference trên fixture phẳng, checkerboard, cavity và cạnh chunk.
- Chỉ gộp mặt có thuộc tính tương thích; benchmark tách meshing time, upload và draw, không đánh đổi mất hình học để giảm triangle.
- Geometry tương đương visible-face test chunks.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 62 — Thế giới “vô tận”: tải và gỡ chunk khi người chơi di chuyển

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Quản lý chunk quanh camera; generate/load/unload theo khoảng cách.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Đi liên tục, chunks xuất hiện trước và giải phóng sau.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- **Một thế giới 3D gồm nhiều chunk quanh người chơi, lớn hơn phạm vi nhìn của một chunk.**
- Chunk được tạo/load khi player tiến tới và unload khi đi xa.
- Player/camera di chuyển liên tục qua biên chunk mà không chuyển sang màn hình khác.
- Debug overlay hiển thị chunk coordinate/state.

### Quy mô / độ phức tạp tối thiểu

- Giữ ít nhất vùng 5×5 hoặc 7×7 chunks quanh player (hoặc budget tương đương); world coordinates phải liên tục.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- **WASD + mouse-look theo góc nhìn người chơi trong thế giới 3D.**
- Có thể đi ít nhất hàng trăm block theo một hướng để quan sát streaming.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Người chơi phải đi liên tục qua nhiều chunk trong một thế giới 3D; terrain/chunk xuất hiện trước hướng di chuyển và biến mất phía xa mà không đổi scene.
- Active region phải ít nhất khoảng 5×5 chunks hoặc budget tương đương; viewport phải nhìn thấy nhiều chunks cùng lúc.
- Debug chunk borders/status chỉ là overlay; showcase mode phải nhìn như một world 3D liên tục.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Chunk manager
- Simple job queue
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- **Một bản đồ 2D/minimap vài chục block.**
- Một chunk duy nhất được xoay bằng chuột.
- Nhiều chunks nhưng tất cả hard-code sẵn và không load/unload theo player.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Job lifecycle có loaded/queued/building/ready/unload policy; kết quả job cũ không làm sống lại chunk đã hủy hoặc thay mesh của phiên chỉnh sửa mới.
- Di chuyển qua biên/teleport và quay lại giữ active region theo budget; số chunk/buffer không tăng vô hạn sau nhiều vòng.
- Nếu chưa đa luồng, job queue theo frame vẫn đáp ứng streaming; nếu dùng worker thì kiểm ownership/teardown và giữ SDL/render ở thread thích hợp.
- Không race/crash khi di chuyển nhanh.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 63 — Đồi núi tự sinh: tạo terrain procedural không seam giữa chunks

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Sinh heightmap/noise theo world coordinates và seed.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Terrain có đồi/thung lũng, deterministic, liền biên.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- **Terrain 3D procedural sinh từ world coordinates/seed trên nhiều chunk.**
- Đồi, thung lũng hoặc độ cao thay đổi liên tục.
- Không có seam tại biên chunk.
- Player có thể đi xuyên địa hình bằng camera first-person/free camera.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất hàng chục chunks được sinh khi di chuyển; địa hình phải trải rộng vượt viewport hiện tại.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- WASD + mouse look; seed/regenerate control; optional fly mode để quan sát.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Terrain procedural phải tạo được đường chân trời, đồi/thung lũng hoặc biến thiên độ cao đủ lớn để người chơi có cảm giác đang khám phá địa hình.
- Ít nhất hàng chục chunks phải được sinh khi người chơi di chuyển; cùng seed tái tạo cùng world.
- Không chấp nhận terrain phẳng có noise rất nhỏ khó nhìn thấy.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Toy noise
- Terrain generator
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Một heightmap 2D được hiển thị như minimap.
- Một terrain mesh duy nhất không chia chunk.
- Các chunk lặp giống nhau hoặc có seam rõ.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Sampling dùng world coordinates và seed; kiểm cùng biên từ hai chunk và cùng chunk sinh ở thứ tự khác nhau, không reset noise ở mỗi local origin.
- Đi qua hàng chục chunk cho terrain liên tục, không lặp cùng một tile bằng dịch chuyển; cache/generation budget có giới hạn.
- Same seed→same terrain.
- Chunk boundaries liền.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 64 — Minecraft-like sandbox tối giản của riêng bạn

**Mức tham vọng trực quan:** 3D World / playable showcase

### Đề bài / mục tiêu sản phẩm

Tích hợp camera, terrain, block edit, collision, streaming và save/load.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một voxel sandbox chơi được 10–20 phút với debug stats.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- **Một chương trình sandbox 3D góc nhìn người chơi, không phải model viewer.**
- **Thế giới voxel procedural nhiều chunk mở rộng khi người chơi di chuyển.**
- Terrain có mặt đất/đồi hoặc cấu trúc tự sinh từ seed.
- Player có gravity/collision cơ bản và có thể đi/nhảy hoặc fly debug.
- Có phá/đặt block bằng ray từ camera.
- Chunk streaming + meshing + save/load thay đổi tối thiểu.
- HUD/debug hiển thị FPS, vị trí player, chunk, triangle count.

### Quy mô / độ phức tạp tối thiểu

- Ở vị trí bất kỳ phải nhìn thấy một thế giới 3D rộng hơn một chunk; player đi qua nhiều chunk (ví dụ >100 blocks) trong cùng phiên chạy; tối thiểu 5×5 chunks active quanh player hoặc cấu hình tương đương.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- **WASD + mouse-look là bắt buộc.**
- Jump/fly debug; left/right click edit block; reset/reload world.

### Mức đồ họa / trình bày tối thiểu

- Đây phải là một **thế giới 3D thực sự**, viewport chiếm phần lớn cửa sổ, camera/player nằm trong thế giới và có thể di chuyển qua không gian.
- Terrain/chunks phải có depth, màu/material phân biệt, fog/sky/background hoặc depth cue tương đương để thế giới có cảm giác không gian; không yêu cầu photorealistic nhưng không được giống minimap/debug grid.
- Ở các project cuối nhánh, cần có 'playable/showcase mode' sạch: HUD gọn, camera first-person/free, world trải rộng hơn viewport, chuyển chunk/terrain mượt ở mức hợp lý.
- Debug chunk bounds, meshing, triangle count và ray hit là overlay có thể bật/tắt, không phải giao diện duy nhất.
- Bản cuối phải có cảm giác như một **voxel exploration sandbox**: góc nhìn first-person/free, world procedural trải rộng, địa hình có chiều cao, sky/background/fog hoặc depth cue, block materials phân biệt.
- Người dùng phải có thể đi ít nhất hàng trăm block, vượt qua nhiều chunk, phá/đặt block và quay lại thấy thay đổi được lưu.
- Showcase mode phải sạch và đủ đẹp để quay video demo; debug stats/chunk bounds là toggle riêng.
- Một scene vài chục cube, một chunk cố định hoặc orbit camera quanh model **không bao giờ** thỏa project này.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Voxel collision
- Small save format
- Integration
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- **Một mini map 2D hoặc isometric.**
- **Một scene chỉ vài chục cube và orbit camera quanh chúng.**
- Một chunk cố định 16³ không thể đi xa.
- Terrain chỉ là ảnh/heightmap không có block 3D.
- Không có first-person/free movement xuyên thế giới.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Chu trình edit → đi đủ xa để unload → quay lại → thoát → chạy lại giữ đúng thay đổi theo seed/world ID; kiểm biên chunk và tọa độ âm.
- Save/load có version, báo lỗi file hỏng và không ghi đè dữ liệu tốt khi ghi thất bại; tách terrain gốc với delta chỉnh sửa.
- Chơi 10–20 phút theo checklist: di chuyển/nhảy, collision, edit, streaming, reset/load; ghi memory/resources và lỗi quan sát, không dùng smoke vài giây thay phiên kiểm này.
- Chơi ổn không leak/crash rõ.
- World edits lưu/tải.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN XII — TỰ XÂY UI CHO CÁC SIMULATOR

## Project 65 — Bảng điều khiển cho Simulation: Pause, Reset, Checkbox và Slider tự vẽ bằng C++

**Mức tham vọng trực quan:** Application UI / polished integration

### Đề bài / mục tiêu sản phẩm

Xây một control panel thực sự nằm trong cùng cửa sổ SDL3 với simulation. Người dùng phải click/drag các control để thay đổi trạng thái simulation khi chương trình đang chạy; không dùng ImGui, WebView hay GUI framework.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một panel tương tác có Label, Button, Checkbox và Slider; ví dụ slider thay gravity/temperature, Pause dừng simulation và Reset khởi tạo lại trạng thái.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Panel nằm trong cùng window với simulation thật.
- Button, checkbox, slider tự viết.
- Control cập nhật state simulation runtime.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 4 controls hoạt động.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse click/drag controls; keyboard vẫn điều khiển scene khi UI không capture.

### Mức đồ họa / trình bày tối thiểu

- UI phải trông như một application panel thực sự: typography/spacing/alignment nhất quán, states hover/active/focus rõ ràng và không chồng lấn khi resize.
- Simulation viewport vẫn là trọng tâm; UI không được biến project thành form demo tách rời.
- Bản cuối phải có bố cục đủ sạch để dùng như tool thật, không chỉ các rectangle/debug labels.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Button/checkbox/slider state
- Hit testing
- Input dispatch tối thiểu
- Rendering control
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Một mock UI không điều khiển simulation.
- Dùng ImGui/WebView.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Control thực sự đổi simulation trong cùng window; Pause chỉ dừng thời gian, Reset tái lập preset, Label phản ánh state hiện tại.
- Kiểm press/drag/release, pointer rời control, mất focus và keyboard trên control hỗ trợ; capture không làm simulation nhận thao tác trùng.
- Click chỉ kích hoạt đúng control.
- Slider vẫn drag ổn khi chuột di chuyển nhanh.
- Khi UI đang capture mouse, scene không đồng thời nhận cùng thao tác nếu policy không cho phép.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 66 — Cây giao diện sống qua nhiều frame: Panel chứa Button, Slider và Label

**Mức tham vọng trực quan:** Application UI / retained widget tree

### Đề bài / mục tiêu sản phẩm

Tiếp nối bảng điều khiển của Project 65, tổ chức Panel, Button, Slider và Label thành một cây được giữ trong bộ nhớ. Người học phải tự xây phần sở hữu node, duyệt cây, clipping và định tuyến input; chưa cần HTML, CSS hay layout tự động.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một mô phỏng đang chạy bên cạnh bảng điều khiển có Panel lồng nhau. Khi dịch Panel cha, các control con đi theo. Khi ẩn, vô hiệu hóa hoặc xóa một nhánh, phần còn lại vẫn vẽ và nhận input đúng; không cần dựng lại cả cây ở mỗi frame.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Node có định danh ổn định, loại widget, bounds local, trạng thái visible/enabled và danh sách child; parent quản lý vòng đời child.
- Tính bounds world từ chuỗi parent; vẽ theo thứ tự cây và chọn widget trên cùng theo thứ tự ngược với phép vẽ.
- Clipping theo giao các khung tổ tiên; render và hit-test dùng cùng quy tắc biên.
- Quản lý hover, active/capture và focus bằng định danh còn hợp lệ; nối Button/Slider với state của mô phỏng.
- Có thao tác thêm, ẩn/hiện, enable/disable và xóa nhánh ngay khi chương trình đang chạy.

### Quy mô / độ phức tạp tối thiểu

- Tối thiểu 3 cấp node, tính cả root; có ít nhất 2 Panel và đủ Label, Button, Slider để điều khiển một mô phỏng thật.
- Có trường hợp control bị cắt một phần và trường hợp hai control chồng nhau để kiểm thứ tự chọn.
- Cây tồn tại qua nhiều frame; bước cập nhật vật lý hoặc Reset mô phỏng không tự dựng lại cây.

### Tương tác bắt buộc

- Click Pause/Reset, kéo Slider, chuyển focus bằng Tab/Shift+Tab và kích hoạt control bằng bàn phím.
- Dịch Panel, ẩn/xóa nhánh trong lúc đang kéo, rồi tương tác tiếp mà không crash hoặc kích hoạt nhầm node.
- Có đường hủy gesture và nhả capture khi mất focus cửa sổ hoặc widget không còn hợp lệ.

### Mức đồ họa / trình bày tối thiểu

- Bảng điều khiển có spacing, typography và các trạng thái hover/active/focus phân biệt rõ; simulation vẫn là nội dung chính.
- Debug overlay hiển thị local bounds, world bounds, clip và ID của node đang chọn; có thể tắt để xem giao diện sạch.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây widget tree, ownership/lifetime, phép duyệt, recursive hit testing, clipping và focus order.
- Có thể đặt bounds local bằng tay trong project này. Tự động tính vị trí và kích thước thuộc Project 67; không gộp hai project thành một.
- Không dùng GUI framework thay cho cây UI và input engine tự viết.

### Không được coi là hoàn thành nếu

- Chỉ gom struct vào một vector nhưng vẫn vẽ và xử lý riêng từng control bằng các nhánh hard-code.
- Dựng lại toàn bộ cây mỗi frame, giữ con trỏ đã mất hiệu lực sau khi xóa node hoặc để widget bị clip vẫn nhận chuột.
- Có UI tree trên giấy nhưng bảng điều khiển không tác động đến mô phỏng.

### Acceptance Criteria

- Fixture độc lập xác nhận tọa độ local/world, clip qua nhiều cấp và thứ tự paint/hit-test; node được vẽ trên cùng được chọn đúng.
- Một thao tác chỉ tạo đúng một action. Release ngoài Button, hủy gesture, xóa hoặc ẩn nhánh không tạo click muộn.
- Sau mutation, active/capture/focus không trỏ đến node đã mất; control bị disable không thực hiện action.
- Chạy ít nhất 1.000 frame đọc/vẽ/cập nhật vật lý mà không dựng lại cây hoặc đổi ID của các node còn sống.
- Bản native chạy được và điều khiển mô phỏng thật; kiểm thử có hiệu lực ở cả Debug và Release.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 67 — Bố cục hộp tự động: xếp control từ trên xuống mà không ghi tọa độ tay

**Mức tham vọng trực quan:** Application UI / automatic box layout

### Đề bài / mục tiêu sản phẩm

Dùng lại cây UI của Project 66 và thay các tọa độ đặt tay bằng thuật toán đo kích thước rồi bố trí. Đầu vào là Style và kích thước vùng chứa; đầu ra là bounds để phép vẽ và input tiếp tục dùng chung.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một sidebar chứa tiêu đề, nhóm Pause/Reset/Gravity và phần thông tin. Thay padding, gap, chiều rộng Panel hoặc ẩn một Button khiến những control phía sau tự dịch theo. Panel con tự cao vừa nội dung, còn control vượt khung bị clip đúng.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Box model tách margin bên ngoài với border, padding và content bên trong; Style không bị ghi đè bởi kết quả layout.
- Width hỗ trợ Fill/Fixed; Panel có Auto height theo các child visible. Leaf dùng chiều cao đã khai báo.
- Bố trí theo một cột, cộng margin và gap theo hợp đồng rõ ràng; gap chỉ nằm giữa các child visible.
- Đo kích thước và bố trí đệ quy cho Panel lồng nhau, không đo lại cả subtree ở mỗi lần đặt một child.
- Thêm/xóa/ẩn control, đổi Style hoặc resize làm layout invalid; hoàn tất layout mới trước hit-test và render.
- Fixed width không tự co khi tràn. Bounds đầy đủ và vùng clip được giữ riêng.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 2 Panel, 3 cấp node và một nhóm có ít nhất 4 child visible để kiểm tổng chiều cao, margin và gap.
- Có preset Panel rỗng, một child, nhiều child, node ẩn và nội dung tràn cả chiều ngang lẫn chiều dọc.
- Có đếm số lượt layout để kiểm cache; vật lý, hover và việc vẽ lại không tự làm layout chạy lại.

### Tương tác bắt buộc

- Thay gap/padding/width; ẩn/hiện một Button; thêm và xóa Label mà không sửa tọa độ của những control khác.
- Resize cửa sổ; kéo Slider sau thay đổi bố cục và khi Slider bị clip một phần.
- Nếu hình học thay đổi giữa một gesture, hủy gesture cũ hoặc xử lý bằng chính sách được mô tả và kiểm thử rõ ràng.

### Mức đồ họa / trình bày tối thiểu

- Sidebar có bố cục nhất quán ở cửa sổ rộng và hẹp; không chồng control ngoài các preset cố ý kiểm overflow.
- Inspector tô riêng margin/border/padding/content và hiển thị kết quả đo; có thể tắt lớp debug.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây phép đo, arrange, quy tắc vertical flow, dirty layout và truyền constraint qua cây.
- Project này không yêu cầu row/column, flex-grow/shrink, wrap, scrolling hoặc CSS đầy đủ. TinyFlex thuộc Project 70.
- Kế thừa ownership, ID, input và clipping từ Project 66; không thay cây khi chỉ cần bố trí lại.

### Không được coi là hoàn thành nếu

- Đổi tên các hằng số x/y thành Style nhưng vẫn sửa vị trí từng control bằng tay.
- Cộng gap ở đầu/cuối hoặc cho node ẩn tiếp tục chiếm chỗ mà không đúng hợp đồng đã công bố.
- Input dùng bounds cũ sau resize; clamp Fixed thành Fill để che overflow; chạy layout liên tục dù đầu vào không đổi.

### Acceptance Criteria

- Fixture tính độc lập kiểm đúng border/content/outer size, vị trí child và chiều cao Panel; không dùng chính hàm layout để tạo đáp án.
- Gap của N child visible được cộng N−1 lần; node ẩn không chiếm chỗ, Panel rỗng không có gap giả.
- Thay width hoặc ẩn một control làm các node phụ thuộc cập nhật đúng, còn ID và state mô phỏng giữ nguyên.
- Input ngay sau resize dùng layout mới; phần ngoài clip không hit và Slider vẫn ánh xạ giá trị theo bounds đầy đủ.
- Ít nhất 1.000 frame không đổi đầu vào không phát sinh thêm lượt layout. Kiểm fixture ở Debug và Release.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 68 — Đọc `panel.html` và biến nó thành cây UI

**Mức tham vọng trực quan:** Application UI / TinyHTML structure

### Đề bài / mục tiêu sản phẩm

Cho phép mô tả cấu trúc bảng điều khiển bằng `panel.html` thay vì viết từng lệnh tạo widget trong C++. Parser tạo chính cây UI của Project 66; hình học tiếp tục do box layout của Project 67 tính.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Chỉnh thứ tự hoặc thêm một nhóm control trong `panel.html`, reload và thấy bảng điều khiển đổi theo mà không biên dịch lại C++. Khi file sai, ứng dụng báo vị trí lỗi dễ tìm và không làm hỏng phiên UI đang hoạt động.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Đọc file UTF-8, tách token, parse cấu trúc lồng nhau và tạo cây UI; không nhận đầu vào chỉ là chuỗi hard-code trong source.
- Hỗ trợ subset được ghi rõ: `div`, `span`, `label`, `button`, heading đơn giản và `input` kiểu range/slider; thuộc tính `id`, `class`, text và tham số range.
- Kiểm tra cặp thẻ, thuộc tính và ID; có chính sách minh bạch với tag/attribute không hỗ trợ.
- Reload có kiểm tra: dựng cây mới hợp lệ rồi mới thay cây cũ; không giữ input state hoặc con trỏ thuộc cây đã bị hủy.
- Dùng Style mặc định hoặc cấu hình sẵn để render. Parser/cascade CSS thuộc Project 69, không bắt buộc sớm hơn.

### Quy mô / độ phức tạp tối thiểu

- Một file panel thật với ít nhất 3 cấp node và nhiều control, gồm cả Button lẫn Slider.
- Có ít nhất 2 file/preset cấu trúc khác nhau và tập input sai để kiểm chẩn đoán lỗi.
- Giới hạn kích thước file, số node và độ sâu được công bố; đầu vào vượt giới hạn bị từ chối an toàn.

### Tương tác bắt buộc

- Reload markup trong lúc ứng dụng đang chạy, chuyển focus và sử dụng các control sinh từ file.
- Thử sửa sai thẻ hoặc thuộc tính rồi sửa lại để phục hồi mà không cần khởi động lại ứng dụng.
- Có thể dùng action enum/binding hữu hạn từ project trước; hệ event và binding tổng quát thuộc Project 71.

### Mức đồ họa / trình bày tối thiểu

- UI sinh từ markup có typography, spacing và trạng thái control nhất quán với các project trước.
- Inspector có thể đối chiếu element/ID trong file với widget, bounds và vị trí trong cây; lỗi parse không che khuất toàn bộ ứng dụng.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết TinyHTML tokenizer, parser, kiểm tra cú pháp và chuyển cây parse thành retained UI tree.
- Không dùng WebView, trình duyệt nhúng hoặc thư viện HTML để thay phần parser cốt lõi.
- Không tuyên bố tương thích HTML đầy đủ; cú pháp, entity, whitespace và cách xử lý text trong subset phải được mô tả.

### Không được coi là hoàn thành nếu

- Chỉ dùng regex cho một tag mẫu, in ra cây ở console hoặc render một UI hard-code không phụ thuộc file.
- Có parser nhưng không nối với layout/render/input thực tế.
- Reload file lỗi làm mất UI hợp lệ trước đó, dùng ID trùng không được xử lý hoặc crash vì cấu trúc quá sâu.

### Acceptance Criteria

- Fixture markup hợp lệ sinh đúng loại node, text, thuộc tính, thứ tự và parent; layout cho bounds có thể đối chiếu độc lập.
- Tag không khớp, thuộc tính sai và đầu vào vượt giới hạn có chẩn đoán kèm line/column hoặc offset quy đổi được.
- Hai file cấu trúc khác nhau tạo hai UI khác nhau mà không biên dịch C++; control vẫn nhận chuột và bàn phím đúng.
- Reload trong lúc kéo không để lại capture/focus thuộc cây cũ. Reload thất bại giữ phiên hợp lệ trước đó.
- Bản native load file từ tài nguyên đi kèm và chạy được theo README, không phụ thuộc đường dẫn riêng trên máy tác giả.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 69 — Đọc `style.css`: đổi màu, kích thước và khoảng cách không cần biên dịch C++

**Mức tham vọng trực quan:** Application UI / TinyCSS styling

### Đề bài / mục tiêu sản phẩm

Dùng cây TinyHTML của Project 68 và thêm stylesheet để tách cấu trúc khỏi trình bày. Tự viết parser CSS subset, selector matching và cascade; style đã tính phải thực sự tác động đến paint và box layout của Project 67.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Cùng một `panel.html` có thể chuyển giữa hai stylesheet với màu sắc, kích thước và khoảng cách khác nhau. Inspector cho biết rule nào thắng và giá trị cuối cùng của element đang chọn.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Đọc/reload file `style.css`; parse selector và declaration, không chỉ đọc một danh sách hằng số riêng cho từng widget.
- Hỗ trợ selector theo tag, `.class`, `#id`; element có nhiều class và nhiều rule cùng match.
- Computed style có background, text color, width/height, margin, padding và border trong subset đã công bố.
- Cascade có default style, specificity và source order rõ ràng. Chính sách inheritance, đơn vị, shorthand và property không hỗ trợ phải được ghi cụ thể.
- Đổi màu chỉ yêu cầu paint; đổi kích thước/spacing làm layout invalid trước input. Reload sai có chẩn đoán và không phá style hợp lệ đang dùng.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 2 stylesheet tạo khác biệt dễ thấy trên cùng một sidebar nhiều cấp.
- Có fixture cùng element bị tag/class/id và nhiều rule cùng độ ưu tiên tác động để kiểm cascade thực sự.
- Có cả thay đổi chỉ ảnh hưởng paint lẫn thay đổi ảnh hưởng geometry.

### Tương tác bắt buộc

- Reload stylesheet, đổi theme/preset và resize cửa sổ; UI vẫn tương tác đúng sau khi kích thước thay đổi.
- Chọn một element để xem matched rules/computed style và nhận biết nguồn của giá trị đang được dùng.

### Mức đồ họa / trình bày tối thiểu

- Hai stylesheet đều là giao diện sử dụng được: chữ đọc rõ, spacing hợp lý, control không chồng nhau ngoài preset kiểm lỗi.
- Thông tin chẩn đoán tách khỏi viewport; có thể ẩn inspector để xem panel hoàn chỉnh.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây TinyCSS tokenizer/parser, selector matcher, cascade và ánh xạ computed style sang layout/paint.
- Tiếp tục dùng box layout một cột. `display:flex`, row/column và căn chỉnh Flexbox thuộc Project 70, không gộp vào Project 69.
- Không dùng CSS engine hoặc WebView để tính style; không tuyên bố hỗ trợ toàn bộ CSS.

### Không được coi là hoàn thành nếu

- Chỉ parse rồi in declaration, hoặc đổi stylesheet nhưng giao diện vẫn lấy mọi giá trị từ C++ hard-code.
- Rule được áp theo thứ tự ngẫu nhiên, bỏ specificity hoặc dùng màu để che việc layout không được cập nhật.
- Thay file CSS đòi sửa và biên dịch C++ cho từng element.

### Acceptance Criteria

- Fixture kiểm tag/class/id, source order khi cùng specificity, property override và các giá trị không hợp lệ.
- Thay màu không tự làm layout chạy lại; thay padding/width làm bounds và hit-test cập nhật trước tương tác kế tiếp.
- Hai stylesheet dùng cùng markup và cùng logic C++; kết quả thay đổi thực tế ở cả paint lẫn geometry.
- Input sai có thông báo vị trí/quy tắc liên quan; reload thất bại giữ style hợp lệ trước đó.
- Computed style và expected bounds được kiểm độc lập ở nhiều kích thước cửa sổ.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 70 — Thanh công cụ tự co giãn: TinyFlex cho row/column, gap và căn chỉnh

**Mức tham vọng trực quan:** Application UI / TinyFlex layout

### Đề bài / mục tiêu sản phẩm

Mở rộng box layout của Project 67 và stylesheet của Project 69 bằng một subset Flexbox có hợp đồng rõ ràng. Từ cùng cây TinyHTML, tạo được hàng nút, cột control và nhóm lồng nhau mà không đặt x/y cho từng element.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một sidebar có nhóm control theo cột và toolbar theo hàng. Khi cửa sổ thay đổi kích thước, các phần tử co giãn hoặc căn lại theo Style. Debug overlay cho thấy main axis, cross axis, gap và bounds kết quả.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Hỗ trợ `display:flex`, `flex-direction:row/column`, `gap`, `justify-content` và `align-items` với các giá trị subset được liệt kê rõ.
- Xác định main/cross axis, kích thước cơ sở, không gian còn lại và quy tắc phân phối; có cách khai báo phần tử fixed và phần tử nhận phần không gian dư.
- Có quy tắc rõ cho trường hợp thiếu chỗ: co tới giới hạn đã công bố hoặc giữ kích thước rồi clip/overflow; không âm thầm đổi hợp đồng.
- Layout lồng nhau kết hợp margin/border/padding, visibility và computed style từ các project trước.
- CSS reload và resize làm invalid đúng subtree hoặc toàn cây theo thiết kế; input luôn dùng kết quả mới.

### Quy mô / độ phức tạp tối thiểu

- Một giao diện có tối thiểu 3 flex container, gồm cả row và column, với ít nhất một container lồng trong container khác.
- Có ít nhất 3 kích thước cửa sổ để kiểm: rộng, vừa và hẹp hơn tổng kích thước cơ sở của các item.
- Có fixture hàng/cột với 0, 1 và nhiều child; mỗi giá trị justify/align được công bố phải có kiểm thử.

### Tương tác bắt buộc

- Resize liên tục; đổi row/column, gap và căn chỉnh qua stylesheet/preset.
- Ẩn/hiện một control, đổi độ rộng vùng chứa và tiếp tục dùng Button/Slider bằng chuột lẫn bàn phím.

### Mức đồ họa / trình bày tối thiểu

- Toolbar và sidebar đều giống thành phần của một ứng dụng thật; nhãn, button và slider không bị kéo méo ngoài hợp đồng.
- Đường trục và khung debug có thể bật/tắt; chế độ sạch không chứa thông tin layout thừa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây thuật toán TinyFlex và nối các property với parser, computed style, layout và input hiện có.
- Không dùng Yoga, layout engine của trình duyệt hoặc thư viện khác thay phần bố trí cốt lõi.
- Không bắt buộc flex-wrap, baseline alignment, CSS Grid hoặc đầy đủ tiêu chuẩn Flexbox. Tính năng nào không hỗ trợ phải báo/ghi rõ.

### Không được coi là hoàn thành nếu

- Chỉ có hai cách xếp tọa độ cố định được đặt tên row/column, không tính theo constraint và kích thước child.
- Parse property flex nhưng không dùng trong layout; phải sửa C++ mỗi khi đổi thứ tự/căn chỉnh.
- Resize gây kích thước âm, layout lặp vô hạn hoặc vùng click không khớp vùng vẽ.

### Acceptance Criteria

- Golden layout fixtures kiểm bounds dự kiến cho row/column, nested containers, gap và từng chế độ căn chỉnh đã hỗ trợ.
- Khoảng dư, thiếu chỗ, empty container và một item đều tuân thủ hợp đồng, không phát sinh NaN hoặc kích thước âm.
- Cùng HTML/CSS hoạt động ở ít nhất 3 kích thước cửa sổ; thứ tự input, clip và focus vẫn đúng sau reflow.
- Đổi stylesheet tạo thay đổi layout thật mà không biên dịch lại C++; không có vòng layout không giới hạn.
- Bản native có toolbar, sidebar và một mô phỏng đang chạy; debug layout tắt được.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 71 — Nút HTML gọi hàm C++: DOM-like events và binding vào simulation

**Mức tham vọng trực quan:** Application UI / integrated simulation tool

### Đề bài / mục tiêu sản phẩm

Hoàn thiện event dispatcher và lớp binding trên nền Project 66–70. Tách phần mô tả giao diện khỏi logic mô phỏng: element được tra cứu và nối với callback C++, không phụ thuộc tọa độ hoặc thứ tự widget.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một ứng dụng có viewport mô phỏng lớn và sidebar từ `panel.html` + `style.css`. Pause/Resume, Reset, Slider tham số và Checkbox debug tác động ngay đến state C++; kéo Slider không đồng thời xoay camera hoặc tác động vào cảnh.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Tra cứu element bằng ID và đăng ký callback cho click, thay đổi giá trị và thao tác điều khiển được hỗ trợ.
- Event có target rõ ràng; quy tắc truyền qua ancestor, handled/stop và default action được công bố, không gọi lặp callback.
- Phân quyền input giữa UI và scene, pointer capture có owner và focus bàn phím không bị hover chiếm.
- Binding hai chiều ở mức cần thiết: control sửa Model và nhãn/giá trị hiển thị phản ánh state thật.
- Reload cây hoặc stylesheet không để callback, capture hoặc focus trỏ vào element đã mất; có chính sách kết nối lại binding.

### Quy mô / độ phức tạp tối thiểu

- Một app tích hợp với ít nhất 4 actions/parameters, gồm Pause/Resume, Reset, một Slider và bật/tắt debug.
- Có element lồng nhau và trường hợp target/ancestor có handler để kiểm dispatch.
- Dùng một mô phỏng đã xây trong roadmap, không thay bằng scene mock chỉ đổi một con số.

### Tương tác bắt buộc

- Click, drag, Tab/Shift+Tab và phím kích hoạt control; camera/scene chỉ nhận input khi policy cho phép.
- Reload UI, resize và mất focus trong lúc đang tương tác; tiếp tục điều khiển được sau khi phục hồi.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng trông như một scientific/simulation desktop tool: viewport lớn, sidebar hợp lý và các trạng thái control nhất quán.
- Thông tin runtime, tooltip hoặc lỗi binding không che hiện tượng chính; có chế độ showcase và debug.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây event dispatcher, element lookup, callback registry, lifetime của binding và input ownership policy.
- HTML từ Project 68, CSS từ Project 69 và TinyFlex từ Project 70 phải là nguồn cấu trúc/trình bày thật.
- Không dùng WebView/Chromium/ImGui thay UI stack. Action chạy bằng C++; ngôn ngữ script thuộc Project 72.

### Không được coi là hoàn thành nếu

- Handler chỉ log event hoặc thay nhãn nhưng không đổi state mô phỏng.
- UI HTML/CSS tách khỏi simulator; bản app cuối vẫn dùng control C++ hard-code để làm phần điều khiển thật.
- Một click chạy hai action, kéo Slider đồng thời tác động vào scene hoặc reload để lại callback hết hạn.

### Acceptance Criteria

- Mỗi control được đối chiếu với state mô phỏng trước/sau thao tác; Reset và Pause có hành vi quan sát và kiểm thử được.
- Fixture nested target/ancestor xác nhận thứ tự dispatch, handled policy và số lần callback.
- Chuột được capture cho Slider không điều khiển camera; mất focus/hủy gesture nhả capture đúng.
- Thay cấu trúc/style của UI không cần viết lại solver hoặc logic mô phỏng; thiếu ID binding được báo rõ.
- Một executable tích hợp chạy được từ tài nguyên đi kèm, không phải hai demo riêng ghép bằng mô tả.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 72 — Ngôn ngữ script tí hon: `let`, `if`, `function` để điều khiển UI

**Mức tham vọng trực quan:** Application UI / TinyScript integration

### Đề bài / mục tiêu sản phẩm

Mở rộng ứng dụng của Project 71 để thay logic điều khiển đơn giản bằng file script. Người học tự viết tokenizer, parser và interpreter nhỏ; không cần thay cả solver bằng script và không cần xây một bản JavaScript đầy đủ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Chỉnh file script để đổi hành vi một Button hoặc Slider, reload rồi thấy mô phỏng phản ứng khác mà không biên dịch C++. Script có thể lưu biến, rẽ nhánh và gọi hàm; lỗi cú pháp/runtime được báo trong app mà không làm app treo.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Có file script thật; grammar hỗ trợ `let`, gán biến, biểu thức số/boolean, so sánh, `if` và khai báo/gọi `function`.
- Có environment/scope được định nghĩa rõ; function nhận tham số để xử lý giá trị Slider hoặc event.
- Host API C++ hữu hạn cho Pause/Resume, Reset, chỉnh ít nhất một tham số và đọc state cần thiết; kiểm kiểu/range trước khi đổi Model.
- Handler UI gọi hàm script qua lớp binding của Project 71; phần solver và render vẫn chạy bằng C++.
- Reload có chính sách rõ với state script, binding và lỗi; không tiếp tục giữ tham chiếu đến environment cũ.
- Giới hạn số bước thực thi, độ sâu call stack và kích thước đầu vào; script lỗi hoặc đệ quy không được chiếm vòng lặp vô hạn.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 2 function handler, một biến và một nhánh `if` thực sự làm thay đổi hành vi điều khiển.
- Script điều khiển tối thiểu 3 chức năng: Pause/Resume, Reset và một tham số mô phỏng.
- Có bộ fixture cho parser, scope, function calls, lỗi runtime và giới hạn thực thi.

### Tương tác bắt buộc

- Sửa/reload script; gọi các handler từ Button/Slider trong app thay vì chỉ chạy ở console.
- Cố ý nhập lỗi cú pháp, gọi host function sai và gây đệ quy để quan sát chẩn đoán và phục hồi.

### Mức đồ họa / trình bày tối thiểu

- Giao diện TinyHTML/CSS và mô phỏng vẫn là sản phẩm chính; console/error panel chỉ bổ trợ và có thể ẩn.
- Lỗi chỉ rõ file/vị trí và thông điệp dễ hiểu; người dùng vẫn Pause, reload hoặc thoát ứng dụng được.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây lexer, parser/AST, interpreter, environment và host-function binding.
- Không nhúng Lua, JavaScript engine hoặc ngôn ngữ có sẵn để thay phần interpreter phải học.
- Không yêu cầu vòng lặp, class, module system hay truy cập file/network từ script. Host API không cấp quyền chạy lệnh hệ điều hành.

### Không được coi là hoàn thành nếu

- So sánh nguyên chuỗi script với vài mẫu rồi gọi C++ tương ứng; không có parse và đánh giá biểu thức thật.
- Chỉ có REPL/console, chưa nối script với UI và state mô phỏng.
- File script sai hoặc đệ quy làm app treo; handler tự vượt khỏi host API đã công bố.

### Acceptance Criteria

- Cùng executable và UI có ít nhất 2 cấu hình script tạo hành vi khác nhau mà không biên dịch C++.
- Fixture độc lập kiểm precedence, scope, biến, rẽ nhánh, tham số và gọi hàm; quy tắc đánh giá được mô tả.
- Syntax/runtime error có vị trí hoặc call context đủ tìm lỗi; input sai không tạo state mô phỏng ngoài range.
- Script vượt execution budget bị dừng và báo lỗi trong thời hạn hữu hạn; UI chính tiếp tục nhận input.
- Reload thành công nối handler mới; reload thất bại có chính sách giữ bản hợp lệ hoặc vô hiệu hóa script được ghi rõ và kiểm thử.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

# PHẦN XIII — CÁC PROJECT CẦU NỐI TÙY CHỌN

Project 73–78 là các nhánh bổ trợ, không phải điều kiện bắt buộc để hoàn thành lộ trình chính 01–72. Có thể học xen kẽ khi đã có kiến thức nền tương ứng: camera/phép quay cho Project 73, ray/mesh cho Project 74, cập nhật particle và hiệu năng bộ nhớ cho Project 75, sin/cos và số phức cho Project 76, lấy mẫu/xác suất cho Project 77, số học và kiểm sai số cho Project 78. Khi chọn thực hiện một project, sản phẩm cuối vẫn phải đáp ứng đầy đủ specification của chính project đó.

---

## Project 73 — Camera xoay mượt không gimbal-lock: Quaternion Playground

**Mức tham vọng trực quan:** Interactive 3D mathematics / optional bridge

### Đề bài / mục tiêu sản phẩm

Xây một playground camera 3D để hiểu quaternion qua thao tác quay và nội suy có thể quan sát. Đây là project cầu nối tùy chọn, có thể học sau khi đã có camera và phép quay 3D; không cần chờ hoàn thành UI scripting.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một scene 3D có trục tọa độ và vật thể định hướng rõ. Người dùng quay camera qua pitch gần ±90°, thử chuỗi quay quanh nhiều trục và chuyển giữa hai pose bằng nội suy; orientation bằng quaternion không mất một bậc tự do như biểu diễn Euler trong tư thế suy biến tương ứng.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Biểu diễn orientation bằng quaternion chuẩn hóa; hỗ trợ axis-angle, ghép phép quay và biến đổi vector/camera basis.
- Phân biệt quay theo local/world axis và thứ tự nhân; có debug basis và số đọc quaternion/norm.
- Lưu ít nhất 2 camera pose và nội suy orientation bằng SLERP hoặc phương pháp tương đương có giải thích đầy đủ.
- Có chế độ so sánh với Euler và preset gần tư thế gimbal lock; không dùng sự nhảy số Euler làm bằng chứng duy nhất.
- Chọn dấu quaternion và xử lý hai orientation rất gần nhau để tránh nội suy vòng dài hoặc NaN.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất một scene 3D có perspective/depth, 2 pose nội suy và các preset quay một trục, nhiều trục, gần ±90°.
- Có thể thao tác camera liên tục, không chỉ xem một animation định sẵn.

### Tương tác bắt buộc

- Mouse/keyboard điều khiển camera; đổi local/world rotation, chọn pose và kéo tham số nội suy.
- Pause/reset và chạy từng bước; bật/tắt basis, đường đi hoặc chế độ Euler để so sánh.

### Mức đồ họa / trình bày tối thiểu

- Định hướng camera, vật thể và các trục nhìn rõ trong không gian 3D; màu trục nhất quán.
- Debug math không che scene; chuyển pose mượt và có chế độ sạch để quan sát.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết quaternion operations cần dùng và nối vào camera đã học; không giao toàn bộ phép quay cho thư viện toán.
- Không biến thành bảng công thức hoặc animation 2D; không cần xây một voxel world để hoàn thành project cầu nối này.

### Không được coi là hoàn thành nếu

- Orientation vẫn cập nhật bằng Euler rồi chỉ in thêm 4 số quaternion.
- Chỉ quay quanh một trục để né trường hợp khó, hoặc chuẩn hóa bằng cách che giá trị không hợp lệ.
- Nội suy qua các quaternion tương đương gây quay vòng dài mà không được xử lý.

### Acceptance Criteria

- Kiểm identity, inverse/composition, axis-angle và độ dài vector sau phép quay bằng fixture độc lập.
- Norm giữ gần 1 trong chuỗi quay dài; camera basis vẫn trực chuẩn trong tolerance đã công bố.
- Hai quaternion q và −q cho cùng orientation; nội suy đúng hai đầu và ổn định khi hai pose gần nhau.
- Preset nhiều trục/gần ±90° cho phép người dùng tiếp tục điều khiển camera; so sánh Euler giải thích đúng giới hạn biểu diễn.
- Tốc độ quay theo thời gian không phụ thuộc vô lý vào FPS; scene native và các preset chạy được.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 74 — Chọn tam giác trong model 100k faces: BVH Ray Picker

**Mức tham vọng trực quan:** Interactive 3D geometry / optional bridge

### Đề bài / mục tiêu sản phẩm

Dùng kiến thức ray intersection và mesh viewer để xây BVH tăng tốc picking. Sản phẩm phải xử lý một model thật hoặc mesh sinh bằng thuật toán có ít nhất 100.000 tam giác; brute force giữ vai trò reference, không phải đường chạy duy nhất.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Di chuột/click lên model 3D lớn để highlight đúng tam giác gần camera nhất. Chuyển Brute/BVH cho cùng kết quả; overlay cho thấy số node, số triangle tests và thời gian query thực đo.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Load hoặc sinh mesh, tính triangle bounds/centroid và dựng cây BVH với leaf chứa danh sách/range triangle.
- Tạo ray từ camera qua cursor, ray–AABB culling và ray–triangle test; chọn nearest positive hit theo cùng quy ước với reference.
- Traversal có pruning theo khoảng hit và dữ liệu node; không chỉ bọc toàn mesh bằng một AABB.
- Giữ stable triangle ID để kết quả highlight không phụ thuộc thứ tự sắp xếp lúc build.
- Có chế độ xem bounding boxes theo depth, visited/pruned nodes và vị trí hit.

### Quy mô / độ phức tạp tối thiểu

- Preset bắt buộc có ít nhất 100.000 tam giác thực sự tham gia query; số lượng được hiển thị.
- Có mesh nhỏ kiểm đúng và mesh lớn đo hiệu quả; build time, số node, memory và query time được báo riêng.
- Benchmark dùng tập ray lặp lại được, gồm hit/miss và nhiều góc nhìn; không chỉ đo một ray thuận lợi.

### Tương tác bắt buộc

- Orbit/pan/zoom hoặc camera tự do; click chọn triangle và chuyển Brute/BVH.
- Bật/tắt bounds, đổi depth hiển thị và chạy lại tập ray benchmark.

### Mức đồ họa / trình bày tối thiểu

- Model 3D có depth/lighting đủ đọc bề mặt; triangle và hit point được highlight rõ.
- Bounding boxes và thống kê là lớp debug có thể tắt; không biến viewport thành một bảng benchmark.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây BVH builder/traversal, ray–AABB và ray–triangle path cần dùng; không dùng thư viện ray tracing thay phần tăng tốc cốt lõi.
- Có thể giữ mesh tĩnh; refit/mesh deformation và SAH tối ưu nâng cao không bắt buộc.
- Benchmark tách build, query và render; không cam kết BVH luôn nhanh hơn brute force ở mọi mesh/ray.

### Không được coi là hoàn thành nếu

- Dùng vài trăm triangle rồi tuyên bố có thể scale lên 100k; chỉ test AABB ngoài cùng hoặc vẫn duyệt mọi triangle cho mỗi ray.
- Brute và BVH chọn triangle khác nhau mà không có quy tắc/tolerance giải thích được.
- Chỉ có báo cáo số mà không chọn được triangle trong một mesh viewer tương tác.

### Acceptance Criteria

- Oracle brute force kiểm hit/miss, khoảng cách, hit position và triangle ID trên tập ray cố định; quy tắc tie-break trên cạnh chung được công bố.
- Kiểm ray song song trục, xuất phát trong bounds, miss toàn scene và hit phía sau camera; không chia 0 hoặc tạo NaN không kiểm soát.
- Bounds parent chứa bounds child/triangles và mọi primitive xuất hiện đúng theo thiết kế cây.
- Preset 100k faces chạy picking tương tác; thống kê chứng minh traversal thực sự loại bớt triangle tests trên tập ray đại diện.
- Kết quả benchmark có cấu hình máy, số ray và số lượt lặp; không gộp thời gian build với query để tạo so sánh sai.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 75 — Một triệu particle trên nhiều CPU core: Thread Pool Playground

**Mức tham vọng trực quan:** Large-scale CPU simulation / optional bridge

### Đề bài / mục tiêu sản phẩm

Xây thread pool tái sử dụng worker để chia công việc cập nhật particle trên nhiều CPU core. Project tập trung phân chia dữ liệu, đồng bộ và đo hiệu năng; không chuyển phần cập nhật sang GPU hoặc tạo một thread mới cho từng particle.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Một field/cloud một triệu particle đang chuyển động. Chuyển giữa single-thread và thread pool cho cùng mô hình cập nhật, quan sát thời gian compute và mức sử dụng worker. Giao diện vẫn phản hồi khi đổi số worker, pause hoặc đóng ứng dụng.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Worker tồn tại qua nhiều frame; có hàng đợi hoặc cơ chế phân phối batch, hoàn tất công việc và shutdown/join rõ ràng.
- Chia range particle không chồng lấn; định nghĩa ownership buffer, thời điểm barrier và lúc renderer được đọc dữ liệu.
- Single-thread reference dùng cùng initial state, seed, dt và update rule với bản nhiều luồng.
- Có cách chọn số worker/batch size trong giới hạn tài nguyên; đổi cấu hình tại ranh giới an toàn.
- Đo riêng update, đồng bộ/chuyển dữ liệu và render; báo throughput cùng frame time.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 1.000.000 particle thực sự được CPU cập nhật ở preset bắt buộc; không nhân bản một nhóm nhỏ chỉ để render.
- Có scale ladder và benchmark 1 worker so với nhiều worker khi phần cứng hỗ trợ; ghi rõ số logical core và số worker thực dùng.
- Viewport thể hiện quy mô bằng point cloud/density mapping phù hợp; nếu chỉ vẽ mẫu thì công bố số vẽ khác số cập nhật.

### Tương tác bắt buộc

- Pause/reset, đổi particle count/preset, số worker và batch size; chạy benchmark hữu hạn có thể hủy.
- Camera/pan/zoom phù hợp với scene; bật/tắt profiler và thoát ứng dụng trong trạng thái worker đang hoạt động.

### Mức đồ họa / trình bày tối thiểu

- Chuyển động và phân bố particle đọc được ở quy mô lớn; có mapping theo speed hoặc đại lượng cập nhật thực tế.
- Profiler không che scene; đồ thị so sánh dùng cùng đơn vị và không đánh đồng FPS với tốc độ compute.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự viết thread pool bằng công cụ concurrency chuẩn C++; không dùng task framework thay pool.
- SDL window/event/render giữ trên thread theo yêu cầu API; worker chỉ xử lý phần dữ liệu được phân quyền.
- Không busy-wait vô hạn, không spawn thread mỗi frame và không truy cập đồng thời buffer thiếu đồng bộ.

### Không được coi là hoàn thành nếu

- Chỉ dùng `std::async`/thư viện task để thay toàn bộ pool hoặc chuyển update sang GPU.
- So sánh hai bản khác dt, khác workload hoặc một bản không thực sự cập nhật đủ một triệu particle.
- App deadlock khi Pause/Reset/đóng; shutdown bỏ lại worker hoặc dùng dữ liệu sau khi đã giải phóng.

### Acceptance Criteria

- Sau cùng số bước, state/checksum so với single-thread khớp theo tolerance được công bố; kiểm đủ range, không thiếu hoặc cập nhật hai lần.
- Fixture job rỗng, ít particle hơn worker, range không chia hết và nhiều lần start/stop không treo.
- Stress reset/đổi cấu hình/shutdown tại các ranh giới công việc; mọi wait và bài test có deadline.
- Benchmark có warm-up, nhiều lượt đo, cấu hình máy và compute time tách render; báo kết quả thật kể cả khi nhiều luồng không nhanh hơn.
- Preset một triệu chạy được; trên máy chỉ có một worker khả dụng phải ghi rõ giới hạn, không tuyên bố đã chứng minh tăng tốc đa lõi.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 76 — Nghe thấy Fourier: tự viết DFT và tách tín hiệu thành tần số

**Mức tham vọng trực quan:** Interactive signal processing / optional bridge

### Đề bài / mục tiêu sản phẩm

Xây một sound/spectrum playground để người học nghe và nhìn cùng một tín hiệu. DFT phải do người học tự viết; không gọi FFT hoặc thư viện phổ để thay công thức đang học.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Bật từng tone, thay tần số/biên độ/pha và nghe âm thanh đổi đồng thời với waveform và spectrum. Preset hai tone tạo hai đỉnh; tone lệch bin cho thấy leakage, và preset aliasing giúp đối chiếu âm nghe với tín hiệu lấy mẫu.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Tổng hợp tín hiệu từ ít nhất 2 sine tone; sample rate, N, tần số và trục đơn vị được hiển thị.
- Tự tính DFT complex, magnitude/phase và quy tắc normalization; spectrum của tín hiệu thực phân biệt rõ one-sided/two-sided.
- Có playback từ chính dữ liệu/quy tắc tạo tín hiệu đang phân tích; không phát file âm thanh không liên quan.
- Có preset tone đúng bin, lệch bin, hai tone và aliasing; giải thích giới hạn Nyquist và độ phân giải Fs/N.
- Chọn bin để xem thành phần tần số; nếu có reconstruction thì dùng các thành phần DFT thật, không vẽ đường mẫu cố định.

### Quy mô / độ phức tạp tối thiểu

- Hỗ trợ ít nhất N=256 và N=1.024; có preset nhỏ kiểm công thức và preset nhiều mẫu hơn quan sát độ phân giải.
- DFT trực tiếp có chi phí O(N²); giới hạn N/tần suất tính lại để ứng dụng vẫn phản hồi.
- Có ít nhất 2 tone điều chỉnh độc lập và các fixture tín hiệu zero, constant, impulse, sine.

### Tương tác bắt buộc

- Play/Stop/Mute, chỉnh âm lượng với mức mặc định an toàn; thay tần số, biên độ, pha và số mẫu.
- Pause/reset phép quan sát, chọn bin và so sánh các preset; tắt tiếng vẫn dùng được toàn bộ hình minh họa.

### Mức đồ họa / trình bày tối thiểu

- Waveform theo thời gian và spectrum theo Hz có trục, đơn vị và scale rõ; phase của bin gần zero được xử lý minh bạch.
- Âm thanh, waveform và phổ phản ánh cùng cấu hình; không dùng animation thanh phổ ngẫu nhiên.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây complex accumulation/DFT, tín hiệu tổng hợp và phép ánh xạ bin sang tần số.
- Playback dùng SDL3 audio hoặc API hỗ trợ được nêu rõ, nhưng callback audio không thực hiện DFT nặng hoặc cấp phát tùy tiện.
- Không cần FFT, file decoder hay xử lý âm nhạc phức tạp để đạt sản phẩm cuối.

### Không được coi là hoàn thành nếu

- Chỉ có graph không nghe được âm thanh, hoặc âm phát ra không tương ứng với tín hiệu đang phân tích.
- Gọi thư viện FFT để né DFT; phổ chỉ đánh dấu các tần số đã biết trước từ UI.
- Đổi N làm đóng băng event loop dài hoặc phát âm lượng không được kiểm soát.

### Acceptance Criteria

- Fixture zero/constant/impulse và sine đúng bin khớp nghiệm dự kiến theo normalization đã chọn.
- Hai tone đúng bin có đỉnh đúng vị trí/biên độ trong tolerance; phổ đối xứng theo quy tắc tín hiệu thực.
- Preset lệch bin/aliasing cho kết quả dự đoán được; mọi nhãn Hz dùng sample rate thật.
- Playback start/stop/reset và đổi tham số không tạo dữ liệu ngoài range hoặc audio callback bị chặn bởi DFT.
- Bản native vừa nghe vừa quan sát được; kiểm math tự động được tách khỏi kiểm audio trực tiếp.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 77 — Ném điểm ngẫu nhiên để ước lượng π: Monte Carlo Statistics Lab

**Mức tham vọng trực quan:** Interactive probability and statistics / optional bridge

### Đề bài / mục tiêu sản phẩm

Xây thí nghiệm Monte Carlo lấy mẫu đều trong hình vuông và đếm điểm nằm trong đường tròn đơn vị. Người học phải nhìn thấy cả hình học của phép ước lượng lẫn sự dao động thống kê, không được sửa dữ liệu để kết quả luôn đẹp.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Điểm rơi vào trong/ngoài đường tròn có màu khác nhau; số mẫu, ước lượng π và sai số cập nhật theo batch. Chạy lại bằng seed khác cho đường hội tụ khác, còn đồ thị nhiều lần chạy cho thấy độ phân tán giảm khi tăng N.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Lấy mẫu đều trong hình vuông [−1,1]² bằng PRNG có seed; đếm hit theo x²+y²≤1 và tính ước lượng 4·hits/N.
- Biểu diễn ước lượng/sai số theo N; pause không âm thầm tiếp tục lấy mẫu.
- Có khoảng tin cậy với phương pháp và mức tin cậy được ghi rõ; xử lý N=0 và trường hợp chưa có hit/miss.
- Chạy nhiều trial độc lập có thể tái lập để quan sát phân bố ước lượng, RMSE hoặc độ lệch chuẩn.
- Có thể render lấy mẫu thưa hoặc density map ở N lớn, nhưng thống kê luôn tính trên toàn bộ mẫu và công bố sự khác biệt.

### Quy mô / độ phức tạp tối thiểu

- Scale ladder tối thiểu 1.000, 10.000, 100.000 và 1.000.000 mẫu thực.
- Chế độ thống kê có ít nhất 30 trial ở nhiều mức N; không kết luận từ một seed thuận lợi.
- Sample generation/aggregation chạy theo batch hữu hạn để input và nút hủy luôn được xử lý.

### Tương tác bắt buộc

- Start/pause/reset, đổi seed và số mẫu mục tiêu; chọn một trial hoặc chạy batch nhiều trial.
- Chuyển cách hiển thị điểm/density, bật khoảng tin cậy và đồ thị sai số.

### Mức đồ họa / trình bày tối thiểu

- Hình vuông/đường tròn có cùng tỉ lệ hai trục; màu hit/miss, N và ước lượng đọc rõ.
- Graph cho thấy dao động thật, không làm mượt hoặc đổi scale để tạo cảm giác hội tụ đơn điệu.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây sampler mapping, bộ đếm, estimator, thống kê trial và visualization; có thể dùng PRNG chuẩn C++.
- Không nạp sẵn chuỗi đáp án hoặc ép số hit về tỉ lệ π/4.
- Đây là project cầu nối thống kê; không yêu cầu GPU hay dùng hệ photon của Project 57.

### Không được coi là hoàn thành nếu

- Chỉ tăng một biến N rồi nội suy kết quả về π; các điểm hiển thị không phải nguồn của thống kê.
- Hứa mỗi lần tăng N đều giảm sai số hoặc mọi khoảng tin cậy đều chứa π.
- Một triệu điểm chỉ là dữ liệu vẽ lặp lại, không phải một triệu mẫu đã lấy.

### Acceptance Criteria

- Cùng seed/cấu hình/số mẫu cho cùng kết quả theo hợp đồng PRNG; pause/resume không thay chuỗi mẫu.
- Fixture tọa độ biết trước kiểm hit count và công thức estimator; không chia cho 0 ở trạng thái ban đầu.
- Khoảng tin cậy được tính theo phương pháp công bố và kiểm fixture độc lập, kể cả hit=0 hoặc hits=N; không dùng interval suy biến giả.
- Nhiều trial thể hiện tính ngẫu nhiên và xu hướng sai số khoảng 1/√N; kiểm tự động dùng dung sai thống kê hợp lý, không đòi một lần chạy luôn đúng.
- Mọi chế độ báo số mẫu thật, thời gian lấy mẫu và seed; batch có thể hủy mà không treo UI.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 78 — Máy soi số thực: khi 0.1 + 0.2 không đúng tuyệt đối

**Mức tham vọng trực quan:** Interactive numerical reasoning / optional bridge

### Đề bài / mục tiêu sản phẩm

Xây một phòng thí nghiệm số thực để giải thích vì sao biểu diễn nhị phân hữu hạn không giữ chính xác mọi số thập phân. Người học trực tiếp so sánh kết quả tính, biểu diễn bit và các chiến lược giảm/kiểm soát sai số.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Nhập 0.1 và 0.2 để xem tổng thực tế với đủ chữ số, đối chiếu literal 0.3 và phần chênh lệch. Chuyển float/double, thay thứ tự phép tính hoặc cách cộng chuỗi để thấy sai số thay đổi trên cả số đọc lẫn graph.

Bản hoàn thành phải là một ứng dụng C++/SDL3 tương tác chạy được; Canvas, ảnh chụp, code snippet và console output chỉ bổ trợ, không thay thế sản phẩm native.

### Phạm vi chức năng tối thiểu bắt buộc

- Có chế độ float và double; hiển thị decimal với độ chính xác đủ round-trip, sign/exponent/fraction và giá trị phân loại.
- Các preset tối thiểu: 0.1+0.2, cộng số rất nhỏ vào số lớn, tính không kết hợp, cancellation và cộng dồn nhiều số.
- So sánh equality trực tiếp, absolute tolerance, relative tolerance và khoảng cách ULP trong phạm vi mà định nghĩa cho phép.
- Đối chiếu ít nhất hai cách cộng chuỗi, như naive với Kahan hoặc pairwise, trên cùng dữ liệu.
- Giải thích zero có dấu, NaN và infinity; không áp dụng máy móc cùng một phép so sánh cho mọi trường hợp.
- Công bố định dạng/đặc tính số trên platform đang chạy; reference phải có cơ sở, không coi double là số thực chính xác tuyệt đối.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất 5 preset lỗi số học khác nhau, có cả một phép tính đơn lẻ và chuỗi ít nhất 100.000 số.
- Có fixture gần 0, giá trị lớn, hai số bằng/khác nhau sát nhau và các giá trị đặc biệt.
- Graph hoặc bảng quan sát thể hiện sai số theo số bước/thứ tự cộng; có dữ liệu tham chiếu độc lập.

### Tương tác bắt buộc

- Đổi float/double, nhập toán hạng, chọn preset/thứ tự cộng và thay tolerance.
- Chạy từng bước, pause/reset phép cộng chuỗi, chọn một kết quả để xem bits và chênh lệch.

### Mức đồ họa / trình bày tối thiểu

- Các cột giá trị kỳ vọng, giá trị lưu thật và sai số được phân biệt rõ; không giấu chênh lệch bằng định dạng ít chữ số.
- Bit view có nhãn và màu theo sign/exponent/fraction; graph dùng trục/đơn vị rõ và vẫn đọc được ở sai số rất nhỏ.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Tự xây phần thí nghiệm, đo sai số, chuyển bit an toàn và logic so sánh; không dùng UI chỉ phát lại kết quả viết sẵn.
- Có thể dùng công cụ chuẩn như `std::bit_cast` và `std::numeric_limits`; không type-pun qua con trỏ gây undefined behavior.
- Nếu bit view giả định IEEE 754 binary32/binary64 thì phải kiểm đặc tính platform; build thí nghiệm không dùng tùy chọn fast-math làm thay đổi ngữ nghĩa đang minh họa.

### Không được coi là hoàn thành nếu

- Chỉ ghi rằng số thực có sai số nhưng không cho thao tác hoặc không hiển thị giá trị lưu thật.
- Dạy một epsilon cố định là đúng cho mọi miền giá trị; bỏ qua NaN/infinity hoặc kết luận double luôn chính xác.
- Cố ý gây integer overflow/undefined behavior để minh họa floating point, hoặc graph không lấy từ phép tính thật.

### Acceptance Criteria

- Preset 0.1+0.2 hiển thị đủ chữ số để thấy khác biệt với literal 0.3 ở kiểu phù hợp; kết quả số/bit được kiểm theo platform.
- Fixture kiểm tolerance tuyệt đối/tương đối ở gần 0 và số lớn; signed zero, NaN và infinity tuân theo policy ghi rõ.
- Bit round-trip giữ biểu diễn theo kiểu đã chọn; không phụ thuộc giả định sai về endianness khi trình bày.
- Hai cách cộng dùng cùng chuỗi; sai số được đối chiếu nghiệm có thể tính độc lập hoặc reference có độ chính xác phù hợp, không hứa một cách luôn tốt hơn.
- Bản native cho nhập/thử và xem graph/bit thực; test có hiệu lực ở Debug lẫn Release.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

# PHỤ LỤC A — VÍ DỤ CÁCH ĐỌC SPEC ĐÚNG: VOXEL/MINECRAFT-LIKE

Khi Agent đọc:

> **Project 64 — Minecraft-like sandbox tối giản của riêng bạn**

Agent phải hình dung output cuối gần với:

```text
┌───────────────────────────────────────────────────────────────┐
│ FPS 83   XYZ 142, 37, -218   Chunk 8,-14   Triangles 182k   │
│                                                               │
│                trời / đường chân trời                         │
│          /\               ______                              │
│      ___/  \____      ___/      \___                          │
│ ____/           \____/              \_____                    │
│        terrain voxel 3D procedural                             │
│                                                               │
│                    + crosshair                                 │
│                                                               │
│     người chơi đang đứng BÊN TRONG thế giới                   │
│     WASD + mouse-look, gravity/jump                            │
│     click phá/đặt block                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

Khi đi tiếp 100–300 block:

```text
player moves
    ↓
cross chunk boundary
    ↓
new chunks generated/loaded ahead
    ↓
old chunks unloaded behind
    ↓
terrain continues with no visible seam
```

**Không được diễn giải specification thành:**

```text
[ ][ ][ ][ ]
[ ][ ][ ][ ]   ← minimap
[ ][ ][ ][ ]

hoặc

       cube cube cube
          \ | /
        orbit camera
```

Hai output trên có thể là **bước thử nghiệm sớm**, nhưng không phải sản phẩm cuối của Project 64.

---

# PHỤ LỤC B — TIÊU CHUẨN “ĐỒ HỌA ẤN TƯỢNG” TRONG ROADMAP

“Ấn tượng” không đồng nghĩa photorealistic. Với roadmap này, một simulation được xem là có chất lượng trực quan tốt khi:

- hiện tượng chính đọc được ngay trong vài giây;
- có chuyển động và scale tương xứng với đề bài;
- camera/zoom/pan phù hợp với không gian;
- có depth cue/lighting/color mapping khi là 3D;
- các đại lượng vật lý quan trọng được mã hóa bằng màu/vector/trail/field/graph một cách có chủ đích;
- debug information có thể bật/tắt;
- bố cục UI không che simulation;
- có một showcase mode sạch để quay demo;
- không phụ thuộc vào asset art để tạo ấn tượng;
- solver/algorithm thật vẫn là nguồn tạo ra hình ảnh.

Ví dụ:

### Molecular Dynamics nâng cao

Không chỉ:

```text
. . . . . . . .
```

Mà nên có:

```text
3D atom cloud
+ perspective/depth
+ sphere impostors / readable point rendering
+ color by species/speed/energy
+ free/orbit camera
+ selected atom + neighbor debug
+ energy/temperature overlay
+ profiler toggle
```

### Fluid 3D

Không chỉ một scatter plot.

Nên có:

```text
3D tank/domain
+ dense particles or reconstructed volume
+ depth/lighting
+ color by density/speed
+ dam-break / jet / falling-fluid scenario
+ camera orbit/free-fly
+ pressure/density debug modes
```

### N-body galaxy

Không chỉ vài chục point quay tròn.

Nên có:

```text
thousands+ bodies
+ visible large-scale structure
+ trails / brightness / mass-size mapping
+ pan/zoom/orbit
+ approximation/error overlay
+ simulation speed controls
```

---

# PHỤ LỤC C — PROMPT NGẮN ĐỂ GIAO MỘT PROJECT CHO AI AGENT

Có thể dùng mẫu sau:

```text
Hãy xây dựng giáo trình chi tiết cho Project NN từ specification này.

Bạn được tự quyết định:
- kiến thức cần dạy,
- thứ tự bài,
- bài tập cầu nối,
- milestone triển khai,
- cách tổ chức code.

Bạn KHÔNG được thay đổi:
- sản phẩm cuối,
- phạm vi chức năng tối thiểu,
- quy mô tối thiểu,
- tương tác bắt buộc,
- mức đồ họa/trình bày tối thiểu,
- phần cốt lõi phải tự xây,
- Acceptance Criteria.

Có thể dùng prototype nhỏ trong quá trình học, nhưng giáo trình phải kết thúc bằng sản phẩm hoàn chỉnh đúng specification.
```

---

# PHỤ LỤC D — NGUỒN KỸ THUẬT THAM CHIẾU

Các nguồn này hỗ trợ giải thích mô hình/API; phạm vi sản phẩm và quy mô nghiệm thu vẫn do hợp đồng của từng project trong tài liệu này quy định.

- [Craig Reynolds — Boids](https://www.red3d.com/cwr/boids/): nền tảng hành vi đàn và tương tác cục bộ cho Project 27–28, 40.
- [SDL3 — CMake](https://wiki.libsdl.org/SDL3/README-cmake): tích hợp SDL bằng CMake/FetchContent và target SDL3.
- [Khronos — OpenGL 4.3](https://www.khronos.org/news/press/khronos-releases-opengl-4.3-specification-with-major-enhancements): compute shaders và shader storage buffer objects; kiểm phiên bản/khả năng trước nhánh compute.
- [scikit-image — Radon transform](https://scikit-image.org/docs/stable/auto_examples/transform/plot_radon_transform.html): phân biệt projections, sinogram và reconstruction; nguồn đối chiếu thuật toán, không dùng lời gọi thư viện thay phần tự xây của Project 56.

---

# KẾT LUẬN

Roadmap này định nghĩa **78 sản phẩm**, không định nghĩa **78 bài học cố định**.

AI Agent có nhiệm vụ tự tìm con đường sư phạm tốt nhất từ kiến thức hiện tại của người học tới sản phẩm cuối. Nhưng Agent không được giải bài toán bằng cách thu nhỏ sản phẩm cuối cho vừa với bài học.

Đặc biệt với các project simulation nâng cao, chất lượng cuối được đánh giá đồng thời bởi:

```text
Correctness
+ Scale
+ Interaction
+ Visualization
+ Performance awareness
```

chứ không chỉ bởi việc chương trình compile và hiển thị một demo tối thiểu.

