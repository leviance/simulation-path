import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "REDUCTION & PREFIX SUM LAB",
    title: "Một triệu số đi qua cây GPU như thế nào?",
    description:
      "Theo dõi dãy số đi qua shared memory, partial sums và các tầng reduction hoặc exclusive scan. Canvas 2D dùng để giải thích thuật toán cùng những điểm cần đồng bộ; thời gian hiển thị chỉ là mô hình, không phải benchmark GPU thật.",
  },
  modes: {
    "reduction-scan-contract": {
      title: "Reduction và scan trả về hai kiểu kết quả nào?",
      description:
        "Sửa tám số đầu vào rồi so một tổng duy nhất với cả dãy prefix. Hãy bật inclusive để thấy vị trí của phép cộng có thể làm toàn bộ kết quả thay đổi.",
    },
    "hierarchy-plan": {
      title: "1.000.003 phần tử cần bao nhiêu tầng?",
      description:
        "Đổi số phần tử và kích thước block để xem số workgroup, phần đệm bằng 0 và chuỗi 1.000.003 → 1.954 → 4 → 1 được tính trước khi dispatch.",
    },
    "workgroup-reduction": {
      title: "512 giá trị co về một tổng ra sao?",
      description:
        "Đi từng bước từ lúc nạp dữ liệu đến các stride 256 → 1. Bạn có thể chọn một lane và tắt barrier để thấy bước sau đọc phải giá trị cũ trong shared memory.",
    },
    "hierarchical-reduction": {
      title: "Partial sums tiếp tục đi đâu?",
      description:
        "Theo dõi dữ liệu lần lượt đi qua input, scratch A và scratch B; CPU chỉ cần đọc một giá trị sau khi tầng cuối hoàn thành.",
    },
    "blelloch-scan": {
      title: "Upsweep và downsweep tạo exclusive prefix thế nào?",
      description:
        "Chạy từng bước với tám số, lưu tổng ở nút gốc, đặt nút này về 0 rồi quan sát cây phân phối prefix trở xuống.",
    },
    "block-scan": {
      title: "Vì sao local prefix vẫn chưa phải global prefix?",
      description:
        "Tách dãy thành nhiều block để thấy mỗi block đều bắt đầu lại từ 0. Tổng của từng block được gom vào một buffer riêng cho bước tiếp theo.",
    },
    "recursive-uniform-add": {
      title: "Block offset được cộng ngược trở xuống ra sao?",
      description:
        "Theo dõi bước scan các block sum rồi cộng offset ngược từ tầng nhỏ về tầng lớn, biến prefix trong từng block thành prefix của toàn bộ dãy.",
    },
    "pass-barriers": {
      title: "Sau mỗi pass, bước nào sẽ đọc buffer tiếp theo?",
      description:
        "Chèn, bỏ hoặc đổi SHADER_STORAGE/BUFFER_UPDATE bit để xem buffer nào có thể bị đọc quá sớm ở lần dispatch hoặc readback tiếp theo.",
    },
    "scan-validation": {
      title: "Một scan trông tăng dần đã chắc đúng chưa?",
      description:
        "Chèn NaN, làm sai offset hoặc phần tử cuối rồi kiểm tra output[0], chênh lệch giữa hai phần tử kề nhau, tổng cuối, vị trí sai đầu tiên và sai số lớn nhất.",
    },
    "reduction-scan-final": {
      title: "Toàn bộ chuỗi reduction/scan đã chạy đúng chưa?",
      description:
        "Đổi phép toán, số phần tử và seed; chạy từng pass hoặc bật tự động, xem mô hình thời gian và xác nhận CPU không phải đọc dữ liệu giữa chừng.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
