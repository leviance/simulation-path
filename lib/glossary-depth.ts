import type { GlossaryTerm } from "./glossary";

// Nhóm thuật ngữ về visibility/depth được tách riêng để glossary chính không phình to.
export const depthGlossaryTerms: GlossaryTerm[] = [
  {
    id: "indexed-mesh",
    term: "Indexed mesh",
    definition:
      "Mesh lưu vertex một lần rồi triangle tham chiếu chúng bằng index. Cube Project 17 có tám vertex nhưng mười hai triangle; các corner dùng chung không phải sao chép position ba lần cho mỗi triangle.",
  },
  {
    id: "draw-order",
    term: "Draw order",
    definition:
      "Thứ tự primitive được gửi vào rasterizer. Nếu callback sau luôn ghi đè callback trước mà không có depth test, đổi draw order có thể đổi hình dù scene không thay đổi.",
  },
  {
    id: "painters-algorithm",
    term: "Painter's algorithm",
    definition:
      "Cách vẽ bề mặt xa trước, gần sau như họa sĩ phủ sơn. Nó dùng được trong một số scene đơn giản, nhưng việc sort cả triangle không giải quyết chắc chắn các bề mặt giao nhau hoặc che nhau khác nhau theo từng pixel.",
  },
  {
    id: "fragment",
    term: "Fragment",
    definition:
      "Ứng viên màu/depth do rasterizer tạo cho một sample pixel được primitive phủ. Fragment chỉ trở thành giá trị cuối trong framebuffer sau khi vượt qua các phép thử như depth test.",
  },
  {
    id: "ndc",
    term: "Normalized Device Coordinates (NDC)",
    definition:
      "Hệ tọa độ sau perspective divide. Khóa học dùng X/Y trong [-1,1] và depth trong [0,1]; viewport transform đổi X/Y sang pixel còn Z được giữ cho depth test.",
  },
  {
    id: "depth-buffer",
    term: "Depth buffer (Z-buffer)",
    definition:
      "Mảng lưu depth gần nhất đã thắng ở từng pixel. Project 17 cấp phát nó cùng kích thước color buffer, clear về 1.0 đầu frame và dùng cùng row-major index y×width+x.",
  },
  {
    id: "depth-interpolation",
    term: "Depth interpolation",
    definition:
      "Tính depth tại fragment từ depth của ba vertex. Với NDC depth, Project 17 dùng cùng barycentric weights của coverage test: z=wA×zA+wB×zB+wC×zC.",
  },
  {
    id: "depth-test",
    term: "Depth test",
    definition:
      "Phép so depth của fragment mới với depth đang lưu. Trong convention Project 17, NDC depth nhỏ hơn nằm gần camera hơn, nên fragment pass khi newDepth < storedDepth.",
  },
  {
    id: "depth-write",
    term: "Depth write",
    definition:
      "Cập nhật depth buffer bằng depth của fragment đã pass. Color write và depth write phải cùng thuộc nhánh pass; fragment fail không được thay đổi kết quả của fragment gần hơn.",
  },
  {
    id: "render-pipeline",
    term: "Render pipeline",
    definition:
      "Chuỗi stage biến geometry thành pixel. Pipeline CPU của Project 17 chạy transform → projection → triangle rasterization → depth test/write → color write → present.",
  },
];
