import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — cửa sổ, framebuffer và streaming texture SDL3",
    "Project 02 — position/velocity, input và ý nghĩa của dt",
    "Project 23 — gravity, fixed timestep và symplectic Euler; bài 02 nhắc lại phần cần dùng",
  ],
  summary:
    "Xây một đài phun 3D có phát hạt, rơi do gravity, hết tuổi thọ và tái sử dụng slot. Sau khi mô hình chạy đúng, đổi AoS/SoA mà giữ nguyên state, rồi đo hai workload trên CPU với preset một triệu hạt sống. Không cần học N-body hoặc ghép ZIP của Project 31.",
  challenge: {
    timebox: "8–12 giờ",
    mission:
      "Tự xây dựng một đài phun hạt CPU bằng C++/SDL3. Hạt phải được phát ra, bay theo gravity, hết lifetime và sinh lại trong slot cũ. Bản cuối có preset một triệu hạt sống; đổi layout phải giữ nguyên trạng thái, không khởi động lại mô phỏng.",
    outcome:
      "Một cửa sổ có đài phun đọc được theo chiều sâu, màu theo tuổi hạt, controls và số liệu allocated/alive/updated/rendered. Người dùng có thể dừng, tiến một bước, đổi AoS/SoA và so chi phí cập nhật mà không đánh đồng FPS với tốc độ kernel.",
    requirements: [
      "Giữ ID/slot ổn định, position/velocity XYZ, age, lifetime, generation và thuộc tính màu. Có emitter và respawn tái lập theo seed/ID/generation.",
      "Có preset khởi đầu trống để quan sát emission và preset warm ít nhất 1.000.000 hạt sống để nghiệm thu cập nhật CPU đủ N.",
      "Chạy/dừng, reset cùng preset/seed, tiến một fixed step; camera và input vẫn phản hồi khi đang tính hoặc dừng.",
      "Đổi AoS/SoA giữ đủ các field, active count, thời gian và emission carry. Có thể hủy chuyển đổi hoặc bước cập nhật chưa xong.",
      "Điều chỉnh emitter, gravity, lifetime và emission rate; nói rõ cấu hình nào tác dụng ngay và cấu hình nào dùng cho lần sinh tiếp theo.",
      "Đài phun luôn chạy đầy đủ vòng đời; workload gravity-only chỉ là phép đo một phần kernel, không biến nó thành một solver khác.",
      "Benchmark có cả gravity-only và full lifecycle; cùng source, seed, float32, dt và ba pass cho mỗi mẫu; 1 warm-up và 5 mẫu đo.",
      "Giữ checksum, kiểm ID/generation chính xác và sai số từng field; báo median/min/max, conversion/copy tách khỏi kernel, draw/upload và frame CPU riêng.",
      "Nếu lấy mẫu để vẽ, công bố sampled và rendered riêng. Không giảm số được cập nhật để làm đẹp FPS.",
      "Kèm source C++20 độc lập, starter, tám checkpoint, final, README và tests không mở window.",
    ],
    constraints: [
      "Tự viết container, emitter, vòng đời, cập nhật và benchmark. Baseline một luồng CPU; không dùng thread pool, OpenGL/compute hoặc engine.",
      "Không đổi mô hình, độ chính xác hay thứ tự ngẫu nhiên giữa AoS và SoA; random phải phụ thuộc ID/generation, không phụ thuộc thứ tự duyệt container.",
      "Không allocation, conversion, render hoặc logging bên trong vùng đo kernel; công bố các khác biệt compiler/vectorization.",
      "Giữ cả kết quả AoS không chậm hơn. Mô hình cache line 64 byte có giả định alignment và upper bound rõ, không phải số cache miss thực.",
      "Giới hạn N=1.000.000, tham số, batch và deadline; job có pause/cancel, không có vòng bù lag vô hạn.",
      "Canvas tối đa 20.000 hạt để học; preset một triệu và benchmark chuẩn nằm trong C++. Timing JavaScript không đại diện layout bộ nhớ C++.",
    ],
    definitionOfDone: [
      "Fixture độc lập kiểm emission carry, gravity, tuổi hạt, expiry/respawn, ID ổn định và NaN/Inf.",
      "AoS/SoA giữ mọi field khi chuyển đổi; cùng snapshot/seed/dt cho state tương đương theo tolerance công bố.",
      "Workflow một triệu hạt sống kiểm từng slot thật đã tiến age/generation sau một bước; không chỉ kiểm counter hoặc dung lượng cấp phát.",
      "Mỗi benchmark row ghi đủ workload/N/pass/checksum/difference; có median và độ phân tán, không assert layout nào luôn nhanh hơn.",
      "Đài phun nhìn thấy được; số update và render tách biệt; dung lượng payload/capacity của các container được ghi rõ.",
      "Pause/Reset/single-step, đổi layout và benchmark có thể hủy; state chưa hoàn tất không lộ ra như một snapshot mới.",
      "Starter, checkpoint và final build; CTest Debug/Release, workflow hữu hạn, benchmark Release và kiểm thử desktop được ghi riêng.",
      "Code trong bài khớp source, dùng 4 spaces và One Dark; bài cuối có toàn bộ mã chạy được cùng ZIP.",
    ],
  },
  duration:
    "Đọc 5–7 giờ · tự viết 12–18 giờ · thí nghiệm/kiểm tra 3–5 giờ; chưa tính cài môi trường",
  objectives: [
    "Xây hệ hạt có emission và vòng đời thật trước khi tối ưu bộ nhớ",
    "Giữ nguyên mô hình và state khi thay container AoS/SoA",
    "Đo đúng phạm vi, kiểm output và giải thích cả trường hợp không có speedup",
  ],
  lessons: [
    {
      id: "p32-l01",
      slug: "01-khoa-workload-mot-trieu-particles",
      title: "Nhìn thấy đài phun trước khi tối ưu",
      summary:
        "Chạy khung SDL, đọc state của hạt trong không gian 3D và phân biệt khởi tạo warm với chuyển động do solver.",
      order: 1,
      estimatedMinutes: 100,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l02",
      slug: "02-cap-nhat-particles-trong-aos",
      title: "Phát hạt, cho rơi và tái sử dụng slot",
      summary:
        "Thêm emission carry, gravity, age/lifetime và respawn có seed; tiến một bước đầy đủ rồi mới công bố state.",
      order: 2,
      estimatedMinutes: 150,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l03",
      slug: "03-do-baseline-aos",
      title: "Đo một kernel AoS có thể kiểm chứng",
      summary:
        "Đo gravity-only và toàn bộ vòng đời bằng AoS; dùng warm-up, nhiều mẫu và checksum ngoài timer.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l04",
      slug: "04-chuyen-state-sang-soa",
      title: "Đổi layout mà không làm đổi trạng thái",
      summary:
        "Tách đủ mười một field thành các mảng; chuyển layout theo batch và có thể hủy mà không đổi snapshot đang xem.",
      order: 4,
      estimatedMinutes: 110,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l05",
      slug: "05-doi-chieu-hai-kernel",
      title: "Chạy cùng vòng đời bằng SoA",
      summary:
        "Viết kernel SoA theo cùng thứ tự phép tính float32, giữ ID/generation và kiểm cả các lần hạt được tái sử dụng.",
      order: 5,
      estimatedMinutes: 130,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l06",
      slug: "06-cache-line-stride-va-useful-bytes",
      title: "Giải thích dữ liệu mà vòng lặp chạm tới",
      summary:
        "Đếm cache line của gravity-only và nhận biết giới hạn của mô hình all-field; không gọi nó là số cache miss đo được.",
      order: 6,
      estimatedMinutes: 100,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l07",
      slug: "07-benchmark-va-scaling-release",
      title: "Đo Release và giữ cả kết quả không nhanh hơn",
      summary:
        "Đo AoS/SoA với cùng seed và workload ở 10k/100k/1M; đọc median, min/max, chi phí conversion và sai khác state.",
      order: 7,
      estimatedMinutes: 150,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l08",
      slug: "08-hoan-thien-memory-layout-race",
      title: "Hoàn thiện đài phun một triệu hạt",
      summary:
        "Ghép controls, đài phun, đo hiệu năng và quy trình kiểm chứng đủ một triệu hạt sống thành ứng dụng độc lập.",
      order: 8,
      estimatedMinutes: 130,
      demoId: "memory-layout-race",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
