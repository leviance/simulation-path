import type { PublishedProjectEditorial } from "../../types";

const demoId = "geometry-workshop";
const project = {
  summary:
    "Từ một mảnh mặt có ánh sáng, tự dựng torus, vỏ ốc, dải Möbius và nút thắt. Xoay nhìn mô hình, đổi tham số, mở lưới/UV/normal để tìm chỗ nối, rồi xuất hình vừa tạo thành OBJ.",
  duration: "10–14 giờ",
  prerequisites: [
    "Đã dùng vector, dot/cross và phép chiếu 3D (Project 06, 13–17). Bài đầu nhắc lại cách đọc tangent và normal ngay trên một mảnh mặt.",
    "Đã đọc một chương trình SDL3/OpenGL (Project 33–34). Gói này có sẵn cửa sổ, loader, camera và phần vẽ; không cần chép mã từ project trước.",
    "CMake 3.24+, compiler C++20 và driver OpenGL 3.3. Phép quay quanh trục được giải thích khi dựng vỏ ốc; không cần học quaternion trước.",
  ],
  objectives: [
    "Hiểu một công thức theo u/v biến thành vertex, tam giác và bề mặt có ánh sáng như thế nào.",
    "Nhìn và kiểm được ba kiểu mép: khép cùng chiều, khép đảo chiều và đầu mở.",
    "Dựng frame dọc đường cong không lật đột ngột; xử lý góc lệch khi đường dẫn quay về điểm đầu.",
    "Cho phép chỉnh mô hình trong lúc ứng dụng vẫn phản hồi; lưu và kiểm lại chính mesh đã dựng.",
  ],
  challenge: {
    timebox: "90–120 phút tự thử bước đầu",
    mission:
      "Tự xây một xưởng tạo mô hình 3D bằng C++20, SDL3 và OpenGL. Trước khi xem hướng dẫn, hãy thử đặt một lưới u/v lên mặt cong nhỏ, chiếu sáng rồi nối nó thành torus. Đây là bước khởi đầu; vỏ ốc, Möbius, knot và xuất file là các mốc tiếp theo của sản phẩm.",
    outcome:
      "Cửa sổ hiện một bề mặt có chiều sâu. Chọn torus, vỏ ốc, Möbius hoặc knot, kéo tham số để đổi hình, orbit/pan/zoom để nhìn mọi phía và lưu mô hình thành OBJ. Bật wireframe, UV, tangent/normal hoặc seam để hiểu một thay đổi đến từ đâu.",
    requirements: [
      "Tự tính vị trí và hai tangent từ u/v, lấy normal bằng cross, tạo index buffer và kiểm winding. Thử một lưới nhỏ trước để lần được ID.",
      "Giữ mép mở của vỏ ốc, khép tuần hoàn torus và nối đảo cột cho Möbius. Möbius nhìn được cả hai mặt; không ép một normal toàn cục.",
      "Mang tiết diện elip theo đường dẫn của vỏ ốc và knot. Giữ frame không lật tùy ý; với knot, bù góc lệch dọc cả vòng trước khi chốt đường nối.",
      "Chỉnh bán kính, độ dày tiết diện, độ xoắn, số vòng/tốc độ nở và độ phân giải tùy preset. Có Reset, camera và lớp kiểm hình học.",
      "Khi kéo, dựng preview nhẹ từ yêu cầu mới nhất. Khi buông, làm mịn theo batch; hủy hoặc input lỗi phải giữ bản đầy đủ gần nhất.",
      "Dựng ít nhất một lưới 65.536 bản ghi đỉnh thật, báo số tam giác và payload. Xuất OBJ của mesh đầy đủ và đọc lại để kiểm.",
    ],
    constraints: [
      "Dùng scaffold SDL3/OpenGL được cấp, nhưng không tải model hoàn chỉnh hoặc dùng thư viện sinh mặt thay phần công thức, topology và frame.",
      "Công bố miền tham số và giới hạn số đoạn; tránh input suy biến, index sai và rebuild chỉ vì đổi camera.",
      "Trùng vị trí ở seam không có nghĩa đã hàn đỉnh, không tự giao hoặc là mesh kín. Vỏ ốc không có nắp; OBJ không chứa tangent.",
      "Canvas là bản minh họa nhỏ. Mốc số đỉnh, buffer OpenGL và OBJ phải kiểm trên ứng dụng C++ chạy độc lập.",
    ],
    definitionOfDone: [
      "Nhìn thấy đủ bốn dạng, kéo tham số đổi hình thật. UV/normal/seam giải thích được tại sao mặt nối đúng; quay qua hai phía của Möbius không mất mặt.",
      "Có fixture độc lập cho điểm/bounds/normal torus, mép đảo Möbius và frame của đường sweep. Index và số bản ghi khớp lưới.",
      "Lưới 256×256 có 66.049 đỉnh và 131.072 tam giác; buffer chứa đúng payload. Orbit, pan, zoom không dựng lại mesh.",
      "Reset, cancel, đổi yêu cầu nhanh và input lỗi giữ đúng last-good; kéo/thả ngoài cửa sổ hoặc mất focus không để thanh bị kẹt.",
      "ZIP tự build được starter, các checkpoint và final. OBJ xuất từ final đọc lại đúng thuộc tính và tam giác.",
    ],
  },
  lessons: [
    {
      id: "p41-l01",
      slug: "01-manh-mat-co-anh-sang",
      title: "Dựng một mảnh mặt có ánh sáng",
      summary:
        "Bắt đầu từ cửa sổ và lưới sàn; thêm P(u,v), hai tangent và normal của một mảnh cong.",
      order: 1,
      estimatedMinutes: 45,
      demoId,
    },
    {
      id: "p41-l02",
      slug: "02-noi-luoi-va-kiem-winding",
      title: "Nối lưới và kiểm chiều tam giác",
      summary:
        "Lần bốn ID trong một ô, tạo hai tam giác cùng chiều rồi mở điều khiển độ phân giải.",
      order: 2,
      estimatedMinutes: 55,
      demoId,
    },
    {
      id: "p41-l03",
      slug: "03-khep-hai-vong-torus",
      title: "Khép hai vòng để tạo torus",
      summary: "Thay công thức đặt điểm, nối hai cặp mép nhưng giữ riêng UV của mỗi phía.",
      order: 3,
      estimatedMinutes: 55,
      demoId,
    },
    {
      id: "p41-l04",
      slug: "04-dao-mep-mobius",
      title: "Xoắn dải Möbius và nối mép đảo",
      summary:
        "Sau một vòng, cột trái gặp cột phải. Đổi tangent theo đúng chiều và tô sáng cả hai mặt.",
      order: 4,
      estimatedMinutes: 60,
      demoId,
    },
    {
      id: "p41-l05",
      slug: "05-quet-tiet-dien-vo-oc",
      title: "Mang một tiết diện đi dọc đường xoắn",
      summary: "Cho đường dẫn loe dần, mang frame từ hàng trước và lấy mẫu elip để tạo vỏ ốc.",
      order: 5,
      estimatedMinutes: 85,
      demoId,
    },
    {
      id: "p41-l06",
      slug: "06-khep-frame-torus-knot",
      title: "Khép ống quanh một nút thắt",
      summary:
        "Dùng hai góc quanh torus để tạo đường kín, rồi chia góc lệch của frame dọc toàn vòng.",
      order: 6,
      estimatedMinutes: 80,
      demoId,
    },
    {
      id: "p41-l07",
      slug: "07-preview-va-mesh-gan-nhat",
      title: "Kéo thanh điều khiển mà không dựng lưới lớn liên tục",
      summary:
        "Tách yêu cầu, preview và last-good; dựng từng nhóm hàng và chỉ nhận mesh sau upload.",
      order: 7,
      estimatedMinutes: 70,
      demoId,
    },
    {
      id: "p41-l08",
      slug: "08-xuat-obj-va-doc-lai",
      title: "Xuất mô hình thành OBJ rồi đọc lại để kiểm",
      summary: "Đổi index sang cách đếm từ 1, giữ UV/normal ở seam và kiểm file trước khi công bố.",
      order: 8,
      estimatedMinutes: 65,
      demoId,
    },
    {
      id: "p41-l09",
      slug: "09-hoan-thien-xuong-hinh-hoc",
      title: "Chạy xưởng hoàn chỉnh và kiểm lưới 66.049 đỉnh",
      summary:
        "Đo từ mesh thật, đối chiếu buffer/OBJ và kiểm riêng camera, hủy dựng và thao tác chuột.",
      order: 9,
      estimatedMinutes: 75,
      demoId,
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
