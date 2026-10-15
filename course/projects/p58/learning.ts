import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p58-l01": {
      focus: "Có một cube hiển thị được trước khi nói về chunk.",
      expected: "Cube xanh với ba mặt nhìn thấy; starter chỉ nền tối.",
      files: ["include/model.hpp", "include/mesh.hpp", "include/raster.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chạy starter",
          explanation: "Xác nhận window/renderer/texture và event loop chạy độc lập.",
        },
        {
          title: "Ghép sáu quad",
          explanation: "Dùng corners 0,1,2 và 0,2,3; cộng origin vào từng vertex.",
        },
        {
          title: "Đưa pixel lên SDL",
          explanation:
            "Rasterizer đã có trong bộ khung; LockTexture/copy từng hàng đúng pitch/UnlockTexture rồi RenderTexture.",
        },
      ],
    },
    "p58-l02": {
      focus: "Block là dữ liệu vật liệu, không phải pixel hoặc mesh.",
      expected: "Một Stone tại (7,7,7), bảng lớp y=7 có đúng một ô đặc.",
      files: ["include/model.hpp", "src/main.cpp"],
      steps: [
        { title: "Định nghĩa Block ID", explanation: "Air=0 để Chunk{} là toàn không khí." },
        {
          title: "Khóa layout bộ nhớ",
          explanation: "index=x+16*(z+16*y), kiểm bounds trước khi cast sang size_t.",
        },
        {
          title: "Đọc lại dữ liệu",
          explanation:
            "get/set và bảng lớp dùng cùng index; không lưu screen coordinates trong chunk.",
        },
      ],
    },
    "p58-l03": {
      focus: "Mesh là dữ liệu dẫn xuất từ toàn bộ block đặc.",
      expected: "Khối đặc 4096 block tạo 49152 triangles, kể cả các mặt tiếp giáp.",
      files: ["include/model.hpp", "include/mesh.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Duyệt y/z/x",
          explanation: "Thứ tự này đi tuần tự trong bộ nhớ và khớp index đã chọn.",
        },
        { title: "Bỏ Air", explanation: "Chỉ Air bị bỏ; không đọc neighbor hoặc cull mặt trong." },
        {
          title: "Tách rebuild khỏi present",
          explanation:
            "Dữ liệu/camera đổi mới đánh dấu dirty; pause không dựng lại geometry vô ích.",
        },
      ],
    },
    "p58-l04": {
      focus: "Nhìn hình để kiểm dữ liệu vật liệu theo độ sâu.",
      expected: "Bậc cao 4,5,6,7, tổng 1408 block với mặt đất xanh.",
      files: ["include/model.hpp", "include/mesh.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Lấp cột đến height",
          explanation: "x/4 là chia nguyên; y<height tránh thừa một lớp.",
        },
        {
          title: "Gán vật liệu từ dưới lên",
          explanation: "Mặc định Stone, ba lớp trên đổi Dirt, lớp trên cùng đổi Grass.",
        },
        {
          title: "Đổi preset",
          explanation: "Mỗi preset tạo Chunk mới; Air cho mesh rỗng mà không giữ hình cũ.",
        },
      ],
    },
    "p58-l05": {
      focus: "Camera chỉ thay hình chiếu, không thay block.",
      expected: "Xoay/zoom giữ số block và triangles; tắt Z-buffer làm mặt sau đè sai.",
      files: ["include/raster.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đổi sang camera space",
          explanation:
            "Trừ center, xoay yaw rồi pitch; depth lớn hơn gần hơn trong quy ước riêng này.",
        },
        {
          title: "Xử lý input",
          explanation: "Drag/arrow gọi orbit, zoom clamp; focus loss dừng và nhả capture.",
        },
        {
          title: "Đọc depth",
          explanation:
            "Barycentric nội suy depth tuyến tính vì trực giao; clear -infinity rồi so greater.",
        },
      ],
    },
    "p58-l06": {
      focus: "Đọc block từ bảng lớp mà không sửa dữ liệu gốc.",
      expected: "Giảm slice làm mesh ít đi nhưng solidCount không đổi; ô cho đúng index/Block ID.",
      files: ["include/mesh.hpp", "include/inspector.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Cắt hiển thị",
          explanation: "Bỏ y>slice trong buildMesh, không set Air vào Chunk.",
        },
        {
          title: "Chọn ô half-open",
          explanation: "Trừ panel origin, từ chối ngoài [0,256), chia cellSize thành x/z.",
        },
        {
          title: "Nối input với readout",
          explanation:
            "SDL chuyển event về logical coords; Canvas dùng CSS pixel và pointer capture.",
        },
      ],
    },
    "p58-l07": {
      focus: "Chứng minh bản nền đúng trước khi tối ưu ở Project 59.",
      expected: "CTest cả hai cấu hình đạt, smoke tự thoát, ZIP chứa tất cả snapshot độc lập.",
      files: ["include/audit.hpp", "tests/tests.cpp", "src/main.cpp"],
      steps: [
        {
          title: "Dùng fixture độc lập",
          explanation:
            "4096 index duy nhất, normals sáu phía, 1/4096/1408/0 block và hai cube vẫn 24 triangles.",
        },
        {
          title: "Kiểm depth và slice",
          explanation: "Đảo draw order kiểm depth, cắt mesh không đổi dữ liệu; tests không mở SDL.",
        },
        {
          title: "Build có giới hạn",
          explanation:
            "Debug/Release với parallel 2, CTest timeout và smoke một frame; desktop QA được tách riêng.",
        },
      ],
    },
  },
  references: {
    "p58-l01": [
      {
        label: "SDL_CreateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_CreateTexture",
        kind: "SDL API",
      },
      {
        label: "SDL_LockTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_LockTexture",
        kind: "SDL API",
      },
    ],
    "p58-l02": [{ label: "Voxel chunk", href: "/glossary#voxel-chunk-storage", kind: "Thuật ngữ" }],
    "p58-l03": [
      { label: "Mesh voxel chưa tối ưu", href: "/glossary#voxel-naive-mesh", kind: "Thuật ngữ" },
    ],
    "p58-l04": [{ label: "Block ID", href: "/glossary#voxel-block-id", kind: "Thuật ngữ" }],
    "p58-l05": [
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p58-l06": [
      { label: "Lớp cắt voxel", href: "/glossary#voxel-slice-inspector", kind: "Thuật ngữ" },
    ],
    "p58-l07": [
      { label: "CMake của SDL3", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "CMake" },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
