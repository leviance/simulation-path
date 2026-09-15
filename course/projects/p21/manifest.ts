import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 17 — triangle rasterizer, NDC depth và Z-buffer theo từng pixel",
    "Project 18 — near-plane clipping trong camera space",
    "Project 19 — face normal, back-face culling và Lambert diffuse",
  ],
  summary:
    "Đọc một file Wavefront OBJ thật, biến vertex và polygon thành indexed triangle mesh, tự đưa model qua normalize, lighting, clipping, Z-buffer và CPU rasterizer rồi xoay nó trực tiếp bằng chuột.",
  challenge: {
    timebox: "480–600 phút",
    mission:
      "Tự xây dựng một OBJ mesh viewer bằng C++20 và SDL3. Chương trình phải đọc model từ file thay vì hard-code geometry, chấp nhận các face token OBJ thường gặp, chuẩn hóa model vào khung nhìn và render mesh bằng chính CPU pipeline đã xây ở các project trước.",
    outcome:
      "Một cửa sổ hiển thị rocket low-poly được nạp từ file OBJ. Người dùng có thể kéo chuột để xoay, bật/tắt back-face culling, đổi wireframe hoặc solid, tạm dừng, tiến từng bước và xem thống kê vertex, source face, triangle, lỗi parser cùng fragment pass/reject.",
    requirements: [
      "Đọc file theo từng dòng; bỏ qua comment và dòng trống; phân biệt ít nhất record `v` và `f`.",
      "Đổi OBJ position index dương từ 1-based sang 0-based và từ chối index 0 hoặc vượt phạm vi.",
      "Đọc được token `v`, `v/vt`, `v//vn`, `v/vt/vn`; Project 21 chỉ lấy position index nhưng không được parse nhầm phần sau dấu slash.",
      "Hỗ trợ negative index theo đúng số position đã xuất hiện tại dòng face, chẳng hạn `-1` là position mới nhất.",
      "Triangulate face có từ ba vertex trở lên bằng triangle fan và giữ source line/source face để chẩn đoán.",
      "Tính axis-aligned bounds, đưa tâm bounds về origin và scale đồng đều sao cho cạnh lớn nhất có độ dài 2.",
      "Tính face normal từ winding sau model transform; bỏ triangle suy biến và dùng Lambert diffuse để tạo màu mặt.",
      "Đưa từng triangle qua near-plane clipping, perspective projection, top-left rasterization và Z-buffer trước khi ghi color.",
      "Nếu file không mở được hoặc có dòng sai, báo path, line và nguyên nhân rõ ràng; không crash hoặc âm thầm dùng geometry rác.",
      "Kèm một asset OBJ có license rõ ràng, starter, tám checkpoint, final và CTest không cần mở window.",
    ],
    constraints: [
      "Không dùng tinyobjloader, Assimp, OpenGL, SDL_RenderGeometry hoặc thư viện parser/rasterizer có sẵn.",
      "Không giả định mọi face đều là triangle hoặc mọi index đều dương.",
      "Không trộn OBJ 1-based index trực tiếp với `std::vector` 0-based.",
      "Không scale riêng từng trục vì cách đó làm méo model.",
      "Không project vertex trước near-plane clipping.",
      "Chưa đọc material MTL, texture, smoothing group hoặc vertex normal để thay cho face normal tự tính.",
    ],
    definitionOfDone: [
      "Parser đọc đúng vertex, triangle face, slash token, negative index và polygon có hơn ba corner.",
      "Mỗi diagnostic chứa line number và thông báo có thể hành động; input lỗi không tạo triangle tham chiếu ngoài mảng.",
      "Triangle fan của face N corner tạo đúng N−2 triangle và giữ winding của polygon.",
      "Sau normalize, tâm bounds gần origin và cạnh lớn nhất gần 2 mà tỷ lệ ba trục không đổi.",
      "Normal hữu hạn, có độ dài gần 1; triangle suy biến không đi vào rasterizer.",
      "Mọi vertex gửi vào projection nằm trên hoặc trước near plane; depth cuối hữu hạn trong [0,1].",
      "Đảo draw order không đổi color/depth buffer khi Z-buffer bật.",
      "Rocket OBJ đi kèm load thành công; thao tác chuột, bàn phím, resize, wireframe/solid, culling và reset đều hoạt động.",
      "CTest vượt qua; starter, tám checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "16–18 giờ",
  objectives: [
    "Hiểu cấu trúc tối thiểu của Wavefront OBJ và chuyển index ngoài file thành dữ liệu an toàn trong bộ nhớ",
    "Biến polygon bất kỳ thành triangle mesh rồi chuẩn hóa model mà không làm đổi tỷ lệ",
    "Ghép parser với renderer CPU hoàn chỉnh và kiểm chứng cả dữ liệu đầu vào lẫn output pixel",
  ],
  lessons: [
    {
      id: "p21-l01",
      slug: "01-doc-vertex-va-ve-point-cloud",
      title: "Đọc vertex và vẽ point cloud đầu tiên",
      summary:
        "Mở file OBJ, đọc record v theo từng dòng và project các position thành một point cloud nhìn thấy được trước khi xử lý face.",
      order: 1,
      estimatedMinutes: 75,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l02",
      slug: "02-doc-face-va-index-mot-based",
      title: "Đọc face và đổi index 1-based",
      summary:
        "Tách ba corner của face triangle, đổi OBJ index sang vector index và dựng wireframe từ geometry vừa nạp.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l03",
      slug: "03-giai-ma-face-token-obj",
      title: "Giải mã slash token và negative index",
      summary:
        "Đọc đúng v, v/vt, v//vn, v/vt/vn và index âm mà không để phần UV/normal làm sai position index.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l04",
      slug: "04-triangulate-polygon-bang-fan",
      title: "Chia polygon thành triangle fan",
      summary:
        "Biến face ba, bốn hoặc nhiều corner thành N−2 indexed triangle, giữ winding và source face để debug.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l05",
      slug: "05-center-va-scale-mesh",
      title: "Đưa model về tâm và scale vừa khung",
      summary:
        "Tính AABB, lấy tâm bounds và một uniform scale để model có kích thước ổn định dù file dùng đơn vị nào.",
      order: 5,
      estimatedMinutes: 85,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l06",
      slug: "06-face-normal-va-lambert",
      title: "Tính face normal và Lambert cho mesh",
      summary:
        "Dùng winding để tính normal, nhận diện triangle suy biến, cull mặt quay lưng và tô sáng từng mặt bằng Lambert diffuse.",
      order: 6,
      estimatedMinutes: 95,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l07",
      slug: "07-clip-z-buffer-va-rasterize-mesh",
      title: "Đưa toàn bộ mesh qua clip và Z-buffer",
      summary:
        "Ghép near clipping, projection, top-left rasterizer và depth test thành một đường render dùng cho mọi triangle của OBJ.",
      order: 7,
      estimatedMinutes: 110,
      demoId: "obj-viewer",
    },
    {
      id: "p21-l08",
      slug: "08-load-file-controls-va-validation",
      title: "Hoàn thiện file loading, controls và validation",
      summary:
        "Báo lỗi theo path/line, thêm chế độ xem cùng controls và dùng CTest kiểm parser, normalize, clipping, shading lẫn order independence.",
      order: 8,
      estimatedMinutes: 120,
      demoId: "obj-viewer",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
