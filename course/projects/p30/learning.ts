import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "include/render.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p30-l01": {
      focus:
        "Giữ bản brute force đang chạy đúng, dựng camera xoay quanh point cloud và tách rõ hộp truy vấn trong world space khỏi hình chiếu dùng để vẽ.",
      expected:
        "Point cloud có chiều sâu khi xoay camera; query giữ nguyên khi đổi góc nhìn và point ở ba split planes chọn đúng octant 7.",
      files,
      steps: [
        {
          title: "Tạo point cloud deterministic",
          explanation:
            "Với cùng số điểm, cách phân bố và `seed`, chương trình luôn tạo lại đúng cùng dữ liệu. Nhờ đó hình ảnh, test và benchmark có thể so sánh được.",
        },
        {
          title: "Chiếu world point qua orbit camera",
          explanation:
            "`yaw` và `pitch` đổi hướng nhìn. Chỉ chia phối cảnh sau khi chắc chắn điểm nằm trước near plane để không sinh tọa độ vô hạn.",
        },
        {
          title: "Giữ query trong world space",
          explanation:
            "Hộp nhìn thấy trên màn hình chỉ là hình chiếu. Khi kiểm một điểm có nằm trong hộp hay không, phải dùng tọa độ gốc X, Y, Z.",
        },
        {
          title: "Mã hóa octant bằng ba bit",
          explanation:
            "Nửa dương của X, Y, Z lần lượt bật bit 0, 1, 2. Điểm nằm đúng mặt phẳng chia được đưa về nửa dương để chỉ thuộc một child.",
        },
      ],
    },
    "p30-l02": {
      focus:
        "Tạo một root node phủ toàn bộ khối lập phương, lưu độ sâu, index các điểm và tám child index; ở bước này root vẫn là một leaf.",
      expected:
        "Root phủ [0,1]³, giữ đủ 100.000 indices và query volume vẫn báo candidates bằng N.",
      files,
      steps: [
        {
          title: "Để point vector làm nguồn dữ liệu duy nhất",
          explanation:
            "Octree chỉ lưu index. Phần sinh dữ liệu, renderer và brute force đều đọc vị trí từ cùng vector, tránh nhiều bản sao dễ lệch nhau.",
        },
        {
          title: "Nhận diện leaf bằng sentinel",
          explanation:
            "Khi tám child index đều bằng `noNodeIndex`, node vẫn là leaf. Cách này không cần cấp phát và quản lý từng node bằng con trỏ.",
        },
        {
          title: "Đo root-only baseline",
          explanation:
            "Việc đặt các điểm vào một root node chưa làm truy vấn nhanh hơn. Khi root còn giữ đủ N điểm, mỗi truy vấn vẫn phải kiểm cả N như brute force.",
        },
      ],
    },
    "p30-l03": {
      focus:
        "Khi một leaf đã đầy, chia nó thành tám node con rồi chèn lại toàn bộ index cũ bằng chính `insertAtNode`.",
      expected:
        "Clustered cloud chia sâu quanh bốn cụm; internal nodes không còn pointIndices và recursion luôn dừng.",
      files,
      steps: [
        {
          title: "Kiểm ba split guards trước",
          explanation:
            "Giới hạn độ sâu và kích thước theo cả X, Y, Z giúp phép chia luôn dừng, kể cả khi nhiều điểm trùng vị trí.",
        },
        {
          title: "Không giữ reference qua vector growth",
          explanation:
            "Thêm tám child có thể làm `std::vector` dời vùng nhớ. Hãy giữ `nodeIndex` rồi truy cập lại parent sau khi tạo xong các node con.",
        },
        {
          title: "Redistribute cũ và mới qua một đường",
          explanation:
            "Mọi index đều đi qua `octreeOctant` và `insertAtNode`, nên quy tắc xử lý điểm trên mặt phẳng chia chỉ tồn tại ở một nơi.",
        },
      ],
    },
    "p30-l04": {
      focus:
        "Viết một hàm kiểm tra độc lập, duyệt toàn bộ Octree để phát hiện điểm bị mất, lưu trùng, child sai vùng hoặc leaf vượt sức chứa không hợp lệ.",
      expected:
        "Mỗi point có insertion count 1; từng child bounds khớp octant bit và leaves+internalNodes bằng node count.",
      files,
      steps: [
        {
          title: "Đếm lại storage theo point index",
          explanation:
            "Dùng một mảng đếm theo index. Giá trị 0 nghĩa là điểm bị mất; lớn hơn 1 nghĩa là điểm đã bị đưa vào nhiều octant.",
        },
        {
          title: "Tính lại child bounds",
          explanation:
            "Inspector gọi octreeChildBounds từ parent và octant position thay vì tin bounds mà builder đã lưu.",
        },
        {
          title: "Phân biệt overflow hợp lệ",
          explanation:
            "Một leaf chỉ được vượt `capacity` khi đã chạm giới hạn độ sâu hoặc kích thước nhỏ nhất trên ít nhất một trục.",
        },
      ],
    },
    "p30-l05": {
      focus:
        "Truy vấn AABB theo thứ tự rõ ràng: loại node không giao nhau, đi xuống node con, rồi kiểm chính xác từng điểm trong leaf.",
      expected:
        "Query nhỏ thăm một phần tree, candidates ít hơn N và mọi hit đều nằm trong volume theo cả ba trục.",
      files,
      steps: [
        {
          title: "Prune trước khi hỏi node là leaf",
          explanation:
            "Nếu hộp của node không giao hộp truy vấn, có thể bỏ toàn bộ nhánh mà không cần đọc điểm bên trong.",
        },
        {
          title: "Duyệt đủ tám child khi parent overlap",
          explanation:
            "Hộp truy vấn có thể cắt nhiều octant. Gọi truy vấn cho cả tám child; child không liên quan sẽ dừng ngay ở phép kiểm giao nhau.",
        },
        {
          title: "Exact-test cả X, Y và Z",
          explanation:
            "Leaf giao hộp truy vấn chỉ giúp thu hẹp danh sách. Từng điểm vẫn phải được kiểm theo cả X, Y và Z trước khi trở thành hit.",
        },
      ],
    },
    "p30-l06": {
      focus:
        "Chạy cùng các hộp truy vấn bằng Octree và brute force, rồi so hai tập hit mà không buộc chúng phải có cùng thứ tự.",
      expected:
        "Hit sets khớp cho center, corners, faces và split planes; mismatch báo lỗi geometry/storage chứ không phải thứ tự output.",
      files,
      steps: [
        {
          title: "Giữ brute force thật đơn giản",
          explanation:
            "Oracle quét mọi point và chỉ gọi pointInsideVolume, nên không chia sẻ lỗi traversal với Octree.",
        },
        {
          title: "Canonicalize ngoài hot path",
          explanation:
            "Chỉ sắp xếp bản sao trong lúc kiểm tra. Hàm truy vấn thật giữ thứ tự duyệt tự nhiên và không phải trả thêm chi phí cho việc đối chiếu.",
        },
        {
          title: "Thêm probe có chủ đích",
          explanation:
            "Các hộp đặt ở góc, chạm mặt và đi qua mặt phẳng chia bắt lỗi biên hoặc lỗi chọn bit tốt hơn một bộ test chỉ có dữ liệu ngẫu nhiên.",
        },
      ],
    },
    "p30-l07": {
      focus:
        "Đo Octree và brute force bằng cùng điểm, cùng hộp truy vấn, cùng số lần lặp và cùng cách warm-up; báo cả checksum lẫn lượng công việc.",
      expected:
        "Checksum giống nhau, brute scans=N×Q×R và timer query không chứa rebuild hay point generation.",
      files,
      steps: [
        {
          title: "Warm-up bằng đúng workload",
          explanation:
            "Lượt warm-up đi qua cùng paths nhưng không cộng vào queryCount hoặc elapsedMicroseconds được báo cáo.",
        },
        {
          title: "Dùng checksum không phụ thuộc traversal order",
          explanation:
            "Mỗi truy vấn gộp tập index theo cách không phụ thuộc thứ tự, sau đó mới trộn vào checksum chung của cả lần đo.",
        },
        {
          title: "Tách rebuild khỏi query timing",
          explanation:
            "Static point cloud build một lần; rebuildMicroseconds được báo riêng thay vì trộn vào query timer.",
        },
      ],
    },
    "p30-l08": {
      focus:
        "Dựng lại Octree với capacity 8, 16, 32 và 64 trên cùng dữ liệu để xem cấu trúc cây, chi phí dựng và số điểm cần kiểm thay đổi thế nào.",
      expected:
        "Checksum giống nhau, brute scans=N×Q×R; capacity 8 sinh nhiều nodes hơn capacity 64 và thường kiểm ít candidates hơn.",
      files,
      steps: [
        {
          title: "Chỉ thay leafCapacity",
          explanation:
            "Maximum depth, minimum node size, points và query volumes được giữ nguyên để thí nghiệm chỉ có một biến.",
        },
        {
          title: "Lưu topology cùng query metrics",
          explanation:
            "Mỗi dòng kết quả ghi số node, độ sâu, mức lấp đầy, thời gian dựng và số liệu truy vấn của đúng cây vừa tạo.",
        },
        {
          title: "Đọc trade-off theo lifecycle",
          explanation:
            "Một cảnh phải dựng lại cây thường xuyên có thể cần capacity khác với một cảnh đứng yên nhưng thực hiện rất nhiều truy vấn.",
        },
      ],
    },
    "p30-l09": {
      focus:
        "Ghép camera, reset, chuyển động của hộp truy vấn, các lựa chọn phân bố/capacity, benchmark và bảng so sánh thành ứng dụng hoàn chỉnh.",
      expected:
        "Final giữ một build/query path dùng chung; pointer capture luôn được release và CTest Debug/Release đều pass.",
      files,
      steps: [
        {
          title: "Chỉ rebuild khi topology input đổi",
          explanation:
            "Xoay camera hoặc di chuyển hộp chỉ thay cách nhìn hay kết quả truy vấn. Chỉ dựng lại cây khi phân bố điểm hoặc capacity thay đổi, đồng thời xóa số đo cũ.",
        },
        {
          title: "Tách draw sample khỏi indexed workload",
          explanation:
            "Renderer có thể giới hạn số điểm và hộp được vẽ để giữ tương tác mượt; Octree, truy vấn và test vẫn dùng đủ 100.000 điểm.",
        },
        {
          title: "Khóa hợp đồng trước Project 31",
          explanation:
            "Project 31 sẽ thêm khối lượng và tâm khối lượng cho Barnes–Hut, nhưng cách lưu index, kiểm cấu trúc và đối chiếu bằng brute force vẫn được giữ lại.",
        },
      ],
    },
  },
  references: {
    "p30-l01": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      { label: "Octant", href: "/glossary#octant-3d", kind: "Thuật ngữ" },
      { label: "AABB volume", href: "/glossary#aabb-volume", kind: "Thuật ngữ" },
    ],
    "p30-l02": [
      { label: "Octree", href: "/glossary#octree", kind: "Thuật ngữ" },
      { label: "Leaf capacity", href: "/glossary#leaf-capacity", kind: "Thuật ngữ" },
    ],
    "p30-l03": [
      { label: "Octree node", href: "/glossary#octree-node", kind: "Thuật ngữ" },
      { label: "Maximum tree depth", href: "/glossary#maximum-tree-depth", kind: "Thuật ngữ" },
    ],
    "p30-l04": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      { label: "Octree node", href: "/glossary#octree-node", kind: "Thuật ngữ" },
    ],
    "p30-l05": [
      { label: "Spatial pruning", href: "/glossary#spatial-pruning", kind: "Thuật ngữ" },
      {
        label: "Conservative candidate set",
        href: "/glossary#conservative-candidate-set",
        kind: "Thuật ngữ",
      },
    ],
    "p30-l06": [
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p30-l07": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p30-l08": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Leaf capacity", href: "/glossary#leaf-capacity", kind: "Thuật ngữ" },
    ],
    "p30-l09": [
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
