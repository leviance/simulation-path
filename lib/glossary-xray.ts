export const xrayGlossaryTerms = [
  {
    id: "xray-optical-depth",
    term: "X-ray optical depth",
    definition:
      "Với ray normalized, tau=sum(mu_i*L_i) là tích phân hệ số suy giảm trên đoạn source→detector. Các lớp cộng tau nhưng nhân transmission T=exp(-tau). Overlap cộng mu chỉ đúng với chính sách medium bổ sung, không tự thay thế vật liệu.",
  },
  {
    id: "xray-flat-field-log",
    term: "Flat-field và ảnh log",
    definition:
      "I0 là tín hiệu không có vật thể tại pixel, I là tín hiệu qua vật thể; ratio=I/I0. Với mono và mô hình lý tưởng, p=-ln(ratio)=tau. Exposure đổi I/I0 cùng tỉ lệ nên không đổi ratio. Floor tránh log(0) phải có flag, palette/display range không sửa raw measurement.",
  },
  {
    id: "xray-two-energy",
    term: "Phổ hai thành phần và beam hardening minh họa",
    definition:
      "T=w*exp(-tauLow)+(1-w)*exp(-tauHigh). Phải cộng intensity rồi mới log, không lấy exp của tau trung bình. Khi muLow>muHigh, thành phần ít suy giảm dần chiếm ưu thế trong tín hiệu truyền qua, làm p theo độ dày không còn tuyến tính; đây chưa phải mô hình phổ X-ray đã hiệu chuẩn.",
  },
];
