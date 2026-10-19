import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p10-l01": {
      focus: "Tạo Vec3, chiếu điểm theo độ sâu và vẽ la bàn X/Y/Z.",
      expected:
        "Dựng ba trục trong một cảnh perspective; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đặt Vec3 trước pixel",
          explanation:
            "Dữ liệu world có ba thành phần; camera và projection chỉ quyết định cách nhìn.",
        },
        {
          title: "Chia theo độ sâu",
          explanation:
            "worldToCamera tạo X/Y và positive depth; projectPerspective chia X/Y cho Z.",
        },
        {
          title: "Vẽ ba trục thật",
          explanation: "drawAxes dùng debug arrows 3D, không vẽ ba nhánh 2D giả phối cảnh.",
        },
      ],
    },
    "p10-l02": {
      focus: "Tạo P0/P1/P2, suy vector A và B rồi chỉnh từng tọa độ.",
      expected: "Vẽ tam giác và hai vector cạnh; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đặt tên P0/P1/P2",
          explanation: "A/B dành cho hai vector cạnh để không lẫn tên điểm với tên vector.",
        },
        {
          title: "Trừ chung một gốc",
          explanation: "A=P1−P0, B=P2−P0; đổi P0 phải cập nhật cả hai.",
        },
        {
          title: "Sửa từng tọa độ",
          explanation:
            "1–3 chọn đỉnh, mũi tên XY, PageUp/Down Z; camera và vertices là state riêng.",
        },
      ],
    },
    "p10-l03": {
      focus: "Dự đoán hướng bằng tay phải, viết ba thành phần và vẽ mũi tên 3D.",
      expected: "Tự tính và vẽ cross product; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Dự đoán bằng basis",
          explanation: "X×Y=Z, Y×X=−Z cho một ví dụ hướng biết trước.",
        },
        {
          title: "Viết ba thành phần",
          explanation: "Giữ thứ tự AB và dấu trừ trong thành phần Y; kiểm dot với cả hai cạnh.",
        },
        {
          title: "Vẽ có scale rõ ràng",
          explanation: "Raw arrow bị phóng đại/cap chỉ khi vẽ; UI giữ giá trị cross thật.",
        },
      ],
    },
    "p10-l04": {
      focus: "So raw cross với unit normal và kiểm bằng tam giác 3–4.",
      expected: "Tách hướng normal khỏi diện tích; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chuẩn hóa chỉ khi có hướng",
          explanation: "Normal zero hoặc gần thẳng hàng không có unit normal đáng tin cậy.",
        },
        {
          title: "Đo diện tích",
          explanation: "|A×B| là diện tích hình bình hành, tam giác lấy một nửa.",
        },
        {
          title: "So hai độ dài khác nhau",
          explanation:
            "Raw cross chứa diện tích; unit normal chỉ chứa hướng, mũi tên tím có scale vẽ riêng.",
        },
      ],
    },
    "p10-l05": {
      focus: "Đổi P1/P2, giữ diện tích và phân biệt front/back/edge-on.",
      expected: "Đảo winding và đọc mặt theo camera; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đảo winding",
          explanation: "Swap P1/P2 nhưng giữ eye, area và miền editor.",
        },
        {
          title: "Tính hướng tới eye",
          explanation: "Facing lấy eye−centroid, không dùng một viewDirection cố định.",
        },
        {
          title: "Nói rõ giới hạn",
          explanation:
            "Front/back chỉ phân loại hướng; chương trình vẫn vẽ hai mặt và chưa xử lý che khuất.",
        },
      ],
    },
    "p10-l06": {
      focus: "Orbit giữ điểm nắm, letterbox/HiDPI, near/far clipping và pause.",
      expected: "Xoay camera và xử lý input an toàn; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Kéo theo delta",
          explanation:
            "Giữ owner và previousMouse, nhấn không làm camera nhảy tới một góc tuyệt đối.",
        },
        {
          title: "Đổi input đúng một lần",
          explanation: "SDL convert event về bảng logic; không nhân DPI thêm lần nữa.",
        },
        {
          title: "Đóng thao tác an toàn",
          explanation: "Thả nhận mẫu cuối; blur/resize/reset/preset/winding/pause hủy capture.",
        },
      ],
    },
    "p10-l07": {
      focus: "Phân biệt zero/gần thẳng hàng, kiểm hình học độc lập và chạy bản đầy đủ.",
      expected: "Hoàn thiện la bàn và kiểm chứng; đối chiếu số biết trước và hình trong bài.",
      files: [
        "include/lab.hpp",
        "include/camera.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Tách hai ngưỡng",
          explanation: "Ngưỡng diện tích có đơn vị world², ngưỡng sin(góc) không có đơn vị.",
        },
        {
          title: "Kiểm độc lập",
          explanation:
            "Số basis biết trước và Heron bổ sung cho dot/invariant, không chỉ cho hai hàm tự đồng ý.",
        },
        {
          title: "Chạy bản đầy đủ",
          explanation: "Build cả tests rồi CTest Debug/Release; QA desktop sau hidden smoke.",
        },
      ],
    },
  },
  references: {
    "p10-l01": [
      {
        label: "Vector 3D",
        href: "/glossary#vector-3d",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l02": [
      {
        label: "Vector subtraction",
        href: "/glossary#vector-subtraction",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l03": [
      {
        label: "Cross product",
        href: "/glossary#cross-product",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l04": [
      {
        label: "Normalization",
        href: "/glossary#normalization",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l05": [
      {
        label: "Winding order",
        href: "/glossary#winding-order",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l06": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
    ],
    "p10-l07": [
      {
        label: "Degenerate triangle",
        href: "/glossary#degenerate-triangle",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
