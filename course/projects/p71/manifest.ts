import type { PublishedProjectEditorial } from "../../types";

const data = {
  summary:
    "Nối widget do TinyHTML, TinyCSS và TinyFlex tạo ra với năm thao tác thật của đàn Boids. Quan sát đường đi của click, thử kéo slider ra khỏi bảng và đổi bố cục khi tay còn giữ chuột.",
  duration: "7–9 giờ",
  prerequisites: [
    "Project 68–70: markup, computed style và bố cục thực.",
    "Hiểu ID, focus, capture và std::function trong C++.",
  ],
  objectives: [
    "Tra element bằng ID, đăng ký callback theo loại event.",
    "Tự xây đường truyền target → parent và chính sách handled/stop.",
    "Một owner cho mỗi gesture; chuột và bàn phím tác động cùng một model.",
    "Thay tài liệu, style và registry đúng vòng đời.",
  ],
  challenge: {
    timebox: "100–160 phút tự thử",
    mission:
      "Bảng gồm Pause/Resume, Reset, checkbox hàng xóm và hai slider. Cho một nhóm cha ghi nhận click nhưng đừng dừng đàn hai lần.",
    outcome:
      "Tách được đường event trong cây khỏi cập nhật solver. Người dùng đổi thứ tự HTML rồi làm tiếp công việc ở bố cục mới.",
    requirements: [
      "Năm thao tác dùng ID, không dùng thứ tự child hoặc tọa độ cố định.",
      "Có Click, Input, Change; phân biệt target/current, dừng truyền có chủ đích.",
      "Pointer capture, Tab/Shift+Tab, release ngoài nút, lost focus và đổi width.",
      "Reload lại bindings; file thiếu một control bắt buộc không làm mất phiên hợp lệ.",
    ],
    constraints: [
      "Không dùng ImGui/WebView; callbacks C++ thay model, chưa dùng script.",
      "Scene không nhận cùng thao tác mà UI đã giữ. Không lưu Widget* trong registry qua reload.",
    ],
    definitionOfDone: [
      "Một Click chỉ gửi một action dù đi qua hai ancestor.",
      "Hai file HTML cho thứ tự khác nhau; các control, nhãn và focus vẫn dùng đúng.",
      "Có fixture cho stop, owner, orphan release, reload sai/success và state của đàn.",
      "Có desktop tool, trace tắt được, năm checkpoint, assets và ZIP.",
    ],
  },
  lessons: [
    {
      id: "p71-l01",
      slug: "01-tu-id-den-ham-cpp",
      title: "Nút Pause tìm thấy hàm C++ bằng cách nào?",
      summary: "Nối tên trong HTML với model, không nối bằng tọa độ hay thứ tự child.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "event-bindings",
    },
    {
      id: "p71-l02",
      slug: "02-mot-click-di-qua-cay",
      title: "Một cú click đi qua ba node nhưng chỉ dừng đàn một lần",
      summary: "Phân biệt target với currentTarget, handled với stop.",
      order: 2,
      estimatedMinutes: 75,
      demoId: "event-bindings",
    },
    {
      id: "p71-l03",
      slug: "03-chu-so-huu-cua-cu-keo",
      title: "Kéo Radius ra ngoài bảng mà không chọn nhầm chim",
      summary: "Đổi từ vị trí con trỏ sang bản tin input và chốt thay đổi khi thả.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "event-bindings",
    },
    {
      id: "p71-l04",
      slug: "04-dung-ban-phim",
      title: "Đưa bàn phím vào cùng đường gọi với chuột",
      summary: "Bàn phím đổi focus hoặc phát event, không viết lại năm lệnh của model.",
      order: 4,
      estimatedMinutes: 60,
      demoId: "event-bindings",
    },
    {
      id: "p71-l05",
      slug: "05-thay-giao-dien-khi-dang-keo",
      title: "Đổi cả bảng giữa một lần kéo",
      summary: "Nạp đồng bộ cây, CSS, bố cục và callback; chạy kiểm hồi quy bằng state thật.",
      order: 5,
      estimatedMinutes: 80,
      demoId: "event-bindings",
    },
  ],
} satisfies PublishedProjectEditorial;

export default data;
