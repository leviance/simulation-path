import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p43-l01": {
      focus: "Dựng hình đủ rõ để nhìn thấy vấn đề ở hai mép hộp.",
      expected: "Cửa sổ có một ô vuông, hạt A vàng ở x=0.6 và B xanh ở x=11.4. Cả hai đứng yên.",
      files: ["src/main.cpp", "include/view.hpp", "include/periodic.hpp", "include/dynamics.hpp"],
      steps: [
        {
          title: "Tạo state nhỏ nhất",
          explanation:
            "Particle giữ position, velocity và mass. Hai vị trí trong makePair là world coordinates, không phụ thuộc độ phân giải cửa sổ.",
        },
        {
          title: "Đổi tọa độ khi vẽ",
          explanation:
            "toScreen chia position cho cạnh hộp rồi nhân viewport.side. marker dùng SDL_RenderFillRect để đặt một ký hiệu nhỏ tại điểm đó.",
        },
        {
          title: "Đưa state vào vòng lặp SDL",
          explanation:
            "Khởi tạo system một lần trước loop. Mỗi frame xử lý event rồi drawScene và present; chưa có hàm cập nhật vật lý.",
        },
      ],
    },
    "p43-l02": {
      focus: "Thay va chạm tường bằng một cách biểu diễn tọa độ khác.",
      expected:
        "Hạt ra khỏi một mép quay lại mép đối diện với nguyên velocity. Số âm và nhiều vòng qua hộp đều đúng.",
      files: ["include/periodic.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tách phần nguyên của số ô đã đi",
          explanation:
            "floor(value/L) cho chỉ số ô, kể cả phía âm. Trừ số ô đó nhân L để giữ phần tọa độ trong ô gốc.",
        },
        {
          title: "Wrap độc lập từng trục",
          explanation:
            "width áp dụng cho x, height cho y. Cùng một hàm vẫn đúng nếu sau này hộp không vuông.",
        },
        {
          title: "Cập nhật trước rồi wrap",
          explanation:
            "ballisticStep cộng velocity*dt vào position, sau đó wrap. Không đụng vào velocity; chưa có lực ở checkpoint này.",
        },
      ],
    },
    "p43-l03": {
      focus: "Đo khoảng cách giữa các ảnh gần nhất thay vì giữa hai pixel trên màn hình.",
      expected:
        "Preset mặc định cho khoảng cách thường 10.8, minimum image 1.2; kéo A qua mép vẫn đọc được vector liên tục quanh cặp gần.",
      files: ["include/periodic.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đưa delta về nửa hộp",
          explanation:
            "Dịch delta thêm L/2, wrap, rồi trừ L/2 để chọn khoảng [-L/2,L/2). Tại nửa hộp, hai ảnh gần ngang nhau; ta chọn phía âm nhất quán.",
        },
        {
          title: "Vẽ hai vector cạnh nhau",
          explanation:
            "Đường xám nối A tới B thật trong ô gốc. Đường vàng nối A tới A+minimumImage(B-A), có thể nằm ngoài ô gốc.",
        },
        {
          title: "Thêm cách tự tạo ca biên",
          explanation:
            "Mouse đi từ screenToWorld qua wrapPosition trước khi sửa A. Sửa bằng tay phải pause vì thao tác kéo không phải một lực vật lý.",
        },
      ],
    },
    "p43-l04": {
      focus: "Giữ cùng một vector tuần hoàn trong phép tính lực và thế năng.",
      expected:
        "Hai hạt sát hai mép vẫn có lực đối nhau. Cutoff bằng hoặc lớn hơn nửa cạnh ngắn nhất và hạt trùng qua biên đều bị từ chối.",
      files: ["include/dynamics.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Kiểm tra hợp đồng của hộp",
          explanation:
            "validParameters kiểm tra số hữu hạn, độ dài dương và cutoff < min(Lx,Ly)/2. Không dùng trường hợp tie để quyết định một lực khác zero.",
        },
        {
          title: "Giữ thế năng force-shifted",
          explanation:
            "Trừ U(rc) và tiếp tuyến tại rc như Project 42. Ngoài cutoff, lực và U đều bằng zero; bên trong không clamp lực.",
        },
        {
          title: "Cộng hai lực từ một kết quả",
          explanation:
            "evaluate duyệt i<j, lấy minimum image, tính sample rồi cộng force vào i và trừ khỏi j. potential cũng chỉ cộng một lần.",
        },
      ],
    },
    "p43-l05": {
      focus: "Chạy hệ tuần hoàn bằng Velocity Verlet mà không để bước lỗi làm hỏng state.",
      expected:
        "Preset 64, 144 hoặc 1.000 chạy không bật tường. Tổng động lượng gần zero; mỗi frame chỉ làm số bước hữu hạn.",
      files: ["include/dynamics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tạo lattice có khoảng cách an toàn qua biên",
          explanation:
            "makeGas đặt hạt vào tâm các ô con với spacing ít nhất 1.6σ. Hai hàng ở mép đối diện cũng cách nhau một spacing khi đo tuần hoàn.",
        },
        {
          title: "Làm trọn bước trên candidate",
          explanation:
            "Tính lực cũ, kick nửa bước, drift rồi wrap, tính lực mới và kick nửa bước. Chỉ gán candidate về system sau khi mọi kiểm tra thành công.",
        },
        {
          title: "Giới hạn công việc mỗi frame",
          explanation:
            "Accumulator dùng fixed dt; preset 1.000 chỉ chạy tối đa một bước mỗi frame. Phần thời gian bỏ qua được đếm, không làm dt lớn lên để đuổi kịp.",
        },
      ],
    },
    "p43-l06": {
      focus: "Dùng bản sao để giải thích hình học, không nhân số hạt trong mô hình.",
      expected:
        "G bật ảnh xám ở các ô kề. N, evaluatedPairs và chuyển động giữ nguyên khi thay đổi cờ hiển thị.",
      files: ["include/periodic.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Sinh vị trí vẽ tạm thời",
          explanation:
            "imagePositions tạo p+(ix*Lx,iy*Ly) với ix,iy từ -1 tới 1. Giá trị trả về là Vec2, không phải Particle có velocity hay mass.",
        },
        {
          title: "Vẽ ảnh trước, hạt thật sau",
          explanation:
            "drawScene dùng màu xám cho ảnh rồi màu nổi cho state trong ô gốc. Cùng một hạt có thể thấy ở hai mép cùng lúc.",
        },
        {
          title: "Giữ cờ hiển thị ngoài solver",
          explanation:
            "showImages chỉ truyền vào drawScene. evaluate và verletStep không nhận cờ này, nên không thể đổi lực vì người dùng bật một lớp hiển thị.",
        },
      ],
    },
    "p43-l07": {
      focus: "Phân biệt vị trí dùng cho tương tác với tọa độ lưu hành trình.",
      expected:
        "Trong preset một hạt, đường vàng unwrapped không nhảy khi đường xanh wrapped đi từ một mép về mép kia. wrap(unwrapped) khớp position.",
      files: ["include/periodic.hpp", "include/dynamics.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Khởi tạo hai cách biểu diễn cùng một vị trí",
          explanation:
            "Khi tạo hệ, unwrapped bằng position. Khi kéo hạt bằng chuột, ta khởi tạo lại mốc đo và xóa trace vì vừa can thiệp bên ngoài.",
        },
        {
          title: "Cộng displacement trước khi thông tin bị mất",
          explanation:
            "Trong drift, cộng cùng displacement vào unwrapped còn position thì được wrap. Không suy ra displacement từ hiệu position mới và cũ.",
        },
        {
          title: "Vẽ lịch sử hữu hạn",
          explanation:
            "appendTrace giữ tối đa 240 mẫu. Mỗi đường dùng cùng mốc lấy mẫu để bước nhảy của wrapped x không bị nhầm là hạt quay đầu.",
        },
      ],
    },
    "p43-l08": {
      focus: "Kiểm tra điều kiện biên bằng con số, không chỉ bằng hình hạt chạy qua mép.",
      expected:
        "CTest đạt các ca wrap, minimum image, tịnh tiến, cutoff, ghost, unwrapped và bước lỗi; phím V chạy kiểm tra 36 hạt trong 400 bước.",
      files: ["include/dynamics.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Thử các ca có đáp án tay",
          explanation:
            "Bắt đầu với -0.25, đúng L, nhiều lần vượt biên và cặp x=0.6/11.4. Đây là những ca bóc tách được lỗi wrap khỏi lỗi lực.",
        },
        {
          title: "Kiểm tra bất biến của hệ",
          explanation:
            "Dịch toàn hệ rồi wrap phải giữ lực và U. Tổng lực và động lượng chỉ lệch do số thực; một hạt qua biên vẫn giữ vận tốc và quỹ đạo unwrapped.",
        },
        {
          title: "Build và kiểm tra bản final",
          explanation:
            "Chạy CTest ở Debug và Release. Kiểm chứng hữu hạn không tự chứng minh mọi cấu hình đều ổn định; luôn thử lại sau khi đổi dt hoặc khoảng cách đầu.",
        },
      ],
    },
  },
  references: {
    "p43-l01": [
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
      { label: "World space", href: "/glossary#world-space", kind: "Thuật ngữ" },
    ],
    "p43-l02": [
      { label: "Periodic boundary", href: "/glossary#periodic-boundary", kind: "Thuật ngữ" },
    ],
    "p43-l03": [
      { label: "Minimum image convention", href: "/glossary#minimum-image", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
    "p43-l04": [
      { label: "Force-shifted cutoff", href: "/glossary#force-shifted-cutoff", kind: "Thuật ngữ" },
      {
        label: "GROMACS: periodic boundary conditions",
        href: "https://manual.gromacs.org/current/reference-manual/algorithms/periodic-boundary-conditions.html",
        kind: "Thuật ngữ",
      },
    ],
    "p43-l05": [
      { label: "Velocity Verlet", href: "/glossary#velocity-verlet", kind: "Thuật ngữ" },
      { label: "Physics accumulator", href: "/glossary#physics-accumulator", kind: "Thuật ngữ" },
    ],
    "p43-l06": [{ label: "Periodic image", href: "/glossary#periodic-image", kind: "Thuật ngữ" }],
    "p43-l07": [
      {
        label: "Unwrapped coordinates",
        href: "/glossary#unwrapped-coordinates",
        kind: "Thuật ngữ",
      },
    ],
    "p43-l08": [
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
      { label: "Linear momentum", href: "/glossary#linear-momentum", kind: "Thuật ngữ" },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
