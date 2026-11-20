import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "TINYFLEX · BÀN QUAN SÁT",
    title: "Ba nút trên một hàng, hai slider bên dưới",
    description:
      "Cho bàn điều khiển Boids một toolbar ngang trong sidebar dọc. Cùng dữ liệu, thử các cửa sổ rộng–vừa–hẹp, theo dõi phần dư, vùng clip và nơi nút thực sự nhận chuột.",
  },
  modes: {
    "flex70-share": {
      title: "Kéo mép khung để chia phần dư",
      description:
        "Hai nút cần 20 và 30 px, ở giữa chừa 10 px. Hãy đoán nút nào sẽ nhận thêm bao nhiêu khi khung rộng 150 px rồi kéo thước để kiểm tra.",
    },
    "flex70-1": {
      title: "Xoay cách nghĩ: xếp theo hàng hay theo cột?",
      description: "Cùng một cây, chọn hướng main/cross của từng nhóm.",
    },
    "flex70-2": {
      title: "Đặt ba nút lên một hàng",
      description: "Xác định chiều dài cơ sở, margin và số gap trước khi đặt từng nút.",
    },
    "flex70-3": {
      title: "Có chỗ trống: chia cho nút nào?",
      description: "Phân chia số pixel còn lại theo trọng số flex-grow.",
    },
    "flex70-4": {
      title: "Căn nhóm ở giữa không giống căn chữ trên nút",
      description: "Phân biệt phân phối chỗ dư theo dòng với căn trên trục còn lại.",
    },
    "flex70-5": {
      title: "Ẩn Links mà không làm hỏng nhóm tham số",
      description: "Làm việc với nhiều container và bỏ hẳn phần chiếm chỗ của child ẩn.",
    },
    "flex70-6": {
      title: "Thử cùng một bảng ở ba độ rộng",
      description: "Nghiệm thu overflow, bàn phím, hai stylesheet và lượt layout khi đứng yên.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      axis: {
        title: "Hướng trục trên toolbar",
        source: "Project 70 · Bài 01",
        poster: "p70-axis.png",
        alt: "Hai đường màu đánh dấu trục của toolbar trên bàn Boids.",
        caption: "Dùng X để bật tắt: vàng là main, xanh là cross.",
      },
      row: {
        title: "Ba nút đã lên một hàng",
        source: "Project 70 · Bài 02",
        poster: "p70-row.png",
        alt: "Ba nút có chiều dài cơ sở, còn khoảng trống ở cuối toolbar.",
        caption: "Đến bài 3, khoảng trống mới được phân cho các nút theo grow.",
      },
      desk: {
        title: "Bảng rộng vừa",
        source: "Project 70 · Bản hoàn chỉnh",
        poster: "p70-desk.png",
        alt: "Ba nút và hai slider trong hai nhóm khác nhau bên cạnh đàn.",
        caption: "Độ rộng 320 là mốc để so với trường hợp 220 và 420.",
      },
      wide: {
        title: "Bảng rộng 420",
        source: "Project 70 · Bản hoàn chỉnh",
        poster: "p70-wide.png",
        alt: "Toolbar nới rộng, Pause và Links nhận thêm chỗ.",
        caption: "So độ tăng thêm, không so tỉ số bề rộng cuối cùng.",
      },
      narrow: {
        title: "Bảng hẹp 220",
        source: "Project 70 · Bản hoàn chỉnh",
        poster: "p70-narrow.png",
        alt: "Một phần nút cuối nằm ngoài vùng nhìn thấy; hai thanh kéo vẫn dùng được.",
        caption: "Nội dung tràn bị clip. Chương trình không thu nhỏ basis trái với stylesheet.",
      },
      column: {
        title: "Chuyển sang cột",
        source: "Project 70 · Bản hoàn chỉnh",
        poster: "p70-column.png",
        alt: "Ba nút xếp theo chiều dọc trong khi cây HTML vẫn như cũ.",
        caption: "Nhấn 2 trong bản native: sự khác biệt đến từ column.css.",
      },
      hidden: {
        title: "Ẩn nút Links",
        source: "Project 70 · Bài 05",
        poster: "p70-hidden.png",
        alt: "Toolbar còn Pause và Reset, không có một ô trống thay cho Links.",
        caption: "Cả gap và trọng số grow của node ẩn rời khỏi phép xếp.",
      },
    },
    overview: ["desk", "wide", "narrow", "column"],
    lessons: {
      "flex70-1": ["axis"],
      "flex70-2": ["row"],
      "flex70-3": ["desk", "wide"],
      "flex70-4": ["column", "desk"],
      "flex70-5": ["hidden", "desk"],
      "flex70-6": ["wide", "desk", "narrow", "column"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
