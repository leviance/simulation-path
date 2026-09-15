import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p29-l01": {
      focus:
        "Bắt đầu từ vùng chọn brute force đang chạy đúng, rồi thống nhất cách chuẩn hóa hai góc, xử lý biên và chọn quadrant trước khi dựng Quadtree.",
      expected:
        "Kéo theo bất kỳ hướng nào cũng tạo cùng `SelectionBox`; điểm nằm trên đường chia chỉ thuộc một quadrant ở phía đông hoặc phía bắc.",
      files,
      steps: [
        {
          title: "Chuẩn hóa hai góc kéo",
          explanation:
            "Lấy `min` và `max` riêng trên X, Y để vùng chọn không phụ thuộc vào hướng kéo chuột.",
        },
        {
          title: "Chốt inclusive boundary",
          explanation:
            "Điểm nằm đúng trên cạnh vùng chọn vẫn là hit; hai hộp chỉ chạm cạnh nhau vẫn được coi là có giao nhau.",
        },
        {
          title: "Chọn một child duy nhất trên split line",
          explanation:
            "Dùng `>=` để đưa điểm nằm đúng đường chia về phía đông hoặc phía bắc. Các hộp con có thể chung biên, nhưng mỗi điểm chỉ có một nơi để lưu.",
        },
      ],
    },
    "p29-l02": {
      focus:
        "Tạo một root node phủ toàn bộ world, lưu độ sâu, index các hạt và index các node con; ở bước này root vẫn là một leaf duy nhất.",
      expected:
        "Root phủ [0,1]², depth 0, lưu 100.000 indices và vẫn khiến query đọc toàn bộ N giống brute force.",
      files,
      steps: [
        {
          title: "Node giữ index thay vì copy Particle",
          explanation:
            "Particle vector vẫn là nguồn dữ liệu duy nhất; tree chỉ tổ chức các chỉ mục phục vụ tìm kiếm.",
        },
        {
          title: "Dùng sentinel cho leaf",
          explanation:
            "Khi bốn child index đều bằng `noNodeIndex`, node vẫn là leaf. Cách này tránh phải cấp phát và quản lý từng node bằng con trỏ.",
        },
        {
          title: "Đọc giới hạn của root-only tree",
          explanation:
            "Việc bọc dữ liệu trong một node chưa làm truy vấn nhanh hơn. Nếu root còn chứa đủ N hạt, mỗi lần chọn vùng vẫn phải kiểm N phần tử.",
        },
      ],
    },
    "p29-l03": {
      focus:
        "Khi một leaf đã đầy, chia nó thành bốn node con rồi chèn lại toàn bộ index cũ bằng cùng một hàm chèn có giới hạn dừng.",
      expected:
        "Internal nodes rỗng, clustered cloud chia sâu ở ba cụm và mọi build dừng trước maximumDepth.",
      files,
      steps: [
        {
          title: "Kiểm split guards trước",
          explanation:
            "Giới hạn độ sâu và kích thước node nhỏ nhất giúp phép chia luôn dừng, kể cả khi nhiều hạt trùng vị trí.",
        },
        {
          title: "Tạo children trước khi giữ reference",
          explanation:
            "`std::vector` có thể dời vùng nhớ khi thêm node. Vì vậy hãy giữ `nodeIndex` và truy cập lại parent sau khi tạo đủ bốn child.",
        },
        {
          title: "Redistribute bằng cùng hàm insert",
          explanation:
            "Cả index cũ lẫn index mới đều đi qua cùng hàm chọn quadrant, tránh hai quy tắc khác nhau cho điểm nằm trên đường chia.",
        },
      ],
    },
    "p29-l04": {
      focus:
        "Viết một hàm kiểm tra độc lập, duyệt toàn bộ cây để phát hiện hạt bị mất, bị lưu trùng, child index sai hoặc leaf vượt sức chứa không hợp lệ.",
      expected:
        "Mỗi particle có count 1, internal nodes không giữ index và leaves+internalNodes bằng node count.",
      files,
      steps: [
        {
          title: "Đếm lại particle storage",
          explanation:
            "Dùng một mảng đếm theo index của hạt. Giá trị 0 nghĩa là hạt bị mất; lớn hơn 1 nghĩa là hạt đã bị chèn vào nhiều leaf.",
        },
        {
          title: "Phân biệt overflow hợp lệ",
          explanation:
            "Một leaf chỉ được vượt `capacity` khi đã chạm giới hạn độ sâu hoặc kích thước nhỏ nhất nên không thể chia tiếp.",
        },
        {
          title: "Không dùng stats tự báo để tự chứng minh",
          explanation:
            "Inspector tính lại leaf/internal count từ nodes và so với số liệu build đã ghi.",
        },
      ],
    },
    "p29-l05": {
      focus:
        "Truy vấn `SelectionBox` theo thứ tự rõ ràng: loại node không giao nhau, đi xuống các node con, rồi kiểm chính xác từng hạt trong leaf.",
      expected:
        "Selection nhỏ chỉ thăm một phần tree; candidates ít hơn N và hit set không chứa point nằm ngoài rectangle.",
      files,
      steps: [
        {
          title: "Prune trước khi hỏi node là leaf",
          explanation:
            "Nếu hộp của node không giao vùng chọn, có thể bỏ toàn bộ nhánh mà không cần đọc hạt hay đi sâu hơn.",
        },
        {
          title: "Recurse đủ bốn child khi overlap",
          explanation:
            "Một vùng chọn có thể cắt qua nhiều quadrant. Gọi truy vấn cho cả bốn child; child không liên quan sẽ dừng ngay ở phép kiểm giao nhau.",
        },
        {
          title: "Exact-test trong leaf",
          explanation:
            "Leaf giao vùng chọn chỉ giúp thu hẹp danh sách. Từng hạt trong leaf vẫn phải qua phép kiểm point-in-box có tính cả đường biên.",
        },
      ],
    },
    "p29-l06": {
      focus:
        "Chạy cùng các vùng chọn bằng Quadtree và brute force, đặc biệt ở góc world và đường chia, rồi so tập hit mà không phụ thuộc thứ tự duyệt.",
      expected:
        "Canonical hit sets khớp cho mọi probe, kể cả reverse drag, edge query và point đúng selection boundary.",
      files,
      steps: [
        {
          title: "Canonicalize bản sao ngoài query",
          explanation:
            "Quadtree trả kết quả theo thứ tự của cây, còn brute force theo index hạt. Chỉ sắp xếp bản sao trong lúc kiểm tra, không đưa `sort` vào truy vấn thật.",
        },
        {
          title: "Giữ cùng selection objects",
          explanation:
            "Hai algorithm nhận đúng cùng normalized boxes để mismatch chỉ có thể đến từ candidate search hoặc exact test.",
        },
        {
          title: "Thêm edge cases có chủ đích",
          explanation:
            "Center lines, world corners và boundary hits làm lộ lỗi quadrant/overlap dễ hơn random query giữa scene.",
        },
      ],
    },
    "p29-l07": {
      focus:
        "Đo Quadtree và brute force trên cùng dữ liệu, sau đó thử bốn `leafCapacity` để xem cấu trúc cây và số hạt cần kiểm thay đổi thế nào.",
      expected:
        "Checksum giống nhau, brute scans=N×Q×R; capacity 4 tạo nhiều nodes hơn còn capacity 32 thường kiểm nhiều candidates hơn.",
      files,
      steps: [
        {
          title: "Dùng checksum không phụ thuộc hit order",
          explanation:
            "Mỗi query gộp set indices theo phép cộng rồi mới trộn vào checksum tuần tự của workload.",
        },
        {
          title: "Tách rebuild khỏi timer query",
          explanation:
            "Khi đám hạt đứng yên, cây chỉ cần dựng một lần. Bảng kết quả vẫn báo riêng `rebuildMicroseconds` để không che mất chi phí này.",
        },
        {
          title: "Đọc nodes và candidates cùng timing",
          explanation:
            "Capacity nhỏ làm mỗi leaf ít hạt hơn nhưng tạo nhiều node và nhiều bước duyệt hơn. Hãy đọc cả số node, số hạt đã kiểm và thời gian cho mỗi truy vấn.",
        },
      ],
    },
    "p29-l08": {
      focus:
        "Ghép thao tác kéo vùng chọn, reset, đổi cách phân bố hạt, đổi capacity, benchmark và bảng so sánh thành một ứng dụng hoàn chỉnh.",
      expected:
        "Bản cuối chỉ có một đường dựng cây và truy vấn dùng chung; chuột luôn được nhả đúng lúc và CTest đạt ở cả Debug lẫn Release.",
      files,
      steps: [
        {
          title: "Rebuild chỉ khi topology input đổi",
          explanation:
            "Kéo vùng chọn chỉ chạy truy vấn mới. Chỉ dựng lại cây khi cách phân bố hạt hoặc `leafCapacity` thay đổi, đồng thời xóa số đo cũ.",
        },
        {
          title: "Giữ workload và draw sample tách biệt",
          explanation:
            "Renderer có thể chỉ vẽ 35.000 điểm, nhưng tree/query/tests vẫn xử lý đủ 100.000 particles.",
        },
        {
          title: "Chốt giới hạn 2D trước Project 30",
          explanation:
            "Octree tiếp theo sẽ giữ insertion/query contracts nhưng thay bốn quadrant bằng tám octant trong không gian 3D.",
        },
      ],
    },
  },
  references: {
    "p29-l01": [
      { label: "Quadtree", href: "/glossary#quadtree", kind: "Thuật ngữ" },
      {
        label: "Conservative candidate set",
        href: "/glossary#conservative-candidate-set",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l02": [
      { label: "Quadtree node", href: "/glossary#quadtree-node", kind: "Thuật ngữ" },
      { label: "Leaf capacity", href: "/glossary#leaf-capacity", kind: "Thuật ngữ" },
    ],
    "p29-l03": [
      { label: "Maximum tree depth", href: "/glossary#maximum-tree-depth", kind: "Thuật ngữ" },
      { label: "Quadtree", href: "/glossary#quadtree", kind: "Thuật ngữ" },
    ],
    "p29-l04": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      { label: "Quadtree node", href: "/glossary#quadtree-node", kind: "Thuật ngữ" },
    ],
    "p29-l05": [
      { label: "Spatial pruning", href: "/glossary#spatial-pruning", kind: "Thuật ngữ" },
      {
        label: "Conservative candidate set",
        href: "/glossary#conservative-candidate-set",
        kind: "Thuật ngữ",
      },
    ],
    "p29-l06": [
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p29-l07": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Leaf capacity", href: "/glossary#leaf-capacity", kind: "Thuật ngữ" },
    ],
    "p29-l08": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
