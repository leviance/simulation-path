import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/vector_compute_math.hpp",
  "include/gl_api.hpp",
  "include/vector_compute_engine.hpp",
  "shaders/vector_ops.comp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p37-l01": {
      focus:
        "Định nghĩa phép toán trên từng Vec4, tạo dữ liệu có thể tái lập và tính kết quả đối chiếu trên CPU trước khi cấp phát tài nguyên GPU.",
      expected:
        "Checkpoint 1 tạo hơn một triệu cặp Vec4, chạy Add trên CPU và vẽ các cột mẫu từ output baseline có thể lặp lại.",
      files,
      steps: [
        {
          title: "Đóng một phần tử thành Vec4 rõ ràng",
          explanation:
            "Gom bốn float thành một Vec4 giúp phép toán CPU và cách bố trí dữ liệu trên GPU cùng làm việc với một record 16 byte.",
        },
        {
          title: "Tách phép toán khỏi vòng lặp",
          explanation:
            "applyOperation mô tả Add, AXPY và Difference ở một nơi. computeCpu chỉ duyệt từng index, nhờ đó trở thành bản kết quả độc lập để so với GPU.",
        },
        {
          title: "Sinh input có seed và checksum",
          explanation:
            "Cùng số phần tử và seed phải tạo lại đúng A/B. Biểu đồ chỉ lấy vài mẫu để vẽ, còn phần đối chiếu CPU vẫn tính đủ N phần tử.",
        },
      ],
    },
    "p37-l02": {
      focus:
        "Yêu cầu OpenGL 4.3 Core, nạp các hàm cần dùng và kiểm tra giới hạn compute/SSBO trước khi cấp phát buffer.",
      expected:
        "Checkpoint 2 in phiên bản cùng các giới hạn phần cứng; preset không phù hợp dừng lại với thông báo nêu đúng giới hạn bị thiếu.",
      files,
      steps: [
        {
          title: "Yêu cầu context trước khi tạo window",
          explanation:
            "SDL_GL_SetAttribute phải chạy trước SDL_CreateWindow; sau khi tạo context vẫn đọc version thật thay vì coi request là bằng chứng.",
        },
        {
          title: "Đọc giới hạn theo đúng chiều",
          explanation:
            "Workgroup count/size là giá trị indexed theo X/Y/Z; maximum invocations và SSBO block size là giới hạn riêng.",
        },
        {
          title: "Validate trước cấp phát",
          explanation:
            "Kiểm local size, số workgroup và dung lượng SSBO trước khi tạo buffer, nhờ đó lỗi phần cứng không biến thành một lần cấp phát hoặc dispatch thất bại khó hiểu.",
        },
      ],
    },
    "p37-l03": {
      focus: "Giữ Vec4 C++ khớp với vec4[] std430, rồi gắn ba SSBO vào binding 0, 1 và 2.",
      expected:
        "Checkpoint 3 upload A/B, cấp output sentinel, giữ stride 16 byte và không dispatch khi layout/binding chưa hợp lệ.",
      files,
      steps: [
        {
          title: "Khóa size và alignment ở compile time",
          explanation:
            "static_assert(sizeof/alignof(Vec4)==16) làm chương trình dừng ngay lúc build nếu layout bị lệch, thay vì để GPU đọc sai dữ liệu rồi mới tìm lỗi.",
        },
        {
          title: "Một block, một binding",
          explanation:
            "InputA/InputB/Output dùng binding 0/1/2 ở cả GLSL và glBindBufferBase; binding không phải GLuint buffer name.",
        },
        {
          title: "Cấp output bằng sentinel",
          explanation:
            "NaN sentinel cho biết phần tử nào chưa được shader ghi sau readback; zero có thể tình cờ là kết quả hợp lệ.",
        },
      ],
    },
    "p37-l04": {
      focus:
        "Compile compute shader đầu tiên, bind ba SSBO và dispatch đúng một workgroup 256 invocations.",
      expected:
        "Checkpoint 4 ghi A[i]+B[i] cho đúng 256 phần tử đầu; Canvas nối local/global ID với buffer index.",
      files,
      steps: [
        {
          title: "Đặt local size trong shader",
          explanation:
            "layout(local_size_x=256) cố định số invocation mỗi group của executable; nó không phải số group truyền cho dispatch.",
        },
        {
          title: "Lấy index từ global invocation",
          explanation:
            "Trong bài 1D, gl_GlobalInvocationID.x chính là địa chỉ phần tử. Một group đầu tạo index 0..255.",
        },
        {
          title: "Dispatch chỉ sau khi bind resource",
          explanation:
            "Phải dùng đúng program và gắn đủ ba buffer trước glDispatchCompute. Compute shader không cần draw call hay VAO.",
        },
      ],
    },
    "p37-l05": {
      focus:
        "Mở rộng từ một group lên 1.000.003 phần tử bằng ceil division và bounds guard trước mọi buffer access.",
      expected:
        "Checkpoint 5 dispatch 3.907 groups; 189 invocation dư thoát sớm và không đọc/ghi ngoài SSBO.",
      files,
      steps: [
        {
          title: "Tính group count bằng số nguyên",
          explanation:
            "ceilDiv(count,localSize) tránh float rounding và cho đúng một group khi count nhỏ hơn local size nhưng khác zero.",
        },
        {
          title: "Gửi count thật sang shader",
          explanation:
            "uElementCount mô tả miền hợp lệ; dispatch size chỉ mô tả số invocation được phát.",
        },
        {
          title: "Guard trước lần đọc đầu tiên",
          explanation:
            "Invocation dư phải return trước inputA[index], không chỉ trước outputData[index]; read ngoài bounds cũng là lỗi.",
        },
      ],
    },
    "p37-l06": {
      focus:
        "Dùng glMemoryBarrier để dữ liệu shader vừa ghi sẵn sàng trước khi CPU đọc output buffer.",
      expected:
        "Checkpoint 6 dùng GL_BUFFER_UPDATE_BARRIER_BIT trước glGetBufferSubData; output hợp lệ không còn NaN sentinel.",
      files,
      steps: [
        {
          title: "Gọi barrier sau dispatch",
          explanation:
            "Barrier tạo visibility/order cho lệnh sau; đặt trước dispatch không bảo vệ write chưa xảy ra.",
        },
        {
          title: "Chọn bit theo consumer",
          explanation:
            "Bước kế tiếp là glGetBufferSubData nên dùng BUFFER_UPDATE. Nếu một shader khác đọc SSBO, khi đó SHADER_STORAGE mới là bit phù hợp.",
        },
        {
          title: "Readback đúng buffer và byte count",
          explanation:
            "Bind output vào GL_SHADER_STORAGE_BUFFER rồi đọc count*sizeof(Vec4); binding point 2 không tự chọn target của glGetBufferSubData.",
        },
      ],
    },
    "p37-l07": {
      focus:
        "So output GPU với kết quả CPU, loại NaN/Infinity trước rồi dùng mixed tolerance gồm sai số tuyệt đối và tương đối.",
      expected:
        "Checkpoint 7 báo maximum error, mismatch count, first failure index và bắt được NaN lẫn một component bị sửa.",
      files,
      steps: [
        {
          title: "Loại NaN và Infinity trước khi so sai số",
          explanation:
            "NaN có thể khiến phép so sánh thông thường cho kết quả khó đọc. Báo cáo phải đánh dấu giá trị không hữu hạn thành một lỗi riêng.",
        },
        {
          title: "Scale tolerance theo độ lớn",
          explanation:
            "Ngưỡng absTol + relTol*max(|expected|,|actual|) đủ chặt quanh zero nhưng không phạt quá mức số lớn.",
        },
        {
          title: "Giữ vị trí lỗi đầu tiên",
          explanation:
            "Maximum error cho mức độ, mismatch count cho phạm vi, first failure cho điểm bắt đầu debug buffer/index.",
        },
      ],
    },
    "p37-l08": {
      focus:
        "Đo riêng vùng GPU dispatch bằng GL_TIME_ELAPSED query và tổng hợp warm-up cùng median hữu hạn.",
      expected:
        "Checkpoint 8 lấy chín mẫu thời gian, tính median của phần compute và vẫn xác nhận output đúng sau benchmark.",
      files,
      steps: [
        {
          title: "Đặt query sát dispatch",
          explanation:
            "BeginQuery trước và EndQuery sau glDispatchCompute; upload, barrier/readback, UI không nằm trong nhãn compute time.",
        },
        {
          title: "Warm-up rồi mới lấy mẫu",
          explanation:
            "Một lượt không ghi số đo giúp driver hoàn tất work khởi tạo; chín lượt sau có budget hữu hạn.",
        },
        {
          title: "Báo median cạnh correctness",
          explanation:
            "Median chống một outlier đơn lẻ nhưng không làm output đúng; benchmark chỉ được dùng khi validation vẫn pass.",
        },
      ],
    },
    "p37-l09": {
      focus:
        "Ghép phần điều khiển, ba phép toán, biểu đồ output, báo cáo kiểm tra và cleanup thành một ứng dụng hoàn chỉnh.",
      expected:
        "Final chỉ dispatch khi state đổi hoặc người dùng nhấn B, vẽ sample từ GPU readback và dọn query/buffer/program trước OpenGL context.",
      files,
      steps: [
        {
          title: "Một input action, một recompute",
          explanation:
            "Calculator không có simulation time nên không chạy một triệu phần tử mỗi frame; operation/count/scalar mới đánh dấu needsRun.",
        },
        {
          title: "Vẽ output thật nhưng validation đủ N",
          explanation:
            "Cửa sổ lấy vài chục index đều nhau từ readback để vẽ; CPU/GPU validator vẫn duyệt toàn bộ output.",
        },
        {
          title: "Dọn resource khi context còn current",
          explanation:
            "Timer query, ba SSBO và program bị xóa trước SDL_GL_DestroyContext; lifetime đảo ngược đúng thứ tự tạo.",
        },
      ],
    },
  },
  references: {
    "p37-l01": [
      {
        label: "Element-wise operation",
        href: "/glossary#element-wise-operation",
        kind: "Thuật ngữ",
      },
      { label: "CPU oracle", href: "/glossary#cpu-oracle", kind: "Thuật ngữ" },
    ],
    "p37-l02": [
      {
        label: "SDL_GL_CreateContext",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
      {
        label: "glGetIntegeri_v",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glGet.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p37-l03": [
      {
        label: "Shader Storage Buffer Object",
        href: "/glossary#shader-storage-buffer-object",
        kind: "Thuật ngữ",
      },
      { label: "std430", href: "/glossary#std430-layout", kind: "Thuật ngữ" },
    ],
    "p37-l04": [
      {
        label: "glDispatchCompute",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml",
        kind: "OpenGL API",
      },
      { label: "Workgroup", href: "/glossary#compute-workgroup", kind: "Thuật ngữ" },
    ],
    "p37-l05": [
      {
        label: "gl_GlobalInvocationID",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_GlobalInvocationID.xhtml",
        kind: "OpenGL API",
      },
      { label: "Bounds guard", href: "/glossary#compute-bounds-guard", kind: "Thuật ngữ" },
    ],
    "p37-l06": [
      {
        label: "glMemoryBarrier",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
        kind: "OpenGL API",
      },
      { label: "Memory barrier", href: "/glossary#gpu-memory-barrier", kind: "Thuật ngữ" },
    ],
    "p37-l07": [
      { label: "Mixed tolerance", href: "/glossary#mixed-tolerance", kind: "Thuật ngữ" },
      { label: "CPU oracle", href: "/glossary#cpu-oracle", kind: "Thuật ngữ" },
    ],
    "p37-l08": [
      {
        label: "glBeginQuery",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glBeginQuery.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU timer query", href: "/glossary#gpu-timer-query", kind: "Thuật ngữ" },
    ],
    "p37-l09": [
      {
        label: "glDeleteBuffers",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteBuffers.xhtml",
        kind: "OpenGL API",
      },
      { label: "Phép kiểm tra có tên", href: "/glossary#named-validation", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
