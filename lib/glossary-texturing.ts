import type { GlossaryTerm } from "./glossary";

// Texturing terms are sharded so later rendering projects do not grow one registry forever.
export const texturingGlossaryTerms: GlossaryTerm[] = [
  {
    id: "texture-mapping",
    term: "Texture mapping",
    definition:
      "Phép lấy màu từ một ảnh 2D rồi gắn lên bề mặt hình học. Mỗi vertex mang UV; rasterizer nội suy UV tại pixel và texture sampler đổi UV thành texel.",
  },
  {
    id: "uv-coordinates",
    term: "UV coordinates",
    definition:
      "Tọa độ 2D trên texture, tách khỏi XYZ của geometry. Project 20 dùng U tăng sang phải, V tăng xuống dưới và bốn corner quad nhận UV từ (0,0) tới (1,1).",
  },
  {
    id: "texel",
    term: "Texel",
    definition:
      "Một phần tử màu của texture, tương tự pixel nhưng thuộc ảnh nguồn được lấy mẫu. Nearest sampling biến UV liên tục thành một cặp texel index nguyên.",
  },
  {
    id: "nearest-texture-sampling",
    term: "Nearest texture sampling",
    definition:
      "Cách chọn đúng một texel gần vị trí UV thay vì pha nhiều texel. Kết quả giữ cạnh bàn cờ sắc nhưng có thể lộ răng cưa khi texture bị thu nhỏ.",
  },
  {
    id: "texture-address-mode",
    term: "Texture address mode",
    definition:
      "Quy tắc xử lý UV ngoài miền 0..1. Clamp giữ UV tại biên; repeat lấy phần thập phân dương để texture lặp lại, kể cả khi UV âm.",
  },
  {
    id: "affine-interpolation",
    term: "Affine interpolation",
    definition:
      "Nội suy trực tiếp thuộc tính bằng barycentric weights trong screen space. Nó đúng cho thuộc tính tuyến tính sau projection, nhưng raw UV của bề mặt 3D nghiêng sẽ bị méo do perspective divide.",
  },
  {
    id: "reciprocal-depth",
    term: "Reciprocal depth",
    definition:
      "Nghịch đảo độ sâu 1/z. Trong Project 20, rasterizer nội suy 1/z cùng u/z và v/z rồi chia lại để khôi phục UV đúng tại pixel.",
  },
  {
    id: "perspective-correct-interpolation",
    term: "Perspective-correct interpolation",
    definition:
      "Cách nội suy vertex attribute có bù perspective: nội suy attribute/z và 1/z trong screen space, sau đó chia hai kết quả. Nó làm texture bám đúng lên bề mặt 3D nghiêng.",
  },
];
