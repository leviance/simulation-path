import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: ["Project 01 — framebuffer và putPixel", "Project 02 — keyboard/input state"],
  summary:
    "Tự xây Mini Paint trên framebuffer: nhận chuột đúng tọa độ, tô đầu bút tròn, đo nét đứt rồi dùng nội suy để nối nét.",
  challenge: {
    timebox: "120–180 phút tự thử trước khi đọc hướng dẫn",
    mission:
      "Dùng framebuffer đã học để xây một ứng dụng vẽ bằng chuột. Click tạo dấu, giữ chuột trái để vẽ nhiều nét độc lập; kéo nhanh vẫn tạo nét liền. Tự viết đầu bút tròn và nội suy, không giao hai phần này cho thư viện vẽ.",
    outcome:
      "Ứng dụng C++ có vùng vẽ lớn, bốn màu, bán kính 2–64, lệnh xóa và một mẫu thử lặp lại được. Resize giữ nguyên tranh và tỉ lệ; vị trí bút khớp con trỏ cả khi cửa sổ đổi kích thước.",
    requirements: [
      "Giữ tranh trong framebuffer 960×540; không xóa ảnh CPU ở đầu mỗi frame.",
      "Nhấn trái đặt dấu ngay, motion chỉ vẽ trong nét đang mở, thả chuột xử lý cả endpoint cuối.",
      "Tự tô pixel của đầu bút bằng dx² + dy² ≤ radius² và kiểm biên trước mọi lần ghi.",
      "Đổi event từ window coordinates sang render coordinates trước khi dùng; không nhầm HiDPI/letterbox với tọa độ ảnh.",
      "Có đối chứng chưa nội suy: S lấy thưa 1/1, 1/2, 1/4, 1/8 ở checkpoint 3–4; D vẽ cùng một bộ mẫu.",
      "Tính số khoảng bằng ceil(distance / spacing), spacing = 0,8 × radius; giữ hai đầu và xử lý đoạn bằng 0.",
      "1–4 chọn màu, [/] đổi bán kính, C xóa dữ liệu ảnh thật; đổi công cụ hoặc clear kết thúc nét đang mở.",
      "Ra ngoài vùng ảnh, mất focus, resize hoặc mất nút trái đều kết thúc nét; trở lại không tự nối với nét trước.",
    ],
    constraints: [
      "SDL chỉ xử lý cửa sổ, sự kiện và hiển thị texture; tự rasterize đầu bút và nội suy.",
      "Nội suy không khôi phục được đường cong đã mất giữa hai mẫu; không quảng cáo nó như cách tăng độ chính xác của chuột.",
      "Không bỏ kiểm biên hoặc làm thưa điểm âm thầm khi đầu vào vượt giới hạn; helper từ chối đoạn quá 2.048 pixel.",
      "Canvas chỉ minh họa; sản phẩm cuối phải là Mini Paint C++/SDL3 chạy độc lập.",
    ],
    definitionOfDone: [
      "Click đơn để lại dấu; nhiều nét không bị nối; vị trí thả chuột cuối được xử lý dù chưa có motion ở đó.",
      "Cùng mẫu D, checkpoint 3 thấy dấu rời còn checkpoint 4/final tạo nét liền; khoảng tâm nội suy không vượt spacing trước khi quy về pixel.",
      "Brush bán kính 2 tô 13 pixel ở giữa ảnh, 6 pixel tại góc; không ghi ngoài framebuffer.",
      "Resize không mất tranh hoặc lệch bút; các phím màu/bán kính/clear và capture được thử riêng trên desktop.",
      "CTest chạy ở Debug và Release; nêu riêng giới hạn kiểm thử thuần, SDL smoke và thao tác người dùng.",
    ],
  },
  duration: "5–6 giờ",
  objectives: [
    "Đi từ sự kiện chuột đến một nét vẽ có điểm đầu và điểm cuối",
    "Tự tô đầu bút tròn bằng pixel",
    "Đo dữ liệu lấy mẫu rồi nối bằng nội suy có giới hạn",
    "Kiểm cả hình học, ảnh raster và trạng thái thao tác",
  ],
  lessons: [
    {
      id: "p03-l01",
      slug: "01-mouse-input",
      title: "Từ cú click đến một nét vẽ",
      summary:
        "Dùng lại framebuffer, đổi tọa độ chuột và quản lý nhấn–kéo–thả trước khi thêm đầu bút tròn.",
      order: 1,
      estimatedMinutes: 60,
    },
    {
      id: "p03-l02",
      slug: "02-brush-tron",
      title: "Tự tô đầu bút tròn",
      summary:
        "Từ công thức khoảng cách đến 13 pixel của đầu bút bán kính 2, rồi cắt an toàn ở mép.",
      order: 2,
      estimatedMinutes: 45,
      demoId: "stroke",
    },
    {
      id: "p03-l03",
      slug: "03-net-ve-bi-dut",
      title: "Đo nguyên nhân nét bị đứt",
      summary: "Lấy mẫu thưa có chủ ý, đo khoảng cách và dùng cùng một nét D để so sánh.",
      order: 3,
      estimatedMinutes: 45,
      demoId: "stroke",
    },
    {
      id: "p03-l04",
      slug: "04-stroke-interpolation",
      title: "Nối mẫu thành nét liền",
      summary: "Dựng lerp, chọn đủ số bước và dùng lại đúng vòng đời nét vẽ.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "stroke",
    },
    {
      id: "p03-l05",
      slug: "05-brush-controls",
      title: "Hoàn thiện công cụ vẽ",
      summary: "Bốn màu, bán kính, clear và cách tránh nối nhầm khi đổi công cụ.",
      order: 5,
      estimatedMinutes: 35,
    },
    {
      id: "p03-l06",
      slug: "06-validation",
      title: "Kiểm chứng Mini Paint",
      summary: "Test điểm nội suy, pixel, endpoint, nhiều nét và công cụ; build bản đầy đủ.",
      order: 6,
      estimatedMinutes: 45,
      demoId: "stroke",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
