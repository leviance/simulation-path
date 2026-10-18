# Lộ trình 78 Simulation Project C++ + SDL3 — Product Specification cho AI Agent

> **Mục đích của tài liệu này:** định nghĩa **sản phẩm cuối cùng** của từng project đủ rõ để một AI Agent có thể tự xây giáo trình mà không thu nhỏ, đổi bản chất hoặc biến simulation thành toy demo.  
> Tài liệu **không cố định bài học, chương, milestone học tập hay thứ tự lý thuyết**. AI Agent được tự quyết cách dạy; specification chỉ cố định **đích đến, phạm vi tối thiểu, quy mô, tương tác, ràng buộc kỹ thuật và chất lượng trực quan**.

> **Phạm vi:** 78 project, gồm lộ trình chính **Project 01–72** và sáu project cầu nối tùy chọn **Project 73–78**. Widget Tree, Box Layout, TinyHTML, TinyCSS, TinyFlex, C++ binding và scripting là các project riêng, giữ nguyên số thứ tự từ 66 đến 72.

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
   Graph/debug/UI chỉ bổ trợ.

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

- C++20/23.
- SDL3 cho window, input, event, timing và presentation.
- Không dùng game engine/physics engine trong critical path.
- Trước phần OpenGL: không dùng OpenGL/GLM để né phần renderer/toán phải tự học.
- Từ phần OpenGL trở đi: OpenGL + GLSL được phép.
- UI core: không dùng ImGui/WebView/Chromium thay TinyUI/TinyHTML/TinyCSS.
- AI Agent được chọn thư viện hỗ trợ không làm thay phần cốt lõi phải tự viết.

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
22. **Pháo bắn đạn: kéo chuột chọn góc và vận tốc, so quỹ đạo với công thức** — Quỹ đạo numerical và analytic được vẽ cùng nhau với error.
23. **Cuộc đua Integrator: Euler, Verlet và RK4 chạy cạnh nhau** — Một dashboard có 3–4 simulation chạy song song và plot sai số.
24. **Bể bóng va chạm: hàng trăm quả bóng nảy vào tường và nhau** — Bóng mass/restitution khác nhau va chạm hợp lý, có normal/contact/impulse debug.
25. **Chuỗi lò xo treo: kéo một khối và xem dao động truyền qua cả dây** — Chain 20–100 mass có damping toggle và graph tổng năng lượng.
26. **Hai con lắc gần giống nhau nhưng cuối cùng khác hẳn: trực quan hóa chaos** — Nhìn trực tiếp sensitivity to initial conditions mà không nhầm với numerical instability.
27. **100.000 hạt và chiếc kính lúp: tìm mọi hạt gần con trỏ bằng brute force** — Ứng dụng cho thấy trực tiếp query time và số phép so sánh tăng theo N.
28. **Chia “thành phố hạt” thành ô: tìm hàng xóm bằng Spatial Grid** — Toggle Brute/Grid, cùng neighbor set nhưng thời gian khác.
29. **Bản đồ tự chia ô: Quadtree nhìn thấy được và truy vấn bằng vùng chọn** — Visualizer hiển thị node boundaries, visited và pruned nodes.
30. **Rừng hộp 3D: Octree cho point cloud trong không gian** — Có debug boxes và thống kê node visited.
31. **Thiên hà hạt: N-body từ O(N²) đến Barnes–Hut** — Galaxy toy có slider theta, runtime và force-error plot.
32. **Cuộc đua bộ nhớ: 1 triệu particle với AoS và SoA** — Báo cáo throughput AoS vs SoA trên máy của bạn.
33. **Vẽ lại tam giác cũ bằng GPU và đối chiếu từng bước với renderer CPU** — CPU triangle và GPU triangle chạy cạnh nhau hoặc toggle.
34. **Hai renderer, một khối lập phương: F1 CPU, F2 GPU** — Cube/model có thể render CPU hoặc OpenGL và hiển thị frame timings.
35. **Phòng thí nghiệm shader: sửa GLSL và thấy kết quả ngay** — Compile/reload nhanh; lỗi shader hiện rõ; có gradient/circle/Mandelbrot/noise toy.
36. **Căn phòng hình khối không mesh: ray-march sphere, box và torus** — Scene 3D procedural với camera, normal, lighting và step-count heatmap.
37. **Máy tính vector 1 triệu phần tử trên GPU** — Benchmark CPU vs GPU cho vector operations.
38. **Đài phun 5 triệu hạt: GPU cập nhật và render particle** — Particle fountain/gravity field có profiler và scale ladder tới 5M nếu hardware cho phép.
39. **Cộng một triệu số theo cây: Reduction và Prefix Sum trên GPU** — GPU sum/min/max/scan khớp CPU.
40. **“Thành phố hạt” trên GPU: xây grid và tìm hàng xóm song song** — GPU neighbor candidates khớp CPU reference ở N nhỏ rồi scale lớn.
41. **Hai “nguyên tử” hút và đẩy nhau: trực quan hóa Lennard–Jones** — Graph V(r), force arrow và equilibrium region cập nhật realtime.
42. **Hộp khí 1.000 hạt: Molecular Dynamics CPU đầu tiên** — Box có particles, energy graphs và timestep controls.
43. **Hộp phân tử tuần hoàn: hạt đi ra một phía và quay lại phía đối diện** — Particles wrap liền mạch; pair distance qua biên đúng.
44. **Danh sách hàng xóm có vùng đệm: không tìm lại mọi cặp ở mỗi bước** — MD CPU 10k–100k hạt có profiler build-list vs force.
45. **Molecular Lab GPU: tăng từ 100.000 tới mục tiêu 5 triệu hạt** — GPU MD prototype có profiler và scale ladder.
46. **Hộp cát số: cát rơi, nước giả và cellular automata** — Paint sand/wall/water toy và xem material rơi/chảy.
47. **Tấm kim loại nóng: nhiệt lan từ nơi bạn click ra toàn mặt phẳng** — Heat map có mouse injection và slider dt/D; có thể cố tình làm solver mất ổn định.
48. **Bản đồ gió: nhìn thấy gradient, divergence và curl** — Grid arrows + color maps divergence/curl cập nhật realtime.
49. **Khói bị chuột khuấy: Stable Fluids 2D từng bước** — Khói chảy theo field; debug pressure/divergence.
50. **Bể nước bằng hạt: SPH 2D có thể đổ và va vào thành** — 1k→100k particles chảy trong container toy model.
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

