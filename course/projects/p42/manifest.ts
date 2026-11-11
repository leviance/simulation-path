import type { PublishedProjectEditorial } from "../../types";

const demoId = "particle-morph-studio";
const project = {
  summary:
    "Cho một triệu điểm rời khỏi hình cầu rồi tụ thành xuyến hoặc nút thắt. Tự lấy mẫu bề mặt, ghép từng cặp điểm và điều khiển đường đi trên GPU; dùng A/B để nhìn ra chỗ dồn mẫu và chuyển động rối.",
  duration: "11–15 giờ, chưa tính cài đặt và build lần đầu",
  prerequisites: [
    "Đã dùng vector, camera và mesh tam giác. Ba mesh mẫu được cấp trong gói; không cần tải source của Project 41.",
    "Đã đọc buffer, shader và compute dispatch ở Project 33–38. Bài đầu vẫn cho một nhóm điểm chạy trên CPU trước khi đưa phép cập nhật sang GPU.",
    "C++20, CMake 3.24+, SDL 3.4.8 và OpenGL 4.3. Nhánh compute không chạy trên OpenGL 4.1 của macOS.",
  ],
  objectives: [
    "Biến một mesh tam giác thành phân bố lấy mẫu theo diện tích; kiểm bằng centroid và tỷ lệ hai tam giác không bằng nhau.",
    "Giữ N ID ổn định, tạo hai phép ghép song ánh và giải thích khác biệt ở giữa quá trình biến hình.",
    "Điều khiển bằng model time, đạt đúng hai đầu và không gắn thời lượng morph với FPS.",
    "Chuẩn bị cấu hình theo batch, giữ last-good khi hủy hoặc gặp lỗi và cập nhật/vẽ thật một triệu hạt trên GPU.",
  ],
  challenge: {
    timebox: "90–120 phút tự dựng phiên bản đầu",
    mission:
      "Tự xây một studio biến hình 3D. Bắt đầu bằng vài trăm điểm trên hình cầu và xuyến, kéo timeline để từng ID đi từ vị trí nguồn tới vị trí đích. Khi đã có hình chuyển động, tìm cách làm mẫu đều hơn và đường đi bớt rối.",
    outcome:
      "Ứng dụng C++/SDL3 có hình cầu, xuyến và nút thắt. Chọn hai hình, N và seed, áp dụng cấu hình rồi scrub, Play/Pause, đảo chiều hoặc lặp. A/B đổi phép ghép trên cùng bộ mẫu; histogram và một nhóm đường đi giúp giải thích những gì đang thấy.",
    requirements: [
      "Nhận ra mô hình ở t=0 và t=1; kéo camera không dựng lại mẫu. Đổi A/B không được âm thầm đổi seed hoặc thay bộ điểm.",
      "Cho chọn cách lấy mẫu theo diện tích và một chế độ cố ý thiên lệch. Có số liệu và lớp màu để thấy nơi bị dồn mẫu.",
      "Mỗi ID nguồn có đúng một ID đích, không mất hoặc nhân bản ID. Cùng seed/config phải tái lập được bộ mẫu và ánh xạ.",
      "Có linear, easing và đường cong được giải thích; Pause giữ model time, scrub tới được đúng hai đầu.",
      "Chuẩn bị yêu cầu mới mà camera và mô hình cũ vẫn dùng được. Hủy, đổi nhanh hoặc input lỗi phải giữ bản hợp lệ gần nhất và đúng nhãn.",
      "Final cập nhật và vẽ ít nhất một triệu hạt thật trên GPU; hiển thị riêng thời gian lấy mẫu, ghép, submit upload, update, draw và frame.",
    ],
    constraints: [
      "Tự viết diện tích, CDF, barycentric sampler, correspondence và GPU update/render; không dùng particle engine hay dissolve hai ảnh.",
      "Spatial order là một quy tắc hữu hạn, không phải optimal transport. Không gọi uniform triangle hoặc uniform vertex index là đều theo diện tích.",
      "Công bố layout source/target/current/path/mapping, canary, giới hạn N và ngân sách khi ACTIVE cùng candidate tồn tại.",
      "Canvas là minh họa CPU tối đa 4.096 mẫu. Năm triệu là mở rộng tùy phần cứng; không hạ N ngầm hoặc hứa FPS chung.",
    ],
    definitionOfDone: [
      "Fixture hai tam giác có diện tích 1:4 cho tần suất phù hợp uncertainty qua nhiều seed; barycentric có tổng bằng 1 và centroid đúng.",
      "Hai mapping đều là permutation. A/B tạo hai chuyển động quan sát được trên cùng nguồn/đích, không chỉ đổi nhãn.",
      "t=0/1 đúng endpoints; nhiều chuỗi dt có cùng tổng thời gian cho cùng vị trí. Model time không tiến khi Pause.",
      "Một triệu hạt được compute ghi và DrawArrays vẽ thật; N lẻ không ghi quá buffer. Kiểm toàn state chỉ chạy trong job riêng hữu hạn.",
      "Starter, 10 checkpoint và final build độc lập; ZIP có tests và shader. Invalid/cancel giữ ACTIVE, không trộn generation.",
    ],
  },
  lessons: [
    {
      id: "p42-l01",
      slug: "01-tu-hai-hinh-den-chuyen-dong",
      title: "Cho những điểm đầu tiên chuyển giữa hai hình",
      summary: "Từ cửa sổ có camera, đưa hai bộ điểm vào cùng hệ tọa độ rồi nối timeline vào draw.",
      order: 1,
      estimatedMinutes: 55,
      demoId,
    },
    {
      id: "p42-l02",
      slug: "02-lay-mau-theo-dien-tich",
      title: "Rải đều trên bề mặt, không phải đều theo tam giác",
      summary: "Dùng diện tích, CDF và ba trọng số barycentric; kiểm bằng hai tam giác 1:4.",
      order: 2,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p42-l03",
      slug: "03-id-seed-va-mat-do",
      title: "Giữ ID và dùng mật độ để phát hiện mẫu lệch",
      summary:
        "Tách ID khỏi vị trí, cố định seed và so số mẫu thực với diện tích của từng nhóm mặt.",
      order: 3,
      estimatedMinutes: 55,
      demoId,
    },
    {
      id: "p42-l04",
      slug: "04-ghep-diem-random-va-spatial",
      title: "Ghép điểm thế nào để chuyển động bớt rối?",
      summary: "So random permutation với stable spatial order trên cùng bộ nguồn/đích.",
      order: 4,
      estimatedMinutes: 75,
      demoId,
    },
    {
      id: "p42-l05",
      slug: "05-model-time-easing-va-duong-cong",
      title: "Điều khiển nhịp và đường đi bằng model time",
      summary:
        "Viết Play/Pause, scrub, reverse và loop; thêm smoothstep cùng vòng cung giữ đúng endpoints.",
      order: 5,
      estimatedMinutes: 60,
      demoId,
    },
    {
      id: "p42-l06",
      slug: "06-bo-nho-va-buffer-gpu",
      title: "Đưa bộ mẫu lên GPU mà không mất bản đang xem",
      summary:
        "Preflight capability và bộ nhớ, tạo candidate buffers, rồi render trực tiếp từ SSBO.",
      order: 6,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p42-l07",
      slug: "07-compute-cap-nhat-tung-id",
      title: "Cho compute shader cập nhật từng ID",
      summary:
        "Đưa đúng phép morph lên GPU, đặt tail guard và barrier cho vertex shader đọc CURRENT.",
      order: 7,
      estimatedMinutes: 65,
      demoId,
    },
    {
      id: "p42-l08",
      slug: "08-chuan-bi-theo-batch-va-huy",
      title: "Đổi cấu hình mà không làm cửa sổ đứng lại",
      summary:
        "Chia sampling, sort và upload thành batch; đổi generation chỉ sau khi candidate đã đủ.",
      order: 8,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p42-l09",
      slug: "09-doc-duong-di-va-do-chi-phi",
      title: "Đọc đường đi và đo đúng công việc",
      summary: "Vẽ một subset đường đi, đọc histogram và lấy GPU timings không chặn frame.",
      order: 9,
      estimatedMinutes: 65,
      demoId,
    },
    {
      id: "p42-l10",
      slug: "10-studio-mot-trieu-hat",
      title: "Hoàn thiện studio một triệu hạt",
      summary: "Ghép các chế độ, kiểm toàn buffer trên GPU thật và bàn giao source C++ độc lập.",
      order: 10,
      estimatedMinutes: 80,
      demoId,
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
