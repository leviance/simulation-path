import type { ProjectLearningAssets } from "../../learning/types";

const learning = {
  guides: {
    "p24-l01": {
      focus:
        "Tạo 256 quả bóng theo lưới, giữ vị trí trong world space và thay đổi bán kính, khối lượng, vật liệu.",
      expected:
        "Bể hiện đủ 256 bóng; reset tạo lại cùng trạng thái, các vật không nằm chồng lên nhau.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đọc khung có sẵn trước khi thêm thuật toán",
          explanation:
            "Starter đã mở cửa sổ và vẽ khung bể. Ball giữ world position/velocity, radius, inverseMass và vật liệu; pixel chỉ thuộc renderer.",
        },
        {
          title: "Đặt vật vào các ô không chồng lấn",
          explanation:
            "Lưới 16×16 có khoảng cách nhỏ nhất 0,75 m, lớn hơn đường kính lớn nhất 0,48 m. Seed chỉ quyết định vận tốc.",
        },
        {
          title: "Nối dữ liệu với phần vẽ",
          explanation:
            "makeTankBalls tạo vật liệu khác nhau; rebuildScene gọi nó rồi renderer duyệt đúng vector đó, không tự tạo bóng riêng.",
        },
      ],
    },
    "p24-l02": {
      focus:
        "Nối vận tốc với vị trí, tách physics khỏi render và công khai thời gian bị bỏ khi chạm giới hạn công việc.",
      expected:
        "N tiến một dt. Các chuỗi frame tạo cùng state nếu chưa chạm giới hạn bốn substep/frame.",
      files: ["include/lab.hpp", "include/scene.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Tiến một vật bằng vận tốc",
          explanation:
            "integrateBall chỉ sửa position; không dùng số frame như thời gian và không thay velocity khi chưa có lực/va chạm.",
        },
        {
          title: "Dùng một đồng hồ physics",
          explanation:
            "Cả đàn nhận cùng dt. stepScene tăng elapsed đúng một dt, còn render không tăng đồng hồ.",
        },
        {
          title: "Giới hạn phần việc của mỗi frame",
          explanation:
            "Accumulator chỉ cho nhiều nhất bốn bước mỗi frame. Phần không xử lý kịp được ghi vào droppedTime, không giấu như một kết quả đúng thời gian thực.",
        },
      ],
    },
    "p24-l03": {
      focus:
        "Xét bán kính, hướng chuyển động và restitution; ghi xung lực tường tác dụng lên bóng.",
      expected:
        "Bóng nằm cách tường một radius; thành phần tiếp tuyến giữ nguyên, thành phần đang lao vào tường phản xạ theo e.",
      files: ["include/lab.hpp", "include/scene.hpp"],
      steps: [
        {
          title: "Tính giới hạn của tâm",
          explanation: "Tường trái x=-10 không cho phép tâm nằm ở -10: giới hạn tâm là -10+radius.",
        },
        {
          title: "Chỉ phản xạ khi vật còn đi ra ngoài",
          explanation:
            "Nếu bóng đang đi vào trong, chỉ sửa vị trí; đảo velocity thêm lần nữa sẽ làm nó mắc ở tường.",
        },
        {
          title: "Giữ xung lực từ tường",
          explanation:
            "Lưu Δp=m(vsau-vtrước). Tường là tác động bên ngoài của hệ chỉ gồm các quả bóng.",
        },
      ],
    },
    "p24-l04": {
      focus: "Tìm contact normal và độ xuyên mà chưa thay đổi vị trí hay vận tốc của hai bóng.",
      expected:
        "Hai bóng mẫu có normal A→B và độ xuyên 0,3 m ở t=0; detection không tự làm chúng bật ra.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Loại sớm cặp ở xa",
          explanation:
            "So distance² với (rA+rB)² trước khi gọi sqrt; tiếp xúc đúng bằng rA+rB không được coi là chồng lấn trong quy ước này.",
        },
        {
          title: "Tạo một contact có quy ước rõ",
          explanation:
            "Normal đi từ A sang B và luôn có độ dài một; impulse/correction sau này đều dùng cùng quy ước.",
        },
        {
          title: "Xử lý hai tâm trùng nhau",
          explanation:
            "Không chia cho zero. Dùng hướng ngược relative velocity làm quy ước; nếu cả hai đứng yên, chọn trục X cố định.",
        },
      ],
    },
    "p24-l05": {
      focus:
        "Từ vận tốc tương đối và khối lượng khác nhau, suy ra xung lực dọc normal rồi kiểm bằng đáp án tính tay.",
      expected:
        "Cặp mA=1, mB=2, vA=1,5, vB=-0,5 với e=1 cho vA=-7/6 và vB=5/6, không phải đảo dấu từng velocity.",
      files: ["include/lab.hpp", "include/scene.hpp"],
      steps: [
        {
          title: "Kiểm cặp đang tiến vào hay tách nhau",
          explanation: "vn=dot(vB-vA,n) âm mới cần impulse. Nếu đã tách nhau, trả 0.",
        },
        {
          title: "Tính một lượng impulse vô hướng",
          explanation:
            "j=-(1+e)vn/(wA+wB). Chọn e hiệu dụng bằng scale nhân min(eA,eB), một quy ước vật liệu được công bố rõ.",
        },
        {
          title: "Phân phối hai tác động đối nhau",
          explanation:
            "A nhận -j*n*wA, B nhận +j*n*wB. Kiểm lại động lượng và động năng bằng các số tính tay.",
        },
      ],
    },
    "p24-l06": {
      focus:
        "Chia phần sửa vị trí theo inverse mass, thêm slop và phân biệt cách này với continuous collision detection.",
      expected:
        "Tách vị trí theo inverse mass nhưng giữ velocity; slop và tỉ lệ sửa không được dùng để che thiếu impulse.",
      files: ["include/lab.hpp", "include/scene.hpp"],
      steps: [
        {
          title: "Chỉ sửa phần vượt slop",
          explanation: "Slop 0,001 m là dung sai hình học. Nó không phải hệ số restitution.",
        },
        {
          title: "Chia dịch chuyển theo inverse mass",
          explanation:
            "Vật nhẹ dịch nhiều hơn vật nặng. Nếu một inverseMass bằng 0 thì vật đó không bị dời.",
        },
        {
          title: "Nhận đúng giới hạn của phương pháp",
          explanation:
            "Đây là cách giải chồng lấn sau bước rời rạc, không tìm thời điểm va chạm như CCD.",
        },
      ],
    },
    "p24-l07": {
      focus:
        "Duyệt i<j, giải vài lượt hữu hạn, khóa lại tường sau lượt cuối và đếm đúng lượng công việc.",
      expected:
        "256 bóng cho 32.640 cặp/lượt, ba lượt thành 97.920 checks mỗi physics step; vẽ và đo số liệu là việc khác.",
      files: ["include/lab.hpp", "include/scene.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Duyệt từng cặp một lần",
          explanation: "j bắt đầu từ i+1, nên không có self-pair hoặc cặp đảo bị giải thêm.",
        },
        {
          title: "Lặp solver chứ không tích phân nhiều lần",
          explanation:
            "Position chỉ tiến một dt. Các lượt tiếp theo chỉ xử lý tường và contact của cùng state.",
        },
        {
          title: "Khóa tường sau lượt cuối",
          explanation:
            "Correction của cặp gần tường có thể đẩy tâm ra ngoài. Giải tường lần cuối rồi mới đo phần xuyên còn lại.",
        },
      ],
    },
    "p24-l08": {
      focus:
        "Kiểm bảo toàn theo đúng hệ đang xét, ghi mẫu sau từng bước và đo độ xuyên còn lại bằng lượt quét độc lập.",
      expected:
        "Kiểm được đàn hồi, mất năng lượng và cân bằng động lượng có tường; đây mới là mốc 2D, chưa hoàn thành phần 3D.",
      files: [
        "include/lab.hpp",
        "include/scene.hpp",
        "include/view.hpp",
        "include/presentation.hpp",
        "tests/tests.cpp",
        "tests/extra-cases.hpp",
      ],
      steps: [
        {
          title: "Chọn đúng hệ khi nói về bảo toàn",
          explanation:
            "Cặp cô lập giữ động lượng; đàn bóng trong bể nhận xung lực tường. Residual dùng P-P0-ΣJwall.",
        },
        {
          title: "Đo lại trên state sau solver",
          explanation:
            "measureWorld quét độc lập để biết overlap còn lại. Contact count trong lúc giải không trả lời được câu hỏi này.",
        },
        {
          title: "Lấy mẫu theo physics",
          explanation:
            "History có t=0 và từng bước, giữ tối đa 601 mẫu. Hai đồ thị động năng/độ xuyên dùng thang riêng.",
        },
      ],
    },
    "p24-l09": {
      focus:
        "Mở rộng normal và vận tốc sang ba thành phần, giữ nguyên phương trình impulse và kiểm bằng ca va chạm xiên.",
      expected:
        "Ví dụ va chạm xiên khớp đủ vx, vy, vz; cùng solver chạy được trên 256 sphere với sáu tường.",
      files: ["include/sphere.hpp", "tests/extra-cases.hpp"],
      steps: [
        {
          title: "Thêm thành phần Z một cách tường minh",
          explanation:
            "Sphere giữ Vec3 position/velocity; dot, normal và khoảng cách đều tính đủ ba thành phần.",
        },
        {
          title: "Giữ nguyên ý nghĩa của impulse",
          explanation:
            "Công thức vô hướng j không đổi; phép cộng/trừ vector nay tác động cả Z. Không bỏ trục này trong tests.",
        },
        {
          title: "Kiểm toán trước khi ghép camera",
          explanation:
            "Bài này chạy kiểm công thức 3D; cửa sổ còn giữ bể 2D. Bài 10 mới thêm cách nhìn toàn bộ bể 3D.",
        },
      ],
    },
    "p24-l10": {
      focus:
        "Chiếu phối cảnh, tìm mặt trước sphere bằng ray và dùng depth buffer; camera thay đổi góc nhìn chứ không xoay state.",
      expected:
        "Chọn 3D hiện 256 sphere chuyển động có chiều sâu; orbit chỉ thay camera, không thay state vật lý.",
      files: ["include/projection.hpp", "include/scene.hpp", "include/view.hpp", "src/main.cpp"],
      steps: [
        {
          title: "Đưa world point vào camera space",
          explanation: "Tạo basis từ eye nhìn về tâm bể, rồi lấy dot với right/up/forward.",
        },
        {
          title: "Tìm mặt trước của sphere",
          explanation:
            "Mỗi pixel trong silhouette giải ray–sphere. Dùng view-space Z cho depth test, không chỉ sort theo tâm.",
        },
        {
          title: "Tách input camera khỏi physics",
          explanation:
            "Kéo ở chế độ 3D đổi yaw/pitch. Kiểm world positions, velocity và elapsed không đổi trong lúc chỉ orbit.",
        },
      ],
    },
    "p24-l11": {
      focus:
        "Ghép hai không gian, thêm vật thể có kiểm tra chỗ trống, xử lý capture và kiểm toàn bộ mã tải về.",
      expected:
        "Hai không gian, spawn, kick, camera, debug, tests và ZIP đều dùng cùng source đã kiểm chứng.",
      files: ["include/scene.hpp", "src/main.cpp", "tests/tests.cpp", "tests/extra-cases.hpp"],
      steps: [
        {
          title: "Spawn có giới hạn và có kiểm chỗ trống",
          explanation:
            "Mỗi lần thử một danh sách ứng viên hữu hạn, thêm tối đa 16, tổng không quá 512; không chèn vật vào chỗ đang bị chiếm.",
        },
        {
          title: "Giữ đúng chủ sở hữu gesture",
          explanation:
            "Chỉ pointer bắt đầu được sửa thao tác; dùng mẫu thả cuối, nhả capture khi blur/resize/reset và không nhận input đã hủy.",
        },
        {
          title: "Kiểm chính mã vừa viết",
          explanation:
            "Cuối học phần, đổi include tests sang starter/include để kiểm bài làm. Không lấy kết quả của final tham khảo làm bằng chứng cho Starter.",
        },
      ],
    },
  },
  references: {
    "p24-l01": [
      {
        label: "Inverse mass",
        href: "/glossary#inverse-mass",
        kind: "Thuật ngữ",
      },
      {
        label: "Vector 2D",
        href: "/glossary#vector-2d",
        kind: "Thuật ngữ",
      },
      {
        label: "Deterministic simulation",
        href: "/glossary#deterministic-simulation",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l02": [
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
      {
        label: "Physics accumulator",
        href: "/glossary#physics-accumulator",
        kind: "Thuật ngữ",
      },
      {
        label: "Numerical integration",
        href: "/glossary#numerical-integration",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l03": [
      {
        label: "Coefficient of restitution",
        href: "/glossary#coefficient-of-restitution",
        kind: "Thuật ngữ",
      },
      {
        label: "Contact normal",
        href: "/glossary#contact-normal",
        kind: "Thuật ngữ",
      },
      {
        label: "Invariant",
        href: "/glossary#invariant",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l04": [
      {
        label: "Collision detection",
        href: "/glossary#collision-detection",
        kind: "Thuật ngữ",
      },
      {
        label: "Contact normal",
        href: "/glossary#contact-normal",
        kind: "Thuật ngữ",
      },
      {
        label: "Penetration depth",
        href: "/glossary#penetration-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l05": [
      {
        label: "Collision impulse",
        href: "/glossary#collision-impulse",
        kind: "Thuật ngữ",
      },
      {
        label: "Linear momentum",
        href: "/glossary#linear-momentum",
        kind: "Thuật ngữ",
      },
      {
        label: "Kinetic energy",
        href: "/glossary#kinetic-energy",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l06": [
      {
        label: "Positional correction",
        href: "/glossary#positional-correction",
        kind: "Thuật ngữ",
      },
      {
        label: "Inverse mass",
        href: "/glossary#inverse-mass",
        kind: "Thuật ngữ",
      },
      {
        label: "Penetration depth",
        href: "/glossary#penetration-depth",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l07": [
      {
        label: "Pairwise brute force",
        href: "/glossary#pairwise-brute-force",
        kind: "Thuật ngữ",
      },
      {
        label: "Collision detection",
        href: "/glossary#collision-detection",
        kind: "Thuật ngữ",
      },
      {
        label: "Fixed timestep",
        href: "/glossary#fixed-timestep",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l08": [
      {
        label: "Linear momentum",
        href: "/glossary#linear-momentum",
        kind: "Thuật ngữ",
      },
      {
        label: "Kinetic energy",
        href: "/glossary#kinetic-energy",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
    ],
    "p24-l09": [
      {
        label: "Vector 3D",
        href: "/glossary#vector-3d",
        kind: "Thuật ngữ",
      },
      {
        label: "Collision impulse",
        href: "/glossary#collision-impulse",
        kind: "Thuật ngữ",
      },
      {
        label: "Linear momentum",
        href: "/glossary#linear-momentum",
        kind: "Thuật ngữ",
      },
      {
        label: "Kinetic energy",
        href: "/glossary#kinetic-energy",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l10": [
      {
        label: "Camera space",
        href: "/glossary#camera-space",
        kind: "Thuật ngữ",
      },
      {
        label: "Perspective projection",
        href: "/glossary#perspective-projection",
        kind: "Thuật ngữ",
      },
      {
        label: "Depth buffer",
        href: "/glossary#depth-buffer",
        kind: "Thuật ngữ",
      },
    ],
    "p24-l11": [
      {
        label: "Linear momentum",
        href: "/glossary#linear-momentum",
        kind: "Thuật ngữ",
      },
      {
        label: "Kinetic energy",
        href: "/glossary#kinetic-energy",
        kind: "Thuật ngữ",
      },
      {
        label: "CTest",
        href: "https://cmake.org/cmake/help/latest/manual/ctest.1.html",
        kind: "CMake",
      },
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default learning;