- `length(normalize(v))≈1`.
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

- Dot≈1 cùng hướng, 0 vuông, -1 ngược.
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

- Elastic gần bảo toàn momentum/kinetic energy.
- Inelastic giảm kinetic energy.
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

- Không damping: đo energy drift.
- Có damping: mechanical energy giảm.
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

- Divergence vẫn xuất hiện khi dt đủ nhỏ.
- Energy behavior được theo dõi.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN V — CẤU TRÚC KHÔNG GIAN, QUY MÔ LỚN VÀ HIỆU NĂNG

## Project 27 — 100.000 hạt và chiếc kính lúp: tìm mọi hạt gần con trỏ bằng brute force

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Sinh 100k điểm; rê chuột để highlight tất cả điểm trong radius R bằng quét toàn bộ.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Ứng dụng cho thấy trực tiếp query time và số phép so sánh tăng theo N.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 100k points/particles visible.
- Circle query quanh mouse bằng brute force.
- Counter comparisons + query time.

### Quy mô / độ phức tạp tối thiểu

- N ladder ít nhất 1k,10k,100k.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Move mouse query; change N/radius.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Brute-force query
- Benchmark harness
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ benchmark console không visualization.
- Dùng spatial grid ngay từ đầu.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Có bảng thời gian theo N.
- Kết quả query đúng.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 28 — Chia “thành phố hạt” thành ô: tìm hàng xóm bằng Spatial Grid

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Dùng uniform grid/spatial hash cho cùng bài toán Project 27 và chứng minh kết quả khớp brute force.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Toggle Brute/Grid, cùng neighbor set nhưng thời gian khác.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cùng dataset Project 27.
- Uniform grid/spatial hash.
- Toggle brute-force/grid và compare neighbor IDs.

