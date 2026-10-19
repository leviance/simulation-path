import type { ProjectLearningAssets } from "../../learning/types";
const learning = {
  guides: {
    "p11-l01": {
      focus: "Dựng marker trên framebuffer, rồi nối WASD/QE với world point bằng delta time.",
      expected:
        "Vẽ điểm sáng và điều khiển ba tọa độ; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ ba tọa độ trước khi vẽ",
          explanation: "Tạo Vec3 và Scene; chỉ hàm preview tạm bỏ qua Z, không sửa dữ liệu world.",
        },
        {
          title: "Vẽ marker từ các pixel",
          explanation:
            "Tâm sáng, đĩa xanh và crosshair được clip vào viewport; nối renderScene với SDL_UpdateTexture.",
        },
        {
          title: "Giữ phím theo thời gian",
          explanation:
            "Đọc scancode sau PollEvent, normalize direction và nhân speed×dt; di chuyển tay dừng quỹ đạo.",
        },
      ],
    },
    "p11-l02": {
      focus: "Giữ world point riêng và đổi gốc tọa độ bằng vị trí camera.",
      expected: "Đặt camera vào không gian; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đặt camera và chiều nhìn",
          explanation:
            "Camera ở position, nhìn +Z và chưa xoay; không dùng ngầm basis orbit của P10.",
        },
        {
          title: "Trừ vị trí camera",
          explanation:
            "worldToCamera đổi gốc, không ghi đè scene.point; camera đi phải làm điểm đi trái trong preview.",
        },
        {
          title: "Viết cặp hàm đổi ngược",
          explanation: "cameraToWorld cộng lại vị trí; ví dụ số kiểm được từng thành phần.",
        },
      ],
    },
    "p11-l03": {
      focus: "Từ tam giác đồng dạng đến x/z, y/z và một cảnh lưới có chiều sâu thật.",
      expected:
        "Vì sao điểm ở xa tiến về tâm?; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Suy hai tỉ lệ từ tam giác đồng dạng",
          explanation: "Mặt phẳng ảnh tạm ở Z=1 cho x′=x/z và y′=y/z.",
        },
        {
          title: "Chặn depth rồi mới chia",
          explanation:
            "Guard near/far đã đi cùng helper để checkpoint không nổ số; bài 5 sẽ giải thích các nhánh.",
        },
        {
          title: "Chiếu cả nền và điểm",
          explanation:
            "line3D clip near/far rồi screen, lưới cùng camera với marker nên depth không chỉ là kích thước đĩa.",
        },
      ],
    },
    "p11-l04": {
      focus: "Tự tính focal scale, NDC và pixel; đổi aspect mà không kéo méo cảnh.",
      expected:
        "Chọn FOV và hình dạng viewport; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Từ nửa góc đến focal scale",
          explanation:
            "f=1/tan(vFOV/2), focalPixels=height×f/2; con số tạm bài 3 được thay bằng lens thật.",
        },
        {
          title: "Đưa camera point về NDC",
          explanation:
            "X chia thêm aspect=width/height, Y không chia aspect vì đây là vertical FOV.",
        },
        {
          title: "Đổi NDC sang screen liên tục",
          explanation: "Viewport có origin riêng; +1 là cạnh phải, không phải chỉ số pixel hợp lệ.",
        },
      ],
    },
    "p11-l05": {
      focus: "Phân biệt behind, near, far, outside và invalid trước khi vẽ.",
      expected:
        "Chặn điểm không thể nhìn thấy; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Phân loại trước phép chia",
          explanation:
            "Invalid, behind, before-near, beyond-far trả screen/NDC trống; chỉ depth hợp lệ đi tiếp.",
        },
        {
          title: "Phân biệt ngoài góc nhìn và ngoài depth",
          explanation:
            "Outside vẫn có số chiếu hữu hạn, nhưng marker không vẽ; không clamp điểm đó vào cạnh.",
        },
        {
          title: "Cắt đoạn khác loại bỏ điểm",
          explanation:
            "Lưới cắt đoạn ở giao điểm near/far, rồi mới chiếu và clip screen để Bresenham có công việc hữu hạn.",
        },
      ],
    },
    "p11-l06": {
      focus: "Tách điều khiển tay khỏi quỹ đạo thời gian, không để hai nguồn input tranh nhau.",
      expected:
        "Cho điểm bay, dừng và bước từng nhịp; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách hai nguồn điều khiển",
          explanation:
            "WASD/QE dịch điểm hiện tại; quỹ đạo là hàm vị trí tuyệt đối của elapsed, không cộng dồn delta vào point.",
        },
        {
          title: "Chạy bằng elapsed time",
          explanation:
            "flightPoint dùng sin/cos để depth đi từ 2 đến 10; advanceFlightTime giới hạn dt và bỏ nonfinite.",
        },
        {
          title: "Dừng và kiểm từng nhịp",
          explanation:
            "Space chỉ toggle một lần, N tiến 0.1s khi paused, reset/preset đưa scene về trạng thái tái lập.",
        },
      ],
    },
    "p11-l07": {
      focus: "Đảo phép chiếu tại một độ sâu đã biết và quản lý pointer capture đúng chủ sở hữu.",
      expected:
        "Kéo điểm mà không làm mất depth; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Một pixel chỉ cho một tia",
          explanation: "Giữ cameraDepth rồi đảo NDC và focal để chọn duy nhất một camera point.",
        },
        {
          title: "Giữ chỗ nắm và chủ sở hữu",
          explanation:
            "Hit-test gần marker, lưu offset/depth/mouse ID, nhận delta qua tọa độ logic đã đổi đúng một lần.",
        },
        {
          title: "Kết thúc cả khi ra ngoài",
          explanation:
            "Up nhận mẫu cuối; lost capture/blur/resize/input thay đổi hủy drag và không để inverse dùng lens cũ.",
        },
      ],
    },
    "p11-l08": {
      focus: "Tắt debug để xem cảnh sạch; kiểm tra bằng nghiệm tính tay, biên và mã hoàn chỉnh.",
      expected:
        "Hoàn thiện demo và kiểm chứng; tự kiểm bằng số biết trước và thí nghiệm trong bài.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "src/main.cpp",
        "tests/tests.cpp",
      ],
      steps: [
        {
          title: "Tạo bản xem sạch",
          explanation:
            "F tắt HUD, axes và crosshair, giữ lưới và khung world để vẫn thấy perspective.",
        },
        {
          title: "Dùng expected không sinh từ hàm cần kiểm",
          explanation:
            "FOV 90° và viewport có origin cho pixel tính tay; round-trip chỉ là phép kiểm bổ sung.",
        },
        {
          title: "Build toàn bộ rồi chạy CTest",
          explanation:
            "Tám checkpoint có sản phẩm tăng dần; Debug/Release đều chạy explicit check, không dùng assert bị NDEBUG tắt.",
        },
      ],
    },
  },
  references: {
    "p11-l01": [
      {
        label: "Vector 3D",
        href: "/glossary#vector-3d",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_GetKeyboardState",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState",
        kind: "SDL API",
      },
    ],
    "p11-l02": [
      {
        label: "Camera space",
        href: "/glossary#camera-space",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l03": [
      {
        label: "Similar triangles",
        href: "/glossary#similar-triangles",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l04": [
      {
        label: "Field of view",
        href: "/glossary#field-of-view",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l05": [
      {
        label: "Near plane",
        href: "/glossary#near-plane",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l06": [
      {
        label: "Variable timestep",
        href: "/glossary#variable-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p11-l07": [
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p11-l08": [
      {
        label: "Round-trip test",
        href: "/glossary#round-trip-test",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
