import type { ProjectLabMeta } from "../../labs/types";

const data = {
  base: {
    label: "BỐ CỤC BÀN QUAN SÁT",
    title: "Một chỗ trống biến mất, cả cột tự dời lên",
    description:
      "Theo dõi đúng cùng một đàn chim qua các mốc bố trí, ẩn Reset và thử thanh kéo tràn khỏi Panel.",
  },
  modes: {
    "box67-1": {
      title: "Vì sao thêm một nút lại phải dời cả bảng?",
      description: "Bắt đầu với đàn chim và các control đặt tay của Project 66.",
    },
    "box67-2": {
      title: "Bốn mép quanh một nút Pause",
      description: "Phân biệt khoảng cách ngoài nút, đường viền, khoảng đệm và nơi đặt chữ.",
    },
    "box67-3": {
      title: "Đo slider trước khi quyết định đặt nó ở đâu",
      description: "Một lượt đo trả kích thước theo ID, chưa sửa vị trí thật.",
    },
    "box67-4": {
      title: "Để hàng sau tự nhường chỗ cho hàng trước",
      description: "Dùng một cursorY và cộng gap đúng giữa hai child đang hiện.",
    },
    "box67-5": {
      title: "Nhóm điều khiển cao bao nhiêu thì vừa?",
      description:
        "Tính được chiều cao của Panel từ bảy hàng bên trong, không dùng một con số ước lượng.",
    },
    "box67-6": {
      title: "Ẩn Reset, kéo Radius ngay ở chỗ mới",
      description: "Để việc thêm hoặc bỏ một hàng thay đổi hình mà không thay đàn.",
    },
    "box67-7": {
      title: "Khi nào thực sự phải xếp lại bảng?",
      description: "Cập nhật hình học trước sự kiện kế tiếp, không đợi đến cuối frame.",
    },
    "box67-8": {
      title: "Phần slider bị cắt có còn thuộc về nó không?",
      description:
        "Tách kích thước đầy đủ để tính giá trị khỏi phần nhìn thấy để bắt đầu thao tác.",
    },
    "box67-9": {
      title: "Nghiệm thu bảng điều khiển của đàn Boids",
      description: "Kiểm độc lập hình học, sự kiện sau reflow và chi phí lúc đàn đang bay.",
    },
  },
  native: {
    directory: "/field-notes/flock-workbench",
    takes: {
      manual: {
        title: "Các hàng đặt bằng tay",
        source: "Project 67 · Bài 01",
        poster: "p67-manual.png",
        alt: "Bảng thủ công bên phải đàn chim, với nút Pause và hai thanh kéo.",
        caption:
          "Tọa độ của mỗi hàng đến từ một Rect riêng; kéo Radius vẫn đổi vùng quanh chim vàng.",
      },
      boxes: {
        title: "Bốn mép của nút Pause",
        source: "Project 67 · Bài 02",
        poster: "p67-boxes.png",
        alt: "Viền vàng, xanh, tím và ngọc quanh nút Pause, kèm bảng chú giải.",
        caption:
          "Từ ngoài vào trong: khoảng cách giữa các hàng, viền, mép padding rồi tới phần nội dung.",
      },
      group: {
        title: "Nhóm bảy hàng",
        source: "Project 67 · Bài 05",
        poster: "p67-group.png",
        alt: "Ba nút, hai nhãn và hai slider trong Panel con đã tự tính chiều cao.",
        caption: "Group cao 352 pixel, không cần ghi chiều cao đó trong hàm dựng cây.",
      },
      hidden: {
        title: "Sau khi ẩn Reset",
        source: "Project 67 · Bài 06",
        poster: "p67-hidden.png",
        alt: "Nút Reset biến mất, các hàng bên dưới xếp lên.",
        caption: "Đối chiếu với ảnh có bảy hàng: mỗi control dưới Reset dời lên đúng 52 pixel.",
      },
      overflow: {
        title: "Slider rộng hơn bảng",
        source: "Project 67 · Bài 08",
        poster: "p67-overflow.png",
        alt: "Panel hẹp, phần cuối của thanh Radius bị cắt.",
        caption:
          "Thanh còn rộng 320 dù chỉ thấy 158 pixel. Phần bị cắt không nhận một lần nhấn mới.",
      },
      desk: {
        title: "Bàn quan sát hoàn chỉnh",
        source: "Project 67 · Bản hoàn chỉnh",
        poster: "p67-desk.png",
        alt: "Đàn Boids bên trái và bảng tham số tự bố trí bên phải.",
        caption: "Bấm H khi chạy bản C++ để ẩn Reset, rồi kéo Radius ngay ở chỗ mới.",
      },
      measured: {
        title: "Đã đo, chưa dời hàng",
        source: "Project 67 · Bài 03",
        poster: "p67-measured.png",
        alt: "Inspector hiện chiều cao tự nhiên của root trong khi các hàng vẫn ở tọa độ viết tay.",
        caption: "Measure chỉ tính số; nó không dịch nút khỏi chỗ bạn vừa bấm.",
      },
      column: {
        title: "Một cột chưa chia nhóm",
        source: "Project 67 · Bài 04",
        poster: "p67-column.png",
        alt: "Các nút và hai slider xếp một cột trực tiếp trong root.",
        caption:
          "Quan sát hàng thứ hai cách góc trên hàng thứ nhất 52 pixel. Chưa có Group ở mốc này.",
      },
    },
    overview: ["desk", "hidden", "boxes", "overflow"],
    lessons: {
      "box67-1": ["manual"],
      "box67-2": ["boxes"],
      "box67-3": ["measured", "manual"],
      "box67-4": ["column", "manual"],
      "box67-5": ["group"],
      "box67-6": ["group", "hidden"],
      "box67-7": ["desk", "hidden"],
      "box67-8": ["overflow", "desk"],
      "box67-9": ["desk", "hidden", "boxes", "overflow"],
    },
  },
} satisfies ProjectLabMeta;

export default data;
