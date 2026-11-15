# Project 47 — hồ sơ kiểm chứng bản xây lại

Ngày 15/11/2026. Đối chiếu Project 47 cùng các hợp đồng 0.4, 0.7, 0.9–0.10 và 3.4 trong [đặc tả chuẩn](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không sửa hoặc giảm yêu cầu của đặc tả.

## Phạm vi đã bàn giao

Chín bài tiếng Việt, từ khung SDL và ảnh nhiệt đứng yên đến bút vẽ, sai phân 1D/2D, biên/nguồn, thí nghiệm bất ổn, lưới lớn, probe và kiểm chứng. Mỗi bài có bảy vai trò giảng dạy, dự đoán/thử sai và source chạy được sau bài. Field cơ sở và khung SDL/UI được nêu rõ là phần cung cấp sẵn; solver và đường vẽ được bổ sung qua checkpoint.

Source C++20/SDL 3.4.8 có starter, checkpoint 1–9 và final. Final mặc định 192×192 = 36.864 ô; 32² chỉ dùng để học. Canvas TypeScript/Canvas 2D là công cụ hỗ trợ, không dùng để chứng nhận native workload hoặc thay chương trình C++.

## Đối chiếu yêu cầu và bằng chứng

| Yêu cầu                                        | Triển khai và phép kiểm                                                                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trường 2D, mouse injection, slider D/dt, reset | `source-template/include/input.hpp`, `commands.hpp`, `workshop.hpp`, `panel.hpp`; Canvas tương ứng. Browser kiểm bút, D/dt, reset/clear; native do người dùng xác nhận.                                                                 |
| Discrete Laplacian và PDE loop tự viết         | `diffusion.hpp`: current → candidate next → kiểm → swap. Xung tính tay và oracle thông lượng qua từng cạnh không gọi lại sample/stability/diffuse.                                                                                      |
| Ít nhất 128² ô thật                            | Final 192², thêm 128/256. CTest đòi 36.864 visits mỗi bước qua 120 bước; SDL hidden run ghi actual_drawn=36864, next=36864, tick=120, t=4. Texture capacity256² được báo riêng.                                                         |
| Công bố scheme, D/dt/dx/dy và ổn định          | Bài 3–7, README, panel/Canvas. D=1,5, h=0,5, dt=1/30, rx+ry=0,4. Đổi N không sửa D/dt hộ người dùng.                                                                                                                                    |
| Biên/nguồn đúng ý nghĩa                        | Zero-flux ghost ở mặt ngoài hoặc giữ tâm vành ô ở 0; heater giữ theta, không phải công suất cố định. Brush không phá vành; unpin không xóa nhiệt. Tests có ledger nguồn riêng.                                                          |
| Có thí nghiệm mất ổn định thật                 | Bàn cờ192², dt=0,05: mode thường chặn; experiment chấp nhận 12 bước rồi giữ min≈−13,6735/max≈14,6735, từ chối candidate vượt16. Không clamp nghiệm; có budget400 và guard NaN/Inf.                                                      |
| Constant/reference/symmetry/conservation       | Trường0,4, xung, oracle dx≠dy, cosine discrete/PDE và refinement cùng miền/thời điểm. Ca kín không nguồn dùng ngưỡng I*:1e-9+abs(I*0)×1e-12, symmetry1e-12 theta; không áp bảo toàn cho heater/vành lạnh.                               |
| Sai số hữu hạn có ý nghĩa                      | Cosine scheme max error≤2e-13 theta. Refinement miền16², t=0,4, D=0,5, N16/32/64, dt∝h² cho sai số xấp xỉ1,704e-5/4,267e-6/1,067e-6. NaN/Inf fail.                                                                                      |
| Hình ảnh và công cụ quan sát                   | Fixed heatmap, color legend, inspector, probe/history, sáu preset, view sạch và pin overlay. Không suy nhiệt lượng từ độ sáng; I* không gán Joule.                                                                                      |
| Source/bài học không lệch                      | 27 code block lấy đúng marker của từng checkpoint; kiểm literal/toán tử bằng token liên tiếp. `sync-marked-snippets --check` read-only đạt.                                                                                             |
| Source tải về chạy độc lập                     | ZIP223 file, danh sách/byte/digest khớp source; từ ZIP build starter +9 checkpoints +final +tests ở Debug/Release. SDL exact3.4.8 cache được tái dùng cho validation; đường mặc định FetchContent URL/SHA-256 và SDL3::SDL3 giữ nguyên. |
| Canvas đúng vòng đời                           | Lưới nằm ngoài React, summary/history nhỏ publish tối đa8Hz; pause/reset/presets, pointer capture, keyboard, DPR, reduced motion và dispose. Controls bị disabled tới khi handler sẵn sàng, tránh click bị mất trong lúc hydration.     |
| Giới hạn tài nguyên                            | Một worker build C++; native matrix có deadline tổng5 phút, mỗi tiến trình có watchdog. CLI benchmark≤100 triệu timed cell visits, deadline20s; hidden/capture bắt buộc có thời lượng hữu hạn. Không tự bật server.                     |

## Kết quả riêng Project 47

- TypeScript, architecture budgets và Git hygiene: đạt. Không đưa build tree, thư viện, snapshots, ZIP hoặc ảnh kiểm thử vào Git.
- Toán/controller Canvas:10/10; marker helper:3/3; source/nội dung/style/route của Project47:6/6 ở lượt production đã kiểm. Không hạ hoặc bỏ test toàn site.
- Desktop Chrome trên server người dùng mở tại localhost:3000:7/7. Có pulse, bất ổn thật, heater/unpin, biên, D/dt, đổi N, probe, resize, reduced motion, chín route, hai alias, dark theme, tiến độ và source/ZIP. Copy handler được kiểm bằng clipboard giả trong trang riêng; không ghi đè clipboard hệ điều hành của người dùng.
- ZIP cuối có source digest `193c4b2a386929b9f11c1dea3c9a70f71ee3035ba9cc1eb3ee8402759aac66d3`,223 file. CMake Visual Studio2022/x64, MSVC19.33:11 app targets và một test target ở mỗi Debug/Release; CTest1/1 ở từng cấu hình. Không có compiler warning.
- Native automated smoke:mọi executable tự thoát hữu hạn; final192² update/render đủ ô và experiment dừng đúng guard. `--verify` và benchmark chạy CPU trước SDL_Init, không cần window.
- Native mouse/keyboard: Computer Use không thực hiện được do `app approval timed out`; cửa sổ thử tự đóng sau60s. Người dùng sau đó trả lời **“Đã kiểm, đạt yêu cầu”** cho riêng Project47. Đây là xác nhận thủ công của người dùng, không ghi thành agent đã điều khiển chuột thật. Sau xác nhận chỉ chỉnh lý đọc đúng nhánh SDL_Event và câu diễn giải/README; build lại ZIP, không đổi solver hay thao tác.
- Bản build production chốt sau khi gỡ nhãn chờ nghiệm thu: **đạt**, suite scoped Project47 đạt6/6 và27 snippet bindings vẫn khớp. Bằng chứng ở `.validation/p47-release-site-evidence.json`.

Các log/data kiểm tự động được giữ ở `.validation/p47-package-native-evidence.json`, `p47-package-native.log`, `p47-final-site-evidence.json` và `p47-release-site-evidence.json`; đây là output local ngoài Git, không phải nguồn authored hay một phần ZIP C++.

## Một phép đo Release, không phải cam kết FPS

Windows x64, CPU identifier `AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD`, MSVC1933. N192², Gaussian/cách nhiệt, D1,5, h0,5, dt1/30; warm-up32,7 batch×120 bước, reset ngoài vùng đo. Thời gian gồm diffuse và loop kiểm deadline, không gồm stats/reset/ảnh/upload/render.

Raw trung bình ms/bước của bảy batch:0,24315;0,24117;0,2380883333;0,2374341667;0,2371283333;0,2372666667;0,237845. Median0,237845ms, p95 các batch0,24315ms. Số liệu chỉ thuộc máy/lần chạy này; không so CPU draw submission với GPU time hoặc suy FPS chung.

## Kết quả quét toàn site — ngoài phạm vi bản xây lại này

Lượt `tests/rendered-html.test.mjs` đã chạy344 kiểm tra:334 đạt,10 không đạt. Các lỗi bên dưới không nằm ở nội dung/Canvas/source Project47. Không gọi toàn site là100%, không đổi luật để che lỗi.

| Nhóm lỗi                                              | Bằng chứng hiện tại và hướng xử lý riêng                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P42 thiếu textual Canvas state ở SSR                  | `all published project and lesson routes render` dừng tại particle-morph-studio. Cần đối chiếu readout/SSR của P42.                                                 |
| Liên kết `/roadmap/39` trả404                         | Suite internal links báo URL này; cần sửa nguồn link hoặc bổ sung redirect legacy phù hợp. P47 chỉ liên kết bài tiếp theo sang wind-map.                            |
| Chunk P38 quá budget                                  | charged-particle-chamber-lab34144 bytes; tách module, không nâng budget32KiB để hợp thức hóa.                                                                       |
| Homepage assertion chưa đồng bộ                       | Kiểm tìm nguyên văn “Những thứ bạn sẽ tự tay tạo ra” trong HTML thất bại; cần đối chiếu rendered heading và yêu cầu hiện tại.                                       |
| Ba assertion Downloads giả định còn previous-editions | Roadmap revisions, P40 và P41 đều đòi `split>0` dù không còn project cung cấp tài liệu cũ. Cần kiểm theo trạng thái thực, không thêm section rỗng chỉ để qua regex. |
| P39 bài04 không có titled CPP block                   | Bài hiện chỉ có GLSL; cần review phần nối host và hợp đồng nội dung, không âm thầm bỏ kiểm.                                                                         |
| P42 bài cuối chưa dạy CTest Debug                     | Hiện chỉ có lệnh Release. File không bị đổi trong đợt P47.                                                                                                          |
| P42 C++ thụt dòng sai                                 | `morph_app.hpp:13` có10 spaces ở continuation; file không bị đổi trong đợt P47.                                                                                     |

Một lỗi có thể làm suite dừng trước các project phía sau; vì vậy Project47 còn có suite scoped riêng kiểm cả19 header, main/tests và27 snippet. Xác nhận các file P42 không khác HEAD bằng Git, giữ nguyên nội dung ngoài scope và ghi việc cần xử lý riêng thay vì gom thành “Project47 đạt thì toàn khóa học đạt”.
