import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 07 — radian, sin và cos",
    "Project 10 — Vec3, tam giác và winding",
    "Project 11 — perspective projection và near plane",
  ],
  summary:
    "Chiếu ba đỉnh thành một tam giác wireframe, đưa chúng về local space rồi tự viết rotation quanh X/Y/Z trước khi điều khiển yaw và pitch bằng chuột.",
  challenge: {
    timebox: "180–240 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 hiển thị tam giác 3D bằng perspective và cho phép kéo chuột để xoay nó quanh pivot, không dùng ma trận hoặc thư viện toán 3D.",
    outcome:
      "Cửa sổ hiển thị một tam giác wireframe có ba đỉnh phân biệt, pivot và các cạnh giữ nguyên độ dài khi xoay. Người dùng có thể dịch chuyển model, chỉnh pitch/yaw/roll bằng phím, kéo chuột, đổi thứ tự rotation và chạy animation có pause/step.",
    requirements: [
      "Tái sử dụng projection pipeline thuần C++ của Project 11 để chiếu riêng từng vertex.",
      "Chỉ nối ba cạnh khi cả ba vertex đều visible; không ghi pixel từ kết quả projection không hợp lệ.",
      "Tách local vertex, model position, world vertex và screen vertex thành các biến có nhiệm vụ rõ ràng.",
      "Tính pivot bằng centroid và xoay local vertex quanh gốc trước khi cộng model position.",
      "Tự suy và cài đặt rotation quanh X, Y, Z bằng sin/cos; chưa dùng matrix, quaternion hoặc GLM.",
      "Ghép pitch, yaw, roll theo một thứ tự được ghi rõ và cho phép đổi thứ tự để quan sát kết quả khác nhau.",
      "Dùng pointer capture khi kéo chuột; giới hạn pitch để thao tác không lật đột ngột.",
      "Cho model tự quay bằng delta time, có pause, single-step, reset và title bar hiển thị angles cùng validation error.",
    ],
    constraints: [
      "Không dùng OpenGL, SDL_RenderGeometry, matrix rotation, quaternion hoặc hàm rotation có sẵn.",
      "Các hàm rotation, inverse và validation phải độc lập với SDL để chạy bằng CTest.",
      "Không sửa dồn vertex đã rotate ở frame trước; mọi frame phải bắt đầu lại từ local triangle gốc.",
      "Không trộn degree với radian trong hàm toán; chỉ đổi đơn vị ở ranh giới input hoặc hiển thị.",
    ],
    definitionOfDone: [
      "Checkpoint đầu tiên đã vẽ được tam giác 3D từ ba kết quả perspective, trước khi thêm rotation.",
      "Rotation 90° quanh từng trục cho kết quả đúng theo quy tắc bàn tay phải.",
      "Đổi thứ tự XYZ và ZYX tạo kết quả khác nhau với angle tổng quát nhưng đều giữ nguyên độ dài cạnh.",
      "Kéo ngang đổi yaw, kéo dọc đổi pitch, pointer vẫn được nhả khi thả chuột ngoài canvas.",
      "Ba độ dài cạnh sai lệch dưới 10⁻⁹ và rotate→inverse round trip trở về point ban đầu.",
      "CTest vượt qua; starter, sáu checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "8–9 giờ",
  objectives: [
    "Hiểu rotation 3D như ba phép quay 2D trên các mặt phẳng tọa độ",
    "Phân biệt local vertex, pivot, model position và world vertex",
    "Ghép rotation có thứ tự, điều khiển bằng chuột và kiểm chứng invariant hình học",
  ],
  lessons: [
    {
      id: "p12-l01",
      slug: "01-noi-ba-diem-thanh-tam-giac-3d",
      title: "Nối ba điểm thành tam giác 3D",
      summary:
        "Bắt đầu từ framebuffer và projection đã chạy được, chiếu ba vertex, vẽ đủ ba cạnh và xử lý trường hợp một vertex không visible.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "rotation3d",
    },
    {
      id: "p12-l02",
      slug: "02-pivot-va-local-space",
      title: "Đặt pivot bằng local space",
      summary:
        "Tính centroid, đưa ba vertex về quanh local origin rồi cộng model position trở lại trước khi projection.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "rotation3d",
    },
    {
      id: "p12-l03",
      slug: "03-rotation-quanh-truc-x",
      title: "Xoay quanh trục X bằng sin và cos",
      summary:
        "Nhìn rotation X như một vòng tròn trên mặt phẳng Y–Z, tự suy công thức và giữ X không đổi.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "rotation3d",
    },
    {
      id: "p12-l04",
      slug: "04-pitch-yaw-roll-va-thu-tu",
      title: "Ghép pitch, yaw, roll theo thứ tự",
      summary:
        "Thêm rotation Y/Z, đặt tên Euler angles và so sánh XYZ với ZYX mà chưa cần ma trận.",
      order: 4,
      estimatedMinutes: 75,
      demoId: "rotation3d",
    },
    {
      id: "p12-l05",
      slug: "05-keo-chuot-de-xoay",
      title: "Kéo chuột để điều khiển yaw và pitch",
      summary:
        "Đổi mouse delta thành angle, capture pointer, clamp pitch và giữ keyboard làm đường điều khiển dự phòng.",
      order: 5,
      estimatedMinutes: 60,
      demoId: "rotation3d",
    },
    {
      id: "p12-l06",
      slug: "06-animation-va-validation",
      title: "Tự quay và kiểm chứng rotation",
      summary:
        "Cập nhật angle bằng delta time, viết inverse theo thứ tự ngược và khóa edge length cùng round-trip error bằng CTest.",
      order: 6,
      estimatedMinutes: 70,
      demoId: "rotation3d",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
