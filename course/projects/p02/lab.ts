import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "MOTION LAB",
    title: "Cùng năm giây, ô vuông đi được bao xa?",
    description:
      "So sánh 3 pixel/frame với 180 pixel/giây × dt, thử dãy thời gian không đều và đọc đồ thị.",
  },
  modes: {
    "motion-compare": {
      title: "Đo trước khi sửa",
      description: "Chọn 30/60/120 FPS để nhìn thấy quãng đường của công thức phụ thuộc số frame.",
    },
    "motion-dt": {
      title: "Đường xanh có luôn đến 900 pixel?",
      description: "Thử 15 FPS và frame dài 0,2 giây để thấy phần thời gian bị bỏ do clamp.",
    },
    "motion-limiter": {
      title: "Một frame còn bao nhiêu thời gian để nghỉ?",
      description: "Đổi mức FPS và thời gian làm việc; ngân sách hết thì không yêu cầu nghỉ thêm.",
    },
    "motion-validation": {
      title: "Tự dự đoán rồi đối chiếu số đo",
      description: "Đọc kết quả năm giây và từng mốc trên đồ thị trước khi chạy CTest trong C++.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
