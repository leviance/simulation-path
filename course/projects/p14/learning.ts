import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p14-l01": {
      focus:
        "Sinh sàn, tường, trần và mốc quan sát trong world; vẽ từ vị trí mắt cố định bằng renderer CPU của P13.",
      expected:
        "Dựng căn phòng trước khi cho camera đi: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chạy Starter CPU",
          explanation:
            "Bảng logic 1100×800, framebuffer/Bresenham/projection/clip từ P13; chưa có room.",
        },
        {
          title: "Dựng world một lần",
          explanation:
            "RoomBounds 12×22×4, floor grid và hai hộp mốc; renderer chỉ nhận const geometry.",
        },
        {
          title: "Clip từng đoạn rồi raster",
          explanation: "Đổi từ mắt cố định (0,1.6,2), clip depth trước divide và screen trước int.",
        },
      ],
    },
    "p14-l02": {
      focus:
        "Trừ camera position, quan sát vật trôi ngược chiều mà không sửa một world vertex nào.",
      expected:
        "Đổi gốc tọa độ về vị trí camera: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giữ room bất biến",
          explanation:
            "Chỉ Scene.camera thay đổi, không cộng/trừ ngược position vào từng endpoint.",
        },
        {
          title: "Trừ vị trí mắt",
          explanation: "World point trừ camera.position cho vector tương đối, cùng đơn vị world.",
        },
        {
          title: "Đối chiếu số trước khi nhìn ảnh",
          explanation: "Camera (1,1.6,2), point (3,2,8) cho (2,0.4,6).",
        },
      ],
    },
    "p14-l03": {
      focus: "Suy đúng dấu và thứ tự inverse yaw/pitch theo quy ước +Z trước, +Y lên.",
      expected:
        "Nhìn quanh bằng phép quay ngược: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Chốt orientation",
          explanation: "Camera dùng Ry(yaw)Rx(-pitch); pitch dương nhìn lên, yaw dương quay phải.",
        },
        {
          title: "Đảo thao tác theo thứ tự",
          explanation: "Trừ position, Ry(-yaw), rồi Rx(+pitch); không đổi dấu tùy cảm giác ảnh.",
        },
        {
          title: "Tách điều khiển bàn phím",
          explanation: "IJKL đổi góc 3°, yaw wrap và pitch clamp ±89°; chưa relative mouse.",
        },
      ],
    },
    "p14-l04": {
      focus:
        "Từ yaw/pitch suy basis, so dot product với cách quay ngược và kiểm tra số biết trước.",
      expected:
        "Dựng ba trục forward, right, up: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Suy forward",
          explanation: "Hình chiếu ngang dài cos(pitch); Y là sin(pitch).",
        },
        {
          title: "Giữ right ngang",
          explanation:
            "Camera không roll: right=(cos(yaw),0,-sin(yaw)); up không luôn bằng world Y.",
        },
        {
          title: "Kiểm trực chuẩn độc lập",
          explanation:
            "Length gần 1, dot từng đôi gần 0, view point cũng bằng dot relative với từng trục.",
        },
      ],
    },
    "p14-l05": {
      focus:
        "Đọc keyboard state, tạo direction trong world và nhân speed × dt, không bay khi nhìn lên.",
      expected:
        "Đi bộ theo hướng nhìn với WASD: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đọc state sau event",
          explanation: "Từng if cập nhật strafe/advance; không dùng key-repeat làm đồng hồ.",
        },
        {
          title: "Đổi input sang world direction",
          explanation: "Right×strafe + groundForward×advance; groundForward chỉ phụ thuộc yaw.",
        },
        {
          title: "Chuẩn hóa và nhân dt",
          explanation:
            "Digital input: chuẩn hóa tổng hướng khác 0, tốc độ 3.5 world/s, cap stall dt 0.1.",
        },
      ],
    },
    "p14-l06": {
      focus:
        "Tách forward đầy đủ khỏi groundForward, dùng Q/E theo world Y và chuẩn hóa tổng hướng.",
      expected:
        "Thêm Fly và điều khiển độ cao: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Giữ hai mode rõ ràng",
          explanation: "Walk đứng Y=1.6, Fly dùng forward 3D; M đổi mode, về Walk trả eye height.",
        },
        {
          title: "Thêm lift theo world Y",
          explanation: "Q xuống, E lên; đây không phải camera.up đã nghiêng.",
        },
        {
          title: "Chuẩn hóa sau khi cộng hướng",
          explanation:
            "Trong Fly, forward và world Y không luôn vuông góc; normalize ba axis input trước chưa đủ.",
        },
      ],
    },
    "p14-l07": {
      focus:
        "Click để bật SDL relative mode, dùng delta không nhân dt và dọn input khi thoát hoặc mất focus.",
      expected:
        "Nhìn quanh bằng relative mouse mode: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Bật mode bằng thao tác rõ ràng",
          explanation:
            "Chỉ click trong viewport mới bật relative; state đọc lại từ SDL sau kết quả API.",
        },
        {
          title: "Dùng relative delta",
          explanation:
            "xrel/yrel không đổi sang logical framebuffer và không nhân dt; mỗi event đã là độ dời.",
        },
        {
          title: "Kết thúc input đầy đủ",
          explanation:
            "Esc, pause, reset/preset, mode, blur/hidden/resize và cleanup nhả relative; held keys phải thả trước khi nhận lại.",
        },
      ],
    },
    "p14-l08": {
      focus:
        "Giới hạn sáu biên ngoài, pause/step/reset, chế độ sạch và đi thử tự động có thể dừng.",
      expected:
        "Giữ camera trong phòng, hoàn thiện bản demo: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Clamp candidate sau movement",
          explanation: "X/Z có margin, Fly thêm Y; Walk giữ eye height, không có collision engine.",
        },
        {
          title: "Tách overlay và cảnh",
          explanation:
            "F tắt chữ/crosshair nhưng giữ phòng/hộp/sàn; world không có bản render giả riêng.",
        },
        {
          title: "Pause, step, demo đều dùng cùng update",
          explanation:
            "Space pause, N bước W 0.1s, T đi thử; reduced-motion tắt auto trong Canvas.",
        },
      ],
    },
    "p14-l09": {
      focus:
        "Khóa phép view bằng oracle độc lập, kiểm basis/movement/clipping và build toàn bộ source.",
      expected:
        "Kiểm chứng camera và chạy bản hoàn chỉnh: chạy checkpoint và đối chiếu số, hình ảnh cùng thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/room.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Dùng đáp án không tự sinh",
          explanation:
            "View yaw 90°, projection FOV 90° và fly pitch 45° đều có expected tính tay.",
        },
        {
          title: "Thêm invariant và biên",
          explanation:
            "Basis, dot oracle, inverse, dt partition, diagonal/fly speed, near/far/screen, bounds.",
        },
        {
          title: "Build và thử sản phẩm",
          explanation:
            "Source độc lập, SDL 3.4.8, Debug/Release, CTest và checklist input/HiDPI trên desktop.",
        },
      ],
    },
  },
  references: {
    "p14-l01": [
      {
        label: "world-space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l02": [
      {
        label: "view-transform",
        href: "/glossary#view-transform",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l03": [
      {
        label: "fps-camera",
        href: "/glossary#fps-camera",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l04": [
      {
        label: "camera-basis",
        href: "/glossary#camera-basis",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l05": [
      {
        label: "delta-time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l06": [
      {
        label: "camera-basis",
        href: "/glossary#camera-basis",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l07": [
      {
        label: "relative-mouse-mode",
        href: "/glossary#relative-mouse-mode",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_SetWindowRelativeMouseMode",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetWindowRelativeMouseMode",
        kind: "SDL API",
      },
    ],
    "p14-l08": [
      {
        label: "room-bounds",
        href: "/glossary#room-bounds",
        kind: "Thuật ngữ",
      },
    ],
    "p14-l09": [
      {
        label: "round-trip-test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
