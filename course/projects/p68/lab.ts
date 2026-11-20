import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "TINYHTML · BÀN QUAN SÁT BOIDS",
    title: "Cùng một đàn chim, hai bàn điều khiển",
    description:
      "Viết cấu trúc bảng điều khiển của đàn chim vào panel.html. Đổi thứ tự nhóm, nạp lại và kéo Radius ngay ở chỗ mới; một thẻ đóng sai phải chỉ đúng dòng mà không làm mất phiên đang chạy.",
  },
  modes: {
    "html68-1": {
      title: "Đổi một file thay vì biên dịch lại cả bàn điều khiển",
      description: "Mở đúng file cạnh executable hoặc chọn thư mục đang biên tập.",
    },
    "html68-2": {
      title: "Tách thẻ, chữ và thuộc tính có dấu nháy",
      description: "Viết tokenizer đi qua nguồn theo đúng một chiều.",
    },
    "html68-3": {
      title: "Từ dòng chữ đến cây có cha, có con",
      description: "Dùng stack để biết nút Reset đang nằm trong nhóm nào.",
    },
    "html68-4": {
      title: "Cho cây từ file thực sự điều khiển đàn",
      description: "Tạo widget theo parent, nối slider với mô hình và chạy layout cũ.",
    },
    "html68-5": {
      title: "Đổi từ bàn điều khiển sang bàn khảo sát",
      description: "Xem hai file đổi cả bố cục lẫn thứ tự Tab; đối chiếu node bằng inspector.",
    },
    "html68-6": {
      title: "Phá một thẻ rồi cứu lại phiên làm việc",
      description: "Giữ bản hợp lệ, in đúng vị trí lỗi và có phép thử không phụ thuộc ảnh.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      bytes: {
        title: "Đọc file lần đầu",
        source: "Project 68 · Bài 01",
        poster: "p68-bytes.png",
        alt: "Bàn Boids cũ với số byte của panel.html ở chân khung bay.",
        caption: "Lúc này chương trình đã đọc đúng file nhưng chưa tạo UI từ nó.",
      },
      tokens: {
        title: "Đếm token",
        source: "Project 68 · Bài 02",
        poster: "p68-tokens.png",
        alt: "Trạng thái bên dưới đàn báo số token của tài liệu.",
        caption: "Một nút có cả thẻ mở, token chữ và thẻ đóng.",
      },
      tree: {
        title: "Các element đã có parent",
        source: "Project 68 · Bài 03",
        poster: "p68-tree.png",
        alt: "Bàn điều khiển cũ với số element đã phân tích ở chân khung bay.",
        caption: "Đã có cấu trúc cây trong bộ nhớ. Sang bài 4 bạn mới nhìn thấy bảng từ HTML.",
      },
      desk: {
        title: "Bàn điều khiển chuyến bay",
        source: "Project 68 · Bản hoàn chỉnh",
        poster: "p68-desk.png",
        alt: "Bảng FLIGHT CONTROL có nhóm hành động trước hai thanh kéo.",
        caption: "Đây là panel.html. Hãy so vị trí Radius và thứ tự Tab với NEIGHBOR SURVEY.",
      },
      survey: {
        title: "Bàn khảo sát hàng xóm",
        source: "Project 68 · Bản hoàn chỉnh",
        poster: "p68-survey.png",
        alt: "Bảng NEIGHBOR SURVEY đưa bán kính lên trước nhóm Pause/Reset.",
        caption: "Cùng một executable, chỉ khác file đầu vào, không hề đổi thuật toán đàn chim.",
      },
      inspector: {
        title: "Soi một element",
        source: "Project 68 · Bài 05",
        poster: "p68-inspector.png",
        alt: "Inspector hiển thị tag, ID, parent, vị trí nguồn và bounds của Pause.",
        caption: "[ và ] cho đi qua các element theo thứ tự nguồn, kể cả Label không nhận focus.",
      },
      bad: {
        title: "Thử file đóng sai thẻ",
        source: "Project 68 · Bản hoàn chỉnh",
        poster: "p68-bad.png",
        alt: "Tên file broken.html và vị trí thẻ đóng sai hiện trên bàn vẫn đang hoạt động.",
        caption: "Một dòng báo lỗi dưới khung bay; bảng hợp lệ trước đó còn nguyên.",
      },
    },
    overview: ["desk", "survey", "inspector", "bad"],
    lessons: {
      "html68-1": ["bytes"],
      "html68-2": ["tokens"],
      "html68-3": ["tree"],
      "html68-4": ["desk"],
      "html68-5": ["survey", "desk", "inspector"],
      "html68-6": ["bad", "desk", "survey"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
