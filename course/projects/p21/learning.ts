import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p21-l01": {
      focus: "Chạy starter rồi đọc từng record v; kiểm position trước khi nối mặt.",
      expected:
        "18 position của rocket xuất hiện thành point cloud, có path/vertex count ở HUD và diagnostic theo dòng.",
      files: ["include/mesh.hpp", "include/obj-parser.hpp", "include/viewer.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy bộ khung SDL trước",
          explanation:
            "Theo renderViewer → SDL_UpdateTexture → presentFramebuffer để thấy dữ liệu mới cần nối vào đâu.",
        },
        {
          title: "Đọc một dòng thành một position",
          explanation:
            "Giữ lineNumber, bỏ comment và chỉ lưu XYZ khi đã đọc trọn dòng, hữu hạn, trong giới hạn.",
        },
        {
          title: "Project và vẽ marker",
          explanation:
            "drawPoints dùng modelToCamera, projectVertex và putPixel; chưa xử lý face hoặc normalize.",
        },
      ],
    },
    "p21-l02": {
      focus: "Đọc face triangle, đổi index một lần ở parser rồi vẽ ba cạnh từ indexed mesh.",
      expected:
        "Rocket có 18 position và 32 triangle; index 0 hoặc ngoài mảng bị báo lỗi, không tạo face một phần.",
      files: ["include/mesh.hpp", "include/obj-parser.hpp", "include/viewer.hpp"],
      steps: [
        {
          title: "Giữ topology bằng index",
          explanation:
            "ObjTriangle lưu ba index nội bộ cùng sourceFace/sourceLine, không chép lại XYZ.",
        },
        {
          title: "Kiểm trước khi cast",
          explanation:
            "from_chars phải đọc hết token; kiểm khoảng hợp lệ bằng kiểu có dấu rồi mới đổi sang size_t.",
        },
        {
          title: "Nối các cạnh của mesh",
          explanation:
            "drawMeshEdges đọc position qua index và gửi các đoạn tới framebuffer; wireframe chưa có hidden-surface removal.",
        },
      ],
    },
    "p21-l03": {
      focus:
        "Mở rộng resolver cho bốn dạng face token và index âm, không thêm quy ước file vào renderer.",
      expected:
        "Cùng position index tạo cùng geometry dù token có slash; -1 trỏ position mới nhất tại dòng face.",
      files: ["include/obj-parser.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Nhận đúng cú pháp suffix",
          explanation:
            "v/vt, v//vn, v/vt/vn hợp lệ; 1/, 1///2 và suffix 0 bị từ chối. Thuộc tính chưa dùng chỉ được kiểm cú pháp.",
        },
        {
          title: "Resolve relative index tại dòng face",
          explanation: "Nhánh dương dùng raw−1, nhánh âm dùng positionCount+raw bằng kiểu có dấu.",
        },
        {
          title: "Giữ cùng hợp đồng nội bộ",
          explanation:
            "Mọi nhánh trả index 0-based đã kiểm, nên code thêm triangle và vẽ cạnh không đổi.",
        },
      ],
    },
    "p21-l04": {
      focus: "Dùng fan cho polygon phẳng, lồi và báo rõ trường hợp thuật toán không hỗ trợ.",
      expected:
        "Pentagon tạo ba triangle cùng mốc corner 0; cube có sáu source face và 12 triangle.",
      files: ["include/obj-parser.hpp", "include/mesh.hpp", "assets/cube.obj"],
      steps: [
        {
          title: "Kiểm toàn bộ corner",
          explanation:
            "Một token sai làm cả face bị bỏ; không giữ triangle con từ phần đầu còn hợp lệ.",
        },
        {
          title: "Kiểm polygon trước khi fan",
          explanation:
            "Face phải phẳng, mọi corner cùng phía mỗi cạnh, không có corner trùng; không dùng fan cho mặt lõm.",
        },
        {
          title: "Giữ winding và xuất xứ",
          explanation:
            "Tạo (0,i,i+1) đúng N−2 lần, giữ sourceFace/sourceLine trên mọi triangle con.",
        },
      ],
    },
    "p21-l05": {
      focus:
        "Tính bounds rồi dùng một uniform scale; xử lý file lệch origin hoặc khác đơn vị mà không làm méo hình.",
      expected: "Tâm bounds mới gần origin, cạnh lớn nhất bằng 2; tỷ lệ các extent không đổi.",
      files: ["include/normalize.hpp", "include/viewer.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Lấy min/max từ dữ liệu thật",
          explanation: "Bắt đầu bằng position đầu tiên, không để origin giả làm rộng bounds.",
        },
        {
          title: "Center rồi scale",
          explanation: "Trừ (min+max)/2 và nhân 2/maxExtent cho cả XYZ; topology giữ nguyên.",
        },
        {
          title: "Nạp một lần, không sửa mỗi frame",
          explanation:
            "Normalize mesh tạm khi mở file; bounds rỗng/co thành điểm báo lỗi trước khi thay model.",
        },
      ],
    },
    "p21-l06": {
      focus:
        "Tính face normal từ geometry, dùng cùng không gian cho culling và Lambert, rồi kiểm bằng normals overlay.",
      expected:
        "Cube có mặt sáng/tối rõ, normals đổi hướng khi đảo winding; painter ở mốc này chưa giải quyết occlusion.",
      files: ["include/shading.hpp", "include/raster.hpp", "include/viewer.hpp"],
      steps: [
        {
          title: "Kiểm cross product trước normalize",
          explanation: "Triangle thẳng hàng không có normal xác định và không đi tiếp vào shading.",
        },
        {
          title: "Tách culling khỏi ánh sáng",
          explanation:
            "Dot với centroid quyết định front-facing; dot với hướng tới nguồn sáng quyết định diffuse.",
        },
        {
          title: "Ghi màu bằng CPU",
          explanation:
            "Rasterizer gọi callback ghi màu RGBA vào framebuffer; SDL chỉ trình bày kết quả.",
        },
      ],
    },
    "p21-l07": {
      focus:
        "Ghép near clipping → projection → top-left → Z-buffer cho toàn bộ mesh, đo trên asset lớn thật.",
      expected:
        "Sphere 2.976 triangle render được; đảo thứ tự không đổi color/depth và pixel khớp ray–triangle reference.",
      files: [
        "include/render.hpp",
        "include/raster.hpp",
        "tests/reference.hpp",
        "assets/faceted-sphere.obj",
      ],
      steps: [
        {
          title: "Clip trước khi chia perspective",
          explanation:
            "Giao cạnh chung được tính nhất quán; polygon sau clip có thể sinh hai triangle.",
        },
        {
          title: "Transform position dùng chung một lần",
          explanation:
            "cameraPositions được dựng trước vòng face, tránh lặp phép quay/view cho từng corner.",
        },
        {
          title: "Depth quyết định color",
          explanation:
            "Chỉ fragment có NDC depth hợp lệ và gần hơn mới ghi cả depth lẫn color cùng index.",
        },
      ],
    },
    "p21-l08": {
      focus:
        "Hoàn thiện viewer nhiều model, camera orbit độc lập, file loading có giao dịch và kiểm thử toàn pipeline.",
      expected:
        "Cube/rocket/sphere mở từ file; wireframe/normals/debug, resize, pause/step và file lỗi có hành vi rõ ràng.",
      files: [
        "include/geometry.hpp",
        "include/viewer.hpp",
        "include/controls.hpp",
        "include/presentation.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
        "tests/reference.hpp",
      ],
      steps: [
        {
          title: "Tách model và camera",
          explanation:
            "V chọn thao tác; turnViewer chỉ sửa model angle hoặc camera yaw/pitch, không sửa cả hai.",
        },
        {
          title: "Giữ model cũ nếu mở file lỗi",
          explanation:
            "openModel parse và normalize biến tạm trước khi gán; file drop và CLI path dùng cùng loader.",
        },
        {
          title: "Nghiệm thu bằng input và pixel thật",
          explanation:
            "Debug/Release CTest kiểm ba asset, ray–triangle depth, order independence và overlays; smoke có tám frame hữu hạn.",
        },
      ],
    },
  },
  references: {
    "p21-l01": [
      { label: "Wavefront OBJ", href: "/glossary#wavefront-obj", kind: "Thuật ngữ" },
      { label: "Point cloud", href: "/glossary#point-cloud", kind: "Thuật ngữ" },
      { label: "Input stream", href: "/glossary#input-stream", kind: "Thuật ngữ" },
    ],
    "p21-l02": [
      { label: "OBJ face index", href: "/glossary#obj-face-index", kind: "Thuật ngữ" },
      { label: "Indexed mesh", href: "/glossary#indexed-mesh", kind: "Thuật ngữ" },
      { label: "Wireframe", href: "/glossary#wireframe", kind: "Thuật ngữ" },
    ],
    "p21-l03": [
      { label: "OBJ face token", href: "/glossary#obj-face-token", kind: "Thuật ngữ" },
      { label: "OBJ face index", href: "/glossary#obj-face-index", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p21-l04": [
      { label: "Triangle fan", href: "/glossary#triangle-fan", kind: "Thuật ngữ" },
      { label: "Winding", href: "/glossary#winding-order", kind: "Thuật ngữ" },
      { label: "Polygon", href: "/glossary#polygon", kind: "Thuật ngữ" },
    ],
    "p21-l05": [
      { label: "Mesh normalization", href: "/glossary#mesh-normalization", kind: "Thuật ngữ" },
      { label: "Bounding box", href: "/glossary#bounding-box", kind: "Thuật ngữ" },
      { label: "Uniform scale", href: "/glossary#uniform-scale", kind: "Thuật ngữ" },
    ],
    "p21-l06": [
      { label: "Face normal", href: "/glossary#face-normal", kind: "Thuật ngữ" },
      { label: "Lambert diffuse", href: "/glossary#lambert-diffuse", kind: "Thuật ngữ" },
      { label: "Back-face culling", href: "/glossary#back-face-culling", kind: "Thuật ngữ" },
    ],
    "p21-l07": [
      { label: "Near plane", href: "/glossary#near-plane", kind: "Thuật ngữ" },
      { label: "Depth buffer", href: "/glossary#depth-buffer", kind: "Thuật ngữ" },
      { label: "Rasterization", href: "/glossary#rasterization", kind: "Thuật ngữ" },
    ],
    "p21-l08": [
      { label: "Diagnostic", href: "/glossary#diagnostic", kind: "Thuật ngữ" },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Wavefront OBJ", href: "/glossary#wavefront-obj", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
