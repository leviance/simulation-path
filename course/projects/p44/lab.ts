import type { ProjectLabMeta } from "../../labs/types";

const lab = {
  base: {
    label: "NEIGHBOR LIST LAB",
    title: "Không cần tìm lại mọi cặp sau mỗi bước",
    description:
      "Nhìn vùng cutoff và skin, kéo hạt để làm danh sách hết hiệu lực, rồi đối chiếu với mọi cặp. Mô phỏng luôn bắt đầu ở trạng thái tạm dừng.",
  },
  modes: {
    "nl-cutoff": {
      title: "Vẽ hệ hạt và nhìn rõ phạm vi tương tác",
      description: "Có 64 hạt đứng yên, vòng cutoff xanh quanh A và 2.016 cặp mỗi lần tính lực.",
    },
    "nl-build": {
      title: "Lưu những cặp có thể sắp tương tác",
      description: "Vòng vàng rộng hơn vòng xanh; danh sách gồm mỗi cặp đúng một lần.",
    },
    "nl-forces": {
      title: "Tính lực từ danh sách mà không đổi mô hình",
      description: "Cặp trong lớp skin có trong danh sách nhưng lực và U vẫn bằng zero.",
    },
    "nl-rebuild": {
      title: "Khi nào danh sách bắt đầu không còn đáng tin?",
      description: "Các lần dịch nhỏ không tăng rebuilds; chạm skin/2 thì mốc được chụp lại.",
    },
    "nl-grid": {
      title: "Dùng cell grid để dựng danh sách",
      description: "Grid và naive tạo cùng dãy cặp i<j, kể cả hộp chỉ có hai ô trên một trục.",
    },
    "nl-verlet": {
      title: "Ghép neighbor list vào Velocity Verlet",
      description:
        "Hạt chạy trong hộp tuần hoàn; danh sách chỉ dựng lại khi cần, còn force được tính lại mỗi bước.",
    },
    "nl-audit": {
      title: "Cố ý dùng danh sách cũ để tìm lỗi",
      description: "Ca hai hạt cho đúng một cặp thiếu; dựng lại danh sách làm sai số về gần zero.",
    },
    "nl-work": {
      title: "So sánh chi phí và chọn skin có căn cứ",
      description:
        "Có bảng bốn giá trị skin, số lần dựng, build checks, force checks và tổng công việc.",
    },
    "nl-final": {
      title: "Kiểm chứng và chạy dự án hoàn chỉnh",
      description:
        "Tests thuần C++ chạy Debug và Release; final có đủ điều khiển, kiểm chứng và source ZIP.",
    },
  },
} satisfies ProjectLabMeta;

export default lab;
