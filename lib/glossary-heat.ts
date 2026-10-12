export const heatGlossaryTerms = [
  {
    id: "normalized-temperature",
    term: "Nhiệt độ dư chuẩn hóa",
    definition:
      "theta = (T - T_môi_trường) / (T_nóng - T_môi_trường). Giá trị 0 là môi trường, 1 là mốc nóng đã chọn. Đơn vị bị khử; không đọc theta như độ C hoặc nhiệt lượng.",
  },
  {
    id: "heat-laplacian",
    term: "Laplacian rời rạc",
    definition:
      "Trong mô hình lưới chữ nhật, cộng sai phân bậc hai theo x và y: (trái - 2*tâm + phải)/dx² + (trên - 2*tâm + dưới)/dy². Nó đo xu hướng nhiệt độ tại ô tăng hay giảm do các ô lân cận, không phải vận tốc một hạt.",
  },
  {
    id: "heat-double-buffer",
    term: "Double buffer trong solver nhiệt",
    definition:
      "current chứa cùng một thời điểm cũ; next nhận tất cả kết quả mới. Chỉ đổi vai hai mảng sau khi tính xong lưới. Cơ chế này tránh ô phía sau đọc lẫn giá trị vừa cập nhật của ô phía trước.",
  },
  {
    id: "heat-boundary",
    term: "Điều kiện biên nhiệt",
    definition:
      "Biên cách nhiệt ngăn dòng nhiệt qua mặt ngoài. Biên nhiệt độ cố định giữ một mức nhiệt nhờ trao đổi với môi trường. Project 47 dùng ghost bằng ô sát biên cho cách nhiệt, và cố định cả vành ô ngoài ở 0 cho chế độ lạnh.",
  },
  {
    id: "heat-stability",
    term: "Điều kiện ổn định khuếch tán",
    definition:
      "Với explicit Euler và stencil năm điểm, rx=alpha*dt/dx², ry=alpha*dt/dy² phải không âm và rx+ry không vượt 1/2. Khi dx=dy, mỗi hệ số không vượt 1/4. Điều kiện này không đảm bảo mọi sai số rời rạc đều nhỏ.",
  },
] as const;
