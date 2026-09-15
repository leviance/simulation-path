import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p20-l01": {
      focus:
        "Dựng một quad 3D nghiêng bằng bốn TexturedVertex dùng chung, gắn UV vào từng corner và chia bề mặt thành đúng hai triangle có winding hướng về camera.",
      expected:
        "Checkpoint mở SDL3, project quad, vẽ cạnh ngoài cùng đường chéo chung. Bốn nhãn UV khớp corner; preset front/medium/steep/near chỉ đổi depth, không đổi topology hoặc UV.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Gắn UV vào cùng vertex với position",
          explanation:
            "TexturedVertex giữ camera-space XYZ và UV. Khi clipping sinh vertex mới ở bài 7, hai phần dữ liệu này buộc phải đi cùng nhau.",
        },
        {
          title: "Dùng bốn vertex cho hai triangle",
          explanation:
            "Hai face tham chiếu cùng corner 0 và 2 trên diagonal. Không sao chép vertex nghĩa là position và UV ở cạnh chung không thể lệch nhau.",
        },
        {
          title: "Project geometry trước khi tô texture",
          explanation:
            "Checkpoint đầu chỉ vẽ wireframe. Ta kiểm camera convention, aspect ratio và winding trước để lỗi texture về sau không lẫn với lỗi geometry.",
        },
      ],
    },
    "p20-l02": {
      focus:
        "Tạo checker texture trong CPU memory và biến một cặp UV liên tục thành texel index bằng nearest sampling có address mode rõ ràng.",
      expected:
        "Texture preview hiện bàn cờ 8×8. UV 1 clamp tới texel cuối; repeat quay về texel 0; UV âm repeat vẫn cho index dương hợp lệ.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Sinh texel theo row-major",
          explanation:
            "Texture2D giữ width, height và vector Color. Checker dùng parity của cellX+cellY; index vẫn là y×width+x như framebuffer.",
        },
        {
          title: "Address UV trước khi đổi sang integer",
          explanation:
            "Clamp giữ miền 0..1; repeat dùng value−floor(value), không dùng modulo nguyên cho số âm.",
        },
        {
          title: "Định nghĩa behavior tại UV bằng 1",
          explanation:
            "Clamp phải chọn width−1; repeat phải quay về 0. Test biên này ngăn truy cập texel width nằm ngoài array.",
        },
      ],
    },
    "p20-l03": {
      focus:
        "Tái dùng barycentric weights của top-left rasterizer để nội suy trực tiếp raw UV trong screen space và tạo đối chứng affine chạy được.",
      expected:
        "Quad được tô checker texture bằng affine UV. Preset front nhìn đúng; preset steep làm các ô bị kéo theo chiều sâu dù coverage và đường biên vẫn đúng.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ camera depth khi project vertex",
          explanation:
            "ScreenVertex cần screen position, raw UV và cameraDepth. Bước này chưa sửa perspective nhưng không vứt thông tin Z sau phép chia.",
        },
        {
          title: "Lấy λ tại pixel center",
          explanation:
            "Rasterizer chạy top-left coverage như Project 16 và trả λA/λB/λC cho đúng triangle đã chuẩn hóa winding.",
        },
        {
          title: "Nội suy UV affine có chủ đích",
          explanation:
            "uv=λA·uvA+λB·uvB+λC·uvC. Đây là baseline cần giữ để so sánh, không phải code tạm sẽ bị xóa ngay.",
        },
      ],
    },
    "p20-l04": {
      focus:
        "Chọn một pixel nằm trong quad và đo khoảng cách giữa affine UV với reference UV có bù camera depth, thay vì kết luận texture méo chỉ bằng mắt.",
      expected:
        "Pixel inspector báo barycentric sum gần 1, hai cặp UV cùng error. Front có error gần 0; steep tạo error dương rõ rệt ở vùng giữa face.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ pixel inspector trên chính raster sample",
          explanation:
            "Marker chỉ hợp lệ khi callback coverage thật sự nhận pixel. Inspector không tự ước lượng UV bằng một đường code khác.",
        },
        {
          title: "Dùng camera depths làm oracle",
          explanation:
            "Reference reweight mỗi λ bằng 1/z trước khi trộn UV. Bài sau sẽ suy ra vì sao phép reweight này đúng.",
        },
        {
          title: "Đo UV distance",
          explanation:
            "Khoảng cách Euclidean giữa hai cặp UV là zero khi cùng depth và tăng khi perspective distortion mạnh hơn.",
        },
      ],
    },
    "p20-l05": {
      focus:
        "Suy ra dữ liệu phải rời projection cùng mỗi vertex: oneOverZ, uOverZ và vOverZ, thay vì cố sửa raw UV sau khi đã nội suy sai.",
      expected:
        "Inspector hiện denominator dương. Mỗi projected vertex thỏa uOverZ=uv.x×oneOverZ và vOverZ=uv.y×oneOverZ; không có phép chia cho Z tại pixel trước khi nội suy.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Nhìn perspective divide như một phép đổi tham số",
          explanation:
            "Screen position chứa X/Z và Y/Z. Raw UV tuyến tính trên mặt phẳng 3D vì thế không còn tuyến tính theo khoảng cách screen.",
        },
        {
          title: "Chuẩn bị reciprocal attributes tại vertex",
          explanation:
            "Project vertex tính 1/z một lần rồi nhân nó với U và V. Ba đại lượng này sẽ dùng cùng λ ở pixel.",
        },
        {
          title: "Nội suy denominator riêng",
          explanation:
            "D=λA/zA+λB/zB+λC/zC. D chính là reciprocal depth tại sample và phải hữu hạn, dương cho triangle trước camera.",
        },
      ],
    },
    "p20-l06": {
      focus:
        "Nội suy u/z, v/z và 1/z bằng cùng barycentric weights, chia lại tại pixel rồi dùng corrected UV để sample texture.",
      expected:
        "Compare view cho thấy affine méo còn corrected checker co đều theo perspective. Front cho hai nửa giống nhau; steep làm sai khác rõ mà silhouette không đổi.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tính hai tử số",
          explanation: "U'=Σλi(ui/zi) và V'=Σλi(vi/zi). Không trộn raw UV vào bước này.",
        },
        {
          title: "Chia cả hai cho cùng denominator",
          explanation:
            "u=U'/D và v=V'/D. D gần zero bị từ chối thay vì tạo infinity rồi clamp texture coordinate.",
        },
        {
          title: "Giữ affine làm chế độ đối chứng",
          explanation:
            "Phím M và compare view chỉ đổi hàm interpolateUv; geometry, coverage, texture và address mode giữ nguyên.",
        },
      ],
    },
    "p20-l07": {
      focus:
        "Clip textured triangle tại near plane trong camera space, nội suy position cùng UV bằng một tham số t rồi mới tạo reciprocal attributes qua projection.",
      expected:
        "Preset near không phóng nổ hoặc làm mất cả quad. Intersection có z=near và UV nằm đúng trên cạnh; polygon 4 đỉnh chia thành hai triangle giữ checker liên tục.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Clip TexturedVertex chứ không chỉ Vec3",
          explanation:
            "intersectNearPlane giải t từ Z, dùng cùng t cho XYZ và UV rồi ghim output Z đúng near.",
        },
        {
          title: "Giữ polygon order khi chia fan",
          explanation:
            "Sutherland–Hodgman phát 0..4 vertex theo biên; triangle fan giữ winding và UV edge không cần sort lại.",
        },
        {
          title: "Chỉ tính 1/z sau clipping",
          explanation:
            "Vertex mới chưa project. projectVertex nhận UV đã clip rồi mới tạo 1/z, u/z, v/z; không nội suy reciprocal data bằng t camera-space.",
        },
      ],
    },
    "p20-l08": {
      focus:
        "Ghép quad, sampling, affine/correct interpolation, near clipping và controls thành một texture mapper có telemetry cùng CTest đầy đủ.",
      expected:
        "Bốn preset, M/C/T, drag, A/D, Space, single-step và reset hoạt động sau resize. CTest pass ở Debug/Release; title bar báo coverage, max UV error và selected texel.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Cho hai viewport dùng cùng scene",
          explanation:
            "Compare render affine và correct từ cùng quad, texture, clipping và rasterizer. Chỉ interpolation mode khác nhau.",
        },
        {
          title: "Khóa shared edge",
          explanation:
            "Hai face dùng chung vertex 0/2 và top-left rule. Diagonal có một owner, không nứt hoặc overdraw do coverage.",
        },
        {
          title: "Kiểm các trường hợp làm công thức lộ lỗi",
          explanation:
            "CTest dùng constant depth, steep depth, UV âm, UV=1, near crossing và raster callback count thay vì chỉ preset mặc định.",
        },
        {
          title: "Giữ runtime state nhỏ",
          explanation:
            "Preset, drag và animation chỉ sửa quad depths; texture source không được tạo lại mỗi frame hoặc đổi theo view mode.",
        },
      ],
    },
  },
  references: {
    "p20-l01": [
      { label: "UV coordinates", href: "/glossary#uv-coordinates", kind: "Thuật ngữ" },
      { label: "Mesh topology", href: "/glossary#mesh-topology", kind: "Thuật ngữ" },
      { label: "Winding order", href: "/glossary#winding-order", kind: "Thuật ngữ" },
    ],
    "p20-l02": [
      { label: "Texel", href: "/glossary#texel", kind: "Thuật ngữ" },
      { label: "Nearest sampling", href: "/glossary#nearest-texture-sampling", kind: "Thuật ngữ" },
      { label: "Texture address mode", href: "/glossary#texture-address-mode", kind: "Thuật ngữ" },
    ],
    "p20-l03": [
      { label: "Affine interpolation", href: "/glossary#affine-interpolation", kind: "Thuật ngữ" },
      {
        label: "Barycentric coordinates",
        href: "/glossary#barycentric-coordinates",
        kind: "Thuật ngữ",
      },
      { label: "Pixel center", href: "/glossary#pixel-center", kind: "Thuật ngữ" },
    ],
    "p20-l04": [
      { label: "Perspective divide", href: "/glossary#perspective-divide", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      { label: "Distance", href: "/glossary#distance", kind: "Thuật ngữ" },
    ],
    "p20-l05": [
      { label: "Reciprocal depth", href: "/glossary#reciprocal-depth", kind: "Thuật ngữ" },
      { label: "Camera space", href: "/glossary#camera-space", kind: "Thuật ngữ" },
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
    ],
    "p20-l06": [
      {
        label: "Perspective-correct interpolation",
        href: "/glossary#perspective-correct-interpolation",
        kind: "Thuật ngữ",
      },
      { label: "Texture mapping", href: "/glossary#texture-mapping", kind: "Thuật ngữ" },
      { label: "Reciprocal depth", href: "/glossary#reciprocal-depth", kind: "Thuật ngữ" },
    ],
    "p20-l07": [
      { label: "Clipping", href: "/glossary#clipping", kind: "Thuật ngữ" },
      { label: "Vertex attribute", href: "/glossary#vertex-attribute", kind: "Thuật ngữ" },
      { label: "Triangle fan", href: "/glossary#triangle-fan", kind: "Thuật ngữ" },
    ],
    "p20-l08": [
      { label: "Top-left rule", href: "/glossary#top-left-rule", kind: "Thuật ngữ" },
      { label: "Texture mapping", href: "/glossary#texture-mapping", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
