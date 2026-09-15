import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time và keyboard input",
    "Project 05 — world/screen space",
    "Project 07 — radian và tangent",
    "Project 10 — Vec3 và hệ trục 3D",
  ],
  summary:
    "Cho một điểm sáng chuyển động trong world space, đổi nó sang camera space rồi tự viết perspective projection để đưa điểm đó tới đúng pixel trên màn hình.",
  challenge: {
    timebox: "150–210 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 chiếu một điểm 3D xuống framebuffer bằng perspective, cho phép di chuyển cả điểm lẫn camera và giải thích được vì sao điểm tiến xa sẽ dịch dần về tâm màn hình.",
    outcome:
      "Cửa sổ hiển thị một điểm sáng có thể bay tự động hoặc điều khiển bằng bàn phím. Title bar cho biết world point, camera point, NDC, pixel, FOV và trạng thái visible/near/behind/outside; resize không làm sai tỉ lệ hình.",
    requirements: [
      "Dựng một marker nhìn thấy được trên framebuffer trước khi thêm công thức projection.",
      "Biểu diễn điểm và camera bằng Vec3; tự viết worldToCamera bằng phép trừ vị trí.",
      "Tự cài đặt perspective divide x/z và y/z, không dùng OpenGL hoặc thư viện ma trận.",
      "Suy focal scale từ vertical FOV và đổi camera point sang normalized device coordinates có xét aspect ratio.",
      "Đổi NDC sang pixel với trục Y màn hình hướng xuống và tâm viewport tại (width/2,height/2).",
      "Phân biệt điểm ở sau camera, trước near plane, ngoài frustum và thật sự visible trước khi ghi pixel.",
      "Cho điểm bay theo một quỹ đạo xác định bằng elapsed time; hỗ trợ pause, step, reset và preset lỗi.",
      "Hỗ trợ resize, điều khiển world point/camera/FOV/near plane và hiển thị toàn bộ giá trị trung gian trên title bar.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, Eigen, SDL_RenderGeometry hoặc API projection có sẵn.",
      "Các hàm projection phải độc lập với SDL để chạy được bằng CTest mà không mở cửa sổ.",
      "Không chia cho camera-space Z trước khi xác nhận điểm nằm trước camera và không gần hơn near plane.",
      "World point không được ghi đè bằng camera point, NDC hoặc pixel; mỗi hệ tọa độ có biến riêng.",
    ],
    definitionOfDone: [
      "Điểm trên trục nhìn chiếu đúng vào tâm viewport ở nhiều kích thước cửa sổ.",
      "Với cùng X/Y, tăng camera-space Z gấp đôi làm độ lệch khỏi tâm giảm một nửa.",
      "FOV lớn hơn làm điểm gần tâm hơn; thay aspect ratio không làm méo quy ước vertical FOV.",
      "Điểm có Z≤0 bị báo behind; 0<Z<near bị báo before-near; điểm ngoài NDC [-1,1] bị báo outside.",
      "screenToCameraAtDepth đảo được projection trong sai số 10⁻⁹ với point visible.",
      "CTest vượt qua; starter, sáu checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "7–8 giờ",
  objectives: [
    "Phân biệt rõ world space, camera space, NDC và screen space",
    "Hiểu perspective divide bằng quan hệ tam giác đồng dạng thay vì học thuộc x/z",
    "Xây một projection pipeline an toàn có FOV, aspect ratio, near plane và validation",
  ],
  lessons: [
    {
      id: "p11-l01",
      slug: "01-diem-3d-va-marker-tren-framebuffer",
      title: "Đưa một điểm 3D vào framebuffer",
      summary:
        "Bắt đầu từ framebuffer chạy được, tạo Vec3, vẽ marker có kích thước rõ ràng và thêm điều khiển X/Y/Z trước khi chiếu perspective.",
      order: 1,
      estimatedMinutes: 50,
      demoId: "projection",
    },
    {
      id: "p11-l02",
      slug: "02-tu-world-space-sang-camera-space",
      title: "Đổi world point sang camera space",
      summary:
        "Đưa camera vào scene, lấy worldPoint−camera.position và quan sát cùng một point thay đổi tọa độ khi camera di chuyển.",
      order: 2,
      estimatedMinutes: 55,
      demoId: "projection",
    },
    {
      id: "p11-l03",
      slug: "03-perspective-divide",
      title: "Perspective divide từ tam giác đồng dạng",
      summary:
        "Suy x/z và y/z, thay bản xem trước song song bằng phép chiếu làm điểm ở xa tiến về tâm màn hình.",
      order: 3,
      estimatedMinutes: 60,
      demoId: "projection",
    },
    {
      id: "p11-l04",
      slug: "04-fov-aspect-ndc-va-pixel",
      title: "Từ FOV và aspect ratio tới NDC và pixel",
      summary:
        "Tính focal scale bằng tan(FOV/2), chuẩn hóa theo aspect ratio rồi đổi NDC sang tọa độ pixel sau resize.",
      order: 4,
      estimatedMinutes: 70,
      demoId: "projection",
    },
    {
      id: "p11-l05",
      slug: "05-near-plane-va-view-frustum",
      title: "Near plane và bốn trạng thái nhìn thấy",
      summary:
        "Chặn phép chia nguy hiểm, phân loại behind/before-near/outside/visible và chỉ vẽ marker hợp lệ.",
      order: 5,
      estimatedMinutes: 60,
      demoId: "projection",
    },
    {
      id: "p11-l06",
      slug: "06-diem-bay-va-validation",
      title: "Cho điểm bay và kiểm chứng projection",
      summary:
        "Cập nhật quỹ đạo bằng elapsed time, viết phép đổi ngược tại một depth cố định và khóa toàn pipeline bằng CTest.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "projection",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
