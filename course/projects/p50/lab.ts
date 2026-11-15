import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "SPH WATER TANK",
    title: "Đổ nước, tạo sóng và đọc dữ liệu bên trong",
    description:
      "Bể SPH 2D có 5.000 hạt thật ở bản cuối. Mặt nước được dựng từ vị trí hạt; kernel, lực và đơn vị dùng cùng mô hình với C++.",
  },
  modes: {
    "sph-1": {
      title: "1.000 hạt đứng yên",
      description: "Dữ liệu nào quyết định vị trí các chấm? Chưa có physics.",
    },
    "sph-2": {
      title: "Rơi tự do và bốn biên",
      description: "Tiến 0,01 s, xem velocity đổi trước position. Các hạt chưa tạo chất lỏng.",
    },
    "sph-3": {
      title: "Kernel quanh một hạt",
      description: "Chọn hạt, nhìn support 2h và đồ thị W(r)/W(0).",
    },
    "sph-4": {
      title: "Density không phải số hàng xóm",
      description: "Đọc tổng mW ở trong lòng khối, mặt thoáng và gần tường.",
    },
    "sph-5": {
      title: "Pressure bắt đầu đẩy hạt",
      description: "Mở cặp độc lập, đổi density rồi trở lại bể. Bước SPH nhỏ hơn bước rơi tự do.",
    },
    "sph-6": {
      title: "Viscosity chỉ cản cặp đang nén",
      description: "Đổi tiến lại gần/tách ra, đọc Pi và công suất trong ca cặp riêng.",
    },
    "sph-7": {
      title: "Grid phải giữ nguyên kết quả",
      description: "Chuyển grid/all-pairs ở 1.000 hạt và so số ứng viên.",
    },
    "sph-8": {
      title: "Dt và ngân sách",
      description: "Chạy rồi pause; phân biệt model time, dt và thời gian bị bỏ.",
    },
    "sph-9": {
      title: "Mặt nước từ 5.000 hạt thật",
      description: "Chuyển Mặt nước/Hạt/Density; cả ba đọc cùng dữ liệu, không có nước vẽ sẵn.",
    },
    "sph-10": {
      title: "Đổ thêm mass",
      description: "Click hoặc dùng mũi tên/Enter; thử phát hai lần cùng chỗ khi paused.",
    },
    "sph-11": {
      title: "Vật cản kinematic",
      description: "Bật vật cản và kéo target; chỉ khi physics tiến thì vật cản mới di chuyển.",
    },
    "sph-12": {
      title: "Bể nước hoàn chỉnh",
      description: "Dam-break, vòi, vật cản, slider, lớp debug và ca chuẩn chạy riêng.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
