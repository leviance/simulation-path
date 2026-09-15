import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 05 — world/screen transform và pointer capture",
    "Project 27 — deterministic particle cloud, selection oracle và benchmark checksum",
    "Project 28 — conservative candidates, exact test và cách tách rebuild khỏi query",
  ],
  summary:
    "Thay lưới đều bằng một Quadtree có thể quan sát trực tiếp. Vùng có nhiều hạt tự chia sâu hơn, vùng thưa giữ các node lớn; vùng chọn hình chữ nhật bỏ qua cả nhánh cây không giao nhau rồi kiểm chính xác những hạt còn lại. Mọi bước đều được đối chiếu bằng báo cáo cấu trúc, brute force và benchmark trên cùng dữ liệu.",
  challenge: {
    timebox: "600–780 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó 100.000 particles được tổ chức bằng Quadtree. Người dùng kéo một vùng chọn hình chữ nhật; chương trình phải hiển thị topology, loại các subtree không giao vùng chọn và trả đúng cùng tập particle như brute force.",
    outcome:
      "Một cửa sổ SDL3 cho phép đổi cách phân bố hạt, `leafCapacity` và vùng chọn. Phần số liệu tách rõ số node, số leaf, độ sâu, thời gian dựng cây, số node đã thăm/bỏ qua, số hạt đã kiểm và kết quả benchmark; bảng capacity cho thấy cây thay đổi ra sao khi mỗi leaf được chứa nhiều hay ít hạt hơn.",
    requirements: [
      "Giữ world bounds, 100.000-particle workload, deterministic seed và brute-force validation contract từ hai project trước.",
      "Chuẩn hóa selection từ hai góc drag để kéo theo mọi hướng đều tạo cùng AABB; point đúng trên boundary phải được nhận.",
      "Quy ước child order cố định SW, SE, NW, NE; point trên vertical split đi east và trên horizontal split đi north.",
      "Mỗi node lưu bounds, depth, particle indices và bốn child indices; internal node không giữ particle sau redistribution.",
      "Leaf chỉ split khi vượt leafCapacity và vẫn còn dưới maximumDepth, đồng thời child size không nhỏ hơn minimumNodeSize.",
      "Khi split, tạo đủ bốn child rồi đưa lại toàn bộ indices cũ cùng particle mới vào đúng một child.",
      "Query phải prune node không overlap selection; leaf overlap vẫn chạy exact point-in-box test cho từng candidate.",
      "Topology report phải kiểm particle xuất hiện đúng một lần, internal node rỗng, child index hợp lệ, capacity guard và số liệu node/leaf.",
      "So ít nhất 32 selection deterministic cùng các vùng ở mép/góc với brute-force oracle; canonicalize hit order chỉ ngoài hot path.",
      "Benchmark Quadtree và brute force bằng cùng particles, selections, repetitions, warm-up và checksum độc lập với traversal order.",
      "Đo rebuild riêng; báo exact work bằng visited nodes, candidates và brute scans trước khi diễn giải timing.",
      "Chạy capacity study với 4, 8, 16 và 32 trên cùng query set; ghi node count, depth, maximum occupancy, candidates và time/query.",
      "Kèm starter, tám checkpoint độc lập, final, README và CTest chạy không cần SDL window.",
    ],
    constraints: [
      "Không dùng thư viện Quadtree, pointer tree ẩn ownership, Morton code, loose Quadtree hoặc Octree trong Project 29.",
      "Không để một particle nằm đồng thời trong nhiều child chỉ vì child bounds gặp nhau ở split line.",
      "Không bỏ exact point-in-selection test sau khi leaf overlap.",
      "Không split vô hạn khi nhiều particles có cùng position; luôn giữ maximumDepth và minimumNodeSize.",
      "Không sort hits trong query hot path và không dùng traversal order làm correctness contract.",
      "Không thay distribution hoặc selection set giữa hai phía benchmark.",
      "Không cộng rebuild vào query timing khi scene đứng yên; nếu distribution đổi, báo đó là một phép rebuild riêng.",
      "Không kết luận Quadtree luôn thắng Spatial Grid; Project này chỉ đo đúng workload clustered/uniform hiện tại.",
    ],
    definitionOfDone: [
      "Reverse drag tạo selection giống forward drag; minimum/maximum boundary đều được exact query nhận.",
      "Point trên hai split lines chọn duy nhất child theo policy east/north đã công bố.",
      "Mỗi particle index xuất hiện đúng một lần trong leaves; internal nodes có particleIndices rỗng.",
      "Mọi child index hợp lệ, leaf overflow chỉ xảy ra khi maximumDepth hoặc minimumNodeSize chặn split.",
      "Clustered distribution tạo topology có nhiều depth; uniform distribution vẫn giữ đúng cùng storage invariants.",
      "Query ở giữa, góc và ngoài phần lớn world prune được subtree nhưng vẫn khớp brute-force hit set.",
      "Quadtree và brute benchmark có cùng queryCount, checksum; brute báo N×Q×R scans và tree báo ít candidates hơn ở preset mặc định.",
      "Rebuild time, query time, visited/pruned nodes và candidates được báo riêng.",
      "Capacity study cho thấy capacity nhỏ tạo nhiều nodes hơn còn capacity lớn thường tăng candidate work.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/reset và có mô tả văn bản thay thế.",
      "Starter, tám checkpoints và final build ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "17–22 giờ",
  objectives: [
    "Xây Quadtree có thể lặp lại bằng node index, giới hạn chia và bước phân phối lại không làm mất hoặc lặp hạt",
    "Truy vấn vùng chọn bằng cách loại các AABB không giao nhau rồi kiểm chính xác trong leaf",
    "Kiểm cấu trúc, đối chiếu brute force và đo số hạt đã kiểm để chọn `leafCapacity` theo dữ liệu",
  ],
  lessons: [
    {
      id: "p29-l01",
      slug: "01-vung-chon-va-quy-uoc-aabb",
      title: "Vùng chọn và quy ước AABB",
      summary:
        "Giữ baseline brute force chạy được, chuẩn hóa hai góc kéo thành selection rectangle và chốt boundary/overlap/split-line policy trước khi tạo node.",
      order: 1,
      estimatedMinutes: 95,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l02",
      slug: "02-root-node-va-leaf-capacity",
      title: "Root node và leaf capacity",
      summary:
        "Tạo node gốc phủ toàn world, lưu particle indices thay vì copy dữ liệu và hiểu vì sao một leaf 100.000 phần tử chưa tăng tốc query.",
      order: 2,
      estimatedMinutes: 100,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l03",
      slug: "03-split-node-va-redistribute",
      title: "Split node và redistribute",
      summary:
        "Khi leaf đầy, tạo bốn child theo thứ tự cố định, chuyển toàn bộ index cũ xuống lại và dùng depth/size guards để recursion luôn hữu hạn.",
      order: 3,
      estimatedMinutes: 125,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l04",
      slug: "04-kiem-tra-topology-cua-tree",
      title: "Kiểm tra topology của tree",
      summary:
        "Đếm storage độc lập với code build để chứng minh particle nằm đúng một leaf, internal node rỗng và mọi child index cùng thống kê đều hợp lệ.",
      order: 4,
      estimatedMinutes: 105,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l05",
      slug: "05-truy-van-vung-chon-bang-pruning",
      title: "Truy vấn vùng chọn bằng pruning",
      summary:
        "Duyệt tree theo node overlap, bỏ cả subtree không liên quan rồi exact-test particles trong leaf; đếm riêng visited nodes, pruned nodes và candidates.",
      order: 5,
      estimatedMinutes: 120,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l06",
      slug: "06-doi-chieu-voi-brute-force-oracle",
      title: "Đối chiếu với brute-force oracle",
      summary:
        "So canonical hit sets trên selection deterministic và edge cases để tìm lỗi split line, overlap hoặc redistribution mà hình vẽ không thể chứng minh.",
      order: 6,
      estimatedMinutes: 105,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l07",
      slug: "07-benchmark-va-chon-leaf-capacity",
      title: "Benchmark và chọn leaf capacity",
      summary:
        "Benchmark công bằng rồi khảo sát capacity 4–32 trên cả topology lẫn candidate work, thay vì chọn cây sâu nhất hoặc FPS cao nhất.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "visible-quadtree",
    },
    {
      id: "p29-l08",
      slug: "08-hoan-thien-visible-quadtree-va-nghiem-thu",
      title: "Hoàn thiện Visible Quadtree và nghiệm thu",
      summary:
        "Ghép distribution/capacity presets, pointer capture, auto selection, benchmark, study và CTest thành một chương trình có thể tái lập trước khi sang Octree 3D.",
      order: 8,
      estimatedMinutes: 130,
      demoId: "visible-quadtree",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
