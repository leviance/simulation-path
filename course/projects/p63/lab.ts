import type { ProjectLabMeta } from "../../labs/types";
const data = {
  native: {
    directory: "/field-notes/voxel-expedition",
    overview: ["sea", "river", "pines", "channel", "camp"],
    lessons: {
      "voxel63-1": ["channel"],
      "voxel63-2": ["pines"],
      "voxel63-3": ["river"],
      "voxel63-4": ["sea"],
      "voxel63-5": ["sea", "river", "channel", "pines", "camp"],
    },
    takes: {
      channel: {
        title: "Hẻm đá bên sông",
        source: "Project 63 · Bài 01",
        poster: "channel.png",
        alt: "Dòng sông xanh chạy giữa hai sườn đá xếp thành bậc.",
        caption:
          "Theo lòng sông tới chỗ hai vách tiến sát nhau. Ở bài này ta xét hình dạng lòng sông, chưa đánh giá dòng chảy.",
      },
      pines: {
        title: "Rừng thông tuyết",
        source: "Project 63 · Bài 02",
        poster: "pines.png",
        alt: "Thông sẫm màu in lên đường sống núi phủ tuyết.",
        caption:
          "Nhìn chỗ tuyết kết thúc dưới một tán thông. Đây là địa hình và cây của checkpoint, chưa có bông tuyết rơi.",
      },
      river: {
        title: "Nước trong thung lũng",
        source: "Project 63 · Bài 03",
        poster: "river.png",
        video: "river.webm",
        alt: "Những vệt trên mặt nước đi dọc bờ cỏ giữa hai sườn thung lũng.",
        caption:
          "Chọn góc một bậc đất làm mốc. Vệt sáng chạy trên mặt sông trong khi đường bờ vẫn ở nguyên chỗ cũ.",
      },
      sea: {
        title: "Sóng ngoài bãi cát",
        source: "Project 63 · Bài 04",
        poster: "sea.png",
        video: "sea.webm",
        alt: "Mỏm đá nhô lên giữa các dải sóng xanh ngoài bãi cát.",
        caption:
          "Nhìn quanh mỏm đá, rồi so với đoạn sông: ở biển, mặt nước nhô lên và hạ xuống, không chỉ có họa tiết trôi.",
      },
      camp: {
        title: "Chỗ nghỉ trong rừng",
        source: "Project 63 · Bản hoàn chỉnh",
        poster: "clearing.png",
        alt: "Khoảng đất trống bên dòng sông dưới sườn núi có tuyết.",
        caption: "Chỗ nghỉ đã có mặt trong địa hình. Bếp lửa là việc của Project 64.",
      },
    },
  },
  base: {
    label: "TỪ TUYẾT RA BIỂN",
    title: "Men sông tới nơi có sóng",
    description:
      "Theo một con sông từ hẻm núi qua rừng, bãi cát đến vùng nước mở có sóng nhìn được từ bờ.",
  },
  modes: {
    "voxel63-1": {
      title: "Khắc một lòng sông từ núi ra biển",
      description:
        "Đổi điểm quan sát để nhận ra bờ biển và hẻm. Hình cắt giúp đọc địa hình; bản C++ cho đi bộ giữa các vùng.",
    },
    "voxel63-2": {
      title: "Cho tán thông vượt qua đường biên chunk",
      description:
        "Chọn rừng thông tuyết rồi so với thung lũng. Mở bản C++ để theo một tán cây qua biên chunk.",
    },
    "voxel63-3": {
      title: "Nhìn vệt nước chạy qua một tảng đá đứng yên",
      description: "Chọn thung lũng, tiến một nhịp và theo dõi vệt nước trôi qua tảng đá đứng yên.",
    },
    "voxel63-4": {
      title: "Đỉnh sóng phải nhô lên khỏi mặt biển",
      description:
        "Tới bãi cát, cho thời gian chạy. Theo đường mép nước cạnh hòn đá rồi Pause ngay khi một đỉnh đi qua.",
    },
    "voxel63-5": {
      title: "Theo một con sông qua năm điểm hẹn",
      description:
        "So sông với biển ở hai điểm quan sát. Cao độ sóng và pha vệt là hai số đo khác nhau.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
