import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VOLUME RAY MARCH LAB",
    title: "Theo dõi sương qua từng đoạn tia",
    description:
      "CPU oracle nhỏ cho texture density, opacity có ds và front-to-back; GPU thật nằm trong ZIP C++.",
  },
  modes: {
    "fog54-1": {
      title: "Vẽ ảnh đầu tiên bằng fragment shader",
      description: "SDL/OpenGL 3.3, fullscreen triangle và render target nhỏ cố định.",
    },
    "fog54-2": {
      title: "Tạo một tia cho mỗi pixel của ảnh",
      description: "Camera orbit, perspective ray và quy ước y CPU/GPU.",
    },
    "fog54-3": {
      title: "Chỉ lấy mẫu trong đoạn tia xuyên volume",
      description: "Slab interval, miss, camera inside và ray song song.",
    },
    "fog54-4": {
      title: "Đưa density lên texture 3D và lấy đúng mẫu",
      description: "R32F, texel centre, GL_LINEAR và clamp-to-edge.",
    },
    "fog54-5": {
      title: "Đổi density thành opacity có độ dài đoạn",
      description: "Beer–Lambert, sigma, transmittance và một midpoint approximation.",
    },
    "fog54-6": {
      title: "Cộng từng đoạn dọc tia theo front-to-back",
      description: "Midpoint, partial tail, C/T và thứ tự tích lũy.",
    },
    "fog54-7": {
      title: "Chọn màu để thấy cấu trúc bên trong",
      description: "Transfer function, C premultiplied và background/gamma sau tích lũy.",
    },
    "fog54-8": {
      title: "Đổi chất lượng mà không đổi mô hình độ đặc",
      description: "Step size, early termination và ngân sách render.",
    },
    "fog54-9": {
      title: "Kiểm C/T trên GPU và chạy project hoàn chỉnh",
      description: "CTest, hidden 16×12 GPU oracle, smoke shader và ZIP độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
