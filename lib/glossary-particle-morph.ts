import type { GlossaryTerm } from "./glossary";
export const particleMorphGlossaryTerms: GlossaryTerm[] = [
  {
    id: "morph-area-cdf",
    term: "Lấy mẫu mesh theo diện tích — Area-weighted CDF",
    definition:
      "Gán xác suất cho mỗi tam giác theo diện tích của nó. CDF lưu tổng diện tích cộng dồn; một số đều chọn đoạn CDF, rồi barycentric đặt mẫu trong tam giác. Chọn đều index của tam giác không đồng nghĩa đều theo diện tích bề mặt.",
    keywords: "sampling mesh area weighted CDF diện tích xác suất triangle",
  },
  {
    id: "morph-barycentric",
    term: "Barycentric sampling trong tam giác",
    definition:
      "Với u,v độc lập đều trên [0,1), đặt r=sqrt(u), các trọng số là 1-r, r(1-v), rv. Nhân ba đỉnh với ba trọng số cho một điểm trong mặt; tổng bằng 1 và centroid của nhiều mẫu tiến tới trung bình ba đỉnh.",
    keywords: "barycentric sampling triangle sqrt centroid trọng số tam giác",
  },
  {
    id: "morph-density",
    term: "Mật độ mẫu so với diện tích",
    definition:
      "Trong Project 42, các tam giác được gom vào 16 nhóm theo độ cao tâm mặt. Expected bằng N nhân phần diện tích nhóm; observed là số mẫu thực. Tỷ số observed/expected giúp thấy mẫu lệch. Các nhóm không phải các lát cắt liên tục chính xác của mesh.",
    keywords: "histogram density mật độ observed expected diện tích mẫu thiên lệch",
  },
  {
    id: "morph-correspondence",
    term: "Correspondence — Ghép ID nguồn với ID đích",
    definition:
      "Một permutation ánh xạ N ID nguồn tới N ID đích, mỗi đích đúng một lần. Random và spatial của Project 42 dùng cùng các vị trí đã lấy mẫu; đổi A/B chỉ đổi ánh xạ. ID khác nhau vẫn có thể trùng vị trí trong không gian do lượng tử hóa hoặc lấy mẫu.",
    keywords: "correspondence bijection permutation song ánh ID mapping random",
  },
  {
    id: "morph-spatial-order",
    term: "Spatial order cho particle morph",
    definition:
      "Lượng tử hóa vị trí trong hộp [-3,5;3,5] mỗi trục thành 32 ô, xen kẽ bit để có Morton key, stable counting sort rồi ghép nguồn/đích cùng hạng. Trong cùng ô, thứ tự ID phá hòa. Đây là cách hữu hạn giúp so chuyển động, không tối ưu tổng quãng đường và không bảo đảm topology liên tục.",
    keywords: "spatial order Morton key stable counting sort optimal transport ghép điểm",
  },
  {
    id: "morph-model-time",
    term: "Model time, easing và đường morph",
    definition:
      "Model time là thời gian do Play/Pause/scrub điều khiển; t=time/duration. Easing đổi nhịp t, không tạo lực. Đường cung thêm offset nhân sin(pi s) vào lerp. Flow dùng nhịp riêng và độ lệch xoay cố định theo ID, nhân sin²(pi s) để độ lệch và đạo hàm của nó về 0 ở hai đầu; nhánh t=0/1 chép đúng endpoints vì sin(pi) trong floating-point không chính xác tuyệt đối bằng 0.",
    keywords: "model time easing smoothstep interpolation lerp morph delta time",
  },
  {
    id: "morph-buffer-plan",
    term: "Payload và peak memory của studio hạt",
    definition:
      "Layout C++ gồm source, target, current, path mỗi record 16 byte, mapping hai uint32 là 8 byte. Payload là 72N+16 byte do canary của CURRENT. Peak còn kể ACTIVE/candidate cùng tồn tại và phần dự phòng; đây không phải lượng VRAM còn trống hay heap JavaScript.",
    keywords: "SSBO std430 memory plan payload peak canary source target current path",
  },
  {
    id: "morph-generation",
    term: "Candidate, ACTIVE và last-good",
    definition:
      "Mỗi yêu cầu chuẩn bị có một generation riêng. CPU lấy mẫu và ghép theo batch; GPU tải vào candidate buffers. Chỉ khi tất cả hoàn tất mới đổi cả dữ liệu lẫn nhãn ACTIVE. Hủy, input lỗi hoặc upload thất bại không được công bố candidate nửa chừng.",
    keywords: "candidate generation transactional active last good cancel batch",
  },
  {
    id: "morph-tail-guard",
    term: "Tail guard và canary ở compute dispatch",
    definition:
      "Với local size 256, ceil(N/256) nhóm có thể tạo lane dư. Shader phải return khi id>=N trước khi đọc hoặc ghi. Một record canary đặt sau CURRENT[N-1] giúp kiểm lần ghi vượt cuối gần nhất; không thay mọi kiểm index và không chứng minh được mọi lỗi bộ nhớ.",
    keywords: "compute workgroup invocation tail guard canary dispatch ceil",
  },
  {
    id: "morph-timings",
    term: "Đo chi phí của particle morph",
    definition:
      "Tách CPU sampling/matching, CPU submit upload, GPU update/draw và wall time của frame. Query GPU được đọc sau khi có kết quả; chưa có không phải 0 ms. Khi Pause không dispatch mới, last-update time là phép đo lần cập nhật gần nhất, không phải chi phí update của frame đang đứng yên.",
    keywords: "timings profiler asynchronous GPU query sampling matching upload draw frame",
  },
];
