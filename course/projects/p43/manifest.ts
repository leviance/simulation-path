import type { PublishedProjectEditorial } from "../../types";

const project = {
  summary:
    "Bỏ các bức tường của hộp khí ở Project 42 để tạo một ô mô phỏng lặp lại theo hai trục. Bạn sẽ cho hạt đi qua biên mà không đổi vận tốc, tính lực bằng minimum image, vẽ các bản sao tuần hoàn và giữ lại tọa độ unwrapped để không nhầm bước nhảy trên màn hình với quãng đường thực.",
  duration: "14–18 giờ",
  prerequisites: [
    "Project 42 — hệ nhiều hạt, force-shifted Lennard–Jones và Velocity Verlet trên CPU",
    "Project 41 — dấu của lực suy ra từ thế năng và reduced units",
    "Project 05 — đổi qua lại giữa world space và screen space",
  ],
  objectives: [
    "Phân biệt ô mô phỏng với hộp có tường và giải thích điều kiện biên tuần hoàn bằng một hạt đi qua mép.",
    "Viết wrap cho cả số âm lẫn nhiều lần vượt biên; giữ position trong miền nửa mở [0,L).",
    "Tìm vector minimum image trong hộp chữ nhật và dùng cùng khoảng cách đó cho lực lẫn thế năng.",
    "Giữ cutoff nhỏ hơn nửa cạnh ngắn nhất, không cộng lực từ các bản sao dùng để vẽ.",
    "Tích phân bằng Velocity Verlet mà không phản xạ vận tốc; giữ tọa độ unwrapped và kiểm chứng năng lượng, động lượng.",
  ],
  challenge: {
    timebox: "2–3 giờ cho bản thử đầu, trước khi mở hướng dẫn",
    mission:
      "Tự xây dựng một mô phỏng Molecular Dynamics 2D có điều kiện biên tuần hoàn ở cả hai trục. Khi hạt đi ra mép phải, nó xuất hiện ở mép trái với nguyên vận tốc. Hai hạt nằm sát hai mép đối diện phải tương tác như hai hạt ở gần nhau, dù phép trừ tọa độ thông thường cho khoảng cách rất lớn.",
    outcome:
      "Một Periodic Molecular Box có preset một hạt, một cặp qua biên và các hệ 64, 144, 1.000 hạt. Người dùng xem được vector minimum image, bật/tắt bản sao tuần hoàn, theo dõi wrapped/unwrapped x và chạy phép kiểm chứng hữu hạn. Canvas có cùng công thức nhưng không thay thế chương trình C++ tải về.",
    requirements: [
      "Đầu tiên phải có cửa sổ SDL3, ô gốc và hai marker đứng yên. Bài đầu giải thích đầy đủ phép đổi world-to-screen và lời gọi SDL_RenderFillRect.",
      "Mỗi hạt chỉ có một state vật lý. Position nằm trong [0,Lx) × [0,Ly); tọa độ âm và bước đi qua nhiều ô đều wrap đúng.",
      "Không đổi dấu velocity khi vượt biên. Vị trí đúng bằng L phải được biểu diễn ở 0.",
      "Với L=12, A.x=0.6 và B.x=11.4, phải đo được khoảng cách tuần hoàn 1.2 thay vì 10.8.",
      "Mỗi cặp i<j dùng minimum image cho cả lực và U; áp dụng force-shifted cutoff từ Project 42 và từ chối rc >= min(Lx,Ly)/2.",
      "Velocity Verlet chỉ commit sau khi cả bước hợp lệ. Hạt gần như trùng nhau, kể cả qua biên, phải làm bước thất bại rõ ràng.",
      "Bản sao ở các ô kề chỉ để hiển thị; bật bản sao không đổi N, số cặp, năng lượng hoặc chuyển động.",
      "Lưu unwrapped bằng cách cộng đúng displacement của bước drift. Không dựng lại đường đi từ chênh lệch hai position đã wrap.",
      "Có pause, reset, single-step, preset và số bước tối đa mỗi frame; không có vòng catch-up vô hạn ở preset 1.000 hạt.",
      "Kèm starter, tám checkpoint độc lập, final có chú thích, tests thuần C++, README và ZIP khớp với source trên web.",
    ],
    constraints: [
      "Chỉ xét hộp chữ nhật 2D có kích thước cố định; không xử lý hộp nghiêng, biến dạng hộp, Coulomb hay Ewald summation.",
      "Giữ vòng lặp mọi cặp trên CPU. Neighbor list thuộc Project 44, chưa đưa vào để che lỗi điều kiện biên.",
      "Không clamp tọa độ vào thành hộp, không bật lại và không tạo hạt mới khi qua biên.",
      "Không dùng ảnh tuần hoàn trong phép cộng lực và không cộng năng lượng hai lần cho i→j và j→i.",
      "Không ép lại vận tốc tâm khối lượng sau mỗi bước để che sai số động lượng. Không clamp lực khi hạt trùng nhau.",
      "Các phép đo dùng reduced units; tốc độ playback và kích thước marker không có ý nghĩa vật lý.",
    ],
    definitionOfDone: [
      "wrap(-0.25,12)=11.75, wrap(12,12)=0 và wrap(36.25,12)=0.25; vận tốc của hạt tự do không đổi.",
      "Minimum image khớp phép tìm ảnh gần nhất trong chín ô kề; định nghĩa tie ở đúng nửa hộp được ghi rõ.",
      "Dịch hệ đi một vector bất kỳ rồi wrap lại không đổi lực và thế năng trong sai số số thực.",
      "Cutoff bằng nửa cạnh ngắn nhất bị từ chối. Hai hạt trùng vị trí qua biên bị từ chối mà không commit nửa bước.",
      "Tại mọi bước, wrap(unwrapped) xấp xỉ position. Một hạt đi qua nhiều biên vẫn có unwrapped = vị trí đầu + v·t.",
      "Preset 1.000 có 499.500 cặp mỗi lần tính lực. Bật ảnh tuần hoàn không làm con số này tăng.",
      "Ca chuẩn 36 hạt, 400 bước dt=0.001 có sai số năng lượng chuẩn hóa lớn nhất dưới 1% và sai số động lượng dưới 1e-9; có ca riêng đi qua biên để kiểm chứng tích phân.",
      "Build được starter, từng checkpoint và final; CTest chạy cả Debug lẫn Release mà không mở cửa sổ.",
    ],
  },
  lessons: [
    {
      id: "p43-l01",
      slug: "01-ve-o-mo-phong-va-hai-hat",
      title: "Vẽ ô mô phỏng và hai hạt ở hai mép",
      summary:
        "Từ bộ khung SDL3 đang chạy, vẽ hộp và marker bằng world-to-screen trước khi nói đến điều kiện biên.",
      order: 1,
      estimatedMinutes: 85,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l02",
      slug: "02-di-qua-bien-ma-khong-bat-lai",
      title: "Cho hạt đi qua biên mà không bật lại",
      summary:
        "Tự suy ra công thức wrap, thử số âm và nhiều lần vượt biên, rồi ghép vào chuyển động thẳng.",
      order: 2,
      estimatedMinutes: 100,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l03",
      slug: "03-do-khoang-cach-qua-bien",
      title: "Đo khoảng cách ngắn nhất qua biên",
      summary:
        "So phép trừ tọa độ với minimum image, vẽ hai vector và kéo hạt để kiểm tra từng trường hợp.",
      order: 3,
      estimatedMinutes: 125,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l04",
      slug: "04-tinh-luc-va-chon-cutoff",
      title: "Tính lực qua biên và chọn cutoff hợp lệ",
      summary:
        "Dùng vector minimum image trong vòng lặp i<j; giữ lực và thế năng nhất quán, xử lý hạt trùng và giới hạn nửa hộp.",
      order: 4,
      estimatedMinutes: 145,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l05",
      slug: "05-verlet-trong-hop-tuan-hoan",
      title: "Chạy Velocity Verlet trong hộp tuần hoàn",
      summary:
        "Thay bước phản xạ bằng wrap, tạo hệ nhiều hạt và chỉ nhận một bước khi mọi giá trị đều hợp lệ.",
      order: 5,
      estimatedMinutes: 155,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l06",
      slug: "06-ve-cac-ban-sao-tuan-hoan",
      title: "Vẽ các bản sao mà không tạo thêm hạt",
      summary:
        "Hiển thị các ô kề để giải thích đường đi qua biên; tách danh sách vị trí vẽ khỏi dữ liệu đưa vào solver.",
      order: 6,
      estimatedMinutes: 80,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l07",
      slug: "07-giu-quy-dao-khong-bi-dut",
      title: "Giữ lại đường đi bằng tọa độ unwrapped",
      summary:
        "Cộng displacement vào một tọa độ không wrap, rồi so hai đường x(t) để hiểu bước nhảy trên màn hình.",
      order: 7,
      estimatedMinutes: 120,
      demoId: "periodic-molecular-box",
    },
    {
      id: "p43-l08",
      slug: "08-kiem-chung-hop-tuan-hoan",
      title: "Kiểm chứng và hoàn thiện hộp tuần hoàn",
      summary:
        "Kiểm tra wrap, minimum image, bất biến khi tịnh tiến, năng lượng và động lượng; build bản hoàn chỉnh và tải toàn bộ source.",
      order: 8,
      estimatedMinutes: 150,
      demoId: "periodic-molecular-box",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
