import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 11 — perspective projection và near plane",
    "Project 14 — orbit/FPS camera, yaw và pitch",
    "Project 27 — deterministic workload, brute-force oracle và benchmark checksum",
    "Project 29 — node-index tree, leaf capacity, pruning và topology inspector",
  ],
  summary:
    "Đưa cấu trúc cây thích nghi từ mặt phẳng vào không gian 3D. Bạn sẽ dựng một point cloud có thể xoay để quan sát, chia root box thành tám octant, truy vấn bằng AABB 3D và kiểm chứng kết quả bằng bộ kiểm cấu trúc, brute force cùng benchmark có checksum.",
  challenge: {
    timebox: "700–900 phút",
    mission:
      "Tự xây dựng một mô phỏng 3D trong đó 100.000 points được tổ chức bằng Octree. Người dùng có thể xoay camera quanh point cloud, di chuyển một query volume và quan sát Octree bỏ qua những vùng không thể chứa đáp án.",
    outcome:
      "Một chương trình SDL3 vẽ point cloud và các hộp wireframe hoàn toàn trên CPU. Phần số liệu phân biệt số điểm được vẽ với 100.000 điểm thật, đồng thời báo cấu trúc cây, thời gian dựng, số node đã thăm/bỏ qua, số điểm đã kiểm, số hit và bảng so sánh capacity cho dữ liệu clustered/uniform.",
    requirements: [
      "Giữ world bounds [0,1]³, deterministic seed và workload 100.000 points; renderer được phép lấy mẫu nhưng tree/query/tests phải dùng đủ dữ liệu.",
      "Chiếu point cloud bằng orbit camera có yaw, pitch, distance, perspective divide và near-plane guard; phép chiếu chỉ dùng để vẽ.",
      "Biểu diễn query bằng Bounds3D gồm minimum/maximum; point đúng trên sáu mặt boundary vẫn là hit và hai AABB chạm mặt vẫn overlap.",
      "Mã hóa octant bằng ba bit: bit 0 cho positive X, bit 1 cho positive Y, bit 2 cho positive Z; equality đi về positive half.",
      "Node lưu bounds, depth, point indices và tám child indices trong vector liên tục; internal node phải rỗng sau redistribution.",
      "Chỉ split khi leaf vượt capacity, depth còn dưới maximumDepth và cả ba nửa cạnh không nhỏ hơn minimumNodeSize.",
      "Topology inspector phải kiểm mỗi point xuất hiện đúng một leaf, child index/bounds hợp lệ, capacity guard và statistics khớp dữ liệu thật.",
      "Query phải prune node không overlap AABB; leaf còn overlap vẫn exact-test từng point theo cả ba trục.",
      "So tối thiểu 32 query deterministic cùng corner, face và split-plane probes với brute-force oracle; hit order không phải correctness contract.",
      "Benchmark Octree và brute force bằng cùng points, volumes, repetitions, warm-up và checksum độc lập traversal order.",
      "Đo rebuild riêng; capacity study 8, 16, 32, 64 phải báo node count, depth, occupancy, candidates và time/query.",
      "Kèm starter, chín checkpoint độc lập, final có comment, README và CTest không cần mở SDL window.",
    ],
    constraints: [
      "Không dùng OpenGL, WebGL, thư viện Octree, pointer tree ẩn ownership, Morton code hoặc loose Octree.",
      "Không dùng tọa độ sau perspective divide để build/query Octree; cấu trúc luôn làm việc trong world space 3D.",
      "Không insert một point vào nhiều child chỉ vì child bounds gặp nhau ở split plane.",
      "Không bỏ exact point-in-volume test sau khi leaf overlap và không sort hits trong hot path.",
      "Không giữ reference tới node qua lúc vector push tám children vì reallocation có thể làm reference mất hiệu lực.",
      "Không benchmark bằng distribution hoặc query set khác nhau giữa Octree và brute force.",
      "Không gộp rebuild time vào query timing khi point cloud đứng yên.",
      "Không kết luận capacity nhỏ nhất luôn tốt nhất; traversal, metadata, rebuild và exact candidates phải được đọc cùng nhau.",
    ],
    definitionOfDone: [
      "Point cloud hiện rõ chiều sâu khi orbit; kéo chuột dùng pointer capture, wheel zoom và camera luôn có near-plane guard.",
      "Point tại (0.5,0.5,0.5) chọn octant 7; mọi split-plane probe chỉ thuộc đúng một child.",
      "Mỗi point index xuất hiện đúng một leaf; internal nodes rỗng và child bounds đúng ba bit của octant.",
      "Leaf overflow chỉ xuất hiện khi maximumDepth hoặc minimumNodeSize chặn split.",
      "Query ở giữa, góc và sát face prune được subtree, giảm candidates và trả đúng cùng hit set như brute force.",
      "Octree/brute benchmark có cùng queryCount và checksum; brute scans bằng N×Q×R.",
      "Clustered và uniform tạo topology khác nhau nhưng vẫn giữ cùng invariants.",
      "Capacity study cho thấy capacity nhỏ thường tăng node count còn capacity lớn thường tăng exact candidate work.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/reset và có mô tả thay thế bằng văn bản.",
      "Starter, chín checkpoints, final build ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "20–26 giờ",
  objectives: [
    "Biểu diễn point cloud và AABB trong world space 3D, tách hẳn phép chiếu chỉ dùng để quan sát",
    "Xây Octree có thể lặp lại bằng tám child index, giới hạn chia và bước phân phối lại không làm mất hoặc lặp điểm",
    "Truy vấn hộp bằng cách bỏ các nhánh không giao nhau, rồi kiểm cấu trúc, đối chiếu brute force và đo lượng công việc",
  ],
  lessons: [
    {
      id: "p30-l01",
      slug: "01-point-cloud-va-tam-octant",
      title: "Point cloud và tám octant",
      summary:
        "Bắt đầu từ chương trình chạy được: chiếu 100.000 points qua orbit camera, giữ query trong world space rồi chốt AABB và chính sách ba bit chia root thành tám octant.",
      order: 1,
      estimatedMinutes: 130,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l02",
      slug: "02-root-node-va-index-storage",
      title: "Root node và index storage",
      summary:
        "Tạo root leaf phủ toàn cube, giữ point indices thay vì copy position và đo rõ vì sao root-only tree vẫn phải kiểm đủ N candidates.",
      order: 2,
      estimatedMinutes: 100,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l03",
      slug: "03-split-tam-child-va-redistribute",
      title: "Split tám child và redistribute",
      summary:
        "Tạo đủ tám child trong vector, lấy lại node qua index sau reallocation và đưa toàn bộ indices cũ lẫn mới qua cùng insertion path có guards.",
      order: 3,
      estimatedMinutes: 135,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l04",
      slug: "04-inspector-kiem-tra-topology-3d",
      title: "Inspector kiểm tra topology 3D",
      summary:
        "Duyệt cấu trúc độc lập để kiểm storage, internal nodes, child indices, child bounds, capacity guards và statistics trước khi tin những hộp wireframe.",
      order: 4,
      estimatedMinutes: 115,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l05",
      slug: "05-truy-van-aabb-bang-pruning",
      title: "Truy vấn AABB bằng pruning",
      summary:
        "Bỏ cả subtree khi node box không overlap query volume, rồi exact-test X/Y/Z trong leaf còn lại và đếm riêng visited, pruned, candidates, hits.",
      order: 5,
      estimatedMinutes: 125,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l06",
      slug: "06-doi-chieu-brute-force-oracle",
      title: "Đối chiếu brute-force oracle",
      summary:
        "So canonical hit sets trên query deterministic, corner, face và split planes để bắt lỗi 3D mà một góc camera có thể che khuất.",
      order: 6,
      estimatedMinutes: 110,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l07",
      slug: "07-benchmark-cong-bang",
      title: "Benchmark công bằng",
      summary:
        "Đo Octree và brute force bằng cùng points, volumes, repetitions, warm-up cùng checksum; tách query timing khỏi rebuild.",
      order: 7,
      estimatedMinutes: 115,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l08",
      slug: "08-capacity-study",
      title: "Capacity study",
      summary:
        "Rebuild capacity 8–64 trên cùng dữ liệu để đọc node count, depth, occupancy, rebuild, traversal và exact candidate work cạnh nhau.",
      order: 8,
      estimatedMinutes: 120,
      demoId: "point-cloud-octree",
    },
    {
      id: "p30-l09",
      slug: "09-hoan-thien-point-cloud-octree",
      title: "Hoàn thiện Point Cloud Octree",
      summary:
        "Ghép camera, query controls, distribution/capacity presets, benchmark, study và validation report thành bản final có thể build, chạy và kiểm chứng độc lập.",
      order: 9,
      estimatedMinutes: 145,
      demoId: "point-cloud-octree",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
