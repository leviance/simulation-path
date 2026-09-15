import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "MILLION VECTOR GPU LAB",
    title: "Một triệu vector được chia cho các GPU invocation thế nào?",
    description:
      "Theo dõi cùng một bộ dữ liệu từ Vec4 trên CPU sang SSBO std430, workgroup, kiểm tra biên, memory barrier và bước đối chiếu kết quả. Canvas chỉ giải thích cách dữ liệu đi qua hệ thống, không phải GPU benchmark thật.",
  },
  modes: {
    "vector-workload": {
      title: "Mỗi phần tử cần tính kết quả gì?",
      description:
        "Chọn Add, AXPY hoặc Difference, thay đổi scalar rồi so `A[i]`, `B[i]` và kết quả CPU trước khi chạy GPU.",
    },
    "compute-limits": {
      title: "Local size 256 phải vượt qua những giới hạn nào?",
      description:
        "Thử các cấu hình phần cứng khác nhau để thấy chương trình từ chối local size, group count hoặc SSBO quá lớn trước khi cấp phát.",
    },
    "ssbo-layout": {
      title: "Bốn thành phần của Vec4 nằm trong std430 như thế nào?",
      description:
        "Chọn một index rồi quan sát byte offset `index * 16`, stride 16 byte và ba binding dành cho A, B và output.",
    },
    "one-workgroup": {
      title: "Từ local ID, GPU tạo global ID như thế nào?",
      description:
        "Chọn một lane trong workgroup rồi đọc local ID, workgroup ID, global ID và phần tử buffer tương ứng.",
    },
    "dispatch-tail": {
      title: "Workgroup cuối xử lý phần đuôi còn thiếu ra sao?",
      description:
        "Đổi N hoặc local size, theo dõi workgroup cuối và xem phép chia làm tròn tạo bao nhiêu lane thừa bị điều kiện kiểm tra biên loại bỏ.",
    },
    "barrier-readback": {
      title: "Sau dispatch, bước nào sẽ đọc output?",
      description:
        "Theo dõi upload → dispatch → barrier → readback, rồi thử bỏ hoặc chọn sai barrier để thấy output có thể vẫn là dữ liệu cũ.",
    },
    "gpu-validation": {
      title: "Sai số bao nhiêu vẫn được xem là hợp lệ?",
      description:
        "Chèn sai số hoặc NaN vào mẫu kiểm tra, thay đổi tolerance rồi đọc maximum error, mismatch count và vị trí sai đầu tiên.",
    },
    "gpu-timing": {
      title: "Compute time khác thời gian end-to-end thế nào?",
      description:
        "Bật hoặc tắt upload và readback trên timeline, so chín mẫu và median để thấy FPS không thể thay thế thời gian của compute kernel.",
    },
    "vector-gpu-final": {
      title: "Máy tính vector đã cho kết quả đáng tin cậy chưa?",
      description:
        "Đổi phép toán, số phần tử và scalar; sau đó kiểm tra dispatch cùng báo cáo CPU–GPU trước khi sang Project 38.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
