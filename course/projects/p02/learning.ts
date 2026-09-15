import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p02-l01": {
      focus:
        "Bắt đầu từ cửa sổ và renderer đã tạo ở Project 1, tự vẽ một SDL_FRect rồi đọc trạng thái WASD liên tục để đổi màu ô vuông.",
      expected:
        "Một ô vuông xám được vẽ bằng SDL_RenderFillRect. Khi giữ WASD, ô vuông đổi sang màu xanh; A+D và W+S triệt tiêu nhau; `direction` luôn có độ dài 0 hoặc 1.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Vẽ ô vuông trước",
          explanation:
            "SDL_SetRenderDrawColor chọn màu, SDL_RenderClear xóa nền, SDL_RenderFillRect tô ô vuông và SDL_RenderPresent đưa kết quả lên màn hình.",
        },
        {
          title: "Đọc từng phím thật rõ ràng",
          explanation:
            "Bốn nhánh A/D/W/S tạo `direction` theo cách dễ theo dõi; phép rút gọn D−A và S−W chỉ được giới thiệu sau khi người học đã hiểu từng nhánh.",
        },
        {
          title: "Chuẩn hóa an toàn",
          explanation:
            "Chỉ thực hiện phép chia khi độ dài lớn hơn 0 để vector `{0, 0}` không tạo ra NaN.",
        },
      ],
    },
    "p02-l02": {
      focus:
        "Tách `position`, `direction` và `velocity` để phần đọc phím chỉ xác định hướng, còn hàm cập nhật chịu trách nhiệm thay đổi vị trí.",
      expected:
        "Ô vuông di chuyển 3 pixel sau mỗi lần cập nhật theo giả định tạm thời 60 Hz và luôn nằm trọn trong cửa sổ. Bài kế tiếp sẽ cho thấy giả định này sai ở đâu.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Gắn đơn vị cho từng đại lượng",
          explanation:
            "`direction` không có đơn vị; tốc độ dùng pixel/giây; `velocity = direction × speed`; `position` dùng pixel.",
        },
        {
          title: "Chỉ thêm toán tử cần dùng",
          explanation:
            "`operator*` và `operator+=` giúp công thức cập nhật gần với ký hiệu toán mà vẫn giữ `Vec2` đơn giản.",
        },
        {
          title: "Tính cả kích thước ô vuông",
          explanation:
            "Giới hạn phải là `width - playerWidth` và `height - playerHeight`; nếu không, cạnh phải hoặc cạnh dưới vẫn có thể lọt khỏi cửa sổ.",
        },
      ],
    },
    "p02-l03": {
      focus:
        "Cố ý dùng bước `1/60` sau mỗi lần lặp rồi đo quãng đường trong một giây bằng các phím 1/2/3. Đây là thí nghiệm đối chứng, chưa phải cách cài đặt cuối cùng.",
      expected:
        "Ba mức 33/16/8 ms tự cho ô vuông đi sang phải trong một giây và tạo ra ba quãng đường khác nhau. Motion Lab minh họa cùng lỗi trên đồ thị quãng đường–thời gian.",
      files: ["src/main.cpp"],
      steps: [
        {
          title: "Tìm giả định bị che giấu",
          explanation:
            "`position += velocity × 1/60` chỉ đúng nếu vòng lặp thực sự chạy đúng 60 lần mỗi giây, điều hệ điều hành không cam kết.",
        },
        {
          title: "FPS càng cao, sai số càng lớn",
          explanation:
            "Ở 120 FPS, bước `1/60` bị áp dụng 120 lần mỗi giây, nên ô vuông đi nhanh gấp đôi tốc độ đã chọn.",
        },
        {
          title: "Lặp lại phép đo dễ dàng",
          explanation:
            "Phím 1/2/3 đặt lại vị trí, chọn độ trễ và tự đo đúng một giây; R lặp lại mức hiện tại mà không phải sửa code.",
        },
      ],
    },
    "p02-l04": {
      focus:
        "Đo delta time bằng đồng hồ của SDL, dùng chung một hàm `update` và giải thích rõ cái giá của việc giới hạn variable timestep.",
      expected:
        "Ba mức 33/16/8 ms trong cùng phép đo một giây đều cho quãng đường gần 180 pixel. Sau khi dừng lâu ở breakpoint, ô vuông không nhảy quá xa.",
      files: ["src/main.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Đo giữa hai lần cập nhật",
          explanation:
            "Lưu `previous`, lấy `now` ở lần lặp mới rồi cập nhật `previous` ngay sau khi tính `dt` để không cộng trùng thời gian.",
        },
        {
          title: "Đổi nanosecond sang giây",
          explanation:
            "Chia kết quả SDL_GetTicksNS cho 1e9 để cùng đơn vị với `velocity` tính bằng pixel/giây.",
        },
        {
          title: "Hiểu sự đánh đổi",
          explanation:
            "`update` giới hạn bước tối đa ở 0,05 giây để tránh cú nhảy; phần thời gian vượt ngưỡng bị bỏ nên mô phỏng liên tục dưới 20 FPS sẽ chậm hơn thời gian thật.",
        },
      ],
    },
    "p02-l05": {
      focus:
        "Tự viết bộ giới hạn FPS: đo thời gian đã dùng, tính phần còn lại ở 30/60/120 FPS và chỉ gọi SDL_DelayNS khi vẫn còn dư.",
      expected:
        "Phím 1/2/3 chọn 30/60/120 FPS, phím 0 bỏ giới hạn và F bật hoặc tắt mức gần nhất. Quãng đường không thay đổi theo mức FPS.",
      files: ["src/main.cpp"],
      steps: [
        {
          title: "Tính thời lượng mục tiêu",
          explanation:
            "Thời lượng tính bằng nanosecond là `1e9 / targetFps`, vì vậy một hàm có thể phục vụ cả ba mức 30/60/120.",
        },
        {
          title: "Không trừ khi đã quá hạn",
          explanation:
            "Chỉ gọi SDL_DelayNS khi `elapsed < target`; khung hình đã chậm phải tiếp tục ngay để phép trừ số không dấu không bị tràn.",
        },
        {
          title: "Nghỉ sau khi vẽ xong",
          explanation:
            "Đo cả phần đọc phím, cập nhật, vẽ và present rồi mới nghỉ phần còn dư để tổng thời gian gần với mục tiêu.",
        },
      ],
    },
    "p02-l06": {
      focus:
        "Kiểm chứng đúng hàm `update` bằng nhiều dãy `dt` và một chương trình test vẫn hoạt động khi NDEBUG được bật trong Release.",
      expected:
        "CTest ở Debug và Release xác nhận các dãy thời gian đều/không đều, giới hạn `dt` và chuyển động chéo. `project_2_final` giữ nguyên tốc độ ở 30, 60, 120 FPS hoặc khi bỏ giới hạn.",
      files: ["tests/tests.cpp", "include/lab.hpp"],
      steps: [
        {
          title: "Cùng tổng thời gian",
          explanation:
            "150×1/30, 300×1/60 và 600×1/120 đều bằng năm giây; `simulate` phải trả về cùng một quãng đường.",
        },
        {
          title: "Test đúng code của ứng dụng",
          explanation:
            "`simulate` gọi `update` thay vì chép lại công thức, nên nếu `update` bị sửa hỏng, các test thời gian cũng thất bại.",
        },
        {
          title: "Không phụ thuộc vào assert",
          explanation:
            "`check` in tên điều kiện lỗi, tăng bộ đếm và trả EXIT_FAILURE nên mọi phép kiểm tra vẫn chạy trong cấu hình Release.",
        },
      ],
    },
  },
  references: {
    "p02-l01": [
      {
        label: "SDL_GetKeyboardState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
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
    "p02-l02": [
      {
        label: "SDL_FRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_FRect",
        kind: "SDL API",
      },
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p02-l03": [
      {
        label: "SDL_Delay",
        href: "https://wiki.libsdl.org/SDL3/SDL_Delay",
        kind: "SDL API",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
    ],
    "p02-l04": [
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p02-l05": [
      {
        label: "SDL_DelayNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_DelayNS",
        kind: "SDL API",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
        kind: "Thuật ngữ",
      },
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p02-l06": [
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "Delta time",
        href: "/glossary#delta-time",
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
