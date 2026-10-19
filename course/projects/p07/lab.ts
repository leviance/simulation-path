import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "UNIT CIRCLE LAB",
    title: "Một góc, một chiếc kim và hai đồ thị",
    description:
      "Đối chiếu cùng một góc trên đường tròn, hai hình chiếu và lịch sử sin/cos. Bản cuối luôn hiển thị đủ các phần.",
  },
  modes: {
    "angle-radians": {
      title: "Từ một đường tròn có sẵn đến góc radian",
      description: "Chạy bộ khung, đo góc bằng độ dài cung và đưa góc về một vòng.",
    },
    "angle-sincos": {
      title: "Đặt đầu kim bằng sin và cos",
      description: "Viết tọa độ từ góc, rồi đưa điểm toán học lên màn hình.",
    },
    "angle-motion": {
      title: "Cho kim quay theo thời gian",
      description: "Đổi vận tốc góc, quay ngược, tạm dừng và kiểm tra chu kỳ.",
    },
    "angle-projections": {
      title: "Nhìn thấy sin và cos trên hai trục",
      description: "Vẽ đường dóng, hai thành phần có dấu và nhãn giá trị.",
    },
    "angle-graphs": {
      title: "Từ kim quay đến hai đồ thị theo thời gian",
      description: "Lấy mẫu 60 Hz đúng timestamp và tự vẽ cửa sổ lịch sử 6 giây.",
    },
    "angle-atan2": {
      title: "Kéo đầu kim để chọn góc bằng atan2",
      description: "Xử lý bốn góc phần tư, vùng tâm, grab offset và capture.",
    },
    "angle-full": {
      title: "Ghép bản hoàn chỉnh và kiểm chứng",
      description: "Đối chiếu hình, số, lịch sử và kiểm thử độc lập ở Debug/Release.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
