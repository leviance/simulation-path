import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "ATOMIC PLAYGROUND",
    title: "Nhìn, cắt và đo một đám mây orbital",
    description:
      "Canvas 2D lấy mẫu CPU với N nhỏ để đọc thuật toán. Mỗi điểm là một mẫu vị trí theo mật độ hydrogen, không phải một electron riêng; bản native sinh một triệu vị trí thật trên GPU và được kiểm riêng.",
  },
  modes: {
    field: {
      title: "Field 2p khác cloud lấy mẫu thế nào?",
      description:
        "Đổi orbital và nhìn các thùy/node. Phân biệt density được cung cấp với màu và với tập vị trí đã lấy mẫu.",
    },
    measure: {
      title: "Lấy đều theo bán kính có đều theo thể tích không?",
      description:
        "So với sandbox sai uniform-radius/uniform-angle hữu hạn; đọc phần tử thể tích và lượng mẫu gần tâm/cực.",
    },
    cdf: {
      title: "Một số u đi vào bin nào của CDF?",
      description:
        "Đổi seed, quan sát histogram và radial reference. Bảng hữu hạn là approximation; nhiều seed không tạo cùng một đám điểm.",
    },
    gpu: {
      title: "Dữ liệu nào phải nằm lại trên GPU?",
      description:
        "Lab vẫn là CPU nhỏ. Theo dõi positions/density của record; ứng dụng C++ mới có compute shader và renderer đọc SSBO trực tiếp.",
    },
    batches: {
      title: "Candidate chưa xong có được thay cloud cũ không?",
      description:
        "Pause, đi một batch, hủy hoặc reset; đọc requested/generated/accepted và nhãn last-good trước khi công bố kết quả.",
    },
    splats: {
      title: "Tăng độ sáng có làm mật độ thay đổi không?",
      description:
        "Giữ cùng samples, thay size/opacity/palette. Legend mô tả transfer function; độ sáng ảnh không phải xác suất tuyến tính.",
    },
    clip: {
      title: "Mặt cắt làm lộ gì trong các thùy?",
      description:
        "Orbit/pan/zoom và kéo clip plane; generation không đổi, mẫu bị che không biến thành mẫu chưa từng tồn tại.",
    },
    probe: {
      title: "Bao nhiêu mẫu thật sự nằm trong vùng đang chọn?",
      description:
        "Đổi vùng đo rồi so tỷ lệ với reference/uncertainty. Mẫu số là cả cloud, không chỉ phần còn nhìn sau clipping.",
    },
    compare: {
      title: "Hai hình có đang dùng cùng thang không?",
      description:
        "So hai orbital theo cùng đơn vị a₀, đọc N mỗi pane. Không tự thu phóng từng hình rồi ngầm gọi là cùng kích thước.",
    },
    config: {
      title: "Mở lại seed có khôi phục đúng điều kiện không?",
      description:
        "Giữ/khôi phục cấu hình RAM của lab và thử reset. File cấu hình thật thuộc bản C++; không giả nút RAM là save/load file native.",
    },
    validation: {
      title: "Hình đẹp đã đủ chứng minh sampling đúng chưa?",
      description:
        "Đổi seed/preset, đo vùng và đối chiếu histogram/reference; cuối cùng kiểm riêng source/native GPU một triệu mẫu.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
