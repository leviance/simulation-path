import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "SMOKE CHAMBER",
    title: "Thả khói vào hộp rồi thử khuấy",
    description:
      "Khói trắng được tính trên lưới MAC thật. Click thêm khói, kéo để khuấy; mở tham số để xem pressure, divergence hoặc chọn 256×256 cho các dải khói mảnh hơn.",
  },
  modes: {
    "fluid-1": {
      title: "Vệt khói đầu tiên",
      description: "Scalar đứng yên; chưa có solver vận tốc.",
    },
    "fluid-2": { title: "Vẽ và xóa", description: "Brush theo khoảng cách, không theo số event." },
    "fluid-3": {
      title: "Đi ngược để lấy mẫu",
      description: "Gió cho trước (0,18;0), N tiến 1/60 giây.",
    },
    "fluid-4": {
      title: "Dòng ra qua bốn cạnh",
      description: "Đọc số tại bốn cạnh MAC và so với divergence.",
    },
    "fluid-5": {
      title: "Jacobi 8×8",
      description: "J giải từng vòng trên RHS cố định; p(3,3) lần đầu là 0,1875.",
    },
    "fluid-6": {
      title: "Pressure sửa velocity",
      description: "So div trước/sau với dt nhân residual.",
    },
    "fluid-7": {
      title: "Dòng chảy tự vận chuyển",
      description: "u và v cùng đọc state cũ; projection sửa divergence sinh thêm.",
    },
    "fluid-8": {
      title: "Nguồn và lực",
      description: "Click thêm khói; kéo chỉ khuấy. So impulse với lực nổi tích phân theo dt.",
    },
    "fluid-9": {
      title: "Độ nhớt",
      description: "Đổi ν rồi tiến từng bước; theo dõi chỉ số năng lượng velocity.",
    },
    "fluid-10": {
      title: "Pipeline chạy liên tục",
      description: "Pause/step/reset và giới hạn công việc mỗi frame.",
    },
    "fluid-11": {
      title: "128×128 với CG",
      description: "So CG/Jacobi trên cùng hệ; ít vòng chưa chắc đạt ngưỡng.",
    },
    "fluid-12": {
      title: "Dải khói mảnh",
      description: "Bật/tắt MacCormack có limiter trên cùng cảnh sau reset.",
    },
    "fluid-13": {
      title: "Những xoáy nhỏ",
      description: "So ε=0 và ε=8; confinement không phải nhiễu hình ảnh.",
    },
    "fluid-14": {
      title: "PCG và nhiều thang lưới",
      description: "Chọn 128 hoặc 256; đo thời gian, residual và số vòng thực.",
    },
    "fluid-15": {
      title: "Hộp khói hoàn chỉnh",
      description:
        "Xem sạch, tương tác và kiểm ca chuẩn riêng. Canvas minh họa; sản phẩm chính là ứng dụng C++ trong ZIP.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
