import type { GlossaryTerm } from "./glossary";

export const clothWorkshopGlossaryTerms: GlossaryTerm[] = [
  {
    id: "cloth-xpbd-compliance",
    term: "XPBD và compliance của ràng buộc khoảng cách",
    definition:
      "XPBD sửa vị trí theo sai số ràng buộc, inverse mass và multiplier tích lũy. Với C có đơn vị mét, compliance α có đơn vị m/N; solver dùng α/h² với h tính bằng giây. Project 40 đặt lambda về zero đầu mỗi substep và giữ nó qua các iteration trong substep. Số vòng hữu hạn vẫn để lại sai số; đổi h hoặc iteration không được hứa cho kết quả hoàn toàn bất biến.",
    keywords: "cloth vải XPBD lambda multiplier compliance substep iteration constraint",
  },
  {
    id: "cloth-constraint-coloring",
    term: "Tô màu ràng buộc vải",
    definition:
      "Chia constraints thành các nhóm sao cho hai constraint cùng nhóm không ghi vào cùng vertex. Mỗi màu có một dispatch; các màu nối bằng memory barrier của shader storage. Màu là lịch ownership cho solver, không phải màu hiển thị và không được thay bằng barrier chỉ đồng bộ một workgroup.",
    keywords: "coloring ownership race Gauss Seidel compute shader GPU",
  },
  {
    id: "cloth-vertex-self-contact",
    term: "Self-contact xấp xỉ theo đỉnh",
    definition:
      "Tìm các cặp vertex không kề nhau nhưng ở gần hơn khoảng cách tiếp xúc đã công bố, rồi sửa vị trí để giảm penetration. Grid 3D/CSR chỉ tìm ứng viên; predicate khoảng cách và loại kề topology mới quyết định contact. Mô hình này không kiểm đủ edge/triangle và không có CCD, nên vẫn có thể lọt giao cắt giữa các tam giác hoặc xuyên khi chuyển động quá nhanh.",
    keywords: "cloth thickness self collision vertex topology edge triangle CCD",
  },
  {
    id: "cloth-csr-grid",
    term: "Grid 3D dạng CSR cho tiếp xúc vải",
    definition:
      "Mỗi cell có count và offset; các vertex ID của cell nằm trong một đoạn liên tục của mảng indices. GPU dựng cấu trúc từ vị trí hiện tại theo count → exclusive scan → scatter. Cần kiểm tổng count=N, mỗi ID xuất hiện đúng một lần và ID nằm trong đúng cell; thứ tự atomic scatter bên trong cell không có ý nghĩa vật lý.",
    keywords: "CSR compressed sparse row uniform grid scan scatter contact candidates 3D",
  },
  {
    id: "cloth-material-and-error",
    term: "Tham số vật liệu khác sai số solver",
    definition:
      "Compliance (m/N) quyết định mức mềm của ràng buộc; damping rate (1/s) làm giảm vận tốc theo thời gian; friction trong bản chuẩn là tỷ lệ giảm velocity tiếp tuyến không đơn vị mỗi substep có contact; thickness (m) đặt khoảng cách tiếp xúc. Iteration/substep là lựa chọn giải số. Bend-distance hai cạnh chỉ xấp xỉ chống gập, không phải mô hình góc nhị diện hay mô hình may mặc đầy đủ.",
    keywords: "cloth material compliance damping friction thickness residual bend distance",
  },
  {
    id: "cloth-dynamic-vertices",
    term: "Đỉnh động, đỉnh ghim và workload vải",
    definition:
      "Đỉnh động có inverse mass dương và thật sự được cập nhật; đỉnh ghim có inverse mass bằng zero. Mốc nghiệm thu Project 40 yêu cầu ít nhất 100.000 đỉnh động, toàn topology/constraints tương ứng, contact, velocity và normals trên GPU. Preset một triệu là mở rộng theo ngân sách phần cứng và phải báo riêng, không được dùng số đỉnh cấp phát hoặc số tam giác để thay số đỉnh động.",
    keywords: "cloth dynamic pinned updated drawn vertices 100000 million GPU scale",
  },
];
