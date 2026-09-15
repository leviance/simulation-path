import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "BRUTE-FORCE PARTICLE QUERY LAB",
    title: "Chiếc kính lúp phải đọc bao nhiêu particle?",
    description:
      "Kéo query circle qua particle cloud, đổi N/radius/seed và đo riêng số scans, hits, nearest particle, checksum cùng thời gian trên mỗi query.",
  },
  modes: {
    "brute-scene": {
      title: "100.000 particles được tạo và vẽ từ dữ liệu nào?",
      description:
        "Đổi N và seed để kiểm cloud deterministic; Canvas có thể lấy mẫu khi vẽ nhưng data/query workload vẫn giữ đúng số đã chọn.",
    },
    "brute-circle": {
      title: "Pointer trở thành center và radius trong world space ra sao?",
      description:
        "Kéo kính lúp, đổi radius và đọc world coordinate; particle trên boundary được tính là hit theo quy ước inclusive.",
    },
    "brute-scan": {
      title: "Brute force đã đi qua mảng theo thứ tự nào?",
      description:
        "Giảm scan progress rồi tiến từng bước; hits chỉ đầy đủ khi scanned đạt N vì thuật toán không có thông tin để bỏ qua particle nào.",
    },
    "brute-squared": {
      title: "Bỏ sqrt có làm thay đổi kết quả không?",
      description:
        "Đối chiếu phiên bản distance dễ đọc với squared distance trên cùng cloud/query; hit count và nearest index phải khớp.",
    },
    "brute-benchmark": {
      title: "Một con số timing đáng tin cần những gì?",
      description:
        "Chạy warm-up rồi đo một query set deterministic; đọc time/query, exact scans và checksum thay vì dùng FPS tổng.",
    },
    "brute-scaling": {
      title: "Chi phí tăng thế nào từ 1.000 lên 100.000 particles?",
      description:
        "Chạy cùng query set trên ba prefix và xem time/query cùng total scans tăng theo N.",
    },
    "brute-validation": {
      title: "Baseline brute force đã đủ rõ để so với Spatial Grid chưa?",
      description:
        "Kiểm seed, boundary, reference agreement, workspace reuse, exact work, bounded benchmark và interaction trước Project 28.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
