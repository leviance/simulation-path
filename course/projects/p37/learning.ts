import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p37-l01": {
      focus: "Tính kết quả đầu tiên trên CPU và đọc được A/B/output trước khi làm việc với GPU.",
      expected:
        "Dashboard hiển thị 256 cặp Vec4 có seed cố định, phép Add và bốn thành phần kết quả CPU; chưa gọi đây là GPU output.",
      files: [
        "include/vector_compute_math.hpp",
        "include/compute_worker.hpp",
        "include/compute_application.hpp",
      ],
      steps: [
        {
          title: "Bắt đầu từ cửa sổ chạy được",
          explanation:
            "Starter có event loop, software dashboard và vòng đời worker; phần tính toán chỉ được nối vào ở checkpoint 1.",
        },
        {
          title: "Viết phép tính đối chiếu",
          explanation:
            "Mỗi index đọc A[i], B[i] và ghi đúng một Vec4; kiểm A/B cùng kích thước trước vòng lặp.",
        },
        {
          title: "Quan sát một kết quả cụ thể",
          explanation:
            "Đọc cả x/y/z/w trong inspector và tự tính một phép AXPY nhỏ; chưa có GPU thì dòng GPU được ghi rõ là chưa readback.",
        },
      ],
    },
    "p37-l02": {
      focus: "Tạo compute context riêng và đọc giới hạn thật thay vì tin vào phiên bản đã request.",
      expected:
        "Worker nhận OpenGL 4.3 context; preflight kiểm local size, group count, SSBO bytes và ba storage bindings trước allocation.",
      files: [
        "include/vector_compute_math.hpp",
        "include/vector_compute_engine.hpp",
        "include/compute_worker.hpp",
        "include/compute_application.hpp",
      ],
      steps: [
        {
          title: "Tách UI khỏi phép đo",
          explanation:
            "Dashboard dùng SDL surface; hidden GL context chỉ current trên worker. UI không vẽ vào compute context.",
        },
        {
          title: "Đọc từng loại giới hạn",
          explanation:
            "Group size/count theo X/Y/Z khác maximum invocations; block capacity cũng khác số binding cho phép.",
        },
      ],
    },
    "p37-l03": {
      focus: "Nối Vec4 16 byte với vec4[] std430 và cấp ba SSBO đúng binding.",
      expected:
        "A/B được upload; N output chứa NaN sentinel, 256 phần tử sau N chứa canary; checkpoint này chưa dispatch.",
      files: [
        "include/vector_compute_engine.hpp",
        "include/compute_worker.hpp",
        "shaders/vector_ops.comp",
      ],
      steps: [
        {
          title: "Khóa layout",
          explanation:
            "Size/alignment 16 byte và array stride 16 byte là hợp đồng CPU–GLSL; không suy ra stride của vec3 từ số thành phần.",
        },
        {
          title: "Phân biệt tên buffer với binding",
          explanation:
            "Buffer name do driver cấp; số binding 0/1/2 là vị trí shader dùng để tìm A/B/output.",
        },
        {
          title: "Chuẩn bị vùng kiểm",
          explanation:
            "Sentinel phát hiện output chưa ghi; canary phát hiện ghi vào phần padding. Chúng có mục đích khác nhau.",
        },
      ],
    },
    "p37-l04": {
      focus: "Compile compute shader, kiểm interface đã link và dispatch một workgroup 256 lane.",
      expected:
        "GPU chạy đúng 256 phần tử; fence giúp biết công việc đã hoàn tất nhưng output vẫn chưa được đưa lên inspector trước bài 6.",
      files: [
        "include/compute_program.hpp",
        "include/vector_compute_engine.hpp",
        "include/compute_worker.hpp",
        "include/compute_application.hpp",
        "shaders/vector_ops.comp",
      ],
      steps: [
        {
          title: "Viết kernel",
          explanation: "gl_GlobalInvocationID.x chọn đúng index; ba nhánh operation khớp enum C++.",
        },
        {
          title: "Kiểm program sau link",
          explanation:
            "Reflection kiểm local size, uniform type, SSBO binding và stride trước khi thay program last-good.",
        },
      ],
    },
    "p37-l05": {
      focus: "Tính số workgroup và kiểm index trước mọi lần đọc/ghi để chạy N lẻ an toàn.",
      expected:
        "N=1.000.003 tạo 3.907 workgroups; 189 lane dư không đọc input và không ghi output.",
      files: [
        "include/vector_compute_math.hpp",
        "include/vector_compute_engine.hpp",
        "include/compute_program.hpp",
        "include/compute_worker.hpp",
        "include/compute_application.hpp",
        "shaders/vector_ops.comp",
      ],
      steps: [
        {
          title: "Làm tròn số group lên",
          explanation:
            "ceilDiv tránh mất phần đuôi, từ chối local size 0 và group count không biểu diễn được.",
        },
        {
          title: "Guard trước truy cập",
          explanation:
            "Đặt return ngay sau index, trước cả inputA[index]; không chỉ bảo vệ câu ghi cuối.",
        },
        {
          title: "Preflight theo N mới",
          explanation:
            "Mỗi N phải được kiểm lại trước allocation; việc preset trước chạy được không chứng minh preset sau hợp lệ.",
        },
      ],
    },
    "p37-l06": {
      focus: "Phân biệt visibility của buffer với completion và đọc output GPU thật về dashboard.",
      expected:
        "Barrier đúng consumer, fence hữu hạn và readback N+256 phần tử cho output cùng tail canary.",
      files: [
        "include/vector_compute_engine.hpp",
        "include/compute_worker.hpp",
        "include/compute_dashboard.hpp",
      ],
      steps: [
        {
          title: "Chọn barrier cho readback",
          explanation:
            "BUFFER_UPDATE phù hợp glGetBufferSubData; fence không thay vai trò visibility của barrier.",
        },
        {
          title: "Chờ có thể hủy",
          explanation:
            "Poll fence với timeout 0, kiểm stop/deadline rồi nhường CPU ngắn; không khóa event loop UI.",
        },
        {
          title: "Đọc đúng dữ liệu",
          explanation:
            "Inspector dùng result.output; canary được kiểm ngoài N và không tham gia phép tính hợp lệ.",
        },
      ],
    },
    "p37-l07": {
      focus: "So mọi phần tử và cả bốn thành phần bằng tolerance có kiểm tra tính hợp lệ.",
      expected:
        "NaN/Inf, output thiếu, tolerance NaN/âm và lỗi ở x/y/z/w đều được báo sai; report có index/component đầu tiên.",
      files: [
        "include/vector_compute_math.hpp",
        "include/compute_worker.hpp",
        "include/compute_dashboard.hpp",
      ],
      steps: [
        {
          title: "Loại giá trị không hữu hạn",
          explanation:
            "Không để NaN đi vào phép so sai số rồi được chấp nhận do phép so sánh trả false.",
        },
        {
          title: "Dùng cả absTol và relTol",
          explanation:
            "Ngưỡng nhỏ quanh zero, scale theo độ lớn ở xa zero; tolerance không phải nút làm cho mọi kết quả đều pass.",
        },
      ],
    },
    "p37-l08": {
      focus: "Đo riêng CPU loop, GPU kernel và upload/dispatch/readback trên một N.",
      expected:
        "B chạy hai warm-up và chín sample ở N đang chọn; query chỉ được dùng lại sau availability và consumption.",
      files: [
        "include/vector_compute_math.hpp",
        "include/compute_benchmark.hpp",
        "include/vector_compute_engine.hpp",
        "include/compute_worker.hpp",
        "include/compute_application.hpp",
        "include/compute_dashboard.hpp",
      ],
      steps: [
        {
          title: "Chốt phạm vi từng đồng hồ",
          explanation:
            "CPU preallocated loop; GPU TIME_ELAPSED quanh dispatch; E2E wall clock từ upload đến readback, gồm fence wait.",
        },
        {
          title: "Giữ mẫu pending",
          explanation:
            "Query chưa available thì tiếp tục poll cùng query; không submit rồi ghi đè kết quả chưa đọc.",
        },
        {
          title: "Báo độ phân tán",
          explanation:
            "Min/median/max cùng số sample giúp nhận ra độ nhiễu; một median không chứng minh tính đúng.",
        },
      ],
    },
    "p37-l09": {
      focus: "Mở rộng benchmark sang nhiều N mà không trộn cấu hình, warm-up hoặc sample.",
      expected:
        "Ba hàng 256, 65.537 và 1.000.003 cùng seed/operation/scalar; mỗi hàng có hai warm-up và chín sample riêng.",
      files: ["include/compute_worker.hpp"],
      steps: [
        {
          title: "Một job, một bản sao cấu hình",
          explanation: "Worker nhận config by value; đổi UI không thể sửa một workload đang đo.",
        },
        {
          title: "Bắt đầu lại tại mỗi N",
          explanation:
            "Tạo inputs/preallocate bên ngoài sample, warm-up lại, thu đủ mẫu rồi mới công bố một row hoàn chỉnh.",
        },
      ],
    },
    "p37-l10": {
      focus: "Đọc kết quả thật trong dashboard và chọn index mà không tính lại GPU.",
      expected:
        "Left/Right, Page Up/Down, Home/End đổi index của inspector; SELECTED và MEASURED không bị đánh tráo.",
      files: ["include/compute_application.hpp"],
      steps: [
        {
          title: "Chọn đúng bộ kết quả",
          explanation:
            "Inspector lấy N từ report.data, không dùng N vừa chọn để truy cập output cũ.",
        },
        {
          title: "Giữ index trong mảng",
          explanation: "Chặn index tại 0 và N-1, kể cả khi bộ kết quả mới nhỏ hơn bộ trước.",
        },
      ],
    },
    "p37-l11": {
      focus: "Chứng minh độ đúng bằng fixture độc lập và phép kiểm OpenGL thật.",
      expected:
        "--verify kiểm toàn bộ output, input preservation, canary và đường phát hiện guard/interface sai trong thời gian hữu hạn.",
      files: ["include/compute_application.hpp", "include/compute_verify.hpp"],
      steps: [
        {
          title: "Tách hai tầng kiểm",
          explanation:
            "CTest không mở window; --verify chạy shader thật trong hidden context, không thay GPU bằng CPU.",
        },
        {
          title: "Kiểm bộ phát hiện lỗi",
          explanation:
            "Guard lệch một phần tử phải làm canary fail; binding sai phải bị từ chối và program last-good còn dùng được.",
        },
      ],
    },
  },
  references: {
    "p37-l01": [{ label: "CPU oracle", href: "/glossary#cpu-oracle", kind: "Thuật ngữ" }],
    "p37-l02": [
      {
        label: "SDL_GL_CreateContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
    ],
    "p37-l03": [{ label: "std430", href: "/glossary#std430-layout", kind: "Thuật ngữ" }],
    "p37-l04": [
      {
        label: "glDispatchCompute",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p37-l05": [
      { label: "Bounds guard", href: "/glossary#compute-bounds-guard", kind: "Thuật ngữ" },
    ],
    "p37-l06": [
      {
        label: "glMemoryBarrier",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glMemoryBarrier.xml",
        kind: "OpenGL API",
      },
    ],
    "p37-l07": [{ label: "Mixed tolerance", href: "/glossary#mixed-tolerance", kind: "Thuật ngữ" }],
    "p37-l08": [
      {
        label: "glGetQueryObject",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glGetQueryObject.xml",
        kind: "OpenGL API",
      },
    ],
    "p37-l09": [{ label: "GPU timer query", href: "/glossary#gpu-timer-query", kind: "Thuật ngữ" }],
    "p37-l10": [
      {
        label: "SDL_PollEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_PollEvent",
        kind: "SDL API",
      },
    ],
    "p37-l11": [
      {
        label: "glClientWaitSync",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glClientWaitSync.xml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
