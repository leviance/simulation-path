import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "NEAR-PLANE CLIPPING LAB",
    title: "Một triangle đổi hình ra sao khi đi qua near plane?",
    description:
      "Kéo triangle theo trục Z và xem cùng lúc mặt cắt camera space với viewport sau clipping. Mọi count, giao điểm và màu dùng cùng công thức như source C++.",
  },
  modes: {
    "near-scene": {
      title: "Lỗi thật nằm trước hay sau phép projection?",
      description:
        "So cách bỏ cả triangle với clipper khi chỉ một vertex đi qua near plane; mặt cắt bên trái cho biết dữ liệu camera-space nào gây ra khác biệt.",
    },
    "near-classify": {
      title: "Ba signed distance chia triangle thành trường hợp nào?",
      description:
        "Đọc d=z−near tại A/B/C và thử vertex nằm đúng trên plane để chốt quy ước inside cùng epsilon.",
    },
    "near-intersection": {
      title: "Giao điểm nằm ở đâu trên mỗi cạnh cắt plane?",
      description:
        "Chọn một cạnh crossing, đọc t và xem position cùng RGB đều được nội suy bằng đúng tham số đó.",
    },
    "near-polygon": {
      title: "Bốn chuyển trạng thái tạo polygon như thế nào?",
      description:
        "Tiến từng cạnh có hướng và quan sát output list sau các trường hợp in→in, in→out, out→in và out→out.",
    },
    "near-triangulate": {
      title: "Vì sao polygon bốn đỉnh cần hai triangle?",
      description:
        "Hiện đường chéo của triangle fan và đối chiếu output 0/1/2 triangle với số vertex còn lại sau clipping.",
    },
    "near-raster": {
      title: "Projection trở nên an toàn ở điểm nào?",
      description:
        "Chỉ output vertex có z≥near mới qua phép chia phối cảnh; viewport bên phải rasterize các triangle đã clip bằng top-left rule.",
    },
    "near-validation": {
      title: "Sweep qua near plane có giữ mọi invariant?",
      description:
        "Chạy, dừng hoặc tiến từng bước qua năm preset; theo dõi violation, polygon count, triangle count và pixel coverage.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
