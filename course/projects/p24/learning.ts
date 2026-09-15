import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p24-l01": {
      focus:
        "Dựng bể nhìn thấy ngay, định nghĩa body bằng world unit và tạo 144 bóng không overlap từ lattice cùng seeded PRNG.",
      expected:
        "Reset luôn tạo 16×9 ball state giống nhau; mọi tâm cách tường ít nhất một radius và metrics báo zero overlap.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ geometry và dynamics trong Ball",
          explanation:
            "Position/radius phục vụ detection; velocity/inverseMass phục vụ response. Color chỉ phục vụ render và không tham gia physics.",
        },
        {
          title: "Spawn theo cell thay vì thử ngẫu nhiên vô hạn",
          explanation:
            "Lattice đảm bảo khoảng cách tối thiểu ngay từ công thức; PRNG chỉ chọn hướng/speed nên không cần vòng lặp rejection khó đoán.",
        },
        {
          title: "Khóa seed để biến bug thành case lặp lại",
          explanation:
            "Xorshift32 nhỏ, rõ và cho cùng chuỗi trên C++/TypeScript; clock/random_device bị loại khỏi validation path.",
        },
      ],
    },
    "p24-l02": {
      focus:
        "Cho toàn bộ body tiến bằng position += velocity·dt và một accumulator có frame/substep guard.",
      expected:
        "Hai cách chia render frame có cùng tổng thời gian tạo cùng số physics step; single-step chạy đúng một dt.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tích phân một Ball trước",
          explanation:
            "integrateBall là hàm thuần với SDL, giữ velocity không đổi và chỉ sửa position khi dt hợp lệ.",
        },
        {
          title: "Áp cùng dt cho cả vector body",
          explanation:
            "Một substep duyệt mọi Ball đúng một lần; không body nào nhận frameSeconds riêng.",
        },
        {
          title: "Giới hạn catch-up work",
          explanation:
            "Accumulator clamp frame pause và số substep; droppedTime công khai phần thời gian bị bỏ thay vì treo vòng lặp.",
        },
      ],
    },
    "p24-l03": {
      focus:
        "Xử lý bốn wall bằng radius-aware limits, hướng velocity và restitution thay vì clamp center vào mép.",
      expected:
        "Ball xuyên corner được đưa về hai limit; chỉ incoming component đổi dấu và nhân e, outgoing component giữ nguyên.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đổi wall thành giới hạn của tâm",
          explanation:
            "Left limit là minX+radius, right limit là maxX−radius; nhờ vậy toàn bộ hình tròn nằm trong bể.",
        },
        {
          title: "Kiểm hướng trước khi phản xạ",
          explanation:
            "Một ball còn overlap nhưng đã đi vào trong chỉ cần sửa position; đảo velocity lần nữa sẽ làm nó mắc ở tường.",
        },
        {
          title: "Áp restitution lên normal component",
          explanation:
            "Tường trục-aligned nên normal component là vx hoặc vy; tangent component không bị đổi.",
        },
      ],
    },
    "p24-l04": {
      focus:
        "Tách collision detection thành một hàm trả contact bool, unit normal, penetration và center distance.",
      expected:
        "Separated pair bị reject bằng squared distance; overlapping pair có normal A→B và coincident centers không sinh NaN.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So bình phương trước sqrt",
          explanation:
            "distance² >= (rA+rB)² kết thúc sớm cho đa số cặp; sqrt chỉ cần khi contact thật sự tồn tại.",
        },
        {
          title: "Chuẩn hóa center delta",
          explanation:
            "normal đi từ A sang B và penetration bằng radiusSum−distance; quy ước này được impulse/correction dùng lại.",
        },
        {
          title: "Định nghĩa coincident fallback",
          explanation:
            "Khi hai tâm trùng, relative velocity được normalize; nếu nó cũng zero thì dùng (1,0) deterministic.",
        },
      ],
    },
    "p24-l05": {
      focus:
        "Giải velocity bằng normal impulse từ relative speed, restitution và inverse-mass sum.",
      expected:
        "Hai equal-mass ball head-on với e=1 đổi velocity; momentum và kinetic energy giữ trong tolerance; separating pair không nhận impulse.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đo closing speed dọc normal",
          explanation:
            "dot(vB−vA,n)<0 nghĩa là khoảng cách đang giảm. Giá trị >=0 phải return trước khi tạo impulse.",
        },
        {
          title: "Tính impulse scalar",
          explanation:
            "j=−(1+e)vn/(invMassA+invMassB); inverse mass zero cho phép static body mà không có nhánh công thức riêng.",
        },
        {
          title: "Áp hai impulse đối nhau",
          explanation:
            "A nhận −j·n·invMassA, B nhận +j·n·invMassB; cặp thay đổi momentum bằng hai lượng đối nhau.",
        },
      ],
    },
    "p24-l06": {
      focus:
        "Giảm overlap còn sót bằng positional correction có slop/percentage, tách biệt hoàn toàn khỏi velocity impulse.",
      expected:
        "Correction làm penetration nhỏ đi nhưng velocity không đổi; body nhẹ dịch nhiều hơn body nặng theo inverse mass.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Bỏ qua penetration dưới slop",
          explanation:
            "Sai số rất nhỏ không bị solver kéo qua kéo lại; slop là tolerance hình học, không phải restitution.",
        },
        {
          title: "Chỉ sửa một tỷ lệ hữu hạn",
          explanation:
            "Percent 0.8 giảm overlap dần và tránh over-correction trong chuỗi contact; giá trị được clamp vào [0,1].",
        },
        {
          title: "Phân phối bằng inverse mass",
          explanation:
            "Cùng correction vector nhưng mỗi body nhân inverseMass riêng; static body không di chuyển.",
        },
      ],
    },
    "p24-l07": {
      focus:
        "Ghép integrate, walls và mọi unordered ball pair vào một fixed step có solver iterations cùng stats minh bạch.",
      expected:
        "Với N ball và I iterations, pairChecks=I·N(N−1)/2; 144 bóng va nhau mà mỗi pair chỉ được xét một lần mỗi pass.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Duyệt secondIndex từ firstIndex+1",
          explanation:
            "Vòng i<j loại self-pair và cặp đảo (B,A); count lý thuyết trở thành invariant kiểm được.",
        },
        {
          title: "Lặp solver, không lặp integration",
          explanation:
            "Position chỉ tiến một lần mỗi fixed step; walls/pairs được giải vài pass để contact chain truyền response.",
        },
        {
          title: "Đếm work cùng result",
          explanation:
            "Stats ghi pairChecks, contacts, impulses, wallHits, maxPenetration ngay trong code thực hiện công việc.",
        },
      ],
    },
    "p24-l08": {
      focus:
        "Nghiệm thu bằng deterministic reset, pair-count invariant, two-ball conservation và long-run stress metrics.",
      expected:
        "Debug/Release CTest pass; 144-ball stress không NaN, không ra khỏi bounds, penetration bị chặn và elastic energy gần bảo toàn.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đo momentum và kinetic energy",
          explanation:
            "Two-ball isolated test kiểm cả vector momentum và scalar energy; e<1 cố ý giảm energy nên không dùng cùng kỳ vọng.",
        },
        {
          title: "Quét overlap độc lập với solver stats",
          explanation:
            "measureWorld duyệt state sau step để phát hiện contact còn sót; không tin tuyệt đối counter được ghi trong lúc giải.",
        },
        {
          title: "Đặt correctness trước optimization",
          explanation:
            "Pair count O(N²) được hiển thị như baseline. Spatial Grid chỉ hợp lý khi ta đã có kết quả đúng để đối chiếu.",
        },
      ],
    },
  },
  references: {
    "p24-l01": [
      { label: "Inverse mass", href: "/glossary#inverse-mass", kind: "Thuật ngữ" },
      { label: "Vector 2D", href: "/glossary#vector-2d", kind: "Thuật ngữ" },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l02": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Physics accumulator", href: "/glossary#physics-accumulator", kind: "Thuật ngữ" },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l03": [
      {
        label: "Coefficient of restitution",
        href: "/glossary#coefficient-of-restitution",
        kind: "Thuật ngữ",
      },
      { label: "Contact normal", href: "/glossary#contact-normal", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p24-l04": [
      { label: "Collision detection", href: "/glossary#collision-detection", kind: "Thuật ngữ" },
      { label: "Contact normal", href: "/glossary#contact-normal", kind: "Thuật ngữ" },
      { label: "Penetration depth", href: "/glossary#penetration-depth", kind: "Thuật ngữ" },
    ],
    "p24-l05": [
      { label: "Collision impulse", href: "/glossary#collision-impulse", kind: "Thuật ngữ" },
      { label: "Linear momentum", href: "/glossary#linear-momentum", kind: "Thuật ngữ" },
      { label: "Kinetic energy", href: "/glossary#kinetic-energy", kind: "Thuật ngữ" },
    ],
    "p24-l06": [
      {
        label: "Positional correction",
        href: "/glossary#positional-correction",
        kind: "Thuật ngữ",
      },
      { label: "Inverse mass", href: "/glossary#inverse-mass", kind: "Thuật ngữ" },
      { label: "Penetration depth", href: "/glossary#penetration-depth", kind: "Thuật ngữ" },
    ],
    "p24-l07": [
      { label: "Pairwise brute force", href: "/glossary#pairwise-brute-force", kind: "Thuật ngữ" },
      { label: "Collision detection", href: "/glossary#collision-detection", kind: "Thuật ngữ" },
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
    ],
    "p24-l08": [
      { label: "Linear momentum", href: "/glossary#linear-momentum", kind: "Thuật ngữ" },
      { label: "Kinetic energy", href: "/glossary#kinetic-energy", kind: "Thuật ngữ" },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
