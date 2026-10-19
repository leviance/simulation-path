import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 02 — keyboard state và delta time",
    "Project 11 — phép chiếu perspective",
    "Project 12 — rotation trực tiếp bằng sin/cos",
    "Project 13 — wireframe CPU và clipping từng đoạn",
  ],
  summary:
    "Tự viết camera FPS để đi bộ hoặc bay trong một căn phòng wireframe 3D. World giữ nguyên; position, yaw và pitch của camera quyết định view transform.",
  challenge: {
    timebox: "4–6 giờ thử tự làm trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng ứng dụng C++/SDL3 cho phép đi trong một căn phòng 3D bằng WASD và nhìn quanh bằng relative mouse mode, có Walk/Fly cùng điều khiển độ cao.",
    outcome:
      "Viewport chiếm toàn cửa sổ, có sàn/tường/trần và nhiều mốc cố định. Người dùng đi từ cửa vào đến cuối phòng, nhìn lại phía sau, bay lên/xuống và chuyển sang chế độ trình diễn không có debug.",
    requirements: [
      "Room 12×22×4 với floor grid, khung tường/trần và ít nhất hai mốc lệch trái/phải; không chỉ orbit quanh một cube.",
      "Giữ room vertices trong world bất biến, tự viết world→view từ camera position/yaw/pitch, chưa dùng matrix library.",
      "Suy forward/right/up gần orthonormal; yaw dương hướng +X, pitch dương nhìn lên, camera view nhìn +Z.",
      "WASD đi theo camera; Walk giữ Y=1.6 và bỏ pitch khỏi hướng đi; Fly dùng forward đầy đủ cùng Q/E theo world Y.",
      "Movement dùng keyboard state × dt và chuẩn hóa tổng hướng world để đi chéo/đi bay không nhanh hơn.",
      "Native click bật SDL relative mouse mode, Esc nhả; pause/reset/preset/mode/focus loss/resize/cleanup không giữ chuột hoặc phím kẹt.",
      "Clip near/far trước perspective divide và clip screen trước Bresenham; giữ phần đoạn còn nhìn thấy dù endpoint outside.",
      "Có pause/step, preset/reset và ẩn debug vẫn giữ cảnh 3D; CTest không cần window và source hoàn chỉnh tải được.",
    ],
    constraints: [
      "Không dùng OpenGL, SDL line primitives, GLM, quaternion hoặc physics/collision engine để thay phần phải tự viết.",
      "Các hộp chỉ là mốc quan sát, có thể đi xuyên; chỉ chặn sáu biên phòng bằng AABB clamp, không gọi đó là collision solver tổng quát.",
      "Không warp mouse thủ công; relative delta không nhân dt hoặc DPR, không đổi theo kích thước framebuffer.",
      "Canvas drag có pointer capture là thí nghiệm công thức, không được mô tả như relative mode vô hạn của SDL.",
    ],
    definitionOfDone: [
      "Đi được từ Z=2 đến gần Z=22 và quay nhìn lại; world endpoints không đổi qua mọi thao tác.",
      "View có đáp án tính tay cho translation và yaw 90°; basis length≈1, dot≈0 và inverse error dưới 10⁻⁹.",
      "Từ trạng thái không chạm biên, 30/60/144 bước trong 1 giây đều đi 3.5 unit; đi chéo và Fly+lift không vượt tốc độ đó.",
      "Walk nhìn lên vẫn đi ngang; Fly nhìn lên và giữ W làm tăng Y; Q/E dùng world Y; đổi về Walk trả Y=1.6.",
      "Nhả relative mode và dừng input đúng khi mất focus/reset/pause; không tự bật capture lại sau focus regain.",
      "Starter, 9 checkpoint, final và CTest build/chạy Debug lẫn Release; các đường qua near/screen không làm treo hoặc văng hình.",
    ],
  },
  duration: "10–12 giờ",
  objectives: [
    "Phân biệt xoay object với đổi hệ tọa độ theo camera",
    "Suy camera basis và view inverse bằng vector/sin/cos trước ma trận",
    "Hoàn thiện Walk/Fly, relative mouse và lifecycle input an toàn",
    "Kiểm chứng camera bằng oracle độc lập, invariant và ứng dụng C++ thực sự",
  ],
  lessons: [
    {
      id: "p14-l01",
      slug: "01-dung-can-phong-wireframe",
      title: "Dựng căn phòng trước khi cho camera đi",
      summary:
        "Sinh sàn, tường, trần và mốc quan sát trong world; vẽ từ vị trí mắt cố định bằng renderer CPU của P13.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "fps-camera",
    },
    {
      id: "p14-l02",
      slug: "02-camera-position-va-view-translation",
      title: "Đổi gốc tọa độ về vị trí camera",
      summary:
        "Trừ camera position, quan sát vật trôi ngược chiều mà không sửa một world vertex nào.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "fps-camera",
    },
    {
      id: "p14-l03",
      slug: "03-inverse-yaw-va-pitch",
      title: "Nhìn quanh bằng phép quay ngược",
      summary: "Suy đúng dấu và thứ tự inverse yaw/pitch theo quy ước +Z trước, +Y lên.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "fps-camera",
    },
    {
      id: "p14-l04",
      slug: "04-forward-right-up-cua-camera",
      title: "Dựng ba trục forward, right, up",
      summary:
        "Từ yaw/pitch suy basis, so dot product với cách quay ngược và kiểm tra số biết trước.",
      order: 4,
      estimatedMinutes: 70,
      demoId: "fps-camera",
    },
    {
      id: "p14-l05",
      slug: "05-wasd-theo-huong-nhin-va-delta-time",
      title: "Đi bộ theo hướng nhìn với WASD",
      summary:
        "Đọc keyboard state, tạo direction trong world và nhân speed × dt, không bay khi nhìn lên.",
      order: 5,
      estimatedMinutes: 80,
      demoId: "fps-camera",
    },
    {
      id: "p14-l06",
      slug: "06-walk-fly-va-dieu-khien-doc",
      title: "Thêm Fly và điều khiển độ cao",
      summary:
        "Tách forward đầy đủ khỏi groundForward, dùng Q/E theo world Y và chuẩn hóa tổng hướng.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "fps-camera",
    },
    {
      id: "p14-l07",
      slug: "07-relative-mouse-mode-va-pitch-clamp",
      title: "Nhìn quanh bằng relative mouse mode",
      summary:
        "Click để bật SDL relative mode, dùng delta không nhân dt và dọn input khi thoát hoặc mất focus.",
      order: 7,
      estimatedMinutes: 80,
      demoId: "fps-camera",
    },
    {
      id: "p14-l08",
      slug: "08-gioi-han-phong-va-che-do-demo",
      title: "Giữ camera trong phòng, hoàn thiện bản demo",
      summary:
        "Giới hạn sáu biên ngoài, pause/step/reset, chế độ sạch và đi thử tự động có thể dừng.",
      order: 8,
      estimatedMinutes: 75,
      demoId: "fps-camera",
    },
    {
      id: "p14-l09",
      slug: "09-hoan-thien-va-kiem-chung",
      title: "Kiểm chứng camera và chạy bản hoàn chỉnh",
      summary:
        "Khóa phép view bằng oracle độc lập, kiểm basis/movement/clipping và build toàn bộ source.",
      order: 9,
      estimatedMinutes: 75,
      demoId: "fps-camera",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
