import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 09 — column vector, transformation matrix và thứ tự nhân",
    "Project 11 — perspective divide, NDC và viewport",
    "Project 14 — view transform của camera có position, yaw và pitch",
  ],
  summary:
    "Xây một máy soi pipeline trên CPU để theo dõi cùng một vertex từ local space qua Model, View, Projection, clip space, NDC và cuối cùng tới pixel trên màn hình.",
  challenge: {
    timebox: "260–340 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 theo dõi một vertex khi nó đi qua pipeline 3D. Người dùng có thể dừng ở từng chặng, sau đó thay đổi model, camera hoặc lens để thấy chính xác dữ liệu bắt đầu đổi từ đâu.",
    outcome:
      "Cửa sổ hiển thị sơ đồ Local → World → Camera → Clip → NDC → Screen, một viewport chứa điểm cuối cùng và thanh tiêu đề ghi chặng đang chọn cùng tọa độ tương ứng. Người dùng có thể đi lần lượt qua từng chặng, xoay model, di chuyển camera, đổi FOV và thử các tình huống visible/near/behind/outside.",
    requirements: [
      "Bắt đầu bằng một local vertex và một inspector nhìn thấy được trước khi thêm matrix hoặc perspective.",
      "Tự viết Vec4, Mat4, identity, matrix multiplication và matrix–vector multiplication theo quy ước column vector.",
      "Dựng model matrix từ scale, yaw rotation và translation; chứng minh local point có w=1 nhận translation còn direction có w=0 thì không.",
      "Dựng view matrix bằng các phép nghịch đảo của camera pose và đối chiếu kết quả với view transform tường minh của Project 14.",
      "Dựng perspective projection matrix cho camera nhìn theo +Z; clip.w phải giữ camera-space Z để perspective divide dùng đúng mẫu số.",
      "Chỉ perspective divide sau khi kiểm tra clip.w, sau đó đổi NDC sang pixel và phân loại behind, before-near, beyond-far, outside hoặc visible.",
      "Ghép MVP theo thứ tự Projection × View × Model và chứng minh kết quả giống chạy ba matrix riêng rẽ.",
      "Cho phép chọn chặng, thử các cấu hình gây lỗi, tạm dừng, tiến từng bước, đặt lại, đổi kích thước cửa sổ, dùng bàn phím và kéo chuột; toàn bộ phép toán phải kiểm thử được mà không mở window.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, Eigen, DirectXMath, SDL_RenderGeometry hoặc matrix/projection API có sẵn.",
      "Dùng row-major storage nhưng column vector; không đổi quy ước ở giữa project.",
      "Không ghi đè local vertex bằng world/camera/clip value; PipelineTrace phải giữ riêng từng stage để inspector không nói dối dữ liệu.",
      "Không chia clip.xyz cho w khi w≤0 hoặc camera depth nằm ngoài near/far; không clamp một vertex lỗi vào viewport để giả visible.",
      "Project này chỉ theo dõi point; chưa raster triangle, chưa Z-buffer và chưa cắt primitive qua near plane.",
    ],
    definitionOfDone: [
      "Identity giữ nguyên Vec4; translation thay point w=1 nhưng không thay direction w=0.",
      "Model matrix cho kết quả giống scale → rotate Y → translate thực hiện bằng các hàm thành phần.",
      "View matrix cho kết quả giống phép trừ camera position rồi inverse yaw/pitch trong sai số 10⁻⁹.",
      "Projection tạo clip.w=camera.z; near plane đổi thành NDC.z≈0 và far plane thành NDC.z≈1.",
      "MVP ghép cho cùng clip point với ba matrix riêng; đổi thứ tự nhân phải làm test dữ liệu không giao hoán thất bại.",
      "Mỗi tình huống mẫu được phân loại đúng, điểm visible nằm trong viewport và mọi giá trị trung gian vẫn hữu hạn.",
      "CTest vượt qua; starter, bảy checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "10–11 giờ",
  objectives: [
    "Nhìn pipeline 3D như một chuỗi đổi hệ tọa độ có dữ liệu trung gian kiểm tra được",
    "Mở rộng affine matrix 2D thành Mat4 và hiểu vai trò của homogeneous w",
    "Dựng, ghép và kiểm chứng Model, View, Projection theo một quy ước nhất quán",
  ],
  lessons: [
    {
      id: "p15-l01",
      slug: "01-dung-may-soi-vertex",
      title: "Dựng máy soi cho một vertex",
      summary:
        "Bắt đầu từ framebuffer chạy được, đặt một local vertex vào sơ đồ pipeline và vẽ marker trước khi xuất hiện bất kỳ matrix nào.",
      order: 1,
      estimatedMinutes: 60,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l02",
      slug: "02-vec4-va-mat4",
      title: "Từ Vec3 sang Vec4 và Mat4",
      summary:
        "Mở rộng ma trận affine của Project 09 lên 4×4, tự viết phép nhân và dùng w để phân biệt point với direction.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l03",
      slug: "03-model-matrix-local-to-world",
      title: "Model matrix đưa local vertex ra world space",
      summary:
        "Ghép scale, rotation Y và translation theo đúng thứ tự, rồi quan sát mỗi tham số bắt đầu làm dữ liệu thay đổi từ chặng World.",
      order: 3,
      estimatedMinutes: 75,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l04",
      slug: "04-view-matrix-world-to-camera",
      title: "View matrix hoàn tác camera pose",
      summary:
        "Đưa inverse translation, inverse yaw và inverse pitch vào Mat4 rồi đối chiếu với công thức view tường minh đã học ở Project 14.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l05",
      slug: "05-projection-matrix-va-clip-space",
      title: "Projection matrix tạo clip space và w",
      summary:
        "Dựng perspective matrix từ FOV, aspect, near và far; theo dõi vì sao clip.w nhận camera-space Z trước khi chia phối cảnh.",
      order: 5,
      estimatedMinutes: 85,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l06",
      slug: "06-perspective-divide-ndc-va-viewport",
      title: "Từ clip space tới pixel an toàn",
      summary:
        "Kiểm tra w/depth, thực hiện perspective divide, đổi NDC sang viewport và giữ trạng thái lỗi thay vì vẽ tọa độ giả.",
      order: 6,
      estimatedMinutes: 75,
      demoId: "pipeline3d",
    },
    {
      id: "p15-l07",
      slug: "07-ghep-mvp-va-validation",
      title: "Ghép MVP và kiểm chứng toàn pipeline",
      summary:
        "Nhân Projection × View × Model, hoàn thiện chọn chặng, tình huống mẫu và chuyển động; sau đó dùng CTest để khóa các điều kiện đúng trước khi ghép mã hoàn chỉnh.",
      order: 7,
      estimatedMinutes: 90,
      demoId: "pipeline3d",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
