import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 03 — linear interpolation và giữ thuộc tính đi cùng sample",
    "Project 15 — camera space, perspective divide và viewport transform",
    "Project 16 — top-left rasterizer cùng barycentric weights tại pixel center",
    "Project 18 — near-plane clipping phải nội suy mọi vertex attribute bằng cùng t",
  ],
  summary:
    "Dán texture bàn cờ lên một quad nghiêng và tự sửa biến dạng do nội suy UV tuyến tính trong screen space: mang 1/z, u/z và v/z qua projection, nội suy bằng barycentric rồi chia lại tại từng pixel.",
  challenge: {
    timebox: "390–480 phút",
    mission:
      "Tự xây dựng một chương trình SDL3 hiển thị bàn cờ trên mặt phẳng 3D nghiêng. Chương trình phải so sánh được affine UV với perspective-correct UV, chỉ ra sai số tại pixel được chọn và giữ texture liên tục qua đường chéo chung của hai triangle.",
    outcome:
      "Một CPU texture mapper đặt kết quả affine và perspective-correct cạnh nhau để so sánh. Mặt phẳng nghiêng có thể điều khiển được; khi chọn một pixel, bảng số liệu hiển thị barycentric weights, hai giá trị UV, reciprocal depth và texel được lấy mẫu.",
    requirements: [
      "Bắt đầu từ window, renderer, streaming texture và CPU framebuffer; dựng quad bằng bốn TexturedVertex dùng chung cùng hai triangle có winding nhất quán.",
      "Gắn UV `(0,1)`, `(1,1)`, `(1,0)`, `(0,0)` vào bốn corner và giải thích rõ U tăng sang phải, V tăng xuống dưới texture.",
      "Tự sinh texture bàn cờ trong bộ nhớ CPU; viết nearest sampling với hai cách xử lý UV ngoài miền là clamp và repeat, đồng thời ghi rõ quy ước texel index.",
      "Đưa quad qua perspective projection và dùng top-left rasterizer để lấy barycentric weights tại pixel center.",
      "Cài affine UV bằng `λ0·uv0 + λ1·uv1 + λ2·uv2`, render nó như đối chứng sai và đo sai số thay vì chỉ nhìn hình.",
      "Tại mỗi projected vertex, lưu `oneOverZ=1/z`, `uOverZ=u/z`, `vOverZ=v/z`; không nội suy camera-space Z theo kiểu affine rồi đảo sau.",
      "Tại pixel, nội suy ba đại lượng trên bằng cùng barycentric weights rồi khôi phục `u=(u/z)/(1/z)` và `v=(v/z)/(1/z)`.",
      "Clip triangle với near plane trong camera space và nội suy position cùng UV bằng đúng một tham số t trước projection.",
      "Hai triangle của quad dùng chung vertex/UV và top-left rule; diagonal không được nứt, chồng pixel hoặc đổi texel đột ngột trong chế độ correct.",
      "Có bốn tình huống front/medium/steep/near; cho phép kéo chuột để đổi độ nghiêng và độ sâu, chọn affine/perspective-correct/so sánh, tạm dừng, tiến từng bước, đặt lại, đổi kích thước cửa sổ và xem số liệu của pixel.",
      "Tách texture math, clipping, projection và rasterization khỏi SDL để CTest chạy không mở window.",
    ],
    constraints: [
      "Không dùng OpenGL, SDL_RenderGeometry, GLM hoặc thư viện texture mapping có sẵn.",
      "Không sửa affine distortion bằng cách tăng mật độ triangle; final phải dùng phép chia perspective-correct tại pixel.",
      "Không nội suy raw UV sau projection rồi gọi kết quả là perspective-correct.",
      "Không clip UV trong screen space hoặc bỏ UV khi near clipping sinh vertex mới.",
      "Không thêm bilinear filtering, mipmap, anisotropic filtering, lighting hoặc Z-buffer vào Project 20.",
      "Không dùng modulo trực tiếp với UV âm nếu chưa định nghĩa repeat cho kết quả dương.",
    ],
    definitionOfDone: [
      "Checker texture có kích thước hợp lệ; nearest clamp/repeat trả đúng texel ở biên, ngoài miền và UV âm.",
      "Affine và perspective-correct UV bằng nhau khi ba depth bằng nhau, nhưng khác có thể đo được khi quad nghiêng.",
      "Perspective-correct UV khớp reference trong sai số 10⁻⁹ và denominator luôn hữu hạn, dương với triangle hợp lệ.",
      "Near clipping dùng cùng t cho XYZ và UV; mọi output Z không nhỏ hơn near quá tolerance.",
      "Hai triangle dùng top-left rule không overlap và tổng coverage không tạo khe trên diagonal chung.",
      "Selected pixel báo barycentric sum gần 1, UV hữu hạn, texel index hợp lệ và affine error không âm.",
      "Các tình huống mẫu, kéo chuột, bàn phím, chế độ so sánh, tạm dừng, tiến từng bước, đặt lại và đổi kích thước cửa sổ đều hoạt động mà không sửa dữ liệu texture gốc.",
      "CTest vượt qua; starter, tám checkpoint và final build sạch warning ở Debug lẫn Release.",
    ],
  },
  duration: "14–16 giờ",
  objectives: [
    "Hiểu vì sao thuộc tính tuyến tính trên bề mặt 3D không còn tuyến tính sau perspective divide",
    "Tự suy ra và cài đặt perspective-correct interpolation bằng reciprocal depth",
    "Giữ UV đúng từ camera-space clipping tới texture sampling tại pixel cuối cùng",
  ],
  lessons: [
    {
      id: "p20-l01",
      slug: "01-dung-quad-nghieng-va-uv",
      title: "Dựng quad nghiêng và gắn UV",
      summary:
        "Dựng bốn TexturedVertex dùng chung, hai triangle có winding đúng và vẽ bộ khung projected quad trước khi lấy mẫu texture.",
      order: 1,
      estimatedMinutes: 70,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l02",
      slug: "02-tao-checker-texture-va-sample-texel",
      title: "Tạo checker texture và lấy mẫu texel",
      summary:
        "Sinh bàn cờ procedural, đổi UV sang texel bằng nearest sampling và khóa clamp/repeat behavior bằng test.",
      order: 2,
      estimatedMinutes: 75,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l03",
      slug: "03-noi-suy-uv-affine-trong-rasterizer",
      title: "Nội suy UV affine trong rasterizer",
      summary:
        "Dùng barycentric weights ở pixel center để nội suy UV trực tiếp và render bàn cờ đối chứng bị méo.",
      order: 3,
      estimatedMinutes: 90,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l04",
      slug: "04-do-sai-so-do-perspective",
      title: "Đo sai số thay vì chỉ nhìn texture méo",
      summary:
        "Chọn một pixel, đọc λ, affine UV và reference UV để thấy perspective divide đã phá tính tuyến tính ở đâu.",
      order: 4,
      estimatedMinutes: 80,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l05",
      slug: "05-suy-ra-reciprocal-depth",
      title: "Suy ra công thức reciprocal depth",
      summary:
        "Biến mỗi vertex thành 1/z, u/z, v/z và chứng minh vì sao ba đại lượng này mới nội suy tuyến tính trong screen space.",
      order: 5,
      estimatedMinutes: 90,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l06",
      slug: "06-khoi-phuc-uv-perspective-correct",
      title: "Khôi phục UV perspective-correct tại pixel",
      summary:
        "Nội suy reciprocal attributes bằng λ, chia cho interpolated 1/z và dùng UV đúng để sample bàn cờ.",
      order: 6,
      estimatedMinutes: 95,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l07",
      slug: "07-clip-near-plane-ma-khong-lam-roi-uv",
      title: "Clip near plane mà không làm rơi UV",
      summary:
        "Nội suy position và UV bằng cùng t khi clipping, chia polygon thành triangle rồi mới tạo reciprocal attributes.",
      order: 7,
      estimatedMinutes: 90,
      demoId: "perspective-texture",
    },
    {
      id: "p20-l08",
      slug: "08-ghep-texture-mapper-va-validation",
      title: "Ghép texture mapper và kiểm chứng",
      summary:
        "Hoàn thiện chế độ so sánh, các tình huống mẫu, thao tác kéo chuột và bảng số liệu; dùng CTest kiểm tra lấy mẫu texture, trường hợp affine trùng perspective-correct, clipping và cạnh chung.",
      order: 8,
      estimatedMinutes: 110,
      demoId: "perspective-texture",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
