import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/reduction_math.hpp",
  "include/gl_api.hpp",
  "include/compute_program.hpp",
  "include/reduction_gpu_engine.hpp",
  "shaders/reduce.comp",
  "shaders/scan_blocks.comp",
  "shaders/uniform_add.comp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p39-l01": {
      focus:
        "Định nghĩa rõ reduction và exclusive scan, tạo input có thể tái lập rồi tính hai kết quả đối chiếu trên CPU trước khi viết shader.",
      expected: "Checkpoint 1 in tổng và prefix của mảng nhỏ; [3,1,4,2] cho 10 và [0,3,4,8].",
      files,
      steps: [
        {
          title: "Đặt tên đúng cho hai output",
          explanation:
            "Reduction thu N giá trị về một scalar; exclusive scan vẫn trả N giá trị và không tính input hiện tại vào output cùng index.",
        },
        {
          title: "Dùng double cho bản kết quả CPU",
          explanation:
            "GPU vẫn cộng float, còn bản CPU tích lũy bằng double để không lặp lại đúng thứ tự làm tròn của cây cộng trong shader.",
        },
        {
          title: "Khóa input bằng seed",
          explanation:
            "Cùng số phần tử và seed phải sinh lại đúng dãy; đổi seed tạo dữ liệu mới nhưng một lỗi vẫn có thể được tái hiện chính xác.",
        },
      ],
    },
    "p39-l02": {
      focus:
        "Tính trước reduction/scan hierarchy, số block và zero padding cho mọi count, kể cả 1.000.003.",
      expected:
        "Checkpoint 2 báo ba tầng 1.954→4→1, 445 ô padding ở tầng đầu và năm dispatch cho global scan.",
      files,
      steps: [
        {
          title: "Gom 512 giá trị mỗi block",
          explanation:
            "256 invocation nạp hai phần tử mỗi lane; block span 512 là đơn vị chung của reduction và Blelloch scan.",
        },
        {
          title: "Lặp ceil division tới một",
          explanation:
            "Output count của tầng hiện tại trở thành input count của tầng tiếp theo, vì vậy plan được dựng mà không cần nhìn dữ liệu thật.",
        },
        {
          title: "Ghi rõ phần đuôi là zero",
          explanation:
            "Zero là identity của phép cộng; lane ngoài count vẫn tham gia barrier nhưng nạp zero thay vì return sớm.",
        },
      ],
    },
    "p39-l03": {
      focus:
        "Nạp 512 giá trị vào shared memory và reduction theo stride với barrier đúng sau từng bước.",
      expected:
        "Checkpoint 3 dispatch một workgroup, lane 0 ghi một partial sum và block ngắn được zero-pad an toàn.",
      files,
      steps: [
        {
          title: "Mỗi lane nạp hai vị trí",
          explanation:
            "Lane i đọc base+i và base+i+256 nếu hợp lệ; mọi lane vẫn đi tới barrier nên không được return vì tail.",
        },
        {
          title: "Thu cây bằng stride giảm một nửa",
          explanation:
            "Sau mỗi phép cộng, barrier đảm bảo vòng stride kế tiếp nhìn thấy shared values vừa được ghi.",
        },
        {
          title: "Chỉ lane 0 xuất block sum",
          explanation:
            "Mỗi group tạo đúng một output, giúp tầng sau nhỏ hơn khoảng 512 lần thay vì tranh chấp một atomic scalar.",
        },
      ],
    },
    "p39-l04": {
      focus:
        "Lặp reduction kernel qua partial sums bằng scratch ping-pong cho tới khi chỉ còn một scalar.",
      expected:
        "Checkpoint 4 chạy ba dispatch cho N=1.000.003 và không có intermediate glGetBufferSubData.",
      files,
      steps: [
        {
          title: "Theo dõi count và buffer nguồn",
          explanation:
            "Sau mỗi pass, groupCount trở thành count mới; buffer vừa ghi trở thành nguồn của dispatch kế tiếp.",
        },
        {
          title: "Ping-pong scratch A/B",
          explanation:
            "Hai buffer đủ cho mọi tầng vì partial sums giảm dần và shader không đọc/ghi cùng một record trong một pass.",
        },
        {
          title: "Readback đúng một lần",
          explanation:
            "CPU chỉ cần scalar cuối; partial sums ở tầng 1.954 và 4 tiếp tục sống trên GPU.",
        },
      ],
    },
    "p39-l05": {
      focus:
        "Cài Blelloch upsweep/downsweep và giải thích thao tác đặt root về zero tạo exclusive output.",
      expected:
        "Checkpoint 5 scan đúng một block 512 giá trị, đồng thời ghi total trước khi root bị thay bằng zero.",
      files,
      steps: [
        {
          title: "Upsweep gom total lên root",
          explanation:
            "Offset tăng gấp đôi; mỗi lane phụ trách một node phải ở chỉ số cuối của đoạn cây tương ứng.",
        },
        {
          title: "Lưu total rồi đặt root zero",
          explanation:
            "Block sum phải được ghi trước; zero tại root chính là prefix đứng trước toàn bộ block.",
        },
        {
          title: "Downsweep đổi tổng thành prefix",
          explanation:
            "Mỗi node swap giá trị nhánh trái và cộng nó vào nhánh phải, rồi barrier trước mức cây tiếp theo.",
        },
      ],
    },
    "p39-l06": {
      focus:
        "Chạy block scan trên toàn mảng và tách local prefix output khỏi block sums cần xử lý tiếp.",
      expected:
        "Checkpoint 6 tạo 1.954 dãy local prefix và buffer 1.954 block sums cho N=1.000.003.",
      files,
      steps: [
        {
          title: "Giữ bounds ở load/store",
          explanation:
            "Tail lane nạp zero nhưng vẫn tham gia barrier; chỉ store output khi index còn trong count.",
        },
        {
          title: "Một output buffer, một sums buffer",
          explanation:
            "Local prefix và tổng của block sẽ được dùng ở hai bước khác nhau, vì vậy chúng cần hai buffer và hai binding riêng.",
        },
        {
          title: "Nhìn ra lỗi reset về zero",
          explanation:
            "Đầu mỗi block sau block 0 vẫn bằng zero; đó là kết quả local đúng nhưng chưa phải global scan.",
        },
      ],
    },
    "p39-l07": {
      focus: "Scan đệ quy block sums và uniform-add offsets theo thứ tự ngược của hierarchy.",
      expected:
        "Checkpoint 7 chạy ba scan passes rồi hai uniform-add passes, toàn bộ intermediate state ở SSBO.",
      files,
      steps: [
        {
          title: "Scan block sums bằng cùng kernel",
          explanation:
            "Mảng 1.954 block sum lại trở thành input của cùng thuật toán scan, tiếp tục thu thành 4 rồi 1 block sum.",
        },
        {
          title: "Đi xuống hierarchy theo thứ tự ngược",
          explanation:
            "Offsets của tầng nhỏ phải hoàn chỉnh trước khi được cộng vào scan của tầng lớn hơn.",
        },
        {
          title: "Uniform-add theo block index",
          explanation:
            "Mỗi output[index] cộng blockOffsets[index/512]; block 0 nhận offset zero nên giữ nguyên.",
        },
      ],
    },
    "p39-l08": {
      focus:
        "Ghi rõ compute pass nào tạo ra từng buffer, bước nào đọc tiếp theo và barrier nào cần đặt giữa hai bước.",
      expected:
        "Checkpoint 8 dùng SHADER_STORAGE giữa dispatches và BUFFER_UPDATE duy nhất trước scalar/full-output readback.",
      files,
      steps: [
        {
          title: "Vẽ chuỗi pass bằng tên buffer",
          explanation:
            "Mỗi mũi tên ghi rõ program vừa tạo dữ liệu, buffer được ghi và program hoặc lệnh readback sẽ dùng dữ liệu đó.",
        },
        {
          title: "Phân biệt barrier trong và ngoài workgroup",
          explanation:
            "GLSL barrier đồng bộ lanes trong một dispatch; glMemoryBarrier nối visibility giữa hai OpenGL commands.",
        },
        {
          title: "Không dùng ALL_BARRIER_BITS",
          explanation:
            "Chọn đúng bit cho biết ta đã xác định được bước đọc tiếp theo, thay vì dùng một hàng rào quá rộng để che sự thiếu rõ ràng.",
        },
      ],
    },
    "p39-l09": {
      focus:
        "Kiểm reduction và scan bằng kết quả CPU cùng các điều kiện bắt buộc, rồi đo toàn bộ chuỗi pass bằng query ring không chặn frame.",
      expected:
        "Checkpoint 9 bắt NaN, tail, wrong offset và first mismatch; timing chỉ cập nhật khi query slot available.",
      files,
      steps: [
        {
          title: "Kiểm điều kiện bắt buộc trước sai số",
          explanation:
            "Kích thước, giá trị hữu hạn và output[0]=0 phát hiện lỗi cấu trúc trước; mixed tolerance chỉ được dùng sau đó để xử lý roundoff hợp lệ.",
        },
        {
          title: "So adjacent delta và total",
          explanation:
            "output[i+1]-output[i] phải gần input[i], còn output[N-1]+input[N-1] phải gần reduction total.",
        },
        {
          title: "Đo cả chuỗi pass nhưng không chờ",
          explanation:
            "Query bao quanh các dispatch/barrier; CPU bỏ sample khi slot bận thay vì làm ứng dụng đứng để lấy số đẹp.",
        },
      ],
    },
    "p39-l10": {
      focus:
        "Ghép hai phép toán, các preset, seed/reset, phần minh họa, kiểm tra kết quả, đo thời gian và cleanup thành ứng dụng hoàn chỉnh.",
      expected:
        "Final chạy event-driven, hỗ trợ Tab/1–4/R/V/B, hiển thị pass count thật và dọn mọi query/program/buffer trước context.",
      files,
      steps: [
        {
          title: "Một thay đổi tạo một recompute",
          explanation:
            "Workbench không có simulation clock; nó chỉ dispatch khi operation/count/seed đổi hoặc người dùng yêu cầu benchmark.",
        },
        {
          title: "Đặt correctness cạnh timing",
          explanation:
            "Title và console luôn báo pass count, max error và PASS/FAIL cạnh GPU median để timing không mất ngữ cảnh.",
        },
        {
          title: "Dọn theo thứ tự ngược",
          explanation:
            "Query, hierarchy buffers và programs bị xóa khi OpenGL context vẫn current; SDL context/window bị hủy sau cùng.",
        },
      ],
    },
  },
  references: {
    "p39-l01": [
      { label: "Reduction", href: "/glossary#parallel-reduction", kind: "Thuật ngữ" },
      { label: "Exclusive prefix sum", href: "/glossary#exclusive-prefix-sum", kind: "Thuật ngữ" },
    ],
    "p39-l02": [
      { label: "Ceil division", href: "/glossary#ceil-division", kind: "Thuật ngữ" },
      {
        label: "Floating-point reduction order",
        href: "/glossary#floating-reduction-order",
        kind: "Thuật ngữ",
      },
    ],
    "p39-l03": [
      {
        label: "Shared variable",
        href: "https://www.khronos.org/opengl/wiki/Compute_Shader",
        kind: "OpenGL API",
      },
      { label: "Workgroup barrier", href: "/glossary#workgroup-barrier", kind: "Thuật ngữ" },
    ],
    "p39-l04": [
      {
        label: "glDispatchCompute",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDispatchCompute.xhtml",
        kind: "OpenGL API",
      },
      {
        label: "Hierarchical reduction",
        href: "/glossary#hierarchical-reduction",
        kind: "Thuật ngữ",
      },
    ],
    "p39-l05": [
      { label: "Blelloch scan", href: "/glossary#blelloch-scan", kind: "Thuật ngữ" },
      { label: "Prefix sum", href: "/glossary#exclusive-prefix-sum", kind: "Thuật ngữ" },
    ],
    "p39-l06": [
      {
        label: "Shader Storage Buffer Object",
        href: "/glossary#shader-storage-buffer-object",
        kind: "Thuật ngữ",
      },
      { label: "Compute workgroup", href: "/glossary#compute-workgroup", kind: "Thuật ngữ" },
    ],
    "p39-l07": [
      { label: "Uniform add", href: "/glossary#scan-uniform-add", kind: "Thuật ngữ" },
      { label: "Hierarchical scan", href: "/glossary#hierarchical-scan", kind: "Thuật ngữ" },
    ],
    "p39-l08": [
      {
        label: "glMemoryBarrier",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glMemoryBarrier.xhtml",
        kind: "OpenGL API",
      },
      { label: "GPU memory barrier", href: "/glossary#gpu-memory-barrier", kind: "Thuật ngữ" },
    ],
    "p39-l09": [
      { label: "Mixed tolerance", href: "/glossary#mixed-tolerance", kind: "Thuật ngữ" },
      {
        label: "Asynchronous query ring",
        href: "/glossary#asynchronous-query-ring",
        kind: "Thuật ngữ",
      },
    ],
    "p39-l10": [
      { label: "Phép kiểm tra có tên", href: "/glossary#named-validation", kind: "Thuật ngữ" },
      {
        label: "glDeleteBuffers",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteBuffers.xhtml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
