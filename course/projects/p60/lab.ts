import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOXEL RAY EDITOR",
    title: "Ngắm, chọn và sửa đúng một block",
    description:
      "Dõi theo tia từ pixel đang ngắm, xem nó đi qua từng ô rồi thử phá hoặc đặt một block.",
  },
  modes: {
    "pick60-1": {
      title: "Đặt tâm ngắm lên khối đất",
      description:
        "Dịch tâm ngắm bằng mouse hoặc WASD trên khối đất có sẵn, trước khi thêm thuật toán chọn block.",
    },
    "pick60-2": {
      title: "Từ pixel đang ngắm đến tia trong world",
      description:
        "Xem origin và direction của tia qua pixel. Camera trực giao tạo các tia song song, không phát từ một mắt chung.",
    },
    "pick60-3": {
      title: "Tìm đoạn tia thật sự đi trong chunk",
      description:
        "Đổi tầm với để xem tia có đoạn đi trong chunk hay chỉ MISS; thử cả những pixel ngoài khối đất.",
    },
    "pick60-4": {
      title: "Đi qua từng ô bằng 3D DDA",
      description:
        "Đi từng ô theo thứ tự gần đến xa. Chưa dừng ở đất để bạn dễ kiểm đường DDA trên chunk rỗng.",
    },
    "pick60-5": {
      title: "Dừng ở block đầu tiên và đọc pháp tuyến",
      description:
        "Dừng ở ô đặc đầu tiên và đọc normal hướng ra. Xoay camera để kiểm mặt vừa đi vào.",
    },
    "pick60-6": {
      title: "Phá đúng một block mỗi lần nhấn",
      description:
        "Mỗi lần nhấn chỉ phá một block. Giữ hoặc kéo chuột không đào xuyên đất liên tục.",
    },
    "pick60-7": {
      title: "Đặt block vào ô Air kề mặt vừa chọn",
      description:
        "Outline xanh chỉ ô Air có thể đặt. Thử các vật liệu và quan sát khi ô đích chạm biên chunk.",
    },
    "pick60-8": {
      title: "Tách input, query và cập nhật mesh",
      description:
        "Dùng counter để thấy đổi aim không dựng mesh, xoay camera không dựng mesh và edit mới thay đổi geometry.",
    },
    "pick60-9": {
      title: "Kiểm chứng picker và hoàn thiện editor",
      description:
        "Thử editor hoàn chỉnh. Nút sanity chỉ kiểm trace hữu hạn; bộ oracle đầy đủ chạy trong Node/CTest.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
