import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "NEAR-PLANE CLIPPING LAB",
    title: "Một triangle đổi hình ra sao khi đi qua near plane?",
    description:
      "Kéo tam giác đi xuyên camera và quan sát phần bề mặt được giữ lại. Mặt cắt ZX, giao điểm và số liệu giúp kiểm tra từng bước; công thức khớp với C++.",
  },
  modes: {
    "near-showcase": {
      title: "Tam giác 3D đi xuyên camera",
      description:
        "Kéo hoặc giữ A/D cho bề mặt qua near plane. Camera độc lập; clean mode giữ lưới phối cảnh, debug hiện mặt cắt ZX before/after.",
    },
    "near-scene": {
      title: "Lỗi thật nằm trước hay sau phép projection?",
      description:
        "Dựng tam giác trước, rồi kéo nó qua near plane để thấy vì sao bỏ cả hình khi một đỉnh ra ngoài là chưa đúng. Bài đầu chưa nối clipper vào renderer.",
    },
    "near-classify": {
      title: "Ba signed distance chia triangle thành trường hợp nào?",
      description:
        "Đọc d=z−near tại A/B/C. Điểm đúng trên biên được giữ; điểm hơi phía trước vẫn ở ngoài, dù HUD đánh dấu là gần plane.",
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
        "Chỉ output vertex có z≥near mới qua phép chia phối cảnh; viewport chính tô các tam giác đã clip bằng top-left rule.",
    },
    "near-validation": {
      title: "Sweep qua near plane có giữ mọi invariant?",
      description:
        "Chạy, dừng hoặc tiến từng bước qua năm preset; theo dõi violation, polygon count, triangle count và pixel coverage.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
