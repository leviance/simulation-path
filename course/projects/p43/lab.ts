import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "PERIODIC MOLECULAR BOX",
    title: "Đi hết hộp không có nghĩa là gặp một bức tường",
    description:
      "Cho hạt đi qua biên, so khoảng cách thường với minimum image và quan sát bản sao tuần hoàn. Solver chỉ giữ hạt trong ô gốc; đồ thị unwrapped cho biết hạt thực sự đã đi tới đâu.",
  },
  modes: {
    "pbc-box": {
      title: "Hai hạt đang ở hai mép của cùng một ô",
      description:
        "Nhìn ô gốc và tọa độ của hạt trước khi thêm chuyển động. Các marker chỉ đánh dấu vị trí, không quyết định kích thước nguyên tử.",
    },
    "pbc-wrap": {
      title: "Đi qua mép trái, xuất hiện ở mép phải",
      description:
        "Chạy một hạt tự do để kiểm tra wrap ở cả hai trục. Vận tốc không đổi khi hạt vượt biên; đây không phải phản xạ ở tường.",
    },
    "pbc-distance": {
      title: "Hai hạt cách nhau 10.8 hay 1.2?",
      description:
        "Kéo hạt A hoặc dùng các phím mũi tên. Đường xám là vector tọa độ thông thường; đường vàng đi qua ảnh gần nhất của hạt B.",
    },
    "pbc-forces": {
      title: "Lực cũng phải đi theo đường ngắn qua biên",
      description:
        "Đọc vector lực và số cặp trong cutoff. Đây vẫn là bước thử công thức lực, chưa dùng lực để thay đổi vận tốc.",
    },
    "pbc-verlet": {
      title: "Thay phản xạ bằng wrap trong bước drift",
      description:
        "Chạy hệ nhiều hạt bằng kick–drift–wrap–kick. Tiến từng bước để theo dõi năng lượng và tổng động lượng.",
    },
    "pbc-images": {
      title: "Chín vị trí vẽ, chỉ một state vật lý",
      description:
        "Bật/tắt các bản sao xám và theo dõi N cùng số cặp. Hiệu ứng hiển thị không được thay đổi lực hoặc chuyển động.",
    },
    "pbc-unwrapped": {
      title: "Đường đi liên tục phía sau bước nhảy trên màn hình",
      description:
        "Preset một hạt giữ vận tốc cố định. So wrapped x với unwrapped x để thấy vì sao hiệu hai vị trí trong hộp không cho quãng đường thực.",
    },
    "pbc-final": {
      title: "Một hộp tuần hoàn đã được kiểm chứng",
      description:
        "Chọn preset, sửa vị trí A, bật ảnh và chạy phép kiểm năng lượng/động lượng hữu hạn. CTest kiểm tra thêm các ca hình học và lỗi đầu vào.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
