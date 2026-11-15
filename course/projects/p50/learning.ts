import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p50-l01": {
      focus: "Nối dữ liệu hạt với hình vẽ trước khi nghĩ tới lực.",
      expected: "1.000 chấm đứng yên trong bể; resize không đổi tọa độ world.",
      files: [
        "src/main.cpp",
        "include/sph/model.hpp",
        "include/sph/scenes.hpp",
        "include/app/draw.hpp",
      ],
      steps: [
        {
          title: "Chạy khung",
          explanation:
            "main khởi tạo SDL/window/renderer tuần tự, kiểm lỗi và giữ event loop trong lúc chưa có solver.",
        },
        {
          title: "Tạo dữ liệu",
          explanation:
            "makeState dùng i%columns và i/columns để đặt hạt; requested=1000 ở bài đầu.",
        },
        {
          title: "Nối vào renderer",
          explanation:
            "toScreen đổi y hướng lên sang y hướng xuống; draw dùng position, không sửa physics.",
        },
      ],
    },
    "p50-l02": {
      focus: "Phân biệt hạt rơi với fluid.",
      expected: "Sau mười lần N, velocity và position đã đổi; không có lực đẩy giữa các hạt.",
      files: ["include/sph/boundary.hpp", "include/sph/solver.hpp"],
      steps: [
        { title: "Gán acceleration", explanation: "step đặt ax=0, ay=-gravity cho toàn bộ hạt." },
        {
          title: "Tích phân",
          explanation:
            "integrate cập nhật velocity rồi position với dt=0,01 ở các bài chưa có pressure.",
        },
        {
          title: "Giữ biên",
          explanation:
            "collide chỉ phản xạ normal đang hướng ra ngoài, không đảo chiều velocity đã đi vào.",
        },
      ],
    },
    "p50-l03": {
      focus: "Tự viết trọng số và hướng biến thiên của nó.",
      expected: "Kernel tắt ở 2h; gradient bằng 0 ở r=0, không có NaN.",
      files: ["include/sph/kernel.hpp", "include/app/draw.hpp"],
      steps: [
        { title: "Đặt đơn vị", explanation: "W có m^-2, mW có kg/m²; bán kính vẽ không phải h." },
        {
          title: "Viết hai nhánh",
          explanation:
            "kernel dùng q=r/h và hệ số 10/(7πh²). Gradient đạo hàm theo q rồi nhân displacement/r.",
        },
        {
          title: "Đọc hình",
          explanation: "Bật inspector/chọn hạt trong Canvas, xem vòng support và đồ thị.",
        },
      ],
    },
    "p50-l04": {
      focus: "Tính density tại vị trí đang nhìn, không dùng màu thay số.",
      expected: "Hạt mặt thoáng có tổng thấp hơn; mẫu ngoài tường bù một phần support.",
      files: [
        "include/sph/scenes.hpp",
        "include/sph/neighbors.hpp",
        "include/sph/forces.hpp",
        "include/sph/solver.hpp",
      ],
      steps: [
        {
          title: "Liệt kê mẫu",
          explanation: "samples ghép fluid trước, walls sau; self vẫn nằm trong danh sách.",
        },
        {
          title: "Cộng mW",
          explanation: "computeDensity hoàn tất mọi hạt trước khi pressure/force đọc dữ liệu.",
        },
        {
          title: "Cập nhật inspector",
          explanation:
            "inspectCurrent tính lại density ở vị trí sau integrate; không gắn số cũ lên hạt mới.",
        },
      ],
    },
    "p50-l05": {
      focus: "Suy lực từ độ nén, không thêm repulsion tùy ý.",
      expected: "Cặp có density cho trước cho hai lực ngược dấu; pressure 2D có N/m.",
      files: ["include/sph/forces.hpp", "include/sph/solver.hpp"],
      steps: [
        {
          title: "Đổi density ra pressure",
          explanation:
            "computePressure dùng p=max(0,c²(ρ−ρ0)); clamp âm tránh tensile attraction của mô hình này.",
        },
        {
          title: "Lực đối xứng",
          explanation:
            "computeForces đọc pressure/density của cả hai hạt, không update position trong neighbor loop.",
        },
        {
          title: "Ghép pipeline",
          explanation:
            "step gọi neighbors→density→pressure→forces→integrate; từ bài này dt cố định là 0,00025 s.",
        },
      ],
    },
    "p50-l06": {
      focus: "Đặt độ tiêu tán vào đúng cặp và đúng dấu.",
      expected: "Pi/power bằng 0 khi tách ra, power không dương khi tiến lại gần.",
      files: ["include/sph/kernel.hpp", "include/sph/forces.hpp"],
      steps: [
        { title: "Kiểm dot", explanation: "(v_i−v_j)·(x_i−x_j)<0 nghĩa là đang tiến lại gần." },
        {
          title: "Thêm Pi",
          explanation:
            "artificialViscosity dùng alpha,c và density trung bình; không nhân dt trong lực.",
        },
        {
          title: "Đối chiếu",
          explanation:
            "Mở thí nghiệm cặp, thay hướng chuyển động nhưng giữ density để tách viscosity khỏi pressure.",
        },
      ],
    },
    "p50-l07": {
      focus: "Grid giảm search, không giảm số hạt.",
      expected: "Neighbor IDs và lực giữ nguyên; số ứng viên thấp hơn all-pairs.",
      files: ["include/sph/neighbors.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Count/prefix/scatter",
          explanation: "Grid.starts chia ids thành dải liên tiếp cho từng cell; cell size=2h.",
        },
        {
          title: "Tìm stencil",
          explanation: "Duyệt 3×3 cell và cutoff thật; sort IDs giữ cùng thứ tự cộng với oracle.",
        },
        {
          title: "So toàn pipeline",
          explanation:
            "Tests so danh sách, density, pressure, acceleration và trajectory; không chỉ so count.",
        },
      ],
    },
    "p50-l08": {
      focus: "Chọn dt theo state, rồi giữ UI có ngân sách.",
      expected: "Dt giảm khi tăng c/speed/force; app báo dropped time thay vì chạy bù vô hạn.",
      files: ["include/sph/solver.hpp", "include/app/state.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Acoustic/force bound",
          explanation: "chooseDt lấy min với 0,001 s; dưới 1e−7 dừng, không clamp velocity.",
        },
        {
          title: "Gọi trong loop",
          explanation: "main đo elapsed rồi gọi App.advance, sau đó refresh/draw.",
        },
        {
          title: "Giới hạn work",
          explanation:
            "Mỗi frame tối đa 24 bước và khoảng 12 ms; bước đang chạy luôn được hoàn tất.",
        },
      ],
    },
    "p50-l09": {
      focus: "Tăng tới bản chuẩn và dựng mặt nước trung thực từ hạt.",
      expected: "Default 5.000 hạt, updated/drawn đều 5.000 sau bước; không có LOD solver.",
      files: [
        "include/sph/scenes.hpp",
        "include/sph/surface.hpp",
        "include/app/state.hpp",
        "include/app/draw.hpp",
      ],
      steps: [
        {
          title: "Đổi mặc định",
          explanation: "App.requested=5000 từ checkpoint 9; 1000/10000 vẫn là preset riêng.",
        },
        {
          title: "Splat trường phủ",
          explanation:
            "reconstruct duyệt mọi hạt, cộng compact blob vào coverage; radius hình không đổi h của SPH.",
        },
        {
          title: "Tô mặt",
          explanation:
            "shade đọc coverage và gradient để làm mép nước sáng; texture chỉ phục vụ presentation.",
        },
      ],
    },
    "p50-l10": {
      focus: "Vòi đưa thêm mass vào hệ một cách công khai.",
      expected: "Một đợt tối đa bảy hạt; phát lại khi paused bị từ chối overlap.",
      files: ["include/sph/emitter.hpp", "include/app/input.hpp", "include/app/state.hpp"],
      steps: [
        {
          title: "Kiểm chỗ trống",
          explanation: "emitBurst kiểm tank/paddle/overlap/capacity trước khi push_back.",
        },
        {
          title: "Bắt input",
          explanation:
            "handle đổi event window sang logical render, capture trong drag; motion chỉ đổi nozzle.",
        },
        {
          title: "Theo thời gian mô hình",
          explanation:
            "App.oneStep phát sau mỗi 0,025 s mô phỏng khi bật E; không phát theo số mouse event.",
        },
      ],
    },
    "p50-l11": {
      focus: "Biên chuyển động cần cả vị trí lẫn vận tốc.",
      expected: "Kéo chỉ đổi target; khi chạy, paddle đi tối đa 3 m/s và nước va vào biên mới.",
      files: [
        "include/sph/scenes.hpp",
        "include/sph/boundary.hpp",
        "include/sph/solver.hpp",
        "include/app/input.hpp",
      ],
      steps: [
        {
          title: "Lấy mẫu vật rắn",
          explanation: "samples thêm ba vòng bên trong paddle, có velocity của biên.",
        },
        {
          title: "Tiến target",
          explanation:
            "targetPaddle kẹp vùng hợp lệ; movePaddle chạy với dt trong physics step, không teleport qua event.",
        },
        {
          title: "Chống xuyên",
          explanation:
            "collide sửa position và relative normal velocity; không có rigid-body response hoặc ma sát chính xác.",
        },
      ],
    },
    "p50-l12": {
      focus: "Tách hình đẹp, phép tính đúng và giới hạn mô hình.",
      expected: "Ca chuẩn PASS trên state riêng; ZIP/final/CTest chạy độc lập.",
      files: [
        "include/sph/reference.hpp",
        "include/sph/metrics.hpp",
        "tests/tests.cpp",
        "tests/benchmark.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Oracle độc lập",
          explanation:
            "Kiểm integral/finite difference/pair, all-pairs và equilibrium zero-gravity với ngưỡng riêng.",
        },
        {
          title: "Ca lớn",
          explanation:
            "Dam/pool 5000 theo dõi density distribution, dt/leakage và count; không chỉ kiểm finite.",
        },
        {
          title: "Bàn giao",
          explanation:
            "Build Debug/Release từng checkpoint, đo Release với warm-up/repetitions; ghi máy và loại chi phí.",
        },
      ],
    },
  },
  references: {
    "p50-l01": [
      {
        label: "SDL_RenderLine",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderLine",
        kind: "SDL API",
      },
    ],
    "p50-l02": [{ label: "SPH và integration", href: "/glossary#sph-water", kind: "Thuật ngữ" }],
    "p50-l03": [
      {
        label: "Cubic spline 2D — PySPH",
        href: "https://pysph.readthedocs.io/en/main/reference/kernels.html",
        kind: "Thuật ngữ",
      },
    ],
    "p50-l04": [
      {
        label: "Summation density — PySPH",
        href: "https://pysph.readthedocs.io/en/main/reference/equations.html",
        kind: "Thuật ngữ",
      },
    ],
    "p50-l05": [{ label: "Equation of state", href: "/glossary#sph-eos", kind: "Thuật ngữ" }],
    "p50-l06": [
      {
        label: "Monaghan artificial viscosity — PySPH",
        href: "https://pysph.readthedocs.io/en/main/reference/equations.html",
        kind: "Thuật ngữ",
      },
    ],
    "p50-l07": [{ label: "Support và grid", href: "/glossary#sph-kernel-2d", kind: "Thuật ngữ" }],
    "p50-l08": [{ label: "SPH timestep", href: "/glossary#sph-timestep", kind: "Thuật ngữ" }],
    "p50-l09": [
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
    ],
    "p50-l10": [
      {
        label: "SDL_RenderCoordinatesFromWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow",
        kind: "SDL API",
      },
    ],
    "p50-l11": [
      { label: "Biên của mô hình SPH", href: "/glossary#sph-summation-density", kind: "Thuật ngữ" },
    ],
    "p50-l12": [
      { label: "CMake của SDL", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
