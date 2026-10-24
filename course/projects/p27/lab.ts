import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "BRUTE-FORCE PARTICLE QUERY LAB",
    title: "Tìm mọi hạt gần con trỏ",
    description:
      "Rê vòng tròn qua 100.000 hạt, đổi N và R rồi đo số lần kiểm cùng thời gian query. Không dùng grid hay tree.",
  },
  modes: {
    "brute-scene": {
      title: "Dữ liệu 100.000 hạt được tạo và vẽ thế nào?",
      description:
        "Đổi N và seed rồi quay lại cấu hình cũ; cả Canvas và C++ đều vẽ toàn bộ số hạt đã chọn.",
    },
    "brute-circle": {
      title: "Đặt vòng tròn đúng chỗ chuột đang trỏ",
      description:
        "Đổi vị trí chuột sang world, thay R và kiểm riêng hạt index 0. Điểm trên biên cũng được nhận.",
    },
    "brute-scan": {
      title: "Đi lần lượt từ hạt đầu tới hạt cuối",
      description:
        "Giảm số hạt đã quét rồi tiến từng bước. Danh sách hit chỉ đầy đủ khi đã kiểm đủ N hạt.",
    },
    "brute-squared": {
      title: "Bỏ phép căn có làm đổi kết quả?",
      description:
        "Chạy reference và squared distance trên cùng dữ liệu; đối chiếu toàn bộ hit indices và nearest, không chỉ số hit.",
    },
    "brute-benchmark": {
      title: "Đo đúng phần việc muốn biết",
      description:
        "Chạy 24 warm-up rồi đo 48 query, giữ checksum và exact scans. Job có tiến độ, có thể hủy giữa các query.",
    },
    "brute-scaling": {
      title: "Tăng N thì phải làm thêm bao nhiêu việc?",
      description:
        "Giữ cùng bộ query trên ba prefix 1.000 / 10.000 / 100.000. Đọc số lần kiểm trước, rồi mới so timing.",
    },
    "brute-validation": {
      title: "Một baseline đủ rõ để dùng lại ở Project 28",
      description:
        "Thử kính lúp, auto probe, clean mode và bảng scaling; kiểm cả reset, hủy và mất focus, không chỉ trường hợp chạy thuận lợi.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
