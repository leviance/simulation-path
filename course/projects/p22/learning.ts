import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p22-l01": {
      focus:
        "Dựng một bãi thử nhìn thấy được từ starter, định nghĩa WorldView và biến thao tác kéo từ nòng pháo thành velocity trong world space.",
      expected:
        "Mặt đất, pháo và mũi tên ngắm xuất hiện ngay. Kéo sang phải/lên tạo velocity có X/Y dương, góc và speed không vượt giới hạn, pointer được giữ tới lúc nhả.",
      files: ["include/lab.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Chốt hệ đơn vị trước khi nhận input",
          explanation:
            "Physics dùng mét và giây; WorldView chỉ đổi các đại lượng đó sang pixel khi vẽ. Không lưu position vật lý bằng tọa độ màn hình.",
        },
        {
          title: "Đảo riêng trục Y tại biên screen/world",
          explanation:
            "Screen Y tăng xuống dưới còn world Y tăng lên trên. Vector kéo dùng dx=pointer.x−origin.x và dy=origin.y−pointer.y.",
        },
        {
          title: "Clamp một AimSelection hoàn chỉnh",
          explanation:
            "Độ dài drag quyết định speed, atan2 quyết định angle; sau khi clamp, velocity được dựng lại để arrow và readout không mâu thuẫn.",
        },
      ],
    },
    "p22-l02": {
      focus:
        "Đi qua lại giữa biểu diễn polar (speed, angle) và Cartesian (vx, vy), rồi vẽ hai component cộng thành initial velocity.",
      expected:
        "Đổi angle giữ nguyên speed; đổi speed giữ nguyên hướng. Component ngang/dọc ghép đầu-đuôi chạm đúng đầu vector vận tốc.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tách component bằng sin và cos",
          explanation:
            "Angle được đo từ +X nên cosine thuộc X, sine thuộc Y. Hàm nhận radian vì std::sin/std::cos không nhận degree.",
        },
        {
          title: "Khôi phục polar bằng hypot và atan2",
          explanation:
            "hypot cho speed không âm; atan2(vy,vx) giữ đúng quadrant và xử lý trục tốt hơn atan(vy/vx).",
        },
        {
          title: "Vẽ phép cộng vector thay vì chỉ in số",
          explanation:
            "Arrow vx đi từ muzzle, arrow vy bắt đầu ở đầu vx; endpoint cuối phải trùng vector velocity ban đầu.",
        },
      ],
    },
    "p22-l03": {
      focus:
        "Cài nghiệm giải tích của chuyển động acceleration không đổi và lấy mẫu nó thành đường dự đoán có apex cùng ground impact.",
      expected:
        "Đường vàng bắt đầu đúng muzzle, tiếp tuyến ban đầu cùng hướng velocity và đi qua apex khi vy=0. Ở checkpoint này điểm cuối vẫn dùng một horizon ước lượng; exact ground root được bổ sung ở bài 6.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Tách position và velocity theo thời gian",
          explanation:
            "analyticPosition dùng hạng 0.5·a·t²; analyticVelocity dùng v0+a·t. Cả hai đều là hàm thuần của initial state và t.",
        },
        {
          title: "Tìm apex từ điều kiện vy bằng zero",
          explanation:
            "Với gravity Y âm, tApex=−vy0/gy khi kết quả dương. Đưa thời gian đó vào analyticPosition cho marker cao nhất.",
        },
        {
          title: "Lấy mẫu theo thời gian có đủ hai đầu",
          explanation:
            "Chia [0,duration] thành số segment cố định và lấy cả hai đầu. Duration hiện là horizon đủ dài để thấy đường cong; chưa giả vờ đó là impact chính xác.",
        },
      ],
    },
    "p22-l04": {
      focus:
        "Tạo ProjectileState và cài đúng thứ tự Explicit Euler: position nhận velocity cũ, sau đó velocity mới nhận acceleration.",
      expected:
        "Bấm fire tạo một state mới tại muzzle. Mỗi lần step tăng elapsed đúng dt, trail số đi gần đường vàng nhưng sai số tăng dần.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Giữ state tối thiểu và có đơn vị",
          explanation:
            "Position dùng mét, velocity dùng m/s, elapsed dùng giây và active cho biết integrator còn được phép cập nhật.",
        },
        {
          title: "Dùng snapshot velocity ở đầu bước",
          explanation:
            "Explicit Euler tính pNext=p+v·dt trước vNext=v+a·dt. Đảo thứ tự sẽ thành semi-implicit Euler, một integrator khác.",
        },
        {
          title: "So ở cùng elapsed time",
          explanation:
            "Exact ghost lấy analyticPosition(initial, state.elapsed); nhờ vậy đoạn error nối hai nghiệm tại cùng một thời điểm.",
        },
      ],
    },
    "p22-l05": {
      focus:
        "Đưa frame delta vào accumulator, rút ra nhiều fixed step hữu hạn và giữ physics state độc lập với nhịp render.",
      expected:
        "Frame 16 ms có thể tạo 0 hoặc 1 step, frame 40 ms tạo nhiều step; hai cách chia frame có cùng tổng thời gian tạo cùng state khi không chạm giới hạn bảo vệ.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Clamp frame time, không clamp fixed dt",
          explanation:
            "Một frame bị pause trong debugger không được bơm vài giây vào accumulator; fixed dt vẫn giữ đúng giá trị người dùng chọn.",
        },
        {
          title: "Lập StepPlan trước khi update state",
          explanation:
            "Plan trả steps, remainder và droppedTime. Main chỉ lặp đúng steps lần, giúp quy tắc accumulator kiểm thử được mà không cần SDL.",
        },
        {
          title: "Giới hạn substep để tránh spiral of death",
          explanation:
            "Nếu simulation không đuổi kịp real time, bỏ phần quá giới hạn và báo bằng stats; không để một frame chậm sinh vòng lặp không đáy.",
        },
      ],
    },
    "p22-l06": {
      focus:
        "Tìm exact ground impact bằng quadratic và sửa bước Euler cuối bằng segment interpolation thay vì clamp position sau xuyên đất.",
      expected:
        "Exact marker và numerical marker đều nằm đúng ground. Numerical elapsed chỉ tăng alpha·dt ở bước cuối; state không tiếp tục rơi sau impact.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Chọn nghiệm thời gian dương",
          explanation:
            "Quadratic có thể có hai root; projectile phóng từ trên ground cần root tương lai lớn hơn epsilon, không lấy t=0 làm lúc hạ cánh.",
        },
        {
          title: "Giữ previous và candidate",
          explanation:
            "Integrator tính trọn bước tạm thời. Khi previous.y≥ground và candidate.y≤ground, alpha xác định giao điểm trên đoạn này.",
        },
        {
          title: "Nội suy cả position lẫn elapsed",
          explanation:
            "Position lấy lerp(previous,candidate,alpha), Y gán đúng ground; elapsed chỉ cộng alpha·dt và active chuyển false.",
        },
      ],
    },
    "p22-l07": {
      focus:
        "Hoàn thiện fire/pause/step/reset, overlay analytic-numerical và một bộ validation đo convergence thay vì chỉ nhìn quỹ đạo có vẻ đúng.",
      expected:
        "Đổi dt rồi bắn lại làm error thay đổi có quy luật; dt nhỏ hơn giảm error. Debug/Release CTest pass và mọi control giữ cùng một SimulationState.",
      files: ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"],
      steps: [
        {
          title: "Đo khoảng cách, không so riêng một trục",
          explanation:
            "positionError dùng hypot giữa numerical và analytic position tại cùng elapsed; readout ghi mét để con số có ý nghĩa.",
        },
        {
          title: "Bắn lại khi đổi điều kiện đầu",
          explanation:
            "Aim chỉnh initial state cho lần fire tiếp theo; projectile đang bay không bị đổi velocity giữa chừng vì slider hoặc drag.",
        },
        {
          title: "Kiểm convergence bằng nhiều dt",
          explanation:
            "CTest chạy cùng thời điểm với dt=1/15, 1/60 và 1/240; error phải giảm khi chia nhỏ bước, không chỉ nằm dưới một ngưỡng tùy ý.",
        },
      ],
    },
  },
  references: {
    "p22-l01": [
      { label: "Projectile motion", href: "/glossary#projectile-motion", kind: "Thuật ngữ" },
      { label: "Vector 2D", href: "/glossary#vector-2d", kind: "Thuật ngữ" },
      { label: "Pointer capture", href: "/glossary#pointer-capture", kind: "Thuật ngữ" },
    ],
    "p22-l02": [
      { label: "Initial velocity", href: "/glossary#initial-velocity", kind: "Thuật ngữ" },
      { label: "Radian", href: "/glossary#radian", kind: "Thuật ngữ" },
      { label: "atan2", href: "/glossary#atan2", kind: "Thuật ngữ" },
    ],
    "p22-l03": [
      { label: "Analytic solution", href: "/glossary#analytic-solution", kind: "Thuật ngữ" },
      { label: "Gravity acceleration", href: "/glossary#gravity-acceleration", kind: "Thuật ngữ" },
      { label: "Time of flight", href: "/glossary#time-of-flight", kind: "Thuật ngữ" },
    ],
    "p22-l04": [
      { label: "Explicit Euler", href: "/glossary#explicit-euler", kind: "Thuật ngữ" },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
    ],
    "p22-l05": [
      { label: "Fixed timestep", href: "/glossary#fixed-timestep", kind: "Thuật ngữ" },
      { label: "Physics accumulator", href: "/glossary#physics-accumulator", kind: "Thuật ngữ" },
      { label: "Delta time", href: "/glossary#delta-time", kind: "Thuật ngữ" },
    ],
    "p22-l06": [
      { label: "Impact interpolation", href: "/glossary#impact-interpolation", kind: "Thuật ngữ" },
      { label: "Linear interpolation", href: "/glossary#linear-interpolation", kind: "Thuật ngữ" },
      { label: "Time of flight", href: "/glossary#time-of-flight", kind: "Thuật ngữ" },
    ],
    "p22-l07": [
      { label: "Integration error", href: "/glossary#integration-error", kind: "Thuật ngữ" },
      { label: "Invariant", href: "/glossary#invariant", kind: "Thuật ngữ" },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
