import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  native: {
    directory: "/field-notes/cpu-gpu-triangle",
    withDemo: true,
    overview: ["reference"],
    lessons: { "pipeline-validation": ["reference"] },
    takes: {
      reference: {
        title: "Một tam giác, hai cách vẽ",
        source: "Project 33 · C++/SDL3 · OpenGL",
        poster: "project-16-reference.png",
        alt: "Hai khung có cùng tam giác đỏ ở trên trái, lam ở dưới trái và lục ở dưới phải, trên một mặt lưới nền xanh sẫm.",
        caption:
          "Ảnh chụp khi mở bản C++ hoàn chỉnh. Khung trái tô màu trên CPU; khung phải là kết quả vẽ của OpenGL. Cạnh nối hai đỉnh dưới hơi dốc vì chúng ở hai độ sâu khác nhau trong Project 16.",
      },
    },
  },
  base: {
    label: "CPU ↔ GPU TRIANGLE LAB",
    title: "Tam giác của Project 16 trông thế nào khi để GPU vẽ?",
    description:
      "Lần theo ba đỉnh qua transform, viewport và nội suy màu. Kéo điểm lấy mẫu để xem NDC và tâm pixel; Canvas minh họa bằng JavaScript, còn ứng dụng C++ mới chạy OpenGL thật.",
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
      title: "Ta đang tính màu tại điểm hình học hay tại tâm pixel?",
      description:
        "Chọn pixel chứa điểm lấy mẫu rồi đổi tâm pixel về NDC. Phần màu khuếch đại chỉ là sai số làm tròn sang byte, không phải số đo từ GPU.",
    },
    "pipeline-validation": {
      title: "Pipeline đã đúng contract và đúng lifecycle chưa?",
      description:
        "Tìm ba góc đỏ, lục và lam, rồi xoay một bước. Mặt lưới đứng yên, hai tam giác quay cùng nhau. Dùng dấu lấy mẫu để đoán màu trước khi kiểm trong bản C++.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
