export const sphGlossaryTerms = [
  {
    id: "sph-water",
    term: "SPH — Smoothed Particle Hydrodynamics",
    definition:
      "Biểu diễn chất lưu bằng các hạt mang mass và state. Giá trị trường được ước lượng bằng tổng trọng số kernel quanh hạt. Project 50 dùng WCSPH CPU 2D với EOS tuyến tính và boundary đơn giản, không phải solver nước không nén được chính xác.",
  },
  {
    id: "sph-kernel-2d",
    term: "SPH kernel 2D và support",
    definition:
      "Cubic spline của Project 50 dùng h là smoothing length, support radius 2h và hệ số 10/(7πh²). Tích phân theo diện tích 2π∫rW(r)dr bằng 1. Không dùng hệ số 3D hoặc nhầm support với bán kính chấm tròn.",
  },
  {
    id: "sph-summation-density",
    term: "Summation density",
    definition:
      "Density tại hạt i là tổng m_j*W(|x_i−x_j|), bao gồm self. Trong mô hình 2D này density có đơn vị kg/m². Thiếu hàng xóm ở mặt thoáng làm tổng thấp; wall samples chỉ bù một phần thiếu support gần thành.",
  },
  {
    id: "sph-eos",
    term: "SPH equation of state — EOS",
    definition:
      "Project 50 đặt p=max(0,c²*(rho−rho0)). Độ nén làm pressure tăng; c là tốc độ âm số điều khiển độ cứng, không phải tốc độ chảy. Clamp tránh pressure âm nhưng thay đổi mô hình mặt thoáng; không đảm bảo rho luôn sát rho0.",
  },
  {
    id: "sph-artificial-viscosity",
    term: "Artificial viscosity Monaghan",
    definition:
      "Tiêu tán số cho cặp có relativeVelocity·displacement âm. Project 50 dùng beta=0 và alpha=0–0.3; Pi được cộng vào hệ số lực trước −m*gradient. Alpha không phải kinematic viscosity ν của nước thật.",
  },
  {
    id: "sph-timestep",
    term: "SPH acoustic/force timestep",
    definition:
      "Project 50 chọn min(0.001,0.25*h/(c+vmax),0.25*sqrt(h/amax)). Đây là bound thực hành cho mô hình giảng dạy, không phải chứng minh ổn định mọi cấu hình. Ngân sách 64 substep/frame và dropped time ngăn chạy bù vô hạn.",
  },
];
