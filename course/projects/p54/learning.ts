import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p54-l01": {
      focus: "SDL/OpenGL 3.3, fullscreen triangle và render target nhỏ cố định.",
      expected: "Vẽ ảnh đầu tiên bằng fragment shader",
      files: [
        "include/gl_api.hpp",
        "include/program.hpp",
        "include/renderer.hpp",
        "src/main.cpp",
        "shaders/fullscreen.vert",
        "shaders/volume.frag",
      ],
      steps: [
        {
          title: "Chạy bộ khung GL",
          explanation: "Context phải có trước khi load entry points; starter chỉ clear nền.",
        },
        {
          title: "Vẽ một fullscreen triangle",
          explanation: "gl_VertexID dựng ba đỉnh, VAO hợp lệ và DrawArrays phủ target.",
        },
        {
          title: "Giữ render target có giới hạn",
          explanation:
            "RGBA32F 240×180 tách khỏi kích thước cửa sổ; present pass không nhân số ray khi resize.",
        },
      ],
    },
    "p54-l02": {
      focus: "Camera orbit, perspective ray và quy ước y CPU/GPU.",
      expected: "Tạo một tia cho mỗi pixel của ảnh",
      files: ["include/model.hpp", "include/renderer.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Dựng basis từ camera",
          explanation: "Origin/forward/right/up cùng world units, không dùng pixel làm direction.",
        },
        {
          title: "Đưa basis vào shader",
          explanation:
            "Các uniform active được kiểm tên; upload origin chỉ khi shader thực sự dùng.",
        },
        {
          title: "Tính ray tại pixel centre",
          explanation:
            "GL gl_FragCoord y lên, Canvas v xuống; normalize để t và stepLength cùng world units.",
        },
      ],
    },
    "p54-l03": {
      focus: "Slab interval, miss, camera inside và ray song song.",
      expected: "Chỉ lấy mẫu trong đoạn tia xuyên volume",
      files: ["include/model.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Tách volume khỏi surface hit",
          explanation: "Entry clamp 0 khi camera ở trong box, khác chọn mặt exit ở Project 52.",
        },
        {
          title: "Giao ba slab",
          explanation: "Direction zero xét trước phép chia, entry/exit và tMax=20 có giới hạn.",
        },
        {
          title: "Vẽ độ dài đoạn để debug",
          explanation: "Ảnh length diagnostic kiểm camera/box trước texture hoặc opacity.",
        },
      ],
    },
    "p54-l04": {
      focus: "R32F, texel centre, GL_LINEAR và clamp-to-edge.",
      expected: "Đưa density lên texture 3D và lấy đúng mẫu",
      files: ["include/volume.hpp", "include/renderer.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Khởi tạo cùng phantom Project 53",
          explanation: "64×48×40 float, x-fast, spacing 0.05/0.08/0.12 và 480 KiB.",
        },
        {
          title: "Upload một lần khi dataset đổi",
          explanation: "TexImage3D, GL_R32F/GL_RED/GL_FLOAT, texture unit và sampler3D.",
        },
        {
          title: "Đổi world thành uvw",
          explanation:
            "UVW=(p−boxMin)/extent; GL_LINEAR khớp trilinear g=uvw*N−0.5 và replicate biên.",
        },
      ],
    },
    "p54-l05": {
      focus: "Beer–Lambert, sigma, transmittance và một midpoint approximation.",
      expected: "Đổi density thành opacity có độ dài đoạn",
      files: ["include/reference.hpp", "include/renderer.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Phân biệt density và extinction",
          explanation: "Density là scalar [0,1], sigma có đơn vị 1/world-unit.",
        },
        {
          title: "Tính alpha từ optical depth",
          explanation: "Alpha=1−exp(−sigma*rho*ds), không đặt alpha=rho cố định cho mỗi sample.",
        },
        {
          title: "Thử medium hằng có nghiệm",
          explanation:
            "Checkpoint 5 coi cả đoạn là một cell midpoint; chưa gọi là ray marching đầy đủ.",
        },
      ],
    },
    "p54-l06": {
      focus: "Midpoint, partial tail, C/T và thứ tự tích lũy.",
      expected: "Cộng từng đoạn dọc tia theo front-to-back",
      files: ["include/reference.hpp", "shaders/volume.frag"],
      steps: [
        {
          title: "Chia đoạn thành bước world",
          explanation: "Count=ceil(L/step), mẫu cuối dùng ds thật; cap 512 từ chối partial result.",
        },
        {
          title: "Tích lũy bằng T cũ",
          explanation: "C+=T*alpha*color, T*=segmentT; không blend lại cùng opacity trong GL.",
        },
        {
          title: "So oracle CPU và shader",
          explanation:
            "C++ dùng expm1 cho alpha nhỏ, GLSL dùng 1−exp; kiểm với tolerance thay vì bitwise.",
        },
      ],
    },
    "p54-l07": {
      focus: "Transfer function, C premultiplied và background/gamma sau tích lũy.",
      expected: "Chọn màu để thấy cấu trúc bên trong",
      files: ["include/reference.hpp", "shaders/volume.frag", "shaders/present.frag"],
      steps: [
        {
          title: "Map scalar sang màu riêng",
          explanation: "Warm/cool thay màu, không thay sigma, density hay T.",
        },
        {
          title: "Giữ color accumulation tuyến tính",
          explanation: "Kết quả C/T nằm trong RGBA32F; không gamma từng sample.",
        },
        {
          title: "Compose background cuối cùng",
          explanation:
            "Display=C+T*background rồi mới approximate gamma; không gọi đây là lighting vật lý.",
        },
      ],
    },
    "p54-l08": {
      focus: "Step size, early termination và ngân sách render.",
      expected: "Đổi chất lượng mà không đổi mô hình độ đặc",
      files: ["include/model.hpp", "include/reference.hpp", "shaders/volume.frag", "src/main.cpp"],
      steps: [
        {
          title: "Giữ giới hạn cố định",
          explanation:
            "240×180 và tối đa 512 samples/ray, step 0.02..0.25; không auto-increase workload.",
        },
        {
          title: "Dừng sớm với error bound",
          explanation:
            "T≤0.001 cho bound màu khi transfer/background trong [0,1]; cap cắt ray không phải early termination.",
        },
        {
          title: "Đo trên ca hằng trước",
          explanation:
            "Constant medium phải giữ T khi đổi step; medium biến thiên cần so convergence, không chỉ FPS.",
        },
      ],
    },
    "p54-l09": {
      focus: "CTest, hidden 16×12 GPU oracle, smoke shader và ZIP độc lập.",
      expected: "Kiểm C/T trên GPU và chạy project hoàn chỉnh",
      files: ["include/validation.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm pure math không window",
          explanation:
            "Interval, texture layout, tail, Beer–Lambert và early bound đều có ca riêng.",
        },
        {
          title: "Đọc target linear nhỏ",
          explanation:
            "GPU verify so C/T ở pixel biết trước, 3 dataset và camera outside/inside; có timeout ngoài process.",
        },
        {
          title: "Bàn giao đầy đủ",
          explanation:
            "Starter/9 checkpoint/final/shader/tests chạy riêng; kiểm desktop interaction tách khỏi CTest/GPU numeric.",
        },
      ],
    },
  },
  references: {
    "p54-l01": [
      {
        label: "SDL GL context",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
    ],
    "p54-l02": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l03": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l04": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
      {
        label: "OpenGL texture 3D",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTexImage3D.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p54-l05": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l06": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l07": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l08": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
    "p54-l09": [
      {
        label: "Volume transmittance",
        href: "/glossary#volume-transmittance",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
