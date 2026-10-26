import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p31-l01": {
      focus: "Mở cửa sổ, vẽ state XYZ qua camera và sinh lại cùng đĩa sao bằng seed cố định.",
      expected:
        "Gắn seed với preset, giữ tổng mass đĩa gần như không đổi khi tăng N và trừ cùng bulk velocity khỏi toàn hệ.",
      files: ["src/main.cpp", "include/lab.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chạy khung SDL trước",
          explanation:
            "main tạo từng tài nguyên và trả lỗi ngay nếu không tạo được. runApplication giữ event loop; Simulation::reset sinh bodies trước lần vẽ đầu.",
        },
        {
          title: "Chốt dữ liệu vật lý",
          explanation:
            "Body chỉ giữ position, velocity và mass. Camera không ghi ngược tọa độ màn hình vào vector bodies.",
        },
        {
          title: "Sinh lại cùng thí nghiệm",
          explanation:
            "Gắn seed với preset, giữ tổng mass đĩa gần như không đổi khi tăng N và trừ cùng bulk velocity khỏi toàn hệ.",
        },
      ],
    },
    "p31-l02": {
      focus:
        "Tự suy ra vector gia tốc, phân biệt mass của nguồn với mass của target và xử lý cự ly gần bằng softening.",
      expected:
        "pairAccelerationForSelected đọc hai body trong snapshot; drawScene chuyển vector sang mũi tên, chưa làm physics tự chạy.",
      files: ["include/lab.hpp", "include/simulation.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Từ lực đến gia tốc",
          explanation:
            "Vì đang cập nhật velocity của target, mass target triệt tiêu; sourceMass vẫn phải nằm trong biểu thức.",
        },
        {
          title: "Xử lý cự ly gần",
          explanation:
            "Cộng epsilon² trước khi lấy lũy thừa 3/2. Đây là mô hình potential đã làm trơn, không phải một chiếc kẹp số tùy ý.",
        },
        {
          title: "Nối với hình đang vẽ",
          explanation:
            "pairAccelerationForSelected đọc hai body trong snapshot; drawScene chuyển vector sang mũi tên, chưa làm physics tự chạy.",
        },
      ],
    },
    "p31-l03": {
      focus:
        "Viết direct summation đơn giản trước khi tối ưu; kiểm N−1 nguồn và các ca hai, ba vật thể tính tay.",
      expected:
        "Một target đọc N−1 nguồn; cả pass đọc N(N−1). Đó là lượng việc, không phải số microsecond.",
      files: ["include/lab.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Đọc từng nguồn thật",
          explanation:
            "Vòng lặp direct bỏ sourceIndex==targetIndex; hai body cùng position nhưng khác index vẫn là hai nguồn hợp lệ.",
        },
        {
          title: "Giữ snapshot bất biến",
          explanation:
            "directAccelerations trả một vector gia tốc mới. Không cập nhật position ngay bên trong vòng target.",
        },
        {
          title: "Đếm lượng việc",
          explanation:
            "Một target đọc N−1 nguồn; cả pass đọc N(N−1). Đó là lượng việc, không phải số microsecond.",
        },
      ],
    },
    "p31-l04": {
      focus:
        "Tính xong gia tốc của cả snapshot rồi mới cập nhật velocity/position; chia việc theo target để UI vẫn phản hồi.",
      expected:
        "Pause giữ bước đang tính, Cancel bỏ pending state. Camera vẫn hoạt động; không cố đuổi kịp mọi frame chậm.",
      files: ["include/lab.hpp", "include/simulation.hpp", "include/application.hpp"],
      steps: [
        {
          title: "Tính lực theo từng đợt",
          explanation:
            "beginPhysics mở một bước trên snapshot hiện tại, giữ nextTarget và pendingAccelerations giữa các frame.",
        },
        {
          title: "Commit đúng một fixed step",
          explanation:
            "Chỉ khi target cuối cùng xong mới cập nhật velocity rồi position; dt không đổi theo thời gian vẽ frame.",
        },
        {
          title: "Cho người dùng dừng được",
          explanation:
            "Pause giữ bước đang tính, Cancel bỏ pending state. Camera vẫn hoạt động; không cố đuổi kịp mọi frame chậm.",
        },
      ],
    },
    "p31-l05": {
      focus:
        "Thêm mass và tâm khối vào Octree; kiểm trung bình có trọng số, leaf storage và điểm trùng nhau.",
      expected:
        "Dựng lại sau khi bodies đổi. Cây của snapshot cũ không được mang sang tính lực cho vị trí mới.",
      files: ["include/tree.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chia không gian có giới hạn",
          explanation:
            "Dùng index thay reference khi vector nodes thêm phần tử; depth/node-size/node-count ngăn điểm trùng làm cây tách vô hạn.",
        },
        {
          title: "Gộp từ lá đi lên",
          explanation:
            "Leaf cộng mass thật; internal node cộng children. Tâm khối là weightedPosition/totalMass, không phải tâm hộp.",
        },
        {
          title: "Đặt cây vào vòng đời",
          explanation:
            "Dựng lại sau khi bodies đổi. Cây của snapshot cũ không được mang sang tính lực cho vị trí mới.",
        },
      ],
    },
    "p31-l06": {
      focus:
        "Dùng s/d < theta nhưng buộc mở node chứa target; vẽ lại đúng các quyết định traversal.",
      expected:
        "ForceTrace ghi opened/accepted trong chính traversal tính lực; presentation không suy đoán từ một cây chỉ vẽ các lá.",
      files: ["include/tree.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Hỏi cụm có đủ xa không",
          explanation:
            "Dùng cạnh node s và khoảng cách d đến centerOfMass. Mỗi target có một quyết định mở/chấp nhận riêng.",
        },
        {
          title: "Không quên chính target",
          explanation: "Dù s/d nhỏ, node chứa target vẫn phải mở. Leaf chỉ bỏ đúng index target.",
        },
        {
          title: "Vẽ đúng quyết định đã dùng",
          explanation:
            "ForceTrace ghi opened/accepted trong chính traversal tính lực; presentation không suy đoán từ một cây chỉ vẽ các lá.",
        },
      ],
    },
    "p31-l07": {
      focus:
        "Dùng fixture độc lập để phát hiện sai mass ở lá, trùng storage và cạnh trỏ về tổ tiên.",
      expected:
        "Bắt đầu hai/ba vật và vị trí trùng trước khi chạy thiên hà. Timing hoặc ảnh đẹp không thay được đáp án tính tay.",
      files: ["include/tree.hpp", "tests/tests.cpp", "tests/extended.hpp"],
      steps: [
        {
          title: "Kiểm lá bằng bodies thật",
          explanation:
            "Mass ở lá cũng có thể sai. Inspector đối chiếu leaf mass và center với bodyIndices, không chỉ cộng các children.",
        },
        {
          title: "Kiểm quan hệ cha con",
          explanation:
            "Mỗi node trừ root có một cha, child nằm sau parent và sâu hơn một mức. Cạnh quay ngược bị báo lỗi mà không cần recurse vào nó.",
        },
        {
          title: "Dùng fixture có đáp án",
          explanation:
            "Bắt đầu hai/ba vật và vị trí trùng trước khi chạy thiên hà. Timing hoặc ảnh đẹp không thay được đáp án tính tay.",
        },
      ],
    },
    "p31-l08": {
      focus:
        "Giữ nguyên bodies và epsilon, quét nhiều theta; báo absolute/RMS error cùng exact/aggregate work.",
      expected:
        "Absolute RMS có đơn vị gia tốc. Normalized RMS dùng tổng bình phương lực reference và sàn K·10⁻²⁴ để tránh chia cho 0.",
      files: ["include/analysis.hpp", "include/experiments.hpp", "include/application.hpp"],
      steps: [
        {
          title: "Đóng băng snapshot",
          explanation:
            "SurveyJob giữ bodies, tree, epsilon và thời điểm đo. Đổi cấu hình thì hủy report cũ.",
        },
        {
          title: "Giữ cùng tập target",
          explanation:
            "Direct đọc mọi source cho từng target; cả bốn theta dùng lại đúng các reference vector ấy.",
        },
        {
          title: "Đọc RMS có đơn vị",
          explanation:
            "Absolute RMS có đơn vị gia tốc. Normalized RMS dùng tổng bình phương lực reference và sàn K·10⁻²⁴ để tránh chia cho 0.",
        },
      ],
    },
    "p31-l09": {
      focus:
        "Tách build, force pass và render; warm-up, median và khoảng min/max trên cùng workload có giới hạn.",
      expected:
        "Bảng runtime không xếp hạng độ đúng. Giữ cả trường hợp chi phí dựng cây khiến BH không có lợi ở hệ nhỏ.",
      files: ["include/benchmark.hpp", "include/application.hpp"],
      steps: [
        {
          title: "Chốt workload trước đồng hồ",
          explanation:
            "Direct và BH dùng cùng N, seed, epsilon, theta và đủ mọi target. Tree build được ghi riêng.",
        },
        {
          title: "Đo nhiều mẫu ngắn",
          explanation:
            "RuntimeJob bỏ một warm-up và lấy median/min/max của năm pass; clock chỉ bao kernel, không bao thời gian đợi frame.",
        },
        {
          title: "Đặt sai số cạnh chi phí",
          explanation:
            "Bảng runtime không xếp hạng độ đúng. Giữ cả trường hợp chi phí dựng cây khiến BH không có lợi ở hệ nhỏ.",
        },
      ],
    },
    "p31-l10": {
      focus:
        "Đo năng lượng toàn hệ theo snapshot, thử giảm dt ở hệ có nghiệm tròn và bàn giao ứng dụng 4.096 vật thể.",
      expected:
        "Thực hiện quy trình 4.096 body, camera/target, pause/step, đo lực và energy, rồi build/test các snapshot. Ghi riêng desktop và smoke.",
      files: ["include/experiments.hpp", "include/application.hpp", "tests/extended.hpp"],
      steps: [
        {
          title: "Cộng đủ năng lượng hệ",
          explanation:
            "EnergyJob đọc mọi cặp i<j của snapshot và dùng cùng potential có softening; ghi N và t cạnh E, momentum và COM.",
        },
        {
          title: "Giảm dt trên bài toán có nghiệm",
          explanation:
            "Hai vật quay tròn cho phép tính vị trí tại T=1 độc lập. Giữ theta=0,5 và epsilon=0,02, chỉ đổi dt.",
        },
        {
          title: "Nghiệm thu sản phẩm",
          explanation:
            "Thực hiện quy trình 4.096 body, camera/target, pause/step, đo lực và energy, rồi build/test các snapshot. Ghi riêng desktop và smoke.",
        },
      ],
    },
  },
  references: {
    "p31-l01": [
      { label: "N-body system", href: "/glossary#n-body-system", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l02": [
      {
        label: "Gravitational softening",
        href: "/glossary#gravitational-softening",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l03": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Brute-force query", href: "/glossary#brute-force-query", kind: "Thuật ngữ" },
    ],
    "p31-l04": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Symplectic Euler", href: "/glossary#symplectic-euler", kind: "Thuật ngữ" },
    ],
    "p31-l05": [
      { label: "Octree", href: "/glossary#octree", kind: "Thuật ngữ" },
      { label: "Center of mass", href: "/glossary#center-of-mass", kind: "Thuật ngữ" },
    ],
    "p31-l06": [
      { label: "Barnes–Hut", href: "/glossary#barnes-hut", kind: "Thuật ngữ" },
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
    ],
    "p31-l07": [
      { label: "Octree node", href: "/glossary#octree-node", kind: "Thuật ngữ" },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p31-l08": [
      { label: "Opening angle", href: "/glossary#opening-angle", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p31-l09": [
      { label: "Quadratic complexity", href: "/glossary#quadratic-complexity", kind: "Thuật ngữ" },
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
    ],
    "p31-l10": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
