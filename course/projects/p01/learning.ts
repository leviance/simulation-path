import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p01-l01": {
      focus:
        "Dựng bộ khung đầu tiên của ứng dụng SDL3: khởi tạo phần video, tạo window và renderer, xử lý sự kiện trong vòng lặp rồi giải phóng tài nguyên đúng thứ tự.",
      expected:
        "Cửa sổ 960×540 có nền xanh đen, vẫn phản hồi khi kéo hoặc thu nhỏ và đóng được bằng nút Close lẫn phím Escape.",
      files: ["src/main.cpp", "CMakeLists.txt"],
      steps: [
        {
          title: "Kiểm tra ngay khi khởi tạo",
          explanation:
            "Trong SDL3, SDL_Init trả về bool. Nếu nhận false, hãy in SDL_GetError() và dừng chương trình; không tiếp tục tạo cửa sổ từ một trạng thái lỗi.",
        },
        {
          title: "Đặt phần vẽ ngoài SDL_PollEvent",
          explanation:
            "SDL_PollEvent chỉ lấy các sự kiện đang chờ. Phần cập nhật và vẽ phải nằm ngoài vòng này để chương trình vẫn tạo khung hình khi người dùng không thao tác.",
        },
        {
          title: "Dọn dẹp theo thứ tự ngược",
          explanation:
            "Renderer được hủy trước window, sau đó mới gọi SDL_Quit. Đây là chiều ngược lại với thứ tự các tài nguyên đã được tạo.",
        },
      ],
    },
    "p01-l02": {
      focus:
        "Tạo kiểu Framebuffer gồm width, height và một vector pixel lưu theo row-major; dùng std::size_t khi tính số phần tử trong bộ nhớ.",
      expected:
        "Framebuffer 4×3 chứa đúng 12 pixel. Pixel góc trái có index 0, còn pixel góc phải dưới có index 11.",
      files: ["include/lab.hpp"],
      steps: [
        {
          title: "Để vector quản lý bộ nhớ",
          explanation:
            "std::vector<uint32_t> tự cấp phát, tự giải phóng và đặt các pixel liền nhau trong RAM; sau này có thể truyền pixels.data() cho SDL_UpdateTexture.",
        },
        {
          title: "Đổi từ hai chiều sang một chiều",
          explanation:
            "Công thức index = y × width + x đi qua y hàng hoàn chỉnh, rồi tiến thêm x phần tử trong hàng hiện tại.",
        },
        {
          title: "Resize cập nhật mọi thứ cùng lúc",
          explanation:
            "Hàm resize chặn width và height tối thiểu bằng 1, sau đó tạo lại chính xác width × height phần tử.",
        },
      ],
    },
    "p01-l03": {
      focus:
        "Đóng gói bốn kênh RGBA vào uint32_t và viết putPixel để mọi phép ghi theo tọa độ đều dùng chung một bước kiểm tra biên.",
      expected:
        "Pixel nằm trong biên đổi sang đúng màu. Tọa độ âm hoặc vượt quá width/height được bỏ qua mà không làm thay đổi vector.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chuyển kiểu trước khi dịch bit",
          explanation:
            "Chuyển uint8_t thành uint32_t trước phép dịch để người đọc biết rõ phép toán đang diễn ra trên 32 bit.",
        },
        {
          title: "Kiểm tra biên trước khi tính index",
          explanation:
            "Không gọi index với x hoặc y âm: khi chuyển sang size_t, số âm sẽ biến thành một chỉ số dương rất lớn.",
        },
        {
          title: "Thử cả tọa độ hợp lệ lẫn không hợp lệ",
          explanation:
            "Ghi vào góc cuối để xác nhận cách tính vị trí; so sánh vector trước và sau một lần ghi ngoài biên để chắc chắn dữ liệu không bị thay đổi.",
        },
      ],
    },
    "p01-l04": {
      focus:
        "Dùng tọa độ pixel để tạo gradient, checkerboard và noise có thể lặp lại; ba mẫu hình đồng thời kiểm tra màu sắc, cách tính vị trí và việc phủ kín framebuffer.",
      expected:
        "Các phím 1, 2, 3 chuyển được giữa ba mẫu. Gradient đạt đủ hai đầu màu, checkerboard xen kẽ đúng kích thước ô và cùng một seed luôn tạo cùng một ảnh noise.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Gradient đi hết dải màu",
          explanation:
            "Chia x cho width−1 và y cho height−1 để pixel đầu nhận 0, pixel cuối nhận 255; max(1, …) tránh chia cho 0 với ảnh chỉ có một pixel.",
        },
        {
          title: "Chọn màu checkerboard bằng chẵn lẻ",
          explanation:
            "x/cell và y/cell cho biết pixel thuộc ô nào. Tổng hai tọa độ ô là chẵn hay lẻ sẽ quyết định màu.",
        },
        {
          title: "Noise dùng seed cố định",
          explanation:
            "Linear congruential generator tạo cùng một chuỗi khi dùng cùng seed, vì vậy kết quả có thể được kiểm tra lại chính xác.",
        },
      ],
    },
    "p01-l05": {
      focus:
        "Cập nhật streaming texture bằng framebuffer trên CPU với pitch tính theo byte, hiển thị texture và tạo lại tài nguyên khi kích thước pixel của cửa sổ thay đổi.",
      expected:
        "Ảnh lấp đầy cửa sổ ở mọi kích thước. Resize liên tục không làm chương trình dừng, không làm lệch hàng pixel và không dùng lại texture đã hủy.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Pitch không phải là width",
          explanation:
            "SDL_UpdateTexture cần khoảng cách tính bằng byte giữa hai hàng, nên pitch bằng width × sizeof(uint32_t), không chỉ bằng width.",
        },
        {
          title: "Dùng sự kiện kích thước pixel",
          explanation:
            "SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED cung cấp số pixel thật của vùng hiển thị, đặc biệt quan trọng trên màn hình high-DPI.",
        },
        {
          title: "Chỉ thay tài nguyên khi cặp mới đã sẵn sàng",
          explanation:
            "Tạo framebuffer và texture mới trước. Nếu tạo texture thất bại, không thay đổi cặp tài nguyên đang dùng.",
        },
      ],
    },
    "p01-l06": {
      focus:
        "Dùng kiểm thử C++ để xác nhận các điều kiện luôn phải đúng, sau đó build và chạy lại bản hoàn chỉnh của project bằng CMake.",
      expected:
        "CTest báo toàn bộ phép kiểm thử đều đạt. Target project_1_final hiển thị đủ ba mẫu và vẫn hoạt động sau nhiều lần resize.",
      files: ["tests/tests.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Kiểm tra phần C++ mà không cần SDL",
          explanation:
            "Chương trình test include lab.hpp nhưng không mở cửa sổ, nhờ vậy chạy nhanh trong terminal và dùng được trên CI.",
        },
        {
          title: "Kiểm tra điều luôn phải đúng",
          explanation:
            "Số phần tử, vị trí hai góc và việc bảo vệ biên phải đúng dù sau này bạn đổi bảng màu hay mẫu hình.",
        },
        {
          title: "Đối chiếu với source hoàn chỉnh",
          explanation:
            "Cuối bài có README, CMakeLists, header, main và tests đầy đủ, giống với nội dung trong gói tải về.",
        },
      ],
    },
  },
  references: {
    "p01-l01": [
      {
        label: "SDL_Init",
        href: "https://wiki.libsdl.org/SDL3/SDL_Init",
        kind: "SDL API",
      },
      {
        label: "SDL_CreateWindow",
        href: "https://wiki.libsdl.org/SDL3/SDL_CreateWindow",
        kind: "SDL API",
      },
      {
        label: "SDL_CreateRenderer",
        href: "https://wiki.libsdl.org/SDL3/SDL_CreateRenderer",
        kind: "SDL API",
      },
      {
        label: "SDL_PollEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_PollEvent",
        kind: "SDL API",
      },
      {
        label: "Event loop",
        href: "/glossary#event-loop",
        kind: "Thuật ngữ",
      },
    ],
    "p01-l02": [
      {
        label: "Framebuffer",
        href: "/glossary#framebuffer",
        kind: "Thuật ngữ",
      },
      {
        label: "Bounds check",
        href: "/glossary#bounds-check",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p01-l03": [
      {
        label: "SDL_CreateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_CreateTexture",
        kind: "SDL API",
      },
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
      {
        label: "Streaming texture",
        href: "/glossary#streaming-texture",
        kind: "Thuật ngữ",
      },
      {
        label: "Pitch / stride",
        href: "/glossary#pitch-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p01-l04": [
      {
        label: "Framebuffer",
        href: "/glossary#framebuffer",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p01-l05": [
      {
        label: "SDL_UpdateTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_UpdateTexture",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderTexture",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderPresent",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderPresent",
        kind: "SDL API",
      },
      {
        label: "Pitch / stride",
        href: "/glossary#pitch-stride",
        kind: "Thuật ngữ",
      },
    ],
    "p01-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Checkpoint",
        href: "/glossary#checkpoint",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
