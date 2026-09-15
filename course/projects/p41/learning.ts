import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/framebuffer.hpp",
  "include/lennard_jones.hpp",
  "include/lennard_jones_ui.hpp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p41-l01": {
      focus:
        "Dựng `PairState` cho hai nguyên tử, tách tọa độ thế giới khỏi framebuffer rồi tính vector nối, khoảng cách và tâm khối lượng.",
      expected:
        "Checkpoint 1 vẽ hai nguyên tử từ `position`; khi kéo trên Canvas, r thay đổi nhưng tâm khối lượng vẫn nằm giữa cặp.",
      files,
      steps: [
        {
          title: "Giữ Atom là dữ liệu vật lý",
          explanation:
            "`Atom` chỉ giữ `position`, `velocity` và `mass`. Màu sắc, bán kính và tọa độ pixel thuộc về phần vẽ, không chen vào mô hình vật lý.",
        },
        {
          title: "Tính delta trước distance",
          explanation:
            "`delta = b.position - a.position` giữ cả hướng lẫn độ dài. Chỉ khi cần một con số vô hướng, ta mới tính `distance = hypot(delta.x, delta.y)`.",
        },
        {
          title: "Dùng center of mass làm mốc",
          explanation:
            "Khi hai khối lượng bằng nhau, đặt hai nguyên tử đối xứng qua gốc sẽ đưa tâm khối lượng về 0. Đại lượng bất biến dễ quan sát này sẽ giúp phát hiện lỗi ở các bài sau.",
        },
      ],
    },
    "p41-l02": {
      focus:
        "Cài thế năng Lennard–Jones bằng reduced units, đánh dấu σ và r0 rồi đọc hình dạng đường cong thay vì học thuộc công thức.",
      expected:
        "Checkpoint 2 cho U(σ)=0, U(2^(1/6)σ)=-ε và từ chối phép tính khi hai nguyên tử gần như trùng nhau.",
      files,
      steps: [
        {
          title: "Tính ratio một lần",
          explanation:
            "Từ `ratio = σ/r`, lần lượt tính `ratio2`, `ratio6` và `ratio12`. Ta tránh gọi `pow` nhiều lần và giữ cùng thứ tự phép tính giữa C++ với Canvas.",
        },
        {
          title: "Phân biệt hai mốc trên trục r",
          explanation:
            "σ là nơi U đi qua 0; r0=2^(1/6)σ mới là đáy thế và là nơi lực bằng 0. Hai mốc nằm gần nhau nhưng mang ý nghĩa hoàn toàn khác.",
        },
        {
          title: "Không che singularity",
          explanation:
            "Hàm báo không hợp lệ khi r quá nhỏ. Phần vẽ có thể cắt đường cong theo chiều cao cho dễ nhìn, nhưng giá trị đưa vào bộ tích phân không được ép về một con số giả tạo.",
        },
      ],
    },
    "p41-l03": {
      focus:
        "Tính potentialSlope=dU/dr, xác định dấu của độ dốc rồi đổi nó thành vector lực tác dụng lên nguyên tử A.",
      expected:
        "Checkpoint 3 vẽ lực đẩy ở 0,95σ, lực gần 0 tại r0 và lực hút ở 1,5σ; vector lực luôn nằm trên đường nối hai nguyên tử.",
      files,
      steps: [
        {
          title: "Chốt quy ước delta",
          explanation:
            "Code dùng delta từ A tới B. Với quy ước này, potentialSlope âm đẩy A ra xa B, còn potentialSlope dương hút A về B.",
        },
        {
          title: "Từ độ dốc đến lực trên A",
          explanation:
            "Ta có direction=delta/r và potentialSlope=dU/dr. Vì đạo hàm của r theo vị trí A mang dấu âm, forceOnA=direction·potentialSlope; không thêm một dấu trừ thứ hai.",
        },
        {
          title: "Kiểm dấu bằng điểm cụ thể",
          explanation:
            "Một `assert` ở 0,95σ và một `assert` ở 1,5σ bắt lỗi dấu tốt hơn việc chỉ kiểm tra |F(r0)| gần 0.",
        },
      ],
    },
    "p41-l04": {
      focus:
        "Tính tương tác của cặp đúng một lần để tạo hai lực đối nhau, sau đó đo tổng lực, linear momentum và center of mass.",
      expected:
        "Checkpoint 4 luôn có `forceOnA + forceOnB` gần 0; cấu hình đối xứng bắt đầu với động lượng và vận tốc tâm khối lượng bằng 0.",
      files,
      steps: [
        {
          title: "Tính pair đúng một lần",
          explanation:
            "`forceOnB = -forceOnA` được lấy từ cùng một kết quả tính. Không gọi lại công thức với `delta` đảo chiều rồi trông chờ sai số làm tròn tự triệt tiêu.",
        },
        {
          title: "Đổi force thành acceleration theo từng mass",
          explanation:
            "Hai lực có độ lớn bằng nhau, nhưng nguyên tử nhẹ có gia tốc lớn hơn. Vì vậy định luật III Newton không có nghĩa hai gia tốc luôn bằng nhau và ngược chiều.",
        },
        {
          title: "Đo invariant độc lập renderer",
          explanation:
            "Động lượng và tâm khối lượng được tính trực tiếp từ `PairState` theo đơn vị thế giới; đổi kích thước cửa sổ không được làm chúng thay đổi.",
        },
      ],
    },
    "p41-l05": {
      focus:
        "Cho `PairState` tiến theo Velocity Verlet, rồi đặt bộ giải sau accumulator có giới hạn thời gian khung hình, giới hạn số bước con và chế độ tiến từng bước.",
      expected:
        "Checkpoint 5 dùng lực ở cả đầu lẫn cuối bước; Space chạy/dừng, N tiến đúng một bước và hai cách chia thời gian khung hình cho cùng số bước vật lý.",
      files,
      steps: [
        {
          title: "Tính acceleration đầu bước",
          explanation:
            "Một lần tính tương tác cho ta a0 của cả hai nguyên tử. Vị trí mới dùng vận tốc hiện tại cùng 0,5·a0·dt².",
        },
        {
          title: "Hỏi lại lực ở position mới",
          explanation:
            "a1 phải được tính từ khoảng cách mới. Dùng lại a0 sẽ biến phép cập nhật thành một công thức khác và làm sai số năng lượng tăng nhanh hơn.",
        },
        {
          title: "Tách physics time khỏi render time",
          explanation:
            "Accumulator chỉ quyết định cần chạy bao nhiêu bước cố định. Giới hạn an toàn bỏ phần thời gian tồn đọng vượt ngân sách, tránh để ứng dụng mắc kẹt trong vòng lặp bù bước.",
        },
      ],
    },
    "p41-l06": {
      focus:
        "Cộng động năng với thế năng của cặp, lưu lịch sử có giới hạn và dùng độ lệch năng lượng để chọn `fixed dt` phù hợp.",
      expected:
        "Checkpoint 6 đo năng lượng và thêm hàm đánh giá sai số lớn nhất theo từng bước. Đến bài cuối, phím V gọi hàm này cho điều kiện đầu đang chọn, tách riêng khỏi bộ kiểm mô hình chuẩn.",
      files,
      steps: [
        {
          title: "Đo energy tại cùng state",
          explanation:
            "Thế năng lấy từ khoảng cách hiện tại, động năng lấy từ hai vận tốc hiện tại. Không ghép thế năng đầu bước với động năng cuối bước.",
        },
        {
          title: "Giữ dấu của relative drift",
          explanation:
            "(E−E0)/max(|E0|,ε) cho biết bộ giải đang tự thêm hay làm mất năng lượng. Giao diện có thể hiển thị phần trăm, còn phép kiểm tra vẫn dùng giá trị chưa làm tròn.",
        },
        {
          title: "Giới hạn cả history lẫn stress run",
          explanation:
            "Lịch sử chỉ giữ một số mẫu cố định. Phép kiểm chứng chạy trong khoảng thời gian và số bước đã định trước, không chờ đến khi đồ thị có vẻ ổn.",
        },
      ],
    },
    "p41-l07": {
      focus:
        "Ghép các cấu hình khoảng cách, thao tác kéo nguyên tử, đồ thị, số đo chẩn đoán, phép kiểm chứng, đặt lại và dọn tài nguyên thành một chương trình hoàn chỉnh.",
      expected:
        "Bản hoàn chỉnh cho phép chuyển giữa vùng đẩy, cân bằng và hút; trạng thái hợp lệ cuối cùng được giữ lại nếu đầu vào nguy hiểm. Toàn bộ mã nguồn và CTest có trong gói ZIP.",
      files,
      steps: [
        {
          title: "Mọi preset đi qua cùng hàm reset",
          explanation:
            "Kéo chuột, phím 1–3 và R đều tạo lại `PairState`, năng lượng ban đầu và lịch sử; không nhánh nhập liệu nào được giữ sót vận tốc cũ.",
        },
        {
          title: "Pause khi người dùng sửa state",
          explanation:
            "Khi kéo chuột, mô phỏng tự dừng, giữ tâm khối lượng và xóa vận tốc. Nhờ vậy, thí nghiệm mới luôn bắt đầu từ một điều kiện rõ ràng.",
        },
        {
          title: "Dọn SDL theo thứ tự ngược",
          explanation:
            "Texture được hủy trước renderer, renderer trước window và `SDL_Quit` chạy sau cùng; nhánh lỗi cũng trả `EXIT_FAILURE` thay vì im lặng báo thành công.",
        },
      ],
    },
  },
  references: {
    "p41-l01": [
      { label: "Reduced units", href: "/glossary#reduced-units", kind: "Thuật ngữ" },
      { label: "Pair potential", href: "/glossary#pair-potential", kind: "Thuật ngữ" },
    ],
    "p41-l02": [
      {
        label: "Lennard–Jones potential",
        href: "/glossary#lennard-jones-potential",
        kind: "Thuật ngữ",
      },
      {
        label: "Equilibrium separation",
        href: "/glossary#equilibrium-separation",
        kind: "Thuật ngữ",
      },
    ],
    "p41-l03": [
      { label: "Pair potential", href: "/glossary#pair-potential", kind: "Thuật ngữ" },
      { label: "Vector 2D", href: "/glossary#vector-2d", kind: "Thuật ngữ" },
    ],
    "p41-l04": [
      {
        label: "Force accumulation",
        href: "/glossary#force-accumulation",
        kind: "Thuật ngữ",
      },
      { label: "Linear momentum", href: "/glossary#linear-momentum", kind: "Thuật ngữ" },
    ],
    "p41-l05": [
      { label: "Velocity Verlet", href: "/glossary#velocity-verlet", kind: "Thuật ngữ" },
      {
        label: "Physics accumulator",
        href: "/glossary#physics-accumulator",
        kind: "Thuật ngữ",
      },
    ],
    "p41-l06": [
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
      {
        label: "Mechanical energy",
        href: "/glossary#mechanical-energy",
        kind: "Thuật ngữ",
      },
    ],
    "p41-l07": [
      {
        label: "SDL_DestroyTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_DestroyTexture",
        kind: "SDL API",
      },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
