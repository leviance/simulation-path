import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — keyboard state, normalize và delta time",
    "Project 11 — camera space và perspective projection",
    "Project 13 — wireframe geometry và projection cache",
  ],
  summary:
    "Giữ căn phòng đứng yên trong world space, tự viết view transform cho camera có position, yaw và pitch rồi điều khiển người xem bằng WASD cùng relative mouse mode của SDL3.",
  challenge: {
    timebox: "240–320 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 cho phép người dùng đi bộ và nhìn quanh trong một căn phòng wireframe, chỉ dùng framebuffer CPU và các phép toán vector/rotation đã tự viết.",
    outcome:
      "Người dùng nhìn căn phòng theo góc nhìn thứ nhất, di chuyển bằng WASD theo hướng camera, xoay nhìn bằng chuột không bị kẹt ở mép cửa sổ và không thể đi xuyên qua tường. Title bar hiển thị position, yaw, pitch, số segment visible và sai số kiểm chứng camera basis.",
    requirements: [
      "Tạo căn phòng từ danh sách Segment3 trong world space; geometry không được dịch chuyển ngược lại mỗi khi camera đi.",
      "Đổi world point sang camera space bằng cách trừ camera position rồi áp dụng inverse yaw và inverse pitch theo đúng thứ tự.",
      "Tính forward, right và up từ yaw/pitch; ba vector phải có độ dài gần 1 và vuông góc từng đôi.",
      "W/S đi theo forward nằm trên mặt sàn, A/D đi theo right; input chéo phải được normalize trước khi nhân speed và deltaTime.",
      "Đọc keyboard state liên tục, chặn deltaTime quá lớn và khóa camera ở eye height cố định.",
      "Dùng SDL_SetWindowRelativeMouseMode cho mouse look; nhấn Escape hoặc mất focus phải trả con trỏ về trạng thái bình thường.",
      "Clamp pitch nhỏ hơn 90 độ để tránh lật camera; yaw có thể wrap để không tăng vô hạn.",
      "Giữ camera trong RoomBounds với một khoảng margin và kiểm tra view round trip, basis cùng movement bằng CTest không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, glm, matrix library, quaternion, Z-buffer, collision engine hoặc physics engine.",
      "Không xoay hay translate room geometry để giả chuyển động; chỉ view transform được phép phụ thuộc camera state.",
      "Pitch không được đưa vào hướng đi trên mặt sàn, nếu không nhìn lên sẽ khiến W làm camera bay.",
      "Không dùng mouse position tuyệt đối rồi warp thủ công mỗi frame; SDL3 đã cung cấp relative mouse mode theo từng window.",
      "Project này chưa cắt segment qua near plane; segment có endpoint không visible vẫn được bỏ qua như Project 13.",
    ],
    definitionOfDone: [
      "Camera đứng yên ở trạng thái mặc định nhìn thấy căn phòng, floor grid và crosshair rõ ràng.",
      "worldToCamera rồi cameraToWorld trả point ban đầu với sai số không quá 10⁻⁹ ở nhiều pose.",
      "Forward/right/up có magnitude 1 và dot từng đôi gần 0; forward của yaw 90° hướng theo +X.",
      "Cùng một input trong một giây đi gần cùng quãng đường ở 30, 60 và 144 FPS; đi chéo không nhanh hơn đi thẳng.",
      "Camera không vượt RoomBounds, pitch luôn nằm trong giới hạn và relative mouse mode được nhả khi mất focus.",
      "CTest vượt qua; starter, bảy checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "9–10 giờ",
  objectives: [
    "Hiểu camera movement là phép biến đổi ngược từ world space sang camera space",
    "Tự dựng camera basis và biến input WASD thành chuyển động theo hướng nhìn",
    "Dùng relative mouse mode, delta time và bounds để hoàn thiện một camera FPS ổn định",
  ],
  lessons: [
    {
      id: "p14-l01",
      slug: "01-dung-can-phong-wireframe",
      title: "Dựng căn phòng wireframe đứng yên",
      summary:
        "Tạo RoomBounds, sinh wall/floor grid thành Segment3 và project căn phòng từ một camera cố định trước khi thêm điều khiển.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "fps-camera",
    },
    {
      id: "p14-l02",
      slug: "02-camera-position-va-view-translation",
      title: "Đưa camera position vào view transform",
      summary:
        "Trừ camera position khỏi world point, quan sát căn phòng dịch ngược chiều và kiểm tra geometry world-space không bị sửa.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "fps-camera",
    },
    {
      id: "p14-l03",
      slug: "03-inverse-yaw-va-pitch",
      title: "Nhìn quanh bằng inverse yaw và pitch",
      summary:
        "Biến camera orientation thành hai phép quay ngược trên point tương đối, giữ quy ước camera nhìn theo +Z.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "fps-camera",
    },
    {
      id: "p14-l04",
      slug: "04-forward-right-up-cua-camera",
      title: "Tự dựng forward, right và up",
      summary:
        "Suy ba trục camera từ yaw/pitch, kiểm tra magnitude và dot product trước khi dùng chúng cho movement.",
      order: 4,
      estimatedMinutes: 70,
      demoId: "fps-camera",
    },
    {
      id: "p14-l05",
      slug: "05-wasd-theo-huong-nhin-va-delta-time",
      title: "Di chuyển WASD theo hướng camera",
      summary:
        "Đọc keyboard state, normalize hai trục input và cập nhật position bằng speed nhân deltaTime trên mặt phẳng XZ.",
      order: 5,
      estimatedMinutes: 80,
      demoId: "fps-camera",
    },
    {
      id: "p14-l06",
      slug: "06-relative-mouse-mode-va-pitch-clamp",
      title: "Mouse look không mắc ở mép cửa sổ",
      summary:
        "Bật relative mouse mode theo window, dùng xrel/yrel cho yaw/pitch và dọn trạng thái đúng khi Escape hoặc focus-lost.",
      order: 6,
      estimatedMinutes: 70,
      demoId: "fps-camera",
    },
    {
      id: "p14-l07",
      slug: "07-gioi-han-can-phong-va-validation",
      title: "Giữ camera trong phòng và kiểm chứng",
      summary:
        "Clamp position theo RoomBounds, thêm pause/reset/readout và khóa các invariant của view transform, basis, movement bằng CTest.",
      order: 7,
      estimatedMinutes: 80,
      demoId: "fps-camera",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
