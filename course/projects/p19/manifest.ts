import type { PublishedProjectEditorial } from "../../types";
const project = {
  prerequisites: [
    "Project 10 — cross product, normal và winding",
    "Project 14–15 — camera space và perspective",
    "Project 16–18 — triangle rasterizer, Z-buffer và near clipping",
  ],
  summary:
    "Xây dựng một ứng dụng C++/SDL3 chiếu sáng cube bằng flat Lambert shading trên CPU. Bắt đầu từ cube đặc, tự tính normal, cho đèn orbit và tách rõ xoay mô hình khỏi đổi góc nhìn.",
  challenge: {
    timebox: "4–6 giờ tự thử trước khi đọc",
    mission:
      "Tự xây dựng một mô phỏng 3D trong đó cube có mặt sáng tối theo hướng đèn. Người dùng xoay cube, di chuyển hướng đèn hoặc đổi góc nhìn độc lập; một mặt quay lưng đèn không được nhận diffuse dương.",
    outcome:
      "Một cube đặc có perspective và depth đúng, đặt trên nền grid. Khi đèn orbit quanh cube, vùng sáng đổi liên tục. Bật debug để xem normal trắng và hướng về đèn màu vàng, tắt debug để quan sát mô hình sạch.",
    requirements: [
      "Cube có tám vertex dùng chung và mười hai triangle với outward winding; cả hai triangle trên một mặt có cùng normal và material.",
      "Vẽ cube đặc bằng CPU framebuffer ngay ở bước đầu, giữ Z-buffer và near clipping đã học; SDL chỉ tạo cửa sổ, nhận input và trình bày ảnh.",
      "Tính normal từ geometry đã xoay trong world space. surfaceToLight cũng phải là vector đơn vị trong world space.",
      "Tính diffuse = max(0, N·L), intensity = clamp(ambient + strength × diffuse, 0, 1) và nhân vào baseColor.",
      "Có preset trước/trên/phải/sau, chỉnh góc đèn liên tục, tự orbit, pause, tiến một bước cố định và reset.",
      "Tách riêng thao tác Xoay mô hình và Đổi góc nhìn. Camera không làm đổi độ sáng của một mặt khi model và đèn đứng yên.",
      "Có lớp debug normals/light vectors bật tắt được, bảng dot/diffuse/intensity và chế độ trình diễn sạch.",
      "Source tải về có starter, bảy checkpoint chạy độc lập, final, README và tests không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, SDL_RenderGeometry hoặc thư viện lighting thay phép tính CPU.",
      "Không gán sẵn độ sáng theo face ID, không dùng abs(dot) và không bỏ depth test để dựa vào thứ tự vẽ.",
      "Directional light chỉ có hướng: dấu đèn orbit là ký hiệu, không phải point light; chưa có attenuation, specular hoặc shadow.",
      "Không nhân normal với view translation; không dùng normal local-space để chiếu sáng một mặt đã xoay.",
    ],
    definitionOfDone: [
      "Normal dài 1, vuông góc hai cạnh và hướng ra ngoài ở mọi góc xoay; hai triangle cùng mặt không tạo đường đổi sáng.",
      "Diffuse tại 0°, 90°, 180° lần lượt bằng 1, 0, 0; phần tối chỉ giữ ambient.",
      "Đèn orbit và model rotation làm diffuse đổi liên tục; camera orbit giữ nguyên diffuse của từng face ID.",
      "Lighting/palette không thay geometry hoặc depth; đảo draw order và tắt culling vẫn giữ ảnh cube khi depth test bật.",
      "Ray/AABB độc lập khớp pixel coverage, depth và Lambert RGB ở nhiều tư thế.",
      "Resize/HiDPI không làm Canvas phình; pointer capture được nhả khi hủy kéo/mất focus; Tab thoát Canvas bình thường.",
      "Starter, checkpoint, final build Debug/Release; CTest vẫn hoạt động khi NDEBUG được bật.",
    ],
  },
  duration: "10–13 giờ",
  objectives: [
    "Tự giải thích được từng bước từ winding đến màu pixel của một mặt được chiếu sáng",
    "Tính flat Lambert shading trong một không gian tọa độ nhất quán",
    "Ghép lighting vào renderer CPU có depth và clipping, rồi kiểm chứng bằng một phương pháp độc lập",
  ],
  lessons: [
    {
      id: "p19-l01",
      slug: "01-dung-tetrahedron-tu-indexed-mesh",
      title: "Dựng cube đặc trước khi bật đèn",
      summary:
        "Kế thừa Z-buffer và near clip để có cube tám đỉnh, mười hai tam giác chạy được ngay từ checkpoint đầu.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "lambert",
    },
    {
      id: "p19-l02",
      slug: "02-face-normal-va-outward-winding",
      title: "Từ hai cạnh đến normal hướng ra ngoài",
      summary: "Tính normal từ world-space vertex; kiểm winding và hai tam giác trên cùng một mặt.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "lambert",
    },
    {
      id: "p19-l03",
      slug: "03-thong-nhat-huong-den",
      title: "Đặt đèn trong không gian và cho đèn orbit",
      summary:
        "Thống nhất surfaceToLight, đặt hướng bằng hai góc và cập nhật quỹ đạo theo thời gian.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "lambert",
    },
    {
      id: "p19-l04",
      slug: "04-lambert-diffuse-tu-dot-product",
      title: "Mặt hướng về đèn sáng hơn như thế nào?",
      summary:
        "Dùng dot product của hai vector đơn vị, thử ba góc 0°, 90°, 180° rồi tô từng mặt trên CPU.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "lambert",
    },
    {
      id: "p19-l05",
      slug: "05-ambient-material-va-mau-pixel",
      title: "Giữ màu vật liệu, thêm ambient",
      summary:
        "Tách baseColor khỏi cường độ sáng; thêm ambient, strength và thí nghiệm một màu/sáu màu.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "lambert",
    },
    {
      id: "p19-l06",
      slug: "06-xoay-model-va-back-face-culling",
      title: "Xoay mô hình khác với đổi góc nhìn",
      summary:
        "Tách model rotation khỏi camera orbit; giữ đèn trong world space và culling độc lập với lighting.",
      order: 6,
      estimatedMinutes: 100,
      demoId: "lambert",
    },
    {
      id: "p19-l07",
      slug: "07-ghep-pipeline-va-kiem-chung",
      title: "Hoàn thiện renderer và kiểm chứng độc lập",
      summary:
        "Giữ một màu cho cả face sau clipping; đối chiếu renderer với ray/AABB và bàn giao source hoàn chỉnh.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "lambert",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
