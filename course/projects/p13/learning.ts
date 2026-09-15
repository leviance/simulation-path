import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p13-l01": {
      focus:
        "Thay ba biến vertex riêng của Project 12 bằng CubeVertices có tám phần tử, chốt quy ước index và project đúng tám marker trước khi tạo edge.",
      expected:
        "Tám marker xuất hiện thành hai lớp bốn điểm. Đổi half extent làm cube lớn/nhỏ quanh cùng tâm; readout cho thấy index và dấu X/Y/Z tương ứng.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt quy ước index trước",
          explanation:
            "Index 0–3 thuộc lớp local Z âm, 4–7 thuộc lớp local Z dương; thứ tự X/Y giống nhau ở hai lớp. Quy ước này trở thành hợp đồng cho edge list.",
        },
        {
          title: "Sinh tám góc từ half extent",
          explanation:
            "Mỗi coordinate chỉ nhận -h hoặc +h. Hàm trả std::array có kích thước cố định để compiler và tests cùng biết cube luôn có tám vertex.",
        },
        {
          title: "Project mỗi vertex thành một marker",
          explanation:
            "Checkpoint đầu chưa nối cạnh. Nếu một marker sai, ta chỉ cần kiểm tra index, world position và projection thay vì debug cả topology.",
        },
      ],
    },
    "p13-l02": {
      focus:
        "Tạo std::array<Edge,12>, project tám vertex đúng một lần rồi dùng endpoint index để nối các edge hợp lệ.",
      expected:
        "Cube có 12 cạnh, edge được chọn trong Canvas đổi màu và mỗi vertex có degree bằng 3. Projection count vẫn bằng 8, không tăng thành 24.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách geometry khỏi topology",
          explanation:
            "CubeVertices giữ vị trí; kCubeEdges chỉ giữ quan hệ. Một Edge không biết world, screen hoặc màu và vì vậy tái sử dụng được sau mọi transform.",
        },
        {
          title: "Project theo vertex, không theo edge",
          explanation:
            "projectCube tạo một cache tám ProjectionResult. Hai hoặc ba edge dùng chung một vertex đều đọc lại cùng entry thay vì gọi perspective divide lần nữa.",
        },
        {
          title: "Guard từng endpoint",
          explanation:
            "Một edge chỉ được vẽ khi cả from và to đều Visible. Đây là cách bỏ an toàn cả đoạn; clipping thật được giữ cho Project 18.",
        },
      ],
    },
    "p13-l03": {
      focus:
        "Rotate tám local vertex bằng cùng EulerAngles/RotationOrder của Project 12, sau đó translate toàn bộ cube tới modelPosition.",
      expected:
        "W/S, A/D, Q/E đổi orientation; O đổi order. Cube quay quanh tâm, mười hai edge không đổi index và mọi cạnh giữ cùng độ dài.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ local cube bất biến",
          explanation:
            "Mỗi frame bắt đầu từ tám góc ±halfExtent. rotatedLocal và worldVertices là hai array mới, nên input state không bị trộn vào geometry gốc.",
        },
        {
          title: "Transform bằng một vòng lặp",
          explanation:
            "Thay vì viết rotate cho A/B/C, vòng lặp theo index áp dụng cùng công thức cho tám vertex. Đây là bước đầu để code hoạt động với mesh lớn hơn.",
        },
        {
          title: "Giữ edge list nguyên vẹn",
          explanation:
            "Transform thay tọa độ nhưng không đổi quan hệ giữa index. kCubeEdges vì vậy là constexpr và không cần dựng lại mỗi frame.",
        },
      ],
    },
    "p13-l04": {
      focus:
        "Tạo danh sách edge visible kèm average camera-space Z, sort xa→gần và ánh xạ depth sang độ sáng của line.",
      expected:
        "Bật depth cue làm cạnh gần sáng hơn; tắt nó trả mọi cạnh về cùng màu. Danh sách depth luôn giảm dần nhưng visible edge count không đổi.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng depth đã có trong projection cache",
          explanation:
            "Mỗi ProjectionResult giữ cameraPoint.z. Average của hai endpoint cho một depth đại diện mà không cần project hoặc transform lại.",
        },
        {
          title: "Vẽ xa trước, gần sau",
          explanation:
            "Sort giảm dần theo depth cho phép line gần ghi đè line xa tại giao điểm. Đây chỉ là painter-style ordering cho line, không phải Z-buffer.",
        },
        {
          title: "Depth cue không thay geometry",
          explanation:
            "normalizeDepth chỉ tạo hệ số màu. Tắt depth cue phải giữ nguyên endpoint, visibility, thứ tự edge và các phép đo hình học.",
        },
      ],
    },
    "p13-l05": {
      focus:
        "Hoàn thiện mouse capture, auto rotation và các invariant cho topology, projection count, edge length, inverse cùng depth order.",
      expected:
        "Cube kéo được bằng chuột, tự quay độc lập FPS và reset sạch. CTest qua; title/readout báo 8 projections, tối đa 12 visible edges và sai số gần zero.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tái sử dụng đường input đã kiểm chứng",
          explanation:
            "Mouse delta chỉ sửa EulerAngles; capture được nhả ở mouse-up và focus-lost. Rotation math không biết SDL event.",
        },
        {
          title: "Đếm cấu trúc trước khi nhìn hình",
          explanation:
            "Tests khóa 8 vertex, 12 edge duy nhất, index hợp lệ và degree 3. Một cube trông gần đúng vẫn thất bại nếu topology nối nhầm.",
        },
        {
          title: "Đo geometry và pipeline",
          explanation:
            "Mười hai edge phải giữ length 2h; rotate→inverse trả vertex gốc; projection count bằng 8 và visible edges được sort giảm dần theo depth.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, kiểm tra keyboard, mouse, order, depth cue, marker, animation, pause/step, reset và resize trên project_13_final.",
        },
      ],
    },
  },
  references: {
    "p13-l01": [
      { label: "Vertex index", href: "/glossary#vertex-index", kind: "Thuật ngữ" },
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p13-l02": [
      { label: "Edge list", href: "/glossary#edge-list", kind: "Thuật ngữ" },
      { label: "Mesh topology", href: "/glossary#mesh-topology", kind: "Thuật ngữ" },
      { label: "View frustum", href: "/glossary#view-frustum", kind: "Thuật ngữ" },
    ],
    "p13-l03": [
      { label: "3D rotation", href: "/glossary#rotation-3d", kind: "Thuật ngữ" },
      { label: "Rotation order", href: "/glossary#rotation-order", kind: "Thuật ngữ" },
      { label: "Pivot", href: "/glossary#pivot", kind: "Thuật ngữ" },
    ],
    "p13-l04": [
      { label: "Depth cue", href: "/glossary#depth-cue", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p13-l05": [
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
