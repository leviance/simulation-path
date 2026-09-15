import type { ProjectLearningAssets } from "../../learning/types";

const files = [
  "include/framebuffer.hpp",
  "include/molecular_dynamics.hpp",
  "include/molecular_dynamics_ui.hpp",
  "include/molecular_dynamics_diagnostics.hpp",
  "src/main.cpp",
  "tests/tests.cpp",
];

const learning = {
  guides: {
    "p42-l01": {
      focus:
        "Tạo `SimulationBox`, `Particle` và `MolecularSystem`, sau đó xếp đúng N hạt lên lattice có jitter nhỏ và tái lập được từ seed.",
      expected:
        "Checkpoint 1 vẽ đủ 1.000 hạt trong hộp; cùng seed cho cùng vị trí và không có khoảng cách gần zero.",
      files,
      steps: [
        {
          title: "Suy ra diện tích hộp từ mật độ",
          explanation:
            "Với density=N/area, ta tìm area=N/density rồi dùng aspect ratio để chia thành width và height. Thay đổi N vì thế không vô tình nén hạt vào cùng một diện tích.",
        },
        {
          title: "Đặt hạt ở tâm từng ô lattice",
          explanation:
            "Lattice cho ta khoảng cách ban đầu rõ ràng hơn việc thả ngẫu nhiên. Jitter chỉ chiếm một phần nhỏ kích thước ô nên phá được đối xứng mà vẫn tránh chồng lấn.",
        },
        {
          title: "Giữ dữ liệu vật lý độc lập phần vẽ",
          explanation:
            "`Particle` không chứa màu hoặc pixel radius. Hàm world-to-screen đọc box và viewport khi render, vì vậy resize không làm trạng thái vật lý thay đổi.",
        },
      ],
    },
    "p42-l02": {
      focus:
        "Gán vận tốc từ seed, loại vận tốc tâm khối lượng và rescale để động năng tương ứng với nhiệt độ mục tiêu.",
      expected:
        "Checkpoint 2 cho |P| gần zero và T khớp target; đổi seed thay hướng vận tốc nhưng không phá hai điều kiện này.",
      files,
      steps: [
        {
          title: "Tạo vận tốc thô trước",
          explanation:
            "Mỗi thành phần vận tốc lấy từ cùng PRNG deterministic. Mục tiêu ở đây là một trạng thái có thể kiểm chứng, chưa phải bộ lấy mẫu Maxwell–Boltzmann hoàn chỉnh.",
        },
        {
          title: "Trừ vận tốc trung bình",
          explanation:
            "Tính vCOM=P/Σm, không dùng trung bình cộng nếu khối lượng khác nhau. Trừ vCOM khi khởi tạo giúp tổng động lượng gần 0. Về sau chỉ trừ trong phép đo nhiệt độ, không sửa vận tốc thật của hệ.",
        },
        {
          title: "Rescale theo động năng mục tiêu",
          explanation:
            "Trong reduced units, K_target=0.5·(2N-2)·T. Một hệ số sqrt(K_target/K_current) áp dụng cho mọi velocity giữ hướng tương đối nhưng đưa nhiệt độ về target.",
        },
      ],
    },
    "p42-l03": {
      focus:
        "Dùng force-shifted Lennard–Jones để thế năng và độ dốc cùng tiến về zero khi khoảng cách chạm cutoff.",
      expected:
        "Checkpoint 3 vẽ U và dU/dr liên tục tại rc=2.5σ; cặp ở ngoài rc trả lực và thế năng bằng zero.",
      files,
      steps: [
        {
          title: "Tính mẫu Lennard–Jones gốc",
          explanation:
            "Giữ cùng `ratio6`, `ratio12` và `potentialSlope` như Project 41 để công thức lực không đổi dấu khi chuyển sang nhiều hạt.",
        },
        {
          title: "Trừ giá trị và tiếp tuyến tại cutoff",
          explanation:
            "`Ufs(r)=U(r)-U(rc)-(r-rc)U'(rc)` và `Ufs'(r)=U'(r)-U'(rc)` cùng về 0 tại rc. Phép trừ độ dốc cũng dịch vị trí cân bằng, nên không dùng nguyên mốc r0 của Project 41 để kết luận hướng lực.",
        },
        {
          title: "Phân biệt cắt giá trị với cắt workload",
          explanation:
            "Cặp ngoài cutoff không đóng góp lực, nhưng vòng lặp Project 42 vẫn phải đo khoảng cách của cặp đó. Neighbor list ở Project 44 mới giảm số cặp cần xét.",
        },
      ],
    },
    "p42-l04": {
      focus:
        "Quét miền tam giác i<j, cộng forceOnI và forceOnJ từ cùng một mẫu rồi tách evaluatedPairs khỏi activePairs.",
      expected: "Checkpoint 4 đếm đúng 499.500 cặp ở N=1.000 và tổng mọi lực nội bộ gần (0,0).",
      files,
      steps: [
        {
          title: "Bắt đầu j từ i+1",
          explanation:
            "Cách này bỏ self-pair và không lặp lại cặp theo chiều ngược. Số lượt chạy trở thành N(N-1)/2, là con số ta có thể kiểm trước khi nhìn output.",
        },
        {
          title: "Cập nhật hai force slots cùng lúc",
          explanation:
            "Từ delta i→j và một `potentialSlope`, cộng lực vào i rồi trừ đúng vector đó khỏi j. Tổng lực nội bộ vì thế chỉ còn sai số làm tròn.",
        },
        {
          title: "Dừng khi gặp singular state",
          explanation:
            "Nếu distance quá nhỏ hoặc lực không hữu hạn, hàm trả `valid=false`. Không tiếp tục với một phần mảng force vì trạng thái đó không còn mô tả cùng một bước vật lý.",
        },
      ],
    },
    "p42-l05": {
      focus:
        "Đưa force array vào Velocity Verlet dạng kick–drift–kick và phản xạ phần overshoot ở từng trục của hộp.",
      expected:
        "Checkpoint 5 chạy được nhiều hạt bằng fixed dt; hạt vượt tường quay lại trong box và chỉ thành phần vận tốc pháp tuyến đổi dấu.",
      files,
      steps: [
        {
          title: "Kick nửa bước bằng lực cũ",
          explanation:
            "Mỗi hạt nhận `vHalf = v + 0.5·F/m·dt`. Sau đó vị trí mới dùng chính `vHalf`, không dùng velocity đầu bước.",
        },
        {
          title: "Mirror overshoot thay vì clamp",
          explanation:
            "Nếu x=-0.25, vị trí phản xạ là 0.25. Clamp về 0 làm mất quãng đường đã đi và nếu quên đảo vx, hạt sẽ tiếp tục xuyên tường ở bước sau.",
        },
        {
          title: "Tính lực mới rồi kick nửa bước còn lại",
          explanation:
            "Force array thứ hai phải lấy từ toàn bộ position đã drift và reflect. Chỉ sau khi mọi giá trị hữu hạn, candidate state mới thay state hiện tại.",
        },
      ],
    },
    "p42-l06": {
      focus:
        "Đo kinetic, potential, total energy, temperature và momentum tại cùng state; lưu lịch sử hữu hạn để đọc energy drift.",
      expected:
        "Checkpoint 6 vẽ K/U/E, nhiệt độ và relative drift; reset xóa history cũ và đo lại initialEnergy.",
      files,
      steps: [
        {
          title: "Cộng potential ngay trong force pass",
          explanation:
            "Mỗi active pair đã có force-shifted potential nên không cần chạy một vòng O(N²) khác chỉ để tính U. Renderer đọc lại metrics ở nhịp lấy mẫu, không phải mỗi pixel.",
        },
        {
          title: "Tính nhiệt độ từ 2N-2 bậc tự do",
          explanation:
            "Mỗi lần đo, tính K_thermal từ v-vCOM rồi dùng T=2K_thermal/(2N-2). Tường có thể làm vCOM thay đổi; không được lấy động năng toàn phần chia cho 2N-2. E vẫn dùng toàn bộ K để theo dõi bảo toàn năng lượng.",
        },
        {
          title: "Giới hạn history",
          explanation:
            "Đồ thị chỉ giữ số mẫu mới nhất. Thời gian mô phỏng có thể tăng lâu, nhưng mảng history và chi phí vẽ không được tăng theo vô hạn.",
        },
      ],
    },
    "p42-l07": {
      focus:
        "Đo số cặp và thời gian bước theo N, đồng thời đặt hard guard cho accumulator và benchmark.",
      expected:
        "Checkpoint 7 cho thấy tăng N từ 256 lên 1.000 làm pair count tăng gần 15,3 lần; workload tự dừng trong ngân sách đã định.",
      files,
      steps: [
        {
          title: "Luôn báo pair count trước timing",
          explanation:
            "N(N-1)/2 đếm cặp trong một lần tính lực. Mỗi bước Verlet hiện gọi hai lần, nên N=1.000 tương ứng 999.000 lượt xét. Timing gồm bước tích phân và cập nhật số đo, không gồm vẽ hoặc lưu lịch sử.",
        },
        {
          title: "Tách evaluatedPairs khỏi activePairs",
          explanation:
            "Cutoff làm activePairs nhỏ hơn, nhưng brute-force scan vẫn evaluate mọi cặp. Đây là bằng chứng định lượng cho bước chuyển sang neighbor list.",
        },
        {
          title: "Không bù thời gian vô hạn",
          explanation:
            "Khi một physics step đã đắt, cố chạy mọi bước còn thiếu sẽ khiến ứng dụng không bao giờ quay lại event loop. Guard giữ UI phản hồi và ghi lại dropped time.",
        },
      ],
    },
    "p42-l08": {
      focus:
        "Ghép preset 64–1.000 hạt, inspector, fixed dt, đồ thị, validation, reset và cleanup thành ứng dụng hoàn chỉnh.",
      expected:
        "Final chạy độc lập, preset 1.000 báo 499.500 evaluated pairs, V cho báo cáo validation hữu hạn và ZIP chứa đủ source cùng CTest.",
      files,
      steps: [
        {
          title: "Mọi thay đổi cấu hình đi qua rebuild",
          explanation:
            "Count, density, temperature và seed cùng tạo lại system, initialEnergy, history và accumulator. Không preset nào giữ sót force hoặc velocity từ thí nghiệm trước.",
        },
        {
          title: "Giữ trạng thái hợp lệ trước bước lỗi",
          explanation:
            "Một physics step được dựng ở candidate state. Nếu lực mới không hữu hạn hoặc phản xạ vượt guard, chương trình báo lỗi và không commit nửa state.",
        },
        {
          title: "Dọn tài nguyên và kết thúc kiểm thử",
          explanation:
            "Texture, renderer và window được hủy theo thứ tự ngược lúc tạo. CTest chỉ gọi code CPU với số bước hữu hạn và trả exit code rõ ràng.",
        },
      ],
    },
  },
  references: {
    "p42-l01": [
      { label: "Reduced units", href: "/glossary#reduced-units", kind: "Thuật ngữ" },
      { label: "Number density", href: "/glossary#number-density", kind: "Thuật ngữ" },
    ],
    "p42-l02": [
      {
        label: "Kinetic temperature",
        href: "/glossary#kinetic-temperature",
        kind: "Thuật ngữ",
      },
      { label: "Linear momentum", href: "/glossary#linear-momentum", kind: "Thuật ngữ" },
    ],
    "p42-l03": [
      {
        label: "Force-shifted cutoff",
        href: "/glossary#force-shifted-cutoff",
        kind: "Thuật ngữ",
      },
      {
        label: "Lennard–Jones potential",
        href: "/glossary#lennard-jones-potential",
        kind: "Thuật ngữ",
      },
    ],
    "p42-l04": [
      { label: "Unordered pair", href: "/glossary#unordered-pair", kind: "Thuật ngữ" },
      {
        label: "Force accumulation",
        href: "/glossary#force-accumulation",
        kind: "Thuật ngữ",
      },
    ],
    "p42-l05": [
      { label: "Velocity Verlet", href: "/glossary#velocity-verlet", kind: "Thuật ngữ" },
      {
        label: "Reflective boundary",
        href: "/glossary#reflective-boundary",
        kind: "Thuật ngữ",
      },
    ],
    "p42-l06": [
      { label: "Mechanical energy", href: "/glossary#mechanical-energy", kind: "Thuật ngữ" },
      { label: "Energy drift", href: "/glossary#energy-drift", kind: "Thuật ngữ" },
    ],
    "p42-l07": [
      { label: "Quadratic work", href: "/glossary#quadratic-work", kind: "Thuật ngữ" },
      {
        label: "Physics accumulator",
        href: "/glossary#physics-accumulator",
        kind: "Thuật ngữ",
      },
    ],
    "p42-l08": [
      {
        label: "Molecular dynamics",
        href: "/glossary#molecular-dynamics",
        kind: "Thuật ngữ",
      },
      {
        label: "SDL_DestroyTexture",
        href: "https://wiki.libsdl.org/SDL3/SDL_DestroyTexture",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
