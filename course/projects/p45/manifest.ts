import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Ghép phần OpenGL compute ở Project 37–40 với mô hình Molecular Dynamics ở Project 41–44. Bạn sẽ đi từ 64 hạt để kiểm chứng tới các preset 100.000–5 triệu hạt, giữ dữ liệu trên GPU, chia nhỏ công việc và từ chối chạy khi vượt giới hạn. Mục tiêu lớn không đồng nghĩa với cam kết realtime trên mọi máy.",
  duration: "22–27 giờ",
  prerequisites: [
    "Project 38 — OpenGL 4.3 compute, SSBO và vẽ hạt trực tiếp từ GPU",
    "Project 39–40 — reduction, cell grid và kiểm chứng CPU/GPU",
    "Project 41–44 — force-shifted Lennard–Jones, hộp tuần hoàn, Velocity Verlet và skin",
  ],
  objectives: [
    "Dựng sản phẩm có hình trước khi chuyển từng phần tính toán sang compute shader.",
    "Tách position/velocity/force thành các SSBO có layout rõ ràng, dùng hai bank để bảo vệ state đã nhận.",
    "Tính force-shifted LJ theo mô hình mỗi invocation sở hữu một hạt, đối chiếu với CPU.",
    "Dựng fixed-capacity cell grid, phát hiện overflow và tái sử dụng theo quy tắc nửa skin.",
    "Theo dõi K/U/P bằng GPU reduction; phân biệt memory barrier, fence và kết quả đã được nhận.",
    "Ước tính bộ nhớ, giới hạn dispatch và đo ca hữu hạn trước khi tăng số hạt.",
  ],
  challenge: {
    timebox: "3–4 giờ để tự thử với 64 hạt trước khi đọc hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng Molecular Dynamics 2D trong hộp tuần hoàn bằng C++/SDL3 và OpenGL compute. Trước tiên hãy vẽ 64 hạt đứng yên, sau đó cho chúng chuyển động nhờ lực Lennard–Jones. Khi bản nhỏ khớp kết quả CPU, thêm grid và các giới hạn để người dùng có thể chủ động tăng số hạt.",
    outcome:
      "Một Molecular Lab GPU có hai bank dữ liệu, điều khiển chạy/dừng/từng bước, pan/zoom, bộ đếm dựng grid và số đo năng lượng/động lượng. Có các preset 64, 100.000, 500.000, 1 triệu, 5 triệu hạt; preset không phù hợp phải bị từ chối với lý do cụ thể.",
    requirements: [
      "Bắt đầu ở 64 hạt và tạm dừng; không tự chạy preset lớn lúc mở ứng dụng hoặc chạy test.",
      "Giữ reduced units m=epsilon=sigma=1, cutoff=2.5, skin=0.4, dt=0.001 và minimum image.",
      "GPU khởi tạo, tính lực, tích phân và reduction; renderer đọc trực tiếp SSBO, không chép toàn bộ position về CPU mỗi frame.",
      "Mỗi invocation chỉ ghi lực của hạt i; mỗi cặp được duyệt hai lần nên thế năng mỗi bên là U/2.",
      "Mỗi ô giữ tối đa 16 ID; phát hiện overflow trước Force và từ chối bước, không nhận lực đã cắt bớt.",
      "Tái sử dụng grid theo mốc reference và độ dời chưa wrap. Kiểm skin sau Drift, trước Force.",
      "Chỉ đổi bank sau bước hợp lệ. Nếu hủy hoặc lỗi, giữ bank vật lý cũ và vô hiệu hóa cache cần dựng lại.",
      "Có giới hạn bộ nhớ resident/peak, giới hạn kích thước SSBO và tối đa một dispatch đang bay.",
      "Có oracle nhỏ, kiểm reduction, quỹ đạo và benchmark tối đa 1 warm-up + 5 mẫu / 20 giây.",
      "Cung cấp starter, mười checkpoint, final, shader, tests, hướng dẫn build và ZIP.",
    ],
    constraints: [
      "OpenGL 4.3 core; macOS OpenGL 4.1 không chạy được bản compute này. Canvas không thay thế driver GPU.",
      "Đây là bản MD 2D một loại hạt, hộp cố định, chưa có thermostat, MPI, nhiều loại nguyên tử hoặc chuẩn hóa mô hình vật liệu thật.",
      "Grid dùng bucket có sức chứa cố định để giới hạn vòng lặp. Đây không phải danh sách cặp i<j của Project 44 hoặc CSR ở Project 40.",
      "Chỉ vẽ tối đa 100.000 marker lấy mẫu theo stride; N mô phỏng và N hiển thị phải được phân biệt.",
      "Mục tiêu 5 triệu có thể bị từ chối hoặc chạy chậm. Giới hạn dung lượng GL không cho biết lượng VRAM còn trống.",
      "Timeout ngăn việc gửi thêm lệnh; không thể ngắt một kernel đã chạy trong driver. Không tự kiểm thử các preset lớn.",
    ],
    definitionOfDone: [
      "CPU tests chạy hữu hạn cả Debug và Release; kiểm layout, budget, tail, cutoff, grid permutation, overflow và stencil với skin.",
      "GPU verification ở 64 và 257 hạt đối chiếu lực/U, một bước Verlet và reduction với CPU; không yêu cầu bitwise equality.",
      "Không chờ fence bằng vòng lặp bận; không dùng glFinish để đo; chỉ đọc kết quả nhỏ sau fence.",
      "Drift lỗi, overflow, hủy bước không đổi bank vật lý đang hiển thị.",
      "Bật/tắt cache vẫn giữ lực đúng; grid rebuild trước Force khi displacement chạm skin/2.",
      "Tăng N qua kiểm tra dung lượng và peak replacement; lỗi allocation không xóa storage đang có.",
      "Benchmark báo riêng tổng GPU dispatch time và wall time, loại warm-up, không báo kết quả khi chưa đủ mẫu.",
      "Build starter/mười checkpoint/final và mở được toàn bộ bài học, Canvas và source hoàn chỉnh.",
    ],
  },
  lessons: [
    {
      id: "p45-l01",
      slug: "01-dung-cua-so-va-he-hat",
      title: "Dựng cửa sổ và nhìn thấy hệ hạt trước",
      summary:
        "Tạo cửa sổ OpenGL, đặt 64 hạt đứng yên và phân biệt preview với dữ liệu tính trên GPU.",
      order: 1,
      estimatedMinutes: 90,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l02",
      slug: "02-du-lieu-va-khoi-tao-tren-gpu",
      title: "Đặt dữ liệu lên GPU và khởi tạo hạt",
      summary:
        "Tách các SSBO vec4, ước tính dung lượng và cho compute shader tạo position/velocity bằng seed cố định.",
      order: 2,
      estimatedMinutes: 125,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l03",
      slug: "03-ve-truc-tiep-tu-ssbo",
      title: "Vẽ hạt trực tiếp từ SSBO",
      summary:
        "Vertex shader đọc bank đã hoàn tất; thêm pan, cursor-anchored zoom và giới hạn số marker được vẽ.",
      order: 3,
      estimatedMinutes: 105,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l04",
      slug: "04-tinh-luc-va-doi-chieu-cpu",
      title: "Tính lực trên GPU, bắt đầu từ ca nhỏ",
      summary:
        "Mỗi invocation tự cộng lực cho một hạt, giữ U/2 và đối chiếu force-shifted LJ với oracle CPU.",
      order: 4,
      estimatedMinutes: 140,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l05",
      slug: "05-dung-grid-va-giam-so-cap",
      title: "Dựng grid trên GPU để giảm số cặp",
      summary:
        "Atomic append vào bucket 16 slot, kiểm overflow rồi tìm hạt trong stencil tuần hoàn quanh mốc dựng.",
      order: 5,
      estimatedMinutes: 150,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l06",
      slug: "06-ghep-velocity-verlet",
      title: "Cho hệ chuyển động bằng Velocity Verlet",
      summary:
        "Drift ghi bank ứng viên, dựng grid rồi tính lực mới, kick và chỉ nhận bước hoàn tất.",
      order: 6,
      estimatedMinutes: 150,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l07",
      slug: "07-tai-su-dung-grid-voi-skin",
      title: "Tái sử dụng grid mà không bỏ sót lực",
      summary:
        "Theo dõi displacement trên GPU, kiểm nửa skin sau drift và truy vấn quanh vị trí reference.",
      order: 7,
      estimatedMinutes: 135,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l08",
      slug: "08-do-nang-luong-va-dong-luong",
      title: "Đo năng lượng và động lượng trên GPU",
      summary:
        "Reduction phân tầng biến hàng triệu giá trị thành bốn số; từ chối bước có dữ liệu không hữu hạn.",
      order: 8,
      estimatedMinutes: 125,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l09",
      slug: "09-tang-so-hat-co-gioi-han",
      title: "Tăng số hạt có kiểm soát",
      summary:
        "Kiểm SSBO, bộ nhớ resident/peak, chia dispatch và cho phép chọn 100.000 tới mục tiêu 5 triệu hạt.",
      order: 9,
      estimatedMinutes: 140,
      demoId: "molecular-lab-gpu",
    },
    {
      id: "p45-l10",
      slug: "10-kiem-chung-do-va-hoan-thien",
      title: "Kiểm chứng, đo chi phí và chạy bản hoàn chỉnh",
      summary:
        "Chạy oracle ở 64/257 hạt, kiểm quỹ đạo/reduction, đo hữu hạn và tải toàn bộ source có thể build.",
      order: 10,
      estimatedMinutes: 150,
      demoId: "molecular-lab-gpu",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
