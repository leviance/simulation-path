import type { PublishedProjectEditorial } from "../../types";

const data = {
  summary:
    "Viết cấu trúc bảng điều khiển của đàn chim vào panel.html. Đổi thứ tự nhóm, nạp lại và kéo Radius ngay ở chỗ mới; một thẻ đóng sai phải chỉ đúng dòng mà không làm mất phiên đang chạy.",
  duration: "7–10 giờ",
  prerequisites: [
    "Project 66: sở hữu widget và focus theo ID.",
    "Project 67: measure/arrange cây từ các Style mặc định.",
    "Biết đọc std::string_view, vector, map và file nhỏ trong C++20.",
  ],
  objectives: [
    "Tự tách token rồi ghép thành cây có parent, text, ID và classes.",
    "Nối hai file UTF-8 vào chính cây widget, layout và mô hình Boids đang chạy.",
    "Đổi từ Panel điều khiển sang Panel khảo sát không biên dịch lại.",
    "Từ khung trên màn hình lần về element nguồn, chẩn đoán và phục hồi sau markup sai.",
  ],
  challenge: {
    timebox: "90–150 phút tự thử",
    mission:
      "Biến bàn quan sát Boids thành một công cụ có thể bố trí lại bằng cách sửa file. Thử chuyển hai thanh kéo lên đầu danh sách trong khi đàn vẫn bay.",
    outcome:
      "Cùng một executable nạp được hai bảng khác nhau. Khi nhập sai thẻ, người học nhìn thấy vị trí lỗi và vẫn dùng được bảng trước đó.",
    requirements: [
      "Đọc hai file thật cạnh executable hoặc qua --assets; key F5 reload không build.",
      "div, h1, span, label, button và input range; giữ ID, class, text, min/max/step/value.",
      "Nối Radius, Separation, Pause, Reset, Neighbors với chính mô phỏng Project 28.",
      "Hiện tag, ID, parent và bounds. Thứ tự Tab theo cấu trúc mới.",
    ],
    constraints: [
      "Không dùng WebView, thư viện HTML, CSS hoặc engine script.",
      "16 KiB một file, 32 node, sâu tối đa 6. Một root; thuộc tính và ID sai phải có chẩn đoán.",
      "Không reset đàn để sửa một lỗi giao diện. Không giữ con trỏ của cây trước khi reload.",
    ],
    definitionOfDone: [
      "Đảo hai nhóm trong tài liệu thay cả hình, thứ tự focus và nơi nhận chuột.",
      "File lỗi ở dòng 4 không thay cây hợp lệ; sửa đúng rồi F5 phục hồi ngay.",
      "So fixture parent/order, bounds tính tay, hai slider và orphan release ở Debug và Release.",
      "ZIP giải nén độc lập có starter, sáu checkpoint, assets, final và tests.",
    ],
  },
  lessons: [
    {
      id: "p68-l01",
      slug: "01-mo-panel-tu-file",
      title: "Đổi một file thay vì biên dịch lại cả bàn điều khiển",
      summary: "Mở đúng file cạnh executable hoặc chọn thư mục đang biên tập.",
      order: 1,
      estimatedMinutes: 45,
      demoId: "tiny-html",
    },
    {
      id: "p68-l02",
      slug: "02-token-va-thuoc-tinh",
      title: "Tách thẻ, chữ và thuộc tính có dấu nháy",
      summary: "Viết tokenizer đi qua nguồn theo đúng một chiều.",
      order: 2,
      estimatedMinutes: 70,
      demoId: "tiny-html",
    },
    {
      id: "p68-l03",
      slug: "03-giu-dung-cha-va-con",
      title: "Từ dòng chữ đến cây có cha, có con",
      summary: "Dùng stack để biết nút Reset đang nằm trong nhóm nào.",
      order: 3,
      estimatedMinutes: 85,
      demoId: "tiny-html",
    },
    {
      id: "p68-l04",
      slug: "04-dung-widget-tu-tai-lieu",
      title: "Cho cây từ file thực sự điều khiển đàn",
      summary: "Tạo widget theo parent, nối slider với mô hình và chạy layout cũ.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "tiny-html",
    },
    {
      id: "p68-l05",
      slug: "05-doi-ban-quan-sat",
      title: "Đổi từ bàn điều khiển sang bàn khảo sát",
      summary: "Xem hai file đổi cả bố cục lẫn thứ tự Tab; đối chiếu node bằng inspector.",
      order: 5,
      estimatedMinutes: 55,
      demoId: "tiny-html",
    },
    {
      id: "p68-l06",
      slug: "06-loi-va-khoi-phuc",
      title: "Phá một thẻ rồi cứu lại phiên làm việc",
      summary: "Giữ bản hợp lệ, in đúng vị trí lỗi và có phép thử không phụ thuộc ảnh.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "tiny-html",
    },
  ],
} satisfies PublishedProjectEditorial;

export default data;
