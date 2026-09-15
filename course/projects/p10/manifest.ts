import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 04 — vẽ line trên framebuffer",
    "Project 06 — phép toán vector và normalize",
    "Project 08 — dot product",
    "Project 09 — local space và phép biến đổi",
  ],
  summary:
    "Dựng một la bàn ba trục và một tam giác trong không gian, sau đó tự tính cross product để tìm vector pháp tuyến, diện tích và chiều quay của mặt.",
  challenge: {
    timebox: "150–210 phút",
    mission:
      "Tự xây dựng một mô phỏng SDL3 hiển thị ba trục X/Y/Z cùng một tam giác 3D có thể chỉnh sửa, rồi tính và vẽ vector pháp tuyến của tam giác từ chính ba đỉnh đó.",
    outcome:
      "Cửa sổ hiển thị la bàn 3D, tam giác ABC, hai cạnh AB và AC cùng vector normal xuất phát từ tâm tam giác. Người dùng có thể chọn từng đỉnh, di chuyển nó theo ba trục, đảo winding và quan sát diện tích hoặc trạng thái suy biến thay đổi ngay.",
    requirements: [
      "Tự xây dựng Vec3 cùng các phép cộng, trừ, nhân scalar, dot product, magnitude và normalize.",
      "Vẽ ba trục X/Y/Z bằng một phép chiếu axonometric cố định chỉ dùng cho sơ đồ minh họa.",
      "Lưu tam giác bằng ba đỉnh A, B, C và dựng hai vector cạnh AB=B−A, AC=C−A.",
      "Tự cài đặt cross product đầy đủ ba thành phần và dùng cross(AB,AC) làm normal chưa chuẩn hóa.",
      "Chuẩn hóa normal khi độ dài đủ lớn; không chia cho 0 khi ba đỉnh thẳng hàng hoặc trùng nhau.",
      "Tính diện tích tam giác bằng một nửa độ dài của cross product.",
      "Cho phép đảo B và C để quan sát winding đổi chiều normal nhưng không đổi diện tích.",
      "Hỗ trợ reset, resize, chọn/kéo đỉnh và hiển thị tọa độ, normal, area cùng trạng thái front/back hoặc degenerate trên title bar.",
    ],
    constraints: [
      "Không dùng GLM, Eigen, OpenGL, SDL_RenderGeometry hoặc hàm cross product có sẵn.",
      "Các hàm toán học phải độc lập với SDL để CTest chạy mà không mở cửa sổ.",
      "Phép chiếu trong project chỉ là cách vẽ sơ đồ axonometric; không được trình bày như perspective camera.",
      "Normal phải luôn được tính lại từ vị trí ba đỉnh hiện tại, không lưu một vector normal dễ bị cũ dữ liệu.",
    ],
    definitionOfDone: [
      "cross((1,0,0),(0,1,0)) trả (0,0,1) và vuông góc với cả hai vector đầu vào.",
      "Tam giác vuông có cạnh 3 và 4 cho normal dài 12, unit normal dài 1 và diện tích 6.",
      "Đổi thứ tự B,C làm normal đổi dấu nhưng diện tích không đổi trong sai số 10⁻⁹.",
      "Ba điểm thẳng hàng được báo degenerate; chương trình không tạo NaN hoặc vẽ unit normal giả.",
      "Kéo hoặc chỉnh một đỉnh làm cạnh, normal, diện tích và nhãn front/back cập nhật trong cùng frame.",
      "CTest vượt qua; starter, sáu checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "7–8 giờ",
  objectives: [
    "Mở rộng tư duy vector từ hai lên ba thành phần mà không trộn point với pixel",
    "Hiểu cross product qua hình học của hai cạnh và quy tắc bàn tay phải",
    "Dùng độ dài, hướng và dấu của normal để kiểm tra diện tích, winding và tam giác suy biến",
  ],
  lessons: [
    {
      id: "p10-l01",
      slug: "01-vec3-va-la-ban-ba-truc",
      title: "Từ Vec2 đến Vec3 và la bàn ba trục",
      summary:
        "Tạo Vec3, giữ dữ liệu trong không gian và dùng một phép chiếu axonometric cố định để vẽ ba trục lên framebuffer.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "normal",
    },
    {
      id: "p10-l02",
      slug: "02-tam-giac-va-hai-vector-canh",
      title: "Dựng tam giác và hai vector cạnh",
      summary:
        "Lưu ba đỉnh ABC, tính AB và AC bằng phép trừ rồi thêm thao tác chọn, kéo và chỉnh từng tọa độ.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "normal",
    },
    {
      id: "p10-l03",
      slug: "03-cross-product-va-raw-normal",
      title: "Tính cross product và raw normal",
      summary:
        "Tự viết công thức ba thành phần, dựng normal từ AB×AC và kiểm tra nó vuông góc với cả hai cạnh.",
      order: 3,
      estimatedMinutes: 60,
      demoId: "normal",
    },
    {
      id: "p10-l04",
      slug: "04-unit-normal-va-dien-tich",
      title: "Chuẩn hóa normal và đo diện tích",
      summary:
        "Tách hướng khỏi độ lớn, vẽ mũi tên có chiều dài ổn định và đọc diện tích từ độ dài raw normal.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "normal",
    },
    {
      id: "p10-l05",
      slug: "05-winding-va-quy-tac-ban-tay-phai",
      title: "Winding và quy tắc bàn tay phải",
      summary:
        "Đảo thứ tự B,C để thấy normal đổi hướng, sau đó dùng dot product phân biệt mặt đang hướng về hay quay khỏi người xem.",
      order: 5,
      estimatedMinutes: 55,
      demoId: "normal",
    },
    {
      id: "p10-l06",
      slug: "06-tam-giac-suy-bien-va-validation",
      title: "Tam giác suy biến và kiểm chứng",
      summary:
        "Xử lý trường hợp cross gần zero, thêm preset phá lỗi và dùng CTest để xác nhận toàn bộ bản hoàn chỉnh.",
      order: 6,
      estimatedMinutes: 60,
      demoId: "normal",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
