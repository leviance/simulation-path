import type { ProjectLearningAssets } from "../../learning/types";

const files = ["include/lab.hpp", "src/main.cpp", "tests/tests.cpp"];

const learning = {
  guides: {
    "p26-l01": {
      focus:
        "Bắt đầu từ hình hai con lắc đang đứng yên, rồi xác định chính xác những đại lượng nào cần lưu trong trạng thái mô phỏng.",
      expected:
        "Khi thay đổi `theta`, hai quả nặng di chuyển đúng theo góc mới; chiều dài của mỗi thanh vẫn giữ nguyên.",
      files,
      steps: [
        {
          title: "Chốt góc từ phương thẳng đứng hướng xuống",
          explanation:
            "Với quy ước này, `theta = 0` đặt thanh thẳng xuống. Tọa độ X dùng `sin`; tọa độ Y hướng lên nên dùng `-cos`.",
        },
        {
          title: "Giữ state ở generalized coordinates",
          explanation:
            "Mô phỏng chỉ lưu góc và vận tốc góc. Vị trí quả nặng được tính lại từ các giá trị đó, tránh phải đồng bộ hai bản trạng thái khác nhau.",
        },
        {
          title: "Kiểm rod length bằng distance",
          explanation:
            "Thử nhiều góc rồi đo khoảng cách từ điểm treo đến quả nặng thứ nhất và giữa hai quả nặng. Kết quả phải bằng `length1` và `length2`, chỉ chênh lệch rất nhỏ do số thực.",
        },
      ],
    },
    "p26-l02": {
      focus:
        "Biến hệ phương trình liên kết thành một hàm thuần: nhận trạng thái hiện tại và trả về tốc độ thay đổi của bốn thành phần.",
      expected:
        "State thẳng xuống cho alpha bằng zero; hai rod ngang song song cho alpha1=-g với unit parameters và alpha2=0.",
      files,
      steps: [
        {
          title: "Tính shared denominator một lần",
          explanation:
            "Hai gia tốc góc dùng chung một phần mẫu số. Tính nó một lần, đặt tên rõ ràng và kiểm tra trước khi chia.",
        },
        {
          title: "Không sửa state trong derivative",
          explanation:
            "`alpha1` và `alpha2` phải được tính từ cùng một trạng thái đầu vào. Hàm không sửa dữ liệu cũng giúp RK4 gọi lại an toàn với các trạng thái trung gian.",
        },
        {
          title: "Kiểm cấu hình có đáp án",
          explanation:
            "Kiểm trạng thái cân bằng và trường hợp hai thanh nằm ngang song song trước. Hai trường hợp có đáp án dễ tính này bắt lỗi dấu nhanh hơn việc chỉ nhìn chuyển động trên màn hình.",
        },
      ],
    },
    "p26-l03": {
      focus:
        "Dùng RK4 với bước thời gian cố định để làm con lắc chuyển động, rồi theo dõi năng lượng để tự kiểm tra phép tích phân.",
      expected:
        "Mỗi lần tiến một bước làm `elapsed` tăng đúng `dt`; giảm `dt` khiến độ trôi năng lượng nhỏ đi rõ rệt.",
      files,
      steps: [
        {
          title: "Tạo bốn state tạm cho k1–k4",
          explanation:
            "Mỗi lần lấy mẫu đạo hàm đọc một trạng thái hoàn chỉnh. Sau khi ghép bốn mẫu, thời gian của kết quả chỉ tăng đúng một bước `dt`.",
        },
        {
          title: "Tính kinetic từ vận tốc bob",
          explanation:
            "Quả nặng thứ hai chuyển động do cả hai thanh, vì vậy vận tốc của nó phải gồm đóng góp từ `theta1` lẫn `theta2` trước khi tính động năng.",
        },
        {
          title: "Giữ physics tách khỏi render frame",
          explanation:
            "Mỗi khung hình chỉ nạp thời gian vào `accumulator`. Giới hạn số bước vật lý giúp ứng dụng không cố chạy bù vô hạn sau khi cửa sổ bị treo hoặc dừng ở debugger.",
        },
      ],
    },
    "p26-l04": {
      focus:
        "Tạo hai con lắc chỉ khác nhau một góc rất nhỏ lúc ban đầu và giữ mọi điều kiện còn lại giống hệt nhau.",
      expected:
        "Hai elapsed và step count trùng tuyệt đối; thay epsilon chỉ đổi theta2 ban đầu của perturbed lane.",
      files,
      steps: [
        {
          title: "Sao chép initial state trước khi perturb",
          explanation:
            "Sao chép trạng thái ban đầu rồi chỉ cộng `epsilon` vào một góc. Mỗi lần reset phải dựng lại đúng cặp trạng thái này.",
        },
        {
          title: "Tiến cả hai trong một hàm lockstep",
          explanation:
            "Trong mỗi bước, cả hai con lắc dùng cùng tham số và cùng `dt`. Chỉ tăng bộ đếm sau khi cả hai đều đã tiến thành công.",
        },
        {
          title: "Vẽ trail nhưng không dùng trail làm metric",
          explanation:
            "Vệt chuyển động chỉ giúp quan sát. Khi đo độ tách, chương trình phải đọc trực tiếp hai trạng thái ở cùng thời điểm mô phỏng.",
        },
      ],
    },
    "p26-l05": {
      focus:
        "Xây một cách đo độ tách có tính đến tính tuần hoàn của góc và sự khác đơn vị giữa góc với vận tốc góc.",
      expected:
        "+179° và -179° cách nhau 2°; phase-space curve bắt đầu ở epsilon rồi hiện rõ các giai đoạn divergence.",
      files,
      steps: [
        {
          title: "Wrap difference thay vì normalize state",
          explanation:
            "Không ép góc trong trạng thái quay về một vòng sau mỗi bước. Chỉ đưa hiệu hai góc về `[-pi, pi]` tại lúc đo.",
        },
        {
          title: "Scale omega bằng characteristic time",
          explanation:
            "Nhân chênh lệch vận tốc góc với `sqrt(meanLength / g)` để đổi nó thành một đại lượng có thể ghép cùng chênh lệch góc.",
        },
        {
          title: "Vẽ separation trên log scale",
          explanation:
            "Độ tách có thể tăng từ `1e-6` lên gần một đơn vị. Trục log giúp nhìn được cả giai đoạn đầu lẫn lúc hai chuyển động đã khác rõ rệt.",
        },
      ],
    },
    "p26-l06": {
      focus:
        "Ước lượng sai số do bước thời gian và đặt nó cạnh độ tách do nhiễu ban đầu trước khi nói về tính hỗn loạn.",
      expected:
        "Full-step primary và half-step reference có cùng elapsed; giảm dt làm shadow error giảm trong validation horizon.",
      files,
      steps: [
        {
          title: "Tạo shadow từ cùng primary initial state",
          explanation:
            "Quỹ đạo tham chiếu bắt đầu từ đúng trạng thái của con lắc chính và không nhận `epsilon`. Chênh lệch chỉ đến từ cách chia bước `dt` và `dt/2`.",
        },
        {
          title: "Chạy đúng hai half-step",
          explanation:
            "Phải chạy đủ hai bước `dt/2` rồi mới so với một bước `dt`; lúc ấy hai trạng thái mới cùng thời điểm.",
        },
        {
          title: "Giới hạn diễn giải finite-time exponent",
          explanation:
            "`log(d / d0) / t` chỉ mô tả một khoảng thời gian đã chọn. Một lần chạy ngắn chưa đủ để coi nó là Lyapunov exponent đã hội tụ.",
        },
      ],
    },
    "p26-l07": {
      focus:
        "Ghép phần tương tác vào ứng dụng và kiểm lần lượt hình học, phương trình chuyển động, năng lượng, biên góc, bước đồng bộ và sai số số học.",
      expected:
        "Ba preset luôn reset về cùng trạng thái; thao tác kéo đặt được `theta2`; toàn bộ CTest ở Debug và Release đều đạt.",
      files,
      steps: [
        {
          title: "Dùng preset cho ba miền chuyển động",
          explanation:
            "`Calm`, `Chaotic` và `Near upright` cho ba điểm xuất phát dễ so sánh mà không cần đổi thuật toán hay bộ tham số vật lý.",
        },
        {
          title: "Cho interaction sửa initial state",
          explanation:
            "Khi kéo quả nặng thứ hai, tính lại `theta2` bằng `atan2` rồi khởi động lại thí nghiệm. Không đổi đột ngột trạng thái giữa một bước tích phân.",
        },
        {
          title: "Chạy stress bằng số step hữu hạn",
          explanation:
            "Số vòng lặp được tính trước từ `duration / dt`. Nếu trạng thái trở thành vô hạn hoặc `NaN`, phép thử dừng sớm và báo lỗi thay vì treo ứng dụng.",
        },
      ],
    },
  },
  references: {
    "p26-l01": [
      { label: "Double pendulum", href: "/glossary#double-pendulum", kind: "Thuật ngữ" },
      { label: "Unit circle", href: "/glossary#unit-circle", kind: "Thuật ngữ" },
    ],
    "p26-l02": [
      { label: "Double pendulum", href: "/glossary#double-pendulum", kind: "Thuật ngữ" },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l03": [
      { label: "Runge–Kutta 4", href: "/glossary#runge-kutta-4", kind: "Thuật ngữ" },
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
    ],
    "p26-l04": [
      {
        label: "Sensitive dependence",
        href: "/glossary#sensitive-dependence",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l05": [
      { label: "Phase space", href: "/glossary#phase-space", kind: "Thuật ngữ" },
      { label: "Wrapped angle", href: "/glossary#wrapped-angle", kind: "Thuật ngữ" },
    ],
    "p26-l06": [
      {
        label: "Numerical shadow",
        href: "/glossary#numerical-shadow",
        kind: "Thuật ngữ",
      },
      {
        label: "Finite-time exponent",
        href: "/glossary#finite-time-exponent",
        kind: "Thuật ngữ",
      },
    ],
    "p26-l07": [
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
