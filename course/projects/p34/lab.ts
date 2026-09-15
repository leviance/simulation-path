import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "DUAL RENDERER CUBE LAB",
    title: "F1 và F2 có thực sự vẽ cùng một scene không?",
    description:
      "Xoay một indexed cube, chuyển CPU/GPU và theo dõi cùng mesh, MVP, depth cùng culling contract qua hai pipeline.",
  },
  modes: {
    "shared-scene": {
      title: "State nào thuộc scene, state nào thuộc renderer?",
      description:
        "Đổi F1/F2 khi đang xoay và kiểm angle, depth cùng culling không bị reset hoặc nhân đôi.",
    },
    "indexed-mesh": {
      title: "Vì sao cube có 24 vertices nhưng chỉ tám vị trí hình học?",
      description:
        "Mỗi mặt giữ màu riêng và tái sử dụng bốn vertices qua sáu indices, tổng cộng 36 indices cho 12 triangles.",
    },
    "cpu-path": {
      title: "CPU renderer biến shared mesh thành RGBA8 thế nào?",
      description:
        "Theo local → clip → screen, triangle coverage, Z-buffer rồi texture upload mà không sửa scene.",
    },
    "gpu-indexed-draw": {
      title: "VBO, EBO và VAO chia nhau trách nhiệm gì?",
      description:
        "Vertex bytes ở VBO, index bytes ở EBO, attribute/EBO binding ở VAO và draw call chỉ còn topology/count/type.",
    },
    "mvp-contract": {
      title: "Cùng 16 floats có tạo cùng clip coordinate không?",
      description:
        "Đọc vertex 0 qua column-major MVP, perspective divide và top-left screen mapping trước khi nhìn cả cube.",
    },
    "depth-contract": {
      title: "Z-buffer CPU và GL_DEPTH_TEST cùng quyết định visibility ra sao?",
      description:
        "Bật/tắt depth, đảo triangle order và đọc pass/reject để phân biệt geometry order với nearest fragment.",
    },
    "culling-contract": {
      title: "CCW thay đổi dấu thế nào khi CPU screen đảo trục Y?",
      description:
        "Theo front-facing triangle trước khi normalize raster winding và so với GL_CCW + GL_BACK.",
    },
    "renderer-switch": {
      title: "F1/F2 nên đổi đúng biến nào?",
      description:
        "RendererKind đổi backend của frame hiện tại; mesh, transform, pause, resize và visibility options giữ nguyên.",
    },
    "cube-validation": {
      title: "Hai renderer đã cùng contract và đúng lifecycle chưa?",
      description:
        "Rà mesh bounds, MVP trace, order independence, culling, deterministic frame và cleanup trước Project 35.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
