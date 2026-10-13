export const fluidGlossaryTerms = [
  {
    id: "mac-grid",
    term: "MAC grid — lưới vận tốc lệch tâm",
    definition:
      "Scalar/pressure nằm ở tâm ô, u nằm trên cạnh dọc và v trên cạnh ngang. Một ô dùng đúng bốn vận tốc cạnh để đo dòng ra; gradient pressure sửa ngay các cạnh đó.",
  },
  {
    id: "semi-lagrangian",
    term: "Semi-Lagrangian advection",
    definition:
      "Từ vị trí mẫu mới, lần ngược về p−dt*v và nội suy state cũ. Bilinear giữ scalar trong khoảng mẫu nhưng có diffusion số và không bảo toàn tổng scalar chính xác.",
  },
  {
    id: "pressure-poisson",
    term: "Pressure Poisson và residual",
    definition:
      "Trong Project 49, A=−D*G và b=−div/dt với density chất lưu bằng 1. Pressure giải A*p=b; RMS(Ap−b) đo sai số phương trình. Tường kín dùng Neumann và chọn mean pressure bằng 0.",
  },
  {
    id: "pressure-projection",
    term: "Pressure projection",
    definition:
      "Sửa velocity bằng v_new=v_old−dt*G(p) để giảm divergence. Với D/G nhất quán trên MAC, divergence sau bằng dt nhân residual vector, tới sai số làm tròn. Solver hữu hạn không đảm bảo divergence bằng 0 tuyệt đối.",
  },
  {
    id: "implicit-viscosity",
    term: "Implicit viscosity — độ nhớt implicit",
    definition:
      "Giải (I−νdt*L)v_new=v_old thay vì cộng Laplacian explicit. Vế phải phải được giữ cố định qua các iteration; số vòng hữu hạn vẫn cần kiểm residual và điều kiện biên.",
  },
  {
    id: "fluid-input-impulse",
    term: "Mouse impulse và lực nổi",
    definition:
      "Impulse chuột trong Project 49 tăng velocity theo quãng kéo, không nhân dt. Buoyancy là lực minh họa tỉ lệ với concentration, được tích phân bằng dt. Hai thao tác có ý nghĩa thời gian khác nhau.",
  },
  {
    id: "fluid-courant",
    term: "Courant number — độ dài bước theo ô",
    definition:
      "Project 49 hiển thị C=dt*max(|u|,|v|)/h. Nó ước lượng số ô backtrace theo một trục trong một bước. Semi-Lagrangian không dùng C≤1 làm điều kiện ổn định scalar, nhưng C lớn có thể làm giảm độ chính xác.",
  },
];
