import type { PublishedProjectEditorial } from "../../types";

const data = {
  summary:
    "Cho bàn điều khiển Boids một toolbar ngang trong sidebar dọc. Cùng dữ liệu, thử các cửa sổ rộng–vừa–hẹp, theo dõi phần dư, vùng clip và nơi nút thực sự nhận chuột.",
  duration: "7–10 giờ",
  prerequisites: [
    "Project 67: measure, arrange, clipping.",
    "Project 68–69: cây HTML, computed style và reload từ file.",
  ],
  objectives: [
    "Tự phân biệt main/cross của từng container.",
    "Chia phần dư bằng grow, xử lý thiếu chỗ theo quy tắc giữ basis rồi clip.",
    "Kết hợp row/column, justify/align, gap, margin và padding trong cây thật.",
    "Kiểm kích thước độc lập, input sau resize và visibility.",
  ],
  challenge: {
    timebox: "120–180 phút tự thử",
    mission:
      "Đặt Pause, Reset, Links thành một hàng còn Radius và Separation vẫn ở dạng cột; không ghi x/y cho từng nút. Đổi CSS hoặc resize mà không khởi tạo lại đàn chim.",
    outcome:
      "Toolbar giữ tương quan khi đổi độ rộng; X hiện hai trục màu và những phần còn nhìn thấy.",
    requirements: [
      "Ít nhất ba flex container lồng nhau, cả row và column.",
      "Có item fixed và item nhận phần dư theo grow; justify/align/gap điều khiển bằng CSS thật.",
      "Ba kích thước 220/320/420; thử cả hàng rỗng, chỉ một nút và nhiều nút.",
      "Ẩn Links, đổi layout, tiếp tục dùng Tab, chuột và hai slider.",
    ],
    constraints: [
      "Không dùng Yoga/WebView; không CSS Grid, wrap hay flex-shrink.",
      "Thiếu chỗ giữ basis, chỉ clip khi vẽ/chọn; không phát sinh width âm.",
      "Giữ giới hạn cây và stylesheet từ Project 68–69.",
    ],
    definitionOfDone: [
      "Fixture độc lập cho row/column và tất cả giá trị justify/align đã công bố.",
      "Khoảng dư chia đúng; phần tử bị cắt hoàn toàn không nhận click/Tab.",
      "Cùng executable nạp được toolbar ngang hoặc dọc; thu hẹp không đổi mô hình.",
      "ZIP có sáu mốc, mã hoàn chỉnh, CSS/HTML thật và kiểm thử.",
    ],
  },
  lessons: [
    {
      id: "p70-l01",
      slug: "01-hai-truc-cua-thanh-cong-cu",
      title: "Xoay cách nghĩ: xếp theo hàng hay theo cột?",
      summary: "Cùng một cây, chọn hướng main/cross của từng nhóm.",
      order: 1,
      estimatedMinutes: 40,
      demoId: "tiny-flex",
    },
    {
      id: "p70-l02",
      slug: "02-basis-va-khoang-cach",
      title: "Đặt ba nút lên một hàng",
      summary: "Xác định chiều dài cơ sở, margin và số gap trước khi đặt từng nút.",
      order: 2,
      estimatedMinutes: 75,
      demoId: "tiny-flex",
    },
    {
      id: "p70-l03",
      slug: "03-chia-phan-du",
      title: "Có chỗ trống: chia cho nút nào?",
      summary: "Phân chia số pixel còn lại theo trọng số flex-grow.",
      order: 3,
      estimatedMinutes: 55,
      demoId: "tiny-flex",
    },
    {
      id: "p70-l04",
      slug: "04-can-tren-hai-truc",
      title: "Căn nhóm ở giữa không giống căn chữ trên nút",
      summary: "Phân biệt phân phối chỗ dư theo dòng với căn trên trục còn lại.",
      order: 4,
      estimatedMinutes: 75,
      demoId: "tiny-flex",
    },
    {
      id: "p70-l05",
      slug: "05-an-nut-trong-cay-long",
      title: "Ẩn Links mà không làm hỏng nhóm tham số",
      summary: "Làm việc với nhiều container và bỏ hẳn phần chiếm chỗ của child ẩn.",
      order: 5,
      estimatedMinutes: 65,
      demoId: "tiny-flex",
    },
    {
      id: "p70-l06",
      slug: "06-ba-kich-thuoc-cua-so",
      title: "Thử cùng một bảng ở ba độ rộng",
      summary: "Nghiệm thu overflow, bàn phím, hai stylesheet và lượt layout khi đứng yên.",
      order: 6,
      estimatedMinutes: 65,
      demoId: "tiny-flex",
    },
  ],
} satisfies PublishedProjectEditorial;

export default data;
