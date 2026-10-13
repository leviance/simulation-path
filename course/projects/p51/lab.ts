import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "SPH 3D GPU LAB",
    title: "Học SPH 3D bằng oracle nhỏ",
    description:
      "Canvas CPU có cùng công thức 3D và dữ liệu nhỏ. GPU thật nằm trong source C++ tải về.",
  },
  modes: {
    "sph3-1": {
      title: "Nhìn khối hạt từ nhiều hướng trước khi viết solver",
      description: "Vẽ 64 hạt CPU trong hộp 3D, orbit và resize.",
    },
    "sph3-2": {
      title: "Đưa dữ liệu hạt lên GPU bằng SSBO",
      description: "Layout vec4/std430 và initialization shader tạo 512 hạt.",
    },
    "sph3-3": {
      title: "Vẽ trực tiếp từ position buffer",
      description: "Vertex shader đọc SSBO, depth test và camera orbit.",
    },
    "sph3-4": {
      title: "Đổi kernel từ diện tích sang thể tích",
      description: "Cubic spline 3D, gradient và support sphere.",
    },
    "sph3-5": {
      title: "Tính density trên GPU với một ca nhỏ",
      description: "All-pairs có self, một invocation ghi một hạt và barrier.",
    },
    "sph3-6": {
      title: "Thêm pressure và artificial viscosity",
      description: "EOS, lực đối xứng 3D và thứ tự density→force.",
    },
    "sph3-7": {
      title: "Cho khối nước chuyển động mà không ghi đè state",
      description: "Gravity, semi-implicit Euler, sáu thành và ping-pong.",
    },
    "sph3-8": {
      title: "Dựng spatial grid 3D hoàn toàn trên GPU",
      description: "Count→scan→scatter, 27 cell và oracle all-pairs.",
    },
    "sph3-9": {
      title: "Chọn timestep từ dữ liệu đang nằm trên GPU",
      description: "Reduction nhiều tầng cho vmax/amax, lỗi và dt.",
    },
    "sph3-10": {
      title: "Giữ ứng dụng phản hồi khi GPU đang tính",
      description: "Một batch pending, poll không chặn, pause và benchmark hữu hạn.",
    },
    "sph3-11": {
      title: "Tăng số hạt sau khi kiểm tra tài nguyên",
      description: "32³, 48³, 100³; memory plan và xác nhận workload.",
    },
    "sph3-12": {
      title: "Kiểm chứng CPU↔GPU và chạy khối nước hoàn chỉnh",
      description: "257/512 hạt, CSR permutation, force, integration và source đầy đủ.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
