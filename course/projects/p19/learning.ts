import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p19-l01": {
      focus:
        "Dựng một tetrahedron bằng bốn vertex dùng chung và bốn face chứa index, thay vì sao chép mười hai vertex thành bốn triangle rời rạc.",
      expected:
        "Checkpoint mở cửa sổ SDL3, tạo CPU framebuffer và vẽ đúng sáu cạnh của tetrahedron từ face indices. Tab đổi face đang theo dõi; resize không làm projection sai tỉ lệ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách position khỏi topology",
          explanation:
            "Mesh có một array vertex và một array face. Mỗi face chỉ giữ ba index cùng baseColor, nên một vertex được transform đúng một lần rồi dùng lại ở ba face kề.",
        },
        {
          title: "Khóa winding ngay trong dữ liệu",
          explanation:
            "Bốn bộ index không được xếp tùy ý. Chúng được chọn sao cho cross(B−A,C−A) hướng ra ngoài; bài sau sẽ kiểm điều này bằng số.",
        },
        {
          title: "Dựng bộ khung SDL tối thiểu",
          explanation:
            "Window, renderer, streaming texture và framebuffer đã có từ các project trước nhưng vẫn được viết đầy đủ để checkpoint chạy độc lập.",
        },
      ],
    },
    "p19-l02": {
      focus:
        "Tính unit face normal từ hai cạnh trong đúng không gian tọa độ và chứng minh normal đang hướng ra ngoài tetrahedron.",
      expected:
        "Normal của face được chọn hiện thành mũi tên trắng; độ dài xấp xỉ 1, dot với hai cạnh xấp xỉ 0 và outward test của cả bốn face đều pass.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tạo hai vector cạnh có cùng gốc",
          explanation:
            "Từ triangle A–B–C, edgeAB=B−A và edgeAC=C−A. Cross product của hai vector này vuông góc với mặt phẳng face.",
        },
        {
          title: "Chuẩn hóa trước khi đo góc",
          explanation:
            "Raw normal còn mang diện tích của triangle. Lighting cần hướng đơn vị, nên normalize và xử lý vector quá ngắn trước khi dùng dot product.",
        },
        {
          title: "Dùng centroid để kiểm winding",
          explanation:
            "Với tetrahedron đặt quanh local origin, dot(rawNormal,faceCentroid)>0 nghĩa là normal chỉ từ tâm mesh ra face.",
        },
      ],
    },
    "p19-l03": {
      focus:
        "Đặt một quy ước duy nhất cho directional light và làm cho tên biến nói rõ vector chỉ từ bề mặt về nguồn sáng.",
      expected:
        "Bốn preset front/top/side/back tạo unit surfaceToLight. Mũi tên vàng và ba thành phần XYZ đổi cùng dữ liệu; không có bước đảo dấu bí mật khi lấy dot.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Phân biệt hướng tới đèn với hướng tia sáng",
          explanation:
            "Tia sáng truyền từ đèn tới surface, còn công thức Lambert ở đây dùng vector ngược lại. Tên surfaceToLight loại bỏ câu hỏi phải đặt dấu trừ ở đâu.",
        },
        {
          title: "Chuẩn hóa directional light một lần",
          explanation:
            "Directional light chỉ cần hướng, không cần position. makeDirectionalLight biến input bất kỳ độ dài thành unit vector trước khi frame loop dùng lại.",
        },
        {
          title: "Dùng preset để bắt lỗi dấu",
          explanation:
            "Front và back là một cặp đối chứng. Nếu cả hai làm cùng một face sáng như nhau, code đã dùng abs(dot) hoặc đảo hướng ở sai chỗ.",
        },
      ],
    },
    "p19-l04": {
      focus:
        "Đổi góc giữa face normal và surfaceToLight thành hệ số diffuse bằng dot product đã clamp.",
      expected:
        "Face cùng hướng đèn cho diffuse gần 1; vuông góc cho 0; quay lưng có dot âm nhưng diffuse vẫn bằng 0. Đổi camera không tự làm diffuse đổi.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đọc dot như cosine",
          explanation:
            "Khi N và L đều là unit vector, dot(N,L)=cos(theta). Ta có ngay một hệ số giảm từ 1 về 0 khi face nghiêng khỏi đèn.",
        },
        {
          title: "Clamp phần âm",
          explanation:
            "Ánh sáng diffuse không đi xuyên qua mặt kín từ phía sau. max(0,dot) giữ dot thô để chẩn đoán nhưng không cho nó trừ độ sáng.",
        },
        {
          title: "Tách light khỏi camera",
          explanation:
            "Lambert diffuse dùng N và L; vector tới camera chỉ xuất hiện ở back-face culling. Sự tách biệt này sẽ quan trọng khi thêm specular về sau.",
        },
      ],
    },
    "p19-l05": {
      focus:
        "Biến diffuse thành intensity có ambient, rồi nhân hệ số ánh sáng với baseColor của material mà không làm tròn quá sớm.",
      expected:
        "Mặt quay lưng đèn vẫn giữ đúng ambient; mặt nhận toàn bộ diffuse trở về baseColor. RGB double chỉ đổi sang byte tại putPixel.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ material và light thành hai dữ liệu riêng",
          explanation:
            "baseColor thuộc bề mặt; surfaceToLight thuộc nguồn sáng. ambient và diffuseStrength cho biết material nhận hai thành phần ánh sáng mạnh tới đâu.",
        },
        {
          title: "Tính một intensity có giới hạn",
          explanation:
            "intensity=clamp(ambient+diffuseStrength×diffuse,0,1). Cặp 0.16 và 0.84 giúp mặt sáng nhất vừa đạt 1 mà không cháy màu.",
        },
        {
          title: "Nhân từng channel ở dạng double",
          explanation:
            "Mỗi channel baseColor được nhân cùng intensity. Làm tròn chỉ khi pack RGBA giúp các phép tính và test không mất độ chính xác giữa pipeline.",
        },
      ],
    },
    "p19-l06": {
      focus:
        "Xoay geometry, tính lại normal trong camera space và loại face quay lưng camera trước khi chuyển sang clipping cùng rasterization.",
      expected:
        "Drag hoặc WASD/arrow đổi pitch/yaw; độ dài cạnh không đổi. visible+culled luôn bằng 4 và face được giữ thỏa dot(normal,toCamera)>0.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Transform vertex dùng chung đúng một lần",
          explanation:
            "Mọi local vertex được rotateX, rotateY rồi translate tới Z=5. Face indices tiếp tục tham chiếu array camera-space mới.",
        },
        {
          title: "Tính normal từ geometry đã xoay",
          explanation:
            "Project này chưa cần normal matrix vì không có non-uniform scale: ta recompute cross product trực tiếp từ ba camera-space vertex, cách rõ ràng và khó dùng sai.",
        },
        {
          title: "Cull bằng hướng tới camera",
          explanation:
            "Camera nằm ở origin, nên toCamera=normalize(−faceCentroid). Dot dương nghĩa là outward normal có thành phần hướng về camera và face có thể nhìn thấy.",
        },
      ],
    },
    "p19-l07": {
      focus:
        "Ghép một frame hoàn chỉnh theo thứ tự transform → normal → lighting → cull → near clip → project → rasterize và khóa các invariant bằng CTest.",
      expected:
        "Tetrahedron được tô kín, không nứt cạnh, không NaN; telemetry báo dot, diffuse, intensity, visible/culled, triangle và pixel. Tất cả controls cùng tests hoạt động.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chốt màu trước khi clip",
          explanation:
            "Flat shading tạo đúng một shadedColor cho face gốc. Mọi triangle sinh ra từ near clipping của face đó dùng cùng màu, nên giao điểm không tạo gradient giả.",
        },
        {
          title: "Giữ thứ tự pipeline an toàn",
          explanation:
            "Cull chạy trên face camera-space; near clip chạy trước phép chia Z; projection chỉ nhận vertex an toàn; top-left rasterizer quyết định pixel cuối cùng.",
        },
        {
          title: "Đo thay vì chỉ nhìn",
          explanation:
            "Title bar và CTest đọc dữ liệu từ chính hàm production: unit normal, intensity range, face counts, near constraint và callback coverage.",
        },
        {
          title: "Dùng controls như các phép thử nhỏ",
          explanation:
            "Front/back light bắt lỗi hướng; L tách baseColor khỏi lighting; N kiểm normal; pause và single-step giúp đối chiếu hai frame gần nhau.",
        },
      ],
    },
  },
  references: {
    "p19-l01": [
      { label: "Mesh topology", href: "/glossary#mesh-topology", kind: "Thuật ngữ" },
      { label: "Vertex index", href: "/glossary#vertex-index", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
    ],
    "p19-l02": [
      { label: "Face normal", href: "/glossary#face-normal", kind: "Thuật ngữ" },
      { label: "Cross product", href: "/glossary#cross-product", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
    ],
    "p19-l03": [
      { label: "Directional light", href: "/glossary#directional-light", kind: "Thuật ngữ" },
      { label: "Normalization", href: "/glossary#normalization", kind: "Thuật ngữ" },
      { label: "Face normal", href: "/glossary#face-normal", kind: "Thuật ngữ" },
    ],
    "p19-l04": [
      { label: "Lambert diffuse", href: "/glossary#lambert-diffuse", kind: "Thuật ngữ" },
      { label: "Dot product", href: "/glossary#dot-product", kind: "Thuật ngữ" },
      { label: "Bounds check", href: "/glossary#bounds-check", kind: "Thuật ngữ" },
    ],
    "p19-l05": [
      { label: "Ambient light", href: "/glossary#ambient-light", kind: "Thuật ngữ" },
      { label: "Material", href: "/glossary#material", kind: "Thuật ngữ" },
      { label: "Alpha channel", href: "/glossary#alpha-channel", kind: "Thuật ngữ" },
    ],
    "p19-l06": [
      { label: "Back-face culling", href: "/glossary#back-face-culling", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      { label: "3D rotation", href: "/glossary#rotation-3d", kind: "Thuật ngữ" },
    ],
    "p19-l07": [
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
