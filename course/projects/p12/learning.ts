import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p12-l01": {
      focus: "Từ framebuffer và phép chiếu P11, vẽ ba cạnh, các đỉnh và nền 3D.",
      expected:
        "Nối ba điểm thành tam giác 3D; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung trước",
          explanation:
            "Framebuffer, putPixel/drawLine và projection an toàn từ P11 đều có trong Starter; chưa thêm rotation.",
        },
        {
          title: "Chiếu ba đỉnh có status",
          explanation:
            "Triangle3 giữ world coordinates, TriangleProjection giữ từng kết quả và không giả pixel ở (0,0).",
        },
        {
          title: "Vẽ cạnh theo đoạn 3D",
          explanation: "AB/BC/CA dùng line3D để clip từng đoạn; marker chỉ vẽ nếu đỉnh visible.",
        },
      ],
    },
    "p12-l02": {
      focus: "Tách local vertex khỏi vị trí model để chuẩn bị xoay quanh centroid.",
      expected:
        "Đặt pivot bằng local space; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tìm centroid",
          explanation:
            "Trung bình ba đỉnh mặc định cho (0,0,6); đây là pivot đã chọn, không phải camera.",
        },
        {
          title: "Đưa hình dạng về local",
          explanation: "Trừ pivot ở cả ba đỉnh, giữ local triangle gốc bất biến qua frame.",
        },
        {
          title: "Cộng vị trí ở cuối",
          explanation:
            "World=rotatedLocal+modelPosition; quay world trước khi trừ pivot sẽ thành orbit.",
        },
      ],
    },
    "p12-l03": {
      focus: "Suy phép quay cặp Y/Z, rồi ghép local → rotated → world.",
      expected:
        "Quay quanh X bằng sin và cos; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ X, nhìn mặt phẳng YZ",
          explanation:
            "Dùng lại rotation 2D; dương quanh X đưa +Y về +Z theo quy tắc bàn tay phải.",
        },
        {
          title: "Tính từ tọa độ cũ",
          explanation: "Trả Vec3 mới, không dùng y đã cập nhật để tính z.",
        },
        {
          title: "Ghép vào local pipeline",
          explanation: "Mỗi frame rotateTriangleX từ local gốc, rồi translate và project.",
        },
      ],
    },
    "p12-l04": {
      focus: "Tự viết quay Y/Z, so XYZ với ZYX và phân biệt trục cố định với trục local.",
      expected:
        "Ghép X/Y/Z và thử hai thứ tự; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Viết Y và Z bằng cùng quy ước",
          explanation: "Quanh Y giữ Y, quanh Z giữ Z; dùng số 90° để khóa dấu.",
        },
        {
          title: "Tách từng thao tác",
          explanation:
            "rotateEuler đặt kết quả vào biến sau mỗi lần quay, không giấu thứ tự trong biểu thức dài.",
        },
        {
          title: "So hai order theo trục cố định",
          explanation: "XYZ là X trước, Y tiếp, Z cuối; khác hệ trục local tự quay.",
        },
      ],
    },
    "p12-l05": {
      focus: "Suy normal từ cạnh đã quay, vẽ mũi tên 3D và kiểm hướng độc lập.",
      expected:
        "Cho normal quay cùng tam giác; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy normal từ cạnh world",
          explanation: "cross(B−A,C−A) dùng hình học sau quay, không dùng các screen point.",
        },
        {
          title: "Vẽ mũi tên world",
          explanation:
            "Normal unit được vẽ dài 1.2 world từ centroid; các cánh cũng được project cùng cảnh.",
        },
        {
          title: "Đối chiếu hai cách",
          explanation:
            "Cross cạnh đã quay phải khớp normal local quay cùng angles/order; translation không đổi hướng.",
        },
      ],
    },
    "p12-l06": {
      focus:
        "Giữ chỗ nắm, pointer owner và mẫu thả cuối; object không bị khóa pitch như FPS camera.",
      expected:
        "Kéo chuột để xoay, Q/E để roll; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi logical delta sang góc",
          explanation:
            "Lưu previous mouse, nhân sensitivity rad/logical px và wrap góc, không khóa pitch ±89°.",
        },
        {
          title: "Giữ một owner",
          explanation:
            "Nhấn trái trong viewport bắt đầu capture, nhấn không sửa góc, pointer khác không chen vào.",
        },
        {
          title: "Kết thúc thao tác đầy đủ",
          explanation:
            "Up nhận mẫu cuối; lost button/capture failure/blur/resize/reset/preset/order/slider hủy drag.",
        },
      ],
    },
    "p12-l07": {
      focus: "Cập nhật góc bằng dt, pause/step/reset và tách hình chính khỏi overlay.",
      expected:
        "Tự quay và xem cảnh không có debug; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tích lũy angle bằng dt",
          explanation:
            "Angular velocity cố định, dt stall cap 0.1, góc wrap về [-π,π] để số không tăng mãi.",
        },
        {
          title: "Giữ pause và step rõ ràng",
          explanation: "Space toggle một lần, N tiến 0.1s khi paused; thao tác tay dừng auto.",
        },
        {
          title: "Tách hình chính khỏi debug",
          explanation:
            "Ẩn normal/ghost/pivot/HUD, giữ tam giác wireframe và lưới world; reduced-motion vẫn step được.",
        },
      ],
    },
    "p12-l08": {
      focus: "Dùng đáp án tính tay, invariant, inverse và toàn bộ source để nghiệm thu.",
      expected:
        "Kiểm chứng và chạy bản hoàn chỉnh; thử số biết trước và quan sát kết quả ở checkpoint của bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Khóa oracle số trước",
          explanation:
            "Basis và các tổ hợp 90° có đáp án tính tay, không tạo expected bằng inverse.",
        },
        {
          title: "Thêm invariant và inverse",
          explanation: "Giữ edge lengths, centroid, normal; inverse đảo thứ tự lẫn dấu.",
        },
        {
          title: "Chạy sản phẩm độc lập",
          explanation:
            "Build mọi checkpoint và tests ở Debug/Release, chạy CTest rồi thử executable final.",
        },
      ],
    },
  },
  references: {
    "p12-l01": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l02": [
      {
        label: "Pivot",
        href: "/glossary#pivot",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l03": [
      {
        label: "3D rotation",
        href: "/glossary#rotation-3d",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l04": [
      {
        label: "Rotation order",
        href: "/glossary#rotation-order",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l05": [
      {
        label: "Normal vector",
        href: "/glossary#normal-vector",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l06": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p12-l07": [
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p12-l08": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
