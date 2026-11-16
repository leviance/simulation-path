# Project 52 — kế hoạch xây lại theo đặc tả v4

Nguồn chuẩn: mục Project 52 và hợp đồng giảng dạy 0, 3 trong `docs/specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md`. Bản cũ được giữ ngoài Git trong `.validation/retired-project-52-fixed-camera/`.

## Những điểm bản cũ chưa đáp ứng

- Cảnh chỉ có khung dây, camera cố định; metadata còn cấm đổi camera dù đặc tả yêu cầu tương tác này.
- Chưa cho di chuyển bốn đối tượng hoặc nguồn tia. Khi tia trùng camera, đường tia co lại thành một pixel; inset XZ chỉ giải quyết một phần việc quan sát.
- Chỉ hiển thị khoảng vào/ra của box, chưa có khoảng của sphere. Phần lớn dữ liệu trong bản C++ nằm ở title/console.
- Chưa có quy trình kiểm hữu hạn và ảnh thực tế của ứng dụng mới. Build/test cũ không chứng minh sản phẩm mới đạt yêu cầu.

## Sản phẩm cần đạt và bằng chứng phải thu thập

| Yêu cầu                                          | Thay đổi                                                                                                                      | Bằng chứng cần có                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Bốn primitive trong một cảnh 3D tương tác        | Bề mặt có chiều sâu; renderer CPU có depth buffer, near clipping; sphere dựng mesh chỉ để vẽ, phép giao dùng sphere giải tích | Ảnh/cửa sổ C++ và Canvas thực tế; kiểm chồng hình/near plane                             |
| Di chuyển camera, tia, đối tượng; chọn primitive | Tách camera quan sát khỏi camera ngắm bắn; orbit/pan/zoom; chọn và tịnh tiến từng primitive, dịch nguồn tia                   | Kiểm chuột/phím và kiểm state; observer thay đổi không đổi ray/hit                       |
| Hit, normal và entry/exit đọc được               | Overlay world-space + bảng trong cửa sổ; khoảng hình học chưa clip chỉ dành cho sphere/AABB                                   | Fixture entry/exit, origin trong solid, khoảng tia nằm trọn bên trong; dữ liệu khớp hình |
| Tự viết phép giao/debug drawing                  | Giữ và giải thích plane, quadratic ổn định, slab, Möller–Trumbore; không engine raycast                                       | Unit test Debug/Release có nghiệm biết trước, invariant độc lập, nearest/tie/range       |
| Hướng dẫn liên tục, source đầy đủ                | Tám mốc hiện có giữ vai trò rõ; công bố renderer scaffold, từng thay đổi có chỗ gọi; markers đúng checkpoint                  | Hợp đồng snippet liên tiếp/marker; build starter, 01–08, final; ZIP byte-identical       |
| Thử sai và học tương tác                         | Ca song song, tiếp tuyến, trong solid, hướng ngược; thao tác vật thể/camera giúp phân biệt đổi phép đo và đổi góc nhìn        | Canvas mouse/keyboard, pause/reset, preset, DPR, reduced-motion, dispose                 |
| Đóng gói/local và an toàn                        | C++20/SDL3 3.4.8/CMake 3.24; ZIP độc lập; không server/backend mới                                                            | Source/package/hygiene; build/test từng job với deadline và một worker                   |

## Trạng thái

Việc triển khai và đối chiếu được ghi trong [hồ sơ kiểm chứng](project-52-rebuild-validation.md). Giữ nguyên yêu cầu đặc tả; không dùng bản khung dây cũ để thay sản phẩm mới. Đợt xây lại không stage, commit hoặc push nếu chưa có yêu cầu riêng.