### Quy mô / độ phức tạp tối thiểu

- 100k points target; scale thêm nếu máy chịu.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Mouse query, cell/debug toggle.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Cell indexing/hash
- Grid build/query
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ render grid lines.
- Không chứng minh query đúng so brute-force.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Neighbor set khớp reference.
- Có build/query timings.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 29 — Bản đồ tự chia ô: Quadtree nhìn thấy được và truy vấn bằng vùng chọn

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Click thêm point; quadtree tự subdivide và rectangle/circle query chỉ đi qua node cần thiết.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Visualizer hiển thị node boundaries, visited và pruned nodes.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Interactive quadtree visible boundaries.
- Points inserted dynamically.
- Range selection query with visited/pruned nodes.

### Quy mô / độ phức tạp tối thiểu

- Ít nhất hàng nghìn points.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Click add; drag query rectangle/circle.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Quadtree insert/query
- Visualizer
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Một ảnh cây tĩnh.
- Quadtree chỉ dùng để render nhưng không query.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Query khớp brute force.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 30 — Rừng hộp 3D: Octree cho point cloud trong không gian

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Sinh point cloud 3D, chia bằng octree và query sphere/frustum trong camera.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Có debug boxes và thống kê node visited.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Point cloud 3D + octree node boxes.
- 3D range query/culling.
- Free camera.

### Quy mô / độ phức tạp tối thiểu

- Tens/hundreds thousands points tùy máy.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- FPS/orbit camera; query sphere/frustum toggle.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Octree
- AABB tests
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Minimap 2D của octree.
- Chỉ serialize tree không visualize/query.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Range query khớp brute force.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 31 — Thiên hà hạt: N-body từ O(N²) đến Barnes–Hut

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Mô phỏng lực hấp dẫn cho hàng nghìn vật thể và so brute force với tree approximation.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Galaxy toy có slider theta, runtime và force-error plot.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- N-body simulation visible as galaxy/system.
- Brute-force reference + Barnes–Hut mode.
- Theta/error/runtime controls.

### Quy mô / độ phức tạp tối thiểu

- Thousands+ bodies, đủ để thấy scaling.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Pan/zoom/3D camera; theta slider; reset presets.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.
- Galaxy/N-body phải có đủ hạt để tạo cấu trúc thị giác như cụm, disk hoặc quỹ đạo; dùng trail/brightness/size/color theo mass hoặc speed.
- Có camera pan/zoom hoặc orbit nếu 3D; slider approximation phải phản ánh ngay trong simulation/metrics.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- N-body solver
- Barnes–Hut traversal
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ render random particles không gravity.
- Dùng Barnes-Hut không có brute-force validation.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Theta nhỏ → error giảm, cost tăng theo xu hướng.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 32 — Cuộc đua bộ nhớ: 1 triệu particle với AoS và SoA

**Mức tham vọng trực quan:** Simulation / data-rich visualization

### Đề bài / mục tiêu sản phẩm

Viết hai layout dữ liệu và benchmark cùng một update loop.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Báo cáo throughput AoS vs SoA trên máy của bạn.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Benchmark executable with 1M particle records.
- AoS vs SoA same update loop.
- Repeated timing report.

### Quy mô / độ phức tạp tối thiểu

- 1M records or memory-equivalent large N.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- CLI or in-app trigger benchmark.

### Mức đồ họa / trình bày tối thiểu

