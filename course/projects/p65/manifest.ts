import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Tự vẽ bảng điều khiển cho đàn Boids của Project 28. Dừng một con chim để xem nó tìm thấy ai, đổi bán kính quan sát, rồi tăng lực tách và cho đàn bay tiếp.",
  duration: "7–10 giờ",
  prerequisites: [
    "Đã biết tạo window, renderer và đọc sự kiện SDL3 (Project 01–05).",
    "Nhận ra ba quy tắc của Boids và truy vấn lưới ở Project 28. ZIP đã chứa phần này; không cần cài hai project cạnh nhau.",
  ],
  objectives: [
    "Chia cùng cửa sổ thành vùng quan sát đàn và vùng điều khiển.",
    "Phân biệt hover, capture và focus; ánh xạ chuột và bàn phím vào cùng một model.",
    "Đối chiếu tập hàng xóm bằng vét cạn và kiểm tác dụng thật của từng control.",
  ],
  challenge: {
    timebox: "60–90 phút tự thử trước khi đọc hướng dẫn",
    mission:
      "Dừng đàn chim giữa đường bay, chọn một con và mở rộng vòng tìm hàng xóm quanh nó. Hãy tự xây bàn quan sát này bằng SDL3 trước khi xem lời giải.",
    outcome:
      "Chim được chọn màu vàng, hàng xóm màu xanh. Pause dừng thời gian chứ không khóa bảng; cả cửa sổ vẫn dùng được khi không có chuột.",
    requirements: [
      "Có Pause/Resume, Reset, checkbox bật quan sát, slider bán kính 20–140 px và slider Separation 0–5.",
      "Click chọn chim trong viewport; hiển thị ID, số hàng xóm và tick. Reset về cùng seed và preset.",
      "Khi Pause, Radius đổi vòng và danh sách ngay; Separation chỉ làm quỹ đạo thay đổi sau khi tiến thời gian.",
    ],
    constraints: [
      "C++20, CMake 3.24+, SDL3 3.4.8; không ImGui, WebView hay framework UI. Chưa cần widget tree, HTML hoặc CSS.",
      "Dùng nguyên spatial grid, khoảng cách tuần hoàn và bước 1/60 s của P28. Không yêu cầu chạy lại benchmark 10.000 cá thể ở phần UI.",
      "Chuột rời khỏi slider vẫn kéo được; mất focus phải nhả capture. Khoảng trống trong panel không nhận thay cho viewport.",
    ],
    definitionOfDone: [
      "So đúng tập hàng xóm của con đang theo dõi ở ba bán kính với vòng duyệt vét cạn.",
      "Reset lặp lại đúng đàn ban đầu; checkbox chỉ đổi cách vẽ. Tab và Shift+Tab đi qua đủ năm control.",
      "Thử click hụt, kéo nhanh ra ngoài, đổi kích thước, mất focus rồi quay lại. Chạy tests trong cả Debug và Release.",
    ],
  },
  lessons: [
    {
      id: "p65-l01",
      slug: "01-chay-canh-mo-phong",
      title: "Cho đàn chim bay trước khi lắp bảng điều khiển",
      summary:
        "Mở lại đàn chim của Project 28 và cho nó tiến đúng một bước, độc lập với tốc độ vẽ.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l02",
      slug: "02-ve-panel-va-hit-test",
      title: "Tô sáng đúng nút dưới con trỏ",
      summary: "Vẽ bảng bên cạnh đàn chim và dùng chung một hình chữ nhật cho cả vẽ lẫn bắt chuột.",
      order: 2,
      estimatedMinutes: 55,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l03",
      slug: "03-nut-pause-reset",
      title: "Một lần thả chuột, một lệnh cho đàn chim",
      summary:
        "Nối Pause, Reset và checkbox quan sát; phân biệt nhấn nhầm với một lần click hoàn tất.",
      order: 3,
      estimatedMinutes: 70,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l04",
      slug: "04-ban-kinh-va-luc-tach",
      title: "Hai thanh trượt: chim thấy ai và tránh nhau mạnh đến đâu?",
      summary:
        "Đổi bán kính để thay tập hàng xóm ngay khi Pause; đổi lực tách để so quỹ đạo sau khi chạy.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l05",
      slug: "05-dieu-khien-bang-ban-phim",
      title: "Rời chuột mà vẫn điều khiển được toàn bộ bảng",
      summary:
        "Đi qua năm control bằng Tab và phân biệt phím lặp có ích cho slider với phím lặp gây click đúp.",
      order: 5,
      estimatedMinutes: 55,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l06",
      slug: "06-resize-va-dieu-phoi-input",
      title: "Click chọn chim sau khi thay đổi kích thước cửa sổ",
      summary:
        "Quy đổi tọa độ đúng một lần, chọn chim trong viewport và nhả capture khi cửa sổ mất focus.",
      order: 6,
      estimatedMinutes: 75,
      demoId: "simulator-controls",
    },
    {
      id: "p65-l07",
      slug: "07-kiem-chung-va-hoan-thien",
      title: "Nghiệm thu bàn quan sát bằng một đàn biết trước đáp án",
      summary:
        "So hàng xóm với vét cạn, kiểm chuỗi thao tác và chạy toàn bộ ứng dụng độc lập từ ZIP.",
      order: 7,
      estimatedMinutes: 55,
      demoId: "simulator-controls",
    },
  ],
  lessonAliases: {
    "04-slider-trong-luc": "04-ban-kinh-va-luc-tach",
  },
} satisfies PublishedProjectEditorial;
export default data;
