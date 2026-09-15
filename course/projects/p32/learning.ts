import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/particles.hpp",
  "include/benchmark.hpp",
  "include/render.hpp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p32-l01": {
      focus:
        "Khóa particle state, seed, N và dung lượng trước khi thay layout; renderer chỉ lấy mẫu để cửa sổ vẫn phản hồi tốt.",
      expected:
        "`ParticleAoS` có đúng sáu float, cùng seed tạo lại từng field và một triệu particle chiếm khoảng 24 MB state thuần.",
      files,
      steps: [
        {
          title: "Bắt đầu từ cửa sổ có hai vùng nhìn thấy được",
          explanation:
            "Starter đã có dải memory cells và vùng particle sample. Checkpoint đầu chỉ thay dữ liệu minh họa bằng state thật, nên mỗi thay đổi đều có dấu hiệu quan sát được.",
        },
        {
          title: "Giữ ParticleAoS không có hành vi ẩn",
          explanation:
            "Sáu float nằm theo đúng thứ tự position xyz rồi velocity xyz. `static_assert` khóa kích thước 24 byte để padding bất ngờ không làm sai mô hình stride.",
        },
        {
          title: "Sinh một lần, vẽ bằng stride riêng",
          explanation:
            "Toàn bộ một triệu particle tồn tại trong vector. Renderer chỉ chọn tối đa 40.000 index để vẽ; benchmark vẫn nhận đủ vector nguồn.",
        },
      ],
    },
    "p32-l02": {
      focus:
        "Viết AoS integrate kernel đơn giản và tách nó khỏi event handling, rendering, allocation cùng console output.",
      expected:
        "Mỗi bước đọc ba velocity, cập nhật ba position, wrap về [-1,1] và giữ mọi giá trị hữu hạn.",
      files,
      steps: [
        {
          title: "Duyệt vector theo thứ tự index",
          explanation:
            "Hot loop dùng range-for trên `std::span<ParticleAoS>`. Không có lookup, pointer chasing hoặc container phụ che mất câu hỏi về memory layout.",
        },
        {
          title: "Dùng cùng một dt cho toàn bộ particle",
          explanation:
            "Mỗi position được tiến bằng velocity tương ứng và `1/120 s`. Fixed value giúp hai layout sau này nhận cùng phép tính bit-for-bit.",
        },
        {
          title: "Phân biệt update count với draw count",
          explanation:
            "Kernel đi qua đủ một triệu phần tử. Việc framebuffer chỉ chấm một sample không được đổi `particles.size()` hoặc số vòng lặp update.",
        },
      ],
    },
    "p32-l03": {
      focus:
        "Đo AoS trước khi thêm SoA bằng ba workload có tên, warm-up riêng và checksum observable.",
      expected:
        "Benchmark chỉ bao quanh kernel, có repetitions hữu hạn và cùng source/workload tạo lại checksum giống nhau.",
      files,
      steps: [
        {
          title: "Đặt tên cho câu hỏi đang đo",
          explanation:
            "`positionX`, `velocityOnly` và `integrate` chạm lượng field khác nhau. Một con số timing không kèm workload không nói được điều gì về layout.",
        },
        {
          title: "Warm-up trước khi bắt đầu timer",
          explanation:
            "Một bản sao state đi qua đúng kernel nhưng không góp vào elapsed time. Generation và copy measured state cũng đứng ngoài vùng đo.",
        },
        {
          title: "Đưa output ra khỏi hot loop bằng checksum",
          explanation:
            "Kernel trả tổng position.x sau mỗi repetition. Giá trị đó được tích lũy và in sau benchmark để công việc vẫn có thể quan sát.",
        },
      ],
    },
    "p32-l04": {
      focus:
        "Biểu diễn đúng cùng particle state bằng sáu vector SoA và kiểm invariant trước khi viết kernel thứ hai.",
      expected:
        "Sáu vector có cùng size, particle index nối đúng các field và conversion từ AoS cho maximum difference bằng 0.",
      files,
      steps: [
        {
          title: "Mỗi field có một vùng nhớ liên tục",
          explanation:
            "`positionX[0..N)` nằm liền nhau, rồi `positionY` ở allocation riêng. SoA không xóa khái niệm particle; index vẫn là khóa nối sáu mảng.",
        },
        {
          title: "Reserve cả sáu vector trước conversion",
          explanation:
            "Conversion chạy ngoài benchmark nhưng vẫn nên rõ ràng và bounded. Reserve tránh mỗi vector tăng capacity nhiều lần khi đẩy một triệu giá trị.",
        },
        {
          title: "Dừng nếu size invariant hỏng",
          explanation:
            "Kernel SoA cần đọc cùng index ở sáu mảng. `validSoA` biến giả định đó thành contract có thể test thay vì chờ out-of-bounds.",
        },
      ],
    },
    "p32-l05": {
      focus:
        "Viết SoA kernels bằng cùng precision và thứ tự phép tính, rồi đối chiếu state chứ chưa kết luận từ timing.",
      expected:
        "Cả ba workload cho checksum bằng nhau và maximum field difference bằng 0 sau cùng số bước.",
      files,
      steps: [
        {
          title: "Giữ công thức song song giữa hai phía",
          explanation:
            "Hai kernel chỉ khác cách lấy field từ bộ nhớ. dt, factor, wrap order và kiểu float phải giống hệt để layout là biến độc lập duy nhất.",
        },
        {
          title: "So toàn bộ sáu field",
          explanation:
            "Checksum position.x giúp giữ output observable nhưng không đủ bắt lỗi ở velocityZ. `maximumLayoutDifference` duyệt mọi field theo particle index.",
        },
        {
          title: "Reset từ source trước mỗi experiment",
          explanation:
            "Không cho một layout chạy thêm một bước rồi so với phía còn lại. Mỗi race bắt đầu từ AoS source và SoA được convert từ chính source đó.",
        },
      ],
    },
    "p32-l06": {
      focus:
        "Dùng cache-line model 64 byte để đếm traffic theo field access, không biến mô hình thành lời tiên tri timing.",
      expected:
        "Position.x-only cho SoA ít line hơn; integrate đủ sáu field cho lượng useful/loaded bytes tương đương ở workload căn chỉnh.",
      files,
      steps: [
        {
          title: "Tách useful bytes khỏi loaded bytes",
          explanation:
            "Đọc một float chỉ cần 4 byte về mặt thuật toán, nhưng CPU đưa dữ liệu về theo cache line. Phần còn lại có thể hữu ích hoặc thành traffic lãng phí.",
        },
        {
          title: "Đọc stride từ địa chỉ field",
          explanation:
            "Hai `positionX` liên tiếp trong AoS cách nhau 24 byte; trong SoA chúng cách 4 byte. Khoảng cách này quyết định bao nhiêu giá trị cùng nằm trên một line.",
        },
        {
          title: "Đổi workload trước khi đổi kết luận",
          explanation:
            "Velocity-only dùng ba field, integrate dùng cả sáu. SoA có lợi thế traffic rõ nhất khi hot loop chỉ cần một phần nhỏ của struct.",
        },
      ],
    },
    "p32-l07": {
      focus:
        "Chạy race công bằng bằng warm-up riêng, nhiều sample, median và scaling từ 10k tới một triệu.",
      expected:
        "Mỗi row có timing AoS/SoA, traffic, checksum và difference; code không assert layout nào phải nhanh hơn.",
      files,
      steps: [
        {
          title: "Copy state trước khi timer chạy",
          explanation:
            "AoS và SoA đều nhận cùng source. Allocation/conversion được loại khỏi timing vì câu hỏi hiện tại là throughput của kernel, không phải chi phí đổi layout.",
        },
        {
          title: "Dùng median thay vì một lần chạy",
          explanation:
            "Mỗi sample đo một kernel invocation từ state tương đương. Median giảm ảnh hưởng của một lần hệ điều hành ngắt hoặc máy đang bận.",
        },
        {
          title: "Đọc đường tăng theo N",
          explanation:
            "10k, 100k và 1M giữ cùng seed/workload/repetitions. Timing tăng được giải thích cạnh số cache line, không bằng suy đoán từ FPS.",
        },
      ],
    },
    "p32-l08": {
      focus:
        "Ghép controls, sampled renderer, benchmark/scaling và validation thành lifecycle không chạy workload lớn ngoài ý muốn.",
      expected:
        "Ứng dụng reset được, pause mặc định, benchmark chỉ chạy khi bấm phím và validation báo riêng từng contract.",
      files,
      steps: [
        {
          title: "Giữ animation và benchmark là hai đường riêng",
          explanation:
            "Animation cho cảm giác state đang sống nhưng không dùng để đo. B và S tạm dừng animation, chạy experiment hữu hạn rồi mới in kết quả.",
        },
        {
          title: "Không tự động chạy scaling một triệu",
          explanation:
            "Startup chỉ sinh source và hiển thị scene. Scaling lớn là hành động chủ động để app không đóng băng trong lúc người học chỉ muốn đọc bài.",
        },
        {
          title: "Giữ từng validation có tên",
          explanation:
            "Deterministic data, conversion, kernel agreement, traffic model và observable benchmark là các contract độc lập; timing không quyết định pass/fail.",
        },
      ],
    },
  },
  references: {
    "p32-l01": [
      { label: "Array of Structures", href: "/glossary#array-of-structures", kind: "Thuật ngữ" },
      { label: "Memory layout", href: "/glossary#memory-layout", kind: "Thuật ngữ" },
    ],
    "p32-l02": [
      { label: "Hot loop", href: "/glossary#hot-loop", kind: "Thuật ngữ" },
      { label: "Memory stride", href: "/glossary#memory-stride", kind: "Thuật ngữ" },
    ],
    "p32-l03": [
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p32-l04": [
      { label: "Structure of Arrays", href: "/glossary#structure-of-arrays", kind: "Thuật ngữ" },
      { label: "Spatial locality", href: "/glossary#spatial-locality", kind: "Thuật ngữ" },
    ],
    "p32-l05": [
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
      { label: "Benchmark checksum", href: "/glossary#benchmark-checksum", kind: "Thuật ngữ" },
    ],
    "p32-l06": [
      { label: "Cache line", href: "/glossary#cache-line", kind: "Thuật ngữ" },
      { label: "Memory stride", href: "/glossary#memory-stride", kind: "Thuật ngữ" },
    ],
    "p32-l07": [
      { label: "Benchmark median", href: "/glossary#benchmark-median", kind: "Thuật ngữ" },
      { label: "Benchmark warm-up", href: "/glossary#benchmark-warm-up", kind: "Thuật ngữ" },
    ],
    "p32-l08": [
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
