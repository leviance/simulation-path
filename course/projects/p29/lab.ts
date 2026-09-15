import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "VISIBLE QUADTREE LAB",
    title: "Để vùng đông tự chia nhỏ, vùng thưa được thở",
    description:
      "Kéo selection qua 100.000 particles, đổi distribution và leafCapacity rồi quan sát topology, pruning, candidates, oracle agreement cùng benchmark.",
  },
  modes: {
    "quadtree-selection": {
      title: "Hai góc kéo tạo một vùng chọn ổn định ra sao?",
      description:
        "Kéo theo bốn hướng và đặt cạnh selection đúng split line; AABB được normalize, boundary vẫn được nhận và child policy luôn là east/north khi bằng nhau.",
    },
    "quadtree-root": {
      title: "Một root leaf chứa 100.000 indices giúp được gì?",
      description:
        "Root đã là một node hợp lệ nhưng query vẫn đọc toàn bộ N. LeafCapacity chỉ có ý nghĩa khi ta thực sự split và redistribute.",
    },
    "quadtree-split": {
      title: "Quadtree tự chia theo mật độ như thế nào?",
      description:
        "Đổi clustered/uniform và capacity để nhìn các leaf nhỏ tập trung ở vùng đông, trong khi vùng thưa dừng ở depth thấp hơn.",
    },
    "quadtree-topology": {
      title: "Những đường kẻ có thật sự là một tree đúng?",
      description:
        "Readout kiểm storage đúng một leaf, internal nodes rỗng, child indices, capacity guards và thống kê node thay vì chỉ tin hình vẽ.",
    },
    "quadtree-query": {
      title: "Selection đã bỏ qua những subtree nào?",
      description:
        "Node không overlap bị prune ngay; leaf màu xanh còn overlap mới đóng góp candidates và point vàng mới là exact hit.",
    },
    "quadtree-compare": {
      title: "Traversal khác thứ tự có còn trả đúng cùng kết quả?",
      description:
        "Canonicalize ngoài hot path để so Quadtree với brute force; kéo qua góc và split line để thử các trường hợp dễ sai nhất.",
    },
    "quadtree-capacity": {
      title: "Leaf nhỏ hơn có luôn nhanh hơn không?",
      description:
        "So capacity 4, 8, 16 và 32: capacity nhỏ giảm candidates nhưng tăng node traversal, memory metadata và rebuild work.",
    },
    "quadtree-validation": {
      title: "Visible Quadtree đã đủ chắc để làm nền cho Octree chưa?",
      description:
        "Nghiệm thu topology, edge queries, oracle, checksum, exact work, timing và interaction bằng cùng một source path.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
