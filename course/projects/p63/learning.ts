import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p63-l01": {
      focus: "Khắc một lòng sông từ núi ra biển",
      expected: "Cùng seed có thể quay về đúng nền và mực nước ở bãi biển hay vùng núi.",
      files: [
        "include/trail/terrain.hpp",
        "include/trail/region.hpp",
        "include/trail/field-scene.hpp",
        "include/trail/window.hpp",
      ],
      steps: [
        {
          title: "Vẽ mặt cắt từ biển lên núi",
          explanation:
            "Trong terrain.hpp, viết riverCenter để dòng sông có tim uốn theo z. siteAt nhận x/z **world** và seed, tính khoảng cách tới bờ biển và tim sông, hạ thấp lòng sông, nâng hai bên thành đất rồi chừa lối men bờ. Nếu dùng tọa độ local 0–15, hình núi sẽ lặp lại ở mọi cột và gãy tại đường nối.",
        },
        {
          title: "Lấp đất trước, rót nước sau",
          explanation:
            "Trong naturalColumn, dùng bốn section xếp chồng để có 64 ô chiều cao. Với mỗi vị trí ngang, lấp đến ground rồi mới điền Water từ ô trên nền đến mực sông hoặc biển.",
        },
        {
          title: "Nối địa hình mới vào đường nạp đang chạy",
          explanation:
            "Trong region.hpp, đổi nguồn của Region::load từ makeBank sang naturalColumn và truyền seed. Trong field-scene.hpp, đặt mắt lên cao độ tại điểm đến thay vì dùng một độ cao cho mọi cảnh.",
        },
      ],
    },
    "p63-l02": {
      focus: "Cho tán thông vượt qua đường biên chunk",
      expected: "Tán qua được mép chunk. Quay lại cùng seed không mọc lại một cây khác ở chỗ đó.",
      files: [
        "include/trail/terrain.hpp",
        "include/trail/materials.hpp",
        "include/trail/field-controls.hpp",
      ],
      steps: [
        {
          title: "Tìm cả những gốc nằm ngoài cột",
          explanation:
            "Cuối naturalColumn trong terrain.hpp, sau khi làm đất, chia mặt phẳng world thành ô 7 block và chọn vị trí gốc từ seed cùng địa chỉ ô. Mở rộng miền xét sang bên cạnh 3 block để không bỏ phần tán vươn qua mép.",
        },
        {
          title: "Chọn dáng cây từ nơi nó mọc",
          explanation:
            "Dùng siteAt đã có để biết nền và vùng núi trước khi đặt thân. Ở rừng thông, sửa materials.hpp để lá kim có những mảng sáng giống tuyết bám.",
        },
        {
          title: "Chủ động đổi seed để kiểm phép sinh",
          explanation:
            "Trong field-controls.hpp, gắn N với tăng seed và gọi lại generate(). Đổi N kiểm rằng **bản đồ khác** có thay đổi.",
        },
      ],
    },
    "p63-l03": {
      focus: "Nhìn vệt nước chạy qua một tảng đá đứng yên",
      expected: "Cạnh đá đứng yên, vệt nước đi về hạ lưu và dừng khi P.",
      files: ["include/trail/water.hpp", "include/trail/field-render.hpp"],
      steps: [
        {
          title: "Tách chuyển động của vệt khỏi vật liệu của ô",
          explanation:
            "Trong water.hpp, flowPhase cho biết một vệt đã đi tới đâu trong chu kỳ dài một bước sóng. Trừ phần quãng đường do thời gian tạo ra, rồi lấy phần lẻ để pha lặp.",
        },
        {
          title: "Chỉ tô mặt trên của sông",
          explanation:
            "Trong field-render.hpp, ở terrainFace, lọc Water với hướng mặt trên rồi dùng siteAt phân biệt sông với biển. Dịch tọa độ họa tiết theo weather.time và hướng dọc lòng sông.",
        },
      ],
    },
    "p63-l04": {
      focus: "Đỉnh sóng phải nhô lên khỏi mặt biển",
      expected:
        "Ở rạn đá gần bờ, thấy cả mép sóng nâng hạ lẫn vệt phản sáng, không chỉ là một dải màu trượt.",
      files: ["include/trail/field-render.hpp"],
      steps: [
        {
          title: "Đọc chiều cao và độ dốc từ cùng một hàm",
          explanation:
            "oceanAt trong water.hpp đã có từ bài trước. Hai sóng đi theo hai hướng; sin cho độ cao, cos cho độ dốc theo x và z.",
        },
        {
          title: "Uốn bốn góc rồi mới tô nước biển",
          explanation:
            "Chỉ sửa field-render.hpp. Trong nhánh site.ocean, lấy bốn đỉnh của mặt nước, gọi oceanAt ở tọa độ world từng đỉnh rồi cộng height vào y.",
        },
      ],
    },
    "p63-l05": {
      focus: "Theo một con sông qua năm điểm hẹn",
      expected:
        "Năm phím F5–F9 trở về năm mốc trên cùng bản đồ; người xem cũng có thể tự đi giữa các mốc.",
      files: ["include/trail/field-controls.hpp"],
      steps: [
        {
          title: "Ánh xạ phím tới chỗ đứng, không thay seed",
          explanation:
            "Trong field-controls.hpp, với phím từ F5 đến F9, lấy hiệu với F5 để có chỉ số 0–4. Chọn preset cảnh quan rồi gọi resetPose.",
        },
        {
          title: "Tự đi một đoạn thay vì chỉ nhảy mốc",
          explanation:
            "F5 về biển, F6 về sông, F7 tới hẻm, F8 tới vùng thông tuyết và F9 tới chỗ nghỉ. Từ biển, lần theo sông bằng WASD rồi nhìn lại một cây khi quay về; dùng F6 chỉ để đối chiếu nếu lạc.",
        },
      ],
    },
  },
  references: {
    "p63-l01": [
      {
        label: "Độ cao theo tọa độ thế giới",
        href: "/glossary#world-heightfield",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l02": [
      {
        label: "Neo cây vượt biên",
        href: "/glossary#terrain-generation",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l03": [
      {
        label: "Vệt trôi theo dòng",
        href: "/glossary#voxel-river-tracer",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l04": [
      {
        label: "Đỉnh và pháp tuyến của sóng biển",
        href: "/glossary#voxel-ocean-wave",
        kind: "Thuật ngữ",
      },
    ],
    "p63-l05": [
      {
        label: "Value noise và seed",
        href: "/glossary#terrain-value-noise",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
