import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — window, texture, framebuffer và putPixel",
    "Project 03 — mouse input và kết thúc thao tác kéo",
    "Project 04 — tự vẽ primitive trên ảnh CPU",
  ],
  summary:
    "Tự xây một mặt phẳng tọa độ kiểu Mini GeoGebra: đặt và kéo nhiều điểm, pan camera, zoom quanh con trỏ và đọc tọa độ world.",
  duration: "5–6 giờ",
  objectives: [
    "Tự vẽ hai trục và điểm từ một bộ khung chạy được",
    "Viết Camera2D và hai phép đổi World ↔ Screen",
    "Sinh lưới động có nhãn theo vùng nhìn và mức zoom",
    "Tách thao tác pan khỏi đặt/chọn/kéo điểm",
    "Kiểm chứng round trip, zoom anchor và resize bằng tests",
  ],
  challenge: {
    timebox: "150–210 phút",
    mission:
      "Tự xây dựng một mặt phẳng tọa độ 2D tương tác: người dùng đặt nhiều điểm, kéo từng điểm, kéo góc nhìn và zoom bằng con lăn.",
    outcome:
      "Mở ứng dụng là thấy trục X/Y, lưới có nhãn và điểm (2,1). Các điểm giữ nguyên tọa độ world khi camera đổi hoặc window resize; con trỏ cho biết mình đang nằm ở đâu trong cả hai hệ.",
    requirements: [
      "Chạy được starter SDL3 trước khi thêm camera; tự ghi grid, trục và điểm vào framebuffer CPU.",
      "Lưu điểm bằng world coordinate với X sang phải, Y hướng lên; screen có Y hướng xuống.",
      "Camera2D giữ centerWorld, pixelsPerUnit và viewportPixels; dùng chung worldToScreen/screenToWorld cho vẽ và input.",
      "Lưới theo world space, bước 1–2–5 × 10^n để không quá dày/thưa; trục X/Y có màu và nhãn rõ.",
      "Kéo chuột phải để pan; con lăn phóng/thu quanh vị trí con trỏ trong khoảng 5–800 px/unit.",
      "Click trái vùng trống để đặt điểm; click gần điểm để chọn và kéo, không làm điểm nhảy vào tâm con trỏ.",
      "Giữ tối đa 256 điểm; bán kính hit-test 10 screen pixel không thay đổi theo zoom.",
      "Hiển thị tọa độ con trỏ và nhãn điểm; Delete xóa điểm đã chọn, R chỉ đặt lại camera.",
      "Kết thúc drag khi thả nút, mất focus, resize, pause hoặc đổi camera; không để pan và kéo điểm chạy đồng thời.",
      "Resize thay viewport và framebuffer, không đổi world position; chạy đúng khi màn hình có pixel density cao.",
    ],
    constraints: [
      "SDL3 chỉ mở window, nhận input và trình bày texture; Camera2D, grid và primitive do bạn tự viết.",
      "Không scale ảnh grid cũ để giả zoom; dựng lại ảnh từ camera và các điểm world.",
      "Math/tests không phụ thuộc SDL. Bản cuối có executable thật, CTest và README điều khiển.",
    ],
    definitionOfDone: [
      "Round trip khôi phục điểm và zoom giữ world anchor với sai số dưới 1e-9 trong miền kiểm thử.",
      "Pan 55 px ở 55 px/unit làm cảnh dịch đúng 55 px theo tay.",
      "Sau pan/zoom/resize, các điểm không đổi world coordinate; drag giữ đúng grab offset.",
      "Chọn điểm ở biên bán kính 10 px, thả ngoài window và chuyển ứng dụng không để trạng thái kéo bị kẹt.",
      "Build starter, bảy checkpoint và final; CTest vẫn kiểm tra thật trong Debug/Release.",
    ],
  },
  lessons: [
    {
      id: "p05-l01",
      slug: "01-hai-he-toa-do",
      title: "Vẽ hai trục và đặt điểm đầu tiên",
      summary: "Chạy bộ khung, chọn đơn vị rồi tự đưa điểm (2,1) lên màn hình.",
      order: 1,
      estimatedMinutes: 45,
      demoId: "coordinate",
    },
    {
      id: "p05-l02",
      slug: "02-world-to-screen",
      title: "Đưa tọa độ world lên màn hình",
      summary: "Gom phép đổi tọa độ vào Camera2D, thử camera lệch tâm và đổi tỉ lệ.",
      order: 2,
      estimatedMinutes: 40,
    },
    {
      id: "p05-l03",
      slug: "03-screen-to-world",
      title: "Đọc tọa độ dưới con trỏ",
      summary: "Đảo ngược phép chiếu và dùng vị trí chuột đã đổi về đúng hệ của renderer.",
      order: 3,
      estimatedMinutes: 40,
      demoId: "coordinate",
    },
    {
      id: "p05-l04",
      slug: "04-grid-va-pan",
      title: "Lưới động và kéo camera",
      summary: "Sinh lưới 1–2–5 theo vùng nhìn, rồi kéo cảnh bằng chuột phải.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "coordinate",
    },
    {
      id: "p05-l05",
      slug: "05-zoom-quanh-cursor",
      title: "Phóng to mà điểm dưới chuột không trôi",
      summary: "Đo tọa độ trước/sau zoom, bù camera và xử lý wheel đúng chiều.",
      order: 5,
      estimatedMinutes: 45,
      demoId: "coordinate",
    },
    {
      id: "p05-l06",
      slug: "06-dat-va-keo-diem",
      title: "Đặt, chọn và kéo nhiều điểm",
      summary: "Hit-test bằng pixel, giữ độ lệch khi nắm điểm và tách kéo điểm khỏi pan.",
      order: 6,
      estimatedMinutes: 60,
      demoId: "coordinate",
    },
    {
      id: "p05-l07",
      slug: "07-round-trip-test",
      title: "Kiểm chứng và chạy bản hoàn chỉnh",
      summary: "Kiểm tra hình học, tương tác, resize và build toàn bộ ứng dụng.",
      order: 7,
      estimatedMinutes: 40,
      demoId: "coordinate",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
