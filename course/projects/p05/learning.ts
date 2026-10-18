import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p05-l01": {
      focus:
        "Chạy starter, rồi tự vẽ trục và điểm (2,1) bằng putPixel trước khi gom công thức vào camera.",
      expected:
        "Hai trục nằm giữa window; điểm xanh ở trên phải, cách gốc 110 px ngang và 55 px dọc.",
      files: ["include/framebuffer.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Bắt đầu từ ảnh CPU",
          explanation:
            "Framebuffer và texture đã chạy; thêm hình vào renderScene, không sửa vòng đời SDL.",
        },
        {
          title: "Quy ước hai hệ",
          explanation: "Screen Y đi xuống; world Y đi lên. 55 px đại diện một đơn vị world.",
        },
        {
          title: "Từ số tới hình",
          explanation:
            "Tính markerScreen rồi gọi disc; SDL_UpdateTexture mới đưa ảnh CPU lên texture.",
        },
      ],
    },
    "p05-l02": {
      focus: "Viết worldToScreen và thử thay tâm/tỉ lệ camera mà không đổi dữ liệu điểm.",
      expected:
        "Camera center luôn nằm giữa viewport; world (2,1) vẫn giữ nguyên trong vector points.",
      files: ["include/lab.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Trừ tâm camera",
          explanation: "relativeX/relativeY trả lời điểm cách tâm nhìn bao xa trong world.",
        },
        {
          title: "Nhân tỉ lệ",
          explanation: "scale() bảo vệ đơn vị pixel/world; không đổi dữ liệu điểm khi zoom.",
        },
        {
          title: "Đưa gốc tới giữa ảnh",
          explanation: "Cộng nửa chiều rộng, trừ độ cao do screen Y đi xuống.",
        },
      ],
    },
    "p05-l03": {
      focus: "Suy ra screenToWorld và nối mouse motion đã đổi về render coordinates.",
      expected: "Tọa độ world dưới chuột đổi liên tục; giữa window trả về centerWorld.",
      files: ["include/lab.hpp", "src/main.cpp", "include/presentation.hpp"],
      steps: [
        {
          title: "Hoàn tác phép chiếu",
          explanation: "Bỏ nửa viewport, chia scale rồi cộng camera center.",
        },
        {
          title: "Đổi input đúng một lần",
          explanation:
            "SDL_ConvertEventToRenderCoordinates xử lý renderer/logical presentation trước khi đưa vào camera.",
        },
        {
          title: "Hiển thị số đo",
          explanation:
            "HUD đọc cursorScreen và screenToWorld; không vẽ lại điểm tại vị trí con trỏ.",
        },
      ],
    },
    "p05-l04": {
      focus: "Vẽ lưới trong vùng world đang nhìn thấy và kéo camera bằng chuột phải.",
      expected: "Lưới thay đổi mật độ phù hợp, có nhãn số; kéo phải làm cảnh đi theo tay.",
      files: ["include/lab.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chọn bước lưới",
          explanation: "Dãy 1–2–5 × 10^n giữ khoảng cách ít nhất 40 pixel.",
        },
        {
          title: "Chỉ xét vùng nhìn",
          explanation: "Đổi hai góc ảnh về world; ceil chọn đường đầu tiên.",
        },
        {
          title: "Pan bằng delta",
          explanation:
            "Đổi độ dời từ pixel sang world, đổi dấu X của camera và cập nhật mẫu chuột trước đó.",
        },
      ],
    },
    "p05-l05": {
      focus: "Giữ world anchor bằng hai lần screenToWorld quanh thao tác đổi scale.",
      expected:
        "Con lăn và +/- giữ đúng vị trí world dưới dấu chữ thập; zoom được giới hạn 5–800 px/unit.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đo điểm trước zoom",
          explanation: "Lưu worldBeforeZoom bằng camera cũ.",
        },
        {
          title: "Đổi scale rồi đo lại",
          explanation: "Clamp tỉ lệ, tính worldAfterZoom tại cùng screen point.",
        },
        {
          title: "Bù centerWorld",
          explanation: "Cộng chênh lệch hai điểm; không thay các điểm trong scene.",
        },
      ],
    },
    "p05-l06": {
      focus: "Thêm danh sách điểm, hit-test và trạng thái kéo riêng với pan.",
      expected:
        "Click trái đặt điểm mới hoặc chọn điểm trên cùng trong vùng click; kéo giữ grab offset, Delete xóa điểm đã chọn.",
      files: ["include/scene.hpp", "src/main.cpp", "include/view.hpp"],
      steps: [
        {
          title: "Chọn bằng screen distance",
          explanation: "Hit-test 10 px ổn định ở mọi mức zoom; xét từ điểm vẽ sau cùng.",
        },
        {
          title: "Giữ chỗ người dùng nắm",
          explanation: "grabOffset tránh nhảy điểm khi click lệch tâm.",
        },
        {
          title: "Một thao tác tại một thời điểm",
          explanation:
            "ownerButton/owner chọn đúng mouse và nút; cancelDrag dọn trạng thái và capture.",
        },
      ],
    },
    "p05-l07": {
      focus: "Chạy kiểm thử CPU độc lập, kiểm tra cửa sổ thật và đọc toàn bộ source cuối bài.",
      expected:
        "Starter, bảy checkpoint và final build được; CTest Debug/Release kiểm tra round trip, pan/zoom, grid, hit-test, drag và resize.",
      files: ["tests/tests.cpp", "include/presentation.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Test số cụ thể trước",
          explanation: "Fixture (2,1) → (590,215) bắt lỗi dấu và gốc; round trip đơn độc chưa đủ.",
        },
        {
          title: "Test invariant tương tác",
          explanation:
            "Zoom giữ nguyên điểm dưới con trỏ, drag giữ offset, resize không đổi points.",
        },
        {
          title: "Nghiệm thu hai lớp",
          explanation:
            "CTest không mở window; checklist desktop kiểm tra input, nhãn, focus và HiDPI.",
        },
      ],
    },
  },
  references: {
    "p05-l01": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l02": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l03": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l04": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l05": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l06": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
    ],
    "p05-l07": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Screen space",
        href: "/glossary#screen-space",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest command-line reference",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
