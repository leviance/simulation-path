import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "BÀN QUAN SÁT ĐÀN CHIM",
    title: "Bàn quan sát đàn chim",
    description:
      "Tự vẽ bảng điều khiển cho đàn Boids của Project 28. Dừng một con chim để xem nó tìm thấy ai, đổi bán kính quan sát, rồi tăng lực tách và cho đàn bay tiếp.",
  },
  modes: {
    "controls65-1": {
      title: "Cho đàn chim bay trước khi lắp bảng điều khiển",
      description:
        "Mở lại đàn chim của Project 28 và cho nó tiến đúng một bước, độc lập với tốc độ vẽ.",
    },
    "controls65-2": {
      title: "Tô sáng đúng nút dưới con trỏ",
      description:
        "Vẽ bảng bên cạnh đàn chim và dùng chung một hình chữ nhật cho cả vẽ lẫn bắt chuột.",
    },
    "controls65-3": {
      title: "Một lần thả chuột, một lệnh cho đàn chim",
      description:
        "Nối Pause, Reset và checkbox quan sát; phân biệt nhấn nhầm với một lần click hoàn tất.",
    },
    "controls65-4": {
      title: "Hai thanh trượt: chim thấy ai và tránh nhau mạnh đến đâu?",
      description:
        "Đổi bán kính để thay tập hàng xóm ngay khi Pause; đổi lực tách để so quỹ đạo sau khi chạy.",
    },
    "controls65-5": {
      title: "Rời chuột mà vẫn điều khiển được toàn bộ bảng",
      description:
        "Đi qua năm control bằng Tab và phân biệt phím lặp có ích cho slider với phím lặp gây click đúp.",
    },
    "controls65-6": {
      title: "Click chọn chim sau khi thay đổi kích thước cửa sổ",
      description:
        "Quy đổi tọa độ đúng một lần, chọn chim trong viewport và nhả capture khi cửa sổ mất focus.",
    },
    "controls65-7": {
      title: "Nghiệm thu bàn quan sát bằng một đàn biết trước đáp án",
      description:
        "So hàng xóm với vét cạn, kiểm chuỗi thao tác và chạy toàn bộ ứng dụng độc lập từ ZIP.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      flight: {
        title: "Khung bay trước khi có nút",
        source: "Project 65 · Bài 01",
        poster: "p65-field.png",
        alt: "Đàn 192 con chim nhìn từ trên xuống, bên phải chưa có control.",
        caption:
          "Hướng mỏ mỗi con lấy từ vận tốc của chính nó. Ở mốc này Space và N điều khiển thời gian, chưa có slider.",
      },
      panel: {
        title: "Panel mới có vùng nhận chuột",
        source: "Project 65 · Bài 02",
        poster: "p65-hit.png",
        alt: "Bên phải đàn chim xuất hiện hai nút và một ô đánh dấu.",
        caption:
          "Rê chuột qua Pause, Reset và Neighbors trong checkpoint 2. Hover đã khớp hình nút nhưng click chưa phát lệnh.",
      },
      controls: {
        title: "Pause, Reset và Neighbors",
        source: "Project 65 · Bài 03",
        poster: "p65-controls.png",
        alt: "Chim đang theo dõi màu vàng nằm trong vòng tròn liên kết với các hàng xóm.",
        caption:
          "Quan sát hoạt động trong cùng cửa sổ với đàn. Dùng checkbox để tắt riêng các đường nối rồi bật trở lại.",
      },
      near: {
        title: "Bán kính 20 px",
        source: "Project 65 · Bài 04",
        poster: "p65-near.png",
        alt: "Bán kính quan sát nhỏ tại tick 0, núm Radius ở đầu trái.",
        caption:
          "Nhìn số hàng xóm dưới khung bay. So với 140 px: giữ nguyên đàn, ID và tick, chỉ đổi bán kính.",
      },
      wide: {
        title: "Bán kính 140 px",
        source: "Project 65 · Bài 04",
        poster: "p65-wide.png",
        alt: "Cùng một đàn và một con chim với vòng lớn, nhiều đường nối hơn.",
        caption:
          "Những con mới chuyển màu xanh vốn đã đứng ở đó. Chúng vừa lọt vào vùng tìm kiếm, không phải vừa bay lại gần.",
      },
      final: {
        title: "Bàn quan sát đàn chim",
        source: "Project 65 · Bản hoàn chỉnh",
        poster: "p65-final.png",
        alt: "Ứng dụng C++ có vùng bay màu xanh nhạt, chim chọn màu vàng và năm control trong panel bên phải.",
        caption:
          "Chạy bản C++ để click chọn chim, Pause, chỉnh hai tham số rồi bấm N. Hình trên web không tự chạy solver.",
      },
    },
    overview: ["final", "near", "wide"],
    lessons: {
      "controls65-1": ["flight"],
      "controls65-2": ["panel"],
      "controls65-3": ["controls"],
      "controls65-4": ["near", "wide"],
      "controls65-5": ["final"],
      "controls65-6": ["final"],
      "controls65-7": ["final", "near", "wide"],
    },
  },
} satisfies ProjectLabMeta;
export default data;
