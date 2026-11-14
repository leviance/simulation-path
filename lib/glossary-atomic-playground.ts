import type { GlossaryTerm } from "./glossary";

export const atomicPlaygroundGlossaryTerms: GlossaryTerm[] = [
  {
    id: "atom-density",
    term: "Mật độ xác suất orbital — Probability density",
    definition:
      "Trong mô hình hydrogen một electron của Project 45, ρ=|ψ|² là mật độ xác suất theo thể tích, không phải một xác suất tại một điểm. Tích phân ρ trên một vùng mới cho xác suất. Mỗi điểm vẽ là một vị trí lấy mẫu; một triệu điểm không phải một triệu electron. Khoảng cách dùng đơn vị a₀, nên mật độ có đơn vị a₀⁻³.",
    keywords: "atomic orbital hydrogen density electron mật độ xác suất a0",
  },
  {
    id: "atom-real-basis",
    term: "Orbital thực, thùy và vùng nút — Real orbital basis",
    definition:
      "Bộ field được cung cấp dùng các hàm góc thực để hiện thùy và vùng có ψ=0. Dấu của ψ dùng để tô hai nhóm màu, không phải điện tích âm/dương và cũng không làm mật độ ρ âm. Các dạng 2px/2py/2pz là những hướng khác nhau trong bộ cơ sở này; đây không phải quỹ đạo một electron bay quanh hạt nhân.",
    keywords: "real basis lobe node nodal sign phase orbital thùy nút",
  },
  {
    id: "atom-volume-measure",
    term: "Trọng số theo thể tích — Volume measure",
    definition:
      "Với μ=cosθ, phần tử thể tích là r² dr dμ dφ. Vì vậy bảng bán kính dùng r²R²dr, bảng góc dùng Y²dμdφ. Chọn đều r không cho phân bố đều theo thể tích; với quả cầu bán kính R, phép kiểm đơn giản là r=R∛u, μ đều trên [-1,1] và φ đều trên [0,2π).",
    keywords: "volume Jacobian radial spherical mu cosine sin theta r squared",
  },
  {
    id: "atom-tail-domain",
    term: "Miền hữu hạn và phần đuôi — Finite domain and tail",
    definition:
      "Orbital không kết thúc tại một bán kính cố định. Sampler chỉ giữ r≤Rmax và chuẩn hóa trong miền đó; tailMass báo xác suất của mô hình đầy đủ bị bỏ ngoài miền. Không được đánh đồng xác suất có điều kiện này với xác suất toàn không gian, hoặc coi các điểm bị mặt cắt che là phần đuôi vật lý.",
    keywords: "Rmax tail truncation normalization conditional miền hữu hạn đuôi",
  },
  {
    id: "atom-cdf",
    term: "Bảng CDF và phép lấy mẫu ngược — Inverse CDF",
    definition:
      "CDF cộng dồn các trọng số hữu hạn, không âm sau chuẩn hóa. Một số u trong (0,1) chọn đoạn bằng upper_bound; các đoạn có khối lượng bằng 0 không được chọn. Dịch ngẫu nhiên trong ô tránh đặt mọi mẫu ở tâm ô nhưng vẫn chỉ tạo một xấp xỉ theo ô, không biến bảng hữu hạn thành hàm liên tục chính xác.",
    keywords: "PDF CDF inverse upper_bound jitter histogram weighted sampling",
  },
  {
    id: "atom-counter-rng",
    term: "RNG theo seed và ID mẫu — Counter-based random inputs",
    definition:
      "Mỗi giá trị ngẫu nhiên được tính từ seed, ID mẫu và số thứ tự chiều ngẫu nhiên. Chia job thành batch khác nhau không đổi vị trí của cùng một ID. Project 45 dùng 23 bit cao của giá trị trộn để tạo số float nằm trong (0,1), tránh hai đầu mút khi đảo CDF; seed giống nhau chỉ tái lập khi các tham số khác cũng giống nhau.",
    keywords: "counter RNG seed index dimension reproducible batch open interval",
  },
  {
    id: "atom-gpu-generation",
    term: "Sinh mẫu thật trên GPU — GPU-generated samples",
    definition:
      "Compute shader ghi trực tiếp các vị trí vào SSBO mà renderer đọc. Cấp phát chỗ cho N điểm chưa có nghĩa là đã sinh N điểm hợp lệ. requested là số yêu cầu, generated là số đã xử lý, accepted là số đạt kiểm tra và drawn là số gửi để vẽ; điểm bị clip hoặc ngoài camera còn có thể không hiện thành pixel. Tải cả triệu vị trí từ CPU lên không đáp ứng mục tiêu sinh mẫu GPU.",
    keywords: "SSBO compute generated accepted requested drawn allocation capacity GPU",
  },
  {
    id: "atom-candidate",
    term: "Cloud đang dựng và cloud đã kiểm — Candidate / last-good",
    definition:
      "Khi đổi orbital hay seed, cloud mới được dựng riêng. Chỉ khi đủ số mẫu, không có dữ liệu lỗi và job hoàn tất mới thay cloud đang xem. Cancel hoặc lỗi cấp phát giữ cloud cũ cùng nhãn cũ. Budget phải tính đồng thời cloud đang dùng, candidate, pane so sánh, bảng CDF và framebuffer; không chỉ tính bộ nhớ của kết quả cuối.",
    keywords: "candidate last good publish cancel memory peak budget cloud job",
  },
  {
    id: "atom-transfer-function",
    term: "Từ mẫu tới độ sáng — Display transfer function",
    definition:
      "Splat, opacity, palette, exposure và tone mapping biến dữ liệu mẫu thành pixel dễ quan sát. Các splat chồng lên nhau làm vùng dày sáng hơn, nhưng màu trên màn hình không phải một thang xác suất tuyến tính. Dùng thêm densityBoost sẽ nhân mật độ thêm một lần và phải ghi rõ là chế độ hiển thị, không dùng độ sáng đó để đo phân bố.",
    keywords: "splat opacity exposure HDR tone mapping brightness legend density boost",
  },
  {
    id: "atom-clip-probability",
    term: "Mặt cắt không chuẩn hóa lại phân bố — Clipping",
    definition:
      "Mặt cắt chỉ ẩn một phần cloud để nhìn cấu trúc bên trong. Nó không sinh lại mẫu, không thay field và không đổi mẫu số N của phép đo trên cloud đầy đủ. Vùng đo được xác định trong world space, tách khỏi góc nhìn; phần còn thấy không được tự động gán tổng xác suất bằng 1.",
    keywords: "clip clipping plane world space full denominator normalized visible",
  },
  {
    id: "atom-region-estimate",
    term: "Ước lượng xác suất trong vùng — Region estimate",
    definition:
      "Với k trong N mẫu accepted nằm trong vùng, p̂=k/N ước lượng xác suất trong miền lấy mẫu. Sai số chuẩn lấy mẫu xấp xỉ √[p̂(1−p̂)/N]; khoảng Wilson vẫn có ý nghĩa hơn khi k=0 hoặc k=N. Đây không bao gồm sai lệch do bảng, float hay Rmax. Quả cầu tâm gốc có tham chiếu theo CDF bán kính; khi dời tâm, không được tiếp tục ghi tham chiếu đó là chính xác.",
    keywords: "region estimate binomial Wilson uncertainty histogram count probability probe",
  },
  {
    id: "atom-table-error",
    term: "Sai số lấy mẫu và sai lệch xấp xỉ — Sampling uncertainty / bias",
    definition:
      "Đổi seed làm dao động kết quả hữu hạn; tăng N thường giảm dao động cỡ 1/√N. Bảng midpoint hữu hạn, lưu CDF bằng float và cắt miền tại Rmax là các nguồn sai lệch riêng. Tăng N không tự sửa một bảng sai. Cần nhiều seed, nhiều độ phân giải bảng và tham chiếu độc lập, không dùng bảng của chính sampler làm bằng chứng duy nhất.",
    keywords: "bias variance uncertainty midpoint table resolution precision independent oracle",
  },
  {
    id: "atom-common-scale",
    term: "So sánh trên cùng thang — Common-scale comparison",
    definition:
      "Hai pane cần dùng cùng đơn vị a₀ và thang camera chung khi muốn so kích thước orbital. Auto-fit từng pane có thể làm hai orbital khác cỡ trông bằng nhau, nên phải tách chế độ và ghi nhãn. Mỗi pane có N, seed, Rmax và bộ nhớ riêng; dùng cùng màu hay cùng độ sáng không có nghĩa là hai pane có cùng xác suất trong một vùng.",
    keywords: "compare common scale auto fit camera panes a0 budget orbital size",
  },
];
