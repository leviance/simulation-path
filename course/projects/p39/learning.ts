import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p39-l01": {
      focus: "Có một khu phố chạy được trước khi tối ưu đường vẽ.",
      expected:
        "Camera đi xuyên scene, mesh dùng chung, perspective và depth rõ; chưa nhận là GPU culling.",
      files: ["include/city_camera.hpp", "include/city_renderer.hpp", "shaders/city.vert"],
      steps: [
        {
          title: "Chạy scaffold độc lập",
          explanation:
            "Window, loader, camera, mesh và bitmap text được cung cấp; ZIP không phụ thuộc project khác.",
        },
        {
          title: "Đi trong world",
          explanation:
            "Look đổi hướng, move đổi vị trí theo dt; camera không xoay dữ liệu thành phố.",
        },
        {
          title: "Theo một instance",
          explanation:
            "Mesh local được scale/translate theo object rồi đưa qua view/projection và depth test.",
        },
      ],
    },
    "p39-l02": {
      focus: "Tạo đủ record thật từ N/seed có ngân sách.",
      expected:
        "Object 48 byte, ID ổn định trong snapshot, generation chia batch và giữ last-good scene.",
      files: ["include/city_types.hpp", "include/city_scene.hpp"],
      steps: [
        {
          title: "Khóa layout",
          explanation:
            "Static assertions giữ offset CPU trùng std430; mesh/ID không đổi thành float.",
        },
        {
          title: "Sinh theo ID/channel",
          explanation:
            "Cùng N/seed tạo lại cùng record; district, đường và landmark giúp định hướng.",
        },
        {
          title: "Tạo candidate hữu hạn",
          explanation:
            "Builder kiểm budget và thêm tối đa 8.192 record mỗi tick; Cancel không xóa active scene.",
        },
      ],
    },
    "p39-l03": {
      focus: "Chỉ loại sphere đã hoàn toàn ngoài một plane.",
      expected:
        "Plane chuẩn hóa từ đúng view/projection; tâm ở ngoài nhưng bounds cắt mép vẫn được giữ.",
      files: ["include/city_camera.hpp", "include/city_types.hpp"],
      steps: [
        {
          title: "Lấy sáu plane",
          explanation: "Cùng camera/FOV/aspect với graphics, normalize cả normal và d.",
        },
        {
          title: "Tính signed distance",
          explanation: "Normal hướng trong, world units, sphere ngoài khi s < -r.",
        },
        {
          title: "Giữ lý do loại",
          explanation:
            "Plane index phục vụ inspector; accepted không chứng minh có pixel hoặc không bị che.",
        },
      ],
    },
    "p39-l04": {
      focus: "GPU ghi mask cho đủ N record.",
      expected:
        "uvec4 one-hot mesh + accepted, tested chỉ đếm record thật; lane đệm vẫn tới barrier.",
      files: ["shaders/cull.comp", "include/city_compute.hpp"],
      steps: [
        { title: "Đọc đúng record", explanation: "Guard trước đọc Objects, layout CPU/GLSL khớp." },
        {
          title: "Áp cùng phép kiểm",
          explanation: "Sáu plane và radius dùng cùng quy ước với CPU reference.",
        },
        {
          title: "Ghi cả mask zero",
          explanation:
            "Không để frame mới dùng mask cũ; partial group stats không thay global reduction.",
        },
      ],
    },
    "p39-l05": {
      focus: "Gom count, ID bounds và khoảng cách qua nhiều group.",
      expected: "Counts exact, min/max có neutral values đúng và empty set được ghi rõ.",
      files: ["shaders/reduce.comp", "include/city_types.hpp", "include/city_compute.hpp"],
      steps: [
        {
          title: "Chọn neutral values",
          explanation: "Zero cho sum, infinity cho distance min/max, UINT_MAX cho ID min.",
        },
        {
          title: "Thu cây shared",
          explanation: "Mọi lane đi qua barrier sau mỗi stride; lane dư không làm đổi kết quả.",
        },
        {
          title: "Nối các tầng",
          explanation: "Partial SSBO ở tầng này là input tầng sau, không readback trung gian.",
        },
      ],
    },
    "p39-l06": {
      focus: "Cấp địa chỉ riêng trong một block bằng exclusive scan.",
      expected: "Mask [1,0,1,1] cho prefix [0,1,1,2]; block sum được lưu trước root-zero.",
      files: ["shaders/scan.comp"],
      steps: [
        {
          title: "Load hai phần tử",
          explanation: "256 invocation nạp span 512 uvec4, đệm zero không tạo thêm object.",
        },
        {
          title: "Upsweep và root-zero",
          explanation: "Lưu total rồi thay root bằng zero để nhận exclusive, không phải inclusive.",
        },
        {
          title: "Downsweep",
          explanation: "Giữ subtotal trái trước khi ghi đè; checkpoint này chỉ tạo local prefix.",
        },
      ],
    },
    "p39-l07": {
      focus: "Tạo prefix toàn cục mà mọi tầng ở lại GPU.",
      expected: "N=1.000.003 có block counts 1.954→4→1, ba scan rồi hai uniform-add.",
      files: ["include/city_compute.hpp", "shaders/uniform_add.comp"],
      steps: [
        {
          title: "Scan block sums",
          explanation:
            "Mảng sums của tầng dưới thành input tầng trên, CPU chỉ lập lịch từ kích thước.",
        },
        {
          title: "Đi ngược xuống",
          explanation: "Offsets tầng trên phải global trước khi cộng vào prefixes tầng dưới.",
        },
        {
          title: "Kiểm biên",
          explanation: "Span 512 khác local size 256; thử quanh 511/512 và dữ liệu nhiều tầng.",
        },
      ],
    },
    "p39-l08": {
      focus: "Compact theo mesh rồi record index, không atomic arrival order.",
      expected: "Accepted record có đúng một vị trí; stable Object.id khác địa chỉ buffer.",
      files: ["shaders/compact.comp", "include/city_types.hpp"],
      steps: [
        {
          title: "Chỉ scatter accepted",
          explanation: "Rejected không ghi, lane dư không chạm buffer.",
        },
        {
          title: "Tính group base",
          explanation: "Prefix của group counts tạo các vùng không chồng lấp.",
        },
        {
          title: "Ghi record index",
          explanation:
            "Base + prefix[index][mesh] cấp vị trí duy nhất, fixture ID rời rạc bắt nhầm lẫn.",
        },
      ],
    },
    "p39-l09": {
      focus: "GPU ghi command và graphics đọc GPU list.",
      expected: "Ba indexed indirect command cố định; CPU không đọc instanceCount mỗi frame.",
      files: [
        "shaders/commands.comp",
        "shaders/city.vert",
        "include/city_compute.hpp",
        "include/city_renderer.hpp",
      ],
      steps: [
        {
          title: "Ghi mọi field",
          explanation: "Mesh range đúng, empty group instanceCount=0; không giữ count cũ.",
        },
        {
          title: "Công bố cho consumer",
          explanation: "COMMAND cho parser, SHADER_STORAGE cho SSBO đọc trong graphics.",
        },
        {
          title: "Tra list trong shader",
          explanation:
            "Group offset cộng gl_InstanceID; không dựa gl_BaseInstance ngoài khả năng 4.3.",
        },
      ],
    },
    "p39-l10": {
      focus: "Giải thích từng object và giữ scene hợp lệ khi thay cấu hình.",
      expected:
        "Observer frustum/accepted/rejected, picking theo bounds, candidate không phá active scene.",
      files: ["include/city_camera.hpp", "include/city_scene.hpp", "include/city_application.hpp"],
      steps: [
        {
          title: "Giữ camera cull",
          explanation: "Camera observer khác camera chính; debug không tự đổi tập accepted.",
        },
        {
          title: "Chọn object",
          explanation:
            "Ray/bounds là scaffold được công bố, có batch hữu hạn; không hứa chọn đúng pixel mesh.",
        },
        {
          title: "Đổi scene an toàn",
          explanation: "Chỉ publish candidate sau tạo/upload thành công; lỗi/cancel giữ active.",
        },
      ],
    },
    "p39-l11": {
      focus: "Kiểm thuật toán độc lập và đo workload tái lập.",
      expected:
        "Fixture exact cho integer/scan/compaction/commands; query available, warm-up/mẫu hữu hạn và Cancel.",
      files: [
        "include/city_gpu_validation.hpp",
        "include/city_validation_job.hpp",
        "include/city_validation.hpp",
        "include/city_timing.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Kiểm từng primitive",
          explanation:
            "N=0/1/lẻ/nhiều tầng, arbitrary counts→offsets và sum/min/max riêng, guard records.",
        },
        {
          title: "Kiểm cả đường scene",
          explanation:
            "Independent classifier, all-visible→empty, sparse stable IDs và command ranges.",
        },
        {
          title: "So cùng camera",
          explanation:
            "Tách query GPU, CPU submit, CPU frame có present và độ trễ tới GPU-ready; V kiểm 257 record × 12 batch, --verify kiểm scene N yêu cầu.",
        },
      ],
    },
    "p39-l12": {
      focus: "Nghiệm thu thành phố hoàn chỉnh thay vì chỉ một bộ test xanh.",
      expected:
        "Native xét đủ một triệu record, source/ZIP độc lập; đồ họa, input, thuật toán và quy mô có cổng riêng.",
      files: [
        "src/main.cpp",
        "include/city_application.hpp",
        "include/city_compute.hpp",
        "include/city_timing.hpp",
      ],
      steps: [
        {
          title: "Build source sạch",
          explanation: "C++20/SDL3 3.4.8/CMake 3.24, final mặc định, checkpoint bằng option riêng.",
        },
        {
          title: "Đọc telemetry đúng",
          explanation:
            "Resident/tested/accepted/submitted khác nhau; culling không loại object bị che.",
        },
        {
          title: "Ghi bằng chứng",
          explanation:
            "Build, CTest, GPU scale, native interaction, Canvas và ZIP không thay thế lẫn nhau.",
        },
      ],
    },
  },
  references: {
    "p39-l01": [{ label: "Camera và ray", href: "/glossary#camera-ray", kind: "Thuật ngữ" }],
    "p39-l02": [{ label: "std430 layout", href: "/glossary#std430-layout", kind: "Thuật ngữ" }],
    "p39-l03": [
      {
        label: "Bounding-volume frustum culling",
        href: "/glossary#city-frustum-culling",
        kind: "Thuật ngữ",
      },
    ],
    "p39-l04": [
      {
        label: "glDispatchCompute",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDispatchCompute.xml",
        kind: "OpenGL API",
      },
    ],
    "p39-l05": [{ label: "CPU oracle", href: "/glossary#cpu-oracle", kind: "Thuật ngữ" }],
    "p39-l06": [
      { label: "Stable compaction", href: "/glossary#city-stable-compaction", kind: "Thuật ngữ" },
    ],
    "p39-l07": [
      {
        label: "glMemoryBarrier",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glMemoryBarrier.xml",
        kind: "OpenGL API",
      },
    ],
    "p39-l08": [
      { label: "Stable compaction", href: "/glossary#city-stable-compaction", kind: "Thuật ngữ" },
    ],
    "p39-l09": [
      {
        label: "glDrawElementsIndirect",
        href: "https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDrawElementsIndirect.xml",
        kind: "OpenGL API",
      },
    ],
    "p39-l10": [
      {
        label: "Resident/tested/accepted/submitted",
        href: "/glossary#city-render-counts",
        kind: "Thuật ngữ",
      },
    ],
    "p39-l11": [{ label: "GPU timer query", href: "/glossary#gpu-timer-query", kind: "Thuật ngữ" }],
    "p39-l12": [
      { label: "SDL3 CMake", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
