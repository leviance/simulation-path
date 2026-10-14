export const rayIntersectionGlossaryTerms = [
  {
    id: "ray-surface-hit",
    term: "Ray interval và surface hit",
    definition:
      "Tia p(t)=origin+t*direction chỉ xét t trong [tMin,tMax]. Surface hit là điểm chạm bề mặt, không phải một điểm bất kỳ nằm trong thể tích. Khi direction dài một, t là khoảng cách world; nếu không, khoảng cách là t*length(direction).",
  },
  {
    id: "ray-slab-interval",
    term: "Slab interval của AABB",
    definition:
      "Mỗi trục của box cho một khoảng vào/ra. Entry lớn nhất và exit nhỏ nhất tạo khoảng nằm trong cả ba slab. Tia trong box có entry âm; picking lấy mặt exit hợp lệ, không thay entry bằng tMin rồi coi là bề mặt.",
  },
  {
    id: "ray-triangle-barycentric",
    term: "Ray–triangle barycentric",
    definition:
      "Möller–Trumbore giải t,u,v trong origin+t*direction=A+u*(B−A)+v*(C−A). Điểm thuộc tam giác khi u,v không âm và u+v≤1; trọng số của A là w=1−u−v. Ngưỡng determinant loại tia gần song song, nhưng bản giảng dạy không bảo đảm watertight cho mesh cạnh chung.",
  },
  {
    id: "geometric-hit-normal",
    term: "Geometric normal và frontFace",
    definition:
      "Normal hình học giữ hướng do primitive quy định; frontFace=(dot(direction,normal)<0) cho biết tia đi vào phía mặt trước. Không tự lật normal khi tia xuất phát trong sphere/box; người học cần nhìn được normal hướng ra ngoài và frontFace=false ở mặt thoát.",
  },
];
