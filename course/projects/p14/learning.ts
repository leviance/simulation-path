import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p14-l01": {
      focus:
        "Bắt đầu từ framebuffer chạy được, mô tả căn phòng bằng RoomBounds và Segment3 rồi project từng segment khi camera còn ở pose cố định.",
      expected:
        "Cửa sổ hiện floor grid, khung bốn tường và crosshair. Title bar báo số segment tổng cộng cùng số segment đang visible; chưa có WASD hoặc mouse look.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt kích thước world space",
          explanation:
            "RoomBounds giữ min/max X, floor/ceiling Y và min/max Z. Mọi segment được sinh một lần từ cùng bộ bounds nên tests và movement dùng chung một nguồn sự thật.",
        },
        {
          title: "Sinh lưới thành các đoạn ngắn",
          explanation:
            "Floor grid được chia theo từng cell thay vì một line dài xuyên qua camera. Khi chưa có near-plane clipping, các đoạn đã đi ra sau camera biến mất riêng lẻ mà phần còn lại vẫn còn.",
        },
        {
          title: "Project rồi mới raster line",
          explanation:
            "Mỗi Segment3 project hai endpoint. Chỉ khi cả hai Visible, Bresenham mới nhận screen coordinate đã làm tròn.",
        },
      ],
    },
    "p14-l02": {
      focus:
        "Thêm FpsCamera.position và đổi world point sang camera space bằng worldPoint - camera.position, không sửa RoomGeometry.",
      expected:
        "Arrow keys đổi camera position theo world axes. Camera sang +X làm room trôi sang trái; segment đầu tiên giữ nguyên world coordinate trước và sau thao tác.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ geometry đứng yên",
          explanation:
            "RoomGeometry được tạo trước render loop và truyền vào bằng const reference. Không có vòng lặp nào cộng position vào các endpoint của phòng.",
        },
        {
          title: "Trừ camera position",
          explanation:
            "Point camera-space là độ dời từ camera tới world point. Vì vậy phép trừ tự tạo chuyển động ngược chiều trên màn hình.",
        },
        {
          title: "Đi thử theo world axes",
          explanation:
            "Checkpoint này cố ý dùng Arrow keys theo X/Z cố định để tách camera translation khỏi hướng nhìn sẽ được thêm ở bài sau.",
        },
      ],
    },
    "p14-l03": {
      focus:
        "Sau translation, áp dụng rotateY với -yaw rồi rotateX với +pitch để hoàn tác orientation của camera trước perspective divide.",
      expected:
        "J/L xoay yaw, I/K xoay pitch; room quay ngược chiều thao tác nhìn. Pitch dương đưa hướng nhìn lên nhưng camera-space forward vẫn là +Z.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Translation luôn đi trước rotation",
          explanation:
            "Ta cần vector từ camera tới point rồi mới đổi vector ấy sang các trục camera. Xoay world point tuyệt đối quanh origin sẽ tạo quỹ đạo sai.",
        },
        {
          title: "Hoàn tác yaw",
          explanation:
            "Camera quay +yaw trong world space tương đương quay point tương đối -yaw vào camera space. Dấu âm là phần cốt lõi của view transform.",
        },
        {
          title: "Hoàn tác pitch theo đúng quy ước",
          explanation:
            "Với camera nhìn +Z và pitch dương nhìn lên, orientation dùng local rotation -pitch; phép nghịch đảo trong worldToCamera vì vậy dùng +pitch.",
        },
      ],
    },
    "p14-l04": {
      focus:
        "Tính forward/right/up trong world space từ yaw/pitch và xác nhận chúng tạo một orthonormal camera basis.",
      expected:
        "Canvas hiện ba vector có magnitude 1, dot từng đôi gần 0. Yaw 90° làm forward hướng +X; pitch chỉ nghiêng forward/up và không làm right đổi độ dài.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy forward từ hai góc",
          explanation:
            "cos(pitch) là độ dài projection của forward trên mặt phẳng XZ; sin(yaw) và cos(yaw) chia projection đó cho X/Z.",
        },
        {
          title: "Right chỉ phụ thuộc yaw",
          explanation:
            "FPS camera không roll, nên right luôn nằm ngang: (cos(yaw), 0, -sin(yaw)). Đây cũng là hướng strafe.",
        },
        {
          title: "Dựng up cho cùng orientation",
          explanation:
            "Up được tính theo cùng yaw/pitch thay vì giữ cứng (0,1,0). Dot product và magnitude cho biết ba công thức có thật sự thống nhất.",
        },
      ],
    },
    "p14-l05": {
      focus:
        "Đổi bốn trạng thái WASD thành hai input axis, normalize khi cần rồi phối hợp groundForward/right thành velocity theo world space.",
      expected:
        "WASD đi theo yaw hiện tại, không bay khi nhìn lên. W+D có cùng speed với W; đổi FPS trong Canvas vẫn cho quãng đường gần bằng nhau sau một giây.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Gộp phím thành hai axis",
          explanation:
            "right-left tạo strafe và forward-backward tạo advance. Cặp giá trị này còn ở input space, chưa phải world velocity.",
        },
        {
          title: "Normalize input chéo",
          explanation:
            "Vector (1,1) dài √2. Chỉ normalize khi length lớn hơn 1 để analog input nhỏ vẫn giữ được cường độ.",
        },
        {
          title: "Nhân speed và deltaTime",
          explanation:
            "groundForward bỏ pitch, right giữ trên XZ. Tổng hai hướng được nhân speed×dt đã clamp rồi cộng đúng một lần vào camera.position.",
        },
      ],
    },
    "p14-l06": {
      focus:
        "Dùng SDL_SetWindowRelativeMouseMode cho cửa sổ, đọc xrel/yrel để sửa yaw/pitch và luôn nhả mode ở Escape/focus-lost/cleanup.",
      expected:
        "Click để khóa góc nhìn, rê chuột liên tục dù chạm mép màn hình, Escape để nhả. Pitch dừng ở ±89° và yaw được wrap về một khoảng hữu hạn.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Bật mode theo đúng window",
          explanation:
            "SDL3 gắn relative mode với SDL_Window. Chỉ đặt mouseLookActive=true sau khi API trả thành công để state nội bộ không nói khác hệ điều hành.",
        },
        {
          title: "Dùng delta, không dùng vị trí",
          explanation:
            "event.motion.xrel/yrel là độ dịch chuyển kể từ sự kiện trước. Sensitivity đổi pixel thành radian và không phụ thuộc kích thước cửa sổ.",
        },
        {
          title: "Có đường thoát ở mọi tình huống",
          explanation:
            "Escape, focus-lost và cleanup đều gọi disable. Nhờ vậy cursor không bị giữ hoặc ẩn sau khi người dùng rời ứng dụng.",
        },
      ],
    },
    "p14-l07": {
      focus:
        "Clamp camera vào RoomBounds, khóa eye height và kiểm thử view round trip, basis, movement theo dt, diagonal speed, pitch cùng bounds.",
      expected:
        "Camera dừng trước tường theo margin, reset sạch pose và input. Title/Canvas báo basis error cùng round-trip error gần zero; CTest qua Debug và Release.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Clamp sau movement",
          explanation:
            "Tính candidate position trước, sau đó clamp X/Z vào bounds trừ margin và đặt Y về eyeHeight. Geometry cùng camera orientation không bị sửa.",
        },
        {
          title: "Viết phép biến đổi ngược",
          explanation:
            "cameraToWorld đảo ngược đúng thứ tự rotation rồi cộng position. Round-trip nhiều point giúp bắt lỗi dấu và lỗi order mà nhìn hình khó thấy.",
        },
        {
          title: "Đo basis và movement",
          explanation:
            "Tests kiểm magnitude/dot, yaw 90°, nhiều chuỗi dt và quãng đường chéo. Đây là các invariant độc lập với framebuffer.",
        },
        {
          title: "Chạy bản hoàn chỉnh",
          explanation:
            "Sau CTest, kiểm tra WASD, click-to-look, Escape, focus-lost, resize, reset, pause và va vào cả bốn phía của room.",
        },
      ],
    },
  },
  references: {
    "p14-l01": [
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
      { label: "View frustum", href: "/glossary#view-frustum", kind: "Thuật ngữ" },
    ],
    "p14-l02": [
      { label: "View transform", href: "/glossary#view-transform", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
    ],
    "p14-l03": [
      { label: "FPS camera", href: "/glossary#fps-camera", kind: "Thuật ngữ" },
      { label: "Euler angles", href: "/glossary#euler-angles", kind: "Thuật ngữ" },
      { label: "Rotation order", href: "/glossary#rotation-order", kind: "Thuật ngữ" },
    ],
    "p14-l04": [
      { label: "Camera basis", href: "/glossary#camera-basis", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
      { label: "Normalization", href: "/glossary#normalization", kind: "Thuật ngữ" },
    ],
    "p14-l05": [
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
      { label: "Variable timestep", href: "/glossary#variable-timestep", kind: "Thuật ngữ" },
      { label: "Normalization", href: "/glossary#normalization", kind: "Thuật ngữ" },
    ],
    "p14-l06": [
      {
        label: "SDL_SetWindowRelativeMouseMode",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetWindowRelativeMouseMode",
        kind: "SDL API",
      },
      { label: "Relative mouse mode", href: "/glossary#relative-mouse-mode", kind: "Thuật ngữ" },
      { label: "Mouse delta", href: "/glossary#mouse-delta", kind: "Thuật ngữ" },
    ],
    "p14-l07": [
      { label: "Room bounds", href: "/glossary#room-bounds", kind: "Thuật ngữ" },
      { label: "Round-trip test", href: "/glossary#round-trip-test", kind: "Thuật ngữ" },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
