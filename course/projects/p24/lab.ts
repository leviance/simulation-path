import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "COLLISION TANK LAB",
    title: "Một bể 144 quả bóng cần những bước nào để không xuyên nhau?",
    description:
      "Đổi restitution, fixed dt, solver iterations và số bóng; kéo trên Canvas để kick một bóng rồi theo dõi contact normal, penetration, momentum, energy cùng pair-check cost.",
  },
  modes: {
    "collision-scene": {
      title: "Làm sao tạo 144 state có thể lặp lại?",
      description:
        "Scene dùng lattice không chồng lấn và seeded PRNG cho velocity; reset cùng seed phải cho đúng cùng một đàn bóng.",
    },
    "collision-motion": {
      title: "Render FPS có được quyết định physics step không?",
      description:
        "Quan sát accumulator, substep và dropped time khi toàn bộ position chỉ tiến bằng một fixed dt chung.",
    },
    "collision-walls": {
      title: "Radius và hướng velocity thay đổi wall response ra sao?",
      description:
        "Bóng được đặt lại ngay sát mặt tường; chỉ component velocity đang hướng vào tường mới bị đảo và nhân restitution.",
    },
    "collision-detection": {
      title: "Một circle contact chứa những dữ liệu nào?",
      description:
        "Contact nổi bật cho thấy center delta, normal từ A sang B, radius sum và penetration depth.",
    },
    "collision-impulse": {
      title: "Impulse đổi hai velocity theo mass thế nào?",
      description:
        "Theo dõi relative normal speed, impulse magnitude và kiểm tra separating contact không bị đẩy thêm lần nữa.",
    },
    "collision-correction": {
      title: "Vì sao đổi velocity chưa đủ để hết xuyên nhau?",
      description:
        "Bật/tắt positional correction để thấy penetration tồn tại qua nhiều step, rồi so cách chia correction theo inverse mass.",
    },
    "collision-bruteforce": {
      title: "144 bóng tạo bao nhiêu unordered pair?",
      description:
        "Pair counter phơi bày N(N−1)/2 checks cho mỗi solver iteration; mỗi cặp chỉ xuất hiện một lần nhờ i<j.",
    },
    "collision-validation": {
      title: "Bể trông ổn có thật sự bảo toàn và hữu hạn?",
      description:
        "Chạy stress preset, đọc momentum/energy drift, overlap, maximum penetration và xác nhận state không có NaN.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
