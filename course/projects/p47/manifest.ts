import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Chấm một vùng nóng, cho tấm kim loại nguội dần rồi thử giữ nóng một điểm ở mép. Bạn tự viết solver nhiệt 2D, tìm giới hạn bước thời gian và xây một công cụ thí nghiệm 192×192 ô bằng C++/SDL3 — không phải hiệu ứng làm mờ ảnh.",
  duration: "14–19 giờ",
  prerequisites: [
    "Project 01–04: window/renderer, event loop, tọa độ và brush. Khung SDL được cung cấp, các chỗ nối input/vẽ được giải thích lại.",
    "Biết hàm, vòng lặp, std::vector, header và số thực. Sai phân, Laplacian và điều kiện ổn định được xây từ ví dụ ô lưới, không đòi hỏi học PDE từ trước.",
    "Project 46 giúp quen với grid và tách update/render nhưng không bắt buộc: ZIP Project 47 tự chứa toàn bộ source, không cần OpenGL hoặc GPU compute.",
    "Thời lượng gồm đọc, tự viết và thử nghiệm; không tính cài compiler/SDL hay xử lý lỗi môi trường build.",
  ],
  objectives: [
    "Tạo và vẽ trường nhiệt trước khi viết solver; tách giá trị theta khỏi màu hiển thị.",
    "Từ trao đổi ở hai mặt ô, xây sai phân 1D rồi stencil năm điểm cho 2D; dùng current/next đúng mức thời gian.",
    "Phân biệt tô nhiệt một lần, heater giữ nhiệt, biên cách nhiệt và vành lạnh; chỉ kiểm bảo toàn ở bài toán phù hợp.",
    "Suy ra rx+ry ≤ 0,5, dùng slider D/dt và quan sát một nghiệm thực sự mất ổn định mà không treo ứng dụng.",
    "Cập nhật/vẽ đủ 192×192 ô bằng streaming texture; đổi h trên cùng miền và đọc probe theo thời gian mô hình.",
    "Kiểm bằng oracle thông lượng độc lập, cosine mode và refinement; phân biệt sai số scheme, PDE và số thực với chi phí update/render.",
  ],
  challenge: {
    timebox: "Thử 90–120 phút trên lưới nhỏ; bản đầy đủ được xây qua các bài sau",
    mission:
      "Tự xây một ứng dụng dẫn nhiệt trên tấm kim loại 2D. Người dùng tô nóng/lạnh bằng chuột, cho chạy rồi so cách nhiệt lan khi đổi vật liệu, bước thời gian hoặc cách xử lý mép. Phải nhìn thấy hiện tượng và đọc được nhiệt độ thật, không chỉ xem ảnh đổi màu.",
    outcome:
      "Một công cụ C++20/SDL3 độc lập với trường nhiệt cuối 192×192 = 36.864 ô, bút vẽ, slider D/dt, hai kiểu biên, heater, cảnh mẫu, probe/đồ thị và view sạch. Lưới 32×32 ở bài đầu chỉ để học, không thay bản nghiệm thu tối thiểu 128×128.",
    requirements: [
      "Tô theta=0/1 bằng chuột trái/phải và bàn phím; bán kính 0–24 ô, nối nét nhưng không nối qua ngoài tấm. Pause vẫn cho vẽ và soi số liệu.",
      "Có chạy/dừng, tiến một bước, reset đúng cảnh đang chọn và xóa riêng. Đổi D/dt, biên hoặc độ phân giải phải dừng; resize window không tạo lại dữ liệu.",
      "Cho chọn biên cách nhiệt hoặc vành ngoài bị giữ lạnh; có bút heater giữ theta và thao tác bỏ heater mà không xóa phần nhiệt đã có.",
      "Có slider D và dt thực sự tác động lên phép tính. Mặc định D=1,5, dx=dy=0,5, dt=1/30 s mô hình; rx+ry=0,4.",
      "Chế độ thường chặn bước sai CFL; chế độ thí nghiệm cho phép phân kỳ thật. Báo min/max vượt 0–1, không clamp nghiệm để giấu bất ổn.",
      "Bản cuối cập nhật/vẽ mọi ô của lưới 192×192. Có thêm 128/256, cùng miền cách nhiệt 96×96; đổi độ phân giải đổi h, không âm thầm sửa dt.",
      "Có sáu cảnh: Gaussian, trường hằng, bàn cờ, cosine, hai heater và tấm trống; thang màu cố định, probe và đồ thị theta theo thời gian mô hình.",
      "ZIP có starter, chín checkpoint, final, README và tests; build/run không cần Node.js hoặc ghép source từ project khác.",
    ],
    constraints: [
      "Tự viết discrete Laplacian và PDE loop: đọc current, ghi toàn next rồi swap. Không dùng blur filter, engine, cập nhật tại chỗ hoặc clamp nghiệm.",
      "Tấm đồng nhất, D không đổi theo không gian; chưa mô phỏng đối lưu, bức xạ, chuyển pha hoặc vật liệu 3D. Theta chuẩn hóa, không tự gán Celsius/Joule.",
      "Tô bút chỉ đặt nhiệt độ tại sample; đứng yên không bơm công suất. Heater ép theta sau mỗi bước, không phải nguồn năng lượng không đổi.",
      "Bảo toàn I*=sum(theta)*dx*dy chỉ xét khi biên cách nhiệt, không có heater/input/reset. Vành lạnh giữ tâm ô ngoài ở 0, không cùng hình học biên với ghost-cell cách nhiệt.",
      "Thí nghiệm giới hạn 400 bước được chấp nhận; từ chối candidate NaN/Inf hoặc |theta|>16 trước khi đổi current/tick/time, giữ nghiệm hợp lệ cuối.",
      "Nhận tối đa 0,25 s wall time/frame, tối đa tám bước/frame, báo dropped model seconds. Pause/mất focus không tích nợ thời gian; benchmark có deadline hữu hạn.",
    ],
    definitionOfDone: [
      "Với rx=ry=0,2, xung ở giữa cho tâm và bốn ô cạnh bằng 0,2 sau một bước; ô chéo vẫn 0. Oracle thông lượng qua từng cạnh khớp stencil trên lưới không vuông.",
      "Trường hằng 0,4 đứng yên với biên cách nhiệt. Ca Gaussian 192²/120 bước giữ I* trong 1e-9+|I* ban đầu|×1e-12 và symmetry trong 1e-12 theta.",
      "Heater có ledger thay đổi tích phân riêng; vành lạnh luôn bằng 0 kể cả sau khi tô. Không yêu cầu bảo toàn cho hai trường hợp này.",
      "Bàn cờ 192², D=1,5, h=0,5, dt=0,05: chế độ thường từ chối; bật experiment thì thấy theta âm/vượt 1 thật rồi dừng hữu hạn, không publish bước vượt giới hạn.",
      "Cosine mode khớp nghiệm của scheme trong 2e-13 theta. Refinement giữ miền 16×16 và t=0,4, giảm h một nửa/dt bốn lần; tách sai số PDE khỏi roundoff.",
      "Các chuỗi 15/30/120 FPS đủ hai giây tạo 60 bước ở dt=1/30 khi không bỏ thời gian. Stall, tham số xấu và mất focus không gây vòng bù vô hạn.",
      "Build starter, chín checkpoint và final; CTest Debug/Release kiểm thật, snippet khớp đúng source và gói ZIP chạy độc lập. Kiểm riêng thao tác native, Canvas, quy mô và benchmark.",
    ],
  },
  lessonAliases: {
    "07-do-doc-truong-nhiet": "08-doc-truong-nhiet-va-canh-mau",
    "08-kiem-chung-va-ban-hoan-chinh": "09-kiem-chung-va-ban-hoan-chinh",
  },
  lessons: [
    {
      id: "p47-l01",
      slug: "01-ve-ban-do-nhiet",
      title: "Vẽ tấm kim loại trước khi cho nhiệt lan",
      summary: "Chạy khung SDL, tạo field số thực và vẽ từng ô bằng thang màu cố định.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "heat-plate",
    },
    {
      id: "p47-l02",
      slug: "02-dat-nhiet-bang-chuot",
      title: "Dùng chuột đặt vùng nóng và lạnh",
      summary: "Nối tọa độ input, brush tròn và stroke vào ứng dụng đang chạy; chưa có solver.",
      order: 2,
      estimatedMinutes: 85,
      demoId: "heat-plate",
    },
    {
      id: "p47-l03",
      slug: "03-nhiet-lan-tren-mot-hang",
      title: "Cho nhiệt lan trên một hàng",
      summary:
        "Từ trao đổi ở hai phía, viết bước sai phân 1D và double buffer; N tiến đúng một bước.",
      order: 3,
      estimatedMinutes: 100,
      demoId: "heat-plate",
    },
    {
      id: "p47-l04",
      slug: "04-mo-rong-sang-hai-chieu",
      title: "Thêm chiều còn thiếu cho tấm kim loại",
      summary: "Mở stencil thành năm điểm và kiểm một xung nhiệt bằng đáp án tính tay.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "heat-plate",
    },
    {
      id: "p47-l05",
      slug: "05-dieu-kien-bien",
      title: "Chọn cách nhiệt, vành lạnh và heater",
      summary: "Quyết định nhiệt có đi qua mép hay được giữ ở nguồn; đọc đúng tích phân và ledger.",
      order: 5,
      estimatedMinutes: 105,
      demoId: "heat-plate",
    },
    {
      id: "p47-l06",
      slug: "06-buoc-thoi-gian-on-dinh",
      title: "Tăng dt để nhìn thấy solver mất ổn định",
      summary:
        "Suy ra giới hạn rx+ry, nối slider D/dt và chạy thí nghiệm không clamp với chốt dừng hữu hạn.",
      order: 6,
      estimatedMinutes: 130,
      demoId: "heat-plate",
    },
    {
      id: "p47-l07",
      slug: "07-texture-va-do-phan-giai",
      title: "Đưa 36.864 ô lên một streaming texture",
      summary: "Từ 32² lên 192² thật, xử lý RGBA/pitch và đổi độ phân giải trên cùng miền.",
      order: 7,
      estimatedMinutes: 100,
      demoId: "heat-plate",
    },
    {
      id: "p47-l08",
      slug: "08-doc-truong-nhiet-va-canh-mau",
      title: "Đặt probe và đọc trường nhiệt theo thời gian",
      summary:
        "Chọn cảnh có câu hỏi rõ ràng, ghi theta tại một vị trí và không đánh đồng màu với nhiệt lượng.",
      order: 8,
      estimatedMinutes: 85,
      demoId: "heat-plate",
    },
    {
      id: "p47-l09",
      slug: "09-kiem-chung-va-ban-hoan-chinh",
      title: "Kiểm chứng và chạy tấm kim loại hoàn chỉnh",
      summary:
        "Oracle độc lập, nghiệm rời rạc/PDE, refinement và benchmark hữu hạn; bàn giao đầy đủ source chạy được.",
      order: 9,
      estimatedMinutes: 130,
      demoId: "heat-plate",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
