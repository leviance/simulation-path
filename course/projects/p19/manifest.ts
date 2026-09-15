import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 10 — cross product, face normal và winding order",
    "Project 15 — camera space, perspective projection và viewport transform",
    "Project 16 — edge function, top-left rule và CPU triangle rasterizer",
    "Project 18 — near-plane clipping trước phép chia phối cảnh",
  ],
  summary:
    "Chiếu một directional light lên tetrahedron và tự tính màu từng mặt bằng Lambert diffuse: dựng outward normal, thống nhất vector surfaceToLight, clamp dot product, cộng ambient rồi đưa kết quả qua clipping, projection và CPU rasterizer.",
  challenge: {
    timebox: "330–420 phút",
    mission:
      "Tự xây dựng một mô phỏng SDL3 hiển thị tetrahedron 3D có thể xoay. Mặt hướng về nguồn sáng phải sáng hơn, mặt quay lưng phải chỉ còn ambient; khi đổi hướng đèn hoặc xoay vật thể, độ sáng thay đổi liên tục và đúng với hình học.",
    outcome:
      "Một tetrahedron đặc được tô màu phẳng (flat shading) bằng CPU. Người dùng có thể kéo chuột để xoay mô hình, chọn hướng đèn, bật/tắt chiếu sáng và normal, tạm dừng chuyển động, tiến một frame rồi đọc dot–diffuse–intensity của mặt đang chọn.",
    requirements: [
      "Bắt đầu từ window, renderer, streaming texture và CPU framebuffer; dựng tetrahedron bằng bốn vertex dùng chung và bốn face có outward winding.",
      "Tính face normal từ hai cạnh sau khi vertex đã được đưa sang camera space; kiểm tra normal hướng ra ngoài bằng centroid của tetrahedron.",
      "Đặt tên hướng đèn là surfaceToLight và giữ đúng quy ước: vector này chỉ từ bề mặt về phía nguồn sáng.",
      "Tính Lambert diffuse bằng max(0, dot(unitNormal, unitSurfaceToLight)); không cho mặt quay lưng nhận diffuse âm.",
      "Tính intensity bằng ambient + diffuseStrength × diffuse rồi clamp về [0,1]; nhân intensity với baseColor của material trước khi đổi sang byte.",
      "Xoay geometry trước rồi tính lại face normal; không tái dùng normal local-space cho một face đã đổi hướng.",
      "Back-face cull bằng vector từ face centroid tới camera; chỉ clip, project và rasterize face hướng về camera.",
      "Clip từng face với near plane trước perspective divide; màu của vertex mới vẫn là màu flat-shaded của chính face đó.",
      "Có bốn hướng đèn mẫu front/top/side/back, thao tác kéo chuột, bàn phím, tạm dừng, tiến từng bước, đặt lại, đổi kích thước cửa sổ và bảng số liệu cho face đang chọn.",
      "Tách toàn bộ vector math, lighting, clipping, projection và rasterization khỏi SDL để CTest chạy không cần window.",
    ],
    constraints: [
      "Không dùng OpenGL, GLM, SDL_RenderGeometry hoặc API lighting có sẵn.",
      "Không dùng abs(dot) để làm mặt quay lưng sáng trở lại; diffuse âm phải bị clamp về 0.",
      "Không nhầm surfaceToLight với hướng tia sáng truyền từ đèn tới bề mặt.",
      "Không thêm specular, point-light attenuation, texture, normal mapping hoặc Z-buffer vào Project 19.",
      "Không biến tetrahedron thành một danh sách bốn triangle rời rạc; vertex và face phải được lưu theo indexed mesh.",
    ],
    definitionOfDone: [
      "Cả bốn face có outward winding; face normal hữu hạn, dài xấp xỉ 1 và vuông góc với hai cạnh.",
      "Diffuse bằng 1 khi normal cùng hướng đèn, bằng 0 khi vuông góc và vẫn bằng 0 khi quay ngược.",
      "Intensity luôn nằm trong [0,1]; mặt không nhận diffuse vẫn giữ đúng ambient thay vì chuyển thành màu đen.",
      "Xoay mô hình bảo toàn độ dài cạnh; normal được tính lại và dot product đổi đúng theo hướng mới.",
      "Face quay lưng camera bị loại trước rasterization; face nhìn thấy đi qua near clipping và projection mà không sinh NaN.",
      "Kéo chuột, WASD/arrow, bốn preset đèn, L, N, Space, single-step và R hoạt động sau resize.",
      "CTest vượt qua; starter, bảy checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "12–14 giờ",
  objectives: [
    "Biến ý tưởng mặt quay về đèn sáng hơn thành một chuỗi đại lượng có thể kiểm tra: normal, surfaceToLight, dot, diffuse và intensity",
    "Phân biệt rõ hình học của face, material và thông số của directional light",
    "Ghép phép chiếu sáng Lambert theo từng mặt vào clipping–projection–rasterization mà không phá các điều kiện đúng của pipeline cũ",
  ],
  lessons: [
    {
      id: "p19-l01",
      slug: "01-dung-tetrahedron-tu-indexed-mesh",
      title: "Dựng tetrahedron từ indexed mesh",
      summary:
        "Dựng bốn vertex dùng chung, bốn face có màu material riêng và đưa mesh qua pipeline đặc tối thiểu trước khi có lighting.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "lambert",
    },
    {
      id: "p19-l02",
      slug: "02-face-normal-va-outward-winding",
      title: "Tính face normal và kiểm tra winding",
      summary:
        "Lấy cross product của hai cạnh, chuẩn hóa normal và dùng face centroid để phát hiện face nào đang quay vào trong.",
      order: 2,
      estimatedMinutes: 80,
      demoId: "lambert",
    },
    {
      id: "p19-l03",
      slug: "03-thong-nhat-huong-den",
      title: "Thống nhất hướng đèn trước khi lấy dot",
      summary:
        "Mô hình hóa directional light bằng surfaceToLight, chuẩn hóa một lần và dùng preset để nhìn ra lỗi đảo dấu.",
      order: 3,
      estimatedMinutes: 65,
      demoId: "lambert",
    },
    {
      id: "p19-l04",
      slug: "04-lambert-diffuse-tu-dot-product",
      title: "Tính Lambert diffuse từ dot product",
      summary:
        "Đọc cos góc giữa normal và hướng về đèn, clamp phần âm và giải thích vì sao diffuse không phụ thuộc vị trí camera.",
      order: 4,
      estimatedMinutes: 75,
      demoId: "lambert",
    },
    {
      id: "p19-l05",
      slug: "05-ambient-material-va-mau-pixel",
      title: "Ghép ambient, material và màu pixel",
      summary:
        "Biến diffuse thành intensity có ambient, nhân với baseColor và chỉ làm tròn khi ghi vào framebuffer.",
      order: 5,
      estimatedMinutes: 75,
      demoId: "lambert",
    },
    {
      id: "p19-l06",
      slug: "06-xoay-model-va-back-face-culling",
      title: "Xoay model và loại mặt quay lưng",
      summary:
        "Xoay vertex, tính lại normal trong camera space và cull face bằng vector từ centroid tới camera.",
      order: 6,
      estimatedMinutes: 90,
      demoId: "lambert",
    },
    {
      id: "p19-l07",
      slug: "07-ghep-pipeline-va-kiem-chung",
      title: "Ghép pipeline chiếu sáng và kiểm chứng",
      summary:
        "Đưa màu của từng mặt qua near clip, projection và top-left rasterizer; hoàn thiện điều khiển, bảng số liệu và bộ test toán học.",
      order: 7,
      estimatedMinutes: 105,
      demoId: "lambert",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
