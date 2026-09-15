import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 04 — vẽ line trên framebuffer",
    "Project 05 — world/screen transform và mouse drag",
  ],
  summary:
    "Xây dựng một mô phỏng 2D cho phép kéo hai vector A và B, đồng thời quan sát trực tiếp kết quả của từng phép toán vector.",
  challenge: {
    timebox: "90–120 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó hai vector A và B có cùng gốc tọa độ. Người dùng có thể kéo điểm cuối của từng vector; mọi kết quả liên quan phải được cập nhật ngay trên màn hình.",
    outcome:
      "Khi hoàn thành, chương trình sẽ hiển thị lưới tọa độ, hai vector có thể kéo bằng chuột, hình bình hành biểu diễn A+B, vector A−B, kết quả nhân A với scalar, vector normalize(A) và điểm lerp di chuyển trên đoạn A–B.",
    requirements: [
      "Tự định nghĩa kiểu `Vec2` và các phép toán cộng, trừ, nhân với scalar.",
      "Vẽ mỗi vector dưới dạng một mũi tên bắt đầu tại gốc tọa độ và kết thúc tại điểm cuối tương ứng.",
      "Cho phép người dùng nhấn chuột trái và kéo riêng điểm cuối của A hoặc B.",
      "Vẽ A+B từ gốc tọa độ, đồng thời vẽ hai cạnh phụ để tạo thành hình bình hành.",
      "Vẽ A−B từ gốc và thêm một bản sao đi từ điểm cuối B tới điểm cuối A.",
      "Tính `magnitude`, `distance` và `normalize`; zero vector không được làm xuất hiện `NaN`.",
      "Cho phép thay đổi scalar của A bằng bàn phím và điều khiển điểm `lerp(A, B, t)` với `t` nằm trong [0,1].",
      "Tạo lại framebuffer và texture khi kích thước vùng hiển thị thay đổi.",
      "Hiển thị trên thanh tiêu đề các giá trị cần đối chiếu: chế độ hiện tại, `distance(A,B)`, scalar, `t` và `length(normalize(A))`.",
      "Cho phép xem riêng bốn nhóm kết quả: A/B, cộng–trừ, scalar–distance và normalize–lerp.",
    ],
    constraints: [
      "Tự viết `Vec2`, `length`, `normalize`, `distance` và `lerp`; không sử dụng thư viện toán vector có sẵn.",
      "Dùng lại thuật toán vẽ đoạn thẳng và framebuffer từ các project trước; không thay phần hình học bằng API vẽ vector có sẵn.",
      "Thực hiện mọi phép toán vector trong world space. Chỉ chuyển sang screen space khi cần vẽ hoặc kiểm tra con trỏ có chạm điểm cuối hay không.",
    ],
    definitionOfDone: [
      "Khi kéo A hoặc B, điểm cuối của A+B luôn nằm tại góc đối diện của hình bình hành.",
      "Với mọi vector khác zero, sai số của `length(normalize(v))` không vượt quá 10⁻⁹; `normalize` của zero vector trả về zero vector.",
      "`lerp(A,B,0)` trùng A, `lerp(A,B,1)` trùng B và `lerp(A,B,0.5)` nằm đúng tại trung điểm của đoạn A–B.",
      "CTest vượt qua các phép kiểm tra dành cho cộng, trừ, nhân scalar, magnitude, distance, normalize, lerp và hình bình hành.",
    ],
  },
  duration: "5–6 giờ",
  objectives: [
    "Hiểu vector 2D là một độ dời có cả độ lớn và hướng",
    "Tự cài đặt các phép toán vector cơ bản và kiểm chứng từng kết quả bằng hình vẽ",
    "Biết cách kết nối dữ liệu trong world space với thao tác kéo thả và hình ảnh trong screen space",
  ],
  lessons: [
    {
      id: "p06-l01",
      slug: "01-vec2-va-do-doi",
      title: "Vec2 và độ dời có hướng",
      summary:
        "Bắt đầu từ chương trình SDL3 đã chạy được, tự định nghĩa Vec2 rồi vẽ hai vector A và B từ cùng một gốc tọa độ.",
      order: 1,
      estimatedMinutes: 55,
    },
    {
      id: "p06-l02",
      slug: "02-magnitude-va-arrow-head",
      title: "Độ lớn và đầu mũi tên",
      summary:
        "Tính độ lớn, chuẩn hóa hướng và dựng đầu mũi tên có kích thước ổn định trên màn hình.",
      order: 2,
      estimatedMinutes: 50,
      demoId: "vector",
    },
    {
      id: "p06-l03",
      slug: "03-keo-endpoint",
      title: "Chọn và kéo điểm cuối",
      summary:
        "Xác định điểm cuối được chọn, đổi tọa độ chuột về world space và giữ thao tác kéo bằng mouse capture.",
      order: 3,
      estimatedMinutes: 50,
      demoId: "vector",
    },
    {
      id: "p06-l04",
      slug: "04-cong-tru-vector",
      title: "Cộng, trừ và hình bình hành",
      summary: "Vẽ A+B, A−B và dùng hình bình hành để đối chiếu công thức với kết quả hình học.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "vector",
    },
    {
      id: "p06-l05",
      slug: "05-scalar-va-distance",
      title: "Nhân vector với scalar và đo khoảng cách",
      summary:
        "Dùng scalar để co, giãn hoặc đảo hướng A, sau đó phân biệt độ dài của một vector với khoảng cách giữa hai điểm.",
      order: 5,
      estimatedMinutes: 45,
      demoId: "vector",
    },
    {
      id: "p06-l06",
      slug: "06-normalize-lerp-validation",
      title: "Chuẩn hóa, lerp và kiểm chứng",
      summary:
        "Vẽ vector đơn vị, nội suy một điểm trên đoạn A–B và kiểm tra toàn bộ phần toán bằng CTest.",
      order: 6,
      estimatedMinutes: 45,
      demoId: "vector",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
