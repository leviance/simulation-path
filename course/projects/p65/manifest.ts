import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Tự viết bảng điều khiển SDL3 cho một cảnh bóng rơi: Pause, Reset và slider trọng lực. Đi từ hình chữ nhật nhìn thấy được đến hit-test, press/release, kéo chuột, focus bàn phím và xử lý resize; chưa cần một thư viện UI.",
  duration: "9–12 giờ",
  prerequisites: [
    "Project 01–05 — window/renderer, event loop, delta time và các hệ tọa độ",
    "Project 22–24 — vận tốc, gia tốc và va chạm cơ bản; không cần chép source voxel",
    "C++20 — struct, enum class, hàm và tham chiếu; ZIP tự build độc lập",
  ],
  objectives: [
    "Mở cửa sổ SDL3, vẽ bóng và sàn, rồi theo dõi vị trí qua từng bước 1/120 giây.",
    "Dùng cùng một Rect để vẽ và hit-test; chừa vùng cảnh riêng, đọc tọa độ và tô trạng thái hover.",
    "Phân biệt nhấn với click hoàn tất, giữ active khi kéo ra ngoài và nối action với đồng hồ mô phỏng.",
    "Đổi vị trí chuột thành giá trị, clamp hai đầu và điều chỉnh gravity ngay cả khi đang Pause.",
    "Thêm focus, Tab/Shift+Tab, kích hoạt nút không repeat và chỉnh slider bằng arrow/Home/End.",
    "Đưa sự kiện về hệ tọa độ logic, cho UI nhận trước cảnh và hủy thao tác khi vòng đời cửa sổ thay đổi.",
    "Kiểm chuỗi thao tác thay vì chỉ nhìn ảnh, đối chiếu vật lý bằng công thức và nghiệm thu Debug/Release có timeout.",
  ],
  challenge: {
    timebox: "90–150 phút tự thử trước khi đọc lời giải",
    mission:
      "Tự xây dựng một mô phỏng 2D có quả bóng rơi và nảy trên sàn. Bên phải cảnh là bảng điều khiển do chính bạn vẽ: Pause/Resume, Reset và slider chỉnh trọng lực trong lúc chương trình đang chạy.",
    outcome:
      "Một cửa sổ SDL3 có thể điều khiển hoàn toàn bằng chuột hoặc bàn phím. Kéo slider ra khỏi panel không làm mất thao tác; bấm UI không vô tình di chuyển bóng trong cảnh.",
    requirements: [
      "C++20, CMake ≥3.24 và SDL3 3.4.8; dùng SDL_Renderer, không ImGui/HTML nhúng hoặc thư viện UI ngoài.",
      "Mặt phẳng logic 960×540: cảnh bên trái, panel bên phải. Cùng Rect được dùng cho vẽ và hit-test, cạnh phải/dưới loại trừ.",
      "Mô phỏng bắt đầu Pause; fixedDt=1/120 s, gravity mặc định 480 và miền 0..1200 logical px/s². Mỗi frame nhận tối đa 0.1 s và chạy tối đa 12 bước.",
      "Pause dừng vật lý nhưng không dừng event/render. Reset đưa y=90, v=0, ticks=0, xóa accumulator nhưng giữ gravity và Pause.",
      "Nút chỉ kích hoạt khi nhấn rồi thả trên cùng nút. Thả bên ngoài, Esc hoặc mất focus hủy thao tác; không kích hoạt chỉ vì hover.",
      "Slider cập nhật liên tục khi giữ chuột, kể cả ngoài panel; giá trị được clamp. Capture chỉ giữ trong một gesture và được giải phóng ở mọi đường thoát.",
      "Tab/Shift+Tab đổi focus; Enter/Space kích hoạt button một lần, arrow chỉnh gravity từng 20, Home/End về 0/1200. UI xử lý input trước cảnh.",
      "Resize giữ bố cục logic bằng letterbox; chuyển tọa độ event trước hit-test. Blur/minimize/resize hủy kéo và tạm dừng, không tự chạy lại.",
      "Canvas có control HTML tương đương, bước thủ công, preset, DPR, pointer capture/cancel, reduced-motion và phần mô tả văn bản.",
      "ZIP gồm README, starter, bảy checkpoint chạy độc lập, final và CTest không cần window; cuối mỗi bài có mã đầy đủ.",
    ],
    constraints: [
      "Project này chỉ có ba control cố định; cây widget, layout tự động và đọc HTML/CSS dành cho Project 66 trở đi.",
      "Gravity dùng logical pixel/s², không phải m/s². Bóng chỉ chuyển động theo Y; va chạm sàn/trần có damping, không phải bộ giải vật lý tổng quát.",
      "SDL_RenderDebugText chỉ dùng nhãn ASCII để tránh thêm font dependency; chưa typography tiếng Việt trong native.",
      "Native Tab đi vòng ba control. Canvas cho Tab thoát ở hai đầu và có control HTML dành cho trình đọc màn hình; vẽ Canvas không tự tạo accessibility tree.",
      "Canvas mặc định theo checkpoint của bài; có tùy chọn xem bản hoàn chỉnh và đổi chế độ sẽ reset. Không lưu tham số hoặc trạng thái mô phỏng qua reload.",
      "Thời gian bị bỏ khi frame quá dài hoặc resume không được chạy bù. UI vẫn phản hồi khi Pause; step thủ công mới tiến thêm đúng một fixedDt.",
    ],
    definitionOfDone: [
      "Bảy bài bám một chương trình từ cửa sổ có bóng đến UI hoàn chỉnh; không xuất hiện API mới mà thiếu cảnh chạy thử và giải thích.",
      "Nút không toggle mỗi frame đang giữ, không nhận release mồ côi hoặc release trên nút khác; Reset giữ đúng tham số đã chọn.",
      "Slider đúng tại đầu/giữa/cuối, clamp khi kéo xa và không sửa gravity bằng NaN/Infinity; hover không giành focus.",
      "Bàn phím có focus nhìn thấy, Shift+Tab đúng thứ tự; repeat không nhấn nút liên tục, arrow vẫn repeat được.",
      "Bấm panel, cả khoảng trống, không lọt xuống cảnh; active không bị con trỏ thứ hai hoặc hover control khác lấy mất.",
      "Resize/letterbox/DPR không làm lệch hit-test. Cancel/blur/ẩn tab/unmount giải phóng capture, pause không tích lũy thời gian chờ.",
      "Test pure kiểm độc lập free-flight y/v, clock partition, chuỗi input và state audit trong cả Debug và Release; build và smoke đều có deadline.",
      "Website, source cuối bài, search, glossary và ZIP đồng bộ. Các project chưa phát hành vẫn ghi Sắp ra mắt; desktop QA báo riêng.",
    ],
  },
  lessons: [
    {
      id: "p65-l01",
      slug: "01-chay-canh-mo-phong",
      title: "Chạy cảnh mô phỏng trước khi thêm UI",
      summary: "Mở cửa sổ SDL3, vẽ bóng và sàn, rồi theo dõi vị trí qua từng bước 1/120 giây.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l02",
      slug: "02-ve-panel-va-hit-test",
      title: "Vẽ panel và tìm control dưới con trỏ",
      summary:
        "Dùng cùng một Rect để vẽ và hit-test; chừa vùng cảnh riêng, đọc tọa độ và tô trạng thái hover.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l03",
      slug: "03-nut-pause-reset",
      title: "Làm nút Pause và Reset hoạt động đúng",
      summary:
        "Phân biệt nhấn với click hoàn tất, giữ active khi kéo ra ngoài và nối action với đồng hồ mô phỏng.",
      order: 3,
      estimatedMinutes: 85,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l04",
      slug: "04-slider-trong-luc",
      title: "Kéo slider để thay đổi trọng lực",
      summary:
        "Đổi vị trí chuột thành giá trị, clamp hai đầu và điều chỉnh gravity ngay cả khi đang Pause.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l05",
      slug: "05-dieu-khien-bang-ban-phim",
      title: "Điều khiển toàn bộ panel bằng bàn phím",
      summary:
        "Thêm focus, Tab/Shift+Tab, kích hoạt nút không repeat và chỉnh slider bằng arrow/Home/End.",
      order: 5,
      estimatedMinutes: 80,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l06",
      slug: "06-resize-va-dieu-phoi-input",
      title: "Giữ input đúng khi resize và mất focus",
      summary:
        "Đưa sự kiện về hệ tọa độ logic, cho UI nhận trước cảnh và hủy thao tác khi vòng đời cửa sổ thay đổi.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l07",
      slug: "07-kiem-chung-va-hoan-thien",
      title: "Kiểm chứng bảng điều khiển và chạy bản hoàn chỉnh",
      summary:
        "Kiểm chuỗi thao tác thay vì chỉ nhìn ảnh, đối chiếu vật lý bằng công thức và nghiệm thu Debug/Release có timeout.",
      order: 7,
      estimatedMinutes: 85,
      demoId: "simulator-controls",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
