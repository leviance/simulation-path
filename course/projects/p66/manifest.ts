import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Di chuyển, ẩn hoặc xóa cả nhóm điều khiển đàn Boids. Tự viết cây widget sống qua nhiều frame, dùng cùng hình học cho việc vẽ, clipping và chọn nút.",
  duration: "8–11 giờ",
  prerequisites: [
    "Chạy được Project 65: biết tại sao Radius thay tập hàng xóm ngay cả khi đàn đang Pause.",
    "Biết struct, vector, hàm đệ quy và ý nghĩa quyền sở hữu trong C++. Không cần đặt ZIP này cạnh Project 65.",
  ],
  objectives: [
    "Quản lý node bằng ID ổn định và quyền sở hữu từ parent xuống child.",
    "Tính local/world/clip, vẽ từ trước tới sau và chọn theo thứ tự ngược.",
    "Giữ hover, capture và focus hợp lệ khi ẩn, disable hoặc xóa nhánh.",
  ],
  challenge: {
    timebox: "60–90 phút thử tự xây",
    mission:
      "Gom các control của đàn chim dưới một Panel cha. Hãy dịch Panel, che một phần nút và xóa cả nhóm trong lúc kéo slider mà không làm đổi đàn hay để sót một click.",
    outcome:
      "Bàn quan sát Boids có các Panel lồng nhau; F2 cho xem ID và ba khung local/world/clip của node đang theo dõi. Có thể tắt inspector để dùng ứng dụng bình thường.",
    requirements: [
      "Mỗi node có một ID; parent sở hữu child. Dịch Panel cha làm các con đi theo nhưng không sửa local từng con.",
      "Vùng bị cắt không nhận input. Với hai nút chồng nhau, nút vẽ sau nhận click trước.",
      "Bảng điều khiển sửa Radius, Separation, Pause/Reset và lớp hàng xóm của chính đàn chim.",
    ],
    constraints: [
      "Bố trí bằng bounds local. Không làm HTML, CSS hay box layout tự động trong project này.",
      "Không dựng lại cây khi vật lý tiến hoặc Reset đàn. Không lưu Widget* qua thao tác có thể xóa node.",
    ],
    definitionOfDone: [
      "Kiểm fixture tính tay: Pause ở (688,80); khi thu Panel con, Reset cao 44 px nhưng chỉ còn 36 px nhìn thấy.",
      "Ẩn, disable, xóa nhánh khi giữ slider không để sự kiện thả tác động vào ID đã mất.",
      "Sau 1.000 frame và một lần Reset đàn, root và bộ cấp ID không đổi. Kiểm cả Debug và Release.",
    ],
  },
  lessons: [
    {
      id: "p66-l01",
      slug: "01-widget-la-du-lieu",
      title: "Cho mỗi control một địa chỉ không đổi",
      summary: "Chia việc sở hữu: cây giữ widget, đàn chim giữ trạng thái mô phỏng.",
      order: 1,
      estimatedMinutes: 60,
      demoId: "widget-tree",
    },
    {
      id: "p66-l02",
      slug: "02-panel-long-nhau",
      title: "Di chuyển cả nhóm bằng tọa độ của Panel cha",
      summary: "Từ tọa độ local của child tới khung world dùng để vẽ.",
      order: 2,
      estimatedMinutes: 60,
      demoId: "widget-tree",
    },
    {
      id: "p66-l03",
      slug: "03-cat-theo-khung-cha",
      title: "Phần nút bị cắt vẫn tồn tại trong cây",
      summary: "Clipping là giao của các khung tổ tiên, không phải sửa kích thước gốc của child.",
      order: 3,
      estimatedMinutes: 60,
      demoId: "widget-tree",
    },
    {
      id: "p66-l04",
      slug: "04-chon-widget-tren-cung",
      title: "Hai nút chồng nhau: nút nào nhận chuột?",
      summary: "Đọc cây theo thứ tự ngược với thứ tự vẽ; label không chặn input.",
      order: 4,
      estimatedMinutes: 70,
      demoId: "widget-tree",
    },
    {
      id: "p66-l05",
      slug: "05-noi-input-voi-model",
      title: "Kéo một slider trong cây để thay đổi đàn chim",
      summary: "Đưa tọa độ về bounds đầy đủ và phát lệnh lên đúng model của Project 65.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "widget-tree",
    },
    {
      id: "p66-l06",
      slug: "06-focus-theo-cay",
      title: "Tab đi qua những control đang dùng được",
      summary: "Dựng thứ tự focus từ cây đã clip thay vì duy trì thêm một danh sách ID bằng tay.",
      order: 6,
      estimatedMinutes: 60,
      demoId: "widget-tree",
    },
    {
      id: "p66-l07",
      slug: "07-an-xoa-va-vong-doi",
      title: "Xóa một nhóm ngay khi tay còn giữ slider",
      summary: "Phân biệt ẩn, disable và hủy node; không để sót ID đang giữ chuột.",
      order: 7,
      estimatedMinutes: 70,
      demoId: "widget-tree",
    },
    {
      id: "p66-l08",
      slug: "08-kiem-chung-va-hoan-thien",
      title: "Kiểm cây vẫn còn nguyên sau một nghìn frame",
      summary: "Chứng minh ID, quyền sở hữu và geometry độc lập với chuyển động của đàn.",
      order: 8,
      estimatedMinutes: 70,
      demoId: "widget-tree",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
