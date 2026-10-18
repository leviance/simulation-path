import type { ProjectLabMeta } from "../../labs/types";
const data = {
  base: {
    label: "VERTICAL BOX LAYOUT LAB",
    title: "Xếp control mà không ghi từng tọa độ",
    description:
      "Thay gap, padding và constraint; theo dõi margin/content, kích thước đo được, Rect và số lượt layout.",
  },
  modes: {
    "box67-1": {
      title: "Bố cục thủ công",
      description: "Cây UI chạy được, nhưng các tọa độ vẫn do ta điền tay.",
    },
    "box67-2": {
      title: "Các lớp hộp",
      description:
        "Cam là margin, xanh dương là border box, xanh lá là content box; chưa tự đặt control.",
    },
    "box67-3": {
      title: "Đo trước khi đặt",
      description: "So số đo với Rect đang đặt tay; measure không phải arrange.",
    },
    "box67-4": {
      title: "Một cột tự động",
      description: "Thay gap và padding; một vòng lặp đặt mọi child của root.",
    },
    "box67-5": {
      title: "Panel tự cao",
      description: "Group chứa control và có Auto height; root vẫn cao cố định 492.",
    },
    "box67-6": {
      title: "Flow thay đổi",
      description: "Ẩn Reset, thêm hoặc xóa Label; các control sau tự dịch theo.",
    },
    "box67-7": {
      title: "Dirty layout",
      description: "Đổi constraint, so passes trước và sau 1000 frame; input đọc Rect mới.",
    },
    "box67-8": {
      title: "Bounds không phải clip",
      description: "Slider Fixed 320 tràn Panel hẹp, nhưng phần ngoài clip không nhận chuột.",
    },
    "box67-9": {
      title: "Kiểm chứng layout",
      description:
        "Thử fixture, visibility, overflow, cache và keyboard; audit không thay desktop QA.",
    },
  },
} satisfies ProjectLabMeta;
export default data;
