import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 04 — Bresenham và framebuffer",
    "Project 11 — perspective projection và visibility status",
    "Project 12 — local space, Euler rotation và mouse drag",
  ],
  summary:
    "Biểu diễn một cube bằng tám vertex và mười hai edge có index, transform mỗi vertex đúng một lần rồi vẽ wireframe theo thứ tự depth hoàn toàn trên CPU.",
  challenge: {
    timebox: "180–240 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 hiển thị khối lập phương wireframe có thể xoay và dịch chuyển, chỉ dùng framebuffer CPU, projection và các phép rotation đã tự viết.",
    outcome:
      "Cửa sổ hiển thị cube gồm tám marker và mười hai cạnh. Người dùng có thể xoay bằng phím hoặc chuột, dịch model, đổi rotation order, bật/tắt depth cue, chạy animation và xem số cạnh visible cùng sai số hình học trên title bar.",
    requirements: [
      "Lưu đúng tám local vertex trong một std::array với quy ước index được ghi rõ.",
      "Lưu topology bằng mười hai Edge chứa hai vertex index; không gọi drawLine bằng 24 tọa độ viết tay.",
      "Transform và project mỗi vertex đúng một lần trong mỗi frame, sau đó mọi edge dùng lại cache kết quả.",
      "Chỉ vẽ edge khi cả hai endpoint có ProjectionStatus::Visible; chưa tự ý kéo dài hoặc clamp endpoint lỗi vào màn hình.",
      "Rotate cube từ local vertices gốc rồi mới cộng modelPosition; không sửa dồn world vertex của frame trước.",
      "Sắp edge visible từ xa tới gần và dùng average camera-space Z để tạo depth cue có thể bật/tắt.",
      "Hỗ trợ keyboard, mouse capture, pause, single-step, reset, resize và reduced-motion tương ứng trong Canvas lab.",
      "Kiểm tra topology, độ dài 12 cạnh, rotation round trip, projection cache và depth ordering bằng code thuần không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, SDL_RenderGeometry, matrix library, quaternion, Z-buffer hoặc hidden-surface removal.",
      "Không lặp lại projection bên trong vòng lặp edge; số lần project trong một frame phải bằng số vertex.",
      "Edge index phải được kiểm tra bounds và không được nối một vertex với chính nó.",
      "Depth cue chỉ thay đổi cách trình bày wireframe; không được mô tả nó như phép loại bỏ cạnh bị che.",
    ],
    definitionOfDone: [
      "Cube có đúng 8 vertex, 12 edge duy nhất và mỗi vertex tham gia đúng 3 edge.",
      "Với halfExtent=h, cả 12 cạnh dài 2h trước và sau mọi rotation trong sai số 10⁻⁹.",
      "Mỗi frame tạo 8 ProjectionResult rồi tái sử dụng chúng khi duyệt edge list.",
      "Các edge visible được vẽ xa trước, gần sau; tắt depth cue vẫn giữ nguyên geometry và visibility.",
      "Mouse-up hoặc mất focus đều kết thúc drag và nhả capture; keyboard vẫn điều khiển được toàn bộ trạng thái chính.",
      "CTest vượt qua; starter, năm checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "7–8 giờ",
  objectives: [
    "Chuyển từ hình có vài cạnh viết tay sang geometry có vertex array và edge topology",
    "Hiểu vì sao transform/project cache theo vertex giúp mesh mở rộng mà không lặp công việc",
    "Dùng camera-space depth để sắp thứ tự vẽ và kiểm chứng cube bằng invariant",
  ],
  lessons: [
    {
      id: "p13-l01",
      slug: "01-tam-dinh-va-quy-uoc-index",
      title: "Đặt tám đỉnh vào một quy ước index",
      summary:
        "Tạo tám local vertex từ half extent, đặt cube trước camera và chiếu từng vertex thành marker có index ổn định.",
      order: 1,
      estimatedMinutes: 60,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l02",
      slug: "02-muoi-hai-canh-tu-edge-list",
      title: "Nối mười hai cạnh bằng edge list",
      summary:
        "Mô tả topology bằng cặp index, cache tám projection result và dùng chung dữ liệu đó để vẽ đủ mười hai cạnh.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l03",
      slug: "03-xoay-ca-khoi-lap-phuong",
      title: "Xoay toàn bộ cube từ local space",
      summary:
        "Áp dụng cùng Euler rotation cho tám local vertex, translate sau rotation và giữ topology hoàn toàn không đổi.",
      order: 3,
      estimatedMinutes: 70,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l04",
      slug: "04-depth-order-va-depth-cue",
      title: "Vẽ cạnh xa trước, cạnh gần sau",
      summary:
        "Tính average depth cho từng edge visible, sắp từ xa tới gần và đổi độ sáng để wireframe dễ đọc hơn.",
      order: 4,
      estimatedMinutes: 65,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l05",
      slug: "05-tuong-tac-va-validation",
      title: "Hoàn thiện tương tác và kiểm chứng cube",
      summary:
        "Thêm mouse drag, animation, pause/step và CTest cho topology, edge length, inverse cùng visibility.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "wireframe-cube",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
