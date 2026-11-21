import type { ProjectLabMeta } from "../../labs/types";
const lab = {
  native: {
    directory: "/field-notes/cpu-fountain",
    withDemo: true,
    overview: ["jet", "profile", "plan"],
    lessons: {
      "layout-scene": ["jet"],
      "aos-layout": ["jet", "narrow"],
      "layout-validation": ["jet", "profile", "plan"],
    },
    takes: {
      jet: {
        title: "Theo đường nước từ miệng vòi đến khi rơi",
        source: "C++/SDL3 · Release · F1 · 1.000.000 hạt sống",
        poster: "single.png",
        alt: "Trên mặt lưới tối, một dòng nước bạc bay xiên lên từ một điểm. Dòng mở dần, rồi tách thành những giọt xanh nhạt đang rơi.",
        caption:
          "Bắt đầu ở chân tia nước rồi nhìn dọc lên ngọn. Lúc mới phun, các giọt còn sát nhau nên trông gần như một dòng liền; đến phía bên kia, có thể phân biệt những giọt đang rơi. Không có mặt nước dựng sẵn.",
      },
      profile: {
        title: "Nhìn ngang để thấy nơi giọt đổi chiều",
        source: "Cùng snapshot C++ · F3 · nhìn ngang",
        poster: "profile.png",
        alt: "Nhìn ngang thấy nhánh nước đi lên hẹp hơn phần màn giọt rơi về phía trước.",
        caption:
          "Ở đỉnh đường bay, vận tốc theo chiều cao bằng không nhưng giọt vẫn tiến theo chiều ngang. Các nét dài ở phía rơi chỉ hướng vận tốc, không phải những hạt mới.",
      },
      plan: {
        title: "Nhìn từ trên để thấy độ xòe",
        source: "Cùng snapshot C++ · F2 · nhìn từ trên",
        poster: "plan.png",
        alt: "Nhìn thẳng xuống mặt lưới: tia nước trải từ một điểm phát thành một dải giọt có bề rộng.",
        caption:
          "Góc ngang cho biết tia nước cao bao nhiêu. Góc trên cho biết nó tản rộng đến đâu. Chỉ camera đổi chỗ; tuổi và vị trí của tất cả hạt đều như ở ảnh trước.",
      },
      narrow: {
        title: "Nếu các giọt không tản sang hai bên?",
        source: "C++/SDL3 · cùng seed · độ xòe 0 m/s",
        poster: "narrow.png",
        alt: "Cùng một vòi ở góc nhìn nghiêng; tắt vận tốc tản khiến dòng nước hẹp lại, vẫn bị kéo cong bởi trọng lực.",
        caption:
          "Đặt độ xòe về 0 rồi khởi tạo lại. Hạt vẫn bay lên và rơi, nhưng không lệch khỏi mặt phẳng đi qua trục vòi. So với ảnh đầu để tách tác dụng của độ xòe khỏi tác dụng của trọng lực.",
      },
    },
  },
  base: {
    label: "CPU FOUNTAIN · AoS / SoA",
    title: "Theo một giọt nước qua hai cách lưu hạt",
    description:
      "Ảnh phía trên là bản C++ chạy một triệu hạt. Canvas cho bạn tạm dừng, chọn một giọt rồi theo dõi nó qua lần sinh kế tiếp hoặc khi đổi AoS sang SoA. Bản web giới hạn 20.000 hạt; hãy dùng bản C++ Release để đo tốc độ.",
  },
  modes: {
    "layout-scene": {
      title: "Nhìn thấy đài phun trước khi tối ưu",
      description:
        "Chạy khung SDL, đọc state của hạt trong không gian 3D và phân biệt khởi tạo warm với chuyển động do solver.",
    },
    "aos-layout": {
      title: "Phát hạt, cho rơi và tái sử dụng slot",
      description:
        "Thêm emission carry, gravity, age/lifetime và respawn có seed; tiến một bước đầy đủ rồi mới công bố state.",
    },
    "aos-baseline": {
      title: "Đo một kernel AoS có thể kiểm chứng",
      description:
        "Đo gravity-only và toàn bộ vòng đời bằng AoS; dùng warm-up, nhiều mẫu và checksum ngoài timer.",
    },
    "soa-layout": {
      title: "Đổi layout mà không làm đổi trạng thái",
      description:
        "Tách đủ mười một field thành các mảng; chuyển layout theo batch và có thể hủy mà không đổi snapshot đang xem.",
    },
    "layout-agreement": {
      title: "Chạy cùng vòng đời bằng SoA",
      description:
        "Viết kernel SoA theo cùng thứ tự phép tính float32, giữ ID/generation và kiểm cả các lần hạt được tái sử dụng.",
    },
    "cache-lines": {
      title: "Giải thích dữ liệu mà vòng lặp chạm tới",
      description:
        "Đếm cache line của gravity-only và nhận biết giới hạn của mô hình all-field; không gọi nó là số cache miss đo được.",
    },
    "layout-benchmark": {
      title: "Đo Release và giữ cả kết quả không nhanh hơn",
      description:
        "Đo AoS/SoA với cùng seed và workload ở 10k/100k/1M; đọc median, min/max, chi phí conversion và sai khác state.",
    },
    "layout-validation": {
      title: "Hoàn thiện đài phun một triệu hạt",
      description:
        "Ghép controls, đài phun, đo hiệu năng và quy trình kiểm chứng đủ một triệu hạt sống thành ứng dụng độc lập.",
    },
  },
} satisfies ProjectLabMeta;
export default lab;
