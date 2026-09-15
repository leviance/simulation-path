import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 13 — mesh cube tám vertex, mười hai triangle và phép quay 3D",
    "Project 15 — Model → View → Projection và depth sau perspective divide",
    "Project 16 — triangle rasterizer, top-left rule và barycentric weights",
  ],
  summary:
    "Biến cube wireframe thành vật thể đặc sáu mặt màu, tái hiện lỗi che khuất do thứ tự vẽ rồi tự cài Z-buffer để chọn fragment gần camera nhất ở từng pixel.",
  challenge: {
    timebox: "300–390 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 vẽ khối lập phương đặc hoàn toàn bằng CPU. Cube phải quay được, sáu mặt có màu riêng và kết quả cuối không đổi khi đảo thứ tự mười hai triangle đầu vào.",
    outcome:
      "Cửa sổ hiển thị cube đặc đang quay, có thể bật/tắt depth test, đảo draw order, tạm dừng và xem depth buffer dạng grayscale. Pixel inspector cho biết fragment nào đến, depth cũ, depth mới và lý do pass hoặc fail.",
    requirements: [
      "Khởi đầu từ CPU framebuffer, mesh tám vertex và mười hai indexed triangle; vẽ được cube bằng cùng pipeline Project 15–16 trước khi thêm depth buffer.",
      "Gán sáu màu ổn định cho sáu mặt, mỗi mặt gồm hai triangle có winding và đường chéo nhất quán.",
      "Tạo một chế độ không có depth test để nhìn rõ draw-order artifact khi cube quay hoặc khi đảo danh sách triangle.",
      "Tạo DepthBuffer có cùng width×height và cùng row-major index với color buffer; resize phải cấp phát lại cả hai.",
      "Clear depth về 1.0 trước mỗi frame vì project dùng NDC depth trong đoạn [0,1], trong đó giá trị nhỏ hơn gần camera hơn.",
      "Giữ ndcDepth ở từng screen vertex và nội suy nó bằng barycentric weights tại mỗi covered pixel.",
      "Chỉ ghi color sau khi fragment vượt phép so sánh newDepth < storedDepth; khi pass phải cập nhật color và depth cùng một pixel.",
      "Có preset normal, reversed-order và overlap test; có pause, single-step, depth visualization, pixel inspector, reset và resize.",
      "Tách projection, rasterization và depth test khỏi SDL để CTest chạy không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, SDL_RenderGeometry, GLM hoặc depth buffer của GPU.",
      "Không sort triangle rồi gọi đó là Z-buffer; quyết định che khuất phải diễn ra ở từng fragment.",
      "Không dùng camera-space z với công thức dành cho NDC depth; mọi phép so sánh phải theo đúng một depth convention.",
      "Không clear depth sau từng triangle hoặc chỉ resize color buffer.",
      "Chưa thêm near-plane clipping, back-face culling, lighting hoặc texture mapping vào Project 17.",
    ],
    definitionOfDone: [
      "DepthBuffer có đúng width×height phần tử; clear và row-major indexing không truy cập ngoài mảng.",
      "NDC depth của vertex và fragment đều hữu hạn, nằm trong [0,1] với scene hợp lệ.",
      "Fragment gần hơn pass và cập nhật cả hai buffer; fragment xa hơn fail và không đổi pixel đã có.",
      "Một triangle có depth thay đổi theo barycentric weights thay vì dùng một depth chung cho cả mặt.",
      "Đảo toàn bộ draw order không đổi color buffer hoặc depth buffer khi depth test bật.",
      "Tắt depth test làm preset overlap phụ thuộc draw order, giúp nhìn thấy lỗi mà Z-buffer giải quyết.",
      "CTest vượt qua; starter, bảy checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "11–12 giờ",
  objectives: [
    "Hiểu che khuất là một quyết định theo từng fragment, không phải theo trung tâm triangle",
    "Tự thiết kế vòng đời của depth buffer: cấp phát, clear, compare, write và resize",
    "Nội suy NDC depth bằng barycentric weights và kiểm chứng renderer độc lập với draw order",
  ],
  lessons: [
    {
      id: "p17-l01",
      slug: "01-dung-khoi-lap-phuong-dac",
      title: "Dựng khối lập phương đặc từ 12 triangle",
      summary:
        "Tái dùng framebuffer và triangle rasterizer để đưa mesh cube tám vertex qua pipeline, tô sáu mặt màu mà chưa xử lý che khuất.",
      order: 1,
      estimatedMinutes: 75,
      demoId: "z-buffer",
    },
    {
      id: "p17-l02",
      slug: "02-loi-thu-tu-ve",
      title: "Tái hiện lỗi che khuất do thứ tự vẽ",
      summary:
        "Đảo danh sách triangle và cho cube quay để thấy Painter's algorithm không đủ khi các bề mặt che nhau theo từng pixel.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "z-buffer",
    },
    {
      id: "p17-l03",
      slug: "03-tao-va-clear-depth-buffer",
      title: "Tạo depth buffer song song với color buffer",
      summary:
        "Cấp phát một giá trị depth cho mỗi pixel, thống nhất row-major index, clear về far depth và xử lý resize an toàn.",
      order: 3,
      estimatedMinutes: 70,
      demoId: "z-buffer",
    },
    {
      id: "p17-l04",
      slug: "04-noi-suy-ndc-depth",
      title: "Nội suy NDC depth cho từng fragment",
      summary:
        "Giữ depth sau perspective divide ở ba screen vertex và dùng barycentric weights để tính depth tại đúng tâm pixel.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "z-buffer",
    },
    {
      id: "p17-l05",
      slug: "05-depth-test-va-depth-write",
      title: "So sánh rồi ghi depth đúng thứ tự",
      summary:
        "Cài phép thử newDepth < storedDepth, chỉ cập nhật color/depth khi pass và lưu telemetry để giải thích fragment bị loại.",
      order: 5,
      estimatedMinutes: 85,
      demoId: "z-buffer",
    },
    {
      id: "p17-l06",
      slug: "06-rasterize-toan-bo-cube",
      title: "Đưa toàn bộ cube qua Z-buffer",
      summary:
        "Rasterize đủ mười hai triangle, xoay cube theo thời gian và dùng cùng một fragment path cho mọi mặt.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "z-buffer",
    },
    {
      id: "p17-l07",
      slug: "07-kiem-chung-doc-lap-draw-order",
      title: "Kiểm chứng renderer độc lập với draw order",
      summary:
        "Thêm depth view, pixel inspector, preset và CTest so toàn bộ buffer giữa thứ tự xuôi/ngược trước khi chốt source final.",
      order: 7,
      estimatedMinutes: 100,
      demoId: "z-buffer",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
