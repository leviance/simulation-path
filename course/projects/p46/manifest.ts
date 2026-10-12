import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Tự xây một hộp cát 2D: vẽ cát, tường và nước lên lưới, rồi cho từng ô đổi chỗ theo luật. Bạn sẽ thấy thứ tự duyệt ảnh hưởng kết quả thế nào, vì sao nước có thể chạy nhiều lần trong một tick và cách kiểm tra không làm mất vật liệu.",
  duration: "9–12 giờ",
  prerequisites: [
    "Project 01–02 — SDL3 window, renderer, event loop và fixed timestep",
    "Project 03–04 — brush tròn, nội suy nét vẽ và tọa độ ô lưới",
    "Biết std::vector, enum class, vòng lặp và cách tách code sang header; không cần OpenGL hoặc hoàn thành Project 45",
  ],
  objectives: [
    "Vẽ được một lưới vật liệu trước khi thêm bất kỳ luật mô phỏng nào.",
    "Đổi tọa độ chuột sang ô lưới đúng cả khi resize, HiDPI hoặc có letterbox.",
    "Cho cát rơi, trượt chéo và đổi chỗ với nước bằng các luật có thứ tự rõ ràng.",
    "Dùng moved mask để mỗi hạt chỉ di chuyển một lần trong một tick.",
    "Tách 30 tick/giây khỏi tốc độ vẽ và giới hạn số bước bù khi máy chậm.",
    "Kiểm tra số ô từng vật liệu, tường bất động, kết quả lặp lại và sự tương ứng C++/Canvas.",
  ],
  challenge: {
    timebox: "90–120 phút để thử bản cát rơi trước khi đọc lời giải",
    mission:
      "Tự xây dựng một hộp cát 2D bằng C++ và SDL3. Người dùng vẽ vật liệu lên lưới bằng chuột: cát rơi xuống và tạo đống, nước lan ngang khi không thể rơi tiếp, còn tường đứng yên. Hãy bắt đầu bằng một ô cát nhìn thấy được, không bắt đầu bằng một hệ thống luật chưa có hình để kiểm tra.",
    outcome:
      "Một cửa sổ có lưới 96 × 64, bút vẽ nhiều kích thước, cát/tường/nước/tẩy, chạy/dừng/từng tick, cảnh mẫu và bộ đếm vật liệu. Cửa sổ resize được mà không làm thay đổi trạng thái lưới.",
    requirements: [
      "Lưới lưu đúng một vật liệu mỗi ô: Empty, Wall, Sand hoặc Water; biên ngoài là vùng bị chặn.",
      "Vẽ bằng SDL_RenderFillRect; màu chỉ là cách hiển thị, không phải dữ liệu vật liệu.",
      "Chuột vẽ liên tục, không nối qua vùng ngoài lưới; có bán kính 0–8 ô và thao tác bằng bàn phím.",
      "Cát thử xuống dưới, rồi hai ô chéo; nước thử như cát rồi hai ô ngang nếu còn bị chặn.",
      "Cát có thể đổi chỗ với nước; nước không tự chiếm ô cát. Cả hai ô của một lần đổi chỗ phải được đánh dấu đã di chuyển.",
      "Duyệt từ dưới lên; đảo chiều ngang theo tick, ưu tiên chéo trái/phải bằng parity của x+y+tick.",
      "Mở ứng dụng ở trạng thái tạm dừng. Nhịp chạy là 30 tick/giây, tối đa 4 tick mỗi frame và báo thời gian đã bỏ qua.",
      "Có cảnh cát trên bệ, phễu cát, lưới trống; reset đưa tick về 0 và không tự chạy lại.",
      "Có starter, bảy checkpoint độc lập, final, tests không cần window và ZIP đầy đủ.",
    ],
    constraints: [
      "Đây là cellular rules cập nhật tại chỗ theo thứ tự, không phải CA đồng bộ đọc toàn bộ trạng thái cũ rồi ghi buffer mới.",
      "Không dùng GPU compute, lực Newton, áp suất, độ nhớt hoặc mô hình chất lỏng liên tục. Nước giả có thể dao động ngang mãi.",
      "Chỉ kiểm tra ô đích khi đi chéo: đây là lựa chọn luật, không phải kiểm va chạm hình học của hạt có bán kính.",
      "Đảo chiều giảm thiên lệch quét; không đảm bảo kết quả đối xứng hoàn toàn hoặc độc lập thứ tự.",
      "Bảo toàn số ô từng vật liệu chỉ áp dụng trong các tick không có input vẽ/tẩy/reset.",
    ],
    definitionOfDone: [
      "Một ô cát trong lưới trống chỉ xuống một hàng sau một tick; không xuyên đáy hoặc đi sang hàng khác do sai index.",
      "Hạt nước không chạy hết hàng trong một tick; đổi chỗ cát/nước giữ đủ một ô mỗi loại.",
      "Lặp 120 tick trên cảnh chuẩn giữ nguyên số ô vật liệu và vị trí tường; hai lần chạy cho cùng mảng ô.",
      "Chuỗi frame 15/30/120 FPS tương ứng 2 giây đều tạo 60 tick khi không vượt budget.",
      "Resize, kéo chuột ra ngoài rồi vào lại, bỏ focus và đổi preset không gây nét vẽ mắc kẹt hoặc bù hàng nghìn tick.",
      "Build starter, từng checkpoint, final; CTest Debug và Release trả lỗi thật khi một điều kiện kiểm tra sai.",
    ],
  },
  lessons: [
    {
      id: "p46-l01",
      slug: "01-ve-luoi-vat-lieu",
      title: "Vẽ một lưới cát và tường bằng SDL3",
      summary: "Dựng cửa sổ, chọn hệ tọa độ lưới, lưu vật liệu và vẽ từng ô bằng SDL_FRect.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "falling-sand",
    },
    {
      id: "p46-l02",
      slug: "02-ve-bang-chuot",
      title: "Biến con trỏ chuột thành bút vẽ vật liệu",
      summary:
        "Đổi tọa độ qua logical presentation, tô brush tròn và nối sample để nét vẽ không đứt.",
      order: 2,
      estimatedMinutes: 90,
      demoId: "falling-sand",
    },
    {
      id: "p46-l03",
      slug: "03-cat-roi-tung-tick",
      title: "Cho một ô cát rơi đúng một lần mỗi tick",
      summary: "Tách bước mô phỏng khỏi render, duyệt từ dưới lên và đánh dấu ô đã di chuyển.",
      order: 3,
      estimatedMinutes: 80,
      demoId: "falling-sand",
    },
    {
      id: "p46-l04",
      slug: "04-cat-truot-va-thu-tu-duyet",
      title: "Để cát trượt xuống hai bên và tạo thành đống",
      summary:
        "Thử hai ô chéo, đảo chiều quét và hiểu vì sao thứ tự cập nhật vẫn là một phần của mô hình.",
      order: 4,
      estimatedMinutes: 75,
      demoId: "falling-sand",
    },
    {
      id: "p46-l05",
      slug: "05-nuoc-va-doi-cho",
      title: "Thêm nước giả mà không làm mất cát hoặc nước",
      summary: "Cho nước lan ngang và cát đổi chỗ với nước; kiểm soát cả hai ô của một lần swap.",
      order: 5,
      estimatedMinutes: 90,
      demoId: "falling-sand",
    },
    {
      id: "p46-l06",
      slug: "06-nhip-mo-phong-co-dinh",
      title: "Giữ nhịp mô phỏng khi tốc độ vẽ thay đổi",
      summary:
        "Dùng accumulator 30 tick/giây, giới hạn bước bù, pause và xử lý thời gian khi cửa sổ mất focus.",
      order: 6,
      estimatedMinutes: 80,
      demoId: "falling-sand",
    },
    {
      id: "p46-l07",
      slug: "07-kiem-chung-va-hoan-thien",
      title: "Kiểm chứng hộp cát và chạy bản hoàn chỉnh",
      summary:
        "Thêm preset, inspector, kiểm đếm và checksum; đối chiếu các ca nhỏ trước khi tự tạo cảnh lớn.",
      order: 7,
      estimatedMinutes: 105,
      demoId: "falling-sand",
    },
  ],
} satisfies PublishedProjectEditorial;
export default project;
