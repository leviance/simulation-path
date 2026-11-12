import type { PublishedProjectEditorial } from "../../types";
const demoId = "mandelbulb-explorer";
const project = {
  summary:
    "Từ một phép lặp, dựng khối Mandelbulb có ánh sáng rồi orbit và tiến camera vào các nếp nhỏ. Tự viết DE, đọc heatmap công việc và tính ảnh 960×540 theo tile mà không trộn hai góc nhìn.",
  duration: "11–14 giờ, chưa tính setup và build lần đầu",
  prerequisites: [
    "Vector 3D, camera và ray marching của Project 36. Gói cấp đủ khung SDL3/OpenGL, không cần ghép source từ project trước.",
    "Đã dùng compute shader, SSBO, barrier và GPU query ở nhánh OpenGL; từng lời gọi được nối lại trong source của học phần.",
    "C++20, CMake 3.24+, SDL 3.4.8 và driver OpenGL 4.3 Core; OpenGL 4.1 trên macOS không đủ cho compute của bản native.",
  ],
  objectives: [
    "Hiện một lát cắt từ spherical-power recurrence rồi chuyển cách hỏi field sang các ray camera 3D.",
    "Tự viết derivative/DE, guard số học, normal sai phân và ánh sáng; phân biệt estimator với exact SDF.",
    "Tách preview và final 960×540, giữ snapshot/generation, Pause/Cancel và giới hạn work cho từng batch.",
    "Kiểm orbit và ray bằng evaluator độc lập, đọc lại toàn ảnh và đếm công việc thực tế thay vì tin một ảnh đẹp.",
  ],
  challenge: {
    timebox: "90–120 phút cho phiên bản đầu, chưa phải toàn bộ sản phẩm",
    mission:
      "Tự xây một trình khám phá fractal Mandelbulb 3D. Hãy bắt đầu bằng một hình nhỏ đổi được power; sau đó cho camera orbit, pan và tiến gần, dùng ánh sáng để đọc những nếp gấp thay vì chỉ xem một lát cắt phẳng.",
    outcome:
      "Ứng dụng C++/SDL3/OpenGL có preset power 8 và cấu hình khác, ảnh sạch để quan sát, heatmap ray/orbit work và ảnh đủ 960×540 được tính từ field thật. Đổi camera hoặc model giữa chừng phải hủy ảnh lỗi thời mà cửa sổ vẫn nhận input.",
    requirements: [
      "Đổi power, bailout, iteration, quality và palette tạo kết quả thấy được; có reset đúng preset và camera bằng chuột/bàn phím.",
      "Nhận ra thể tích và các nếp/nhánh bằng normals, lighting và depth; không dùng texture zoom hoặc mesh fractal có sẵn.",
      "Khi thao tác hiện preview có nhãn; khi dừng hoàn thiện ít nhất 960×540 thật, không chỉ phóng lớn preview.",
      "Pause dừng refinement nhưng không khóa camera; Cancel/Restart và yêu cầu mới không trộn tile của hai generation.",
      "Bật heatmap ray steps, tổng orbit bodies và stop state; tách elapsed GPU query khỏi thời gian submit CPU.",
    ],
    constraints: [
      "Tự viết recurrence, spherical power, DE, march, normals và quality controller; scaffold chỉ cấp window/GL loader/panel/presentation.",
      "DE không phải exact SDF. Công bố epsilon, safety, bounds, precision và ray/orbit budgets; không hứa zoom vô hạn hay FPS chung.",
      "Native khóa SDL 3.4.8, C++20/CMake 3.24+, OpenGL 4.3; preflight capability/bytes, batch dưới bốn triệu orbit bodies, không chữa bằng glFinish.",
      "Canvas 2D chỉ minh họa CPU 32×18→96×54, tối đa 12 orbit iterations/96 ray steps; không thay quy mô hoặc bằng chứng GPU.",
    ],
    definitionOfDone: [
      "Orbit ở gốc, gần trục và các điểm trong/ngoài ổn định được đối chiếu evaluator CPU độc lập qua nhiều power/bailout; NaN/Inf có state rõ.",
      "Các ray/silhouette chuẩn được so uniform scanner độc lập trên cùng epsilon shell; công bố sai số t và feature nhỏ hơn bước oracle chưa được bảo đảm.",
      "Mọi pixel ảnh 960×540 có đúng generation/sample count; work readback khớp atomics, các buffer có canary và không ghi vượt mép tile.",
      "Preview/final/cancel giữ nhãn ACTIVE đúng, input phản hồi giữa batch; camera inside được báo riêng, không fake hit t=0.",
      "Starter, chín checkpoint, final và tests build ở Debug/Release; ZIP độc lập có CMake, README, source/shader đầy đủ và giới hạn phần cứng rõ.",
    ],
  },
  lessons: [
    {
      id: "p43-l01",
      slug: "01-hinh-dau-tien-tu-phep-lap",
      title: "Nhìn thấy hình trước, rồi tìm hiểu phép lặp",
      summary: "Từ scaffold đang chạy, viết spherical power và hỏi field tại một lát cắt 3D.",
      order: 1,
      estimatedMinutes: 80,
      demoId,
    },
    {
      id: "p43-l02",
      slug: "02-tu-mat-cat-den-ray-3d",
      title: "Từ lát cắt tới một khối hình học 3D",
      summary: "Dựng ray camera, cắt đoạn sphere và dùng bước đều để nhìn ra vấn đề cần giải.",
      order: 2,
      estimatedMinutes: 75,
      demoId,
    },
    {
      id: "p43-l03",
      slug: "03-uoc-luong-khoang-cach",
      title: "Chọn bước ray từ ước lượng khoảng cách",
      summary: "Thêm derivative/DE, epsilon shell, safety và các lý do dừng riêng.",
      order: 3,
      estimatedMinutes: 85,
      demoId,
    },
    {
      id: "p43-l04",
      slug: "04-normal-va-anh-sang",
      title: "Dùng ánh sáng để nhìn rõ những nếp gấp",
      summary: "Lấy normal bằng sáu probe, xử lý gradient phẳng và nối lighting sau trace.",
      order: 4,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p43-l05",
      slug: "05-camera-kham-pha",
      title: "Đổi góc nhìn và tiến vào những vùng chi tiết",
      summary: "Nối mouse/keyboard vào orbit, pan, dolly và chính sách camera inside.",
      order: 5,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p43-l06",
      slug: "06-doc-chi-phi-va-doi-chieu",
      title: "Ảnh nhìn hợp lý chưa đủ: đọc work và đối chiếu kết quả",
      summary:
        "Đếm ray/orbit work thực, chạy probe GLSL và evaluator độc lập, đo elapsed GPU đúng cách.",
      order: 6,
      estimatedMinutes: 90,
      demoId,
    },
    {
      id: "p43-l07",
      slug: "07-preview-va-anh-tinh-dan",
      title: "Tính đủ ảnh mà vẫn điều khiển được camera",
      summary:
        "Preview ping-pong, final tiles và generation; Pause/Cancel không làm ảnh bị ghép sai.",
      order: 7,
      estimatedMinutes: 95,
      demoId,
    },
    {
      id: "p43-l08",
      slug: "08-mau-sac-bong-va-khu-rang-cua",
      title: "Thêm độ sâu và giảm răng cưa, không che giới hạn của renderer",
      summary: "Orbit-trap palette, AO/shadow hữu hạn và bốn ray subpixel tích lũy màu tuyến tính.",
      order: 8,
      estimatedMinutes: 85,
      demoId,
    },
    {
      id: "p43-l09",
      slug: "09-hoan-thien-mandelbulb-explorer",
      title: "Hoàn thiện Mandelbulb Explorer và kiểm đúng phần đã làm",
      summary: "Đọc toàn buffer, đối chiếu ray chậm, xuất đủ ảnh và bàn giao source C++ độc lập.",
      order: 9,
      estimatedMinutes: 90,
      demoId,
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
