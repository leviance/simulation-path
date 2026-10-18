import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p01-l01": {
      focus: "Viết bộ khung SDL từ đầu, biết mỗi tài nguyên được tạo ở đâu và hủy lúc nào.",
      expected:
        "Cửa sổ 960×540 có nền xanh đen; kéo/đóng bình thường và Escape kết thúc event loop.",
      files: ["src/main.cpp", "CMakeLists.txt"],
      steps: [
        {
          title: "Chạy starter trước",
          explanation:
            "Starter chỉ in một dòng để xác nhận toolchain. Bài 01 thêm SDL_Init, window và renderer; không giấu sẵn một hệ thống vẽ chưa được giải thích.",
        },
        {
          title: "Đọc event rồi mới vẽ",
          explanation:
            "PollEvent lấy hết event đang chờ. Phần vẽ nằm ngoài vòng đó; running=false được kiểm trước khi vẽ tiếp.",
        },
        {
          title: "Báo lỗi và dọn tài nguyên",
          explanation:
            "Kiểm bool/pointer ngay sau lời gọi SDL. Hủy renderer trước window và SDL_Quit; Delay chỉ nhường CPU, không phải FPS cap.",
        },
      ],
    },
    "p01-l02": {
      focus: "Tự tính vị trí trên ảnh 4×3 trước khi dùng công thức cho cửa sổ lớn.",
      expected:
        "Có 12 phần tử, góc cuối index 11; resize không hợp lệ giữ nguyên kích thước và pixel cũ.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt hợp đồng dữ liệu",
          explanation:
            "Framebuffer rỗng lúc mới tạo. Sau resize thành công, vector có đúng width×height phần tử; index chỉ nhận tọa độ đã hợp lệ.",
        },
        {
          title: "Cấp phát trước, đổi state sau",
          explanation:
            "Kiểm đầu vào và budget trước phép nhân, cấp phát vector tạm rồi swap. Đây là cách tránh đổi width khi vùng nhớ mới chưa tồn tại.",
        },
        {
          title: "Kiểm ở RAM trước",
          explanation:
            "Bài này in kích thước và xem vector trong debugger. Cửa sổ chưa hiển thị framebuffer; bài 03 sẽ xây đường đưa pixel lên màn hình.",
        },
      ],
    },
    "p01-l03": {
      focus: "Đi trọn đường của một pixel: RGBA → số 32 bit → putPixel → texture → cửa sổ.",
      expected:
        "Dấu cộng xanh được tạo bằng CPU. Texture copy RGB trực tiếp; tọa độ ngoài biên không sửa pixel nào.",
      files: ["include/lab.hpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách giá trị số khỏi byte order",
          explanation:
            "0xRRGGBBAA khớp packed RGBA8888. Little-endian đặt byte thấp trước; không nhầm với định dạng RGBA32 theo byte array.",
        },
        {
          title: "Kiểm biên rồi mới ghi",
          explanation:
            "Giữ x/y là int để chặn số âm, sau đó mới gọi index. clear dùng std::fill vì nó duyệt toàn bộ phần tử đang tồn tại.",
        },
        {
          title: "Giải thích presentation ngay khi dùng",
          explanation:
            "Tạo streaming texture, chọn BLENDMODE_NONE, tính pitch theo byte, upload, copy và present. Không để lời gọi SDL xuất hiện trước phần giải thích.",
        },
      ],
    },
    "p01-l04": {
      focus: "Dùng bốn mẫu để hiểu từng kiểu duyệt và phát hiện lỗi màu, tọa độ, thứ tự pixel.",
      expected:
        "1 Solid, 2 Gradient, 3 Checker, 4 Noise; -/= đổi cell, N đổi seed và noise đứng yên khi không đổi đầu vào.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Làm solid rồi gradient",
          explanation:
            "Solid kiểm toàn ảnh đã được ghi; gradient dùng width−1/height−1, chia số thực rồi cắt về uint8_t. Ảnh một hàng/cột có quy tắc rõ.",
        },
        {
          title: "Chia ô và sinh noise",
          explanation:
            "Checker dựa vào tổng tọa độ ô. Noise đi đúng một lượt vector bằng LCG uint32_t; seed=17 cho fixture biết trước.",
        },
        {
          title: "Nối phím với state",
          explanation:
            "Phím chỉ đổi pattern/cell/seed và đặt dirty. Vòng vẽ tạo và upload ảnh một lần sau các thay đổi, không sinh lại noise mỗi frame.",
        },
      ],
    },
    "p01-l05": {
      focus: "Giữ kích thước CPU/texture đúng pixel output trong suốt resize và phục hồi cửa sổ.",
      expected:
        "Ảnh được tính lại ở kích thước mới, không chỉ co giãn texture; minimize không tạo buffer 0×0.",
      files: ["include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc output thật",
          explanation:
            "Sau PollEvent, GetRenderOutputSize trả kích thước vùng renderer theo pixel. Không lấy window coordinates làm số phần tử framebuffer.",
        },
        {
          title: "Thay cả cặp tài nguyên",
          explanation:
            "Tạo Framebuffer tạm và texture mới. Chỉ commit khi cả hai thành công; thất bại không để CPU/texture lệch nhau.",
        },
        {
          title: "Tách resize khỏi redraw",
          explanation:
            "Chỉ kích thước đổi mới cấp phát. Minimize/zero output tạm bỏ qua; kích thước giữ nguyên chỉ tiếp tục copy texture đang có.",
        },
      ],
    },
    "p01-l06": {
      focus: "Chứng minh dữ liệu đúng bằng fixture độc lập rồi kiểm presentation và desktop riêng.",
      expected:
        "CTest đạt Debug/Release; final --smoke tự thoát sau 12 lần resize. Bốn scene, input và minimize được tự kiểm trực tiếp.",
      files: ["tests/tests.cpp", "include/smoke.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Test có thể thất bại ở Release",
          explanation:
            "check tăng failures và main trả EXIT_FAILURE; không dùng assert bị NDEBUG loại bỏ. Các expected value nhỏ được tính độc lập.",
        },
        {
          title: "Kiểm cả dữ liệu không hợp lệ",
          explanation:
            "Ảnh 1×1/1×N/N×1, tọa độ âm, cell≤0 và kích thước quá lớn đều có test. Resize thất bại phải giữ cả dữ liệu cũ.",
        },
        {
          title: "Không đánh đồng các loại kiểm tra",
          explanation:
            "CTest không mở SDL. Smoke ẩn kiểm upload/present hữu hạn; kéo resize, đổi DPI và input thật vẫn cần desktop QA.",
        },
      ],
    },
  },
  references: {
    "p01-l01": [
      { label: "SDL_Init", href: "https://wiki.libsdl.org/SDL3/SDL_Init", kind: "SDL API" },
      {
        label: "SDL_PollEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_PollEvent",
        kind: "SDL API",
      },
      { label: "SDL CMake", href: "https://wiki.libsdl.org/SDL3/README-cmake", kind: "SDL API" },
      { label: "Event loop", href: "/glossary#event-loop", kind: "Thuật ngữ" },
    ],
    "p01-l02": [
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
      { label: "Bounds check", href: "/glossary#bounds-check", kind: "Thuật ngữ" },
    ],
    "p01-l03": [
      {
        label: "SDL_PixelFormat",
        href: "https://wiki.libsdl.org/SDL3/SDL_PixelFormat",
        kind: "SDL API",
      },
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
      {
        label: "SDL_SetTextureBlendMode",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetTextureBlendMode",
        kind: "SDL API",
      },
      { label: "Pitch / stride", href: "/glossary#pitch-stride", kind: "Thuật ngữ" },
    ],
    "p01-l04": [
      { label: "Framebuffer", href: "/glossary#framebuffer", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
    "p01-l05": [
      {
        label: "SDL_GetRenderOutputSize",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetRenderOutputSize",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
      { label: "Streaming texture", href: "/glossary#streaming-texture", kind: "Thuật ngữ" },
    ],
    "p01-l06": [
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      { label: "Checkpoint", href: "/glossary#checkpoint", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
