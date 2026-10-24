import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "SPRING CHAIN LAB",
    title: "Kéo một khối, quan sát cả chuỗi phản ứng",
    description:
      "Chuỗi 32 mass, mở rộng tới 100; tự tính lực và tích phân, so damping bằng năng lượng thay vì nhìn animation.",
  },
  modes: {
    "spring-scene": {
      title: "Dựng chuỗi khối lượng và lò xo",
      description:
        "Từ khung SDL có sẵn, tạo 32 khối nối bằng 31 lò xo; tách dữ liệu vật lý khỏi tọa độ màn hình.",
    },
    "spring-hooke": {
      title: "Tính lực Hooke trên một lò xo",
      description: "Dùng một cặp khối để hiểu chiều lực khi kéo giãn, nén và xoay cả lò xo.",
    },
    "spring-forces": {
      title: "Cộng lực, trọng lực và giữ điểm neo",
      description:
        "Xóa lực cũ, cộng từng cặp lực nội bộ và trọng lực; tính xong toàn hệ rồi mới đổi vận tốc.",
    },
    "spring-integration": {
      title: "Cho chuỗi chuyển động bằng semi-implicit Euler",
      description:
        "Nối lực với gia tốc, vận tốc và vị trí bằng bước thời gian cố định; đọc một bước tính cụ thể.",
    },
    "spring-damping": {
      title: "Làm dao động tắt dần bằng damping dọc trục",
      description:
        "Lực cản phụ thuộc tốc độ đổi chiều dài lò xo, không tùy tiện giảm mọi thành phần vận tốc.",
    },
    "spring-drag": {
      title: "Kéo một khối và quan sát dao động lan truyền",
      description:
        "Giữ độ lệch lúc cầm, xử lý đúng pointer owner và mẫu thả cuối; phân biệt lực lò xo với công của chuột.",
    },
    "spring-stability": {
      title: "Thí nghiệm độ cứng, khối lượng và bước thời gian",
      description:
        "Mở chuỗi 20–100 khối, đo năng lượng và dùng preset sai để hiểu giới hạn ổn định.",
    },
    "spring-validation": {
      title: "Vẽ đồ thị năng lượng và nghiệm thu ứng dụng",
      description:
        "Ghép graph đúng đơn vị, job 20 giây có thể dừng, đáp án độc lập và mã C++ hoàn chỉnh.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
