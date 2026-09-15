import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time",
    "Project 05 — đổi world/screen space",
    "Project 06 — vector và normalize",
    "Project 07 — radian, sin/cos và atan2",
  ],
  summary:
    "Xây dựng một tháp pháo quay dần về phía chuột, đồng thời dùng dot product, góc và projection để giải thích mọi quyết định của nó.",
  challenge: {
    timebox: "120–180 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó tháp pháo đặt giữa màn hình, mục tiêu đi theo chuột và nòng súng chỉ được quay với tốc độ hữu hạn để đuổi theo mục tiêu.",
    outcome:
      "Chương trình hiển thị hướng nòng súng, hướng tới mục tiêu, góc sai lệch, phần projection song song, phần lệch vuông góc và một vùng khóa có thể điều chỉnh. Mục tiêu đổi màu khi lọt vào vùng khóa.",
    requirements: [
      "Vẽ thân tháp pháo, nòng súng và mục tiêu trên framebuffer; mục tiêu phải theo đúng vị trí chuột sau khi đổi từ screen space sang world space.",
      "Tính dot product thô và dot product của hai vector đơn vị để phân biệt độ lớn với mức độ cùng hướng.",
      "Suy góc không dấu giữa hai hướng bằng acos và chặn cosine về [-1,1] trước khi gọi hàm lượng giác ngược.",
      "Tách vector tới mục tiêu thành vector projection dọc theo nòng súng và phần rejection vuông góc.",
      "Dùng cross product 2D cùng atan2 để biết mục tiêu nằm bên trái hay bên phải hướng nòng súng.",
      "Quay nòng súng bằng turnSpeed × deltaTime, không vượt tốc độ tối đa và không quay quá mục tiêu.",
      "Kiểm tra mục tiêu có nằm trong vùng khóa bằng dot product; cho phép đổi nửa góc vùng khóa trong lúc chạy.",
      "Hỗ trợ pause, reset, resize và hiển thị các giá trị cần kiểm tra trên thanh tiêu đề.",
    ],
    constraints: [
      "Tự cài đặt dot, angleBetween, projection, rejection, signedAngleBetween và rotateTowards; không dùng thư viện vector có sẵn.",
      "Mọi phép toán hướng được thực hiện trong world space với trục Y hướng lên. Chỉ đảo trục Y khi đổi sang pixel để vẽ.",
      "Zero vector không được truyền vào phép chia hoặc tạo ra NaN; các hàm toán phải trả về kết quả ổn định cho trường hợp mục tiêu nằm đúng tâm tháp pháo.",
      "Không gán góc nòng súng trực tiếp bằng góc của chuột; chuyển động quay phải phụ thuộc vào thời gian và tốc độ quay.",
    ],
    definitionOfDone: [
      "Dot product của hai hướng cùng chiều, vuông góc và ngược chiều lần lượt gần bằng 1, 0 và -1.",
      "projection + rejection khôi phục đúng vector ban đầu, đồng thời hai phần vuông góc với nhau trong sai số 10⁻⁹.",
      "rotateTowards không đi quá turnSpeed × deltaTime và không vượt qua hướng mục tiêu khi sai số còn lại nhỏ hơn một bước.",
      "Mục tiêu ở trong hoặc ngoài vùng khóa được phân loại đúng tại cả hai phía của nòng súng và ngay trên đường biên.",
      "CTest vượt qua toàn bộ phép kiểm tra; bản Debug và Release đều build được.",
    ],
  },
  duration: "6–7 giờ",
  objectives: [
    "Hiểu dot product như một phép đo mức độ cùng hướng sau khi hai vector đã được chuẩn hóa",
    "Tính góc, projection và độ lệch vuông góc từ các phép toán vector cơ bản",
    "Dùng góc có dấu, delta time và tốc độ quay để điều khiển một vật thể hướng dần về mục tiêu",
  ],
  lessons: [
    {
      id: "p08-l01",
      slug: "01-bo-khung-thap-phao-va-muc-tieu",
      title: "Dựng tháp pháo và mục tiêu theo chuột",
      summary:
        "Bắt đầu từ framebuffer đã chạy được, vẽ tháp pháo, đổi vị trí chuột sang world space và tạo hai hướng cần so sánh.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "turret",
    },
    {
      id: "p08-l02",
      slug: "02-dot-product-do-muc-do-cung-huong",
      title: "Dùng dot product để đo mức độ cùng hướng",
      summary:
        "Tự cài đặt dot product, nhận ra ảnh hưởng của độ dài và đưa kết quả về khoảng [-1,1] bằng hai vector đơn vị.",
      order: 2,
      estimatedMinutes: 50,
      demoId: "turret",
    },
    {
      id: "p08-l03",
      slug: "03-tu-dot-product-den-goc",
      title: "Từ dot product đến góc sai lệch",
      summary:
        "Biến normalized dot thành cosine, dùng acos để lấy góc không dấu và bảo vệ công thức trước zero vector cùng sai số số thực.",
      order: 3,
      estimatedMinutes: 50,
      demoId: "turret",
    },
    {
      id: "p08-l04",
      slug: "04-projection-va-do-lech",
      title: "Tách projection và độ lệch vuông góc",
      summary:
        "Chiếu vector tới mục tiêu lên hướng nòng súng, rồi tách phần còn lại để biết mục tiêu đang lệch khỏi đường ngắm bao xa.",
      order: 4,
      estimatedMinutes: 55,
      demoId: "turret",
    },
    {
      id: "p08-l05",
      slug: "05-quay-ve-phia-muc-tieu",
      title: "Quay về phía mục tiêu với tốc độ hữu hạn",
      summary:
        "Dùng cross product 2D và atan2 để chọn chiều quay, rồi giới hạn bước quay bằng turnSpeed × deltaTime.",
      order: 5,
      estimatedMinutes: 60,
      demoId: "turret",
    },
    {
      id: "p08-l06",
      slug: "06-vung-khoa-va-validation",
      title: "Vùng khóa mục tiêu và kiểm chứng",
      summary:
        "So normalized dot với cosine của nửa góc vùng nhìn, hoàn thiện điều khiển và kiểm tra toàn bộ phần toán bằng CTest.",
      order: 6,
      estimatedMinutes: 50,
      demoId: "turret",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
