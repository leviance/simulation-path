import type { PublishedProjectEditorial } from "../../types";

const demoId = "atomic-playground";
const project = {
  summary:
    "Tự xây một phòng quan sát orbital 3D: đổi preset để thấy các thùy và vùng nút, đưa camera vào trong đám mây, kéo mặt cắt rồi đo nơi các mẫu tập trung. Hàm mật độ hydrogen được cung cấp; bạn viết bộ lấy mẫu có trọng số, sinh một triệu vị trí trên GPU và kiểm phân bố thay vì chỉ làm một hình ảnh đẹp.",
  duration: "21–28 giờ, chưa tính setup và build lần đầu",
  prerequisites: [
    "Đã dùng vector 3D, camera và OpenGL từ nhánh đồ họa. Gói có sẵn window, GL loader và phần khung trình bày; không cần ghép source của nhiều project mới chạy được.",
    "Biết SSBO, compute dispatch và barrier. Kiến thức prefix scan hữu ích, nhưng PDF/CDF, seed và cách kiểm phân bố được giải thích ngay trong học phần.",
    "C++20, CMake 3.24+, SDL 3.4.8 và driver OpenGL 4.3 Core. Không yêu cầu tự giải Schrödinger, suy spherical harmonics, energy levels hoặc spin.",
  ],
  objectives: [
    "Đọc density function được cung cấp, phân biệt mật độ trong không gian với độ sáng của ảnh và số điểm đang vẽ.",
    "Tính trọng số theo thể tích, chuẩn hóa PDF/CDF rồi lấy mẫu tái lập từ seed, có đối chứng độc lập và sai số công bố rõ.",
    "Sinh ít nhất một triệu vị trí hợp lệ bằng compute shader; renderer đọc trực tiếp buffer GPU, không nhận sẵn một triệu vị trí do CPU tạo.",
    "Giữ UI/camera phản hồi trong lúc sinh dữ liệu; dùng candidate và last-good để hủy hoặc từ chối workload không đủ budget.",
    "Cắt lớp, đo một vùng, đọc histogram và so hai orbital ở cùng thang để tìm lỗi sampling hoặc transfer function.",
    "Lưu cấu hình/seed nhỏ, reset có thể tái lập và đo riêng evaluate/sample/draw/probe theo quy trình có giới hạn thời gian.",
  ],
  challenge: {
    timebox:
      "90–120 phút cho bản thử đầu với một cloud nhỏ; chưa cần hoàn thành toàn bộ playground",
    mission:
      "Tự xây một Atomic Playground có thể thao tác trong không gian 3D. Người dùng chọn 1s, 2s hoặc một orbital có thùy, dịch mặt cắt để nhìn vào trong rồi đặt một vùng đo. Hãy giúp họ trả lời: hình vừa đổi vì phân bố mẫu thay đổi, hay chỉ vì camera và cách tô sáng?",
    outcome:
      "Ứng dụng C++/SDL3/OpenGL độc lập có cloud chính ít nhất một triệu mẫu vị trí hợp lệ do GPU sinh. Catalog có 1s/2s, real 2p theo ba hướng và đại diện 3d/4f; có clipping, region probe, histogram/reference, comparison cùng thang và cấu hình tái lập. Một điểm không phải một electron riêng; đây không phải nhiều nguyên tử tương tác.",
    requirements: [
      "Đổi orbital phải đổi đúng dữ liệu cloud; nhãn chỉ chuyển sang cấu hình mới khi candidate đã hoàn chỉnh và được nhận.",
      "Cho chọn N/seed, orbit/pan/zoom, density palette, opacity và point size; có chế độ khám phá sạch lẫn chế độ debug/performance.",
      "Dịch mặt cắt và đặt vùng đo, hiển thị số mẫu cùng tỷ lệ trên toàn cloud; clipping không được chuẩn hóa lại phần đang nhìn thành xác suất toàn hệ.",
      "So hai preset ở cùng đơn vị a₀ và cùng thang camera, hoặc ghi rõ auto-fit; mỗi pane nêu N và budget riêng.",
      "Generation có batch/progress/cancel và last-good; từ chối thiếu budget/NaN/thiếu mẫu, không điền điểm trùng tại gốc để giả đủ count.",
      "Lưu/mở cấu hình nhỏ có seed, reset tái lập; công bố requested/generated/accepted/drawn, tail, table resolution, memory và timings.",
      "Có sandbox hữu hạn lấy radius hoặc angle đều để quan sát sampling sai; không dùng nó thay bản lấy mẫu đúng để nghiệm thu.",
    ],
    constraints: [
      "Hàm mật độ và catalog được cung cấp có nguồn/fixture. Người học tự viết normalize, sampler/RNG, pipeline GPU, lifecycle, renderer, measurement và UI integration, không phải tự suy lý thuyết nguyên tử.",
      "Mô hình chuẩn là hydrogen một electron. Mỗi điểm là một mẫu vị trí theo density; một triệu điểm không có nghĩa một triệu electron hoặc nhiều nguyên tử.",
      "Mật độ tính theo đơn vị a₀; công bố R_max, phần tail bị bỏ và approximation của bảng. Nếu đổi tọa độ, phải giữ đúng phần tử thể tích.",
      "CPU reference và bảng nhỏ khi cấu hình đổi được phép; mọi vị trí của cloud chính phải được sinh trên GPU. Không gọi upload một dataset CPU là GPU sampling.",
      "Dữ liệu điểm đã mã hóa mật độ. Mọi density boost/opacity/tone mapping phải có legend; screenshot không phải phép đo xác suất tuyến tính.",
      "Không thêm LJ/Newton/Coulomb giữa các mẫu, không giả quỹ đạo hoặc chuyển mức vật lý. Nếu có fade/morph, chỉ nhận là chuyển hình đồ họa.",
      "C++20, SDL 3.4.8, CMake 3.24+, OpenGL 4.3; kiểm capability/budget trước allocation và chia việc thành batch có deadline. Canvas CPU nhỏ chỉ hỗ trợ học, không thay mốc một triệu GPU.",
    ],
    definitionOfDone: [
      "Density 1s/2s/2p có closed-form/fixture độc lập; node và đối xứng cơ bản đúng, 3d/4f không chỉ đổi màu cùng một cloud.",
      "Sampler qua uniform-volume và field có tích phân biết trước; histogram/region ở nhiều seed khớp reference trong uncertainty, table error và tail error được tách riêng.",
      "Ít nhất một triệu mẫu hợp lệ thật được sinh/vẽ trên GPU. Có kiểm N lẻ, counters/bounds/memory/timings; năm triệu chỉ được nhận là đã kiểm khi có bằng chứng riêng.",
      "Camera/clipping/brightness không sửa density hoặc sinh lại cloud vô ích; selector/comparison/probe làm việc trên dữ liệu đúng cấu hình.",
      "Cancel/reset/lỗi giữ last-good có nhãn; save/load không nhận cấu hình sai hoặc làm mất cloud đang có.",
      "Native có chiều sâu, thùy/node đọc được, camera/controls/keyboard/pointer và reduced-motion được kiểm đúng phạm vi; không lấy ảnh hoặc Canvas thay mọi bằng chứng sử dụng.",
      "Starter, 11 checkpoint, final và ZIP cùng phiên bản, build/CTest Debug/Release; mọi verifier/benchmark hữu hạn, không tắt assertion để đổi lấy test xanh.",
    ],
  },
  lessons: [
    {
      id: "p45-l01",
      slug: "01-doc-field-orbital",
      title: "Nhìn một orbital trước khi lấy mẫu",
      summary:
        "Đọc density được cung cấp và hiện một field có thùy trong khung 3D; chưa gọi preview lattice là cloud lấy mẫu.",
      order: 1,
      estimatedMinutes: 80,
      demoId,
    },
    {
      id: "p45-l02",
      slug: "02-trong-so-theo-the-tich",
      title: "Mỗi vùng không gian cần bao nhiêu trọng số?",
      summary:
        "Tách density khỏi xác suất trong một vùng, đưa phần tử thể tích vào bảng radial và angular.",
      order: 2,
      estimatedMinutes: 100,
      demoId,
    },
    {
      id: "p45-l03",
      slug: "03-cdf-va-seed",
      title: "Từ một số ngẫu nhiên tới một vị trí có trọng số",
      summary:
        "Chuẩn hóa CDF, tìm bin, giữ seed theo sample ID và kiểm cloud CPU nhỏ bằng histogram.",
      order: 3,
      estimatedMinutes: 110,
      demoId,
    },
    {
      id: "p45-l04",
      slug: "04-lay-mau-tren-gpu",
      title: "Chuyển phép lấy mẫu lên compute shader",
      summary:
        "Để GPU đọc bảng nhỏ, chọn tọa độ và ghi vị trí/mật độ vào record; không upload cloud CPU để đổi nhãn.",
      order: 4,
      estimatedMinutes: 120,
      demoId,
    },
    {
      id: "p45-l05",
      slug: "05-mot-trieu-mau-theo-batch",
      title: "Sinh một triệu mẫu mà vẫn thao tác được",
      summary:
        "Chia dispatch, theo dõi tiến độ và chỉ công bố candidate hoàn chỉnh; hủy/lỗi vẫn giữ last-good.",
      order: 5,
      estimatedMinutes: 130,
      demoId,
    },
    {
      id: "p45-l06",
      slug: "06-splat-va-do-sang",
      title: "Vẽ nhiều điểm mà không làm mất các vùng nút",
      summary:
        "Tổ chức point splat, độ sâu và transfer function; phân biệt màu/độ sáng với xác suất.",
      order: 6,
      estimatedMinutes: 100,
      demoId,
    },
    {
      id: "p45-l07",
      slug: "07-camera-va-mat-cat",
      title: "Đi vào cloud và kéo mặt cắt",
      summary:
        "Tách camera/clip khỏi generation, giữ pointer owner và đọc tọa độ trong cùng đơn vị a₀.",
      order: 7,
      estimatedMinutes: 100,
      demoId,
    },
    {
      id: "p45-l08",
      slug: "08-do-vung-va-histogram",
      title: "Đo phân bố thay vì đoán từ ảnh",
      summary:
        "Đếm mẫu trong vùng, đọc histogram/reference và đặt uncertainty cạnh kết quả ở nhiều seed.",
      order: 8,
      estimatedMinutes: 130,
      demoId,
    },
    {
      id: "p45-l09",
      slug: "09-so-sanh-hai-orbital",
      title: "Đặt hai orbital cạnh nhau ở cùng thang",
      summary:
        "Giữ cấu hình riêng từng cloud, camera/đơn vị chung và tổng budget rõ ràng trong comparison.",
      order: 9,
      estimatedMinutes: 120,
      demoId,
    },
    {
      id: "p45-l10",
      slug: "10-luu-cau-hinh-va-reset",
      title: "Lưu điều kiện để mở lại đúng thí nghiệm",
      summary:
        "Lưu orbital/N/seed và các tham số quan sát, kiểm cấu hình trước khi áp dụng và reset có thể tái lập.",
      order: 10,
      estimatedMinutes: 90,
      demoId,
    },
    {
      id: "p45-l11",
      slug: "11-hoan-thien-atomic-playground",
      title: "Hoàn thiện playground và kiểm mốc một triệu",
      summary:
        "Ghép sản phẩm, kiểm density/sampling/lifecycle bằng oracle riêng và đo evaluate/sample/draw/probe hữu hạn.",
      order: 11,
      estimatedMinutes: 150,
      demoId,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