- Ứng dụng phải trực quan hóa được quy mô dữ liệu lớn bằng point cloud/particles/tree cells/heatmap hoặc overlay tương ứng.
- Query, visited nodes, neighbor set, approximation hoặc memory/performance comparison phải nhìn thấy được trong UI/viewport, không chỉ in benchmark ra console.
- Khi dữ liệu lớn, màu sắc/kích thước/opacity cần được dùng có chủ đích để người xem vẫn đọc được cấu trúc thay vì một đám điểm vô nghĩa.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Benchmark
- AoS/SoA containers
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ mô tả cache theory.
- So hai thuật toán khác nhau làm benchmark không công bằng.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Báo median/average từ nhiều lần.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN VI — OPENGL, GLSL VÀ GRAPHICS PIPELINE TRÊN GPU

## Project 33 — Vẽ lại tam giác cũ bằng GPU và đối chiếu từng bước với renderer CPU

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

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

- Demo GPU phải chạy real-time và có chất lượng trình bày xứng đáng với việc chuyển sang GPU: viewport lớn, chuyển động mượt, depth/lighting/color rõ ràng.
- Shader project phải có ít nhất một chế độ 'showcase' sạch bên cạnh debug mode.
- Không chấp nhận chỉ render tam giác/cube rất nhỏ ở giữa cửa sổ mà không có camera, nền hoặc context trực quan phù hợp với đề bài.

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

- Cùng input cho hình tương đương.
- Giải thích GPU thay phần nào của CPU pipeline.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 34 — Hai renderer, một khối lập phương: F1 CPU, F2 GPU

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Dùng chung Mesh/Camera/Math, chuyển backend render bằng phím.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Cube/model có thể render CPU hoặc OpenGL và hiển thị frame timings.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Cùng cube/mesh/camera render được bằng CPU và GPU backends.
- Depth/culling GPU.
- Frame stats.

### Quy mô / độ phức tạp tối thiểu

- Cùng transform/camera cho hai backend.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- F1 CPU/F2 GPU hoặc UI toggle.

### Mức đồ họa / trình bày tối thiểu

- Demo GPU phải chạy real-time và có chất lượng trình bày xứng đáng với việc chuyển sang GPU: viewport lớn, chuyển động mượt, depth/lighting/color rõ ràng.
- Shader project phải có ít nhất một chế độ 'showcase' sạch bên cạnh debug mode.
- Không chấp nhận chỉ render tam giác/cube rất nhỏ ở giữa cửa sổ mà không có camera, nền hoặc context trực quan phù hợp với đề bài.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- GPU mesh wrapper nhỏ
- Uniform handling
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Hai demo tách rời không dùng chung scene state.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Transform nhất quán giữa hai backend.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

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

- Có max steps/distance.
- Phân biệt SDF ray marching với general ray tracing.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN VII — GPU COMPUTE VÀ HÀNG TRIỆU PHẦN TỬ

## Project 37 — Máy tính vector 1 triệu phần tử trên GPU

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Dùng compute shader cộng/scale mảng lớn và kiểm tra từng phần tử với CPU.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Benchmark CPU vs GPU cho vector operations.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- GPU compute trên arrays lớn.
- CPU reference comparison.
- Timing per N.

### Quy mô / độ phức tạp tối thiểu

- 1M elements target.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Trigger/run benchmark; change N.

### Mức đồ họa / trình bày tối thiểu

- Khi project có dữ liệu GPU lớn, phải có visualization trực tiếp của kết quả tính toán hoặc một dashboard benchmark trực quan nếu bản chất project thuần compute.
- Các project particle/grid phải dùng viewport 3D hoặc 2D dày đặc phù hợp với dữ liệu; màu theo tốc độ/mật độ/cell/neighbor để thấy cấu trúc.
- Scale lớn không được đánh đổi thành hình ảnh khó đọc; cần culling/opacity/point size/impostor hoặc camera control phù hợp.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Compute wrapper nhỏ
- CPU reference
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ dùng fragment shader giả compute.
- Không validate output.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- GPU output khớp CPU tolerance.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 38 — Đài phun 5 triệu hạt: GPU cập nhật và render particle

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Tăng từ 10k lên hàng triệu particle; compute shader update position/velocity, graphics render points.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Particle fountain/gravity field có profiler và scale ladder tới 5M nếu hardware cho phép.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Particle system cập nhật position/velocity trên GPU.
- GPU rendering trực tiếp từ GPU state.
- Scale ladder tới 5M nếu hardware cho phép.

