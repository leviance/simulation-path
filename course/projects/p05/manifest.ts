import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer và putPixel",
    "Project 04 — rasterization trên lưới pixel",
  ],
  summary:
    "Xây một mặt phẳng tọa độ có thể pan, zoom và đổi chính xác giữa world space với màn hình.",
  challenge: {
    timebox: "120–180 phút",
    mission:
      "Xây một mặt phẳng tọa độ tương tác bằng Camera2D, có lưới động, thao tác pan và khả năng zoom quanh đúng vị trí con trỏ.",
    outcome:
      "Mặt phẳng hiển thị trục X/Y và lưới theo đơn vị world space, đọc được tọa độ dưới con trỏ, kéo được camera và zoom bằng con lăn mà điểm đang trỏ tới không bị trôi.",
    requirements: [
      "Thiết kế Camera2D gồm `centerWorld`, `pixelsPerUnit` và `viewportPixels`.",
      "Tự viết `worldToScreen` bằng phép tịnh tiến, đổi tỉ lệ và đảo trục Y.",
      "Tự viết `screenToWorld` bằng cách hoàn tác chính xác từng bước.",
      "Sinh lưới từ phần world space đang nhìn thấy, không ghi cứng đường kẻ theo pixel màn hình.",
      "Pan bằng độ dời chuột sau khi đổi từ pixel sang đơn vị world space.",
      "Giữ mức zoom trong khoảng an toàn và xử lý hệ số không hợp lệ.",
      "Zoom quanh con trỏ bằng cách đo điểm world trước và sau khi đổi tỉ lệ rồi bù `centerWorld`.",
      "Hiển thị đồng thời tọa độ màn hình, tọa độ world và sai số round trip.",
      "Cập nhật viewport khi cửa sổ đổi kích thước; phím R đưa camera về trạng thái ban đầu.",
    ],
    constraints: [
      "Mọi phép đổi hệ tọa độ phải đi qua Camera2D, không lặp lại công thức ở nhiều nơi trong code.",
      "Không để `pixelsPerUnit` bằng 0, âm hoặc NaN gây phép chia không hợp lệ.",
      "Lưới và điểm đánh dấu phải dùng cùng một phép biến đổi.",
    ],
    definitionOfDone: [
      "Với nhiều điểm, screenToWorld(worldToScreen(p)) có sai số nhỏ hơn 10⁻⁹.",
      "Điểm trong world space dưới con trỏ giữ nguyên trước và sau khi zoom.",
      "Pan 55 pixel ở tỉ lệ 55 pixel/đơn vị làm camera dịch đúng 1 đơn vị world.",
      "Thay đổi viewport không làm thay đổi vị trí đã lưu trong world space.",
    ],
  },
  duration: "4–5 giờ",
  objectives: [
    "Phân biệt world space và tọa độ màn hình",
    "Viết hai phép biến đổi thuận và nghịch",
    "Giữ điểm dưới con trỏ khi zoom",
  ],
  lessons: [
    {
      id: "p05-l01",
      slug: "01-hai-he-toa-do",
      title: "Hai hệ tọa độ",
      summary: "Đặt rõ gốc tọa độ, chiều của các trục và đơn vị sử dụng.",
      order: 1,
      estimatedMinutes: 50,
    },
    {
      id: "p05-l02",
      slug: "02-world-to-screen",
      title: "Từ world space ra màn hình",
      summary: "Tính vị trí tương đối, đổi tỉ lệ và đảo trục Y tại đúng một nơi.",
      order: 2,
      estimatedMinutes: 40,
    },
    {
      id: "p05-l03",
      slug: "03-screen-to-world",
      title: "Từ màn hình về world space",
      summary: "Hoàn tác từng bước của phép biến đổi rồi kiểm tra round trip.",
      order: 3,
      estimatedMinutes: 40,
      demoId: "coordinate",
    },
    {
      id: "p05-l04",
      slug: "04-grid-va-pan",
      title: "Vẽ lưới và pan camera",
      summary: "Chỉ vẽ phần lưới đang nhìn thấy và kéo camera theo chuột.",
      order: 4,
      estimatedMinutes: 40,
    },
    {
      id: "p05-l05",
      slug: "05-zoom-quanh-cursor",
      title: "Zoom quanh con trỏ",
      summary: "Bù vị trí camera để điểm dưới con trỏ không bị trôi.",
      order: 5,
      estimatedMinutes: 45,
      demoId: "coordinate",
    },
    {
      id: "p05-l06",
      slug: "06-round-trip-test",
      title: "Kiểm chứng round trip và hoàn thiện",
      summary: "Đo sai số, kiểm tra pan/zoom/resize và chạy bản hoàn chỉnh.",
      order: 6,
      estimatedMinutes: 30,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
