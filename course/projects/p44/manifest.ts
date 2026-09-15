import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Giữ nguyên mô hình Molecular Dynamics tuần hoàn của Project 43 nhưng không tìm lại mọi cặp ở mỗi bước. Bạn sẽ xây neighbor list có vùng đệm, biết khi nào danh sách còn dùng được, dùng cell grid để dựng nhanh hơn và đối chiếu với vòng lặp mọi cặp để chắc rằng tối ưu không làm đổi lực.",
  duration: "17–21 giờ",
  prerequisites: [
    "Project 43 — minimum image, force-shifted Lennard–Jones, unwrapped và Velocity Verlet trong hộp tuần hoàn",
    "Project 28 — chia không gian thành cell grid để tìm hạt gần",
    "Project 41–42 — lực cặp, reduced units và kiểm chứng năng lượng/động lượng",
  ],
  objectives: [
    "Tách force cutoff khỏi bán kính tìm cặp cutoff+skin; lưu mỗi cặp i<j đúng một lần.",
    "Suy ra quy tắc nửa skin và kiểm tra bằng unwrapped trước mỗi lần tính lực.",
    "Dựng danh sách bằng cell grid tuần hoàn, không đếm trùng ô hay cặp qua biên.",
    "Ghép cache vào Velocity Verlet với rollback cả state và danh sách khi bước không hợp lệ.",
    "Tìm cặp bị bỏ sót bằng đối chứng mọi cặp và so sánh tổng chi phí trên ca đo hữu hạn.",
  ],
  challenge: {
    timebox: "2–3 giờ để tự thử trước khi đọc lời giải",
    mission:
      "Tự xây dựng một mô phỏng Molecular Dynamics 2D trong hộp tuần hoàn, trong đó lực vẫn giống bản quét mọi cặp nhưng danh sách các cặp có thể tương tác được giữ lại qua nhiều bước. Trên màn hình, hãy chọn một hạt A, vẽ hai vòng bán kính cutoff và cutoff+skin, rồi cho người dùng thấy lúc nào danh sách phải được dựng lại.",
    outcome:
      "Một Neighbor List Lab với preset 64, 144, 1.000 hạt và một ca hai hạt để tìm lỗi. Có bộ đếm dựng danh sách, số cặp, độ dời lớn nhất, đối chiếu lực và bảng so sánh skin. Bản C++/SDL3 chạy độc lập; Canvas dùng cùng công thức để học và thử nghiệm.",
    requirements: [
      "Bắt đầu bằng hệ hạt đứng yên cùng vòng cutoff trong cửa sổ SDL3; giải thích phần được giữ lại từ Project 43 trước khi thêm cache.",
      "Dùng minimum image cho mọi phép đo khoảng cách. Chỉ lưu i<j trong bán kính listRadius=cutoff+skin.",
      "Mỗi lần tính lực phải đo lại khoảng cách và lọc cutoff; các cặp trong lớp skin không được tạo lực.",
      "Lưu mốc unwrapped khi dựng. Nếu hạt bất kỳ dời ít nhất skin/2, phải dựng lại trước lần tính lực kế tiếp.",
      "Đổi count, thứ tự hạt, hộp, cutoff hoặc skin phải vô hiệu hóa cache. Có generation cho thao tác thay danh tính/thứ tự hạt.",
      "Có naive builder để đối chiếu và cell-grid builder với ô rộng ít nhất listRadius; xử lý ô lặp sau wrap.",
      "Velocity Verlet kiểm danh sách cả trước lực đầu bước lẫn sau drift, trước lực cuối bước. Bước lỗi không làm đổi system hoặc list.",
      "Cố ý giữ danh sách cũ trong ca kéo hai hạt, báo cặp bị bỏ sót và sai số force/U; không cho solver chạy trong chế độ này.",
      "Đếm riêng build checks và force checks trên cùng seed, count, dt, số bước. Có pause, reset và giới hạn công việc mỗi frame.",
      "Cung cấp starter, chín checkpoint chạy độc lập, final có chú thích, tests, hướng dẫn build và ZIP.",
    ],
    constraints: [
      "Chỉ xét hộp chữ nhật cố định, tối đa 1.000 hạt; chưa có GPU, MPI, Verlet list nhiều tầng hay hộp biến dạng.",
      "Giữ force-shifted LJ từ Project 43. Lab yêu cầu skin>0 và cutoff+skin nhỏ hơn nửa cạnh ngắn nhất để đơn giản hóa hình học; đây không phải giới hạn chung cho mọi neighbor-list implementation.",
      "Không chỉ rebuild theo một số frame cố định; không dùng position đã wrap để đo độ dời từ mốc.",
      "Không gọi audit mọi cặp trong từng frame để rồi gọi đó là tối ưu. Audit chạy theo yêu cầu hoặc trong test hữu hạn.",
      "Bản học dùng sao chép candidate và sắp xếp cặp để dễ kiểm chứng. Chưa tuyên bố tối ưu thời gian hay bộ nhớ như thư viện MD chuyên dụng.",
    ],
    definitionOfDone: [
      "Grid và naive cho cùng tập cặp, không trùng cặp ở góc hộp hay khi một trục chỉ có hai cell.",
      "Cặp nằm giữa cutoff và cutoff+skin có trong list nhưng force/U bằng zero.",
      "Dịch dưới skin/2 giữ cache; chạm ngưỡng, vượt nhiều vòng hộp hoặc thay cấu hình đều được phát hiện.",
      "Ca A.x=3, B.x=6.2, cutoff=2.5, skin=0.4: dịch A thêm 0.8 khi đóng băng list gây thiếu đúng một cặp; rebuild sửa được.",
      "Bước drift đi qua ngưỡng vẫn cho lực cuối bước đúng; bước tạo overlap bị từ chối và rollback cả cache/counters.",
      "Ca chuẩn 36 hạt × 200 bước dt=0.002 khớp lực, U, q và v với all-pairs trong sai số 1e-8; sai số năng lượng chuẩn hóa dưới 1%, sai số động lượng dưới 1e-9.",
      "Bảng công việc 64 hạt × 200 bước tính đủ build+force và có thể lặp lại. Không suy ra speedup thời gian chỉ từ số cặp.",
      "Build được starter, chín checkpoint, final; tests thực thi cả Debug và Release với timeout.",
    ],
  },
  lessons: [
    {
      id: "p44-l01",
      slug: "01-ve-he-hat-va-vung-tuong-tac",
      title: "Vẽ hệ hạt và nhìn rõ phạm vi tương tác",
      summary:
        "Dựng lại hệ khí đứng yên từ Project 43, vẽ cutoff quanh A và đếm công việc của vòng lặp mọi cặp.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l02",
      slug: "02-luu-cac-cap-trong-vung-dem",
      title: "Lưu những cặp có thể sắp tương tác",
      summary: "Tạo half neighbor list bằng i<j và lưu cả các cặp trong lớp đệm ngoài cutoff.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l03",
      slug: "03-tinh-luc-tu-danh-sach",
      title: "Tính lực từ danh sách mà không đổi mô hình",
      summary:
        "Lọc lại force cutoff ở mỗi lần tính lực, giữ lực đối nhau và thế năng chỉ cộng một lần.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l04",
      slug: "04-khi-nao-can-dung-lai",
      title: "Khi nào danh sách bắt đầu không còn đáng tin?",
      summary:
        "Suy ra quy tắc nửa skin, đo displacement bằng unwrapped và hủy cache khi cấu hình thay đổi.",
      order: 4,
      estimatedMinutes: 145,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l05",
      slug: "05-dung-danh-sach-bang-cell-grid",
      title: "Dùng cell grid để dựng danh sách",
      summary:
        "Thay vòng lặp mọi cặp bằng grid tuần hoàn, xử lý ô lặp ở biên và đối chiếu tập cặp.",
      order: 5,
      estimatedMinutes: 150,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l06",
      slug: "06-verlet-voi-danh-sach-tai-su-dung",
      title: "Ghép neighbor list vào Velocity Verlet",
      summary:
        "Kiểm tra cache trước cả hai lần tính lực và chỉ nhận bước mới khi hệ lẫn danh sách đều hợp lệ.",
      order: 6,
      estimatedMinutes: 150,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l07",
      slug: "07-bat-loi-danh-sach-cu",
      title: "Cố ý dùng danh sách cũ để tìm lỗi",
      summary:
        "Đưa hai hạt từ ngoài listRadius vào cutoff, đếm cặp bị bỏ sót và so lực với mọi cặp.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l08",
      slug: "08-so-sanh-chi-phi-va-chon-skin",
      title: "So sánh chi phí và chọn skin có căn cứ",
      summary:
        "Đếm cả việc dựng danh sách lẫn duyệt lực trên cùng dữ liệu và số bước, không đánh đồng số phép kiểm với thời gian.",
      order: 8,
      estimatedMinutes: 100,
      demoId: "neighbor-list-skin",
    },
    {
      id: "p44-l09",
      slug: "09-kiem-chung-va-ma-hoan-chinh",
      title: "Kiểm chứng và chạy dự án hoàn chỉnh",
      summary:
        "Đối chiếu quỹ đạo, thử ca biên, build các checkpoint và tải source C++ có thể chạy độc lập.",
      order: 9,
      estimatedMinutes: 140,
      demoId: "neighbor-list-skin",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
