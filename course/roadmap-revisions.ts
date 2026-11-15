import type { ProjectRevision } from "./types";

// Keep the revision until the replacement has been built and accepted.
// The replacement keeps existing links working; only its optional note marks acceptance as pending.
const previousMolecularPart = "MÔ PHỎNG PHÂN TỬ TỪ 2 HẠT TỚI HÀNG TRIỆU HẠT";

export const roadmapRevisions: Readonly<Record<string, ProjectRevision>> = {
  "40": {
    previousTitle: "“Thành phố hạt” trên GPU: xây grid và tìm hàng xóm song song",
    replacement: {
      slug: "cloth-workshop",
    },
    summary:
      "Kéo một góc vải, ghim nó lại rồi thả tấm vải phủ lên vật thể; quan sát nếp gấp và tiếp xúc trong không gian 3D.",
    outcome:
      "Một xưởng vải 3D có bề mặt liền mạch, topology đọc được và tương tác kéo/ghim/thả. Debug constraint, contact và grid bổ trợ cho cảnh vải.",
    question: "Làm sao một lưới điểm trở thành tấm vải có thể gấp, kéo và phủ lên vật thể?",
    interactions: [
      "Kéo, ghim, bỏ ghim và thả vải lên vật thể.",
      "Chọn preset, chỉnh độ mềm và đối chiếu trước/sau.",
      "Pause, Reset, single-step; xem mesh, contact và sai số constraint.",
    ],
    concepts: [
      "Constraint solver, compliance, lịch cập nhật song song và residual.",
      "Spatial grid 3D, tiếp xúc và GPU rendering của một bề mặt.",
    ],
    prerequisites:
      "Vector, camera, timestep và compute; constraint được chuẩn bị tại chỗ hoặc nối từ Project 25, grid từ Project 28 được mở rộng rõ sang 3D.",
    workload:
      "Mục tiêu: ít nhất 100.000 đỉnh vải động và toàn bộ constraints được xử lý trên GPU; 1 triệu đỉnh là mở rộng. Đếm riêng đỉnh ghim, contacts và các pass.",
  },
  "41": {
    previousTitle: "Hai “nguyên tử” hút và đẩy nhau: trực quan hóa Lennard–Jones",
    previousPart: previousMolecularPart,
    replacement: {
      slug: "geometry-workshop",
      acceptanceNote:
        "Bạn có thể học, thử Canvas và tải mã nguồn Xưởng hình học 3D. Thao tác kéo và buông chuột ngoài cửa sổ C++ vẫn chờ kiểm trực tiếp.",
    },
    summary:
      "Kéo tham số để tạo vỏ ốc, dải Möbius và nút thắt; soi wireframe, normals rồi xuất mesh do chính bạn sinh ra.",
    outcome:
      "Một xưởng tạo hình 3D: công thức thay đổi thì bề mặt đang có ánh sáng cũng thay đổi. Có preset, kiểm đường nối và xuất OBJ hoặc mesh đơn giản.",
    question: "Một công thức biến thành bề mặt có ánh sáng như thế nào?",
    interactions: [
      "Chọn torus, vỏ ốc/ống xoắn, dải Möbius hoặc torus knot.",
      "Chỉnh tham số và resolution; xem UV, wireframe, tangent/normal.",
      "Xoay, pan, zoom và xuất mô hình.",
    ],
    concepts: [
      "Tham số u/v, lấy mẫu curve/surface, seam, winding và topology.",
      "Frame dọc curve, tangent/normal, dirty flags và giữ mesh hợp lệ gần nhất.",
    ],
    prerequisites:
      "Vector, camera và nền graphics; frame dọc curve được giải thích, không bắt học quaternion trước.",
    workload:
      "Mục tiêu: một preset có ít nhất 65.536 vertices thật; hiển thị số vertex, triangle và dung lượng mesh.",
  },
  "42": {
    previousTitle: "Hộp khí 1.000 hạt: Molecular Dynamics CPU đầu tiên",
    previousPart: previousMolecularPart,
    replacement: {
      slug: "particle-morph-studio",
    },
    summary:
      "Cho một mô hình tan thành một triệu hạt rồi tụ lại thành mô hình khác; kéo timeline để xem và đảo ngược từng giai đoạn.",
    outcome:
      "Một công cụ biến hình particle có timeline, nhiều cách ghép điểm và đường đi. So sánh trực tiếp để thấy vì sao hạt bị dồn hoặc chuyển động bị rối.",
    question: "Vì sao rải hạt ngẫu nhiên lên mesh lại chưa chắc đều?",
    interactions: [
      "Chọn hai mô hình, N và seed; scrub, đảo chiều hoặc lặp quá trình.",
      "Đổi cách sampling, ghép điểm và đường nội suy để đối chiếu A/B.",
      "Chạy/hủy bước chuẩn bị mà không làm mất kết quả hợp lệ trước đó.",
    ],
    concepts: [
      "Triangle area, weighted CDF và barycentric sampling.",
      "Correspondence, interpolation/easing, GPU update/draw và chi phí chuẩn bị dữ liệu.",
    ],
    prerequisites:
      "Mesh/camera và compute; có thể dùng mesh từ Project 41 nhưng mỗi gói vẫn chạy độc lập.",
    workload:
      "Mục tiêu: ít nhất 1 triệu hạt được cập nhật và vẽ thật trên GPU; 5 triệu là mở rộng.",
  },
  "43": {
    previousTitle: "Hộp phân tử tuần hoàn: hạt đi ra một phía và quay lại phía đối diện",
    previousPart: previousMolecularPart,
    replacement: {
      slug: "mandelbulb-explorer",
    },
    summary:
      "Xoay và phóng gần vào fractal Mandelbulb; thay một phép lặp ngắn để khám phá những hình dạng 3D phức tạp.",
    outcome:
      "Một trình khám phá fractal có camera, preview phản hồi nhanh và ảnh được tính tinh dần. Heatmap cho thấy vùng nào cần nhiều bước tính hơn.",
    question: "Vì sao một phép lặp ngắn lại sinh ra nhiều chi tiết đến vậy?",
    interactions: [
      "Orbit, pan, zoom và đổi power, bailout, iteration/step budget.",
      "So sánh chất lượng hình với heatmap số bước và chi phí.",
      "Hủy refinement khi đổi camera; phân biệt preview với ảnh tính hoàn chỉnh.",
    ],
    concepts: [
      "Spherical-power recurrence, escape và distance estimate, khác SDF chính xác.",
      "Precision, epsilon, bảo vệ NaN và progressive tiled refinement.",
    ],
    prerequisites:
      "Vector/camera và ray marching từ Project 36; recurrence và distance estimate được giải thích qua hình đang dựng.",
    workload:
      "Mục tiêu: ảnh tính đầy đủ ít nhất 960×540; công bố pixels, ray steps và iterations, không hứa chi tiết vô hạn.",
  },
  "44": {
    previousTitle: "Danh sách hàng xóm có vùng đệm: không tìm lại mọi cặp ở mỗi bước",
    previousSlug: "neighbor-list-skin",
    previousPart: previousMolecularPart,
    replacement: {
      slug: "volume-sculptor",
    },
    summary:
      "Dùng cọ 3D để nặn, khoét lỗ và ghép khối; xem lát cắt bên trong rồi xuất bề mặt thành mesh.",
    outcome:
      "Một công cụ điêu khắc thể tích có cọ thêm/bớt vật liệu, undo/redo và bề mặt được dựng lại từ dữ liệu vừa chỉnh; không chỉ là đổi vài primitive có sẵn.",
    question: "Làm sao một mảng số biến thành vật thể có lỗ và bề mặt cong?",
    interactions: [
      "Chỉnh bán kính/độ mạnh của cọ; nặn, khoét và nối khối.",
      "Undo/redo, xem slice, wireframe và gradient normals.",
      "Xuất mesh; hủy tác vụ và giữ kết quả hợp lệ khi vượt capacity.",
    ],
    concepts: [
      "Scalar grid, world-grid mapping, brush/falloff và dirty regions.",
      "Edge interpolation, topology, gradient normals và GPU count/scan/emit.",
    ],
    prerequisites:
      "Graphics, camera và compute/scan; gradient và picking được hướng dẫn tại chỗ, không giấu prerequisite ở Project 48/52.",
    workload:
      "Mục tiêu: ít nhất 128×128×128 scalar samples; đếm riêng samples, cells và triangles, kiểm capacity trước khi xuất mesh.",
  },
  "45": {
    previousTitle: "Molecular Lab GPU: tăng từ 100.000 tới mục tiêu 5 triệu hạt",
    previousSlug: "molecular-lab-gpu",
    previousPart: previousMolecularPart,
    replacement: {
      slug: "atomic-playground",
    },
    summary:
      "Khám phá đám mây orbital bằng một triệu mẫu điểm: đổi orbital, cắt lớp và đo những vùng dày/thưa trong không gian 3D.",
    outcome:
      "Atomic Playground có camera, clipping, công cụ đo phân bố và các orbital mẫu. Công thức density được cung cấp; bạn tự xây sampling, GPU rendering và các công cụ quan sát.",
    question: "Những chấm dày và thưa tạo nên hình dạng đám mây orbital như thế nào?",
    interactions: [
      "Chọn orbital, N/seed và cách hiển thị; orbit, pan, zoom.",
      "Cắt lớp, đặt vùng đo và so histogram/phân bố với reference.",
      "Lưu/mở cấu hình nhỏ; hủy sampling mà vẫn giữ cloud hợp lệ trước đó.",
    ],
    concepts: [
      "Generic weighted sampling, chuẩn hóa PDF/CDF và kiểm sai số phân bố.",
      "GPU buffers/job lifecycle, rendering, memory và performance; không suy lý thuyết lượng tử.",
    ],
    prerequisites:
      "Camera/graphics, compute và sampling được chuẩn bị tại chỗ hoặc từ Project 42; catalog density C++/GLSL có nguồn và fixtures được cung cấp.",
    workload:
      "Mục tiêu: ít nhất 1 triệu mẫu vị trí hợp lệ; đây không phải 1 triệu electron tương tác. 5 triệu mẫu là mở rộng.",
  },
  "46": {
    previousTitle: "Hộp cát số: cát rơi, nước giả và cellular automata",
    replacement: {
      slug: "falling-sand",
    },
    summary: "Vẽ cát, nước và tường rồi phá bệ, mở đập hoặc rót qua phễu trên lưới 163.840 ô.",
    outcome:
      "Hộp cát C++/SDL3 tương tác với bút vẽ, tốc độ, cảnh mẫu, inspector và chế độ xem sạch.",
    question: "Vài quy tắc đổi chỗ trong lân cận tạo nên đống cát và dòng nước giả thế nào?",
    interactions: [
      "Vẽ/tẩy, chạy/dừng/từng tick và đổi speed.",
      "Đổi preset/seed/order, xóa hoặc đặt lại; xem sạch hoặc đọc bộ đếm.",
    ],
    concepts: [
      "Grid, material rules, moved mask và cập nhật tại chỗ có thứ tự.",
      "Fixed tick, RGBA/pitch, streaming texture, fixtures và benchmark hữu hạn.",
    ],
    prerequisites: "Window/renderer/input từ Project 01–04; không cần OpenGL hoặc Project 45.",
    workload: "Final 512×320 = 163.840 ô thực sự được cập nhật/vẽ; 96×64 chỉ là bước học ban đầu.",
  },
  "47": {
    previousTitle: "Tấm kim loại nóng: nhiệt lan từ nơi bạn click ra toàn mặt phẳng",
    replacement: {
      slug: "heat-plate",
    },
    summary:
      "Tô nóng/lạnh lên tấm, chọn nguồn giữ nhiệt và dùng slider D/dt để quan sát khuếch tán hoặc bất ổn số.",
    outcome:
      "Công cụ C++/SDL3 192×192 ô có hai kiểu biên, heater, probe, gallery, thí nghiệm có giới hạn và chế độ xem sạch.",
    question:
      "Một công thức trao đổi giữa các ô tạo ra quá trình lan nhiệt thế nào, và vì sao dt quá lớn làm nghiệm sai?",
    interactions: [
      "Tô bằng chuột/phím, chỉnh D/dt, pause/step/reset/clear.",
      "Chọn biên, heater, cảnh mẫu, độ phân giải và probe; chủ động bật thí nghiệm bất ổn.",
    ],
    concepts: [
      "Laplacian, explicit Euler, double buffer và điều kiện ổn định.",
      "Nguồn/biên, nghiệm rời rạc/PDE, refinement, texture/pitch và đo chi phí hữu hạn.",
    ],
    prerequisites:
      "Window/input/grid từ Project 01–04; sai phân và mô hình nhiệt được giải thích tại chỗ, không cần OpenGL.",
    workload:
      "Final 192×192 = 36.864 ô cập nhật/vẽ thật; 128/192/256 cùng miền cách nhiệt 96×96, 32×32 chỉ là lưới học.",
  },
  "48": {
    previousTitle: "Bản đồ gió: nhìn thấy gradient, divergence và curl",
    replacement: {
      slug: "wind-map",
    },
    summary:
      "Đọc một trường gió bằng mũi tên, các toán tử số và tracer cùng đi theo dữ liệu trên lưới.",
    outcome:
      "Công cụ C++/SDL3 có preset, gradient riêng, divergence/curl, inspector, legend, vệt tracer và xoáy tương tác.",
    question: "Độ dốc của scalar, dòng ra ròng và xu hướng quay cục bộ khác nhau ở đâu?",
    interactions: [
      "Chọn overlay/preset, kéo xoáy hoặc đặt bằng bàn phím.",
      "Pause/step/reset, bật tắt tracer, xem sạch và tinh lưới.",
    ],
    concepts: [
      "Gradient, divergence, curl và sai phân hai phía/một phía.",
      "Bilinear, midpoint RK2, thời gian mô hình và oracle giải tích.",
    ],
    prerequisites:
      "SDL/input/vector 2D; sai phân và nội suy được giải thích tại chỗ. Không cần OpenGL hoặc solver chất lưu.",
    workload:
      "Final 65×49 = 3.185 mẫu thật, có 129×97; 221 glyph và 128 tracer. 33×25 chỉ là lưới học.",
  },
};

export const rebuildRevisions = Object.fromEntries(
  Object.entries(roadmapRevisions).filter(([, revision]) => !revision.replacement),
);
