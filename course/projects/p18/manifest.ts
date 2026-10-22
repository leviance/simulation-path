import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 03 — nội suy tuyến tính giữa hai sample bằng cùng tham số t",
    "Project 15 — camera space, near plane, perspective divide và viewport transform",
    "Project 16 — triangle rasterizer, top-left rule và barycentric color",
  ],
  summary:
    "Cắt một tam giác ngay trong camera space trước khi projection: phân loại vertex bằng signed distance, sinh giao điểm có thuộc tính, tạo polygon 0–4 đỉnh rồi chia lại thành 0–2 tam giác an toàn để rasterize.",
  challenge: {
    timebox: "300–390 phút",
    mission:
      "Tự xây dựng một mô phỏng SDL3 trong đó một tam giác 3D có thể đi xuyên qua near plane của camera mà hình trên viewport vẫn thay đổi liên tục, không phóng lớn đột ngột, không tạo NaN và không biến mất chỉ vì một vertex đi ra ngoài.",
    outcome:
      "Viewport phối cảnh lớn hiển thị bề mặt tam giác tô RGB trên lưới world. Mặt cắt ZX nhỏ phía dưới cho thấy đầu vào và phần còn lại sau clipping. Người dùng kéo hoặc giữ A/D để đưa tam giác xuyên camera, thử năm tình huống, chạy/dừng/tiến từng bước và tắt debug để xem cảnh sạch.",
    requirements: [
      "Bắt đầu từ window, renderer, streaming texture, CPU framebuffer và một triangle trong camera space; vẽ mặt cắt trước khi thêm clipping.",
      "Định nghĩa half-space được giữ bằng d = vertex.z − near; vertex có z≥near là inside chính xác; epsilon chỉ đánh dấu khoảng gần plane, không nới half-space.",
      "Với cạnh cắt near plane, tính t = (near − start.z)/(end.z − start.z) và dùng đúng t cho position lẫn color.",
      "Tự viết một bước Sutherland–Hodgman cho ba cạnh có hướng của triangle; polygon sau khi cắt có tối đa 4 vertex, bỏ bản sao liên tiếp và endpoint đóng vòng và giữ đúng thứ tự quanh biên.",
      "Chia polygon có 3 hoặc 4 vertex theo triangle fan; kết quả tương ứng là 1 hoặc 2 triangle, không tạo triangle suy biến giả cho polygon rỗng.",
      "Chỉ project vertex đã qua clip; phép projection phải từ chối mọi vertex có z < near thay vì chia rồi clamp tọa độ lỗi.",
      "Đưa 0–2 triangle qua rasterizer Project 16, giữ top-left rule và nội suy màu đã được sinh đúng tại giao điểm.",
      "Có preset all-inside, one-outside, two-outside, all-outside và on-plane; có drag, A/D, pause, single-step, reset, resize và chế độ so clip với discard-whole.",
      "Tách toàn bộ toán clipping/projection/rasterization khỏi SDL để CTest chạy không cần window.",
      "Viewport phối cảnh 3D là vùng chính; mặt cắt ZX before/after là overlay riêng. Clean mode giữ bề mặt/lưới world và tắt debug.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, SDL_RenderGeometry hoặc thư viện clipping có sẵn.",
      "Không project từng vertex trước rồi mới clip trong screen space; near-plane clipping phải chạy trong camera space.",
      "Không thay vertex ngoài bằng z=near; phải tìm đúng giao điểm trên từng cạnh để silhouette liên tục.",
      "Không bỏ cả triangle khi chỉ một hoặc hai vertex nằm trước near plane.",
      "Chưa thêm clipping năm mặt phẳng còn lại, Z-buffer hay perspective-correct interpolation; bài này có một bề mặt để tập trung vào clipping.",
    ],
    definitionOfDone: [
      "Signed distance và projection dùng cùng half-space chính xác; vertex on-plane không bị nhân đôi, điểm hơi trước plane không được nhận rồi biến mất.",
      "Giao điểm có z bằng near trong sai số 10⁻⁹; position và color dùng cùng một t nằm trong [0,1].",
      "Các trường hợp có 0/1/2/3 vertex nằm ngoài ở trường hợp không suy biến cho polygon 3/4/3/0 và 1/2/1/0 triangle; tiếp xúc chỉ còn điểm/đoạn không tạo triangle giả.",
      "Mọi vertex sau khi cắt đều hữu hạn, z không nhỏ hơn near quá 10⁻⁹ và maximumNearPlaneViolation không vượt sai số cho phép.",
      "Projection từ chối vertex chưa clip; output triangle hợp lệ rasterize được và coveredCount bằng số lần shade callback chạy.",
      "Khi sweep qua near plane, hình thay đổi liên tục; discard-whole biến mất sớm còn clipper giữ phần vẫn nhìn thấy.",
      "CTest vượt qua; starter, tám checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "12–13 giờ",
  objectives: [
    "Hiểu clipping là cắt primitive với một half-space trước projection, không phải sửa tọa độ lỗi sau phép chia",
    "Tự cài đặt signed distance, segment-plane intersection và một bước Sutherland–Hodgman có thể kiểm thử",
    "Giữ geometry và vertex attributes đi cùng nhau từ camera space tới triangle rasterizer",
  ],
  lessons: [
    {
      id: "p18-l01",
      slug: "01-dung-canh-tam-giac-cat-near-plane",
      title: "Dựng cảnh tam giác cắt qua near plane",
      summary:
        "Chạy bộ khung SDL/CPU, dựng tam giác RGB rồi thêm di chuyển theo Z để quan sát lỗi bỏ cả hình trước khi viết clipper.",
      order: 1,
      estimatedMinutes: 65,
      demoId: "near-plane",
    },
    {
      id: "p18-l02",
      slug: "02-signed-distance-va-half-space",
      title: "Phân loại vertex bằng signed distance",
      summary:
        "Dùng d=z−near để phân biệt hai phía; giữ biên chính xác và chỉ dùng epsilon cho số liệu chẩn đoán.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "near-plane",
    },
    {
      id: "p18-l03",
      slug: "03-giao-diem-canh-va-near-plane",
      title: "Tìm giao điểm trên cạnh và giữ thuộc tính",
      summary:
        "Giải tham số t trên segment, nội suy position cùng color và đặt z giao điểm chính xác về near plane.",
      order: 3,
      estimatedMinutes: 80,
      demoId: "near-plane",
    },
    {
      id: "p18-l04",
      slug: "04-clip-triangle-thanh-polygon",
      title: "Cắt triangle thành polygon 0–4 đỉnh",
      summary:
        "Duyệt ba cạnh theo Sutherland–Hodgman, xử lý bốn chuyển trạng thái in→in, in→out, out→in và out→out.",
      order: 4,
      estimatedMinutes: 95,
      demoId: "near-plane",
    },
    {
      id: "p18-l05",
      slug: "05-chia-polygon-thanh-triangle",
      title: "Chia polygon đã clip thành triangle",
      summary:
        "Dùng triangle fan để chuyển polygon 3/4 đỉnh thành 1/2 triangle mà không đổi thứ tự winding hoặc tạo geometry thừa.",
      order: 5,
      estimatedMinutes: 70,
      demoId: "near-plane",
    },
    {
      id: "p18-l06",
      slug: "06-project-va-rasterize-ket-qua",
      title: "Project và rasterize phần còn nhìn thấy",
      summary:
        "Chặn projection trước phép chia, đưa từng output triangle sang screen space và tô màu bằng rasterizer top-left.",
      order: 6,
      estimatedMinutes: 95,
      demoId: "near-plane",
    },
    {
      id: "p18-l07",
      slug: "07-sweep-qua-camera-va-validation",
      title: "Cho triangle quét qua camera và kiểm chứng",
      summary:
        "Ghép preset, drag, pause, single-step và discard comparison; dùng CTest khóa count, near constraint, tính hữu hạn và raster callback.",
      order: 7,
      estimatedMinutes: 90,
      demoId: "near-plane",
    },
    {
      id: "p18-l08",
      slug: "08-canh-3d-va-ban-hoan-chinh",
      title: "Cảnh 3D, clean mode và bản hoàn chỉnh",
      summary:
        "Giữ viewport phối cảnh làm phần chính, dịch camera độc lập và tắt debug mà không mất bề mặt cùng lưới world.",
      order: 8,
      estimatedMinutes: 90,
      demoId: "near-plane",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
