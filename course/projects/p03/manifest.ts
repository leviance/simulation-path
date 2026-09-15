import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: ["Project 01 — framebuffer và putPixel", "Project 02 — keyboard/input state"],
  summary:
    "Biến framebuffer thành một bảng vẽ bằng chuột và dùng nội suy để nét luôn liền khi kéo nhanh.",
  challenge: {
    timebox: "120–150 phút",
    mission:
      "Biến framebuffer thành một bảng vẽ bằng chuột. Nét phải liền ngay cả khi SDL gửi các vị trí chuột thưa hoặc người dùng rê chuột rất nhanh.",
    outcome:
      "Mini Paint có đầu bút tròn, hai màu, thay đổi được bán kính và có lệnh xóa bảng vẽ. Các điểm nội suy giữ khoảng cách đủ nhỏ để nét không xuất hiện lỗ hổng.",
    requirements: [
      "Theo dõi nút chuột trái, vị trí hiện tại và vị trí đã xử lý gần nhất.",
      "Tự rasterize một hình tròn đặc bằng điều kiện dx² + dy² ≤ radius².",
      "Đặt dấu ngay khi nhấn chuột để một cú click không kéo vẫn vẽ được một điểm.",
      "Giữ một checkpoint cố ý chỉ vẽ tại những vị trí chuột SDL cung cấp để quan sát nguyên nhân nét bị đứt.",
      "Nội suy đoạn từ `previous` đến `current` sao cho khoảng cách giữa hai lần đặt đầu bút không vượt quá `0,8 × radius`.",
      "Thêm phím đổi màu, tăng hoặc giảm bán kính trong khoảng an toàn và xóa bảng vẽ.",
      "Dùng kiểm tra biên trong `putPixel` để đầu bút sát bốn cạnh không ghi ra ngoài framebuffer.",
      "Capture chuột trong lúc kéo; kết thúc nét khi thả nút hoặc khi cửa sổ mất focus để không nối nhầm với nét cũ.",
    ],
    constraints: [
      "Không dùng SDL_RenderCircle hoặc thư viện đồ họa vector.",
      "Phép nội suy phải xử lý được đoạn có độ dài bằng 0.",
      "Không nối nét mới với điểm cuối của nét trước.",
    ],
    definitionOfDone: [
      "Điểm đầu và điểm cuối của mỗi đoạn đều có trong kết quả nội suy.",
      "Khoảng cách giữa hai lần đặt đầu bút liên tiếp không vượt ngưỡng đã chọn.",
      "Rê nhanh theo đường chéo không tạo lỗ hổng lớn hơn đường kính đầu bút.",
      "Vẽ sát bốn cạnh không làm chương trình dừng đột ngột hoặc ghi ngoài framebuffer.",
    ],
  },
  duration: "3–4 giờ",
  objectives: [
    "Theo dõi một nét vẽ qua các sự kiện chuột",
    "Rasterize đầu bút hình tròn",
    "Nội suy giữa các mẫu chuột thưa",
  ],
  lessons: [
    {
      id: "p03-l01",
      slug: "01-mouse-input",
      title: "Theo dõi chuột và nét vẽ",
      summary: "Bắt đầu, tiếp tục và kết thúc một nét vẽ bằng các sự kiện chuột.",
      order: 1,
      estimatedMinutes: 50,
    },
    {
      id: "p03-l02",
      slug: "02-brush-tron",
      title: "Vẽ đầu bút hình tròn",
      summary: "Dùng công thức khoảng cách để tô một hình tròn đặc trực tiếp vào framebuffer.",
      order: 2,
      estimatedMinutes: 35,
    },
    {
      id: "p03-l03",
      slug: "03-net-ve-bi-dut",
      title: "Vì sao nét vẽ bị đứt?",
      summary: "Quan sát khoảng cách giữa những vị trí chuột mà chương trình nhận được.",
      order: 3,
      estimatedMinutes: 25,
      demoId: "stroke",
    },
    {
      id: "p03-l04",
      slug: "04-stroke-interpolation",
      title: "Nối các mẫu thành nét liền",
      summary: "Chèn thêm điểm để lấp khoảng trống giữa hai vị trí chuột liên tiếp.",
      order: 4,
      estimatedMinutes: 40,
    },
    {
      id: "p03-l05",
      slug: "05-brush-controls",
      title: "Thêm màu, kích thước và lệnh xóa",
      summary: "Thêm những thao tác điều khiển cần thiết cho Mini Paint.",
      order: 5,
      estimatedMinutes: 30,
    },
    {
      id: "p03-l06",
      slug: "06-validation",
      title: "Kiểm chứng nét vẽ",
      summary: "Đo khoảng hở, kiểm tra biên và chạy bản hoàn chỉnh.",
      order: 6,
      estimatedMinutes: 30,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
