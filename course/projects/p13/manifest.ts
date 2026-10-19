import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 04 — framebuffer và Bresenham",
    "Project 11 — phép chiếu perspective và clipping",
    "Project 12 — local space, Euler rotation, mouse capture",
  ],
  summary:
    "Tự dựng một cube 3D từ tám đỉnh và mười hai cạnh, vẽ bằng pixel CPU rồi điều khiển bằng chuột, bàn phím và hai phép chiếu.",
  challenge: {
    timebox: "4–6 giờ thử tự làm trước khi đọc bài",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3 có viewport 3D toàn cửa sổ: một khối lập phương wireframe xoay được bằng chuột, di chuyển bằng WASD/QE và zoom bằng wheel.",
    outcome:
      "Cube đủ lớn để thấy lớp gần lớn hơn lớp xa trong perspective. P chuyển sang orthographic làm hai lớp có cùng tỉ lệ; sàn và các trục world giúp nhận ra hướng và khoảng cách.",
    requirements: [
      "Dùng 8 local vertex và 12 cặp index; tự viết transform chain, phép chiếu và wireframe rasterizer trên CPU.",
      "Giữ local vertices gốc bất biến; mỗi frame xoay quanh local origin rồi cộng model position.",
      "Perspective/orthographic toggle bằng P; hai phép chiếu khớp kích thước tại mặt phẳng tham chiếu Z=6 nhưng phản ứng khác khi đổi Z.",
      "Kéo chuột trái để xoay; WASD/QE di chuyển theo world; wheel hoặc +/− để zoom; R reset.",
      "Viewport chiếm toàn bộ bảng logic, có sàn 3D, mốc độ sâu và world axes. Resize/HiDPI không làm biến dạng cube.",
      "Cạnh qua near/far hoặc mép viewport giữ lại phần còn nhìn thấy; không bỏ cả cạnh chỉ vì một đầu không visible.",
      "Có pause, step, preset và chế độ sạch: tắt debug vẫn giữ cube cùng bối cảnh chiều sâu.",
      "Kiểm thử topology, đáp án chiếu tính tay, bảo toàn cạnh, clipping và input math bằng CTest không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, SDL_RenderLine/SDL_RenderLines hoặc SDL_RenderGeometry để thay phần CPU rasterizer.",
      "Chưa tô mặt, chưa Z-buffer hay hidden-surface removal; sắp cạnh theo average Z không phải phép loại cạnh khuất.",
      "Cache 8 phép chiếu đỉnh gốc mỗi frame; khi clip sinh endpoint mới có thể cần thêm phép chiếu, phải đếm riêng và giải thích.",
      "Canvas chỉ giúp thử công thức; bản hoàn chỉnh là executable C++20/SDL3 3.4.8 tải được cùng source.",
    ],
    definitionOfDone: [
      "Có 8 vertex, 12 cạnh không trùng, mỗi vertex nối 3 cạnh; tất cả cạnh dài 2h sau rotation trong sai số 10⁻⁹.",
      "Thử cùng (X,Y) ở Z=4 và Z=8: perspective giảm nửa độ lệch khỏi tâm, orthographic giữ nguyên.",
      "Di chuyển theo dt cho kết quả như nhau ở các bước nhỏ khác nhau; đi chéo không nhanh hơn đi thẳng.",
      "Kéo không nhảy góc khi nhấn; thả nhận mẫu cuối; blur/reset/resize/capture failure không để drag hoặc phím bị kẹt.",
      "Wheel zoom có giới hạn, P không làm đổi world geometry; nhấn R trở lại trạng thái ban đầu.",
      "Starter, 7 checkpoint và final build ở Debug/Release; CTest chạy được và bản final có đầy đủ tương tác bắt buộc.",
    ],
  },
  duration: "8–10 giờ",
  objectives: [
    "Biểu diễn hình học bằng vertex array và edge list, không viết tay các tọa độ màn hình",
    "Theo dõi model → rotated local → world → camera → NDC → screen → pixel",
    "So perspective với orthographic bằng công thức và số cụ thể",
    "Hoàn thiện ứng dụng wireframe CPU có input, clipping, debug và kiểm chứng độc lập",
  ],
  lessons: [
    {
      id: "p13-l01",
      slug: "01-tam-dinh-va-quy-uoc-index",
      title: "Từ một điểm đến tám đỉnh của cube",
      summary: "Đặt hai lớp bốn đỉnh trong local space, chạy bộ khung SDL và xem từng index.",
      order: 1,
      estimatedMinutes: 60,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l02",
      slug: "02-muoi-hai-canh-tu-edge-list",
      title: "Nối mười hai cạnh từ index",
      summary:
        "Tách vị trí khỏi quan hệ nối, cache phép chiếu và vẽ các đoạn đã clip bằng Bresenham.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l03",
      slug: "03-xoay-ca-khoi-lap-phuong",
      title: "Xoay hình dạng rồi mới đặt vào world",
      summary:
        "Dùng lại rotation trực tiếp của P12 trên tám local vertex; quan sát pivot và hai thứ tự.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l04",
      slug: "04-perspective-va-orthographic",
      title: "Hai phép chiếu cho cùng một cube",
      summary: "Suy công thức orthographic, so kích thước hai lớp Z và giữ cùng quy ước clipping.",
      order: 4,
      estimatedMinutes: 75,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l05",
      slug: "05-di-chuyen-keo-chuot-va-zoom",
      title: "Di chuyển, kéo chuột và zoom",
      summary:
        "Đọc keyboard state theo dt, giữ pointer owner và tách zoom phép chiếu khỏi đổi khoảng cách.",
      order: 5,
      estimatedMinutes: 90,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l06",
      slug: "06-depth-cue-va-che-do-demo",
      title: "Làm rõ chiều sâu, giữ bản demo sạch",
      summary:
        "Sắp cạnh theo Z, đổi độ sáng, thêm tự quay/pause/step và ẩn overlay mà không ẩn cube.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "wireframe-cube",
    },
    {
      id: "p13-l07",
      slug: "07-hoan-thien-va-kiem-chung",
      title: "Kiểm chứng và chạy ứng dụng hoàn chỉnh",
      summary: "Khóa đáp án tính tay, thử clipping/tương tác và build toàn bộ mã nguồn độc lập.",
      order: 7,
      estimatedMinutes: 70,
      demoId: "wireframe-cube",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
