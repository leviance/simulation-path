import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "DOUBLE PENDULUM LAB",
    title: "Một sai khác rất nhỏ sẽ lớn lên như thế nào?",
    description:
      "Hai con lắc A/B cùng phương trình và solver, chỉ khác một góc ban đầu. Theo dõi độ tách, cơ năng và sai khác h/h2; dùng khoảng quan sát phù hợp trước khi kết luận.",
  },
  modes: {
    "chaos-geometry": {
      title: "Dựng một con lắc kép từ hai góc",
      description:
        "Từ khung SDL có sẵn, tính vị trí hai quả nặng rồi vẽ thanh nối; kiểm tra quy ước góc và chiều dài.",
    },
    "chaos-derivative": {
      title: "Tính gia tốc: vì sao hai thanh ảnh hưởng lẫn nhau?",
      description:
        "Lập hai phương trình liên kết, giải hệ 2×2 và kiểm bằng những tư thế có đáp án tính tay.",
    },
    "chaos-rk4": {
      title: "Cho con lắc chuyển động và kiểm tra cơ năng",
      description:
        "Ghép RK4 với fixed timestep, lấy dữ liệu đồ thị từ physics và theo dõi sai lệch năng lượng.",
    },
    "chaos-twins": {
      title: "Đặt hai điều kiện đầu gần nhau và chạy đồng bộ",
      description:
        "Tạo con lắc B chỉ lệch theta2 một lượng epsilon; vẽ hai khung và hai vệt chuyển động mà không lệch thời gian.",
    },
    "chaos-separation": {
      title: "Đo độ tách mà không nhầm ở biên góc",
      description:
        "Phân biệt khoảng cách hai quả nặng với khoảng cách trạng thái, xử lý góc tuần hoàn và vẽ trục log theo thời gian thực của mẫu.",
    },
    "chaos-shadow": {
      title: "Kiểm tra lại bằng bước thời gian nhỏ hơn",
      description:
        "Thêm quỹ đạo h/2, chạy thử 10 giây có thể hủy và so ba độ phân giải trước khi diễn giải divergence. Bắt đầu bằng job 10 giây; thay h sẽ đặt lại thí nghiệm.",
    },
    "chaos-validation": {
      title: "Hoàn thiện bàn thí nghiệm và mã nguồn",
      description:
        "Thêm preset, kéo đặt góc ban đầu, job 30 giây theo batch, chế độ trình diễn và bộ kiểm chứng độc lập.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
