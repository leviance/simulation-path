import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "CPU ↔ GPU TRIANGLE LAB",
    title: "Một triangle đi qua hai pipeline khác nhau ở đâu?",
    description:
      "Theo dõi cùng vertex data qua CPU rasterizer và OpenGL contract, kéo probe để đọc NDC, barycentric weights, viewport mapping cùng sai khác sau RGBA8 quantization.",
  },
  modes: {
    "gl-context": {
      title: "Context và framebuffer pixels khác window size thế nào?",
      description:
        "Hai panel đại diện hai viewport trong cùng OpenGL framebuffer; resize vẫn phải dựa trên kích thước pixel thật.",
    },
    "shader-program": {
      title: "Vertex shader và fragment shader nhận trách nhiệm gì?",
      description:
        "Đi theo pipeline rail từ vertex attributes tới fragment output, đồng thời phân biệt compile từng shader với link program.",
    },
    "vertex-contract": {
      title: "Stride và offset nối C++ vertex với GLSL ra sao?",
      description:
        "Ba vertex dùng position vec2 và color vec3; cùng một memory contract được VBO chứa và VAO diễn giải.",
    },
    "cpu-reference": {
      title: "CPU framebuffer trở thành texture ở viewport trái thế nào?",
      description:
        "Nửa trái rasterize bằng barycentric weights rồi upload RGBA8; nửa phải để GPU tự tạo fragments.",
    },
    "vertex-transform": {
      title: "CPU và vertex shader có cùng thứ tự transform không?",
      description:
        "Đổi angle/scale và theo dõi input → NDC của từng vertex; hai phía chỉ được khác nơi phép tính chạy.",
    },
    "viewport-conventions": {
      title: "Vì sao CPU Y đi xuống còn OpenGL Y đi lên?",
      description:
        "Kéo probe qua hai panel để đối chiếu cùng NDC với top-left screen coordinate và bottom-left window coordinate.",
    },
    "fragment-interpolation": {
      title: "Màu fragment liên quan gì tới barycentric weights?",
      description:
        "Bật solid/smooth, đọc ba weights tại probe và xem vertex colors được nội suy theo đúng tổng bằng một.",
    },
    "gpu-readback": {
      title: "Một phép so CPU/GPU công bằng cần probe nào?",
      description:
        "Đặt crosshair cách xa edge, tách coordinate round-trip khỏi RGBA8 quantization và khuếch đại phần sai khác nhỏ.",
    },
    "pipeline-validation": {
      title: "Pipeline đã đúng contract và đúng lifecycle chưa?",
      description:
        "Rà context, shader logs, vertex layout, two-viewports, probes, resize, keyboard, pointer capture và cleanup trước Project 34.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
