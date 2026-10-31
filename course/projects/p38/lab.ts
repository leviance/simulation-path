import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "CHARGED PARTICLE CHAMBER",
    title: "Dự đoán quỹ đạo rồi kiểm bằng state thực",
    description:
      "Canvas 2D chiếu tối đa 256 hạt CPU ra không gian phối cảnh. Cùng biến/công thức với C++ nhưng không phải GPU benchmark hay bằng chứng một triệu hạt; native là sản phẩm cuối.",
  },
  modes: {
    "chamber-view": {
      title: "Đổi camera, không đổi state",
      description: "Pause rồi orbit/pan/zoom, nhìn grid và đọc position không đổi.",
    },
    "particle-state": {
      title: "Đọc layout và ID của một hạt",
      description: "Chọn ID, đọc x/v/q/m và offset dự kiến trong record C++/GLSL 32 byte.",
    },
    "lorentz-force": {
      title: "Lực nào làm vận tốc quay?",
      description: "Tách gia tốc do E và v×B; dùng Euler có chủ đích để quan sát speed tăng sai.",
    },
    "boris-step": {
      title: "Đi qua các biến trung gian của Boris",
      description: "Pause/Một bước rồi đọc vMinus, t, s, vPrime và mốc full-time.",
    },
    "chamber-reference": {
      title: "So dt và dt/2 tại cùng T",
      description:
        "Đối chiếu một hạt CPU với nghiệm độc lập bằng job hữu hạn, không phải GPU validation.",
    },
    "chamber-budget": {
      title: "N có vượt giới hạn đã nhập không?",
      description:
        "Đổi N/SSBO limit giả định để đọc bytes/groups/tail; không giả đọc GPU trình duyệt.",
    },
    "chamber-compute": {
      title: "Consumer nào đọc state sau dispatch?",
      description:
        "So hợp đồng shader SSBO, CPU readback và fence, không giả lỗi cache ngẫu nhiên.",
    },
    "chamber-clock": {
      title: "Tick khác wall time thế nào?",
      description: "Pause, step, reset và đọc discarded time; camera vẫn dùng được khi dừng.",
    },
    "chamber-probe": {
      title: "Theo dõi ID và vệt bị chặn",
      description: "Chọn một ID mẫu và xem state/sai số; native chỉ click 32 ID được probe.",
    },
    "chamber-validation": {
      title: "Một phép kiểm phải có điểm dừng",
      description: "Khóa snapshot, xem tiến độ đối chiếu CPU và hủy; incomplete không PASS.",
    },
    "chamber-measurement": {
      title: "Ba đồng hồ đo ba phạm vi",
      description:
        "Đọc scope update GPU, particle draw GPU và frame CPU+present; không sinh timing giả.",
    },
    "charged-chamber": {
      title: "Buồng hạt tích điện: bản minh họa",
      description: "Đổi E/B/q/v0/preset, so nghiệm và kiểm phân biệt STAGED/ACTIVE.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
