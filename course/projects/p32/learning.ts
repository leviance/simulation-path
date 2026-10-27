import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p32-l01": {
      focus:
        "Chạy khung SDL, đọc state của hạt trong không gian 3D và phân biệt khởi tạo warm với chuyển động do solver.",
      expected:
        "Simulation.reset chọn số slot sống; drawFountain chỉ lấy mẫu để vẽ. Số allocated/alive/rendered không phải cùng một đại lượng.",
      files: ["include/particles.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chạy chương trình nền",
          explanation:
            "Starter đã có window, renderer CPU và camera; build nó trước rồi đọc state của hạt, không viết lại SDL từ đầu.",
        },
        {
          title: "Sinh lại cùng đài phun",
          explanation:
            "spawnParticle lấy ngẫu nhiên từ seed/ID/generation; warmParticle chỉ tạo điều kiện đầu có tuổi khác nhau.",
        },
        {
          title: "Đếm đúng dữ liệu",
          explanation:
            "Simulation.reset chọn số slot sống; drawFountain chỉ lấy mẫu để vẽ. Số allocated/alive/rendered không phải cùng một đại lượng.",
        },
      ],
    },
    "p32-l02": {
      focus:
        "Thêm emission carry, gravity, age/lifetime và respawn có seed; tiến một bước đầy đủ rồi mới công bố state.",
      expected:
        "beginStep và tickStep ghi vào buffer đích; con trỏ phải đi hết N trước khi đổi buffer và tăng thời gian.",
      files: [
        "include/application.hpp",
        "include/particles.hpp",
        "include/simulation.hpp",
        "src/main.cpp",
      ],
      steps: [
        {
          title: "Phát hạt theo bước thời gian",
          explanation:
            "planEmission giữ phần lẻ để tốc độ phát không phụ thuộc số lần render; slot mới được phát ở đầu fixed step.",
        },
        {
          title: "Cho hạt tiến triển",
          explanation:
            "Gravity đổi velocity trước position; khi hết lifetime, giữ ID, tăng generation và dùng phần dt còn lại cho hạt mới.",
        },
        {
          title: "Chỉ công bố bước đã xong",
          explanation:
            "beginStep và tickStep ghi vào buffer đích; con trỏ phải đi hết N trước khi đổi buffer và tăng thời gian.",
        },
      ],
    },
    "p32-l03": {
      focus:
        "Đo gravity-only và toàn bộ vòng đời bằng AoS; dùng warm-up, nhiều mẫu và checksum ngoài timer.",
      expected:
        "Checksum và kiểm state đọc đủ các phần tử, tránh một vòng lặp không còn kết quả quan sát được.",
      files: ["include/application.hpp", "include/benchmark.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Khóa phép đo",
          explanation:
            "Chọn gravity-only hoặc full lifecycle trên cùng dữ liệu warm, cùng seed/dt. Đài phun vẫn luôn dùng full lifecycle.",
        },
        {
          title: "Giữ timer ở đúng chỗ",
          explanation:
            "BenchmarkJob reset/copy ngoài timer, đo từng range có cùng số target và giữ tổng kernel time; không tính thời gian chờ UI.",
        },
        {
          title: "Dùng kết quả sau timer",
          explanation:
            "Checksum và kiểm state đọc đủ các phần tử, tránh một vòng lặp không còn kết quả quan sát được.",
        },
      ],
    },
    "p32-l04": {
      focus:
        "Tách đủ mười một field thành các mảng; chuyển layout theo batch và có thể hủy mà không đổi snapshot đang xem.",
      expected:
        "Thử AoS → SoA → AoS, kể cả pool chưa đầy. Thời gian và emission carry cũng là state cần giữ.",
      files: ["include/application.hpp", "include/simulation.hpp", "include/storage.hpp"],
      steps: [
        {
          title: "Giữ đủ mọi field",
          explanation:
            "ParticlesSoA có cả ID, generation, position, velocity, age/lifetime và hue; không bỏ field để có số bộ nhớ đẹp hơn.",
        },
        {
          title: "Chuyển theo batch",
          explanation:
            "beginConversion tạo destination; tickConversion giữ source được dùng cho tới khi sao chép đủ mọi slot.",
        },
        {
          title: "Kiểm round trip",
          explanation:
            "Thử AoS → SoA → AoS, kể cả pool chưa đầy. Thời gian và emission carry cũng là state cần giữ.",
        },
      ],
    },
    "p32-l05": {
      focus:
        "Viết kernel SoA theo cùng thứ tự phép tính float32, giữ ID/generation và kiểm cả các lần hạt được tái sử dụng.",
      expected:
        "tickStep chọn kernel theo layout nhưng cùng planEmission/dt, rồi commit theo cùng quy tắc.",
      files: ["include/simulation.hpp", "include/storage.hpp"],
      steps: [
        {
          title: "Dùng lại cùng quy tắc",
          explanation:
            "Nhánh bình thường SoA dùng đúng thứ tự phép tính float32; nhánh sinh lại gọi cùng quy tắc theo ID/generation.",
        },
        {
          title: "So cả vòng đời",
          explanation:
            "Không chỉ kiểm vài bước chưa có hạt chết. Chạy đủ lâu để gặp respawn rồi so mọi field và bộ đếm.",
        },
        {
          title: "Nối kernel vào mô phỏng",
          explanation:
            "tickStep chọn kernel theo layout nhưng cùng planEmission/dt, rồi commit theo cùng quy tắc.",
        },
      ],
    },
    "p32-l06": {
      focus:
        "Đếm cache line của gravity-only và nhận biết giới hạn của mô hình all-field; không gọi nó là số cache miss đo được.",
      expected:
        "Full lifecycle có branch respawn. Mô hình chạm đủ field là upper bound, không phải số cache miss hay lời dự đoán timing.",
      files: ["include/application.hpp", "include/benchmark.hpp"],
      steps: [
        {
          title: "Đặt giả định trước",
          explanation:
            "Mô hình giả sử base của mỗi mảng nằm trên biên 64 byte. Allocator thật không được coi là luôn có alignment này.",
        },
        {
          title: "Tính cho một field",
          explanation:
            "Gravity-only đọc/ghi velocityY: AoS có stride sizeof(ParticleAoS), SoA có stride sizeof(float).",
        },
        {
          title: "Nhìn giới hạn của mô hình",
          explanation:
            "Full lifecycle có branch respawn. Mô hình chạm đủ field là upper bound, không phải số cache miss hay lời dự đoán timing.",
        },
      ],
    },
    "p32-l07": {
      focus:
        "Đo AoS/SoA với cùng seed và workload ở 10k/100k/1M; đọc median, min/max, chi phí conversion và sai khác state.",
      expected:
        "SoA có thể có lợi khi chỉ chạm velocityY nhưng kém hơn ở vòng đời có branch. Đọc kết quả trên đúng máy/build/workload.",
      files: ["include/application.hpp", "include/benchmark.hpp"],
      steps: [
        {
          title: "Đối chiếu trước khi tính speedup",
          explanation:
            "Mỗi cặp trial bắt đầu từ cùng source; sai ID/generation hoặc field vượt tolerance là lỗi, dù thời gian đẹp.",
        },
        {
          title: "Đo nhiều lần",
          explanation:
            "Một warm-up và năm mẫu, mỗi mẫu ba pass đủ N; đổi AB/BA, báo median cùng min/max và chi phí reset/conversion riêng.",
        },
        {
          title: "Giữ cả lần không thắng",
          explanation:
            "SoA có thể có lợi khi chỉ chạm velocityY nhưng kém hơn ở vòng đời có branch. Đọc kết quả trên đúng máy/build/workload.",
        },
      ],
    },
    "p32-l08": {
      focus:
        "Ghép controls, đài phun, đo hiệu năng và quy trình kiểm chứng đủ một triệu hạt sống thành ứng dụng độc lập.",
      expected:
        "Build mọi checkpoint, CTest Debug/Release, benchmark Release và desktop là các loại bằng chứng riêng; ghi rõ phần chưa kiểm.",
      files: [
        "include/application.hpp",
        "include/render.hpp",
        "include/render_surface.hpp",
        "include/render_geometry.hpp",
        "include/render_panel.hpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Chạy đúng preset nghiệm thu",
          explanation:
            "Bản cuối khởi tạo một triệu slot sống. Workflow kiểm từng slot sau một bước, không chỉ kiểm vector.size().",
        },
        {
          title: "Đọc telemetry theo phạm vi",
          explanation:
            "Updated đếm hạt trong bước commit; sampled là tập thử vẽ, rendered còn loại hạt ngoài khung hoặc bị hình học che. Frame và kernel có đồng hồ riêng.",
        },
        {
          title: "Bàn giao ứng dụng",
          explanation:
            "Build mọi checkpoint, CTest Debug/Release, benchmark Release và desktop là các loại bằng chứng riêng; ghi rõ phần chưa kiểm.",
        },
      ],
    },
  },
  references: {
    "p32-l01": [
      {
        label: "Array of Structures",
        href: "/glossary#array-of-structures",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory layout",
        href: "/glossary#memory-layout",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l02": [
      {
        label: "Hot loop",
        href: "/glossary#hot-loop",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory stride",
        href: "/glossary#memory-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l03": [
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l04": [
      {
        label: "Structure of Arrays",
        href: "/glossary#structure-of-arrays",
        kind: "Thuật ngữ",
      },
      {
        label: "Spatial locality",
        href: "/glossary#spatial-locality",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l05": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l06": [
      {
        label: "Cache line",
        href: "/glossary#cache-line",
        kind: "Thuật ngữ",
      },
      {
        label: "Memory stride",
        href: "/glossary#memory-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l07": [
      {
        label: "Benchmark median",
        href: "/glossary#benchmark-median",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark warm-up",
        href: "/glossary#benchmark-warm-up",
        kind: "Thuật ngữ",
      },
    ],
    "p32-l08": [
      {
        label: "Pointer capture",
        href: "/glossary#pointer-capture",
        kind: "Thuật ngữ",
      },
      {
        label: "Benchmark checksum",
        href: "/glossary#benchmark-checksum",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
