import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p40-l01": {
      focus: "Có mặt vải chạy độc lập trước khi thêm solver.",
      expected:
        "Perspective/depth, hai mặt, pattern và camera; chưa gọi đây là cloth GPU nghiệm thu.",
      files: [
        "include/cloth_topology.hpp",
        "include/cloth_camera.hpp",
        "include/cloth_renderer.hpp",
      ],
      steps: [
        {
          title: "Chạy scaffold",
          explanation: "Window/loader/camera/ray helpers có trong gói, không cần project khác.",
        },
        {
          title: "Theo một vertex",
          explanation:
            "Rest position và tam giác tạo bề mặt; renderer không sinh chuyển động thay solver.",
        },
        {
          title: "Nhìn hai phía",
          explanation:
            "Orbit/pan/zoom thay camera, không sửa mesh; depth và normal quyết định hình thấy được.",
        },
      ],
    },
    "p40-l02": {
      focus: "Prediction đi từ lực và h, không từ hàm sin.",
      expected: "Previous giữ vị trí đầu substep, pin không rơi, velocity có đơn vị m/s.",
      files: ["include/cloth_cpu.hpp", "include/cloth_math.hpp", "shaders/cloth_solver.comp"],
      steps: [
        {
          title: "Khóa đơn vị",
          explanation: "Position tính bằng m, h bằng s, gravity/wind acceleration bằng m/s².",
        },
        {
          title: "Dự đoán",
          explanation:
            "Cộng gia tốc vào velocity rồi tiến vị trí; giữ previous cho bước velocity sau solve.",
        },
        {
          title: "Giữ pin",
          explanation: "Inverse mass zero không nhận gravity hoặc correction vị trí.",
        },
      ],
    },
    "p40-l03": {
      focus: "Tính một constraint có đáp án độc lập.",
      expected: "Correction có hướng/khối lượng đúng; alpha/h² và lambda không bị bỏ qua.",
      files: ["include/cloth_cpu.hpp", "include/cloth_topology.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đo sai số",
          explanation: "C=length(xb-xa)-restLength; gradient hai đầu ngược dấu.",
        },
        {
          title: "Tính delta lambda",
          explanation: "Mẫu số gồm inverse masses và compliance chia h²; lambda thuộc constraint.",
        },
        {
          title: "Sửa hai đầu",
          explanation:
            "Đầu nhẹ dịch nhiều hơn, pin weight zero; zero length có hướng fallback hữu hạn.",
        },
      ],
    },
    "p40-l04": {
      focus: "Topology vật lý không trùng danh sách tam giác.",
      expected: "CPU baseline nhỏ có stretch/shear/bend-distance, pin và residual.",
      files: ["include/cloth_topology.hpp", "include/cloth_cpu.hpp"],
      steps: [
        {
          title: "Tạo mặt lưới",
          explanation: "ID hàng/cột ổn định, winding thống nhất, rest positions tách khỏi state.",
        },
        {
          title: "Nối constraints",
          explanation:
            "Ngang/dọc stretch, chéo shear, hai cạnh xấp xỉ bend; không gọi là dihedral.",
        },
        {
          title: "Giải CPU nhỏ",
          explanation: "Giữ cùng schedule và snapshot để baseline so được GPU sau này.",
        },
      ],
    },
    "p40-l05": {
      focus: "Mỗi vertex có một writer trong một màu.",
      expected: "CPU kiểm coloring; dispatch theo màu, công bố SSBO writes trước màu sau.",
      files: ["include/cloth_topology.hpp", "include/cloth_gpu.hpp", "shaders/cloth_solver.comp"],
      steps: [
        {
          title: "Tìm xung đột",
          explanation: "Hai cạnh cùng đầu mút không cập nhật position đồng thời.",
        },
        {
          title: "Đóng gói theo màu",
          explanation: "Color offsets cấp range; mỗi invocation giải một constraint trong range.",
        },
        {
          title: "Nối dispatch",
          explanation: "SHADER_STORAGE barrier theo consumer, không dựa barrier workgroup.",
        },
      ],
    },
    "p40-l06": {
      focus: "Vòng đời lambda và thời gian rõ trước tăng scale.",
      expected: "Reset lambda đầu substep, giữ qua iteration; damping rate không phải stiffness.",
      files: ["include/cloth_gpu.hpp", "shaders/cloth_solver.comp"],
      steps: [
        {
          title: "Chia thời gian",
          explanation: "h=frameStep/substeps; iteration lặp solve, không tiến thêm thời gian.",
        },
        {
          title: "Đặt phạm vi multiplier",
          explanation:
            "Không reset mỗi màu/vòng, không warm-start qua substep khi chưa có mô hình.",
        },
        {
          title: "Cập nhật velocity",
          explanation: "Displacement sau solve chia h; damping rate 1/s dùng theo h.",
        },
      ],
    },
    "p40-l07": {
      focus: "Tiếp xúc analytic có khoảng cách/normal kiểm được.",
      expected:
        "Plane/sphere/capsule, thickness m và friction fraction không đơn vị; pin không bị đẩy.",
      files: ["include/cloth_cpu.hpp", "shaders/cloth_solver.comp"],
      steps: [
        {
          title: "Tính khoảng cách",
          explanation: "Trừ radius/thickness đúng một lần; normal cùng quy ước CPU/GPU.",
        },
        {
          title: "Sửa penetration",
          explanation: "Đẩy theo normal hữu hạn; tâm sphere/trục capsule có fallback rõ.",
        },
        {
          title: "Giảm trượt",
          explanation:
            "Giảm tiếp tuyến theo tỷ lệ mỗi substep có contact; không phải compliance hoặc Coulomb friction.",
        },
      ],
    },
    "p40-l08": {
      focus: "Grid là broad phase ba chiều.",
      expected:
        "Cell X/Y/Z, linear ID và stencil theo radius; không mất Z hoặc chép 3×3 hai chiều.",
      files: ["include/cloth_grid.hpp", "shaders/cloth_grid.comp"],
      steps: [
        {
          title: "Đặt world bounds",
          explanation: "Kiểm finite/miền cell trước chuyển uint; out-of-bounds có chính sách rõ.",
        },
        { title: "Mã hóa 3D", explanation: "x + nx*(y+ny*z), kiểm phép nhân trước cấp phát." },
        {
          title: "Tìm range ứng viên",
          explanation: "Radius/cell size quyết định stencil; candidate chưa phải contact.",
        },
      ],
    },
    "p40-l09": {
      focus: "Dựng phân hoạch ID trên GPU.",
      expected: "Counts→scan→cursors→scatter, tổng=N, mỗi ID đúng cell không mất/trùng.",
      files: ["include/cloth_gpu.hpp", "include/cloth_scan.hpp", "shaders/cloth_grid.comp"],
      steps: [
        {
          title: "Count từng cell",
          explanation: "Atomic ở counters; clear mọi cell trước frame mới.",
        },
        {
          title: "Scan nhiều tầng",
          explanation: "Exclusive offset là đầu cell; block sums không về CPU.",
        },
        {
          title: "Scatter ID",
          explanation: "Cursor riêng cấp slot; thứ tự atomic không ảnh hưởng predicate.",
        },
      ],
    },
    "p40-l10": {
      focus: "Broad phase tìm gần, topology/predicate chọn contact.",
      expected: "Loại self/kề, thickness theo vertex, ownership rõ và không hứa CCD.",
      files: ["shaders/cloth_grid.comp", "include/cloth_grid.hpp", "include/cloth_cpu.hpp"],
      steps: [
        {
          title: "Loại quan hệ topology",
          explanation: "Không đẩy hai đầu cùng cạnh vải như hai lớp riêng biệt.",
        },
        {
          title: "Kiểm khoảng cách",
          explanation: "Predicate dùng thickness công bố; zero-distance có normal ổn định.",
        },
        {
          title: "Gather correction",
          explanation: "Đọc snapshot, ghi đầu ra riêng để nhiều cặp không tranh writer.",
        },
      ],
    },
    "p40-l11": {
      focus: "Hình sạch/debug cùng đọc mesh đã solve.",
      expected: "Normal theo tam giác hiện tại; strain khác residual; subset debug được công bố.",
      files: [
        "shaders/cloth_solver.comp",
        "shaders/cloth.vert",
        "shaders/cloth.frag",
        "include/cloth_renderer.hpp",
      ],
      steps: [
        {
          title: "Tạo normal",
          explanation: "Cross cạnh hiện tại, không dùng rest normal khi vải gập.",
        },
        {
          title: "Tô độ giãn",
          explanation: "Strain tương đối không đơn vị, residual khoảng cách có đơn vị m.",
        },
        {
          title: "Giữ viewport dễ đọc",
          explanation: "Pattern/ánh sáng hai mặt là chính, debug là lớp phụ.",
        },
      ],
    },
    "p40-l12": {
      focus: "Input cũng có ownership và vòng đời.",
      expected: "Pin/drag cùng GPU state, độ dời giới hạn; blur/reset/topology bỏ reference cũ.",
      files: [
        "include/cloth_camera.hpp",
        "include/cloth_application.hpp",
        "shaders/cloth_solver.comp",
      ],
      steps: [
        {
          title: "Nối ray helper",
          explanation: "Camera scaffold cấp ray; app chọn vertex/vùng và giữ generation phù hợp.",
        },
        {
          title: "Áp input có giới hạn",
          explanation: "Pin weight zero, drag target không teleport ngoài miền mô hình.",
        },
        {
          title: "Kết thúc mọi đường",
          explanation:
            "Release/cancel/blur/mất capture/đổi scene giải phóng thao tác trước buffer mới.",
        },
      ],
    },
    "p40-l13": {
      focus: "Bằng chứng thuật toán khác GPU timing.",
      expected:
        "Oracle độc lập, finite/tolerance theo đơn vị, job có Cancel, median/độ phân tán Release.",
      files: ["include/cloth_verify.hpp", "include/cloth_gpu.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Kiểm primitive",
          explanation:
            "Constraint/pin/analytic/CSR có oracle độc lập, không so một hàm với chính nó.",
        },
        {
          title: "So cùng scheme",
          explanation: "Snapshot/h/topology/color schedule giống nhau; NaN/Inf luôn fail.",
        },
        {
          title: "Đo có điểm dừng",
          explanation:
            "Query ready trước đọc, warm-up/số mẫu hữu hạn; deadline/cancel là incomplete.",
        },
      ],
    },
    "p40-l14": {
      focus: "Nghiệm thu sản phẩm chứ không chỉ source build được.",
      expected: "≥100.000 đỉnh động GPU đủ pipeline; một triệu riêng, hình/input/native/ZIP riêng.",
      files: ["src/main.cpp", "include/cloth_application.hpp", "include/cloth_gpu.hpp"],
      steps: [
        {
          title: "Build sạch",
          explanation: "C++20/SDL3 3.4.8/CMake 3.24; Debug/Release CTest riêng.",
        },
        {
          title: "Đọc workload thật",
          explanation: "Dynamic khác pinned/allocated/drawn; đủ constraints/contacts ở preset lớn.",
        },
        {
          title: "Ghi hồ sơ",
          explanation:
            "Hardware/build/N/bytes/iterations/candidates/timing, hình/input; chưa đo không tự điền PASS.",
        },
      ],
    },
  },
  references: {
    "p40-l01": [{ label: "Camera và ray", href: "/glossary#camera-ray", kind: "Thuật ngữ" }],
    "p40-l02": [
      { label: "XPBD và đơn vị", href: "/glossary#cloth-xpbd-compliance", kind: "Thuật ngữ" },
    ],
    "p40-l03": [
      { label: "XPBD: bài báo gốc", href: "https://mmacklin.com/xpbd.pdf", kind: "Thuật ngữ" },
    ],
    "p40-l04": [
      { label: "Mô hình và sai số", href: "/glossary#cloth-material-and-error", kind: "Thuật ngữ" },
    ],
    "p40-l05": [
      {
        label: "Constraint coloring",
        href: "/glossary#cloth-constraint-coloring",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l06": [
      { label: "Compliance và lambda", href: "/glossary#cloth-xpbd-compliance", kind: "Thuật ngữ" },
    ],
    "p40-l07": [
      { label: "Tham số tiếp xúc", href: "/glossary#cloth-material-and-error", kind: "Thuật ngữ" },
    ],
    "p40-l08": [{ label: "Grid 3D/CSR", href: "/glossary#cloth-csr-grid", kind: "Thuật ngữ" }],
    "p40-l09": [{ label: "Grid 3D/CSR", href: "/glossary#cloth-csr-grid", kind: "Thuật ngữ" }],
    "p40-l10": [
      {
        label: "Self-contact theo đỉnh",
        href: "/glossary#cloth-vertex-self-contact",
        kind: "Thuật ngữ",
      },
    ],
    "p40-l11": [
      { label: "Mô hình và sai số", href: "/glossary#cloth-material-and-error", kind: "Thuật ngữ" },
    ],
    "p40-l12": [{ label: "Camera và ray", href: "/glossary#camera-ray", kind: "Thuật ngữ" }],
    "p40-l13": [{ label: "GPU timer query", href: "/glossary#gpu-timer-query", kind: "Thuật ngữ" }],
    "p40-l14": [
      {
        label: "Đỉnh động và workload",
        href: "/glossary#cloth-dynamic-vertices",
        kind: "Thuật ngữ",
      },
      { label: "SDL3 CMake", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
