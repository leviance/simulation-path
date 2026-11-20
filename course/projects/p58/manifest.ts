import type { PublishedProjectEditorial } from "../../types";
const data = {
  summary:
    "Tự dựng mảnh đầu của thế giới voxel: một con suối uốn giữa hai bờ cát và cỏ, có cây mọc từ đất thật. Đi từ một viên đá đến 4.096 ô, nhìn vật liệu ở tầm mắt rồi đọc lớp đất bên dưới mà không thay đổi một block nào.",
  duration: "8–11 giờ, chưa tính cài đặt",
  prerequisites: [
    "Biết mở cửa sổ SDL3 và cập nhật ảnh, như Project 01.",
    "Biết tọa độ world/camera, phép chiếu phối cảnh và depth buffer. ZIP mang sẵn bộ vẽ để tập trung vào voxel.",
  ],
  objectives: [
    "Tách vị trí mắt, địa chỉ block và pixel trên màn hình.",
    "Từ 16³ ô thật dựng mesh sáu mặt mỗi block đặc; giữ bản chưa tối ưu làm chuẩn ở Project 59.",
    "Vẽ bờ cát, gỗ và cỏ bằng họa tiết pixel tự thiết kế; xem lớp đất mà không đào bờ.",
    "Di chuyển bằng WASD, nhìn bằng chuột hoặc phím, kiểm dữ liệu và hình ảnh riêng.",
  ],
  challenge: {
    timebox: "90–150 phút thử trước khi đọc",
    mission:
      "Hãy tự dựng một bờ suối 16×16×16 có thể bước vào từ tầm mắt. Tiến gần một thân cây phải thấy thớ gỗ lớn dần; nhìn xuống phải phân biệt được cỏ, bờ cát và phần nước.",
    outcome:
      "Một đoạn đường nước liền giữa hai bờ, hai tán cây làm mốc. F1 đọc số mặt, H xem lớp cắt; khi tắt cả hai, cửa sổ chỉ còn cảnh quan.",
    requirements: [
      "Ứng dụng C++20/SDL3 chạy độc lập, không yêu cầu game hay bộ asset khác.",
      "Lưu Air và các block thật. Một block có 6 quad; hai block kề nhau vẫn có 24 tam giác.",
      "Có preset bờ suối, viên đá, khối đặc và khoảng không; scene rỗng vẫn đóng/mở được.",
      "Camera có vị trí trong world và phối cảnh. Không có chế độ phá/đặt block.",
    ],
    constraints: [
      "Đúng một section 16³, họa tiết pixel 16×16 tự vẽ; nước tĩnh ở mốc này.",
      "Chưa loại mặt giáp nhau; việc đổi góc nhìn không tái dựng mesh.",
      "Dùng một bầu trời đơn giản. Sóng, thời tiết và chu kỳ Mặt Trời thuộc mốc sau.",
    ],
    definitionOfDone: [
      "Đi lại, quay nhìn bằng chuột và bằng phím; thả chuột bằng Escape.",
      "Mỗi hàng dọc theo suối có nước. Nhìn gần phân biệt mặt trên cỏ với mặt bên đất.",
      "Một block/khối đặc/toàn Air có lần lượt 12/49.152/0 tam giác; tọa độ âm round-trip đúng.",
      "CTest Debug/Release và các checkpoint phải chạy được; kiểm trực tiếp tầm nhìn riêng với test toán.",
    ],
  },
  lessons: [
    {
      id: "p58-l01",
      slug: "01-ve-cube-dau-tien",
      title: "Viên đá đầu tiên bên bờ suối",
      summary: "Từ cửa sổ có bầu trời đến sáu mặt của một viên đá.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l02",
      slug: "02-luu-block-trong-chunk",
      title: "Một viên đá nằm ở đâu trong 4.096 ô?",
      summary: "Từ vị trí trong thế giới đến một địa chỉ không trùng trong mảng.",
      order: 2,
      estimatedMinutes: 65,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l03",
      slug: "03-tu-block-den-mesh",
      title: "Vì sao một khối đất cần tới 49.152 tam giác?",
      summary: "Dựng bản chưa tối ưu để có mốc đối chiếu trước khi bỏ mặt khuất.",
      order: 3,
      estimatedMinutes: 60,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l04",
      slug: "04-dat-va-vat-lieu",
      title: "Khoét lòng suối bằng độ cao từng cột",
      summary: "Lấp từng cột đất, thêm nước và đọc họa tiết riêng trên từng mặt.",
      order: 4,
      estimatedMinutes: 85,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l05",
      slug: "05-camera-va-do-sau",
      title: "Tự bước tới một thân cây",
      summary: "WASD đi trong thế giới thật; camera di chuyển nhưng dữ liệu đứng yên.",
      order: 5,
      estimatedMinutes: 70,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l06",
      slug: "06-doc-tung-lop-block",
      title: "Mở một lát ngang của bờ suối",
      summary: "So lát x/z với cỏ, đất và nước dưới tầm mắt.",
      order: 6,
      estimatedMinutes: 50,
      demoId: "voxel-chunk",
    },
    {
      id: "p58-l07",
      slug: "07-kiem-chung-va-hoan-thien",
      title: "Đi một vòng và kiểm tra bản hoàn chỉnh",
      summary: "Đo hình học, kiểm depth rồi tự đi một vòng trong bản C++ hoàn chỉnh.",
      order: 7,
      estimatedMinutes: 65,
      demoId: "voxel-chunk",
    },
  ],
} satisfies PublishedProjectEditorial;
export default data;
