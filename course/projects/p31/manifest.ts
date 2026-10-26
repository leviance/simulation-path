import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 23 — state, fixed timestep, symplectic Euler và sai số tích phân",
    "Project 28 — so thuật toán với baseline trên cùng dữ liệu, tách correctness khỏi timing",
    "Project 30 — Octree 3D, storage theo index, camera và các job có thể hủy",
  ],
  summary:
    "Từ đĩa sao 3D gồm 4.096 vật thể thật, tự tính lực hấp dẫn, dùng Octree gộp nguồn xa và đo phần chính xác phải đánh đổi. Camera giúp quan sát; direct reference, energy và thí nghiệm dt giúp hiểu kết quả.",
  challenge: {
    timebox: "8–12 giờ",
    mission:
      "Tự xây dựng một mô phỏng hấp dẫn 3D. Mỗi vật thể có position, velocity và mass; lực thật làm hệ tiến triển, không gán quỹ đạo có sẵn. Bản cuối cập nhật ít nhất 4.096 vật thể bằng Barnes–Hut và giữ direct summation để kiểm kết quả.",
    outcome:
      "Một đĩa sao có chiều dày, camera orbit/pan/zoom, trails và màu theo tốc độ. Chọn target để đọc gia tốc direct/Barnes–Hut, bật các hộp node đã mở hoặc chấp nhận, rồi đo theta, runtime và năng lượng mà vẫn có thể hủy.",
    requirements: [
      "Preset 3D ít nhất 4.096 vật thể; preset hai, ba và 256 vật thể để kiểm chứng. Cùng seed tạo cùng state đầu.",
      "Chạy/dừng, tiến đúng một fixed step, đặt lại preset và chọn dt. Camera vẫn dùng được khi physics hoặc phép đo đang dừng.",
      "Cho chọn target bằng click hoặc ID; báo direct vector, approximate vector và sai số tại cùng snapshot.",
      "Đổi theta và softening độc lập; báo rõ reduced units, G=0,001 và epsilon là độ dài.",
      "Sweep ít nhất bốn theta trên snapshot cố định, có absolute RMS, normalized RMS, mean/max relative và số exact/aggregate sources.",
      "Benchmark cùng input/seed: tách tree build, kernel lực và render; bỏ warm-up, lấy median/min/max nhiều mẫu. Canvas và C++ ghi riêng workload.",
      "Đo energy, momentum và center of mass của toàn hệ theo thời gian snapshot; không gọi energy của 512 body là energy của 4.096 body.",
      "Thí nghiệm hai vật có nghiệm tròn: giữ theta, epsilon và T cố định khi giảm dt để tách integration error.",
      "Trails có giới hạn; Pause/Reset/Cancel không bỏ dở một phần state. Source C++ độc lập, starter, 10 checkpoint, final và tests.",
    ],
    constraints: [
      "Tự viết gravity, symplectic Euler, tree aggregation và traversal; không dùng engine, OpenGL, WebGL hoặc solver có sẵn.",
      "Không xấp xỉ node chứa target; leaf bỏ self theo ID/index chứ không bỏ mọi nguồn trùng position.",
      "Direct simulation tương tác giới hạn N≤256; reference của hệ lớn đọc đủ mọi nguồn cho một tập target được công bố. Không âm thầm giảm N của mô phỏng.",
      "C++ đo full force pass 256/1.024/4.096; Canvas đo 256/512/1.024 để giữ UI phản hồi. Không dùng timing JavaScript thay C++.",
      "Job chia thành đơn vị target, có pause/cancel và hard deadline; không treo cửa sổ để chạy một benchmark khổng lồ.",
      "Không yêu cầu error/runtime giảm đơn điệu ở mọi theta, không dùng hai quỹ đạo hỗn loạn dài hạn làm oracle.",
      "Không tăng budget file/chunk để che module lớn; output sinh tự động và SDL tải về không đưa vào Git.",
    ],
    definitionOfDone: [
      "Hệ hai/ba vật khớp công thức tính tay; mass/tâm khối cây khớp fixture độc lập.",
      "Điểm trùng vị trí không làm cây tách vô hạn, không NaN; một vật không tự gia tốc.",
      "Trace accepted không có node chứa target; theta gần 0 khớp direct trong tolerance công bố.",
      "Snapshot lực bất biến trong sweep; bảng RMS không chia cho 0 khi lực reference gần 0.",
      "Một bước tính đủ 4.096 acceleration trước khi commit đủ 4.096 position; trails không thay N cập nhật.",
      "Energy job cộng đủ mọi cặp của toàn snapshot, ghi t/N; momentum và COM cùng phạm vi.",
      "Giảm dt trong hệ hai vật quay tròn tiến gần nghiệm độc lập tại T cố định, giữ cùng theta.",
      "Build starter/checkpoint/final, CTest Debug/Release, smoke hữu hạn và desktop được ghi thành bằng chứng riêng.",
    ],
  },
  duration:
    "Đọc 6–8 giờ · tự viết 16–22 giờ · thí nghiệm/kiểm tra 4–6 giờ; chưa tính cài môi trường",
  objectives: [
    "Từ phương trình gravity đến một ứng dụng động 3D có state, camera và controls rõ ràng",
    "Dùng tree để tổng hợp tương tác xa thay vì cắt bỏ nguồn ngoài một bán kính",
    "Đo riêng force approximation, integration error và chi phí thực trên cùng workload",
  ],
  lessons: [
    {
      id: "p31-l01",
      slug: "01-thien-ha-va-trang-thai-body",
      title: "Dựng đĩa sao từ một chương trình SDL đang chạy",
      summary: "Mở cửa sổ, vẽ state XYZ qua camera và sinh lại cùng đĩa sao bằng seed cố định.",
      order: 1,
      estimatedMinutes: 120,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l02",
      slug: "02-luc-hap-dan-va-softening",
      title: "Một vật thể hút vật thể khác như thế nào?",
      summary:
        "Tự suy ra vector gia tốc, phân biệt mass của nguồn với mass của target và xử lý cự ly gần bằng softening.",
      order: 2,
      estimatedMinutes: 120,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l03",
      slug: "03-direct-n-body-o-n-binh-phuong",
      title: "Cộng tất cả lực và giữ một lời giải đối chứng",
      summary:
        "Viết direct summation đơn giản trước khi tối ưu; kiểm N−1 nguồn và các ca hai, ba vật thể tính tay.",
      order: 3,
      estimatedMinutes: 110,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l04",
      slug: "04-fixed-step-va-symplectic-euler",
      title: "Tiến thời gian mà không trộn hai snapshot",
      summary:
        "Tính xong gia tốc của cả snapshot rồi mới cập nhật velocity/position; chia việc theo target để UI vẫn phản hồi.",
      order: 4,
      estimatedMinutes: 140,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l05",
      slug: "05-mass-octree-va-center-of-mass",
      title: "Gộp khối lượng từ lá lên gốc Octree",
      summary:
        "Thêm mass và tâm khối vào Octree; kiểm trung bình có trọng số, leaf storage và điểm trùng nhau.",
      order: 5,
      estimatedMinutes: 160,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l06",
      slug: "06-barnes-hut-opening-criterion",
      title: "Khi nào một cụm xa có thể thay bằng một nguồn?",
      summary:
        "Dùng s/d < theta nhưng buộc mở node chứa target; vẽ lại đúng các quyết định traversal.",
      order: 6,
      estimatedMinutes: 145,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l07",
      slug: "07-self-force-va-topology-inspector",
      title: "Tìm self-force và lỗi cấu trúc cây",
      summary:
        "Dùng fixture độc lập để phát hiện sai mass ở lá, trùng storage và cạnh trỏ về tổ tiên.",
      order: 7,
      estimatedMinutes: 130,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l08",
      slug: "08-theta-accuracy-sweep",
      title: "Đo sai số lực trên cùng một snapshot",
      summary:
        "Giữ nguyên bodies và epsilon, quét nhiều theta; báo absolute/RMS error cùng exact/aggregate work.",
      order: 8,
      estimatedMinutes: 150,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l09",
      slug: "09-scaling-study",
      title: "Đo chi phí thật của hai cách tính lực",
      summary:
        "Tách build, force pass và render; warm-up, median và khoảng min/max trên cùng workload có giới hạn.",
      order: 9,
      estimatedMinutes: 145,
      demoId: "barnes-hut-nbody",
    },
    {
      id: "p31-l10",
      slug: "10-hoan-thien-barnes-hut-n-body",
      title: "Theo dõi năng lượng và tách sai số theo dt",
      summary:
        "Đo năng lượng toàn hệ theo snapshot, thử giảm dt ở hệ có nghiệm tròn và bàn giao ứng dụng 4.096 vật thể.",
      order: 10,
      estimatedMinutes: 180,
      demoId: "barnes-hut-nbody",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
