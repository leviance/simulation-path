import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/lab.hpp",
  "include/tree.hpp",
  "include/analysis.hpp",
  "include/render.hpp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p31-l01": {
      focus:
        "Giữ starter đang vẽ được, đọc state của từng body trong world space và đo total mass, center of mass cùng momentum trước khi thêm lực.",
      expected:
        "Cùng seed tạo lại đúng thiên hà; đổi camera không đổi state và tổng momentum ban đầu gần 0.",
      files,
      steps: [
        {
          title: "Bắt đầu từ một scene nhìn thấy được",
          explanation:
            "Starter đã tạo window, framebuffer và orbit camera. Bài này chỉ thêm contract cho body state, nên bạn luôn có hình ảnh để kiểm từng thay đổi.",
        },
        {
          title: "Giữ world state tách khỏi screen projection",
          explanation:
            "Position, velocity và mass là dữ liệu physics. Screen x/y chỉ được tạo trong renderer rồi bỏ đi sau frame hiện tại.",
        },
        {
          title: "Cân momentum ngay lúc sinh dữ liệu",
          explanation:
            "Tổng momentum của các body quỹ đạo được bù vào velocity của central mass. Nhờ đó toàn thiên hà không tự trôi vì lỗi preset.",
        },
      ],
    },
    "p31-l02": {
      focus:
        "Viết gia tốc do một source mass tạo ra và xử lý cự ly gần bằng gravitational softening có ý nghĩa rõ ràng.",
      expected:
        "Vector gia tốc hướng từ target tới source, tỉ lệ với source mass và luôn hữu hạn khi hai position trùng nhau.",
      files,
      steps: [
        {
          title: "Tính displacement một lần",
          explanation:
            "Vector source−target vừa cho hướng, vừa cho squared distance. Ta không normalize rồi lại tính distance lần thứ hai.",
        },
        {
          title: "Đặt epsilon vào distance squared",
          explanation:
            "Mẫu số dùng `(r² + ε²)^(3/2)`. Epsilon có đơn vị độ dài và làm force chuyển tiếp trơn thay vì clamp đột ngột.",
        },
        {
          title: "Phân biệt source mass với target mass",
          explanation:
            "Ta đang tính acceleration của target, nên công thức chỉ còn source mass. Target mass chỉ cần khi đổi ngược về force.",
        },
      ],
    },
    "p31-l03": {
      focus:
        "Cộng gia tốc từ mọi source body thật cho từng target và đếm lượng công việc chính xác của direct implementation.",
      expected:
        "Một target dùng N−1 interactions, full pass dùng N×(N−1) và one-body system trả acceleration bằng 0.",
      files,
      steps: [
        {
          title: "Bỏ self bằng index",
          explanation:
            "Hai body có thể trùng position nhưng vẫn là hai nguồn khác nhau. Vì vậy self-force được loại bằng `sourceIndex == targetIndex`, không phải distance bằng 0.",
        },
        {
          title: "Giữ oracle dễ đọc",
          explanation:
            "Direct path chỉ có hai vòng lặp và gọi softenedAcceleration. Nó không đọc Octree, nên còn khả năng bắt lỗi ở aggregate/traversal.",
        },
        {
          title: "Đếm work trước khi đo time",
          explanation:
            "Interaction count không phụ thuộc máy. Đây là bằng chứng O(N²) ổn định hơn một con số microsecond đơn lẻ.",
        },
      ],
    },
    "p31-l04": {
      focus:
        "Tách render frames khỏi physics steps bằng accumulator, maximum-step guard và symplectic Euler.",
      expected:
        "Một frame 1/60 s tạo bốn bước 1/240 s; frame rất chậm không chạy quá bốn bước và state vẫn hữu hạn.",
      files,
      steps: [
        {
          title: "Lập kế hoạch bước trước khi tích phân",
          explanation:
            "`planFixedSteps` nhận frame time đã clamp, trả số bước, remainder và cờ dropped backlog. Phần policy được test mà không cần mở window.",
        },
        {
          title: "Cập nhật velocity trước position",
          explanation:
            "Symplectic Euler dùng velocity mới để tiến position. Nó vẫn đơn giản như Euler nhưng thường giữ quỹ đạo hấp dẫn tốt hơn explicit Euler.",
        },
        {
          title: "Không che giấu giới hạn của direct baseline",
          explanation:
            "Checkpoint này dùng 512 bodies. Mục tiêu là khóa timestep/integrator; tăng lên hàng nghìn chỉ hợp lý sau khi có Barnes–Hut.",
        },
      ],
    },
    "p31-l05": {
      focus:
        "Mở rộng Octree của Project 30: leaf giữ body indices, còn mọi node giữ totalMass và centerOfMass.",
      expected:
        "Root bounds chứa đủ bodies, root mass bằng total system mass và root center of mass khớp phép tính trực tiếp.",
      files,
      steps: [
        {
          title: "Dựng cubic bounds từ state hiện tại",
          explanation:
            "Bodies di chuyển nên root phải được tính lại. Cube giúp node size `s` có một nghĩa duy nhất trong opening criterion.",
        },
        {
          title: "Giữ insertion và aggregation thành hai pha",
          explanation:
            "Pha đầu chỉ quyết định topology/storage. Pha sau đi từ leaves lên root để tính aggregate, dễ test hơn việc cập nhật mass rải rác khi insert.",
        },
        {
          title: "Dùng mass-weighted center",
          explanation:
            "Center of mass là `Σ(mᵢpᵢ)/Σmᵢ`, không phải trung bình position. Central body nặng phải kéo aggregate center về phía nó.",
        },
      ],
    },
    "p31-l06": {
      focus:
        "Duyệt Mass Octree cho một target và quyết định khi nào dùng node aggregate bằng opening criterion `s/d < theta`.",
      expected:
        "Theta nhỏ mở nhiều node và gần direct hơn; theta lớn tăng approximatedNodes, giảm exactInteractions và tạo sai số đo được.",
      files,
      steps: [
        {
          title: "Tính s và d trong cùng world space",
          explanation:
            "`s` là cạnh node cube; `d` là khoảng cách target tới node center of mass. Screen distance không xuất hiện trong traversal.",
        },
        {
          title: "Leaf luôn dùng body thật",
          explanation:
            "Leaf có thể chứa nhiều body do depth/min-size guard. Ta vẫn cộng từng source và bỏ đúng target index.",
        },
        {
          title: "Ghi ba work counters",
          explanation:
            "Visited nodes mô tả traversal; approximated nodes và exact interactions mới là số nguồn lực thực sự được dùng.",
        },
      ],
    },
    "p31-l07": {
      focus:
        "Khóa self-force rule và viết inspector độc lập cho cả topology lẫn mass/center aggregates.",
      expected:
        "One-body tree trả zero acceleration; mỗi body nằm đúng một leaf và mọi internal aggregate khớp tổng children.",
      files,
      steps: [
        {
          title: "Không approximate node chứa target",
          explanation:
            "Aggregate của node đó có mass của chính target. Mở tiếp cho tới leaf là cách rõ ràng để loại self contribution chính xác.",
        },
        {
          title: "Inspector tự tính lại aggregate",
          explanation:
            "Không tin totalMass/centerOfMass đã lưu. Inspector cộng mass và weighted center từ children rồi so với node.",
        },
        {
          title: "Test split-plane và one-body có chủ đích",
          explanation:
            "Dữ liệu ngẫu nhiên hiếm khi đánh trúng biên. Case tối giản cho biết ngay lỗi nằm ở octant policy hay traversal.",
        },
      ],
    },
    "p31-l08": {
      focus:
        "Giữ direct results làm oracle và quét nhiều theta trên cùng bodies, target indices, G và softening.",
      expected:
        "Bảng có mean/max relative error cùng visited/aggregate/exact counters; default theta 0.5 giữ mean error dưới ngưỡng đã đặt.",
      files,
      steps: [
        {
          title: "Tính exact targets đúng một lần",
          explanation:
            "Direct acceleration không đổi giữa các theta. Cache oracle results làm sweep nhanh hơn mà vẫn giữ workload công bằng.",
        },
        {
          title: "Chuẩn hóa error theo độ lớn lực",
          explanation:
            "Relative error giúp so body chịu lực mạnh và yếu; mẫu số có floor nhỏ để trường hợp exact gần 0 không nổ số.",
        },
        {
          title: "Đọc error cạnh work",
          explanation:
            "Một theta chỉ có ý nghĩa khi ta biết nó tiết kiệm bao nhiêu nguồn và làm lệch lực bao nhiêu trên workload cụ thể.",
        },
      ],
    },
    "p31-l09": {
      focus:
        "Đo một full acceleration pass của direct và Barnes–Hut qua nhiều N, giữ kết quả observable và báo work count cạnh timer.",
      expected:
        "Direct pairs đúng N×(N−1); Barnes–Hut work thấp hơn khi N tăng và mỗi row dùng cùng seed/theta/softening.",
      files,
      steps: [
        {
          title: "Đo cùng một câu hỏi",
          explanation:
            "Cả hai phía phải trả acceleration cho toàn bộ bodies. Không được so full direct pass với một target Barnes–Hut.",
        },
        {
          title: "Tách tree rebuild khỏi force traversal",
          explanation:
            "Scaling row đo force pass; tree vẫn báo rebuild riêng trong app. Hai chi phí có lifecycle khác nhau.",
        },
        {
          title: "Giữ output sống trong Release",
          explanation:
            "Checksum sink đọc acceleration vectors để compiler không thể loại bỏ phép tính chỉ vì benchmark không vẽ kết quả.",
        },
      ],
    },
    "p31-l10": {
      focus:
        "Ghép simulation, camera, selected-force inspector, theta/scaling experiments và diagnostics vào một final lifecycle rõ ràng.",
      expected:
        "Reset tái tạo đúng preset, pointer capture luôn được nhả và validation report tách topology, state, self-force, accuracy cùng work reduction.",
      files,
      steps: [
        {
          title: "Rebuild đúng lúc physics state đổi",
          explanation:
            "Mỗi fixed step làm positions đổi nên Mass Octree phải dựng lại trước force pass kế tiếp. Xoay camera không được rebuild tree.",
        },
        {
          title: "Giới hạn diagnostics đắt tiền",
          explanation:
            "Exact energy là O(N²), nên UI tính trên tối đa 512 bodies và ghi rõ scope. Validation lực dùng target sample cố định.",
        },
        {
          title: "Giữ từng failure có tên",
          explanation:
            "Final report không nén tất cả thành một boolean mù. Topology, finite state, self-force, accuracy và work reduction vẫn là các contract riêng.",
        },
      ],
    },
  },
  references: {
    "p31-l01": [
      { label: "N-body system", href: "/glossary#n-body-system", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l02": [
      {
        label: "Gravitational softening",
        href: "/glossary#gravitational-softening",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l03": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
    ],
    "p31-l04": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Symplectic Euler", href: "/glossary#symplectic-euler", kind: "Thuật ngữ" },
    ],
    "p31-l05": [
      { label: "Octree", href: "/glossary#octree", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l06": [
      { label: "Barnes–Hut", href: "/glossary#barnes-hut", kind: "Thuật ngữ" },
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
    ],
    "p31-l07": [
      { label: "Octree node", href: "/glossary#octree-node", kind: "Thuật ngữ" },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l08": [
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p31-l09": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
    ],
    "p31-l10": [
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
