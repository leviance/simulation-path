import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "TRANSFORM LAB",
    title: "Một hình vuông đi qua những phép biến đổi nào?",
    description:
      "Hình gốc, hình sau biến đổi và basis dùng chung world unit; từ bài 6 cả lưới local cũng đi qua ma trận.",
  },
  modes: {
    "transform-local": {
      title: "Vẽ hình vuông từ bốn đỉnh local",
      description: "Dựng hình nhìn thấy được trước: đỉnh, cạnh, basis và đổi world/screen.",
    },
    "transform-scale": {
      title: "Co giãn, phản chiếu và ép phẳng hình",
      description: "Giữ nguyên dữ liệu gốc, đổi scaleX/Y và nhìn cả scale âm lẫn scale 0.",
    },
    "transform-rotation": {
      title: "Xoay hình từ hai vector cơ sở",
      description: "Suy công thức từ sin/cos, giữ góc trong radian và kiểm độ dài.",
    },
    "transform-shear": {
      title: "Làm xiên hình rồi tự viết Mat2",
      description: "Tính shear đồng thời, đọc hai cột cơ sở và nhân ma trận 2×2.",
    },
    "transform-matrix": {
      title: "Dịch chuyển bằng Mat3: điểm khác hướng ở đâu?",
      description: "Tự viết Mat3 và phép nhân; translation nằm ở cột cuối, không phải hàng cuối.",
    },
    "transform-order": {
      title: "Đổi thứ tự và biến đổi cả lưới",
      description: "So T·R·H·S với T·S·H·R bằng cùng tham số, không tráo slider.",
    },
    "transform-input": {
      title: "Tự làm slider trong ứng dụng SDL3",
      description:
        "Vẽ track/nút kéo, hit-test, capture và đổi input sang tọa độ logic đúng một lần.",
    },
    "transform-full": {
      title: "Hoàn thiện editor và kiểm chứng kết quả",
      description: "Kiểm bằng số biết trước, hai cách tính độc lập, diện tích có dấu và CTest.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
