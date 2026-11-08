import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 34 — context OpenGL, mesh, camera và depth buffer; source của project này đã chứa lại phần nền cần thiết",
    "Project 37 — compute shader, SSBO, workgroup, memory barrier và GPU timer query",
    "Vector, dot product và ma trận view/projection; phép kiểm frustum và indirect draw sẽ được giải thích tại chỗ",
  ],
  summary:
    "Xây một thành phố 3D có thể đi xuyên qua, rồi để GPU tự chọn vật thể và dựng lệnh vẽ. Từ khu phố nhỏ, bạn nối lần lượt bounds, visibility mask, reduction, exclusive scan, compaction và indirect draw vào cùng một renderer. Bản cuối xử lý ít nhất một triệu object records thật; bảng số giúp giải thích cảnh, không thay thế cảnh.",
  challenge: {
    timebox: "1.800–2.400 phút",
    mission:
      "Tự xây dựng một ứng dụng C++20/SDL3/OpenGL 4.3 cho phép khám phá thành phố tạo từ seed. GPU phải kiểm vùng nhìn của ít nhất một triệu object trong mỗi frame nghiệm thu, compact ID theo nhóm mesh và ghi lệnh indirect để renderer vẽ mà không đưa danh sách về CPU giữa chừng.",
    outcome:
      "Một thành phố có đường, quảng trường, khu thấp tầng và các mốc cao dễ nhận biết. Bạn đi ở tầm phố hoặc bay lên, đổi FOV, bật/tắt culling trên cùng camera, xem vùng nhận/loại và chọn một object để đọc ID, bounds, lý do lọc. Cửa sổ báo resident/tested/accepted/submitted, bộ nhớ và thời gian từng nhóm pass.",
    requirements: [
      "Bắt đầu bằng một khu phố chạy được và camera tự do. Công bố scaffold window, GL loader, mesh, camera và picking; không bắt ghép source từ project khác.",
      "Scene tái lập từ seed, mỗi object có ID ổn định, vị trí, kích thước, mesh/material và bounding volume riêng. Một triệu instance không được đánh tráo thành một triệu tam giác.",
      "Tự viết phép kiểm bounding sphere với sáu plane của frustum. Giữ object cắt plane để không làm mất phần hình còn trong vùng nhìn.",
      "GPU tạo visibility mask/counts, tự reduction sum/min/max và hierarchical exclusive scan qua nhiều workgroup; counts, offsets và ID dùng số nguyên.",
      "Compaction giữ mỗi ID được nhận đúng một lần và giữ thứ tự đã công bố trong từng nhóm mesh. Renderer đọc object data và visible IDs trực tiếp trên GPU.",
      "GPU ghi ba indirect command cố định theo nhóm mesh; CPU không đọc mask để tính instanceCount, không phát draw call cho từng object và không yêu cầu API OpenGL 4.6.",
      "Có tập rỗng, all-visible, ID rời rạc, N=0/1, N lẻ và N không chia hết workgroup; counts→offsets có fixture riêng.",
      "Báo rõ accepted chỉ là giao bounding volume với frustum, không phải số object có pixel hoặc đã vượt qua occlusion test.",
      "Đọc giới hạn phần cứng và kiểm bytes/scratch trước cấp phát; tạo scene theo batch hữu hạn. Đổi N/seed thất bại phải giữ scene hợp lệ trước đó.",
      "Validation và benchmark có tiến độ, deadline và Cancel. So culling on/off trên cùng seed/camera/build, warm-up rồi lấy mẫu hữu hạn, tách compute, command, draw và frame.",
      "Có starter, mười hai checkpoint chạy độc lập, final đầy đủ comment, tests CPU, kiểm GPU thật, README và ZIP source.",
    ],
    constraints: [
      "Không dùng engine/visibility library để làm thay frustum, scan, compaction hoặc renderer instancing.",
      "Không đọc block sums về CPU giữa các tầng scan; không dùng float làm prefix hoặc object ID.",
      "Không full-buffer readback hoặc CPU compaction trong đường chạy mỗi frame; readback kiểm chứng phải nằm trong job riêng có giới hạn.",
      "Không dùng fog, hậu kỳ hoặc LOD để giấu lỗi culling. Occlusion, streaming và LOD chỉ là mở rộng.",
      "Không gọi mảng nhỏ trong Canvas là workload một triệu object trên GPU; Canvas 2D chỉ minh họa một tập CPU thu nhỏ.",
      "Không hứa FPS/speedup chung, không gọi thời gian enqueue CPU là GPU time và không để benchmark chạy vô hạn.",
    ],
    definitionOfDone: [
      "Camera đi xuyên cảnh 3D có perspective, depth, đường/quảng trường, nhiều hình dáng và vật liệu; không chỉ orbit quanh một mô hình.",
      "Các fixture trong/ngoài/cắt cả sáu plane có đáp án độc lập; GPU mask khớp CPU trên toàn preset nhỏ và mẫu tái lập của preset lớn.",
      "Reduction số nguyên và scan khớp exact trong miền không overflow; khoảng cách float có quy tắc finite/tolerance riêng và tập rỗng được ghi rõ.",
      "Mask→prefix→visible IDs không mất, trùng hoặc ghi ngoài buffer; nhóm mesh và command có range/instanceCount/offset đúng, zero-visible không dùng count cũ.",
      "Bản N≥1.000.000 thật xét đủ N trên GPU mỗi frame nghiệm thu và renderer dùng visible IDs cùng command do GPU tạo.",
      "Culling bật/tắt giữ phần hình đáng lẽ xuất hiện ở cùng camera. Debug frustum, chọn object, FOV, seed/N và Reset cho kết quả đọc được.",
      "Báo resident/tested/accepted/submitted, bytes và số command; báo timing từng pass/toàn frame, cả ca nhỏ hoặc all-visible không có lợi.",
      "B và V kết thúc hữu hạn; hủy/timeout là incomplete chứ không PASS. Cửa sổ vẫn nhận input, đóng được và giữ scene hợp lệ khi yêu cầu mới lỗi.",
      "Source từng bài khớp checkpoint, final có thể build từ ZIP; CTest Debug/Release, kiểm GPU, Canvas, route và package được ghi bằng chứng riêng.",
    ],
  },
  duration: "38–48 giờ",
  objectives: [
    "Nối frustum culling, reduction, scan và compaction vào một thành phố 3D có thể khám phá",
    "Hiểu GPU tạo danh sách ID và indirect command thế nào mà CPU không phải đếm vật thể mỗi frame",
    "Kiểm đúng tập được nhận, đúng quy mô và đúng phạm vi timing trước khi kết luận culling có lợi",
  ],
  lessons: [
    {
      id: "p39-l01",
      slug: "01-khu-pho-dau-tien",
      title: "Dựng khu phố đầu tiên và đi vào cảnh",
      summary:
        "Chạy scaffold độc lập, vẽ các mesh lặp lại và điều khiển camera ở tầm phố lẫn trên cao.",
      order: 1,
      estimatedMinutes: 160,
      demoId: "million-object-city",
    },
    {
      id: "p39-l02",
      slug: "02-mot-trieu-object-tu-seed",
      title: "Từ một khu phố đến một triệu object records",
      summary:
        "Khóa layout, ID, seed và ngân sách; tăng số object thật mà không nhân bản mesh một triệu lần.",
      order: 2,
      estimatedMinutes: 175,
      demoId: "million-object-city",
    },
    {
      id: "p39-l03",
      slug: "03-sau-mat-phang-vung-nhin",
      title: "Sáu mặt phẳng quyết định vật thể có thể xuất hiện",
      summary: "Dựng frustum từ camera, kiểm bounding sphere và giữ lại vật thể cắt mép vùng nhìn.",
      order: 3,
      estimatedMinutes: 180,
      demoId: "million-object-city",
    },
    {
      id: "p39-l04",
      slug: "04-mask-tren-gpu",
      title: "Để GPU ghi visibility mask cho cả thành phố",
      summary:
        "Mỗi invocation đọc một object, kiểm đủ bounds và ghi membership theo nhóm mesh; xử lý phần đuôi trước truy cập.",
      order: 4,
      estimatedMinutes: 175,
      demoId: "million-object-city",
    },
    {
      id: "p39-l05",
      slug: "05-reduction-count-min-max",
      title: "Gom số lượng và khoảng cách bằng reduction",
      summary:
        "Từ kết quả rời rạc, gộp count/min/max qua shared memory và nhiều workgroup; định nghĩa rõ tập rỗng.",
      order: 5,
      estimatedMinutes: 200,
      demoId: "million-object-city",
    },
    {
      id: "p39-l06",
      slug: "06-exclusive-scan-trong-block",
      title: "Tìm chỗ ghi cho mỗi object bằng exclusive scan",
      summary:
        "Đi qua ví dụ mask nhỏ, upsweep/downsweep và zero padding trước khi scan từng block.",
      order: 6,
      estimatedMinutes: 200,
      demoId: "million-object-city",
    },
    {
      id: "p39-l07",
      slug: "07-scan-nhieu-tang",
      title: "Nối các block thành một prefix toàn cục",
      summary: "Scan chính block sums rồi cộng offset trở xuống, không đưa tầng trung gian về CPU.",
      order: 7,
      estimatedMinutes: 200,
      demoId: "million-object-city",
    },
    {
      id: "p39-l08",
      slug: "08-compact-visible-ids",
      title: "Gom đúng ID vào ba nhóm mesh",
      summary:
        "Dùng integer prefix để ghi mỗi ID đúng một lần, giữ thứ tự ổn định và kiểm cả trường hợp không có object nào.",
      order: 8,
      estimatedMinutes: 180,
      demoId: "million-object-city",
    },
    {
      id: "p39-l09",
      slug: "09-lenh-ve-indirect",
      title: "Biến kết quả compute thành lệnh vẽ",
      summary:
        "GPU ghi indirect command, graphics đọc visible IDs và object SSBO; barrier được chọn theo consumer.",
      order: 9,
      estimatedMinutes: 190,
      demoId: "million-object-city",
    },
    {
      id: "p39-l10",
      slug: "10-debug-va-chon-vat-the",
      title: "Nhìn thấy frustum và hỏi vì sao một object bị loại",
      summary:
        "Dùng góc nhìn debug, picking và inspector; đổi N/seed an toàn mà không phá scene đang chạy.",
      order: 10,
      estimatedMinutes: 175,
      demoId: "million-object-city",
    },
    {
      id: "p39-l11",
      slug: "11-kiem-chung-va-do-hieu-nang",
      title: "Kiểm đúng kết quả rồi mới so hiệu năng",
      summary:
        "Đối chiếu mask/prefix/IDs/commands, chạy camera path tái lập và đo culling on/off bằng batch hữu hạn.",
      order: 11,
      estimatedMinutes: 230,
      demoId: "million-object-city",
    },
    {
      id: "p39-l12",
      slug: "12-thanh-pho-hoan-chinh",
      title: "Hoàn thiện thành phố và nghiệm thu bản một triệu object",
      summary:
        "Ghép ứng dụng, đọc đúng telemetry và build toàn bộ source độc lập; phân biệt bằng chứng tự động với kiểm thao tác.",
      order: 12,
      estimatedMinutes: 190,
      demoId: "million-object-city",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
