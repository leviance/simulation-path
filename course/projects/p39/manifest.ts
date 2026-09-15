import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 32 — memory layout, workload một triệu phần tử và benchmark có giới hạn",
    "Project 33 — SDL3 tạo OpenGL context và quản lý shader/program/resource lifetime",
    "Project 37 — SSBO std430, compute workgroup, bounds guard, memory barrier và GPU timer query",
    "Project 38 — giữ trạng thái trên GPU qua nhiều pass mà không full-buffer readback trong đường chạy chính",
  ],
  summary:
    "Xây một Reduction & Scan Workbench có thể cộng 1.000.003 số và tạo exclusive prefix sum hoàn toàn trên GPU. Bạn sẽ lần lượt dùng shared memory, barrier trong workgroup, nhiều tầng dispatch và phần đệm bằng 0 để biến một vòng lặp tuần tự thành thuật toán song song chạy đúng với mọi kích thước dữ liệu. Kết quả từ CPU được giữ lại để đối chiếu sau cùng.",
  challenge: {
    timebox: "1.100–1.450 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL 4.3 nhận hơn một triệu số float, tính tổng bằng hierarchical reduction và tạo exclusive prefix sum bằng Blelloch scan mà không đưa các block sum về CPU giữa chừng.",
    outcome:
      "Một cửa sổ cho phép chuyển giữa Reduction và Exclusive Scan, chọn 8, 257, 65.537 hoặc 1.000.003 phần tử, đổi seed rồi chạy lại. Phần minh họa trình bày các tầng của cây, block sum, bước cộng offset và một số giá trị đầu ra; thanh tiêu đề cho biết số pass, lượng zero padding, thời gian GPU, sai số lớn nhất và kết quả kiểm tra.",
    requirements: [
      "Starter tái sử dụng khung SDL3/OpenGL 4.3 từ Project 37, xử lý resize/high-DPI và báo capability thiếu bằng tên cụ thể.",
      "Dãy float đầu vào phải tái lập được từ seed. Bản đối chiếu chạy trên CPU (CPU oracle) dùng double để tính tổng và exclusive prefix sum, độc lập với code GPU.",
      "Hai phép toán được định nghĩa rõ: reduction trả một scalar, exclusive scan trả N phần tử với output[0]=0 và output[i] là tổng input[0..i-1].",
      "Mỗi workgroup có 256 invocation, nạp tối đa 512 giá trị vào shared memory và zero-pad phần đuôi trước mọi phép cộng.",
      "Reduction shader có barrier sau load và sau từng stride; lane 0 ghi đúng một partial sum cho mỗi workgroup.",
      "Hierarchical reduction lặp input count 1.000.003 → 1.954 → 4 → 1, giữ partial sums trong SSBO và không readback giữa các tầng.",
      "Block scan dùng Blelloch upsweep/downsweep; root được lưu thành block sum rồi đặt về zero để kết quả là exclusive scan.",
      "Global scan tạo block sums, scan đệ quy chính mảng block sums rồi chạy uniform-add từ tầng nhỏ trở về output lớn.",
      "Giữa hai compute pass có quan hệ ghi–đọc phải có GL_SHADER_STORAGE_BARRIER_BIT; GL_BUFFER_UPDATE_BARRIER_BIT chỉ dùng trước lần readback cuối.",
      "Phần kiểm tra phải phát hiện NaN/Inf, sai kích thước, output[0] khác 0, chênh lệch prefix sai và tổng cuối không khớp; báo cáo nêu vị trí sai đầu tiên cùng sai số lớn nhất theo tolerance đã giải thích.",
      "GPU timing bao quanh toàn bộ pass graph nhưng không bao gồm upload/readback; query ring chỉ đọc slot đã available và không block frame hiện tại.",
      "Kèm starter, mười checkpoint độc lập, final có comment, ba compute shader, README và CTest thuần CPU kết thúc hữu hạn.",
    ],
    constraints: [
      "Không dùng CUDA, OpenCL, Vulkan, WebGPU, Thrust hoặc thư viện scan/reduction có sẵn.",
      "Không chạy một invocation duy nhất để cộng tuần tự toàn bộ mảng và gọi đó là GPU reduction.",
      "Không dùng atomicAdd vào một scalar chung; bài học cần thể hiện cây reduction và thứ tự đồng bộ rõ ràng.",
      "Không giả sử N là lũy thừa hai hoặc chia hết cho 512; 1.000.003 cố ý tạo 445 ô zero padding ở tầng đầu.",
      "Không cho pass tiếp theo đọc partial sum khi chưa có shader-storage barrier.",
      "Không đọc block sums về CPU để quyết định hoặc cộng offset giữa các pass của workload chính.",
      "Không so float GPU với double oracle bằng equality tuyệt đối; thứ tự phép cộng khác nhau tạo roundoff hợp lệ.",
      "Không dùng glFinish, vòng benchmark vô hạn hoặc app có window trong CTest.",
    ],
    definitionOfDone: [
      "CPU oracle cho [3,1,4,2] trả reduction=10 và exclusive scan=[0,3,4,8].",
      "Block size là 512 giá trị từ 256 invocation; shared array cần 2.048 byte và barrier nằm sau mọi bước có phụ thuộc dữ liệu.",
      "Với N=1.000.003, tầng reduction/scan có 1.954, 4 và 1 block; tầng đầu zero-pad đúng 445 giá trị.",
      "Reduction hoàn tất sau ba dispatch reduction và chỉ readback scalar ở buffer cuối.",
      "Global scan hoàn tất bằng ba block-scan pass cùng hai uniform-add pass; block offsets không đi qua CPU.",
      "Output scan bắt đầu bằng zero, giữ total cuối bằng output[N-1]+input[N-1] và khớp CPU oracle trong tolerance.",
      "Barrier bit được chọn theo consumer: SHADER_STORAGE giữa compute passes, BUFFER_UPDATE trước glGetBufferSubData.",
      "Preset 8 và 257 cho phép quan sát trực tiếp một block đầy/không đầy; preset lớn nhất vẫn có named validation đầy đủ.",
      "Timer query không block khi slot chưa available và title không gắn CPU wall-clock với nhãn GPU time.",
      "R tái lập đúng seed/count, phím 1–4 đổi preset, Tab đổi operation, V validate và B chạy benchmark hữu hạn.",
      "Benchmark là state machine submit nhiều nhất một sample mỗi frame, chỉ hoàn tất khi đủ chín query result và có deadline 10 giây.",
      "Canvas có pause/reset, pointer capture, keyboard, DPR, reduced motion và ghi rõ đây là mô hình thuật toán chứ không phải phép đo GPU.",
      "Starter, mười checkpoint, final, CTest, lab math tests, source contracts và production build đều kết thúc trong timeout hữu hạn.",
    ],
  },
  duration: "31–40 giờ",
  objectives: [
    "Hiểu vì sao reduction và prefix sum cần nhiều invocation cùng làm việc qua shared memory, barrier và nhiều lần dispatch",
    "Tự xây dựng hierarchical reduction và Blelloch exclusive scan cho cả kích thước không phải lũy thừa của hai",
    "Biết kiểm tra chuỗi compute pass bằng bản đối chiếu CPU, các điều kiện trung gian, sai số cho phép và timer query không chặn frame",
  ],
  lessons: [
    {
      id: "p39-l01",
      slug: "01-hai-dau-ra-hai-hop-dong",
      title: "Reduction và scan khác nhau ở đầu ra nào?",
      summary:
        "Khóa input deterministic, tổng tham chiếu và exclusive prefix sum trên CPU trước khi biến chúng thành workload song song.",
      order: 1,
      estimatedMinutes: 135,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l02",
      slug: "02-ve-cay-pass-va-phan-duoi",
      title: "Vẽ trước cây pass và xử lý phần đuôi",
      summary:
        "Tính block 512, các tầng 1.954→4→1, zero padding và lý do thứ tự cộng float không còn giống vòng lặp CPU.",
      order: 2,
      estimatedMinutes: 130,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l03",
      slug: "03-reduction-trong-mot-workgroup",
      title: "Cộng 512 số trong một workgroup",
      summary:
        "Nạp hai giá trị mỗi lane vào shared memory rồi thu cây 512→256→…→1 bằng barrier đặt đúng nơi.",
      order: 3,
      estimatedMinutes: 170,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l04",
      slug: "04-reduction-phan-cap-den-mot-scalar",
      title: "Gộp nhiều tầng đến khi còn một tổng",
      summary:
        "Lặp cùng kernel trên partial sums, ping-pong hai scratch buffer và chỉ readback khi tầng cuối còn một giá trị.",
      order: 4,
      estimatedMinutes: 165,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l05",
      slug: "05-blelloch-exclusive-scan",
      title: "Tạo exclusive prefix sum bằng Blelloch scan",
      summary:
        "Theo dõi upsweep tạo total, đặt root về zero rồi downsweep đổi tổng cây thành prefix độc quyền cho 512 phần tử.",
      order: 5,
      estimatedMinutes: 190,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l06",
      slug: "06-scan-tung-block-va-giu-block-sum",
      title: "Scan từng block và lưu lại block sum",
      summary:
        "Chạy Blelloch độc lập cho mọi block, ghi local prefix ra output và giữ total của từng block trong SSBO riêng.",
      order: 6,
      estimatedMinutes: 155,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l07",
      slug: "07-scan-de-quy-va-uniform-add",
      title: "Scan nhiều tầng rồi cộng offset trở lại",
      summary:
        "Scan chính block sums qua các tầng rồi cộng offset trở xuống để local prefix biến thành global exclusive prefix.",
      order: 7,
      estimatedMinutes: 190,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l08",
      slug: "08-barrier-va-vong-doi-buffer",
      title: "Đặt barrier đúng chỗ và quản lý vòng đời buffer",
      summary:
        "Biến chuỗi dispatch thành pass graph có producer, consumer, buffer ownership và barrier bit cụ thể ở từng cạnh.",
      order: 8,
      estimatedMinutes: 145,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l09",
      slug: "09-validation-va-gpu-timing",
      title: "Kiểm tra kết quả và đo toàn bộ chuỗi GPU",
      summary:
        "Đối chiếu reduction/scan bằng invariant, mixed tolerance, first mismatch và đo pipeline bằng query ring không block.",
      order: 9,
      estimatedMinutes: 165,
      demoId: "gpu-reduction-prefix-sum",
    },
    {
      id: "p39-l10",
      slug: "10-hoan-thien-reduction-scan-workbench",
      title: "Hoàn thiện Reduction & Scan Workbench",
      summary:
        "Ghép presets, controls, visualization, diagnostics, validation, timing, cleanup và toàn bộ source chạy độc lập.",
      order: 10,
      estimatedMinutes: 180,
      demoId: "gpu-reduction-prefix-sum",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
