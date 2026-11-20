import type { PublishedProjectEditorial } from "../../types";

const data = {
  summary:
    "Viết một stylesheet nhỏ cho bàn quan sát đàn chim. Chuyển giữa bản sẫm và sáng, lần theo rule thắng của từng thuộc tính và kéo thử Radius ngay sau khi đổi khoảng cách.",
  duration: "6–9 giờ",
  prerequisites: [
    "Project 68: panel.html, cây widget và reload.",
    "Project 67: box layout, dirty và cập nhật trước hit-test.",
  ],
  objectives: [
    "Đọc selector và declaration từ CSS thật.",
    "Giải quyết tranh chấp bằng specificity và source order cho từng property.",
    "Nối kết quả với nét vẽ và layout; biết khi nào cần tính lại hình học.",
    "Kiểm hai theme có thể dùng, chẩn đoán lỗi file mà không làm mất phiên.",
  ],
  challenge: {
    timebox: "90–130 phút tự thử",
    mission:
      "Giữ nguyên panel.html. Tạo hai giao diện cho bàn Boids: một bản sẫm ở phòng quan sát, một bản sáng khi mang ra hiện trường.",
    outcome:
      "Nút Pause nổi bật trong cả hai bản; một phím đổi theme khi đàn vẫn bay. Inspector cho biết vì sao một rule thắng.",
    requirements: [
      "File thật với selector tag, .class, #id; một element có nhiều class.",
      "background, color, border-color, width/height, margin, padding, border và gap.",
      "Hai theme đổi cả paint/geometry và vẫn giữ hoạt động của chuột, Tab và slider.",
      "Reload hợp lệ thay toàn bộ computed style; lỗi có dòng/cột và giữ bản trước.",
    ],
    constraints: [
      "Không WebView hoặc thư viện CSS; chưa có Flexbox, selector ghép, inheritance và shorthand nhiều cạnh.",
      "File ≤16 KiB, tối đa 64 rule và 24 declaration/rule; khi ngang ưu tiên, property xuất hiện sau thắng.",
      "Kiểm tra đúng ngữ cảnh: auto height ở leaf là lỗi, không tự sửa thành giá trị gần đúng.",
    ],
    definitionOfDone: [
      "Sửa file rồi F5, không build C++. Có hai bộ màu đủ tương phản và hai spacing khác nhau.",
      "Kiểm rule ID thắng tag kể cả khi tag ở cuối; nhiều class cùng match.",
      "Thay riêng màu không tăng layout passes; đổi padding làm vùng bấm cập nhật.",
      "Có inspector, case CSS lỗi, năm checkpoint và ZIP độc lập.",
    ],
  },
  lessons: [
    {
      id: "p69-l01",
      slug: "01-mot-panel-hai-bo-ao",
      title: "Một bàn quan sát, hai cách trình bày",
      summary: "Đọc stylesheet thật; phân biệt file mô tả cấu trúc với file quy định hình thức.",
      order: 1,
      estimatedMinutes: 40,
      demoId: "tiny-css",
    },
    {
      id: "p69-l02",
      slug: "02-doc-selector-va-khai-bao",
      title: "Đọc một quy tắc CSS đến dấu chấm phẩy",
      summary:
        "Biến một selector và dãy property/value thành dữ liệu trước khi đụng đến giao diện.",
      order: 2,
      estimatedMinutes: 75,
      demoId: "tiny-css",
    },
    {
      id: "p69-l03",
      slug: "03-rule-nao-thang",
      title: "Vì sao riêng nút Pause có màu khác các nút bên cạnh?",
      summary: "Chọn rule thắng cho từng property bằng tag, class, ID và thứ tự nguồn.",
      order: 3,
      estimatedMinutes: 85,
      demoId: "tiny-css",
    },
    {
      id: "p69-l04",
      slug: "04-doi-mau-hay-xep-lai",
      title: "Đổi màu không có nghĩa là phải đo lại cả bảng",
      summary: "Phân biệt thay đổi nét vẽ và thay đổi khoảng cách; cập nhật hit-test đúng lúc.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "tiny-css",
    },
    {
      id: "p69-l05",
      slug: "05-doc-nguon-cua-mau",
      title: "Đọc ngược từ màu trên nút về đúng dòng stylesheet",
      summary: "Nghiệm thu hai theme, inspector và khả năng quay lại sau lỗi.",
      order: 5,
      estimatedMinutes: 65,
      demoId: "tiny-css",
    },
  ],
} satisfies PublishedProjectEditorial;

export default data;
