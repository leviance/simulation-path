import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p13-l01": {
      focus: "Đặt hai lớp bốn đỉnh trong local space, chạy bộ khung SDL và xem từng index.",
      expected:
        "Từ một điểm đến tám đỉnh của cube; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy Starter từ nền P12",
          explanation:
            "Bộ khung giữ framebuffer, phép quay sin/cos, phép chiếu an toàn và SDL presentation; chưa có cube.",
        },
        {
          title: "Đặt index nhất quán",
          explanation: "0–3 là vòng Z âm, 4–7 là vòng Z dương; viết đủ tám tổ hợp ±h.",
        },
        {
          title: "Chiếu và vẽ marker",
          explanation:
            "Cộng model position để cube ở trước camera; cache tám kết quả rồi chỉ vẽ marker visible.",
        },
      ],
    },
    "p13-l02": {
      focus:
        "Tách vị trí khỏi quan hệ nối, cache phép chiếu và vẽ các đoạn đã clip bằng Bresenham.",
      expected:
        "Nối mười hai cạnh từ index; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Tách vị trí khỏi topology",
          explanation: "Edge chỉ giữ hai index; ba nhóm bốn cạnh khép kín hai vòng và nối hai lớp.",
        },
        {
          title: "Dùng cache đỉnh",
          explanation:
            "projectCube thực hiện tám phép chiếu gốc; mỗi cạnh tra hai endpoint trong mảng.",
        },
        {
          title: "Clip trước raster",
          explanation:
            "Cắt near/far trước divide, screen trước int; chỉ chiếu bổ sung endpoint mới, rồi Bresenham tự viết.",
        },
      ],
    },
    "p13-l03": {
      focus:
        "Dùng lại rotation trực tiếp của P12 trên tám local vertex; quan sát pivot và hai thứ tự.",
      expected:
        "Xoay hình dạng rồi mới đặt vào world; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giữ bản local gốc",
          explanation: "Không xoay dồn world vertices frame trước; lấy lại ±h mỗi frame.",
        },
        {
          title: "Áp cùng rotation cho tám điểm",
          explanation: "rotateCube gọi rotateEuler trên từng local vertex, cùng angles và order.",
        },
        {
          title: "Translate ở cuối",
          explanation:
            "Pivot chính là scene.position; phép cộng cuối không làm cube quay quanh camera.",
        },
      ],
    },
    "p13-l04": {
      focus: "Suy công thức orthographic, so kích thước hai lớp Z và giữ cùng quy ước clipping.",
      expected:
        "Hai phép chiếu cho cùng một cube; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Suy tỉ lệ không phụ thuộc Z",
          explanation: "Orthographic chia X/Y cho halfWidth/halfHeight, vẫn kiểm tra near/far.",
        },
        {
          title: "Chọn mốc để so công bằng",
          explanation:
            "HalfHeight=6tan(FOV/2) tại zoom=1; chỉ trùng tỉ lệ perspective trên mặt phẳng Z=6.",
        },
        {
          title: "Chuyển P mà không sửa geometry",
          explanation:
            "Giữ nguyên local/world vertex và dùng chung clip/raster path cho hai phép chiếu.",
        },
      ],
    },
    "p13-l05": {
      focus:
        "Đọc keyboard state theo dt, giữ pointer owner và tách zoom phép chiếu khỏi đổi khoảng cách.",
      expected:
        "Di chuyển, kéo chuột và zoom; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Dịch chuyển bằng state và dt",
          explanation: "Đọc sau PollEvent, tạo direction, chuẩn hóa đường chéo rồi nhân 2 world/s.",
        },
        {
          title: "Giữ một chủ thao tác",
          explanation:
            "Nhấn trái trong viewport, capture, lấy delta logical; thả nhận mẫu cuối và mọi đường hủy phải nhả.",
        },
        {
          title: "Zoom có giới hạn",
          explanation:
            "Wheel/+/− đổi scale theo hàm mũ, không thay position; dùng W/S để thay khoảng cách.",
        },
      ],
    },
    "p13-l06": {
      focus:
        "Sắp cạnh theo Z, đổi độ sáng, thêm tự quay/pause/step và ẩn overlay mà không ẩn cube.",
      expected:
        "Làm rõ chiều sâu, giữ bản demo sạch; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Suy average camera Z",
          explanation:
            "Lấy trung bình endpoint sau depth clip, sắp xa trước gần sau, chuẩn hóa độ sáng.",
        },
        {
          title: "Cập nhật góc bằng dt",
          explanation: "Tự quay 0.35/0.55/0.20 rad/s, cap stall 0.1s, Space pause, N step.",
        },
        {
          title: "Tách overlay khỏi hình chính",
          explanation: "F ẩn marker/trục/HUD; cube và sàn không nằm trong nhánh debug.",
        },
      ],
    },
    "p13-l07": {
      focus: "Khóa đáp án tính tay, thử clipping/tương tác và build toàn bộ mã nguồn độc lập.",
      expected:
        "Kiểm chứng và chạy ứng dụng hoàn chỉnh; chạy checkpoint rồi đối chiếu hiện tượng và số đọc trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/pipeline.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Khóa đáp án độc lập",
          explanation:
            "Index, degree và phép chiếu FOV 90° có expected tính tay; không dùng chính hàm đang test làm đáp án.",
        },
        {
          title: "Thêm kiểm tra hình học và biên",
          explanation:
            "Độ dài cạnh, inverse, clip near/far/screen, khoảng thời gian khác nhau và giới hạn zoom.",
        },
        {
          title: "Build và kiểm tra sản phẩm",
          explanation:
            "ZIP chứa toàn bộ header/src/tests, CMake pin SDL, starter và bảy checkpoint độc lập.",
        },
      ],
    },
  },
  references: {
    "p13-l01": [
      {
        label: "Local space",
        href: "/glossary#local-space",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l02": [
      {
        label: "Framebuffer",
        href: "/glossary#framebuffer",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l03": [
      {
        label: "3D rotation",
        href: "/glossary#rotation-3d",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l04": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l05": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l06": [
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p13-l07": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
