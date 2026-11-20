import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["walk", "coast", "ravine", "snow", "fire"],
    lessons: {
      "voxel64-1": ["snow"],
      "voxel64-2": ["am", "pm"],
      "voxel64-3": ["walk"],
      "voxel64-4": ["fire"],
      "voxel64-5": ["coast", "valley", "ravine", "snow", "fire", "walk"],
    },
    takes: {
      snow: {
        title: "Tuyết rơi trong rừng thông",
        source: "Project 64 · Bài 01",
        poster: "flakes.png",
        video: "flakes.webm",
        alt: "Bông tuyết rơi ở nhiều khoảng cách trước các sườn dốc và tán thông.",
        caption:
          "Nhìn một bông tuyết đi ngang qua mép tán thông. So những bông gần mắt với những bông xa phía sau cây.",
      },
      am: {
        title: "Buổi sáng · 7 giờ",
        source: "Project 64 · Bài 02",
        poster: "sunrise.png",
        alt: "Ánh sáng sớm chiếu lên vách đá cạnh lòng sông.",
        caption:
          "Đổi sang 17 giờ: camera, seed và thời điểm lấy mẫu chuyển động giống nhau, chỉ giờ chiếu sáng thay đổi.",
      },
      pm: {
        title: "Buổi chiều · 17 giờ",
        source: "Project 64 · Bài 02",
        poster: "sunset.png",
        alt: "Cùng đoạn hẻm và cùng các bậc đá dưới ánh chiều.",
        caption:
          "Quan sát cùng một mặt đá ở hai ảnh. Đừng lấy độ sáng toàn ảnh làm kết luận về hướng chiếu.",
      },
      walk: {
        title: "Đi bộ dọc bờ",
        source: "Project 64 · Bài 03",
        poster: "walk.png",
        video: "walk.webm",
        alt: "Góc nhìn di chuyển ở tầm mắt trên con đường cỏ cạnh dòng sông.",
        caption:
          "Để ý bậc đất gần chân đi qua nhanh hơn đồi phía xa. Đây là di chuyển qua hàm đi bộ của chương trình, không phải phóng to ảnh.",
      },
      fire: {
        title: "Lửa ở chỗ nghỉ",
        source: "Project 64 · Bài 04",
        poster: "embers.png",
        video: "embers.webm",
        alt: "Đốm lửa vàng cam bay lên khỏi vòng đá; bờ cỏ và vách núi đứng yên.",
        caption:
          "Nhìn chân ngọn lửa rồi nhìn các đốm ở phía trên. Vòng đá giữ nguyên, chỉ các đốm đổi màu và vị trí.",
      },
      coast: {
        title: "Bãi biển",
        source: "Project 64 · Bản hoàn chỉnh",
        poster: "coast.png",
        alt: "Bãi cát nhìn ra đại dương xanh với một mỏm đá ở xa.",
        caption:
          "Mỏm đá giúp định hướng khi mới rời bãi biển. Hãy chạy bản C++ nếu muốn tự theo một con sóng.",
      },
      valley: {
        title: "Thung lũng",
        source: "Project 64 · Bản hoàn chỉnh",
        poster: "valley.png",
        alt: "Lòng sông mở rộng giữa bờ cỏ và hai sườn đồi.",
        caption: "Lần theo bờ cỏ để tìm hướng đi về phía hẻm.",
      },
      ravine: {
        title: "Hẻm đá",
        source: "Project 64 · Bản hoàn chỉnh",
        poster: "ravine.png",
        alt: "Hai vách đá cao ép sát lòng sông giữa hẻm.",
        caption: "So bề rộng lòng sông với ảnh thung lũng; đường đi vẫn liên tục giữa hai mốc.",
      },
    },
  },
  base: {
    label: "MỘT NGÀY TRONG THẾ GIỚI VOXEL",
    title: "Gió, tuyết và giờ trên cùng một con đường",
    description:
      "Đi bộ trong một thế giới do C++/SDL3 dựng; nhìn tuyết rơi theo gió, mây trôi, sóng chạy và ánh sáng đổi theo Mặt Trời.",
  },
  modes: {
    "voxel64-1": {
      title: "Đứng giữa tuyết rơi, không đứng trước một tấm rèm",
      description:
        "Đến rừng thông tuyết, thay đổi gió và thử dừng thời gian. Hình cắt minh họa hướng rơi, bản C++ kiểm cả che khuất.",
    },
    "voxel64-2": {
      title: "Một Mặt Trời cho cả trời, đá và sóng",
      description:
        "Thử cùng một cảnh lúc 7 giờ, 12 giờ và 17 giờ; để ý phía chân trời mà Mặt Trời xuất hiện.",
    },
    "voxel64-3": {
      title: "Đặt chân lên đất thay vì cho camera bay xuyên đồi",
      description:
        "Giữ một giờ cố định và chọn điểm đứng trên đường đi. Thử bậc và va chạm bằng phím di chuyển trong bản C++.",
    },
    "voxel64-4": {
      title: "Một bếp lửa nhỏ làm mốc giữa chiều xuống",
      description: "Chọn bếp lửa, dừng ở hai thời điểm và nhìn vị trí đốm lửa so với vòng đá.",
    },
    "voxel64-5": {
      title: "Tự đi mười phút để kiểm một thế giới sống",
      description:
        "Đi qua năm mốc ở đây để lên kế hoạch, rồi tự đi liên tục trong chương trình C++; đừng dùng ảnh chụp thay cho phiên kiểm.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
