import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p44-l01": {
      focus: "Từ một cửa sổ có hình, xác định phần tính toán cần giảm.",
      expected: "Có 64 hạt đứng yên, vòng cutoff xanh quanh A và 2.016 cặp mỗi lần tính lực.",
      files: ["src/main.cpp", "include/neighbor_view.hpp", "include/dynamics.hpp"],
      steps: [
        {
          title: "Dùng lại mô hình đã học",
          explanation:
            "periodic.hpp và dynamics.hpp giữ nguyên phần hình học, lực và Velocity Verlet từ Project 43. Bài này chỉ gọi makeGas để tạo state và chưa chạy solver.",
        },
        {
          title: "Vẽ từng hạt",
          explanation:
            "Đổi position sang screen space rồi đặt marker bằng SDL_RenderFillRect. Vẽ vòng cutoff bằng các đoạn SDL_RenderLine, kể cả phần đi qua biên.",
        },
        {
          title: "Đếm trước khi tối ưu",
          explanation:
            "N(N−1)/2 là số cặp khác nhau. Vòng tròn không làm vòng lặp mọi cặp chạy ít hơn; nó chỉ giúp nhìn ra những phép đo đang bị lãng phí.",
        },
      ],
    },
    "p44-l02": {
      focus: "Tách việc tìm cặp khỏi việc tính lực cho cặp đó.",
      expected: "Vòng vàng rộng hơn vòng xanh; danh sách gồm mỗi cặp đúng một lần.",
      files: ["include/neighbor_list.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Định nghĩa dữ liệu cần giữ",
          explanation:
            "PairIndex chỉ lưu hai chỉ số. NeighborList còn lưu mốc unwrapped và cấu hình để các bài sau biết khi nào phải dựng lại.",
        },
        {
          title: "Duyệt i<j và lọc listRadius",
          explanation:
            "rebuildNaive dùng minimumImage như vòng lặp lực. Nó chỉ lưu chỉ số, không tính hoặc lưu một lực để tái sử dụng.",
        },
        {
          title: "Lưu mốc sau khi dựng",
          explanation:
            "saveReference chụp unwrapped hiện tại. Ở checkpoint này danh sách được dựng lại sau mọi thao tác kéo, chưa áp dụng điều kiện nửa skin.",
        },
      ],
    },
    "p44-l03": {
      focus: "Thay nguồn các cặp được duyệt, không thay công thức lực.",
      expected: "Cặp trong lớp skin có trong danh sách nhưng lực và U vẫn bằng zero.",
      files: ["include/neighbor_list.hpp"],
      steps: [
        {
          title: "Đặt lại tổng lực và U",
          explanation:
            "Mỗi lần evaluateListed tạo kết quả mới. PairIndex còn hiệu lực không có nghĩa là lực của frame trước còn đúng.",
        },
        {
          title: "Đo lại khoảng cách hiện tại",
          explanation:
            "Một cặp đã lưu có thể đi ra ngoài cutoff. Kiểm distance >= cutoff trước khi gọi shiftedPair.",
        },
        {
          title: "Cộng hai lực đối nhau",
          explanation:
            "Dùng cùng force cho i và j với hai dấu ngược nhau. potential cộng một lần vì danh sách chỉ chứa i<j.",
        },
      ],
    },
    "p44-l04": {
      focus: "Có một điều kiện rõ ràng trước khi cho phép tái sử dụng danh sách.",
      expected: "Các lần dịch nhỏ không tăng rebuilds; chạm skin/2 thì mốc được chụp lại.",
      files: ["include/neighbor_list.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Theo dõi độ dời từ mốc",
          explanation:
            "maximumDisplacement lấy chuẩn của unwrapped hiện tại trừ reference. Không cộng chiều dài từng bước và không trừ hai position đã wrap.",
        },
        {
          title: "Xét cả hai đầu của cặp",
          explanation:
            "Hai hạt có thể cùng tiến lại gần. Mỗi hạt dời chưa tới skin/2 thì khoảng cách cặp giảm chưa tới skin.",
        },
        {
          title: "Đóng gói kiểm tra hiệu lực",
          explanation:
            "ensureList gọi needsRebuild rồi mới chọn dựng lại. Count, hộp, cutoff, skin và generation đều là lý do phải bỏ mốc cũ.",
        },
      ],
    },
    "p44-l05": {
      focus: "Giảm chi phí dựng mà giữ nguyên đầu ra của builder.",
      expected: "Grid và naive tạo cùng dãy cặp i<j, kể cả hộp chỉ có hai ô trên một trục.",
      files: ["include/neighbor_list.hpp"],
      steps: [
        {
          title: "Chọn kích thước ô",
          explanation:
            "floor(L/listRadius) bảo đảm bề rộng thực của ô không nhỏ hơn listRadius. Vì vậy chỉ cần ô hiện tại và tám ô kề.",
        },
        {
          title: "Loại ô bị lặp sau wrap",
          explanation:
            "Với hai ô trên một trục, offset -1 và +1 dẫn tới cùng ô. visited lưu cellId đã xử lý, không dùng j>i để thay cho bước này.",
        },
        {
          title: "Chuẩn hóa thứ tự đầu ra",
          explanation:
            "Sort i rồi j để so trực tiếp với naive và giữ cùng thứ tự cộng lực. Vẽ grid chỉ là lựa chọn hiển thị.",
        },
      ],
    },
    "p44-l06": {
      focus: "Đưa cache vào một bước vật lý mà không làm sai thứ tự cập nhật.",
      expected:
        "Hạt chạy trong hộp tuần hoàn; danh sách chỉ dựng lại khi cần, còn force được tính lại mỗi bước.",
      files: ["include/neighbor_dynamics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tính lực đầu bước",
          explanation:
            "Sao chép system và list sang candidate. Gọi ensureList trước evaluateListed; không tái sử dụng giá trị lực chỉ vì danh sách chưa đổi.",
        },
        {
          title: "Kiểm lại sau drift",
          explanation:
            "Drift có thể đưa hạt vượt ngưỡng nửa skin. Gọi ensureList lần nữa trước khi tính lực dùng cho nửa kick cuối.",
        },
        {
          title: "Nhận hoặc bỏ cả bước",
          explanation:
            "Nếu một cặp quá gần hay có số không hữu hạn, giữ nguyên system, list và các bộ đếm. Vòng chạy chỉ làm tối đa 8 bước mỗi frame.",
        },
      ],
    },
    "p44-l07": {
      focus: "Phân biệt kết quả hữu hạn với kết quả tính đủ các cặp.",
      expected: "Ca hai hạt cho đúng một cặp thiếu; dựng lại danh sách làm sai số về gần zero.",
      files: ["include/neighbor_dynamics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Giữ một đối chứng độc lập",
          explanation:
            "pbc::evaluate vẫn quét i<j trên cùng state. Không gọi ensureList bên trong audit vì như vậy sẽ sửa mất lỗi trước khi đo.",
        },
        {
          title: "Đếm cặp bị bỏ sót",
          explanation:
            "Một cặp có distance < cutoff phải có trong list.pairs. Điều kiện này bắt được lỗi ngay cả khi tổng lực tình cờ triệt tiêu.",
        },
        {
          title: "Giới hạn thí nghiệm sai",
          explanation:
            "Phím F chỉ đóng băng danh sách cho thao tác tay. Chạy hoặc tiến bước bị khóa cho tới khi rời chế độ này.",
        },
      ],
    },
    "p44-l08": {
      focus: "Nhìn cả hai phía của đánh đổi: dựng lại nhiều hay duyệt danh sách dài.",
      expected:
        "Có bảng bốn giá trị skin, số lần dựng, build checks, force checks và tổng công việc.",
      files: ["include/neighbor_dynamics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Cố định ca đo",
          explanation:
            "Mỗi lượt tạo lại 64 hạt, seed=44 và chạy 200 bước dt=0.002. Không đo trên trạng thái vừa kéo tay.",
        },
        {
          title: "Tách hai bộ đếm",
          explanation:
            "buildChecks tăng khi builder đo một cặp ứng viên. forceChecks tăng khi solver duyệt cặp đã lưu, kể cả cặp bị loại bởi cutoff.",
        },
        {
          title: "Đọc đúng giới hạn của phép đo",
          explanation:
            "Số phép kiểm không bao gồm sort, copy, vẽ hay audit. Ít phép kiểm hơn chưa đủ để kết luận nhanh hơn theo mili giây.",
        },
      ],
    },
    "p44-l09": {
      focus: "Có bằng chứng cache không làm đổi kết quả của mô hình tham chiếu.",
      expected:
        "Tests thuần C++ chạy Debug và Release; final có đủ điều khiển, kiểm chứng và source ZIP.",
      files: ["tests/tests.cpp", "include/neighbor_dynamics.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Kiểm từ ca nhỏ",
          explanation:
            "Dùng hai hạt cho lớp skin, stale list và rollback; dùng hộp hai ô mỗi trục để bắt lỗi đếm trùng cell.",
        },
        {
          title: "Đối chiếu qua nhiều bước",
          explanation:
            "validateNeighborList chạy hai hệ cùng state đầu, một dùng cache, một dùng mọi cặp. So force, U, q, v, năng lượng và động lượng.",
        },
        {
          title: "Build đúng bản cần chạy",
          explanation:
            "Final là target mặc định. Bật BUILD_CHECKPOINTS khi muốn build starter và chín mốc; CTest không cần mở cửa sổ.",
        },
      ],
    },
  },
  references: {
    "p44-l01": [
      {
        label: "World space",
        href: "/glossary#world-space",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l02": [
      {
        label: "Neighbor list",
        href: "/glossary#neighbor-list",
        kind: "Thuật ngữ",
      },
      {
        label: "Neighbor skin",
        href: "/glossary#neighbor-skin",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l03": [
      {
        label: "Force-shifted cutoff",
        href: "/glossary#force-shifted-cutoff",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l04": [
      {
        label: "Quy tắc nửa skin",
        href: "/glossary#half-skin-rule",
        kind: "Thuật ngữ",
      },
      {
        label: "Unwrapped coordinates",
        href: "/glossary#unwrapped-coordinates",
        kind: "Thuật ngữ",
      },
      {
        label: "LAMMPS — Neighbor lists",
        href: "https://docs.lammps.org/Developer_par_neigh.html",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l05": [
      {
        label: "Minimum image convention",
        href: "/glossary#minimum-image",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l06": [
      {
        label: "Velocity Verlet",
        href: "/glossary#velocity-verlet",
        kind: "Thuật ngữ",
      },
      {
        label: "Physics accumulator",
        href: "/glossary#physics-accumulator",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l07": [
      {
        label: "Neighbor list",
        href: "/glossary#neighbor-list",
        kind: "Thuật ngữ",
      },
      {
        label: "LAMMPS — Khi nào dựng lại danh sách",
        href: "https://docs.lammps.org/neigh_modify.html",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l08": [
      {
        label: "Công việc tăng theo bình phương",
        href: "/glossary#quadratic-work",
        kind: "Thuật ngữ",
      },
    ],
    "p44-l09": [
      {
        label: "Energy drift",
        href: "/glossary#energy-drift",
        kind: "Thuật ngữ",
      },
      {
        label: "Động lượng",
        href: "/glossary#linear-momentum",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;

export default learning;
