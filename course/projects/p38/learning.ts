import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p38-l01": {
      focus: "Dựng buồng quan sát 3D trước khi thêm mô phỏng.",
      expected: "Window/context, grid, orbit/pan/zoom; chưa có particle.",
      files: [
        "include/chamber_application.hpp",
        "include/chamber_camera.hpp",
        "include/chamber_renderer.hpp",
      ],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Event loop, GL loader và overlay là phần nền; chưa có lực hoặc integrator.",
        },
        {
          title: "Đưa grid qua camera",
          explanation: "View/projection dùng aspect vùng cảnh và kích thước framebuffer thật.",
        },
        {
          title: "Kiểm góc nhìn",
          explanation: "Camera chỉ đổi ma trận; chuột/bàn phím đều điều khiển được.",
        },
      ],
    },
    "p38-l02": {
      focus: "Đọc một record và tạo lại đúng snapshot từ seed.",
      expected: "CPU preview đứng yên, ID ổn định và cặp 0/1 trái dấu q.",
      files: ["include/chamber_math.hpp", "include/chamber_application.hpp"],
      steps: [
        {
          title: "Khóa layout",
          explanation: "Hai vec4, 32 byte/alignment 16; q/mass ở w đã công bố.",
        },
        {
          title: "Sinh theo ID",
          explanation: "Hash nhận ID/channel/seed, không đọc clock hoặc camera.",
        },
        {
          title: "Nối preview",
          explanation: "Reset tạo mảng nhỏ và clock, không nhận là GPU scale.",
        },
      ],
    },
    "p38-l03": {
      focus: "Tự tính lực Lorentz và nhận ra lỗi Euler.",
      expected: "Hai dấu q cong trái chiều; Euler làm speed tăng khi chỉ B.",
      files: ["include/chamber_math.hpp", "include/chamber_application.hpp"],
      steps: [
        {
          title: "Kiểm thứ tự cross",
          explanation: "v theo X, B theo Y cho v×B theo Z; đảo tham số làm sai chiều.",
        },
        {
          title: "Tính gia tốc",
          explanation: "q scale nhân q cơ sở rồi chia mass dương; đơn vị chuẩn hóa.",
        },
        {
          title: "Thử Euler",
          explanation: "Cập nhật cùng state cũ và quan sát lỗi năng lượng, chưa dùng cho final.",
        },
      ],
    },
    "p38-l04": {
      focus: "Viết Boris với x/v cùng mốc full-time.",
      expected: "Hai nửa xung E, phép quay B và drift đối xứng.",
      files: ["include/chamber_math.hpp", "include/chamber_application.hpp"],
      steps: [
        {
          title: "Giữ state cũ",
          explanation: "Giữ oldVelocity cho drift, không ghi v giữa chừng.",
        },
        {
          title: "Quay vận tốc",
          explanation: "vMinus/t/s/vPrime/vPlus giữ cùng tên khi đối chiếu GLSL.",
        },
        {
          title: "Commit cùng thời điểm",
          explanation: "xNext dùng trung bình v cũ/mới; chỉ ghi nếu cả hai hợp lệ.",
        },
      ],
    },
    "p38-l05": {
      focus: "Kiểm phase/position bằng nghiệm double độc lập.",
      expected: "Nghiệm thẳng/E/B đều và dt convergence ở cùng T.",
      files: ["include/chamber_reference.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tách trường hợp zero",
          explanation: "B=0 hoặc q=0 không chia omega, dùng gia tốc đều.",
        },
        {
          title: "Tách theo B",
          explanation: "Trục B, omega có dấu và drift tạo nghiệm trường đều tổng quát.",
        },
        {
          title: "So cùng T",
          explanation: "dt/2 cần số bước gấp đôi; đo vector position/velocity, không chỉ speed.",
        },
      ],
    },
    "p38-l06": {
      focus: "Cấp SSBO theo kế hoạch, giữ last-good khi yêu cầu lỗi.",
      expected: "GPU init snapshot đứng yên; candidate transactional, chưa force update.",
      files: [
        "include/chamber_math.hpp",
        "include/chamber_gpu.hpp",
        "include/chamber_reference.hpp",
        "shaders/particle_init.comp",
      ],
      steps: [
        {
          title: "Đọc limits thật",
          explanation: "Kiểm block/local/invocations/groups/bindings và overflow trước allocation.",
        },
        {
          title: "Tạo candidate",
          explanation: "Lỗi chỉ hủy candidate; fence ready mới publish.",
        },
        {
          title: "Công bố trải pha",
          explanation: "Chuẩn bị x0/v0 bằng nghiệm chỉ B; ID 0/1 pha zero.",
        },
      ],
    },
    "p38-l07": {
      focus: "Compute tiến state, graphics đọc cùng SSBO.",
      expected: "Boris cho từng ID, barrier đúng consumer, không full readback theo frame.",
      files: [
        "shaders/particle_update.comp",
        "shaders/particle.vert",
        "include/chamber_gpu.hpp",
        "include/chamber_renderer.hpp",
      ],
      steps: [
        {
          title: "Guard trước truy cập",
          explanation: "N lẻ có lane dư; kiểm ID trước cả lần đọc Particle.",
        },
        {
          title: "Chuyển Boris",
          explanation: "Giữ tên biến, q/m và drift đúng hợp đồng CPU.",
        },
        {
          title: "Nối update/draw",
          explanation: "SHADER_STORAGE cho shader consumer; core vẽ đủ N bằng VertexID.",
        },
      ],
    },
    "p38-l08": {
      focus: "Giữ simulation time và mốc apply/reset rõ ràng.",
      expected: "Pause không nợ thời gian; N một bước; discarded time được báo.",
      files: [
        "include/chamber_math.hpp",
        "include/chamber_controls.hpp",
        "include/chamber_panel.hpp",
        "include/chamber_application.hpp",
      ],
      steps: [
        {
          title: "Chặn catch-up",
          explanation:
            "Đi qua clock đã có, nối appliedSteps/discardedSeconds ra panel/showcase; tối đa 0,1 s wall và 8 bước/frame, t=tick×dt.",
        },
        {
          title: "Tách STAGED/ACTIVE",
          explanation: "Enter reset snapshot mới, R lặp ACTIVE, sửa panel chưa áp dụng.",
        },
        {
          title: "Giữ main khi có job",
          explanation: "held chặn cả single-step trong khi kiểm/đo state riêng.",
        },
      ],
    },
    "p38-l09": {
      focus: "Đọc đúng ID/snapshot và giữ vệt có trần.",
      expected: "33-record probe, ID bất kỳ bằng phím, click 32 ID và 17×256 trail points.",
      files: [
        "include/chamber_probe.hpp",
        "shaders/particle_probe.comp",
        "include/chamber_application.hpp",
      ],
      steps: [
        {
          title: "Gather ít record",
          explanation: "Capture ID/generation/tick/time trước gửi, không full state mỗi frame.",
        },
        {
          title: "Chờ hữu hạn",
          explanation: "BUFFER_UPDATE visibility và fence completion; timeout không publish.",
        },
        {
          title: "Lấy trail theo time",
          explanation: "Ring có trần, không thêm khi Pause hoặc nối qua generation.",
        },
      ],
    },
    "p38-l10": {
      focus: "Kiểm đủ N mà không biến event loop thành vòng chờ.",
      expected: "Job riêng kiểm mirror/analytic theo batch; NaN fail, cancel incomplete.",
      files: [
        "include/chamber_validation.hpp",
        "include/chamber_reference.hpp",
        "include/chamber_verify.hpp",
      ],
      steps: [
        {
          title: "Khóa snapshot",
          explanation: "State riêng/settings by value; không dùng ACTIVE làm scratch.",
        },
        {
          title: "Đọc từng batch",
          explanation: "8.192 record mỗi poll sau fence, trả event loop để hủy.",
        },
        {
          title: "Kiểm hai tầng",
          explanation: "CPU mirror không thay analytic trajectory và dt convergence.",
        },
      ],
    },
    "p38-l11": {
      focus: "Đo đúng scope trên workload cố định.",
      expected: "4 warm-up/20 paired samples, min/median/max và báo riêng 1M/5M.",
      files: [
        "include/chamber_timing.hpp",
        "include/chamber_benchmark.hpp",
        "include/chamber_application.hpp",
      ],
      steps: [
        {
          title: "Poll query",
          explanation: "Chỉ consume available, không overwrite pending hoặc glFinish theo frame.",
        },
        {
          title: "Chốt phạm vi",
          explanation: "Update/draw GPU khác frame CPU+present; draw chỉ core/halo.",
        },
        {
          title: "Giữ cấu hình",
          explanation: "MEASURED giữ snapshot; camera/viewport đổi làm job incomplete.",
        },
      ],
    },
    "p38-l12": {
      focus: "Làm rõ chiều sâu mà không thay phương trình chuyển động.",
      expected: "Core depth/shading, halo sampling rõ, HDR có ngân sách và final độc lập.",
      files: [
        "shaders/particle.frag",
        "include/chamber_renderer.hpp",
        "include/chamber_post.hpp",
        "include/chamber_application.hpp",
      ],
      steps: [
        {
          title: "Sphere impostor",
          explanation:
            "Normal/fragment depth cho lớp trước che lớp sau, không chỉ additive points.",
        },
        {
          title: "Chặn hậu kỳ",
          explanation: "Target tối đa 2048×1152, candidate transactional và HUD sau bloom.",
        },
        {
          title: "Nghiệm thu từng cổng",
          explanation: "Build, CTest, GPU scale, interaction, Canvas và ZIP là bằng chứng riêng.",
        },
      ],
    },
  },
  references: {
    "p38-l01": [
      {
        label: "SDL_GetWindowSizeInPixels",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p38-l02": [
      {
        label: "std430 layout",
        href: "/glossary#std430-layout",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l03": [
      {
        label: "Cross product",
        href: "/glossary#cross-product",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l04": [
      {
        label: "Boris và mốc thời gian",
        href: "/glossary#boris-pusher",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l05": [
      {
        label: "Nghiệm độc lập",
        href: "/glossary#cpu-oracle",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l06": [
      {
        label: "glBufferData",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glBufferData.xml",
        kind: "OpenGL API",
      },
    ],
    "p38-l07": [
      {
        label: "glMemoryBarrier",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glMemoryBarrier.xml",
        kind: "OpenGL API",
      },
    ],
    "p38-l08": [
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l09": [
      {
        label: "glFenceSync",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glFenceSync.xml",
        kind: "OpenGL API",
      },
    ],
    "p38-l10": [
      {
        label: "Mixed tolerance",
        href: "/glossary#mixed-tolerance",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l11": [
      {
        label: "GPU timer query",
        href: "/glossary#gpu-timer-query",
        kind: "Thuật ngữ",
      },
    ],
    "p38-l12": [
      {
        label: "SDL3 CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
