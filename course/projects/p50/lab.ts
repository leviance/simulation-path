import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "SPH WATER LAB",
    title: "Đổ nước, chọn một hạt và đọc solver",
    description:
      "Canvas dùng cùng kernel 2D, pressure, preset và ngân sách với C++. Vòng support giúp thấy hạt nào thực sự góp vào density và lực.",
  },
  modes: {
    "sph-1": {
      title: "Hạt đứng yên",
      description: "Đổi cảnh mẫu, nhìn vị trí trước khi thêm physics.",
    },
    "sph-2": {
      title: "Rơi và va chạm",
      description: "N tiến 0.001s; các hạt chưa tác động lên nhau.",
    },
    "sph-3": {
      title: "Kernel 2D",
      description: "Chọn hạt, nhìn vòng h/2h và các hàng xóm nằm trong support.",
    },
    "sph-4": {
      title: "Density và tường",
      description: "Đọc rho/rho0 và xem mẫu tĩnh; màu density không phải pressure.",
    },
    "sph-5": {
      title: "Pressure",
      description:
        "Đo lực đối nhau trên cặp có density cho trước, không gravity/wall; sau đó đổi c và quan sát bể.",
    },
    "sph-6": {
      title: "Artificial viscosity",
      description:
        "Đổi cặp tiến lại gần/tách ra, đọc Pi và công suất viscosity; so alpha tại cùng state.",
    },
    "sph-7": {
      title: "Grid và all-pairs",
      description: "Đổi phương pháp tìm hàng xóm, so số ứng viên nhưng giữ nguyên phương trình.",
    },
    "sph-8": {
      title: "Vòi nước",
      description: "Chuột/keyboard chuyển vòi, phát một hạt và đọc số thành công/từ chối.",
    },
    "sph-9": {
      title: "Substep có giới hạn",
      description: "Chạy/dừng, đổ liên tục và đo dt/thời gian bỏ qua khi đổi FPS.",
    },
    "sph-10": {
      title: "Bể nước hoàn chỉnh",
      description:
        "Chạy ca chuẩn riêng, không thay cảnh hiện tại; đọc số đo và giới hạn của WCSPH.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
