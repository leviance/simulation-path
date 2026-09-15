import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 02 — delta time",
    "Project 05 — đổi world/screen space",
    "Project 06 — vector, độ dài và mouse drag",
  ],
  summary:
    "Xây dựng một mô phỏng unit circle có kim quay, hình chiếu lên hai trục, đồ thị sin/cos và điểm kéo được bằng chuột.",
  challenge: {
    timebox: "120–180 phút",
    mission:
      "Tự xây dựng một mô phỏng 2D trong đó một chiếc kim quay quanh tâm đường tròn. Vị trí đầu kim, hai hình chiếu và đồ thị phải cùng được tính từ một góc duy nhất.",
    outcome:
      "Chương trình hiển thị unit circle, đầu kim tại `(cos(angle), sin(angle))`, hai hình chiếu lên trục X/Y và đồ thị sin/cos theo thời gian. Người dùng có thể thay đổi vận tốc góc hoặc kéo đầu kim để đặt góc bằng `atan2`.",
    requirements: [
      "Biểu diễn góc bằng radian và tự viết hàm đổi qua lại giữa degree với radian.",
      "Chuẩn hóa mọi góc hữu hạn về khoảng `[0, 2π)`.",
      "Tính đầu kim từ `cos(angle)` và `sin(angle)`, sau đó ánh xạ kết quả lên đường tròn có tâm và bán kính bất kỳ.",
      "Cập nhật góc bằng `angularSpeed × deltaTime`; cho phép tạm dừng và thay đổi vận tốc góc khi chương trình đang chạy.",
      "Vẽ hình chiếu của đầu kim lên trục X và Y bằng đúng hai thành phần cosine/sine đã dùng cho đầu kim.",
      "Lưu lịch sử có giới hạn và vẽ hai đường sin/cos trên một trục thời gian cố định mà không để vector tăng mãi.",
      "Cho phép kéo đầu kim; đổi độ dời chuột sang world direction rồi gọi `atan2(y,x)` để suy góc.",
      "Tạo lại framebuffer và texture khi kích thước cửa sổ thay đổi.",
    ],
    constraints: [
      "Không lưu riêng endpoint, projection, sine và cosine thành nhiều trạng thái có thể lệch nhau; tất cả phải được suy ra từ `angle`.",
      "Không cập nhật góc theo số radian cố định cho mỗi frame.",
      "Không dùng degree làm đơn vị bên trong `std::sin`, `std::cos` hoặc `std::atan2`.",
    ],
    definitionOfDone: [
      "Sau khi tăng đúng `2π` radian, đầu kim trở về cùng vị trí trong sai số 10⁻⁹.",
      "Tại mọi góc được kiểm tra, `sin²(angle) + cos²(angle)` sai khác 1 không quá 10⁻⁹.",
      "Hai chuỗi `deltaTime` mô phỏng cùng tổng thời gian tạo ra cùng góc cuối.",
      "`angleFromDirection(unitDirection(angle))` khôi phục góc ban đầu trên toàn bộ một vòng.",
      "Lịch sử không vượt quá số mẫu tối đa, luôn loại mẫu cũ nhất trước và đặt X theo timestamp thay vì FPS.",
    ],
  },
  duration: "5–6 giờ",
  objectives: [
    "Hiểu radian qua độ dài cung và một vòng tròn hoàn chỉnh",
    "Dùng sin/cos để biến góc thành hướng và vị trí 2D",
    "Kết nối vận tốc góc, chu kỳ, delta time, đồ thị và atan2 trong cùng một chương trình",
  ],
  lessons: [
    {
      id: "p07-l01",
      slug: "01-radian-va-vong-tron-don-vi",
      title: "Radian và unit circle",
      summary:
        "Bắt đầu từ một vòng tròn cố định, hiểu một radian đo gì và chuẩn hóa góc về đúng một vòng.",
      order: 1,
      estimatedMinutes: 55,
      demoId: "angle",
    },
    {
      id: "p07-l02",
      slug: "02-sin-cos-thanh-toa-do",
      title: "Biến góc thành tọa độ bằng sin và cos",
      summary:
        "Tính hướng đơn vị `(cos(angle), sin(angle))` rồi đặt đầu kim lên một đường tròn bất kỳ.",
      order: 2,
      estimatedMinutes: 55,
      demoId: "angle",
    },
    {
      id: "p07-l03",
      slug: "03-van-toc-goc-va-delta-time",
      title: "Vận tốc góc, delta time và chu kỳ",
      summary:
        "Cho kim quay theo thời gian thực, tạm dừng, đổi chiều và tính thời gian của một vòng.",
      order: 3,
      estimatedMinutes: 50,
      demoId: "angle",
    },
    {
      id: "p07-l04",
      slug: "04-hinh-chieu-len-hai-truc",
      title: "Hình chiếu của đầu kim lên hai trục",
      summary: "Nhìn trực tiếp cosine là thành phần X và sine là thành phần Y của cùng một điểm.",
      order: 4,
      estimatedMinutes: 40,
      demoId: "angle",
    },
    {
      id: "p07-l05",
      slug: "05-do-thi-sin-cos",
      title: "Vẽ đồ thị sin/cos theo thời gian",
      summary: "Lưu một cửa sổ lịch sử 6 giây và đặt từng mẫu lên trục X bằng timestamp.",
      order: 5,
      estimatedMinutes: 55,
      demoId: "angle",
    },
    {
      id: "p07-l06",
      slug: "06-atan2-va-validation",
      title: "Kéo đầu kim, dùng atan2 và kiểm chứng",
      summary:
        "Suy góc từ hướng chuột, xử lý các góc phần tư và kiểm tra toàn bộ phần toán bằng CTest.",
      order: 6,
      estimatedMinutes: 50,
      demoId: "angle",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
