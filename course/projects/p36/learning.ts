import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p36-l01": {
      focus: "Chạy application shell đã có trước khi sửa ảnh từ fragment shader.",
      expected:
        "Lưới 32 framebuffer pixel phủ viewport; source stage 1 và executable đang chạy là cùng một checkpoint.",
      files: [
        "shaders/raymarch.frag",
        "shaders/raymarch.vert",
        "include/room_application.hpp",
        "include/raymarch_renderer.hpp",
      ],
      steps: [
        {
          title: "Chạy starter",
          explanation:
            "SDL/context/loader/reload là phần cung cấp từ Project 35. Xác nhận nền xanh và đường dẫn shader trong terminal trước khi thêm công thức.",
        },
        {
          title: "Giữ draw path đơn giản",
          explanation:
            "Một VAO rỗng và DrawArrays ba vertex tạo fragment; không thêm VBO cho sphere, box hay torus.",
        },
        {
          title: "Đổi màu bằng tọa độ",
          explanation:
            "Fragment dùng gl_FragCoord và uResolution cùng đơn vị pixel vật lý; lưới có cạnh vuông dù cửa sổ đổi aspect.",
        },
      ],
    },
    "p36-l02": {
      focus: "Đưa basis camera đã học vào fragment shader để tạo tia trong world space.",
      expected:
        "Tia tâm trùng forward, tia góc có độ dài một; CPU top-left và GLSL bottom-left chuyển đổi đúng.",
      files: ["shaders/raymarch.frag", "include/camera.hpp", "include/room_uniforms.hpp"],
      steps: [
        {
          title: "Đọc basis CPU",
          explanation:
            "Camera được mô tả bằng position/yaw/pitch, không còn target hay orbit distance. Right và up được tính từ cross product.",
        },
        {
          title: "Upload một snapshot",
          explanation:
            "uploadUniforms gửi position, forward/right/up và tan(FOV/2) trước draw call; đổi camera không compile shader.",
        },
        {
          title: "Normalize hướng tia",
          explanation:
            "Cộng offset trên mặt ảnh rồi normalize để t có đơn vị mét, không đổi theo góc pixel.",
        },
      ],
    },
    "p36-l03": {
      focus: "Viết hàm khoảng cách tới mặt cầu và kiểm nó bằng các điểm biết trước.",
      expected:
        "Tâm trả -radius, mặt trả 0, điểm ngoài trả dương; hình đang xem là lát cắt phẳng chứ chưa phải sphere 3D.",
      files: ["include/sdf.hpp", "shaders/raymarch.frag"],
      steps: [
        {
          title: "Từ tâm tới bề mặt",
          explanation:
            "Trừ radius khỏi length(point-center), không đổi kết quả thành bool vì bước sau cần độ lớn khoảng cách.",
        },
        {
          title: "Giữ lát cắt thật sự phẳng",
          explanation:
            "Các điểm mẫu có cùng z; không sample một điểm theo ray perspective rồi gọi đó là lát cắt.",
        },
        {
          title: "Đọc dấu và đơn vị",
          explanation:
            "Âm/trong, zero/mặt và dương/ngoài là ba ca độc lập; độ lớn tính bằng đơn vị world.",
        },
      ],
    },
    "p36-l04": {
      focus: "Viết marcher hữu hạn, trả cả kết quả và lý do dừng.",
      expected:
        "Sphere hiện bằng hit mask; ray trong vật thể tìm mặt thoát, ray ngoài hướng ra xa kết thúc bằng distance limit.",
      files: ["include/tracing.hpp", "shaders/raymarch.frag"],
      steps: [
        {
          title: "Đếm mẫu chứ không đoán hit",
          explanation:
            "Sample tại origin+direction*traveled rồi kiểm abs(distance). Vừa tiến tới endpoint nhưng chưa sample lại thì chưa được gọi là hit.",
        },
        {
          title: "Phân biệt các kiểu dừng",
          explanation:
            "Hết steps, vượt distance, empty scene, NaN hay stalled có status riêng; miss không phải exception.",
        },
        {
          title: "Thử origin bên trong",
          explanation:
            "Dùng abs(distance) để tiến tới mặt thoát. Quy tắc distance<=epsilon cũ sẽ báo hit giả tại mọi điểm trong vật thể.",
        },
      ],
    },
    "p36-l05": {
      focus: "Lấy normal từ gradient SDF và nối vào shading của cùng hit result.",
      expected:
        "Sphere có chiều sâu; normal hình học hướng ra ngoài, normal dùng shading có thể lật về phía camera khi nhìn từ trong.",
      files: ["include/tracing.hpp", "shaders/raymarch.frag"],
      steps: [
        {
          title: "Sáu mẫu quanh điểm chạm",
          explanation:
            "Hai mẫu theo mỗi trục x/y/z tạo central differences; normalize sau khi kiểm gradient hữu hạn và khác zero.",
        },
        {
          title: "Bật diffuse và ambient",
          explanation:
            "Lambert dùng max(dot(normal,lightDirection),0); ambient giữ mặt khuất đèn đọc được. Không làm tối màu theo số bước march.",
        },
        {
          title: "Tách hai epsilon",
          explanation:
            "hitEpsilon quyết định gần mặt tới đâu; normalEpsilon quyết định khoảng lấy mẫu gradient. Chúng không cùng một phép kiểm.",
        },
      ],
    },
    "p36-l06": {
      focus: "Thêm hai hàm SDF vào cùng scene query.",
      expected:
        "Box có cạnh/góc đúng khoảng cách Euclidean; torus nghiêng nhưng khoảng cách local/world giữ nguyên.",
      files: ["include/sdf.hpp", "shaders/raymarch.frag", "include/room_uniforms.hpp"],
      steps: [
        {
          title: "Tách ngoài và trong box",
          explanation:
            "length(max(q,0)) đo phần ngoài; min(maxComponent(q),0) giữ dấu âm trong box.",
        },
        {
          title: "Thu torus về hai chiều",
          explanation:
            "Khoảng cách XZ tới major radius cùng local Y tạo một vector 2D; trừ minor radius để có SDF của ống.",
        },
        {
          title: "Quay điểm, không quay ray marcher",
          explanation:
            "Đổi world point bằng inverse rotation trước khi hỏi torus. Phép quay cứng giữ độ dài; scale tùy ý thì không.",
        },
      ],
    },
    "p36-l07": {
      focus: "Ghép vật thể với phòng hữu hạn và truyền đúng material ID.",
      expected:
        "Ra ngoài tường không bị hit giả; floor/checker và vật thể có màu riêng nhưng không đổi vị trí hit.",
      files: ["include/sdf.hpp", "shaders/raymarch.frag"],
      steps: [
        {
          title: "Chọn cả SceneSample",
          explanation:
            "nearer thay đồng thời distance và materialId; không hỏi lại primitive bằng màu ở bước shading.",
        },
        {
          title: "Dùng slab có bề dày",
          explanation:
            "Năm box mỏng tạo floor, ceiling và tường. Không dùng signed half-space âm vô hạn ở phía ngoài phòng.",
        },
        {
          title: "Checker chỉ là vật liệu",
          explanation:
            "Tọa độ world chọn màu ô trên floor; thay checker không được làm thay đổi hàm sampleScene.",
        },
      ],
    },
    "p36-l08": {
      focus: "Thêm một phép hỏi có giới hạn từ điểm chạm tới đèn.",
      expected:
        "Bóng di chuyển theo đèn; Pause dừng clock của đèn, không khóa các thao tác kiểm tra scene.",
      files: [
        "include/tracing.hpp",
        "include/room_frame.hpp",
        "include/room_controls.hpp",
        "shaders/raymarch.frag",
      ],
      steps: [
        {
          title: "Rời bề mặt bằng bias",
          explanation:
            "Dịch origin theo normal trước khi march shadow để tránh coi chính điểm chạm là vật cản.",
        },
        {
          title: "Công bố shadow budget",
          explanation:
            "Tối đa 64 mẫu trong GLSL. Hết budget là chưa giải quyết xong tia; bản này chọn tối bảo thủ, không tuyên bố thấy đèn.",
        },
        {
          title: "Tách thời gian khỏi camera",
          explanation:
            "elapsedSeconds chỉ điều khiển lightPosition. Space/N không reset camera, settings hoặc program generation.",
        },
      ],
    },
    "p36-l09": {
      focus: "Nối SDL input vào camera và tham số scene đang render.",
      expected:
        "Di chuyển và nhìn thật sự trong world; reset/focus loss nhả relative mouse, diagonal speed không tăng.",
      files: ["include/room_controls.hpp", "include/camera.hpp", "include/room_uniforms.hpp"],
      steps: [
        {
          title: "Nhìn bằng relative mouse",
          explanation:
            "Chỉ nhận xrel/yrel khi chuột phải đang giữ và SDL chấp nhận relative mode. Không xoay hệ tọa độ hay primitive thay camera.",
        },
        {
          title: "Đi theo basis camera",
          explanation:
            "Normalize input local trước khi nhân speed*dt; camera vẫn nhận input khi đèn đang pause.",
        },
        {
          title: "Thay dữ liệu qua uniform",
          explanation:
            "J/K và U/I đổi radius có clamp. Không compile lại shader chỉ vì một con số thay đổi.",
        },
      ],
    },
    "p36-l10": {
      focus: "So với nghiệm ray–sphere độc lập và đọc sai số có đơn vị.",
      expected:
        "Giải thích được vì sao near-miss có thể thuộc epsilon band và vì sao tiếp tuyến không dùng tolerance t=hitEpsilon.",
      files: [
        "include/raymarch_oracle.hpp",
        "include/room_controls.hpp",
        "include/room_overlay.hpp",
        "shaders/raymarch.frag",
        "tests/core_checks.hpp",
      ],
      steps: [
        {
          title: "Giải quadratic",
          explanation:
            "Tính hai nghiệm, lấy nghiệm không âm gần nhất; origin trong sphere dùng nghiệm thoát. Oracle không gọi SDF hoặc marchRay.",
        },
        {
          title: "Khảo sát hai sai số riêng",
          explanation:
            "Tiếp tuyến dùng sqrt(2*r*epsilon+epsilon²) cho sai số dọc tia. Normal dùng angular error so với hướng giải tích của sphere.",
        },
        {
          title: "Dùng debug đúng chỗ",
          explanation:
            "Steps cho chi phí, Hit cho kết quả và Normal cho hướng hình học. Tắt debug không đổi marcher hay làm ảnh Beauty tối theo budget.",
        },
      ],
    },
    "p36-l11": {
      focus: "Ghép ứng dụng, phép kiểm GPU thật và bản source hoàn chỉnh.",
      expected:
        "CPU/GPU checks và compile/link/interface recovery có bằng chứng riêng; ZIP chạy được, không cần Node hoặc ghép nguồn từ project khác.",
      files: [
        "include/room_application.hpp",
        "include/room_verify.hpp",
        "include/raymarch_renderer.hpp",
        "include/shader_program.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Đọc số đo GPU bằng float",
          explanation:
            "Diagnostic entry point dùng lại chính các hàm SDF/march/normal của sản phẩm rồi readback RGBA32F, không đo t bằng RGB8.",
        },
        {
          title: "Thử lỗi rồi phục hồi",
          explanation:
            "Tạo lỗi compile, link và type/missing uniform có giới hạn; last-good giữ nguyên, candidate bị xóa, bản đúng mới tăng generation.",
        },
        {
          title: "Nghiệm thu đúng bản tải về",
          explanation:
            "Build starter/checkpoints/final, CTest Debug/Release và kiểm runtime fallback riêng từng target. Nhả resource trước khi hủy context.",
        },
      ],
    },
  },
  references: {
    "p36-l01": [
      {
        label: "gl_VertexID",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml",
        kind: "OpenGL API",
      },
    ],
    "p36-l02": [{ label: "Camera ray", href: "/glossary#camera-ray", kind: "Thuật ngữ" }],
    "p36-l03": [
      {
        label: "Signed Distance Function",
        href: "/glossary#signed-distance-function",
        kind: "Thuật ngữ",
      },
    ],
    "p36-l04": [{ label: "Sphere tracing", href: "/glossary#sphere-tracing", kind: "Thuật ngữ" }],
    "p36-l05": [{ label: "SDF normal", href: "/glossary#sdf-normal", kind: "Thuật ngữ" }],
    "p36-l06": [
      {
        label: "Signed Distance Function",
        href: "/glossary#signed-distance-function",
        kind: "Thuật ngữ",
      },
    ],
    "p36-l07": [
      { label: "Material ID", href: "/glossary#ray-march-material-id", kind: "Thuật ngữ" },
    ],
    "p36-l08": [{ label: "Shadow ray", href: "/glossary#shadow-ray", kind: "Thuật ngữ" }],
    "p36-l09": [
      {
        label: "SDL_SetWindowRelativeMouseMode",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetWindowRelativeMouseMode",
        kind: "SDL API",
      },
    ],
    "p36-l10": [
      { label: "GPU debug view", href: "/glossary#ray-march-debug-view", kind: "Thuật ngữ" },
    ],
    "p36-l11": [
      {
        label: "glReadPixels",
        href: "https://registry.khronos.org/OpenGL-Refpages/gl4/html/glReadPixels.xhtml",
        kind: "OpenGL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
