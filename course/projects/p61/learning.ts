import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p61-l01": {
      focus: "Một vạt đất phẳng cần bao nhiêu quad?",
      expected:
        "Khối đặc chỉ còn 6 quad thay cho 1.536 quad Visible, họa tiết vẫn lặp theo từng block.",
      files: [
        "include/trail/greedy.hpp",
        "include/trail/region.hpp",
        "include/trail/field-scene.hpp",
      ],
      steps: [
        {
          title: "Trải tường ra lưới rồi tìm một mảng có thể gộp",
          explanation:
            "Trong greedy.hpp, quét từng hướng và từng lát. Dùng exposedFace để chỉ ghi vật liệu của mặt thật sự lộ vào mask.",
        },
        {
          title: "Dựng tấm lớn mà không mất các viên đá nhỏ",
          explanation:
            "Xuất một Face với chiều rộng và chiều cao vừa tìm rồi xóa đúng hình chữ nhật khỏi mask. Trình vẽ đã lấy mẫu họa tiết theo từng block: nếu mặt tường rộng 16 ô, phải thấy vân đá lặp 16 lần, không phải một viên đá khổng lồ bị kéo dãn.",
        },
        {
          title: "Cho F2 so hai cách dựng trên cùng dữ liệu",
          explanation:
            "Trong region.hpp, thêm nhánh gọi greedyMesh khi dựng cột. Trong field-scene.hpp, chọn Greedy lúc mở, ẩn ống ngắm và đổi F2 thành so **Visible với Greedy**.",
        },
      ],
    },
    "p61-l02": {
      focus: "Cho cơn gió đi qua rừng, thay vì lắc cả cảnh",
      expected:
        "Tăng gió làm tán lá nghiêng nhưng thân không trượt; P dừng giờ, không dừng camera.",
      files: [
        "include/trail/wind.hpp",
        "include/trail/field-render.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/field-controls.hpp",
      ],
      steps: [
        {
          title: "Cho cơn gió có hướng và thời gian",
          explanation:
            "Trong wind.hpp, viết windAt: lấy vị trí world và thời gian làm pha. Hai cây ở hai chỗ sẽ lần lượt đón cùng một cơn gió. sway nhân độ dời với bình phương độ cao tương đối; trọng số bằng 0 ở gốc thì gió mạnh đến đâu gốc cũng không trượt.",
        },
        {
          title: "Uốn đỉnh lúc vẽ, đừng sửa cây trong chunk",
          explanation:
            "Trong field-render.hpp, tìm mặt lá hoặc lá kim rồi xác định cây mà mặt đó thuộc về. Tạo tọa độ đỉnh để vẽ từ tọa độ gốc cùng độ uốn.",
        },
        {
          title: "Chạy đồng hồ khi người xem đứng yên",
          explanation:
            "Trong field-scene.hpp, chỉ tiến seconds khi chưa Pause và báo cần vẽ khung mới. Trong field-controls.hpp, nối G để quay hướng gió và hai phím ngoặc vuông để giảm/tăng cường độ.",
        },
      ],
    },
    "p61-l03": {
      focus: "Gắn chuyển động vào từng ngọn cỏ và tán lá",
      expected: "Bụi cỏ gần mắt có gốc bám đất, ngọn nghiêng theo cùng trường gió với lá.",
      files: ["include/trail/region.hpp", "include/trail/field-render.hpp"],
      steps: [
        {
          title: "Tìm chỗ cỏ có thể mọc một lần khi nạp cột",
          explanation:
            "Trong region.hpp, giữ danh sách gốc cỏ trong Tile. Khi Region::put nhận cột, tìm các mặt cỏ có không khí phía trên rồi lưu vị trí neo.",
        },
        {
          title: "Cho đầu lá đi theo gió, giữ chân lá trên mặt đất",
          explanation:
            "Trong field-render.hpp, drawTuft vẽ ba lá nhỏ quanh mỗi gốc gần mắt, mỗi lá có chân và ngọn. Chỉ điểm ngọn nhận độ dời từ sway.",
        },
      ],
    },
    "p61-l04": {
      focus: "Đo riêng công dựng đất và công vẽ ngọn cây",
      expected: "HUD ghi mili giây của cột vừa dựng. Bung quad gộp ra được đúng tập mặt đơn vị.",
      files: ["include/trail/field-scene.hpp"],
      steps: [
        {
          title: "Đưa số đo đã có lên HUD",
          explanation:
            "Trong field-scene.hpp, mở readout và in region.lastBuildMs bên cạnh số quad. Giá trị là thời gian dựng mesh của **cột vừa được dựng gần nhất**, không phải tổng thời gian của cả vùng hay FPS.",
        },
        {
          title: "Kiểm hình học trước khi kết luận nhanh hơn",
          explanation:
            "Hai đoạn dưới là điểm tựa để đọc tests, không phải mã mới. Dùng sample để tìm hàng xóm kể cả ở cột âm; khi bung mỗi quad gộp, ghi lại từng ô, hướng và vật liệu.",
        },
      ],
    },
  },
  references: {
    "p61-l01": [
      {
        label: "Mask để gộp mặt",
        href: "/glossary#voxel-greedy-mask",
        kind: "Thuật ngữ",
      },
    ],
    "p61-l02": [
      {
        label: "Gió lấy mẫu tại gốc",
        href: "/glossary#voxel-rooted-wind",
        kind: "Thuật ngữ",
      },
    ],
    "p61-l03": [
      {
        label: "Điều kiện gộp mặt",
        href: "/glossary#voxel-merge-key",
        kind: "Thuật ngữ",
      },
    ],
    "p61-l04": [
      {
        label: "Đối chiếu tập mặt đơn vị",
        href: "/glossary#voxel-surface-oracle",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
