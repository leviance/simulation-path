import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Từ ba control cố định của Project 65, tự tổ chức một cây UI được giữ qua nhiều frame. Panel sở hữu Button, Slider và Label; cùng dữ liệu điều khiển phép vẽ, hit-test, focus và việc xóa cả một nhánh an toàn.",
  duration: "11–15 giờ",
  prerequisites: [
    "Project 65 — Pause/Reset, slider, hot/active/focus và input theo logical space",
    "C++20 — struct, enum class, vector, tham chiếu; unique_ptr và std::move được giải thích trong bài 01",
    "Không cần HTML, CSS, ImGui hoặc kiến thức layout engine",
  ],
  objectives: [
    "Chạy cảnh bóng rơi trước, rồi tạo Panel, Label và Button bằng dữ liệu; parent sở hữu child và cây được dựng ngoài vòng lặp.",
    "Đưa hai button vào Panel con; dùng một phép duyệt để tính tọa độ world và vẽ từ parent tới child.",
    "Tính giao của các Rect tổ tiên và áp clip cho từng node; cùng một phép giao sẽ được dùng lại khi hit-test.",
    "Dùng cùng bounds/clip với phép vẽ, nhưng duyệt child theo thứ tự ngược để trả về một WidgetId.",
    "Giữ hot/active/focus bằng ID, nối action với Model và ánh xạ slider bằng tọa độ world của chính node đó.",
    "Sinh focus order từ các node đang hiển thị, giữ hover độc lập và chặn key repeat cho action của Button.",
    "Phân biệt ownership với visibility, dọn active/focus khi nhánh đổi và không dùng lại ID trong cùng phiên cây.",
    "Kiểm tọa độ, thứ tự vẽ/chọn, clipping, lifetime và giới hạn công việc bằng fixture độc lập ở Debug lẫn Release.",
  ],
  challenge: {
    timebox: "120–180 phút tự thử trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng bóng rơi có cây UI riêng. Root Panel chứa tiêu đề, một Panel con với Pause/Reset/Slider, và Label đọc giá trị từ Model. Cây phải sống qua nhiều frame, không được dựng lại trong mỗi lần vẽ.",
    outcome:
      "Dịch Panel làm mọi control con đi theo; phần bị clip không nhận chuột; có thể ẩn/xóa Group trong lúc đang kéo mà không crash hoặc nhấn nhầm một node mới.",
    requirements: [
      "C++20, CMake ≥3.24, SDL3 3.4.8; SDL_Renderer và Canvas 2D, không thư viện UI bên ngoài.",
      "Mặt phẳng logic 960×540. Mỗi node có WidgetId, Kind, Rect local, Action/Binding và children; chỉ Panel được sở hữu child.",
      "Parent sở hữu children bằng unique_ptr. Ui chỉ giữ ID; ID 0 là None, ID không tái sử dụng trong cùng một cây.",
      "Tính bounds bằng tổng offset ancestor; paint theo preorder, hit-test theo child ngược thứ tự vẽ và dùng cùng clip half-open.",
      "Label không nhận input; Panel và control disable chặn click xuống cảnh. Control disable không tạo action hoặc nhận focus.",
      "Pause/Reset/Slider sửa cùng Model; slider dùng bounds world, clamp 0..1200, nhận cả tọa độ cuối ở pointerup. Capture có owner và được nhả ở mọi đường thoát.",
      "Tab/Shift+Tab, Enter/Space không repeat action; arrow/Home/End cho Slider. Hover không chiếm focus.",
      "Ẩn/hiện, enable/disable, thêm Label và xóa Group; reconcile active/focus sau mutation, không giữ Widget* hoặc iterator qua erase.",
      "Reset cảnh giữ cây và ID. Dựng lại cây/preset tạm dừng, giữ y/v/gravity và xóa Ui trước khi mở phiên ID mới.",
      "Canvas theo checkpoint, có preset, pause/reset, bước tay, Inspector local/world/clip, DPR, keyboard và reduced-motion.",
    ],
    constraints: [
      "Tối đa 32 node, depth 6 (root ở depth 0), nextId tới 1,000,000; tối đa 4 Label thêm bằng control demo. Input sai bị từ chối trước mutation.",
      "Chỉ translation theo parent; chưa scale/rotation, scrolling, layout tự động, parser HTML/CSS, event bubbling hoặc scripting của Project 67–72.",
      "Action dùng enum cố định; đây chưa phải event binding tổng quát. Cây không lưu qua reload và không có backend.",
      "Native dùng SDL_RenderDebugText ASCII; Canvas có nhãn tiếng Việt và HTML tương đương. Không tuyên bố Canvas tự có accessibility tree.",
      "Model vật lý của Project 65 vẫn dùng logical px/s², fixedDt=1/120, tối đa 12 bước/frame; project này tập trung UI, không thêm solver vật lý.",
    ],
    definitionOfDone: [
      "Starter có window/renderer, bóng/sàn và Space/N/R; bài 01 chỉ thêm dữ liệu UI sau khi đã chạy nền.",
      "ID và builds giữ nguyên qua 1000 lần đọc/vẽ/cập nhật vật lý; Reset cảnh không dựng lại cây.",
      "Fixture world/local khớp, clip giao mọi ancestor; phần button đã bị cắt không hit hoặc nhận focus.",
      "Hai Button chồng nhau trả đúng node được vẽ cuối; Label không lấy input, panel trống/disable không để click xuống cảnh.",
      "Click đúng một action; release ngoài/khác nút, repeat, cancel, xóa/ẩn nhánh không kích hoạt nhầm.",
      "Xóa root bị từ chối; xóa nhánh hủy descendants; thêm node mới không tái dùng ID, add sai không làm đổi count/nextId.",
      "Build Debug/Release, CTest, hidden smoke có deadline; desktop QA được báo riêng.",
      "Tám lesson có code chi tiết và source hoàn chỉnh từng checkpoint; final/README/tests/ZIP và search/glossary đồng bộ.",
    ],
  },
  lessons: [
    {
      id: "p66-l01",
      slug: "01-widget-la-du-lieu",
      title: "Biến các hình vẽ thành widget có dữ liệu riêng",
      summary:
        "Chạy cảnh bóng rơi trước, rồi tạo Panel, Label và Button bằng dữ liệu; parent sở hữu child và cây được dựng ngoài vòng lặp.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "widget-tree",
    },
    {
      id: "p66-l02",
      slug: "02-panel-long-nhau",
      title: "Vẽ Panel lồng nhau mà không cộng tọa độ bằng tay",
      summary:
        "Đưa hai button vào Panel con; dùng một phép duyệt để tính tọa độ world và vẽ từ parent tới child.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "widget-tree",
    },
    {
      id: "p66-l03",
      slug: "03-cat-theo-khung-cha",
      title: "Không cho widget vẽ tràn khỏi Panel cha",
      summary:
        "Tính giao của các Rect tổ tiên và áp clip cho từng node; cùng một phép giao sẽ được dùng lại khi hit-test.",
      order: 3,
      estimatedMinutes: 80,
      demoId: "widget-tree",
    },
    {
      id: "p66-l04",
      slug: "04-chon-widget-tren-cung",
      title: "Tìm đúng widget đang nằm trên cùng",
      summary:
        "Dùng cùng bounds/clip với phép vẽ, nhưng duyệt child theo thứ tự ngược để trả về một WidgetId.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "widget-tree",
    },
    {
      id: "p66-l05",
      slug: "05-noi-input-voi-model",
      title: "Điều khiển mô phỏng qua ID thay vì qua tên từng nút",
      summary:
        "Giữ hot/active/focus bằng ID, nối action với Model và ánh xạ slider bằng tọa độ world của chính node đó.",
      order: 5,
      estimatedMinutes: 100,
      demoId: "widget-tree",
    },
    {
      id: "p66-l06",
      slug: "06-focus-theo-cay",
      title: "Cho bàn phím đi qua các control trong cây",
      summary:
        "Sinh focus order từ các node đang hiển thị, giữ hover độc lập và chặn key repeat cho action của Button.",
      order: 6,
      estimatedMinutes: 80,
      demoId: "widget-tree",
    },
    {
      id: "p66-l07",
      slug: "07-an-xoa-va-vong-doi",
      title: "Ẩn hoặc xóa một nhánh mà không để lại ID treo",
      summary:
        "Phân biệt ownership với visibility, dọn active/focus khi nhánh đổi và không dùng lại ID trong cùng phiên cây.",
      order: 7,
      estimatedMinutes: 100,
      demoId: "widget-tree",
    },
    {
      id: "p66-l08",
      slug: "08-kiem-chung-va-hoan-thien",
      title: "Kiểm chứng cây UI và chạy toàn bộ dự án",
      summary:
        "Kiểm tọa độ, thứ tự vẽ/chọn, clipping, lifetime và giới hạn công việc bằng fixture độc lập ở Debug lẫn Release.",
      order: 8,
      estimatedMinutes: 90,
      demoId: "widget-tree",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
