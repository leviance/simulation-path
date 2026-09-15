import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 14 — camera basis, field of view và chuyển động camera trong world space",
    "Project 33 — OpenGL 3.3 Core, shader compile/link, VAO và framebuffer pixels",
    "Project 35 — shader file, candidate program, uniform lifecycle và last-good reload",
    "Vector 3D — dot, cross, normalize, length và cách đọc một hàm khoảng cách có dấu",
  ],
  summary:
    "Vẽ một căn phòng có sphere, box và torus mà không cần tạo mesh cho từng vật thể. OpenGL chỉ vẽ một triangle phủ kín màn hình; từ đó, mỗi fragment tự dựng tia nhìn, tiến theo Signed Distance Function, tìm normal, chọn material và tính bóng. Một bản tính nhỏ chạy trên CPU giúp bạn kiểm tra camera, SDF và điều kiện dừng thay vì chỉ nhìn hình rồi đoán shader đã đúng.",
  challenge: {
    timebox: "900–1.200 phút",
    mission:
      "Tự xây dựng một ứng dụng C++/SDL3/OpenGL hiển thị căn phòng ray-marched gồm sphere, axis-aligned box và torus. Không tạo vertex/index buffer cho ba vật thể: fragment shader phải dựng ray từ camera, dùng SDF để tiến từng bước, dừng bằng guard hữu hạn rồi tô ánh sáng và bóng từ kết quả hit.",
    outcome:
      "Một cửa sổ ray marching có orbit camera, zoom bằng con lăn, đèn chuyển động, bóng mềm và bốn chế độ Beauty/Steps/Hit/Normal. Thanh tiêu đề cho biết số bước tối đa, epsilon, chế độ quan sát, phiên bản shader và kết quả kiểm tra. Khi nhấn F5, shader lỗi sẽ được báo rõ nhưng hình ảnh từ shader đang chạy tốt vẫn được giữ nguyên.",
    requirements: [
      "Starter tạo SDL window cùng OpenGL 3.3 Core context, compile shader từ file và vẽ một fullscreen triangle bằng gl_VertexID.",
      "Fragment coordinates phải dùng framebuffer pixels; aspect được xử lý trước khi tạo ray direction.",
      "Camera ray được dựng từ forward/right/up basis, vertical field of view và camera position/target trong world space.",
      "Sphere SDF trả giá trị âm bên trong, xấp xỉ zero trên bề mặt và dương bên ngoài.",
      "Vòng lặp sphere tracing dùng chính distance làm bước tiến; nó phải dừng khi chạm bề mặt, đi quá xa, hết số bước hoặc gặp NaN/Inf.",
      "Normal được ước lượng từ cùng scene SDF bằng central differences rồi normalize trước Lambert lighting.",
      "Box và torus được thêm bằng SDF; không thêm object vertex, index, draw call hay mesh loader.",
      "Scene query trả cả distance và materialId từ cùng primitive gần nhất; room planes có material riêng.",
      "Shadow ray bắt đầu ngoài bề mặt theo normal bias, có số bước/khoảng cách tối đa và trả visibility trong [0,1].",
      "Orbit camera dùng pointer capture, pitch/yaw/distance clamps và không thay đổi dữ liệu primitive trong shader.",
      "Các chế độ debug phải dùng đúng kết quả ray marching của chế độ Beauty: tỉ lệ số bước, hit mask và normal đã mã hóa, không âm thầm chạy một thuật toán khác.",
      "Kèm starter, chín checkpoint độc lập, final có comment, shader source, README và CTest thuần CPU.",
    ],
    constraints: [
      "Không dùng mesh sphere/cube/torus, geometry shader, compute shader, WebGL hay thư viện ray-marching có sẵn.",
      "Fullscreen triangle chỉ là bề mặt phát fragments; không được nhầm nó với hình học của căn phòng.",
      "Không dùng fixed step length nhỏ tùy ý; bước chính phải đến từ scene distance.",
      "Không bỏ giới hạn số bước hoặc khoảng cách tối đa, kể cả khi cảnh mẫu hiện tại luôn có vật thể để tia chạm vào.",
      "Không tính normal từ primitive đã đoán lại sau hit; normal phải lấy từ scene SDF đã quyết định bề mặt.",
      "Không dùng màu để suy ra material ID và không dùng material ID để thay đổi distance winner.",
      "Không để shadow ray khởi đầu đúng trên bề mặt rồi coi self-shadow acne là bóng hợp lệ.",
      "Không tăng độ phân giải của Canvas demo quá mức; mô phỏng web phải giới hạn số tia và nói rõ lượng công việc đang chạy.",
      "Không benchmark Debug build hoặc dùng FPS làm correctness check.",
    ],
    definitionOfDone: [
      "Fullscreen triangle phủ viewport mà không cần object VBO/EBO; resize không tạo méo aspect.",
      "Center ray đi qua camera target, corner rays hữu hạn và mọi ray direction được normalize.",
      "Sphere center/surface/outside cho đúng dấu; ray chính diện hit sphere trong step budget.",
      "Ray đi qua phía mở của room kết thúc bằng guard thay vì loop vô hạn hoặc báo hit giả.",
      "Numerical normal trên điểm ngoài cùng của sphere dài gần một và hướng ra ngoài.",
      "Box face và torus outer ring có distance gần zero trong CTest.",
      "Sphere, box, torus và room giữ material ID 1–4 ổn định sau scene composition.",
      "Soft shadow luôn hữu hạn trong [0,1], có normal bias và không vượt step budget.",
      "Kéo/nhả/reset camera cân bằng pointer capture; wheel zoom và pitch/yaw không đưa camera ra ngoài preset an toàn.",
      "F5 shader lỗi không xóa active program; shader đúng làm generation tăng đúng một.",
      "Canvas có pause/reset, pointer capture, keyboard, DPR, reduced motion, stage-aware controls và mô tả văn bản.",
      "Starter, chín checkpoint, final build ở Debug/Release; CTest, Canvas tests và website build đều đạt.",
    ],
  },
  duration: "25–33 giờ",
  objectives: [
    "Hiểu ray marching như một chuỗi quyết định có thể theo dõi: tạo tia, đo khoảng cách, tiến lên, chạm bề mặt hoặc dừng",
    "Biết viết và ghép SDF cho sphere, box và torus mà vẫn có thể kiểm tra từng phần",
    "Thiết kế normal, material, shadow, camera và debug view cùng dựa trên một hàm truy vấn scene thống nhất",
  ],
  lessons: [
    {
      id: "p36-l01",
      slug: "01-fullscreen-triangle-va-fragment-coordinates",
      title: "Vẽ toàn màn hình chỉ với một triangle",
      summary:
        "Bỏ object mesh khỏi draw path, sinh ba clip-space vertices từ gl_VertexID và kiểm gl_FragCoord/uResolution bằng một lưới màu đúng framebuffer pixels.",
      order: 1,
      estimatedMinutes: 115,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l02",
      slug: "02-dung-camera-ray-tu-moi-pixel",
      title: "Từ pixel dựng một tia nhìn",
      summary:
        "Đổi fragment coordinate thành NDC có aspect, dựng forward/right/up và tạo world-space ray chuẩn hóa đi qua từng pixel.",
      order: 2,
      estimatedMinutes: 135,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l03",
      slug: "03-signed-distance-cua-sphere",
      title: "Đo khoảng cách đến mặt cầu bằng SDF",
      summary:
        "Viết sdSphere, đọc dấu âm/zero/dương và dùng lát cắt 2D để thấy khoảng cách khác mask inside/outside ở điểm nào.",
      order: 3,
      estimatedMinutes: 125,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l04",
      slug: "04-sphere-tracing-co-guard",
      title: "Cho tia tiến từng bước và dừng an toàn",
      summary:
        "Tiến đúng scene distance, theo dõi traveled/steps và dừng bằng epsilon, maximum distance hoặc maximum steps thay vì một loop hy vọng sẽ kết thúc.",
      order: 4,
      estimatedMinutes: 155,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l05",
      slug: "05-uoc-luong-normal-va-lambert",
      title: "Tìm normal và tô sáng bằng Lambert",
      summary:
        "Lấy gradient số bằng sáu SDF samples, normalize normal và tách ambient/diffuse để hình cầu thôi giống một đĩa phẳng.",
      order: 5,
      estimatedMinutes: 140,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l06",
      slug: "06-sdf-box-va-torus",
      title: "Thêm box và torus mà không tạo mesh",
      summary:
        "Dựng khoảng cách ngoài/trong của axis-aligned box và giảm torus 3D thành bài toán 2D quanh bán kính lớn/nhỏ.",
      order: 6,
      estimatedMinutes: 165,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l07",
      slug: "07-ghep-scene-va-material-id",
      title: "Ghép căn phòng và giữ đúng material",
      summary:
        "Cho scene query trả distance cùng materialId, chọn cùng một winner và thêm năm plane thành căn phòng mở mà không làm mất contract SDF.",
      order: 7,
      estimatedMinutes: 150,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l08",
      slug: "08-soft-shadow-va-orbit-camera",
      title: "Tạo bóng mềm và điều khiển camera",
      summary:
        "Bắn shadow ray có bias/guard, thêm đèn chuyển động và điều khiển yaw/pitch/distance mà không sửa primitive data.",
      order: 8,
      estimatedMinutes: 160,
      demoId: "ray-marched-shape-room",
    },
    {
      id: "p36-l09",
      slug: "09-hoan-thien-can-phong-ray-march",
      title: "Hoàn thiện căn phòng ray-marched",
      summary:
        "Khóa debug views, named validation, failure experiments, last-good reload, cleanup và source hoàn chỉnh trước GPU compute ở Project 37.",
      order: 9,
      estimatedMinutes: 155,
      demoId: "ray-marched-shape-room",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
