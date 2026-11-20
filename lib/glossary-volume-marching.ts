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
  {
    id: "volume-projection-modes",
    term: "MIP và length-weighted average",
    definition:
      "MIP giữ density lớn nhất dọc đoạn ray trong volume; average cộng density*ds rồi chia tổng độ dài đoạn. Một lớp mỏng nhưng đậm có thể sáng ở MIP mà nhạt ở average. Đây là hai phép chiếu scalar, không phải transmittance hoặc ảnh X-ray. Project 54 phân loại density bằng cutoff trước cả hai phép gộp.",
  },
  {
    id: "volume-transfer-lighting",
    term: "Transfer function và gradient lighting của volume",
    definition:
      "Transfer gán màu/opacity cho scalar để thấy cấu trúc. Project 54 dùng rho'=clamp((rho-cutoff)/(1-cutoff),0,1); palette không sửa mảng gốc hoặc T. Gradient central difference cho normal xấp xỉ và ánh sáng cục bộ tùy chọn trong alpha; đây không phải solver shadow/multiple scattering. Sigma, scalar và đơn vị độ dài vẫn phải tách rõ.",
  },
  {
    id: "volume-quality-timing",
    term: "So step: sai số và thời gian GPU",
    definition:
      "So cùng dataset/camera/mode/target. GPU timer phải có kết quả thực thi, không lấy thời gian enqueue CPU. Project 54 dùng target 320×240, warm-up rồi năm lần đo, median/IQR; max error tại 48 ray so CPU step 0.002 chỉ là ước lượng tại các ray ấy. Không suy ra toàn ảnh, FPS chung hoặc sai số luôn giảm đơn điệu.",
  },
];
