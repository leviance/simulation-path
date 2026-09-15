import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 04 — vẽ line trên framebuffer",
    "Project 05 — world/screen space",
    "Project 06 — vector 2D",
    "Project 07 — sin, cos và radian",
  ],
  summary:
    "Biến đổi một hình vuông bằng scale, rotation và shear, sau đó ghép các phép toán bằng ma trận 3×3 để nhìn rõ vì sao thứ tự thực hiện làm kết quả thay đổi.",
  challenge: {
    timebox: "150–210 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 hiển thị hình vuông trong hệ tọa độ riêng của vật thể, cho phép co giãn, xoay, làm xiên và đổi thứ tự ghép các phép biến đổi trong lúc chạy.",
    outcome:
      "Cửa sổ hiển thị hình vuông gốc, hình sau biến đổi và hai vector cơ sở đã biến đổi. Người dùng có thể chỉnh từng tham số, kéo vật thể, đổi thứ tự phép toán và đọc determinant để nhận ra co giãn diện tích hoặc phản chiếu.",
    requirements: [
      "Lưu bốn đỉnh hình vuông trong local space quanh gốc thay vì sửa trực tiếp tọa độ pixel.",
      "Tự viết scale không đều theo hai trục và cho phép scale âm để quan sát phép phản chiếu.",
      "Tự viết rotation 2D bằng sin/cos với góc tính bằng radian.",
      "Tự viết shear theo cả hai trục và giải thích được mỗi thành phần mới phụ thuộc vào thành phần nào.",
      "Biểu diễn affine transform bằng ma trận 3×3 và tự cài đặt matrix multiplication cùng transformPoint.",
      "Ghép scale, shear, rotation và translation theo ít nhất hai thứ tự khác nhau rồi chuyển đổi thứ tự khi chương trình đang chạy.",
      "Vẽ hai vector cơ sở sau biến đổi để nhìn thấy trục local bị co, xoay, xiên hoặc đảo chiều như thế nào.",
      "Hỗ trợ reset, resize, kéo vị trí bằng chuột và hiển thị tham số cùng determinant trên title bar.",
    ],
    constraints: [
      "Không dùng GLM, Eigen, SDL_RenderGeometry hoặc thư viện ma trận có sẵn.",
      "Các hàm toán học phải độc lập với SDL để chạy được bằng CTest mà không mở cửa sổ.",
      "Dùng column vector và một quy ước nhân ma trận duy nhất trong toàn project; không đổi quy ước giữa các bài.",
      "Không cập nhật dồn các đỉnh đã biến đổi qua từng frame; luôn tính lại từ bốn đỉnh local ban đầu để tránh sai số tích lũy.",
    ],
    definitionOfDone: [
      "Scale `(2,3)` biến điểm `(4,-2)` thành `(8,-6)`; rotation 90° biến `(1,0)` thành gần `(0,1)`.",
      "Shear X với hệ số 0,5 biến `(2,4)` thành `(4,4)`; shear Y với hệ số -0,25 biến điểm đó thành `(2,3.5)`.",
      "Ma trận ghép cho kết quả giống hệt việc gọi từng hàm theo đúng thứ tự trong sai số 10⁻⁹.",
      "Đổi `Scale → Shear → Rotate` sang `Rotate → Shear → Scale` tạo kết quả khác với dữ liệu không giao hoán đã chọn.",
      "Trị tuyệt đối determinant của phần tuyến tính bằng tỉ lệ diện tích đo từ polygon sau biến đổi.",
      "CTest vượt qua; starter, sáu checkpoint và final build được ở Debug lẫn Release.",
    ],
  },
  duration: "7–8 giờ",
  objectives: [
    "Phân biệt local space với world space và luôn biến đổi từ dữ liệu gốc",
    "Hiểu scale, rotation và shear qua cả công thức thành phần lẫn hình học trực quan",
    "Biểu diễn affine transform bằng ma trận 3×3 và đọc đúng thứ tự nhân ma trận",
  ],
  lessons: [
    {
      id: "p09-l01",
      slug: "01-hinh-vuong-trong-local-space",
      title: "Dựng hình vuông trong local space",
      summary:
        "Bắt đầu từ framebuffer đã chạy được, lưu bốn đỉnh quanh gốc và vẽ cùng một hình qua phép đổi world sang screen.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "transform",
    },
    {
      id: "p09-l02",
      slug: "02-scale-theo-hai-truc",
      title: "Co giãn riêng theo hai trục",
      summary:
        "Nhân từng thành phần với scale tương ứng, quan sát scale bằng 0 và dùng scale âm để tạo phép phản chiếu.",
      order: 2,
      estimatedMinutes: 50,
      demoId: "transform",
    },
    {
      id: "p09-l03",
      slug: "03-xoay-bang-sin-cos",
      title: "Xoay từng đỉnh bằng sin và cos",
      summary:
        "Suy công thức rotation 2D từ hai vector cơ sở rồi áp dụng cùng một góc cho cả bốn đỉnh.",
      order: 3,
      estimatedMinutes: 55,
      demoId: "transform",
    },
    {
      id: "p09-l04",
      slug: "04-shear-va-he-truc-bi-xien",
      title: "Shear và hệ trục bị xiên",
      summary:
        "Làm một tọa độ phụ thuộc vào tọa độ còn lại và dùng các cạnh song song để phân biệt shear với rotation.",
      order: 4,
      estimatedMinutes: 50,
      demoId: "transform",
    },
    {
      id: "p09-l05",
      slug: "05-ma-tran-affine-3x3",
      title: "Đưa các phép biến đổi vào ma trận 3×3",
      summary:
        "Xây Mat3, transformPoint và matrix multiplication để ghép scale, shear, rotation cùng translation thành một giá trị.",
      order: 5,
      estimatedMinutes: 70,
      demoId: "transform",
    },
    {
      id: "p09-l06",
      slug: "06-thu-tu-phep-bien-doi-va-validation",
      title: "Thứ tự phép biến đổi và kiểm chứng",
      summary:
        "Đổi thứ tự nhân, đọc determinant, đo diện tích và dùng CTest để xác nhận các bất biến của bản hoàn chỉnh.",
      order: 6,
      estimatedMinutes: 60,
      demoId: "transform",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
