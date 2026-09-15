import type { GlossaryTerm } from "./glossary";

// Lighting terms live in their own shard so the shared glossary stays below the source budget.
export const lightingGlossaryTerms: GlossaryTerm[] = [
  {
    id: "face-normal",
    term: "Face normal",
    definition:
      "Vector vuông góc với một face, thường lấy bằng normalize(cross(B−A,C−A)). Với flat shading, mọi pixel của cùng face dùng chung normal này; đổi winding sẽ đảo hướng normal.",
  },
  {
    id: "directional-light",
    term: "Directional light",
    definition:
      "Nguồn sáng lý tưởng hóa ở rất xa nên mọi điểm trên scene dùng cùng một hướng sáng và không có suy giảm theo khoảng cách. Project 19 lưu hướng từ bề mặt về đèn bằng tên surfaceToLight.",
  },
  {
    id: "lambert-diffuse",
    term: "Lambert diffuse",
    definition:
      "Mô hình diffuse dùng max(0,dot(unitNormal,unitSurfaceToLight)). Mặt quay thẳng về đèn nhận giá trị 1, vuông góc hoặc quay lưng nhận 0.",
  },
  {
    id: "ambient-light",
    term: "Ambient light",
    definition:
      "Một mức sáng nền đơn giản được cộng vào diffuse để mặt không nhận ánh sáng trực tiếp vẫn còn nhìn thấy. Ambient trong Project 19 là hệ số không hướng, không phải mô phỏng phản xạ ánh sáng gián tiếp đầy đủ.",
  },
  {
    id: "material",
    term: "Material",
    definition:
      "Nhóm thuộc tính mô tả cách bề mặt phản ứng với ánh sáng. Material tối thiểu của Project 19 giữ baseColor, ambient và diffuseStrength; lighting intensity được nhân với baseColor trước khi ghi pixel.",
  },
  {
    id: "back-face-culling",
    term: "Back-face culling",
    definition:
      "Loại face quay lưng camera trước rasterization. Với outward normal N và vector từ face centroid tới camera V, Project 19 giữ face khi dot(N,V)>0; phép kiểm này độc lập với hướng đèn.",
  },
];
