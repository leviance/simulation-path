import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p15-l01": {
      focus:
        "Thêm mô hình vào viewport đã chạy được; chỉ Local là dữ liệu inspector thật ở bài này.",
      expected:
        "Chọn vertex 0–7 bằng V hoặc click, sửa local XYZ và thấy cả mô hình lẫn dòng LOCAL thay đổi.",
      files: ["include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy Starter trước",
          explanation:
            "Ảnh lưới sàn dùng công thức P11 từ bộ khung; chưa có model hay giá trị inspector.",
        },
        {
          title: "Vẽ từ vertex/edge list",
          explanation:
            "drawScene đổi local point qua bộ chuyển tiếp rồi raster cạnh; vertex đang chọn được đánh dấu vàng.",
        },
        {
          title: "Hiện Local thật",
          explanation:
            "inspectScene đưa đúng local XYZ vào dòng đầu, các dòng chưa viết giữ optional rỗng.",
        },
      ],
    },
    "p15-l02": {
      focus: "Viết Mat4 và phép nhân rõ từng hàng; phân biệt point với direction bằng w.",
      expected:
        "Translation(2,1,3) dịch point nhưng giữ nguyên direction; identity giữ đủ bốn thành phần.",
      files: ["include/lab.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Đọc row-major đúng nghĩa",
          explanation:
            "at(row,column) truy cập row*4+column; đây là cách lưu, không phải convention vector.",
        },
        {
          title: "Nhân vector bằng từng hàng",
          explanation: "Mỗi tọa độ đầu ra là dot của một hàng matrix với vector bốn thành phần.",
        },
        {
          title: "Kiểm thứ tự bằng số",
          explanation: "T×S và S×T phải khác nhau trên cùng input, không chỉ test identity.",
        },
      ],
    },
    "p15-l03": {
      focus: "Dựng M=T×Ry×S và thay đường đổi local→world ở cả renderer lẫn inspector.",
      expected: "Đổi model X/Z/yaw/scaleX làm WORLD và các stage sau đổi; LOCAL vẫn giữ nguyên.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Scale quanh local origin",
          explanation:
            "Kể cả scale X âm hoặc bằng 0, phép forward vẫn tính được mà không cần inverse M.",
        },
        {
          title: "Ghép M",
          explanation: "Matrix gần vector tác động trước: scale, rotate, rồi translate.",
        },
        {
          title: "Nối hai nơi sử dụng",
          explanation:
            "activeModelPoint phục vụ hình; inspectScene phục vụ bảng. Cả hai đọc cùng state và modelMatrix.",
        },
      ],
    },
    "p15-l04": {
      focus: "Biểu diễn inverse camera của P14 bằng V=Rx(pitch)×Ry(-yaw)×T(-position).",
      expected: "Camera thay đổi VIEW trở đi, không thay WORLD; yaw 90° đưa hướng +X về view +Z.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi gốc về mắt",
          explanation: "Translation(-position) đứng bên phải nên chạy trước.",
        },
        {
          title: "Hoàn tác orientation",
          explanation:
            "Inverse yaw trước, inverse pitch sau; không chỉ đổi dấu mà giữ nguyên thứ tự.",
        },
        {
          title: "Đối chiếu P14",
          explanation: "Công thức sin/cos vô hướng là đường tham chiếu độc lập với phép nhân Mat4.",
        },
      ],
    },
    "p15-l05": {
      focus: "Suy P cho camera nhìn +Z và depth 0..1; thêm điều khiển FOV/near/far.",
      expected: "FOV đổi clip X/Y, near/far đổi clip Z, còn clip.w luôn bằng view.z.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy hệ số focal",
          explanation: "f=1/tan(FOV/2), hàng X dùng f/aspect còn Y dùng f.",
        },
        {
          title: "Giải hai điều kiện depth",
          explanation: "Chọn A,B sao cho z=near cho NDC z=0, z=far cho NDC z=1.",
        },
        {
          title: "Giữ lens hợp lệ",
          explanation:
            "Near luôn nhỏ hơn far; bảng CLIP có số nhưng NDC/SCREEN chưa viết vẫn hiện —.",
        },
      ],
    },
    "p15-l06": {
      focus: "Chia cho w có guard, phân loại clip và chuyển renderer sang P→divide→viewport.",
      expected:
        "w≤epsilon giữ NDC/SCREEN rỗng; điểm outside vẫn có số hữu hạn để soi nhưng không được vẽ marker.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Phân biệt không tồn tại và bị cắt",
          explanation:
            "Positive w có thể cho NDC ngoài vùng nhìn; dữ liệu đó hữu ích cho inspector, khác với w=0.",
        },
        {
          title: "Kiểm sáu biên clip",
          explanation: "Với +Z và depth 0..1: -w≤x,y≤w và 0≤z≤w, có tolerance cho sai số.",
        },
        {
          title: "Đổi đường render",
          explanation:
            "projectViewPoint không dùng công thức tham chiếu nữa; wireframe vẫn clip đoạn trước divide.",
        },
      ],
    },
    "p15-l07": {
      focus: "Ghép MVP nhưng giữ pipeline rời cho bảng; khóa convention bằng ví dụ tính tay.",
      expected:
        "Đủ sáu dòng có đáp án, MVP error nhỏ; Space/N/F hoạt động và final chạy độc lập từ ZIP.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Theo một oracle từ đầu tới cuối",
          explanation:
            "Tính local→world→view→clip→NDC→screen bằng số cụ thể, không dùng code đang test để sinh expected.",
        },
        {
          title: "So hai đường tính",
          explanation:
            "P×V×M áp một lần phải bằng ba phép transform rời; vẫn giữ rời để inspector đọc được từng stage.",
        },
        {
          title: "Hoàn thiện thao tác và nghiệm thu",
          explanation:
            "Pause/step/reset, clean view, input lifecycle, CTest Debug/Release và checklist desktop.",
        },
      ],
    },
  },
  references: {
    "p15-l01": [
      { label: "Local space", href: "/glossary#local-space", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
      { label: "Pipeline trace", href: "/glossary#pipeline-trace", kind: "Thuật ngữ" },
    ],
    "p15-l02": [
      {
        label: "Homogeneous coordinates",
        href: "/glossary#homogeneous-coordinates",
        kind: "Thuật ngữ",
      },
      {
        label: "Transformation matrix",
        href: "/glossary#transformation-matrix",
        kind: "Thuật ngữ",
      },
      { label: "Column vector", href: "/glossary#column-vector", kind: "Thuật ngữ" },
    ],
    "p15-l03": [
      { label: "Model matrix", href: "/glossary#model-matrix", kind: "Thuật ngữ" },
      { label: "Non-commutative", href: "/glossary#non-commutative", kind: "Thuật ngữ" },
      { label: "Pivot", href: "/glossary#pivot", kind: "Thuật ngữ" },
    ],
    "p15-l04": [
      { label: "View matrix", href: "/glossary#view-matrix", kind: "Thuật ngữ" },
      { label: "View transform", href: "/glossary#view-transform", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
    ],
    "p15-l05": [
      { label: "Clip space", href: "/glossary#clip-space", kind: "Thuật ngữ" },
      { label: "Field of view", href: "/glossary#field-of-view", kind: "Thuật ngữ" },
      { label: "Aspect ratio", href: "/glossary#aspect-ratio", kind: "Thuật ngữ" },
    ],
    "p15-l06": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      {
        label: "Normalized device coordinates",
        href: "/glossary#normalized-device-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Viewport transform", href: "/glossary#viewport-transform", kind: "Thuật ngữ" },
    ],
    "p15-l07": [
      { label: "MVP matrix", href: "/glossary#mvp-matrix", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
