import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p08-l01": {
      focus: "Chạy starter, vẽ thân/nòng, đổi mouse sang world và hiện hai hướng.",
      expected:
        "Chạy checkpoint 01 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter trước",
          explanation:
            "Bảng có grid, trục và miền thao tác. Khi nó đã chạy, thêm state rồi mới vẽ thân/nòng.",
        },
        {
          title: "Giữ target trong world",
          explanation:
            "screenToWorld đảo Y đúng một lần; boundedTarget giới hạn miền input, không làm thay phép ngắm.",
        },
        {
          title: "Bật input và vẽ hai hướng",
          explanation:
            "Mouse hover mặc định đặt target; forward và target direction có cùng chiều dài hiển thị để so hướng.",
        },
      ],
    },
    "p08-l02": {
      focus: "So raw dot với normalized dot bằng các hướng và khoảng cách biết trước.",
      expected:
        "Chạy checkpoint 02 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết dot theo thành phần",
          explanation:
            "Kết quả là scalar; khi forward có độ dài 1, raw dot đo thành phần target dọc forward.",
        },
        {
          title: "Bỏ ảnh hưởng độ dài",
          explanation: "Normalize riêng hai vector trước khi dot để tránh tích độ dài overflow.",
        },
        {
          title: "Thử cùng/vuông/ngược",
          explanation: "Đổi preset gần/xa cùng hướng để thấy normalized dot không đổi.",
        },
      ],
    },
    "p08-l03": {
      focus: "Dùng acos, clamp và phân biệt góc đo được với trường hợp chưa có hướng.",
      expected:
        "Chạy checkpoint 03 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy góc từ cosine",
          explanation: "acos trả [0,π], chưa cho biết cần quay trái hay phải.",
        },
        {
          title: "Giữ đầu vào trong miền",
          explanation: "Clamp cosine vì sai số floating point có thể đưa nó hơi ra ngoài [-1,1].",
        },
        {
          title: "Không gán nghĩa cho fallback",
          explanation:
            "Hàm toán trả 0 khi thiếu hướng; UI phải ghi không xác định, không coi đó là góc đã ngắm đúng.",
        },
      ],
    },
    "p08-l04": {
      focus: "Tách projection và rejection, kiểm dấu và tính vuông góc.",
      expected:
        "Chạy checkpoint 04 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chiếu lên hướng đơn vị",
          explanation:
            "Scalar projection có dấu; vector projection dùng cùng đơn vị world với targetOffset.",
        },
        {
          title: "Tách phần còn lại",
          explanation:
            "Rejection bằng vector ban đầu trừ projection, vẽ từ điểm chiếu tới mục tiêu.",
        },
        {
          title: "Kiểm bằng hai cách",
          explanation: "Khôi phục vector và kiểm vuông góc; thêm oracle dùng axis chưa normalize.",
        },
      ],
    },
    "p08-l05": {
      focus: "Tự viết crossZ, signed angle và steering không vượt mục tiêu.",
      expected:
        "Chạy checkpoint 05 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dấu cross chọn chiều",
          explanation: "Trong world Y lên, cross dương nghĩa quay ngược kim đồng hồ.",
        },
        {
          title: "atan2 giữ cả dấu lẫn độ lớn",
          explanation: "Góc có dấu nằm trong [-π,π]; đúng đối nhau thì chọn chiều dương có chủ ý.",
        },
        {
          title: "Giới hạn bước quay",
          explanation:
            "Clamp sai số vào ±turnSpeed×deltaTime, không dùng một hệ số lerp tùy frame.",
        },
      ],
    },
    "p08-l06": {
      focus: "Dùng nửa góc, xử lý hai biên và nói rõ phép kiểm tra chỉ xét góc.",
      expected:
        "Chạy checkpoint 06 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng nửa góc",
          explanation: "Vùng đối xứng quanh forward có tổng độ mở gấp đôi halfViewAngle.",
        },
        {
          title: "Xét cả hai biên",
          explanation:
            "Normalized dot không mang dấu trái/phải nhưng đủ cho phép kiểm vùng đối xứng.",
        },
        {
          title: "Nêu đúng phạm vi",
          explanation:
            "Đây chỉ là phép kiểm góc; vòng tròn 6.5 là miền thao tác, không phải range hay occlusion.",
        },
      ],
    },
    "p08-l07": {
      focus: "Ghép bản đầy đủ, kiểm bằng oracle độc lập và thử input/HiDPI.",
      expected:
        "Chạy checkpoint 07 rồi đối chiếu hình, số và thí nghiệm trong bài; bản final có đủ các lớp cùng lúc.",
      files: ["tests/tests.cpp", "src/main.cpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Dùng dữ kiện độc lập",
          explanation:
            "Dot/cardinal fixtures, projection trên axis chưa normalize và remainder cho steering.",
        },
        {
          title: "Kiểm hình thật",
          explanation: "Render vào framebuffer rồi kiểm pixel của thân/nòng và các lớp vector.",
        },
        {
          title: "Chạy đầy đủ nhưng có giới hạn",
          explanation:
            "Build tối đa hai compiler; CTest và smoke có timeout; browser/desktop QA làm riêng.",
        },
      ],
    },
  },
  references: {
    "p08-l01": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p08-l02": [
      {
        label: "Dot product",
        href: "/glossary#dot-product",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l03": [
      {
        label: "Angle between",
        href: "/glossary#angle-between",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l04": [
      {
        label: "Vector projection",
        href: "/glossary#vector-projection",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l05": [
      {
        label: "2D cross product",
        href: "/glossary#cross-product-2d",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l06": [
      {
        label: "View cone",
        href: "/glossary#view-cone",
        kind: "Thuật ngữ",
      },
    ],
    "p08-l07": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
