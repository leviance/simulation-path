import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p20-l01": {
      focus:
        "Mở starter trước, rồi tạo bốn vertex có UV và nối thành mặt phẳng. Quay tất cả vertex bằng cùng phép quay trước khi chiếu xuống framebuffer.",
      expected:
        "Cửa sổ hiện một quad wireframe có thể kéo/xoay; phím 1–3 đổi tư thế. Chiều dài cạnh trong 3D không đổi. Bài này chưa tô texture.",
      files: ["include/geometry.hpp", "include/render.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung SDL",
          explanation:
            "Starter đã tạo window, renderer, streaming texture và framebuffer. Xem đường đi renderScene → SDL_UpdateTexture → presentFramebuffer trước khi thêm quad.",
        },
        {
          title: "Gắn UV vào từng đỉnh",
          explanation:
            "Bốn vertex có cả position lẫn UV. Hai triangle tham chiếu chung vertex trên đường chéo, không giữ các bản sao rời nhau.",
        },
        {
          title: "Quay rồi mới chiếu",
          explanation:
            "makeQuad quay quanh X rồi Y, sau đó cộng distance. projectVertex chia X/Y cho Z; drawLine nối các đỉnh đã chiếu.",
        },
      ],
    },
    "p20-l02": {
      focus:
        "Tạo ảnh bàn cờ 64 × 64 trong bộ nhớ, rồi tự chọn texel từ UV. Làm rõ clamp/repeat trước khi dán ảnh lên mặt phẳng.",
      expected:
        "Preview bàn cờ và marker texel; J/L đổi U, I/K đổi V, T đổi clamp/repeat trong ứng dụng SDL. UV âm và UV bằng 1 không đọc ngoài mảng.",
      files: ["include/sampler.hpp", "include/render.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Sinh ảnh nguồn",
          explanation:
            "Màu sáng/tối nằm trong vector texels theo row-major; ảnh nguồn không đổi khi xoay mặt phẳng.",
        },
        {
          title: "Đưa UV về miền hợp lệ",
          explanation:
            "Clamp giữ UV trong [0,1]; repeat lấy phần lẻ value−floor(value), kể cả khi value âm.",
        },
        {
          title: "Tìm texel và đọc màu",
          explanation:
            "Lấy floor(u×width), chặn chỉ số ở width−1. Quy ước là các ô texel nửa mở, không round UV×(width−1).",
        },
      ],
    },
    "p20-l03": {
      focus:
        "Lấy barycentric weights từ rasterizer và dùng chúng để trộn raw UV. Đây là bản affine đối chứng, cố ý chưa sửa perspective.",
      expected:
        "Mặt phẳng được tô bàn cờ. Chính diện trông đúng; nghiêng mạnh thấy các ô bị kéo lệch và có thể lộ nếp ở diagonal.",
      files: ["include/raster.hpp", "include/interpolation.hpp", "include/render.hpp"],
      steps: [
        {
          title: "Xác định pixel thuộc triangle nào",
          explanation: "Kiểm tại tâm pixel và dùng top-left rule để cạnh chung có đúng một owner.",
        },
        {
          title: "Giữ đỉnh và thuộc tính cùng thứ tự",
          explanation:
            "Nếu đổi winding, rasterizer trả cả ScreenTriangle đã đổi và weights tương ứng; UV không được dùng theo thứ tự cũ.",
        },
        {
          title: "Nối weights tới sampler",
          explanation:
            "interpolateAffineUv tạo UV, sampleNearest trả màu, callback ghi framebuffer. Geometry đúng không có nghĩa nội suy thuộc tính đã đúng.",
        },
      ],
    },
    "p20-l04": {
      focus:
        "Tạo pixel inspector và một phép đo UV độc lập: ray qua tâm pixel giao với mặt phẳng local z=0.",
      expected:
        "Click trong quad thấy λ, affine UV, ray UV và độ lệch. Chính diện gần zero; nghiêng mạnh có sai số rõ. Click ngoài quad báo ngoài quad.",
      files: ["include/reference.hpp", "include/render.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đảo phép quay của scene",
          explanation:
            "Đưa gốc và hướng ray về local bằng quay −Y rồi −X. Không dùng barycentric để tìm giao điểm.",
        },
        {
          title: "Giải mặt phẳng local",
          explanation:
            "Với origin.z+t×direction.z=0, tìm t rồi đọc x/y. UV lấy từ kích thước quad 3.2 × 2.",
        },
        {
          title: "So đúng tâm pixel đang vẽ",
          explanation:
            "Inspector chỉ nhận dữ liệu trong callback raster tại selectedX/selectedY. Không so một điểm liên tục khác với sample đã tô.",
        },
      ],
    },
    "p20-l05": {
      focus:
        "Suy ra weights trên bề mặt từ weights trên màn hình và xác định ba giá trị phải mang qua projection.",
      expected:
        "Ảnh vẫn là affine. Inspector thêm denominator 1/z dương; ScreenVertex mới có oneOverZ, uOverZ, vOverZ.",
      files: ["include/geometry.hpp", "include/interpolation.hpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Bắt đầu bằng ví dụ hai depth",
          explanation:
            "Giữa hai điểm trên màn hình không nhất thiết là giữa hai điểm trên bề mặt; ví dụ z=2 và z=6 cho u=0.25 thay vì 0.5.",
        },
        {
          title: "Chuẩn bị dữ liệu tại vertex",
          explanation:
            "Sau phép chiếu, giữ 1/z, u/z, v/z cùng vị trí screen. Không nội suy z rồi đảo ở cuối.",
        },
        {
          title: "Nội suy denominator",
          explanation:
            "D=λA/zA+λB/zB+λC/zC. Bài này chỉ thêm dữ liệu và cách đọc D, chưa đổi màu đang vẽ.",
        },
      ],
    },
    "p20-l06": {
      focus:
        "Khôi phục UV bằng cách chia hai tử số u/z và v/z cho cùng denominator; giữ affine trong chế độ A/B.",
      expected:
        "M đổi affine/corrected, C bật so sánh hai viewport. Corrected UV khớp ray UV; front cho hai cách gần như trùng nhau.",
      files: ["include/interpolation.hpp", "include/render.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Tính tử số",
          explanation: "Dùng đúng weights đã dùng cho D để cộng uOverZ và vOverZ.",
        },
        {
          title: "Chia một lần tại pixel",
          explanation:
            "Chỉ khôi phục u/v sau khi cộng xong; từ chối denominator không hữu hạn hoặc không dương.",
        },
        {
          title: "So cùng một scene",
          explanation:
            "Hai viewport có cùng kích thước và cùng quad, texture, sampler, rasterizer; chỉ cách nội suy UV khác nhau.",
        },
      ],
    },
    "p20-l07": {
      focus:
        "Cho mặt phẳng xuyên near plane mà không làm mất UV; clip TexturedVertex trong camera space trước projection.",
      expected:
        "Preset 4 vẫn hiện phần quad trước near plane. Shared edge không nứt; corrected texture giữ cùng UV qua các triangle sinh từ clipping.",
      files: ["include/clip.hpp", "include/render.hpp", "include/scene.hpp"],
      steps: [
        {
          title: "Dùng một t cho cả cạnh",
          explanation:
            "Giải t bằng Z rồi nội suy cả XYZ và UV. Không nội suy 1/z bằng t camera-space.",
        },
        {
          title: "Giữ miền inside chính xác",
          explanation:
            "Clip với z≥1, ghim intersection về z=1. Không nới epsilon rồi để projection từ chối đỉnh vừa được giữ.",
        },
        {
          title: "Tính reciprocal sau khi clip",
          explanation:
            "Fan triangulation tạo primitive mới; projectVertex tính 1/z, u/z, v/z từ vertex đã clip.",
        },
      ],
    },
    "p20-l08": {
      focus:
        "Bàn giao chương trình hoàn chỉnh có chế độ trình diễn/debug, điều khiển rõ ràng và các test kiểm cả ảnh thay vì tự so công thức với chính nó.",
      expected:
        "Final mở ở so sánh A/B sạch; F hiện debug. Starter, tám checkpoint và final chạy độc lập; CTest kiểm cả Debug và Release.",
      files: ["include/scene.hpp", "include/controls.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ cảnh sạch để nhìn distortion",
          explanation:
            "Ẩn wireframe/inspector nhưng giữ bàn cờ tương phản, grid chiều sâu và nhãn A/B.",
        },
        {
          title: "Quản lý input và thời gian",
          explanation:
            "Pause/reset hủy drag, focus lost và resize dừng animation; single-step luôn tiến 1/60 giây. --smoke tự kết thúc sau tám frame.",
        },
        {
          title: "Đối chiếu từng pixel",
          explanation:
            "Ray–plane kiểm coverage, UV và màu của cả quad ở bốn tư thế. Đổi diagonal hoặc winding không được thay kết quả corrected.",
        },
      ],
    },
  },
  references: {
    "p20-l01": [
      { label: "UV coordinates", href: "/glossary#uv-coordinates", kind: "Thuật ngữ" },
      {
        label: "SDL logical presentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
    ],
    "p20-l02": [
      { label: "Nearest sampling", href: "/glossary#nearest-texture-sampling", kind: "Thuật ngữ" },
      { label: "Texture address mode", href: "/glossary#texture-address-mode", kind: "Thuật ngữ" },
    ],
    "p20-l03": [
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
    ],
    "p20-l04": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      { label: "Pixel center", href: "/glossary#pixel-center", kind: "Thuật ngữ" },
    ],
    "p20-l05": [
      { label: "Reciprocal depth", href: "/glossary#reciprocal-depth", kind: "Thuật ngữ" },
    ],
    "p20-l06": [
      {
        label: "Perspective-correct interpolation",
        href: "/glossary#perspective-correct-interpolation",
        kind: "Thuật ngữ",
      },
    ],
    "p20-l07": [
      { label: "Near-plane clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
      { label: "Vertex attribute", href: "/glossary#vertex-attribute", kind: "Thuật ngữ" },
    ],
    "p20-l08": [
      {
        label: "SDL input coordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      { label: "Texture mapping", href: "/glossary#texture-mapping", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
