import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "LENNARD–JONES PAIR LAB",
    title: "Hai nguyên tử cho ta thấy lực hút–đẩy bắt đầu từ đâu",
    description:
      "Kéo để đổi khoảng cách, đọc đường cong thế năng, quan sát hai lực đối nhau rồi cho cặp nguyên tử dao động bằng Velocity Verlet. Canvas dùng hệ đơn vị rút gọn và cùng công thức với mã C++.",
  },
  modes: {
    "pair-distance": {
      title: "Khoảng cách vật lý khác tọa độ màn hình thế nào?",
      description:
        "Kéo nguyên tử B, đọc `delta` và khoảng cách theo đơn vị thế giới. Tâm khối lượng luôn nằm giữa vùng mô phỏng nên việc đổi kích thước Canvas không làm thay đổi trạng thái vật lý.",
    },
    "lj-potential": {
      title: "σ, đáy thế và vùng hút nằm ở đâu?",
      description:
        "Di chuyển con trỏ theo trục r/σ để xem hai nhánh r^-12 và r^-6 ghép thành U(r), đồng thời phân biệt σ với r0=2^(1/6)σ.",
    },
    "lj-force": {
      title: "Độ dốc nào tạo lực hút, độ dốc nào tạo lực đẩy?",
      description:
        "Kéo cặp nguyên tử qua hai phía của r0; mũi tên lực đổi chiều theo dấu của `potentialSlope = dU/dr`, còn vector lực luôn nằm trên đường nối hai tâm.",
    },
    "pair-invariants": {
      title: "Hai lực có thực sự bằng nhau và ngược chiều?",
      description:
        "Đổi khối lượng và hướng của cặp, rồi đọc tổng lực, động lượng và tâm khối lượng để thấy định luật III Newton không đòi hỏi hai gia tốc phải bằng nhau.",
    },
    "lj-verlet": {
      title: "Velocity Verlet hỏi lực ở hai thời điểm ra sao?",
      description:
        "Tiến từng bước cố định để theo dõi a0, vị trí mới, a1 và vận tốc mới; đổi dt để thấy bộ giải vẫn độc lập với nhịp dựng hình.",
    },
    "lj-energy": {
      title: "Potential và kinetic trao đổi nhưng total energy đi đâu?",
      description:
        "Chạy cùng một trạng thái ban đầu với nhiều giá trị `fixed dt`, đọc đồ thị thế năng, động năng, tổng năng lượng và độ lệch tương đối thay vì chỉ nhìn quỹ đạo bằng mắt.",
    },
    "lj-final": {
      title: "Lennard–Jones Pair Lab đã vượt qua các invariant chưa?",
      description:
        "Dùng ba cấu hình đẩy, cân bằng và hút; kéo nguyên tử, tạm dừng, tiến từng bước, đổi tham số rồi đối chiếu năng lượng, động lượng, tâm khối lượng cùng báo cáo kiểm chứng.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