### Quy mô / độ phức tạp tối thiểu

- Bắt buộc đạt 1M; 5M là target theo VRAM/hardware.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Camera; pause/reset; particle-count presets.

### Mức đồ họa / trình bày tối thiểu

- Khi project có dữ liệu GPU lớn, phải có visualization trực tiếp của kết quả tính toán hoặc một dashboard benchmark trực quan nếu bản chất project thuần compute.
- Các project particle/grid phải dùng viewport 3D hoặc 2D dày đặc phù hợp với dữ liệu; màu theo tốc độ/mật độ/cell/neighbor để thấy cấu trúc.
- Scale lớn không được đánh đổi thành hình ảnh khó đọc; cần culling/opacity/point size/impostor hoặc camera control phù hợp.
- Preset lớn phải tạo một trường particle 3D dày đặc có chuyển động rõ, camera tự do/orbit và color mapping theo speed/age/energy.
- Không chấp nhận 5 triệu point cùng màu trên nền phẳng mà không có depth/size/opacity strategy.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Particle SSBO layout
- Compute update
- Particle renderer
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- 5M điểm tĩnh chỉ render.
- CPU update + GPU draw nhưng gọi là GPU simulation.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Simulation update thật trên GPU.
- Không copy toàn bộ về CPU mỗi frame.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 39 — Cộng một triệu số theo cây: Reduction và Prefix Sum trên GPU

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Tự viết parallel reduction và exclusive scan làm primitive cho GPU grids.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

GPU sum/min/max/scan khớp CPU.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- Parallel reduction + prefix sum kernels.
- CPU verification.
- Large-array benchmark.

### Quy mô / độ phức tạp tối thiểu

- At least 1M elements.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Run different sizes; show result/time.

### Mức đồ họa / trình bày tối thiểu

- Khi project có dữ liệu GPU lớn, phải có visualization trực tiếp của kết quả tính toán hoặc một dashboard benchmark trực quan nếu bản chất project thuần compute.
- Các project particle/grid phải dùng viewport 3D hoặc 2D dày đặc phù hợp với dữ liệu; màu theo tốc độ/mật độ/cell/neighbor để thấy cấu trúc.
- Scale lớn không được đánh đổi thành hình ảnh khó đọc; cần culling/opacity/point size/impostor hoặc camera control phù hợp.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- Reduction kernels
- Scan kernels
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ gọi thư viện scan/reduction.
- Không xử lý multi-workgroup case.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Integer exact.
- Float ghi rõ non-associativity.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 40 — “Thành phố hạt” trên GPU: xây grid và tìm hàng xóm song song

**Mức tham vọng trực quan:** Advanced GPU / real-time showcase

### Đề bài / mục tiêu sản phẩm

Chuyển Project 28 lên GPU và tạo contiguous cell ranges.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

GPU neighbor candidates khớp CPU reference ở N nhỏ rồi scale lớn.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- GPU cell grid built from particle positions.
- Cell offsets/ranges available on GPU.
- Neighbor query validated with CPU.

### Quy mô / độ phức tạp tối thiểu

- Validate at small N, benchmark 100k–1M.
- Phiên bản nhỏ hơn có thể được dùng như bước học trung gian, nhưng **không được dùng làm sản phẩm cuối**.

### Tương tác bắt buộc

- Debug selected particle/cell/neighbors.

### Mức đồ họa / trình bày tối thiểu

