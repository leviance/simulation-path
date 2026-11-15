import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Vẽ một bức tường, đổ cát lên đó rồi phá một đoạn để nước tràn qua. Từ vài ô đứng yên, bạn tự xây hộp cát 512×320 ô bằng C++/SDL3, tìm hiểu luật đổi chỗ, thứ tự cập nhật và cách vẽ cả lưới bằng một texture.",
  duration: "12–17 giờ",
  prerequisites: [
    "Project 01–02: tạo SDL3 window/renderer, đọc event và phân biệt cập nhật với vẽ.",
    "Project 03–04: brush tròn, nối nét vẽ và tọa độ trên lưới. Các bước cần dùng được nhắc lại trong bài.",
    "Biết std::vector, enum class, vòng lặp và header. Không cần OpenGL, kiến thức chất lưu hoặc học xong Project 45.",
    "Thời lượng gồm đọc, tự viết và thử nghiệm; chưa tính cài compiler/SDL hoặc xử lý môi trường build.",
  ],
  objectives: [
    "Vẽ được vật liệu trên lưới trước khi thêm chuyển động; tách Cell khỏi màu hiển thị.",
    "Nối chuột/phím với cùng thao tác vẽ, giữ nét liền và không nối qua ngoài viewport.",
    "Tự viết luật cát/nước và moved mask; giải thích vì sao ô trống vừa được nhường vẫn dùng lại được.",
    "Đối chiếu các thứ tự duyệt, không nhầm cập nhật tại chỗ với cellular automaton đồng bộ.",
    "Giữ 30 tick/giây, điều chỉnh speed và công bố thời gian bị bỏ khi vượt ngân sách bù bước.",
    "Cập nhật/vẽ 163.840 ô thật bằng streaming texture; đọc RGBA/pitch và tách chi phí update khỏi presentation.",
    "Kiểm luật bằng ca một bước, oracle ID độc lập, bảo toàn vật liệu và benchmark Release hữu hạn.",
  ],
  challenge: {
    timebox: "Thử 90–120 phút với lưới nhỏ; sản phẩm đầy đủ được xây qua các bài sau",
    mission:
      "Tự xây một hộp cát 2D bằng C++ và SDL3. Người dùng vẽ cát, tường hoặc nước lên lưới, cho chạy rồi sửa cảnh ngay khi đang quan sát. Khi bỏ một đoạn tường, phải nhìn thấy vật liệu phía trên rơi và lan ra; không dùng animation có sẵn.",
    outcome:
      "Một ứng dụng độc lập với lưới cuối 512×320 = 163.840 ô, bút vẽ, bảng điều khiển, nhiều cảnh mẫu và chế độ xem sạch. Lưới 96×64 chỉ dùng ở các bài đầu để đọc từng bước, không thay bản cuối.",
    requirements: [
      "Mỗi ô chứa Empty, Wall, Sand hoặc Water. Cát tạo đống, nước giả lan ngang, tường giữ nguyên; vùng ngoài lưới bị chặn.",
      "Chuột trái vẽ, chuột phải tẩy, bán kính 0–24 ô; nét không đứt khi kéo nhanh và không nối qua vùng ngoài lưới. Có cách chọn ô/vẽ bằng bàn phím.",
      "Có chạy/dừng, tiến một tick, speed 0.25/0.5/1/2/4, xóa và đặt lại. Pause vẫn cho sửa cảnh; reset tái tạo đúng preset/seed và trở về pause.",
      "Có năm cảnh: bậc thềm, phễu, vỡ đập, hỗn hợp có seed và lưới trống. Resize không đổi dữ liệu hoặc làm kẹt nét vẽ.",
      "Bản cuối cập nhật và vẽ toàn bộ 512×320 ô. Có view sạch, màu phẳng và thông tin về vật liệu, tick, ô đã xét, swaps, bộ nhớ và thời gian bị bỏ.",
      "Công bố seed/thứ tự quét; cho đổi order để thử lại từ cùng input. Kiểm chứng riêng không làm thay đổi cảnh đang vẽ.",
      "Gói source tự chứa starter, chín checkpoint, final, tests và hướng dẫn build/run; không cần ghép ZIP từ project khác.",
    ],
    constraints: [
      "Tự viết grid và material rules; không dùng game/physics engine hoặc GPU compute. SDL chỉ xử lý window, input, timing và presentation.",
      "Luật cập nhật tại chỗ: cát thử xuống rồi chéo, nước thử thêm ngang; cát được đổi chỗ với nước. Mỗi hạt tham gia tối đa một lần di chuyển trong tick.",
      "Moved mask đánh dấu hai đầu swap nhưng không giữ chỗ Empty: hạt khác vẫn có thể dùng ô vừa trống. Đích Water đã di chuyển thì không được đổi chỗ thêm.",
      "Default duyệt từ dưới lên, đảo chiều ngang mỗi tick; hướng chéo ưu tiên theo x+y+tick. Đảo chiều không bảo đảm đối xứng hoặc độc lập thứ tự.",
      "Nhịp chuẩn 30 tick/giây, nhận tối đa 0,25 giây wall time/frame và chạy tối đa bốn tick/frame. Báo dropped model seconds đã tính speed; không tích nợ trong pause.",
      "Đây là cellular sandbox, không phải nghiệm chất lưu: chưa có áp suất, độ nhớt hoặc bảo toàn động lượng. Nước có thể tiếp tục đổi chỗ ngang.",
      "Bảo toàn từng vật liệu chỉ được kiểm khi không paint/erase/reset. Seed chỉ ảnh hưởng cách xếp ban đầu ở cảnh Hỗn hợp, không sinh chuyển động ngẫu nhiên mỗi tick.",
    ],
    definitionOfDone: [
      "Một hạt cát chỉ xuống một hàng/tick; một cột cát được dùng lại các ô vừa trống. Nước không chạy hết một hàng trong một tick.",
      "Các fixture nhỏ xác nhận biên, vật liệu, swap và ảnh hưởng order; oracle ID độc lập khớp từng ô qua nhiều tick, không chỉ gọi cùng hàm hai lần.",
      "Mixture 512×320/seed 46 sau 120 tick giữ số ô từng loại, vị trí tường và checksum 524100528 với order mặc định; mỗi tick xét đủ 163.840 ô.",
      "Ở speed 1, các chuỗi 15/30/120 FPS đủ hai giây đều tạo 60 tick khi không chạm budget. Stall, NaN, pause và mất focus không gây bù vô hạn.",
      "Brush, chuột phải, keyboard, clear/reset/preset/seed/order/speed, resize và view sạch hoạt động; texture xử lý đúng pitch và không làm đổi vật liệu.",
      "Build starter, cả chín checkpoint và final; CTest Debug/Release kiểm thật và có thể thất bại. Source trong bài khớp đúng checkpoint, ZIP chạy độc lập.",
      "Benchmark hữu hạn ghi cấu hình máy, Release, kích thước, seed/order, warm-up/repeat và raw timings; không diễn giải CPU draw submission thành GPU time.",
    ],
  },
  lessonAliases: {
    "07-kiem-chung-va-hoan-thien": "09-kiem-chung-va-hoan-thien",
  },
  lessons: [
    {
      id: "p46-l01",
      slug: "01-ve-luoi-vat-lieu",
      order: 1,
      title: "Vẽ một lưới cát và tường bằng SDL3",
      summary:
        "Từ khung cửa sổ có sẵn, lưu Cell và gọi drawGrid để thấy vật liệu trước khi nghĩ đến luật rơi.",
      estimatedMinutes: 75,
      demoId: "falling-sand",
    },
    {
      id: "p46-l02",
      slug: "02-ve-bang-chuot",
      order: 2,
      title: "Biến con trỏ thành bút vẽ vật liệu",
      summary:
        "Nối input với paintDisk/paintStroke, xử lý letterbox và kết thúc nét khi con trỏ ra ngoài.",
      estimatedMinutes: 75,
      demoId: "falling-sand",
    },
    {
      id: "p46-l03",
      slug: "03-cat-roi-tung-tick",
      order: 3,
      title: "Cho cát rơi từng ô, từng tick",
      summary:
        "Viết swap, moved mask và vòng duyệt từ dưới lên; ô vừa trống không phải chỗ bị giữ lại.",
      estimatedMinutes: 65,
      demoId: "falling-sand",
    },
    {
      id: "p46-l04",
      slug: "04-cat-truot-va-thu-tu-duyet",
      order: 4,
      title: "Để cát trượt xuống hai bên và tạo đống",
      summary:
        "Thêm hai đích chéo, đảo chiều ngang và thử xem thứ tự cập nhật làm đổi kết quả ra sao.",
      estimatedMinutes: 60,
      demoId: "falling-sand",
    },
    {
      id: "p46-l05",
      slug: "05-nuoc-va-doi-cho",
      order: 5,
      title: "Thêm nước giả và giữ đủ từng loại vật liệu",
      summary:
        "Cho nước lan ngang và cát đổi chỗ với nước, đồng thời giữ hạt bị đẩy lên không đi lần thứ hai.",
      estimatedMinutes: 65,
      demoId: "falling-sand",
    },
    {
      id: "p46-l06",
      slug: "06-nhip-mo-phong-co-dinh",
      order: 6,
      title: "Giữ nhịp mô phỏng khi tốc độ vẽ thay đổi",
      summary:
        "Tích lũy thời gian cho 30 tick/giây, thêm speed, giới hạn bước bù và làm rõ pause/mất focus.",
      estimatedMinutes: 75,
      demoId: "falling-sand",
    },
    {
      id: "p46-l07",
      slug: "07-texture-va-luoi-lon",
      order: 7,
      title: "Vẽ cả lưới 512×320 bằng một texture",
      summary:
        "Thay hàng nghìn draw call bằng RGBA streaming texture, xử lý pitch và đo từng phần công việc.",
      estimatedMinutes: 75,
      demoId: "falling-sand",
    },
    {
      id: "p46-l08",
      slug: "08-bang-dieu-khien-va-canh-mau",
      order: 8,
      title: "Hoàn thiện bút vẽ, bảng điều khiển và cảnh mẫu",
      summary:
        "Cho chuột/phím gọi chung lệnh; thêm năm preset, seed, scan order và giữ nút để rót theo tick.",
      estimatedMinutes: 85,
      demoId: "falling-sand",
    },
    {
      id: "p46-l09",
      slug: "09-kiem-chung-va-hoan-thien",
      order: 9,
      title: "Kiểm chứng hộp cát và chạy dự án hoàn chỉnh",
      summary:
        "Dùng oracle độc lập và invariants, build Debug/Release, đo update hữu hạn và đọc toàn bộ source.",
      estimatedMinutes: 90,
      demoId: "falling-sand",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
