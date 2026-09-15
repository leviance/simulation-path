import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — framebuffer, streaming texture và vòng lặp SDL3",
    "Project 27 — deterministic workload, warm-up, checksum và bounded benchmark",
    "Project 31 — particle state lớn, fixed update và phép đo tách khỏi rendering",
  ],
  summary:
    "Giữ nguyên một triệu particle nhưng sắp xếp sáu field theo hai cách: Array of Structures và Structure of Arrays. Bạn sẽ viết hai kernel có cùng output, mô hình hóa cache line rồi benchmark nhiều workload để thấy layout chỉ có ý nghĩa khi biết code đang đọc field nào.",
  challenge: {
    timebox: "650–850 phút",
    mission:
      "Tự xây dựng một thí nghiệm C++/SDL3 cập nhật 1.000.000 particle bằng hai memory layout AoS và SoA. Người dùng phải đổi được workload, quan sát layout, chạy benchmark/scaling và kiểm tra hai phía vẫn tạo cùng state thay vì chỉ công bố layout nào nhanh hơn.",
    outcome:
      "Một cửa sổ SDL3 hiển thị particle sample cùng sơ đồ memory cells. Title bar và terminal báo N, workload, median time của AoS/SoA, cache lines ước lượng, useful bytes, checksum và maximum field difference cho các mốc 10.000, 100.000 và 1.000.000 particle.",
    requirements: [
      "Định nghĩa `ParticleAoS` gồm đúng sáu `float`: position xyz và velocity xyz; một triệu phần tử chiếm khoảng 24 MB state thuần.",
      "Sinh dữ liệu bằng PRNG có seed; cùng seed phải tái tạo đúng mọi field theo cùng particle index.",
      "Viết AoS integrate kernel trước: đọc ba velocity, cập nhật ba position và wrap vào world bounds mà không allocation hoặc logging trong hot loop.",
      "Tạo baseline AoS có warm-up, repetitions hữu hạn, timer chỉ bao quanh kernel và checksum được dùng sau vùng đo.",
      "Định nghĩa SoA bằng sáu `std::vector<float>` có cùng size; conversion từ AoS nằm ngoài vùng benchmark.",
      "Viết SoA kernel bằng cùng thứ tự phép tính và cùng `float`; sau mỗi workload phải so maximum difference với AoS.",
      "Hỗ trợ ba workload: chỉ đọc `position.x`, chỉ sửa velocity xyz và integrate dùng đủ sáu field.",
      "Mô hình cache line 64 byte phải báo useful bytes, cache lines, loaded bytes và efficiency cho từng layout/workload.",
      "Benchmark AoS và SoA từ cùng source state, warm-up riêng, dùng median của nhiều sample và không tính clone/conversion vào timer.",
      "Scaling study dùng cùng seed, workload và repetitions cho 10k, 100k, 1M; timing luôn đi cạnh checksum, difference và traffic model.",
      "Renderer được phép lấy mẫu tối đa một số particle hữu hạn, nhưng update/benchmark readout phải nói rõ workload vẫn dùng đủ N.",
      "Kèm starter, tám checkpoint độc lập, final có comment, README và CTest không mở SDL window.",
    ],
    constraints: [
      "Không dùng OpenGL, compute shader, SIMD intrinsics, OpenMP, multithreading, ECS hoặc thư viện benchmark trong project này.",
      "Không đổi công thức, precision, seed, particle order hoặc số repetitions giữa AoS và SoA.",
      "Không tính thời gian generation, AoS→SoA conversion, allocation, rendering hoặc console output vào kernel timing.",
      "Không kết luận SoA luôn nhanh hơn; workload dùng đủ field có thể cho kết quả khác workload chỉ đọc một field.",
      "Không dùng FPS của cửa sổ làm benchmark memory layout; rendering là workload khác.",
      "Không bỏ checksum hoặc maximum difference chỉ để benchmark đẹp hơn; correctness phải được xác nhận trước timing.",
      "Không dùng cache-line model như số timing dự đoán tuyệt đối; đây là mô hình traffic để giải thích phép đo trên máy thật.",
      "Không chạy test với một triệu particle lặp vô hạn; CTest dùng workload nhỏ có giới hạn, còn scaling lớn chỉ chạy khi người dùng yêu cầu.",
    ],
    definitionOfDone: [
      "Cùng seed tạo lại đúng AoS state; `sizeof(ParticleAoS)` bằng 24 byte và mọi giá trị hữu hạn.",
      "AoS integrate chạy nhiều bước vẫn giữ position trong world bounds và không đổi particle count.",
      "AoS baseline có warm-up, repetitions hữu hạn, checksum lặp lại được và timing finite.",
      "Sáu vector SoA có cùng size; conversion giữ nguyên từng field ở từng index.",
      "Ba workload AoS/SoA tạo checksum bằng nhau và maximum field difference bằng 0 với cùng source state.",
      "Với workload chỉ đọc `position.x`, SoA dùng ít cache line và efficiency cao hơn AoS trong mô hình 64 byte.",
      "Với integrate đủ sáu field và N chia hết theo cache line, hai layout dùng lượng loaded bytes tương đương trong mô hình.",
      "Scaling table có đủ 10k/100k/1M, không dùng timing làm correctness assertion và không đo conversion/rendering.",
      "Canvas xử lý DPR, pointer capture, keyboard, reduced motion, pause/step/reset và có mô tả thay thế bằng văn bản.",
      "Starter, tám checkpoint và final build ở Debug/Release; CTest và Canvas math tests đều đạt.",
    ],
  },
  duration: "18–24 giờ",
  objectives: [
    "Nhìn memory layout như khoảng cách giữa những field mà một hot loop thực sự cần đọc",
    "Viết hai implementation AoS/SoA có cùng dữ liệu, cùng công thức và output kiểm chứng được",
    "Thiết kế benchmark có warm-up, median, checksum và traffic model để không kết luận từ FPS",
  ],
  lessons: [
    {
      id: "p32-l01",
      slug: "01-khoa-workload-mot-trieu-particles",
      title: "Khóa workload một triệu particle",
      summary:
        "Bắt đầu từ cửa sổ nhìn thấy được, định nghĩa sáu field của `ParticleAoS`, sinh một triệu phần tử deterministic và tính đúng dung lượng state trước khi nói về tốc độ.",
      order: 1,
      estimatedMinutes: 105,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l02",
      slug: "02-cap-nhat-particles-trong-aos",
      title: "Cập nhật particles trong AoS",
      summary:
        "Viết hot loop AoS dễ đọc, cập nhật position từ velocity, wrap world bounds và tách update đủ một triệu phần tử khỏi draw sample.",
      order: 2,
      estimatedMinutes: 110,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l03",
      slug: "03-do-baseline-aos",
      title: "Đo baseline AoS",
      summary:
        "Định nghĩa ba workload, chạy warm-up ngoài timer, giữ checksum và tạo baseline hữu hạn trước khi có SoA để tránh thay hai biến cùng lúc.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l04",
      slug: "04-chuyen-state-sang-soa",
      title: "Chuyển cùng state sang SoA",
      summary:
        "Tách sáu field thành sáu vector liên tục, kiểm invariant cùng size và conversion exact mà chưa vội benchmark.",
      order: 4,
      estimatedMinutes: 115,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l05",
      slug: "05-doi-chieu-hai-kernel",
      title: "Đối chiếu hai kernel trước cuộc đua",
      summary:
        "Viết SoA kernels bằng đúng thứ tự phép tính, chạy hai layout từ cùng source và so checksum cùng maximum field difference.",
      order: 5,
      estimatedMinutes: 125,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l06",
      slug: "06-cache-line-stride-va-useful-bytes",
      title: "Cache line, stride và useful bytes",
      summary:
        "Đếm cache line 64 byte cho từng workload, phân biệt bytes cần dùng với bytes phải nạp và giải thích vì sao kết quả phụ thuộc field access.",
      order: 6,
      estimatedMinutes: 135,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l07",
      slug: "07-benchmark-va-scaling-release",
      title: "Benchmark và scaling trong Release",
      summary:
        "Đo AoS/SoA công bằng bằng median, rồi tăng N từ 10k lên 1M và đọc timing cạnh traffic, checksum cùng difference.",
      order: 7,
      estimatedMinutes: 145,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l08",
      slug: "08-hoan-thien-memory-layout-race",
      title: "Hoàn thiện Memory Layout Race",
      summary:
        "Ghép layout/workload controls, sampled renderer, benchmark/scaling và validation report thành bản final có lifecycle rõ ràng.",
      order: 8,
      estimatedMinutes: 145,
      demoId: "memory-layout-race",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