- Khi project có dữ liệu GPU lớn, phải có visualization trực tiếp của kết quả tính toán hoặc một dashboard benchmark trực quan nếu bản chất project thuần compute.
- Các project particle/grid phải dùng viewport 3D hoặc 2D dày đặc phù hợp với dữ liệu; màu theo tốc độ/mật độ/cell/neighbor để thấy cấu trúc.
- Scale lớn không được đánh đổi thành hình ảnh khó đọc; cần culling/opacity/point size/impostor hoặc camera control phù hợp.
- Phải có chế độ debug trực quan cell grid/selected particle/neighbors trên một subset nhỏ, bên cạnh benchmark scale lớn.
- Người dùng phải có thể chọn một particle và thấy candidate/actual neighbors của nó.

### Ràng buộc kỹ thuật / phần cốt lõi phải tự xây

- GPU grid pipeline
- CPU/GPU validator
- AI Agent được tự chọn cách tổ chức source code, abstraction và thứ tự triển khai miễn không né phần cốt lõi của project.

### Không được coi là hoàn thành nếu

- Chỉ color particle by cell.
- Không tạo data structure dùng được cho neighbor loops.
- Chỉ có ảnh/chụp màn hình hoặc mô tả lý thuyết mà không có chương trình chạy được.
- Chỉ hoàn thành một prototype trung gian nhỏ hơn đáng kể rồi đổi tên thành sản phẩm cuối.
- Chỉ có screenshot/video/render tĩnh mà không có chương trình chạy được.
- Dùng debug visualization thô làm đầu ra duy nhất khi project ở mức Advanced/Capstone.

### Acceptance Criteria

- Neighbor logic khớp reference.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---


# PHẦN VIII — MOLECULAR DYNAMICS

## Project 41 — Hai “nguyên tử” hút và đẩy nhau: trực quan hóa Lennard–Jones

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

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

- 10k target; aim 100k CPU if reasonable.
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

- Grid resolution sufficient for smooth diffusion, e.g. 128²+.
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

- Có experiment stability vs dt/dx.
- Nguồn đối xứng giữ symmetry gần đúng.
- Đạt đầy đủ **phạm vi chức năng**, **quy mô**, **tương tác** và **mức đồ họa/trình bày tối thiểu** ở trên.
- Có ít nhất một cách kiểm chứng correctness phù hợp với project: reference CPU/brute-force, nghiệm giải tích, invariant, conservation law, unit test, statistical check hoặc visual debug có cơ sở.
- Có chế độ demo đủ sạch để người khác nhìn vào hiểu ngay project đang mô phỏng/giải quyết điều gì.

### Quyền tự quyết của AI Agent khi xây giáo trình

Agent được tự chọn kiến thức cần dạy, thứ tự bài học, bài tập cầu nối, cách chia milestone và cách giải thích. Agent có thể bắt đầu bằng phiên bản nhỏ để học, nhưng toàn bộ giáo trình phải hội tụ về đúng Acceptance Criteria của specification này.

---

## Project 48 — Bản đồ gió: nhìn thấy gradient, divergence và curl

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

### Đề bài / mục tiêu sản phẩm

Tạo vector-field inspector với presets vortex/source/sink và overlays.

### Trải nghiệm cuối cùng bắt buộc phải nhìn thấy

Grid arrows + color maps divergence/curl cập nhật realtime.

Bản hoàn thành phải là một executable tương tác hoặc tool chạy được đúng bản chất project; không chỉ là code snippet, ảnh chụp, notebook hay console output.

### Phạm vi chức năng tối thiểu bắt buộc

- 2D vector field arrows.
- Presets source/sink/vortex/uniform.
- Gradient/divergence/curl overlays.

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

- Grid 128² or comparable; stable at interactive timestep.
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

- 1k starting, 5k minimum useful, scale upward.
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

**Mức tham vọng trực quan:** Advanced Scientific Simulation / trực quan hóa giàu thông tin

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

