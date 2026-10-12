export const fieldGlossaryTerms = [
  {
    id: "vector-field",
    term: "Vector field — trường vector",
    definition:
      "Hàm gán một vector cho mỗi vị trí. Trong Project 48, v(x,y)=(vx,vy) có thể được xem là vận tốc được cho trước; mũi tên là cách vẽ một số mẫu của hàm đó.",
  },
  {
    id: "field-gradient",
    term: "Gradient — vector độ dốc",
    definition:
      "Gradient nhận trường scalar phi và trả vector (∂phi/∂x, ∂phi/∂y). Nó chỉ hướng phi tăng nhanh nhất, độ dài cho tốc độ tăng theo hướng đó. Nó chỉ là velocity nếu mô hình chọn như vậy.",
  },
  {
    id: "field-divergence",
    term: "Divergence — độ phân kỳ",
    definition:
      "Trong 2D, divergence bằng ∂vx/∂x+∂vy/∂y: dòng đi ra ròng trên một đơn vị diện tích trong giới hạn vùng nhỏ. Dương là tỏa, âm là hút; giá trị vector lớn không tự suy ra divergence lớn.",
  },
  {
    id: "field-curl",
    term: "Curl z — xu hướng quay cục bộ trong 2D",
    definition:
      "Curl z bằng ∂vy/∂x−∂vx/∂y. Với world x sang phải và y lên trên, giá trị dương tương ứng quay ngược kim đồng hồ. Trường trượt cũng có curl; quay cứng có curl bằng hai lần tốc độ góc.",
  },
  {
    id: "one-sided-derivative",
    term: "One-sided derivative — sai phân đạo hàm một phía",
    definition:
      "Ước lượng đạo hàm tại mép bằng các mẫu trong miền. Project 48 dùng (−3f0+4f1−f2)/(2h) ở đầu thấp và công thức đối xứng ở đầu cao, cùng độ chính xác bậc hai với sai phân trung tâm cho hàm đủ trơn.",
  },
  {
    id: "flow-tracer",
    term: "Flow tracer — hạt đánh dấu dòng chảy",
    definition:
      "Điểm di chuyển theo dp/dt=v(p,t) để nhìn đường đi. Tracer trong Project 48 lấy velocity bằng bilinear và dùng midpoint RK2; được gieo lại khi ra khỏi miền, vì vậy mật độ chấm không phải mô phỏng khối lượng chất lỏng.",
  },
];
