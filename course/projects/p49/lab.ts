import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "STABLE FLUIDS LAB",
    title: "Khuấy khói và đọc từng bước của solver",
    description:
      "Khói, velocity MAC, pressure và divergence có số đo riêng. Canvas dùng cùng công thức, preset và giới hạn với source C++.",
  },
  modes: {
    "fluid-1": {
      title: "Đám khói đứng yên",
      description: "Nhìn concentration tại tâm ô trước khi thêm chuyển động.",
    },
    "fluid-2": {
      title: "Brush scalar",
      description: "Đặt/xóa khói bằng chuột hoặc Enter, đọc dữ liệu bằng inspector.",
    },
    "fluid-3": {
      title: "Backtrace scalar",
      description: "N tiến một bước với gió cho trước (0.2,0); chưa có velocity solver.",
    },
    "fluid-4": {
      title: "Lưới MAC và flux",
      description: "Đọc bốn cạnh của ô, so divergence với dòng xoáy từ streamfunction.",
    },
    "fluid-5": {
      title: "Giải pressure",
      description:
        "Ca 8×8 có đáp án tính tay: J chạy từng vòng Jacobi, inspector đọc RHS và pressure hàng xóm. N giải trọn budget, chưa sửa velocity.",
    },
    "fluid-6": {
      title: "Projection",
      description: "So div trước/sau với dt nhân residual; tường giữ normal velocity 0.",
    },
    "fluid-7": {
      title: "Advection velocity",
      description: "u và v đọc cùng state cũ rồi project lại trước scalar.",
    },
    "fluid-8": {
      title: "Viscosity implicit",
      description: "Đổi ν và xem sự suy giảm chỉ số năng lượng vận tốc.",
    },
    "fluid-9": {
      title: "Khuấy và lực nổi",
      description: "Chuột/WASD tạo impulse, buoyancy cộng theo dt; tiến từng bước để quan sát.",
    },
    "fluid-10": {
      title: "Pipeline và fixed dt",
      description: "Chạy liên tục có giới hạn work, đổi FPS và đọc thời gian bị bỏ qua.",
    },
    "fluid-11": {
      title: "Solver hoàn chỉnh",
      description: "Kiểm ca chuẩn riêng và tiếp tục đọc sai số của cấu hình đang chạy.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
