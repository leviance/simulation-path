import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  base: {
    label: "PARTICLE MORPH STUDIO",
    title: "Cùng một bộ điểm, hai cách chuyển động",
    description:
      "Canvas CPU tối đa 4.096 mẫu dùng cùng công thức với C++. Mốc một triệu hạt, SSBO và timings GPU được kiểm riêng trên ứng dụng native.",
  },
  modes: {
    first: {
      title: "Từ cầu sang xuyến",
      description:
        "Kéo t trước khi Play. Theo dõi một ID để thấy đây là nội suy, không phải lực hút.",
    },
    area: {
      title: "Hai tam giác 1:4",
      description: "Đổi u/v của điểm trắng; so số mẫu nhận được khi diện tích tăng bốn lần.",
    },
    sampling: {
      title: "Nhìn mẫu dồn ở đâu",
      description: "Đổi area sang mỗi tam giác như nhau, áp dụng rồi so histogram và màu mật độ.",
    },
    matching: {
      title: "A/B trên cùng bộ nguồn/đích",
      description:
        "Giữ t ở giữa, đổi random/spatial mà không rải lại. So các đường nối và độ dài trung bình.",
    },
    timeline: {
      title: "Nhịp thời gian không phải lực",
      description:
        "So Thẳng/Vòng cung với Flow: từng hạt có nhịp riêng, không di chuyển như mảng rời. Thử reverse và hai endpoints.",
    },
    buffers: {
      title: "N mẫu chiếm bao nhiêu byte?",
      description: "Tách N Canvas đang vẽ với phép tính layout C++ ở N=1.000.003.",
    },
    compute: {
      title: "Những lane nằm ngoài N",
      description:
        "Đặt N lẻ để đọc workgroup và tail guard. Canvas minh họa ID, không dispatch GPU.",
    },
    generation: {
      title: "Candidate chưa được đổi nhãn ACTIVE",
      description:
        "Tạm dừng chuẩn bị, tiến từng batch, đổi yêu cầu hoặc hủy rồi đọc generation đang hiện.",
    },
    inspector: {
      title: "Đọc một ID và vài đường đi",
      description:
        "Dùng subset đường đi cùng histogram để kiểm điều mà hình ảnh gợi ý, không coi mọi mẫu là một phép đo hiệu năng.",
    },
    showcase: {
      title: "Tự điều khiển một lượt biến hình",
      description:
        "Chọn hình, seed, sampling và cách ghép. Giữ camera tự do trong khi timeline hoặc candidate đang chạy.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
