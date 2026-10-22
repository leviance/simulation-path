import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p18-l01": {
      focus: "Bắt đầu từ cửa sổ chạy được, rồi dựng tam giác và tái hiện lỗi bỏ cả hình.",
      expected:
        "Tam giác RGB đi theo Z bằng A/D và kéo chuột; mặt cắt cho biết đỉnh nào đang ra ngoài.",
      files: [
        "include/types.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/controls.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đọc bộ khung trước khi thêm hình",
          explanation:
            "Starter đã có SDL, framebuffer và rasterizer P16. Ta chỉ thêm dữ liệu tam giác, không viết lại các phần đã học.",
        },
        {
          title: "Tách vật thể khỏi camera",
          explanation:
            "Preset và depthOffset tạo geometry world; cameraTriangle trừ vị trí mắt để có đầu vào camera space.",
        },
        {
          title: "Nối vòng lặp thật",
          explanation:
            "Held input dùng dt; kéo chuột có owner và nhận tọa độ cuối khi thả. renderScene chỉ vẽ nguyên tam giác còn đủ ba đỉnh hợp lệ.",
        },
      ],
    },
    "p18-l02": {
      focus: "Biểu diễn mặt phẳng và chốt một quy ước biên dùng xuyên suốt pipeline.",
      expected:
        "HUD đếm inside/outside chính xác; onPlane là thông tin chẩn đoán, không làm thay đổi vùng giữ.",
      files: ["include/clip.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Viết signed distance",
          explanation: "Plane có normal và offset. Với near plane, công thức còn d=z−near.",
        },
        {
          title: "Phân biệt phép quyết định với số đo gần biên",
          explanation:
            "Inside dùng d≥0; abs(d)≤epsilon chỉ tăng onPlane. Tổng inside+outside vẫn bằng ba.",
        },
        {
          title: "Đưa output lên HUD",
          explanation:
            "renderScene gọi classifyTriangle rồi presentFramebuffer đọc chính kết quả đó, không tự phân loại lần nữa.",
        },
      ],
    },
    "p18-l03": {
      focus: "Tìm giao điểm thật trên đoạn thẳng, không sửa Z của vertex đầu vào.",
      expected: "Mỗi cạnh crossing có marker trắng; position và RGB của giao điểm dùng cùng t.",
      files: ["include/clip.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Giải t rồi nội suy",
          explanation:
            "Từ z(t)=start.z+t(end.z−start.z), giải t trong [0,1] và dùng chung cho mọi thành phần.",
        },
        {
          title: "Trả optional khi không có giao điểm",
          explanation:
            "Đoạn song song ngoài plane hoặc giao của đường thẳng nằm ngoài segment không tạo vertex giả.",
        },
        {
          title: "Quan sát cạnh rất ngắn",
          explanation:
            "Không gọi mọi dz nhỏ là song song: hai đầu cách plane ±2⁻⁴² vẫn có một giao điểm thật.",
        },
      ],
    },
    "p18-l04": {
      focus: "Cắt ba cạnh có hướng và lưu lại biên polygon không trùng endpoint.",
      expected:
        "Các trường hợp thường cho 3/4/3/0 đỉnh; tiếp xúc có thể chỉ còn một điểm hoặc một đoạn.",
      files: ["include/clip.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Thêm vertex có kiểm soát",
          explanation:
            "Bỏ bản sao liền kề; nếu vượt capacity thì đánh dấu invalid, không cắt cụt dữ liệu âm thầm.",
        },
        {
          title: "Duyệt vòng kín",
          explanation:
            "Bắt đầu từ C→A, rồi A→B và B→C. Crossing thêm giao điểm; current inside thì giữ current.",
        },
        {
          title: "Đóng vòng đúng một lần",
          explanation:
            "Bỏ đỉnh cuối nếu trùng đỉnh đầu, rồi nối output bằng đường xanh lá trong mặt cắt.",
        },
      ],
    },
    "p18-l05": {
      focus: "Đổi polygon lồi về tam giác mà rasterizer đã hiểu.",
      expected:
        "Quad tạo hai tam giác có winding nhất quán; điểm, đoạn và tam giác thẳng hàng không tạo diện tích giả.",
      files: ["include/clip.hpp", "include/view.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Đo diện tích trong 3D",
          explanation:
            "Cross product nhận ra fan suy biến; không chỉ nhìn mặt cắt ZX vì nó đã bỏ mất Y.",
        },
        {
          title: "Neo fan tại đỉnh 0",
          explanation:
            "Tạo (0,1,2), sau đó (0,2,3) nếu có đỉnh thứ tư. Không sắp xếp lại output của clipper.",
        },
        {
          title: "Hiện đường chéo và số lượng",
          explanation:
            "HUD đọc TriangleBatch thật; đường chéo tím chỉ hỗ trợ quan sát, chưa có nghĩa renderer đã dùng batch.",
        },
      ],
    },
    "p18-l06": {
      focus: "Nối toàn bộ clip→fan→project→raster vào renderer thật.",
      expected:
        "Preset one-out vẫn còn bề mặt RGB; đổi discard thì mất cả hình, dù đầu vào không đổi.",
      files: ["include/clip.hpp", "include/scene.hpp", "include/controls.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Gom kết quả một lần",
          explanation:
            "ClipResult giữ counts, polygon và batch của cùng một lần chạy, tránh clip lại cho từng phần HUD.",
        },
        {
          title: "Giữ guard trước phép chia",
          explanation:
            "Projection chỉ nhận z≥near. Rasterizer giới hạn bounding box trước chuyển sang chỉ số nguyên.",
        },
        {
          title: "Thay renderScene và bật policy",
          explanation:
            "Thay toàn bộ hàm đang dùng, đặt mặc định clipping=true và thêm V để đối chiếu với discard.",
        },
      ],
    },
    "p18-l07": {
      focus: "Quét vật thể qua camera và kiểm đúng bằng dữ liệu, không chỉ nhìn hình.",
      expected:
        "Sweep có giới hạn, pause/step hoạt động; oracle diện tích và ray/triangle kiểm kết quả độc lập.",
      files: [
        "include/scene.hpp",
        "include/controls.hpp",
        "include/clip.hpp",
        "include/presentation.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Tiến theo thời gian",
          explanation:
            "advanceScene ưu tiên held input; nếu đang chạy sweep mới dùng tốc độ 0.75 unit/s, dt giới hạn 0.05 s.",
        },
        {
          title: "Đo vi phạm biên",
          explanation:
            "Mọi output vertex hợp lệ có z≥near. Polygon invalid phải báo infinity thay vì nhìn như lỗi bằng zero.",
        },
        {
          title: "Dùng oracle khác thuật toán",
          explanation:
            "Kiểm diện tích 3/4 và 1/4; so mask raster với ray gặp tam giác gốc; quét 1001 vị trí chỉ chạy toán nhỏ.",
        },
      ],
    },
    "p18-l08": {
      focus: "Hoàn thiện cảnh phối cảnh, camera độc lập và ứng dụng tải về.",
      expected:
        "Clean mode giữ lưới world cùng bề mặt; toàn bộ mã người học chạy và kiểm được ngoài website.",
      files: [
        "include/view.hpp",
        "include/scene.hpp",
        "include/controls.hpp",
        "include/presentation.hpp",
      ],
      steps: [
        {
          title: "Vẽ world bằng cùng camera",
          explanation:
            "Lưới sàn không đi theo depthOffset. Nó chỉ trừ camera rồi clip các đoạn trước khi project.",
        },
        {
          title: "Tách sản phẩm khỏi debug",
          explanation:
            "F đổi viewport và ẩn HUD/mặt cắt, không bỏ rasterization hoặc lưới phối cảnh.",
        },
        {
          title: "Kiểm đúng source đã viết",
          explanation:
            "CTest mặc định dùng final/include. Sau tám bài, chuyển tests sang starter/include để kiểm mã của chính mình ở Debug/Release.",
        },
      ],
    },
  },
  references: {
    "p18-l08": [{ label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" }],
    "p18-l01": [
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
    ],
    "p18-l02": [
      { label: "Half-space", href: "/glossary#half-space", kind: "Thuật ngữ" },
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Epsilon", href: "/glossary#epsilon", kind: "Thuật ngữ" },
    ],
    "p18-l03": [
      {
        label: "Linear interpolation",
        href: "/glossary#linear-interpolation",
        kind: "Thuật ngữ",
      },
      {
        label: "Segment–plane intersection",
        href: "/glossary#segment-plane-intersection",
        kind: "Thuật ngữ",
      },
      { label: "Vertex attribute", href: "/glossary#vertex-attribute", kind: "Thuật ngữ" },
    ],
    "p18-l04": [
      {
        label: "Sutherland–Hodgman clipping",
        href: "/glossary#sutherland-hodgman",
        kind: "Thuật ngữ",
      },
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
      { label: "Half-space", href: "/glossary#half-space", kind: "Thuật ngữ" },
    ],
    "p18-l05": [
      { label: "Triangle fan", href: "/glossary#triangle-fan", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
    ],
    "p18-l06": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
    ],
    "p18-l07": [
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
