import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p51-l01": {
      focus: "Vẽ 64 hạt CPU trong hộp 3D, orbit và resize.",
      expected: "Nhìn khối hạt từ nhiều hướng trước khi viết solver",
      files: ["include/model.hpp", "include/camera.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Dựng vị trí theo ba chỉ số",
          explanation:
            "i%side, (i/side)%side và i/side² chọn tâm ô của lattice; preview chỉ 64 hạt.",
        },
        {
          title: "Đổi world sang camera",
          explanation:
            "Đổi world sang eye space, xoay yaw/pitch và chia theo -z cho perspective; camera không sửa position.",
        },
        {
          title: "Vẽ preview nhỏ và xử lý input",
          explanation:
            "Scissor vẽ chấm trên framebuffer thật; capture/blur quản lý drag, Home đặt lại camera.",
        },
      ],
    },
    "p51-l02": {
      focus: "Layout vec4/std430 và initialization shader tạo 512 hạt.",
      expected: "Đưa dữ liệu hạt lên GPU bằng SSBO",
      files: ["include/storage.hpp", "include/engine.hpp", "shaders/initialize.comp"],
      steps: [
        {
          title: "Khóa layout CPU/GLSL",
          explanation:
            "Float4 có kích thước và alignment 16 byte để khớp GLSL; Vec3 dùng double chỉ để tính đáp án CPU.",
        },
        {
          title: "Tính bộ nhớ trước allocation",
          explanation:
            "Plan đếm hai bank, density/acceleration, CSR và scratch; limit/BufferData failure đều được báo.",
        },
        {
          title: "Khởi tạo trên GPU và chờ fence",
          explanation:
            "Initialization shader tạo 512 hạt với guard tail; ready chỉ bật sau fence, preview CPU chưa phải hình SSBO.",
        },
      ],
    },
    "p51-l03": {
      focus: "Perspective, sphere impostor có normal/depth và vertex shader đọc SSBO.",
      expected: "Vẽ hạt có chiều sâu trực tiếp từ GPU",
      files: [
        "include/view.hpp",
        "shaders/camera.glsl",
        "shaders/particle.vert",
        "shaders/particle.frag",
      ],
      steps: [
        {
          title: "Đọc đúng bank hiện tại",
          explanation:
            "Vertex shader lấy position từ SSBO của bank đã commit, không readback mảng.",
        },
        {
          title: "Xoay camera thay vì state",
          explanation:
            "Yaw/pitch/zoom nằm trong view; depth test xử lý che khuất, resize giữ world.",
        },
        {
          title: "Vẽ thể tích thay vì đĩa phẳng",
          explanation:
            "Tia camera cắt sphere, normal dùng cho shading và gl_FragDepth dùng độ sâu mặt cầu. uStride=1 vẽ toàn N, không giảm workload ngầm.",
        },
      ],
    },
    "p51-l04": {
      focus: "Cubic spline 3D, gradient và support sphere.",
      expected: "Đổi kernel từ diện tích sang thể tích",
      files: ["include/kernel.hpp", "shaders/common.glsl"],
      steps: [
        {
          title: "Kiểm đơn vị của density/mass",
          explanation: "rho0 là kg/m³, m=rho0*s³; refinement giữ khối 0.4 m và 64 kg.",
        },
        {
          title: "Chuẩn hóa kernel 3D",
          explanation: "Dùng 1/(πh³), kiểm 4π∫r²Wdr độc lập; không mang normalization 2D sang.",
        },
        {
          title: "Đạo hàm và xử lý r=0",
          explanation:
            "Lấy derivative theo q rồi nhân 1/h và displacement/r; r=0/support xử lý riêng.",
        },
      ],
    },
    "p51-l05": {
      focus: "All-pairs có self, một invocation ghi một hạt và barrier.",
      expected: "Tính density trên GPU với một ca nhỏ",
      files: [
        "include/reference.hpp",
        "include/passes.hpp",
        "include/engine.hpp",
        "shaders/density.comp",
      ],
      steps: [
        {
          title: "Giữ bản CPU làm oracle",
          explanation: "CPU oracle trực tiếp cộng mW có self và từ chối N>512.",
        },
        {
          title: "Ghi density vào buffer riêng",
          explanation:
            "Một invocation ghi một density record; rho/pressure/error không alias position.",
        },
        {
          title: "Đọc density sau batch hoàn tất",
          explanation:
            "N chỉ tính density; barrier cho GPU consumer, fence mới cho phép CPU kiểm. L chuyển water/density để quan sát, position chưa đổi.",
        },
      ],
    },
    "p51-l06": {
      focus: "EOS, lực đối xứng 3D và thứ tự density→force.",
      expected: "Thêm pressure và artificial viscosity",
      files: [
        "include/kernel.hpp",
        "include/reference.hpp",
        "shaders/force.comp",
        "shaders/density.comp",
      ],
      steps: [
        {
          title: "Đổi density thành pressure",
          explanation: "EOS clamp p>=0, cùng rho/c cho đáp án được tính bằng tay.",
        },
        {
          title: "Cộng lực theo vector 3D",
          explanation: "Coefficient đối xứng đọc cả hai hạt, gradient 3D odd; self chỉ bỏ ở force.",
        },
        {
          title: "Tách pressure khỏi tiêu tán số",
          explanation: "Monaghan chỉ bật khi vij·rij âm; alpha không phải độ nhớt vật lý.",
        },
      ],
    },
    "p51-l07": {
      focus: "Gravity, semi-implicit Euler, sáu thành và ping-pong.",
      expected: "Cho khối nước chuyển động mà không ghi đè state",
      files: ["include/reference.hpp", "include/engine.hpp", "shaders/integrate.comp"],
      steps: [
        {
          title: "Tính toàn bộ force từ state cũ",
          explanation: "Force hoàn tất cho cả state cũ rồi mới thêm gravity/integrate.",
        },
        {
          title: "Viết sang bank kế tiếp",
          explanation: "vNew trước xNew, collision sáu mặt chỉ phản xạ normal hướng ra.",
        },
        {
          title: "Commit bank sau fence",
          explanation: "Host đổi current và tăng tick/time sau fence; thất bại không commit bank.",
        },
      ],
    },
    "p51-l08": {
      focus: "Count→scan→scatter, 27 cell và oracle all-pairs.",
      expected: "Dựng spatial grid 3D hoàn toàn trên GPU",
      files: [
        "include/passes.hpp",
        "shaders/count.comp",
        "shaders/scan.comp",
        "shaders/scatter.comp",
        "shaders/density.comp",
        "shaders/force.comp",
      ],
      steps: [
        {
          title: "Đếm cell và exclusive scan",
          explanation:
            "Clear/count bằng atomic; scan các block sums tới một block rồi uniform-add đi xuống.",
        },
        {
          title: "Scatter ID vào đoạn liên tiếp",
          explanation: "Cursors khởi từ offsets, atomic scatter lưu ID mỗi hạt đúng một lần.",
        },
        {
          title: "Duyệt 27 cell và lọc support thật",
          explanation:
            "Duyệt 27 cell rồi lọc theo khoảng cách support. Nếu vượt 4096 ứng viên, báo lỗi thay vì trả lực từ một danh sách bị cắt cụt.",
        },
      ],
    },
    "p51-l09": {
      focus: "Reduction nhiều tầng cho vmax/amax, lỗi và dt.",
      expected: "Chọn timestep từ dữ liệu đang nằm trên GPU",
      files: [
        "include/model.hpp",
        "include/passes.hpp",
        "include/engine.hpp",
        "shaders/stats.comp",
        "shaders/max.comp",
        "shaders/integrate.comp",
      ],
      steps: [
        {
          title: "Gom extrema và cờ lỗi",
          explanation:
            "Stats record chứa vmax/amax/rhoMax/error; lane đuôi pad 0 nhưng vẫn tới barrier.",
        },
        {
          title: "Thu các block tới một record",
          explanation:
            "Hai scratch buffers thu record bằng max tới một; không CPU-reduce block sums.",
        },
        {
          title: "Dùng dt của chính force hiện tại",
          explanation:
            "Integration đọc root của force vừa tính, chọn acoustic/force bound; dt < 1e−6 từ chối.",
        },
      ],
    },
    "p51-l10": {
      focus: "Một batch pending, poll không chặn, pause và benchmark hữu hạn.",
      expected: "Giữ ứng dụng phản hồi khi GPU đang tính",
      files: [
        "include/queue.hpp",
        "include/gpu-error.hpp",
        "include/benchmark.hpp",
        "include/controls.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Poll fence thay vì chờ đồng bộ",
          explanation:
            "Timeout 0 là poll trạng thái. Lỗi fence/deadline mang kiểu GpuBatchError, đi qua UI/oracle tới main để dừng mọi submit, không bị biến thành lỗi nút bấm có thể bỏ qua.",
        },
        {
          title: "Dừng submit khi pause/mất focus",
          explanation: "Pause/blur/cancel ngăn work tương lai, không preempt GPU command đã gửi.",
        },
        {
          title: "Warm-up, đo rồi dừng",
          explanation:
            "B reset cùng N, warm-up 30 tick, lấy 8 compute và 8 frozen-render samples; báo median/min/max. GPU pass, CPU enqueue, commit và model time có nhãn riêng.",
        },
      ],
    },
    "p51-l11": {
      focus: "48³ là mốc chuẩn, 80³/100³ nâng cao; kiểm tài nguyên trước allocation.",
      expected: "Tăng số hạt sau khi kiểm tra tài nguyên",
      files: ["include/model.hpp", "include/storage.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ mass/thể tích khi tinh hạt",
          explanation: "Side tăng thì spacing/mass giảm, tổng 64 kg giữ nguyên cho preset đầy đủ.",
        },
        {
          title: "Kiểm giới hạn GL và budget bộ nhớ",
          explanation:
            "Kiểm SSBO/groups/shared/peak budget 192 MiB; allocation mới thất bại giữ workload cũ.",
        },
        {
          title: "Xác nhận rồi mới cấp phát workload lớn",
          explanation:
            "Final mở paused ở 110.592; phím 1–5 chỉ chọn, Enter mới allocate. Vẽ toàn N, không draw cap/stride ngầm; 512k/1M chưa mặc nhiên được nghiệm thu.",
        },
      ],
    },
    "p51-l12": {
      focus: "257/512 hạt, CSR permutation, force, integration và source đầy đủ.",
      expected: "Kiểm chứng CPU↔GPU và chạy khối nước hoàn chỉnh",
      files: ["include/validation.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm công thức bằng ca độc lập",
          explanation:
            "Volume normalization, finite difference, pair power và active timestep có oracle độc lập.",
        },
        {
          title: "So buffer trước/sau với CPU oracle",
          explanation:
            "Sáu fixture kiểm initialization, tail, pressure/viscosity khác 0, scan nhiều tầng, extrema/dt CPU độc lập và integration hai tick.",
        },
        {
          title: "Chạy tests nhỏ trước workload lớn",
          explanation:
            "ZIP tự build, CTest giữ checks trong Release; PASS nhỏ không chứng nhận workload triệu hạt.",
        },
      ],
    },
  },
  references: {
    "p51-l01": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l02": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l03": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l04": [
      {
        label: "Cubic spline 3D",
        href: "https://pysph.readthedocs.io/en/main/reference/kernels.html",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l05": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l06": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l07": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l08": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l09": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l10": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l11": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
    "p51-l12": [
      {
        label: "SPH 3D GPU pipeline",
        href: "/glossary#sph-gpu-pipeline",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
