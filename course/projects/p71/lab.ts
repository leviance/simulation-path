import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "EVENTS · TỪ WIDGET ĐẾN MÔ PHỎNG",
    title: "Theo một cú bấm Pause tới tận đàn chim",
    description:
      "Nối widget do TinyHTML, TinyCSS và TinyFlex tạo ra với năm thao tác thật của đàn Boids. Quan sát đường đi của click, thử kéo slider ra khỏi bảng và đổi bố cục khi tay còn giữ chuột.",
  },
  modes: {
    "event71-1": {
      title: "Nút Pause tìm thấy hàm C++ bằng cách nào?",
      description: "Nối tên trong HTML với model, không nối bằng tọa độ hay thứ tự child.",
    },
    "event71-2": {
      title: "Một cú click đi qua ba node nhưng chỉ dừng đàn một lần",
      description: "Phân biệt target với currentTarget, handled với stop.",
    },
    "event71-3": {
      title: "Kéo Radius ra ngoài bảng mà không chọn nhầm chim",
      description: "Đổi từ vị trí con trỏ sang bản tin input và chốt thay đổi khi thả.",
    },
    "event71-4": {
      title: "Đưa bàn phím vào cùng đường gọi với chuột",
      description: "Bàn phím đổi focus hoặc phát event, không viết lại năm lệnh của model.",
    },
    "event71-5": {
      title: "Đổi cả bảng giữa một lần kéo",
      description: "Nạp đồng bộ cây, CSS, bố cục và callback; chạy kiểm hồi quy bằng state thật.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      target: {
        title: "Click tới target",
        source: "Project 71 · Bài 01",
        poster: "p71-target.png",
        alt: "Trace báo một lệnh khi nhấn Pause và chỉ target ở mốc đầu.",
        caption: "Tắt E để dùng như một bàn quan sát bình thường.",
      },
      bubble: {
        title: "Click đi qua ba node",
        source: "Project 71 · Bài 02",
        poster: "p71-bubble.png",
        alt: "Đường từ #pause qua #tools tới #desk; đàn đã dừng một lần.",
        caption: "So số lệnh với số node đã đi qua. Hai con số không có nghĩa giống nhau.",
      },
      stopped: {
        title: "Dừng ở nhóm Tools",
        source: "Project 71 · Bản hoàn chỉnh",
        poster: "p71-stopped.png",
        alt: "Đường event kết thúc ở #tools thay vì tới root.",
        caption: "Nhóm vẫn ghi nhận click; chỉ nó quyết định có đi tiếp không.",
      },
      radius: {
        title: "Kéo đến cuối thanh",
        source: "Project 71 · Bài 03",
        poster: "p71-radius.png",
        alt: "Bán kính lên 140 px, vòng quanh cá thể được chọn nở ra.",
        caption: "Đây là một lần kéo bắt đầu trong bảng rồi thả bên ngoài.",
      },
      desk: {
        title: "Bàn điều khiển",
        source: "Project 71 · Bản hoàn chỉnh",
        poster: "p71-desk.png",
        alt: "Đàn bên trái, toolbar cùng checkbox Links và hai slider bên phải.",
        caption: "Một click ngoài UI chọn chim; drag bắt đầu trong UI thì không.",
      },
      survey: {
        title: "Sau khi đổi markup",
        source: "Project 71 · Bản hoàn chỉnh",
        poster: "p71-survey.png",
        alt: "Hai tham số lên đầu, nhóm nút xuống dưới; solver giữ nguyên.",
        caption: "Các callback được nối lại bằng tên trong file chứ không dùng lại WidgetId cũ.",
      },
      bad: {
        title: "Thiếu binding Reset",
        source: "Project 71 · Bản hoàn chỉnh",
        poster: "p71-bad.png",
        alt: "Một file hợp lệ về cú pháp nhưng thiếu control bắt buộc, báo lỗi bên dưới.",
        caption: "Bảng trước vẫn còn để tiếp tục quan sát đàn.",
      },
    },
    overview: ["desk", "bubble", "stopped", "survey"],
    lessons: {
      "event71-1": ["target"],
      "event71-2": ["bubble", "stopped"],
      "event71-3": ["radius", "desk"],
      "event71-4": ["desk", "radius"],
      "event71-5": ["survey", "bad", "bubble", "desk"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
