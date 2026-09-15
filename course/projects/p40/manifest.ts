import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 28 — Spatial Grid trên CPU, row-major cell ID, candidate cells và brute-force oracle",
    "Project 37 — SSBO std430, compute workgroup, bounds guard và GPU timer query",
    "Project 38 — giữ particle state trên GPU qua nhiều dispatch",
    "Project 39 — hierarchical exclusive scan, pass graph và barrier theo consumer",
  ],
  summary:
    "Xây một GPU Spatial Grid dạng CSR cho tối đa một triệu particle. Compute shader đếm số particle trong từng cell bằng atomic, biến counts thành offsets bằng exclusive scan, đưa index vào các đoạn liên tiếp rồi để mỗi particle tự tìm hàng xóm trong các cell lân cận. Bản đối chiếu CPU và các phép kiểm tra cấu trúc grid sẽ giúp bạn biết lỗi nằm ở thuật toán hay ở bước đồng bộ.",
  challenge: {
    timebox: "1.050–1.350 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó hàng trăm nghìn đến một triệu particles được phân vào uniform grid hoàn toàn trên GPU. Sau khi grid được dựng, mỗi particle phải tìm đúng số hàng xóm trong bán kính cho trước và nearest neighbor mà không đọc counts hoặc offsets về CPU giữa các pass.",
    outcome:
      "Một GPU Grid Workbench hiển thị heatmap số particle trong từng cell, cell đang chọn, vùng cell cần duyệt và thống kê tìm hàng xóm. Người dùng có thể đổi số particle, kích thước cell, bán kính và seed; thanh tiêu đề cho biết số pass, tổng số index đã ghi, cell đông nhất, thời gian GPU và kết quả kiểm tra.",
    requirements: [
      "Starter tái sử dụng khung SDL3/OpenGL 4.3, đọc các giới hạn compute và báo rõ giới hạn phần cứng nào chưa đáp ứng.",
      "Vị trí particle trong world 1.024 × 576 phải tái lập được từ seed; preset lớn nhất có 1.000.003 phần tử để workgroup cuối luôn có invocation dư.",
      "GridSpec tính columns, rows và cellCount bằng ceil division; world position được clamp hợp lệ rồi đổi thành row-major cell ID.",
      "Pass clear đặt mọi cell count về zero; pass count chạy một invocation cho mỗi particle và atomicAdd đúng một cell.",
      "Exclusive scan từ Project 39 biến cellCounts thành cellOffsets hoàn toàn trên GPU; không đọc buffer về CPU giữa chuỗi xử lý.",
      "Pass prepare copy offsets sang cellCursors; pass scatter dùng atomicAdd(cursor[cell]) để ghi mỗi particle index vào đúng một slot.",
      "Grid chỉ hợp lệ khi offsets[0]=0, offsets[cell]+counts[cell] không vượt quá số particle và tổng mọi count bằng N.",
      "Neighbor pass duyệt AABB cell range quanh từng particle, loại chính nó, kiểm distanceSquared <= radiusSquared và ghi NeighborSummary riêng.",
      "Khi hai hàng xóm cách bằng nhau, index nhỏ hơn phải thắng; kết quả không phụ thuộc thứ tự atomic scatter.",
      "Mỗi cạnh compute→compute dùng GL_SHADER_STORAGE_BARRIER_BIT; chỉ dùng GL_BUFFER_UPDATE_BARRIER_BIT trước readback phục vụ hiển thị/validation.",
      "Với preset nhỏ, hãy so toàn bộ kết quả GPU với cách vét cạn trên CPU; với preset lớn, chỉ lấy một mẫu có thể tái lập và kiểm tra cấu trúc grid.",
      "Benchmark có warm-up, đúng chín sample, timer query ring không block và không tính upload/readback vào GPU pipeline time.",
      "Trước khi dispatch, chương trình phải ước tính số cặp ứng viên từ số particle, kích thước cell và bán kính. Nếu cấu hình có thể tạo hàng tỷ lượt kiểm tra, hãy từ chối và nêu rõ lý do.",
      "Kèm starter, chín checkpoint độc lập, final có comment, bảy compute shader, README và CTest thuần CPU có timeout hữu hạn.",
    ],
    constraints: [
      "Không dựng bucket bằng vector trên CPU rồi upload kết quả đã sắp sẵn; counts, offsets và scatter phải được tạo bởi GPU.",
      "Không dùng một atomic counter toàn cục cho mọi particle; mỗi cell có counter riêng.",
      "Không giả sử atomic scatter giữ thứ tự particle index; tie-break và validation phải chịu được mọi thứ tự hợp lệ.",
      "Không coi particle trong candidate cell là neighbor trước khi kiểm khoảng cách chính xác.",
      "Không cho invocation ngoài particleCount hoặc cellCount đọc/ghi SSBO.",
      "Không dùng glFinish, readback giữa các pass, benchmark vô hạn hoặc mở window trong CTest.",
      "Không vượt quá bán kính bằng cellSize trong preset chính; trường hợp radius lớn phải tính cell range tổng quát thay vì cố định 3×3.",
      "Buffer vừa bộ nhớ GPU chưa có nghĩa cấu hình đã an toàn; số lượt kiểm tra hàng xóm cũng phải nằm dưới giới hạn đã đặt.",
      "Không dùng CUDA, OpenCL, Vulkan, WebGPU hoặc thư viện spatial index có sẵn.",
    ],
    definitionOfDone: [
      "Điểm ở bốn góc world ánh xạ đúng cell đầu/cuối; điểm ngoài world bị clamp có chủ đích và không sinh cell ID ngoài range.",
      "Với N=1.000.003 và workgroup 256, dispatch particle có 3.907 groups và 189 invocation tail bị bounds guard loại.",
      "Tổng cellCounts bằng N; maximum cursor sau scatter bằng offsets[cell]+counts[cell] ở mọi cell.",
      "Exclusive scan không đi qua CPU và tạo offsets không giảm; offsets cuối cộng count cuối bằng particle count.",
      "Mỗi particle index xuất hiện đúng một lần trong sortedIndices ở validation preset nhỏ.",
      "Neighbor query loại self, nhận điểm đúng trên radius, chọn nearest bằng distance rồi index và không đếm trùng cell.",
      "GPU và CPU oracle khớp neighbor count/nearest index cho toàn bộ preset nhỏ và sample deterministic của preset lớn.",
      "Pass trace có clear → count → scan → prepare cursors → scatter → neighbors, kèm barrier contract cụ thể.",
      "Đổi seed/cell size/count cấp phát candidate buffers trước rồi mới commit, không phá workload đang chạy nếu allocation thất bại.",
      "Phím 1–4 đổi count, [/] đổi cell size, -/= đổi radius, S đổi seed, V validate, B benchmark và R reset.",
      "Benchmark chạy như state machine, submit nhiều nhất một sample mỗi frame, có thể hủy và tự dừng sau deadline 10 giây.",
      "Canvas có pause/reset, pointer capture, keyboard, DPR, reduced motion và ghi rõ timing chỉ là mô hình.",
      "Starter, chín checkpoint, final, CTest, lab math tests, source contracts và production build đều kết thúc trong timeout hữu hạn.",
    ],
  },
  duration: "29–37 giờ",
  objectives: [
    "Biến uniform grid trên CPU thành cấu trúc CSR trên GPU qua ba bước đếm, exclusive scan và ghi index",
    "Viết phép tìm hàng xóm song song vẫn cho kết quả ổn định dù atomic không đảm bảo thứ tự index trong mỗi cell",
    "Kiểm tra chuỗi nhiều pass bằng các điều kiện cấu trúc, bản vét cạn trên CPU và timer query không chặn frame",
  ],
  lessons: [
    {
      id: "p40-l01",
      slug: "01-khoa-hop-dong-grid-va-neighbor",
      title: "Xác định grid và kết quả tìm hàng xóm trên CPU",
      summary:
        "Tạo particle deterministic, GridSpec, cell ID và brute-force neighbor oracle trước khi thêm bất kỳ compute pass nào.",
      order: 1,
      estimatedMinutes: 135,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l02",
      slug: "02-dem-particles-bang-atomic",
      title: "Đếm particle trong từng cell bằng atomic",
      summary:
        "Clear counts, dispatch một invocation mỗi particle và hiểu vì sao atomicAdd phải đặt ở counter của cell thay vì một biến toàn cục.",
      order: 2,
      estimatedMinutes: 165,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l03",
      slug: "03-bien-counts-thanh-offsets",
      title: "Dùng exclusive scan để tìm đầu mỗi cell",
      summary:
        "Tái sử dụng hierarchical scan của Project 39 để mỗi cell có một đoạn liên tiếp mà không readback intermediate data.",
      order: 3,
      estimatedMinutes: 180,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l04",
      slug: "04-scatter-vao-grid-csr",
      title: "Đưa particle indices vào các đoạn CSR",
      summary:
        "Copy offsets thành cursors rồi atomic scatter để mỗi particle xuất hiện đúng một lần trong đoạn của cell mình.",
      order: 4,
      estimatedMinutes: 175,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l05",
      slug: "05-duyet-candidate-cells-tren-gpu",
      title: "Tìm những cell có thể chứa hàng xóm",
      summary:
        "Từ AABB của query radius, tính cell range tổng quát và đọc các đoạn CSR thay vì quét toàn bộ particle array.",
      order: 5,
      estimatedMinutes: 165,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l06",
      slug: "06-loc-neighbor-va-chon-nearest",
      title: "Lọc chính xác và chọn hàng xóm gần nhất",
      summary:
        "Loại self, kiểm distance squared và tie-break bằng index để output không phụ thuộc thứ tự atomic scatter.",
      order: 6,
      estimatedMinutes: 155,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l07",
      slug: "07-noi-pass-graph-bang-barrier",
      title: "Nối các compute pass bằng barrier",
      summary:
        "Theo dõi ownership của counts, offsets, cursors, sorted indices và summaries qua sáu loại pass.",
      order: 7,
      estimatedMinutes: 145,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l08",
      slug: "08-validation-va-benchmark-co-gioi-han",
      title: "Kiểm tra kết quả và giới hạn benchmark",
      summary:
        "Kiểm structural invariants trước, so CPU oracle sau và đo đúng chín GPU samples bằng query ring không block.",
      order: 8,
      estimatedMinutes: 175,
      demoId: "gpu-spatial-grid-neighbors",
    },
    {
      id: "p40-l09",
      slug: "09-hoan-thien-gpu-grid-workbench",
      title: "Hoàn thiện GPU Grid Workbench",
      summary:
        "Ghép presets, heatmap, diagnostics, transactional rebuild, controls, cleanup và toàn bộ source chạy độc lập.",
      order: 9,
      estimatedMinutes: 190,
      demoId: "gpu-spatial-grid-neighbors",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
