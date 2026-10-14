export const volumeMarchingGlossaryTerms = [
  {
    id: "volume-transmittance",
    term: "Transmittance và optical depth",
    definition:
      "T là phần ánh sáng nền còn truyền qua medium. Với đoạn hằng, Tsegment=exp(−sigma*rho*ds), optical depth=sigma*rho*ds và alpha=1−Tsegment. Density scalar, sigma và độ dài ds phải được phân biệt; opacity cố định mỗi sample làm kết quả phụ thuộc số bước.",
  },
  {
    id: "volume-front-to-back",
    term: "Front-to-back volume compositing",
    definition:
      "Giữ C đã nhân trọng số và T còn lại: C+=T*alpha*transfer(rho), T*=Tsegment. Dùng T cũ cho contribution mới; compose background bằng C+T*background ở cuối rồi mới display gamma. Đây không tự là mô phỏng scattering/lighting vật lý.",
  },
  {
    id: "volume-step-budget",
    term: "Step budget và early termination",
    definition:
      "Cap là giới hạn workload: vượt cap phải báo lỗi, không nhận ray bị cắt cụt như kết quả thật. Early termination chủ động dừng khi T đủ nhỏ; khi transfer/background trong [0,1], contribution còn lại mỗi channel bị chặn bởi T. Step size còn phải được kiểm convergence với medium biến thiên.",
  },
];
