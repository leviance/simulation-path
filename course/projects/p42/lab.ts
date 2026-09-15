import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "CPU MOLECULAR DYNAMICS LAB",
    title: "Từ một cặp nguyên tử đến một hộp khí 1.000 hạt",
    description:
      "Thay đổi số hạt, mật độ và nhiệt độ; chọn một hạt để đọc trạng thái rồi chạy hệ bằng Velocity Verlet. Canvas giữ cùng công thức với C++ nhưng giới hạn số bước mỗi frame ở preset lớn.",
  },
  modes: {
    "md-box": {
      title: "Làm sao đặt 1.000 hạt mà không tạo lực vô hạn?",
      description:
        "Quan sát lattice, jitter và kích thước hộp được suy ra từ mật độ. Đổi seed để thấy vị trí thay đổi có kiểm soát mà không tạo hai hạt gần như trùng nhau.",
    },
    "md-temperature": {
      title: "Nhiệt độ ban đầu đi vào vận tốc như thế nào?",
      description:
        "Đọc vector vận tốc sau khi đã trừ chuyển động của cả khối và rescale động năng. Tổng động lượng gần zero trong khi nhiệt độ khớp giá trị mục tiêu.",
    },
    "md-cutoff": {
      title: "Điều gì xảy ra khi một cặp đi qua cutoff?",
      description:
        "So đường gốc với đường force-shifted, phóng to quanh cutoff và đọc vị trí cân bằng mới. Phép dịch làm cả U và độ dốc về 0 tại cutoff nhưng cũng thay đổi lực bên trong.",
    },
    "md-pairs": {
      title: "Vòng lặp i < j đã xét mỗi cặp đúng một lần chưa?",
      description:
        "Chọn một hạt để nhìn các cặp đi từ index nhỏ tới index lớn, rồi đối chiếu evaluatedPairs với N(N-1)/2 và activePairs trong cutoff.",
    },
    "md-verlet": {
      title: "Một bước Velocity Verlet thay đổi cả hệ ra sao?",
      description:
        "Tạm dừng và tiến từng bước để theo dõi kick–drift–reflect–kick. Khi hạt vượt thành hộp, phần overshoot được mirror và vận tốc pháp tuyến đổi dấu.",
    },
    "md-energy": {
      title: "Nhiệt độ dao động còn tổng năng lượng có giữ được không?",
      description:
        "So K, U và E trên cùng trục thời gian; đổi fixed dt rồi chạy lại đúng initial state để tách sai số tích phân khỏi khác biệt điều kiện đầu.",
    },
    "md-scaling": {
      title: "Tại sao 1.000 hạt đã tạo gần nửa triệu cặp?",
      description:
        "So các preset bằng N(N-1)/2 cặp mỗi lần tính lực và hai lần tính lực mỗi bước Verlet. Cutoff giảm số cặp có lực nhưng chưa giảm số cặp phải xét; thời gian đo gồm tích phân và cập nhật số liệu.",
    },
    "md-final": {
      title: "Hộp khí đã vượt qua toàn bộ invariant chưa?",
      description:
        "Chạy preset, chọn hạt, tiến từng bước và kiểm tra khởi tạo, pair count, tổng lực, cutoff, phản xạ, trạng thái hữu hạn cùng energy drift trong một báo cáo hữu hạn.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
