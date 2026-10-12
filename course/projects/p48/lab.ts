import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "WIND MAP LAB",
    title: "Đọc trường gió bằng mũi tên và số đo",
    description:
      "So sánh gradient, divergence và curl, đọc số tại một nút rồi thả hạt đánh dấu. Công thức, miền và các ca kiểm chứng khớp source C++.",
  },
  modes: {
    "wind-1": {
      title: "Một lưới mũi tên",
      description: "World y hướng lên; vector giữ nguyên khi resize.",
    },
    "wind-2": {
      title: "Các trường mẫu",
      description: "Chọn trường, quan sát hình và đọc vector bằng chuột hoặc bàn phím.",
    },
    "wind-3": {
      title: "Gradient của scalar",
      description: "So lòng chảo với đỉnh đồi; gradient hướng về phía phi tăng nhanh nhất.",
    },
    "wind-4": {
      title: "Dòng ra ròng",
      description: "Đọc divergence dương, âm và bằng 0 trên các trường có đáp án biết trước.",
    },
    "wind-5": {
      title: "Xu hướng quay cục bộ",
      description: "So rotation và shear; kiểm dấu curl với quy ước world y lên.",
    },
    "wind-6": {
      title: "Sai số khi lấy đạo hàm",
      description: "Đổi số nút và so sai số gradient trong miền với sai số mép.",
    },
    "wind-7": {
      title: "Hạt đánh dấu dòng chảy",
      description: "Bilinear, midpoint RK2 và fixed dt đưa hạt qua các nút lưới.",
    },
    "wind-8": {
      title: "Xoáy cục bộ",
      description: "Kéo tâm hoặc dùng Enter; nền được dựng lại trước khi cộng một xoáy Gaussian.",
    },
    "wind-9": {
      title: "Bản đồ hoàn chỉnh",
      description: "Kiểm trường tuyến tính, curl(gradient) và hội tụ trên dữ liệu riêng.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
