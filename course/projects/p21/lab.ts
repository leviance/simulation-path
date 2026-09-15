import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "OBJ VIEWER LAB",
    title: "Một dòng OBJ trở thành pixel như thế nào?",
    description:
      "Sửa OBJ mẫu, chọn face và theo dõi parser, triangle fan, bounds, normal cùng CPU Z-buffer bằng đúng quy ước của source C++.",
  },
  modes: {
    "obj-vertices": {
      title: "Record v tạo point cloud ra sao?",
      description:
        "Đổi preset hoặc sửa source để thấy mỗi dòng v thêm một position; face chưa tham gia ở mốc này.",
    },
    "obj-faces": {
      title: "OBJ 1-based index nối vertex nào?",
      description:
        "Chọn source face và nhìn ba index ngoài file được đổi thành ba vị trí 0-based trong vector.",
    },
    "obj-indices": {
      title: "Slash token và negative index được giải mã thế nào?",
      description:
        "So v, v/vt, v//vn, v/vt/vn và -1; phần position luôn được tách trước khi tra vector.",
    },
    "obj-triangulation": {
      title: "Một polygon N corner sinh ra bao nhiêu triangle?",
      description:
        "Chọn quad hoặc pentagon, bước qua triangle fan và nhìn anchor corner được giữ cố định.",
    },
    "obj-normalize": {
      title: "Bounds đưa model về origin mà không làm méo ra sao?",
      description:
        "So bounds trước/sau, center và uniform scale; tỷ lệ các trục vẫn được giữ nguyên.",
    },
    "obj-shading": {
      title: "Winding, face normal và ánh sáng liên hệ thế nào?",
      description:
        "Xoay model và hướng sáng để đọc normal, dot product, intensity cùng trạng thái front/back-facing.",
    },
    "obj-render": {
      title: "Mesh đi qua clip, rasterizer và Z-buffer ra sao?",
      description:
        "Theo dõi source triangle, triangle sau clip, fragment pass/reject và thử đảo draw order.",
    },
    "obj-validation": {
      title: "OBJ viewer đã giữ đủ invariant chưa?",
      description:
        "Thử model hợp lệ/lỗi, solid/wireframe, culling, draw order và kiểm toàn bộ parser cùng renderer.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
