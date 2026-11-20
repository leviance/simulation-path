import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "TINYCSS · KIỂU TRÌNH BÀY",
    title: "Cùng bàn Boids, từ đêm sang ban ngày",
    description:
      "Viết một stylesheet nhỏ cho bàn quan sát đàn chim. Chuyển giữa bản sẫm và sáng, lần theo rule thắng của từng thuộc tính và kéo thử Radius ngay sau khi đổi khoảng cách.",
  },
  modes: {
    "css69-1": {
      title: "Một bàn quan sát, hai cách trình bày",
      description:
        "Đọc stylesheet thật; phân biệt file mô tả cấu trúc với file quy định hình thức.",
    },
    "css69-2": {
      title: "Đọc một quy tắc CSS đến dấu chấm phẩy",
      description:
        "Biến một selector và dãy property/value thành dữ liệu trước khi đụng đến giao diện.",
    },
    "css69-3": {
      title: "Vì sao riêng nút Pause có màu khác các nút bên cạnh?",
      description: "Chọn rule thắng cho từng property bằng tag, class, ID và thứ tự nguồn.",
    },
    "css69-4": {
      title: "Đổi màu không có nghĩa là phải đo lại cả bảng",
      description: "Phân biệt thay đổi nét vẽ và thay đổi khoảng cách; cập nhật hit-test đúng lúc.",
    },
    "css69-5": {
      title: "Đọc ngược từ màu trên nút về đúng dòng stylesheet",
      description: "Nghiệm thu hai theme, inspector và khả năng quay lại sau lỗi.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      bytes: {
        title: "Đọc style.css",
        source: "Project 69 · Bài 01",
        poster: "p69-bytes.png",
        alt: "Số byte CSS bên dưới đàn chim; bảng vẫn mang màu mặc định.",
        caption: "Chưa áp CSS; quan sát xem app có đang đọc đúng file mình vừa lưu.",
      },
      rules: {
        title: "Số rule đã đọc",
        source: "Project 69 · Bài 02",
        poster: "p69-rules.png",
        alt: "Bảng Boids và số rule parse thành công.",
        caption: "Sai một mã hex đủ để từ chối cả stylesheet.",
      },
      lagoon: {
        title: "Phòng quan sát",
        source: "Project 69 · Bản hoàn chỉnh",
        poster: "p69-lagoon.png",
        alt: "Giao diện xanh sẫm với nút Pause nổi bật và hai slider bên cạnh đàn.",
        caption: "Hãy ghi nhớ vị trí và chiều cao của Pause trước khi đổi theme.",
      },
      field: {
        title: "Ngoài hiện trường",
        source: "Project 69 · Bản hoàn chỉnh",
        poster: "p69-field.png",
        alt: "Nền bảng sáng, chữ tối và nút Pause vàng, vẫn điều khiển cùng đàn.",
        caption: "Cùng panel.html. Padding nhỏ hơn và các Button thấp xuống bốn pixel.",
      },
      inspect: {
        title: "Rule nào thắng?",
        source: "Project 69 · Bản hoàn chỉnh",
        poster: "p69-inspect.png",
        alt: "Inspector ghi những rule khớp, property, selector thắng và số thứ tự.",
        caption: "Dùng phím P trong bản C++ để xem từng thuộc tính trên nút Pause.",
      },
      bad: {
        title: "CSS sai, bảng vẫn còn",
        source: "Project 69 · Bản hoàn chỉnh",
        poster: "p69-bad.png",
        alt: "Mã màu sai trong broken.css hiện bên dưới khung, theme đang dùng vẫn còn.",
        caption: "Không nạp một phần file CSS: sửa mã màu rồi nhấn F5.",
      },
    },
    overview: ["lagoon", "field", "inspect", "bad"],
    lessons: {
      "css69-1": ["bytes"],
      "css69-2": ["rules"],
      "css69-3": ["lagoon", "field"],
      "css69-4": ["field", "lagoon"],
      "css69-5": ["inspect", "bad", "lagoon", "field"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
