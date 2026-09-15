import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — CPU framebuffer, row-major pixel index và putPixel có bounds check",
    "Project 04 — Bresenham, pixel grid và cách tách thuật toán raster khỏi SDL",
    "Project 15 — Screen vertex là đầu ra cuối của Model → View → Projection",
  ],
  summary:
    "Tự viết triangle rasterizer trên CPU: khoanh bounding box, kiểm tra ba half-plane tại tâm pixel, xử lý winding và top-left rule rồi nội suy màu bằng barycentric coordinates.",
  challenge: {
    timebox: "300–390 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 nhận ba vertex trong screen space và tô kín chính xác các pixel thuộc tam giác. Người dùng phải kéo được từng vertex, quan sát candidate pixel, đổi fill rule và kiểm tra hai tam giác dùng chung cạnh không để hở hoặc tô đè.",
    outcome:
      "Cửa sổ hiển thị tam giác màu trên CPU framebuffer, ba handle A/B/C, bounding box và sample pixel đang xét. Bản hoàn chỉnh có preset đảo winding, triangle suy biến, triangle cắt mép viewport và một quad ghép từ hai triangle; title bar báo candidate, covered, overlap và barycentric error.",
    requirements: [
      "Khởi đầu bằng framebuffer chạy được, ba screen vertex, wireframe và thao tác kéo vertex trước khi viết thuật toán tô.",
      "Tính bounding box nguyên nhỏ nhất chứa tam giác, clamp vào framebuffer và chỉ duyệt pixel trong vùng đó.",
      "Tự viết orient2D/edge function; dùng dấu của ba edge để xác định sample nằm trong ba half-plane.",
      "Nhận diện positive, negative và degenerate winding; chuẩn hóa winding để cùng một triangle không biến mất khi đổi B với C.",
      "Lấy mẫu tại tâm pixel (x+0.5,y+0.5), không dùng góc trên trái (x,y) rồi gọi đó là coverage.",
      "Viết vòng raster trả RasterStats và callback shadePixel, để thuật toán coverage không phụ thuộc cách tô màu.",
      "Áp dụng top-left rule để mỗi pixel trên cạnh chung chỉ thuộc về một triangle; tình huống quad phải không có pixel bị tô hai lần.",
      "Từ ba edge value suy ra barycentric weights, kiểm tổng gần 1 và dùng chúng để nội suy RGB.",
      "Có preset, drag, pause, single-step, reset, resize và CTest cho phần toán thuần không cần mở window.",
    ],
    constraints: [
      "Không dùng SDL_RenderGeometry, OpenGL, GLM hoặc một triangle rasterizer có sẵn.",
      "Không quét toàn framebuffer nếu bounding box nhỏ hơn; candidate count phải xuất phát từ bounds đã clamp.",
      "Không dùng phép chia cho area khi triangle suy biến; trường hợp đó phải trả coveredCount bằng 0.",
      "Không round vertex về integer trước khi tính edge function; chỉ sample pixel nằm tại nửa đơn vị.",
      "Không thêm Z-buffer, perspective-correct interpolation hoặc near-plane clipping vào Project 16.",
    ],
    definitionOfDone: [
      "Bounding box chứa đủ candidate pixel và không phát sinh chỉ số ngoài framebuffer, kể cả triangle cắt mép.",
      "Đảo B/C không đổi coverage; triangle thẳng hàng không tô pixel và không tạo NaN.",
      "Sample bên trong có ba edge được chấp nhận; sample bên ngoài bị loại; barycentric weights có tổng sai số không quá 10⁻⁹.",
      "Raster callback được gọi đúng coveredCount và candidateLimit cho phép dừng ở một bước xác định.",
      "Inclusive rule tô cạnh chung hai lần, còn top-left rule chỉ giao mỗi sample trên cạnh cho đúng một triangle.",
      "Màu tại vertex khớp màu gốc và màu bên trong là tổ hợp barycentric hữu hạn.",
      "CTest vượt qua; starter, bảy checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "11–12 giờ",
  objectives: [
    "Biến một tam giác liên tục thành tập pixel rời rạc bằng coverage test có thể kiểm chứng",
    "Hiểu edge function, winding, pixel center và quy tắc sở hữu biên dùng trong rasterizer thật",
    "Dùng barycentric coordinates làm cầu nối từ coverage sang nội suy thuộc tính ở các project sau",
  ],
  lessons: [
    {
      id: "p16-l01",
      slug: "01-dung-khung-tam-giac-screen-space",
      title: "Dựng khung tam giác trong screen space",
      summary:
        "Bắt đầu từ framebuffer SDL3, khai báo ba screen vertex, vẽ wireframe và kéo từng đỉnh trước khi bàn tới pixel bên trong.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l02",
      slug: "02-khoanh-vung-bounding-box",
      title: "Khoanh vùng pixel bằng bounding box",
      summary:
        "Đổi min/max liên tục thành IntRect, clamp theo framebuffer và giảm số candidate cần xét từ cả màn hình xuống vùng quanh tam giác.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l03",
      slug: "03-edge-function-va-winding",
      title: "Edge function và chiều đi quanh tam giác",
      summary:
        "Dùng orient2D để đo sample nằm về phía nào của từng cạnh, đồng thời chuẩn hóa winding và loại triangle suy biến.",
      order: 3,
      estimatedMinutes: 85,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l04",
      slug: "04-pixel-center-va-coverage",
      title: "Lấy mẫu tại tâm pixel và quyết định coverage",
      summary:
        "Kiểm tra cả ba half-plane tại (x+0.5,y+0.5), trả CoverageSample có edge values và barycentric weights để nhìn được lý do nhận hoặc loại.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l05",
      slug: "05-vong-lap-raster",
      title: "Viết vòng lặp tô kín tam giác",
      summary:
        "Duyệt bounding box theo row-major, gọi shade callback cho sample đạt coverage và thống kê candidate/tested/covered rõ ràng.",
      order: 5,
      estimatedMinutes: 85,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l06",
      slug: "06-top-left-rule",
      title: "Để cạnh chung chỉ có một chủ",
      summary:
        "So inclusive với top-left rule trên hai triangle ghép thành quad, rồi loại overdraw trên đường chéo mà không tạo khe hở.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "triangle-raster",
    },
    {
      id: "p16-l07",
      slug: "07-barycentric-va-validation",
      title: "Nội suy màu và kiểm chứng rasterizer",
      summary:
        "Đổi edge values thành barycentric weights, nội suy RGB, thêm pause/single-step/preset và khóa các invariant bằng CTest cùng source final.",
      order: 7,
      estimatedMinutes: 100,
      demoId: "triangle-raster",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
