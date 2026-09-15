import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p45-l01": {
      focus:
        "Tạo cửa sổ OpenGL, đặt 64 hạt đứng yên và phân biệt preview với dữ liệu tính trên GPU.",
      expected:
        "Tạo cửa sổ OpenGL, đặt 64 hạt đứng yên và phân biệt preview với dữ liệu tính trên GPU.",
      files: ["src/main.cpp", "include/particle_view.hpp", "include/molecular_math.hpp"],
      steps: [
        {
          title: "Tạo context đúng phiên bản",
          explanation: "Dùng SDL tạo OpenGL 4.3 core. Không tạo SDL_Renderer cho cửa sổ này.",
        },
        {
          title: "Đặt hạt trên lattice",
          explanation:
            "makePlan và initialPosition bố trí hạt đủ thưa; chưa có lệnh cập nhật thời gian.",
        },
        {
          title: "Vẽ một marker nhìn thấy được",
          explanation: "drawCpuPreview vẽ từng marker bằng scissor + clear trong clip của cửa sổ.",
        },
      ],
    },
    "p45-l02": {
      focus:
        "Tách các SSBO vec4, ước tính dung lượng và cho compute shader tạo position/velocity bằng seed cố định.",
      expected:
        "Tách các SSBO vec4, ước tính dung lượng và cho compute shader tạo position/velocity bằng seed cố định.",
      files: ["include/gpu_storage.hpp", "include/molecular_math.hpp", "shaders/initialize.comp"],
      steps: [
        {
          title: "Chốt layout hai phía",
          explanation:
            "Float4 là 16 byte; positions.xy giữ vị trí đã wrap, zw giữ displacement từ mốc.",
        },
        {
          title: "Tính kích thước trước allocation",
          explanation:
            "makePlan đếm cả hai bank và scratch; rejectPlan kiểm block size trước khi tạo buffer.",
        },
        {
          title: "Chạy kernel khởi tạo theo lô",
          explanation:
            "initialize.comp dùng uBase để chia lô và seed theo index; chưa copy state lớn từ CPU.",
        },
      ],
    },
    "p45-l03": {
      focus:
        "Vertex shader đọc bank đã hoàn tất; thêm pan, cursor-anchored zoom và giới hạn số marker được vẽ.",
      expected:
        "Vertex shader đọc bank đã hoàn tất; thêm pan, cursor-anchored zoom và giới hạn số marker được vẽ.",
      files: ["include/particle_view.hpp", "shaders/particle.vert", "shaders/particle.frag"],
      steps: [
        {
          title: "Bind dữ liệu vào vertex stage",
          explanation: "VAO rỗng đáp ứng core profile; gl_VertexID chọn chỉ số trong SSBO.",
        },
        {
          title: "Ánh xạ world sang clip space",
          explanation: "Camera đưa world về clip space, xử lý y của chuột ngược với world.",
        },
        {
          title: "Phân biệt số hạt tính và số hạt vẽ",
          explanation: "Stride giữ số marker không quá 100.000; lực vẫn tính trên toàn bộ N.",
        },
      ],
    },
    "p45-l04": {
      focus:
        "Mỗi invocation tự cộng lực cho một hạt, giữ U/2 và đối chiếu force-shifted LJ với oracle CPU.",
      expected:
        "Mỗi invocation tự cộng lực cho một hạt, giữ U/2 và đối chiếu force-shifted LJ với oracle CPU.",
      files: ["shaders/force.comp", "include/molecular_math.hpp", "include/gpu_kernels.hpp"],
      steps: [
        {
          title: "Quy định invocation nào ghi ở đâu",
          explanation: "Không có hai invocation cùng ghi F[i], nên không cần atomicAdd float.",
        },
        {
          title: "Giữ nguyên lực và cutoff",
          explanation:
            "minimum image và force-shifted LJ giống Project 43; cặp ngoài cutoff trả zero.",
        },
        {
          title: "Đối chiếu giá trị thay vì nhìn hình",
          explanation:
            "referenceForces dùng double trên chính input float; giới hạn 1024 hạt chặn N² ngoài ý muốn.",
        },
      ],
    },
    "p45-l05": {
      focus:
        "Atomic append vào bucket 16 slot, kiểm overflow rồi tìm hạt trong stencil tuần hoàn quanh mốc dựng.",
      expected:
        "Atomic append vào bucket 16 slot, kiểm overflow rồi tìm hạt trong stencil tuần hoàn quanh mốc dựng.",
      files: [
        "shaders/clear.comp",
        "shaders/build.comp",
        "shaders/force.comp",
        "include/reference_grid.hpp",
      ],
      steps: [
        {
          title: "Đặt số slot cho mỗi ô",
          explanation: "Mỗi cell có 16 slot; counts là số phần tử thực tế, không âm thầm clamp.",
        },
        {
          title: "Clear rồi append có kiểm tra",
          explanation:
            "atomicAdd trả slot riêng cho từng hạt. Flag overflow khiến CPU từ chối trước Force.",
        },
        {
          title: "Duyệt stencil không lặp ô",
          explanation:
            "Stencil 3×3 được wrap và deduplicate; khoảng cách hiện tại vẫn lọc bằng cutoff.",
        },
      ],
    },
    "p45-l06": {
      focus: "Drift ghi bank ứng viên, dựng grid rồi tính lực mới, kick và chỉ nhận bước hoàn tất.",
      expected:
        "Drift ghi bank ứng viên, dựng grid rồi tính lực mới, kick và chỉ nhận bước hoàn tất.",
      files: ["shaders/drift.comp", "shaders/kick.comp", "include/gpu_engine.hpp"],
      steps: [
        {
          title: "Tách committed và candidate",
          explanation: "Bank current chỉ được đọc; Drift ghi target=1-current.",
        },
        {
          title: "Drift trước lực mới",
          explanation: "Kick đầu được gộp trong Drift; Force mới phải dùng position sau Drift.",
        },
        {
          title: "Đổi bank sau kick",
          explanation:
            "Kết thúc Kick hợp lệ mới commit; bản đầu dựng grid lại mỗi bước để ưu tiên đúng.",
        },
      ],
    },
    "p45-l07": {
      focus:
        "Theo dõi displacement trên GPU, kiểm nửa skin sau drift và truy vấn quanh vị trí reference.",
      expected:
        "Theo dõi displacement trên GPU, kiểm nửa skin sau drift và truy vấn quanh vị trí reference.",
      files: [
        "shaders/drift.comp",
        "shaders/build.comp",
        "shaders/force.comp",
        "include/gpu_engine.hpp",
      ],
      steps: [
        {
          title: "Lưu độ dời chưa wrap",
          explanation:
            "positions.zw cộng độ dời thực sự đã ghi, kể cả qua biên; velocity.zw giữ phần dư làm tròn để bước nhỏ không bị mất mãi.",
        },
        {
          title: "Giảm về displacement lớn nhất",
          explanation:
            "atomicMax trên bit của float không âm thu maximum distance²; dữ liệu NaN phải bị chặn.",
        },
        {
          title: "Rebuild trước Force khi chạm ngưỡng",
          explanation:
            "CPU đọc control 16 byte sau fence; reference cell vẫn là tâm truy vấn khi grid được dùng lại.",
        },
      ],
    },
    "p45-l08": {
      focus:
        "Reduction phân tầng biến hàng triệu giá trị thành bốn số; từ chối bước có dữ liệu không hữu hạn.",
      expected:
        "Reduction phân tầng biến hàng triệu giá trị thành bốn số; từ chối bước có dữ liệu không hữu hạn.",
      files: ["shaders/diagnostics.comp", "include/gpu_engine.hpp", "include/gpu_validation.hpp"],
      steps: [
        {
          title: "Tạo K/U/P cho từng hạt",
          explanation: "Mỗi hạt tạo vec4(K_i,U_i,Px_i,Py_i); U_i đã chia đôi ở kernel Force.",
        },
        {
          title: "Cộng trong workgroup rồi giữa các group",
          explanation:
            "Shared array 256 phần tử cộng theo cây. Group đuôi nạp zero và vẫn qua mọi barrier.",
        },
        {
          title: "Đọc kết quả nhỏ sau fence",
          explanation: "Hai scratch luân phiên cho đến còn một vec4; readback không tăng theo N.",
        },
      ],
    },
    "p45-l09": {
      focus:
        "Kiểm SSBO, bộ nhớ resident/peak, chia dispatch và cho phép chọn 100.000 tới mục tiêu 5 triệu hạt.",
      expected:
        "Kiểm SSBO, bộ nhớ resident/peak, chia dispatch và cho phép chọn 100.000 tới mục tiêu 5 triệu hạt.",
      files: [
        "include/molecular_math.hpp",
        "include/gpu_queue.hpp",
        "include/gpu_engine.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Đọc giới hạn thật của GPU",
          explanation:
            "queryLimits đọc khả năng từ driver; rejectPlan kiểm thêm budget của ứng dụng.",
        },
        {
          title: "Chia lô và poll không chặn",
          explanation: "GpuQueue chỉ gửi một lô rồi poll fence với timeout zero ở frame sau.",
        },
        {
          title: "Từ chối cấu hình không an toàn",
          explanation:
            "Ô quá đông, buffer quá lớn và allocation thất bại được báo rõ, không tự tăng giới hạn.",
        },
      ],
    },
    "p45-l10": {
      focus:
        "Chạy oracle ở 64/257 hạt, kiểm quỹ đạo/reduction, đo hữu hạn và tải toàn bộ source có thể build.",
      expected:
        "Chạy oracle ở 64/257 hạt, kiểm quỹ đạo/reduction, đo hữu hạn và tải toàn bộ source có thể build.",
      files: ["include/gpu_validation.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy tests không cần GPU",
          explanation:
            "CTest chỉ gọi header thuần; Debug/Release đều dùng check, không dùng assert bị tắt.",
        },
        {
          title: "Đối chứng GPU bằng input nhỏ",
          explanation: "--verify-gpu tạo context ẩn và chạy đúng ca nhỏ, có deadline 15 giây.",
        },
        {
          title: "Đo sau warm-up và ghi rõ giới hạn",
          explanation:
            "B chạy một warm-up và năm mẫu; quá 20 giây thì hủy, không công bố số đo chưa đủ.",
        },
      ],
    },
  },
  references: {
    "p45-l01": [
      {
        label: "SDL — OpenGL context",
        href: "https://wiki.libsdl.org/SDL3/SDL_GL_CreateContext",
        kind: "SDL API",
      },
    ],
    "p45-l02": [
      {
        label: "GPU-resident state",
        href: "/glossary#gpu-resident-state",
        kind: "Thuật ngữ",
      },
    ],
    "p45-l03": [
      {
        label: "SDL — kích thước framebuffer",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels",
        kind: "SDL API",
      },
    ],
    "p45-l04": [
      {
        label: "Force-shifted cutoff",
        href: "/glossary#force-shifted-cutoff",
        kind: "Thuật ngữ",
      },
    ],
    "p45-l05": [
      {
        label: "Cell grid GPU",
        href: "/projects/gpu-spatial-grid-neighbors",
        kind: "Thuật ngữ",
      },
    ],
    "p45-l06": [
      {
        label: "Velocity Verlet",
        href: "/glossary#velocity-verlet",
        kind: "Thuật ngữ",
      },
    ],
    "p45-l07": [
      {
        label: "LAMMPS — neighbor lists",
        href: "https://docs.lammps.org/Developer_par_neigh.html",
        kind: "Thuật ngữ",
      },
    ],
    "p45-l08": [
      {
        label: "Memory barrier",
        href: "https://wikis.khronos.org/opengl/GLAPI/glMemoryBarrier",
        kind: "OpenGL API",
      },
    ],
    "p45-l09": [
      {
        label: "ClientWaitSync",
        href: "https://wikis.khronos.org/opengl/GLAPI/glClientWaitSync",
        kind: "OpenGL API",
      },
    ],
    "p45-l10": [
      {
        label: "SDL — CMake",
        href: "https://wiki.libsdl.org/SDL3/README-cmake",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
