import type { PublishedProjectEditorial } from "../../types";

const project = {
  prerequisites: [
    "Project 01 — cửa sổ, framebuffer và streaming texture SDL3",
    "Project 02 — position/velocity, input và ý nghĩa của dt",
    "Project 23 — gravity, fixed timestep và symplectic Euler; bài 02 nhắc lại phần cần dùng",
  ],
  summary:
    "Một tia nước vươn lên từ miệng vòi, cong ở đỉnh rồi rơi thành màn giọt ở phía trước. Bạn sẽ tự dựng hình đó chỉ bằng vị trí, vận tốc ban đầu và trọng lực. Sau đó thử lại với 1.000.000 hạt sống trên CPU: liệu đổi cách lưu dữ liệu có tăng tốc mà vẫn giữ nguyên đường đi của từng giọt? Không cần học N-body hay dùng mã của Project 31.",
  challenge: {
    timebox: "8–12 giờ để thử trước khi đọc hướng dẫn",
    mission:
      "Hãy dựng một vòi phun hơi nghiêng trên lưới XZ. Khi nhìn ngang, người xem phải lần được bằng mắt đoạn tia vươn lên, chỗ đổi chiều và màn giọt rơi ra xa miệng vòi. Cho người dùng chỉnh độ xòe. Khi giọt đã rời vòi, đừng kéo nó theo một đường cong vẽ sẵn; hãy để vận tốc, trọng lực và thời gian quyết định nó sẽ đi đâu.",
    outcome:
      "Dừng đài phun lúc bạn thích, tìm một hạt sắp hết tuổi rồi tiến một bước: hạt mới lại xuất hiện ở vòi với cùng ID. Hãy đổi AoS sang SoA ngay tại khung hình đó. Cảnh phải giữ nguyên; điều có thể khác là thời gian CPU cần để chạy lượt tiếp theo.",
    requirements: [
      "Mỗi hạt giữ một ID cố định, số lần sinh, vị trí và vận tốc XYZ, tuổi, tuổi thọ và màu. Với cùng seed, cùng ID và cùng lần sinh, vòi phải phát ra cùng một hạt.",
      "Một chế độ bắt đầu với 256 chỗ trống để theo dõi từng lần phát. Chế độ lớn bắt đầu với 1.000.000 hạt sống và cập nhật đủ một triệu hạt trong từng bước.",
      "Cho phép dừng, chạy, tiến đúng một bước, đặt lại và xoay camera. Đổi trọng lực phải tác động đến các hạt đang bay; dời vòi hoặc đổi tuổi thọ chỉ tác động đến lần sinh sau.",
      "Giữ đủ mười một trường khi đổi cách lưu, kể cả các ô chưa dùng. Thời gian, số hạt sống và phần lẻ số hạt chờ phát (emission carry) không được mất. Hủy giữa chừng phải giữ được trạng thái hoàn chỉnh gần nhất.",
      "Đo riêng hai việc: chỉ đổi vận tốc dọc và tiến trọn vòng đời. Mỗi bên dùng cùng dữ liệu đầu vào, cùng thời lượng bước, cùng độ chính xác và cùng số lượt. Thời gian chuyển đổi, sao chép, vẽ và thời gian toàn khung có đồng hồ riêng.",
      "Ghi rõ số hạt thử vẽ và số hiện lên màn hình sau khi bị che hoặc ra ngoài khung. Không giảm số được cập nhật để làm đẹp FPS.",
    ],
    constraints: [
      "Tự viết cách phát hạt, vòng cập nhật, hai cách lưu và phép đo. Dùng một luồng CPU, không dùng OpenGL, compute shader, thread pool hay bộ giải có sẵn.",
      "Mặt lưới là thước nhìn chiều sâu. Hạt không đẩy nhau, không va vào sàn; không cần làm bể chứa hay mô phỏng nước như chất lỏng.",
      "Loại khâu cấp phát, sao chép, chuyển đổi, ghi log và vẽ khỏi thời gian đo vòng cập nhật. Công bố trình biên dịch và cờ tối ưu; không mặc định SoA luôn có lợi.",
      "Canvas tối đa 20.000 hạt để quan sát từng bước. Quy mô một triệu và kết luận về hiệu năng phải lấy từ ứng dụng C++ chạy ở Release.",
    ],
    definitionOfDone: [
      "Từ một hạt có vận tốc biết trước, tính tay được bước rơi. Khi hết tuổi giữa bước, hạt giữ ID, tăng generation và không mất phần thời gian còn lại.",
      "Tại cùng một thời điểm, xoay camera và đổi cách lưu không làm đồng hồ nhảy, không làm dịch tia nước; phép đối chiếu từng trường cũng xác nhận điều mắt vừa thấy.",
      "Sau một bước của chế độ lớn, kiểm từng slot để biết một triệu hạt đã tiến tuổi hoặc sinh lại. Số được vẽ, số được cập nhật và số byte mà các mảng giữ được ghi riêng.",
      "Mỗi phép đo có một lượt làm nóng, năm mẫu và ba lượt qua đủ N hạt trong mỗi mẫu. Báo trung vị, min/max và checksum; đối chiếu cả ID, generation và sai số từng trường.",
      "Có thể hủy phép đo, đổi camera và dùng lại chương trình. Người khác giải nén ZIP, viết tiếp vào work/ qua tám bài và chạy được sản phẩm hoàn chỉnh bằng CMake.",
    ],
  },
  duration: "Đọc và chạy thử 5–7 giờ · tự viết 12–18 giờ · đo và đối chiếu 3–5 giờ",
  objectives: [
    "Giải thích được vì sao độ xòe quyết định bề rộng của tia nước, còn vận tốc dọc và trọng lực quyết định nó vươn cao đến đâu",
    "Thay đổi cách CPU đọc dữ liệu mà vẫn giữ nguyên một triệu vòng đời",
    "Tự phân biệt phần nhanh hơn do cách lưu với phần chỉ nhanh hơn vì làm ít việc hơn",
  ],
  lessons: [
    {
      id: "p32-l01",
      slug: "01-khoa-workload-mot-trieu-particles",
      title: "Dựng một vòi phun từ 256 hạt đứng yên",
      summary:
        "Từ tám điểm của starter, tự tạo 256 hạt ở các độ tuổi khác nhau. Xoay camera để phân biệt hình ban đầu với một bước mô phỏng.",
      order: 1,
      estimatedMinutes: 100,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l02",
      slug: "02-cap-nhat-particles-trong-aos",
      title: "Từ miệng vòi đến màn giọt rơi",
      summary:
        "Cho giọt rời một vòi hơi nghiêng, theo nó qua đỉnh tia rồi đến lúc rơi. Thay độ xòe ở miệng vòi và dùng lại ô nhớ khi giọt hết tuổi.",
      order: 2,
      estimatedMinutes: 150,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l03",
      slug: "03-do-baseline-aos",
      title: "Đo vòng lặp đầu tiên bằng AoS",
      summary:
        "Đo riêng chi phí cộng trọng lực và chi phí cập nhật cả vòng đời. Kiểm số lượt thật sự đã chạy trước khi tin đồng hồ.",
      order: 3,
      estimatedMinutes: 120,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l04",
      slug: "04-chuyen-state-sang-soa",
      title: "Giữ nguyên đài phun khi đổi sang SoA",
      summary:
        "Chuyển mười một trường dữ liệu sang các mảng riêng trong lúc đài phun đứng yên; lần ngược lại để tìm một trường bị bỏ sót.",
      order: 4,
      estimatedMinutes: 110,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l05",
      slug: "05-doi-chieu-hai-kernel",
      title: "Một hạt có sống như nhau trong hai cách lưu?",
      summary:
        "Cho AoS và SoA đi qua cùng 400 bước, kể cả lúc hạt sinh lại. So từng ID và từng đại lượng thay vì chỉ so hai bức hình.",
      order: 5,
      estimatedMinutes: 130,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l06",
      slug: "06-cache-line-stride-va-useful-bytes",
      title: "CPU phải đọc bao nhiêu để sửa một con số?",
      summary:
        "Lấy bút đánh dấu địa chỉ của velocityY ở 64 hạt. Dùng kết quả để đặt giả thuyết về tốc độ, không coi đó là số lần CPU trượt cache.",
      order: 6,
      estimatedMinutes: 100,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l07",
      slug: "07-benchmark-va-scaling-release",
      title: "Đo cả những lần SoA chậm hơn",
      summary:
        "Thử hai cách lưu trên cùng dữ liệu ở ba quy mô. Đọc trung vị cùng khoảng nhỏ nhất–lớn nhất, kể cả khi con số trái dự đoán.",
      order: 7,
      estimatedMinutes: 150,
      demoId: "memory-layout-race",
    },
    {
      id: "p32-l08",
      slug: "08-hoan-thien-memory-layout-race",
      title: "Lần theo một hạt giữa đài phun một triệu hạt",
      summary:
        "Xem đài phun từ trên và ngang, chọn một hạt sắp hết tuổi rồi bước tiếp. Kiểm đủ một triệu hạt trong chính chương trình vừa viết.",
      order: 8,
      estimatedMinutes: 130,
      demoId: "memory-layout-race",
    },
  ],
} satisfies PublishedProjectEditorial;

export default project;
