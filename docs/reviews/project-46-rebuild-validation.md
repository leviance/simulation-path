# Project 46 — Hộp cát số: tích hợp và nghiệm thu

Ngày 15/11/2026 (Asia/Bangkok). Nguồn chuẩn: Project 46 và các hợp đồng chung 0.4, 0.7, 0.9–0.10, 3.4–3.6 trong [Product Specification v4 complete](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md).

**Trạng thái: đã nghiệm thu ngày 15/11/2026.** Người dùng xác nhận trực tiếp: “Tôi đã kiểm tra, project đạt yêu cầu”. Xác nhận này đóng bước kiểm trực tiếp của học phần; không phải trace Computer Use hoặc kết quả Playwright của agent. Đã bỏ nhãn đang nghiệm thu; các kiểm/build chốt tự động đã qua và được ghi riêng bên dưới.

## Sản phẩm và nguồn chuẩn

- Chín bài: vẽ lưới → brush → rơi thẳng → trượt/thứ tự → nước/swap → clock/speed → texture/lưới lớn → điều khiển/cảnh mẫu → kiểm chứng.
- Final C++20/SDL3 dùng **512×320 = 163.840 ô**, cập nhật/vẽ toàn lưới. Các mốc 0–6 dùng 96×64; không dùng mốc nhỏ thay bản cuối.
- Native có paint/erase, radius 0–24, keyboard cursor/Enter, run/pause/step/speed, clear/reset, năm preset, seed/order, inspector, view sạch và màu phẳng.
- Đây là cellular sandbox cập nhật tại chỗ. Không có lực/áp suất/độ nhớt hoặc lời hứa giải phương trình chất lưu. Seed chỉ xếp vật liệu cho Mixture; scan order và ưu tiên chéo được công bố.

Nguồn authored nằm trong `course/projects/p46`, `content/falling-sand`, `examples/project-46-falling-sand/source-template`, tests/README/REFERENCES, `lib/labs/falling-sand` và `components/labs/falling-sand`. Entry Canvas chỉ lazy-load workshop. Không giữ thêm bản source nháp trùng lặp trong thư mục phát hành.

Nguồn cũ được giữ local trong `.validation/retired-project-46-v1`; có thể khôi phục các file tracked từ Git. Build tree, ZIP, ảnh, log và JSON evidence đều ngoài Git. Không thêm dependency hoặc asset bên thứ ba.

## Giáo trình, code và điều hướng

- Mỗi bài có đủ bảy vai trò giảng dạy, code C++ bốn dấu cách, One Dark, thí nghiệm lỗi và checklist. Bài 1 phân biệt khung SDL/Grid được cung cấp với phần tự viết; các bài sau chỉ rõ file và nơi gọi helper.
- **35 đoạn trích C++** khớp token liên tiếp trong đúng snapshot, gồm tests ở bài cuối. Không dùng subsequence để bỏ qua literal/toán tử sai. Compiler MDX thật kiểm cả chín bài, KaTeX và Canvas mode.
- Metadata/learning/lab/catalog đồng bộ chín checkpoint. `contentRevision: 2` chỉ loại tiến độ P46 cũ; bài hiện tại và tiến độ các project khác giữ nguyên theo unit test.
- URL cũ `/projects/falling-sand/07-kiem-chung-va-hoan-thien` chuyển **308** tới bài 09 mới. Alias ở manifest riêng của P46, được validator chặn target mất, chain, shadow hoặc path không hợp lệ; không thêm một registry alias toàn khóa học.
- README hướng dẫn cả Visual Studio và generator một cấu hình, target starter/checkpoint/final, controls và benchmark hữu hạn. Nêu rõ CTest mặc định include `final/include`; có cách tạo student-tests trỏ đúng `starter/include` đã hoàn thiện.

## ZIP và build C++ hiện tại

ZIP `project-46-falling-sand.zip` có **180 file**, gồm README, REFERENCES, CMake, starter, checkpoint 01–09, final và tests. Không đóng `source-template`, build tree hoặc SDL đã biên dịch vào gói học.

Package digest hiện tại:

```text
9996b68af2e07498e9ee0862b5eca822c8d3d9428cf066995b9cfc270e2f45a5
```

Đã giải nén độc lập và đối chiếu từng path/byte với source chuẩn. CMake mặc định FetchContent khóa SDL **3.4.8** và SHA-256, link `SDL3::SDL3`. Lượt kiểm local dùng option chuẩn `COURSE_USE_INSTALLED_SDL3=ON` để tái sử dụng package SDL 3.4.8 EXACT đã có; không tải/build lại thư viện.

Windows/VS2022 x64, MSVC 19.33: starter, chín checkpoint, final và tests (**12 target mỗi cấu hình**) build Debug/Release, không có compiler warning. CTest current: Debug 1/1 khoảng 0,89 giây; Release 1/1 khoảng 0,15 giây.

Lượt đầu build toàn bộ từ ZIP digest `774fdbca925b89bc0b80d7e1bef95a8a25b77fd770bd5fba1191440efd9a677e`. Sau đó phát hiện đổi cảnh native chưa xóa số đo update của cảnh cũ. Đã đặt `updateMs=0`, đồng bộ code block Bài 8 và thêm regression test. Chỉ bốn file đóng gói đổi: header workshop của checkpoint 08, 09 và final, cùng tests. Đã kiểm lại toàn bộ ZIP và build đủ target Debug/Release, giữ cache các file không đổi; không lặp full compile vô ích.

Evidence: `.validation/p46-package-native-evidence.json`, `.validation/p46-package-native-current-evidence.json`, `.validation/p46-native-refresh.log`. Build từ ZIP tại `.validation/p46-package-vbWorA/build`.

Target student-tests trong hướng dẫn cũng đã được kiểm trên fixture starter hoàn thiện: Debug/Release đều qua. Chỉ sửa clock trong `starter/include/timing.hpp` của fixture từ 30 thành 31 tick/giây khiến CTest Release thất bại đúng phép kiểm clock; khôi phục thì pass. Không sửa starter thật hoặc final để làm thí nghiệm. Evidence `.validation/p46-student-target-evidence.json` chứng minh target đọc bài làm, không vô tình kiểm đáp án final.

## Luật, invariants và parity

Fixture một bước kiểm cát rơi, đáy đóng, nước đi ngang, swap cát/nước và cột cát dùng lại vacancy. Oracle nhỏ gắn ID đi cùng hạt, dùng tập ID đã đi; không gọi production `tryMove` và không dùng cùng moved mask. So từng ô ở từng tick trong 50 tick, đủ bốn order.

| Order của fixture 8×8   | Checksum sau 50 tick |
| ----------------------- | -------------------- |
| Alternating bottom-up   | 3694149450           |
| Left-to-right bottom-up | 380760090            |
| Right-to-left bottom-up | 1912800860           |
| Alternating top-down    | 3694149450           |

Hai order bằng nhau trong fixture này không chứng minh chúng tương đương nói chung. Các ca hai hạt tranh ô trống và top-down/bottom-up có đáp án khác nhau kiểm ảnh hưởng thứ tự riêng.

Mixture 512×320/seed 46/order 0 sau 120 tick có checksum **524100528**. Mỗi tick xét đủ 163.840 ô; từng loại vật liệu và vị trí tường được kiểm khi không paint/erase/reset. Các giá trị này được assert trong cả tests C++ và TypeScript; tests mô hình không thay bằng chứng Canvas đã render hoặc nhận input.

16 tests TypeScript của P46 và hai tests alias đã đạt sau tích hợp. Các ca còn kiểm bounds/dimensions trước cấp phát, RGBA/pitch/padding canary, brush/stroke, viewport, reset/clear/seed/order, clock/speed/stall/NaN và dispose/mount. React chỉ nhận summary nhỏ, không clone cả grid mỗi frame.

## Quy mô, hình ảnh và benchmark

Current SDL runtime: `SDL-release-3.4.8-0-gd9d553670`, renderer `direct3d11`. Lượt hidden năm giây vẽ đủ 163.840 ô, tiến 149 tick, last visited 163.840, dropped model seconds 0; có 9.472 ô cát, 14.976 nước, 2.649 tường. Số tick ở ranh giới thời lượng hữu hạn có thể lệch một tick; không dùng nó thay ca clock thuần.

Capture current `.validation/p46-package-vbWorA/final-current.bmp`; capture trước `.validation/p46-package-vbWorA/final-debug.bmp` đã được mở và quan sát: nhìn thấy cát tạo đống/tràn bệ, nước chảy xuống bể, palette và panel rõ. Đây không phải kiểm thao tác chuột/phím.

Lượt benchmark chốt từ đúng ZIP hiện tại: Release, Mixture/seed 46/order 0, warm-up 32, bảy repeat cùng input, 120 tick/repeat, **840 mẫu**, 137.625.600 visits và 28.080.115 swaps. Median **0,55835 ms**, p95 **0,784 ms**; runner tính lại từ raw samples. Máy 12 logical cores, `AMD64 Family 25 Model 80 Stepping 0, AuthenticAMD`, MSVC 1933. Lượt trước ở ZIP đầu là 0,5593/0,7896 ms, không thay dữ liệu thô của lượt mới.

Số đo chỉ gồm update; loại allocation/copy/reset, kiểm đếm, RGBA/upload/render/present. Grid+mask 327.680 byte không phải tổng RAM/VRAM. Không gọi CPU submission là GPU time hoặc suy FPS/speedup cho máy khác. CLI có giới hạn thời lượng, số bước/repeat, tối đa 500 triệu visits và deadline benchmark 30 giây. Từng job qua supervisor, một heavy job, hard timeout và dọn process tree.

## Website và giới hạn của bằng chứng

Production build chốt **exact-current đã thành công**, sau sửa reset-timing, đồng bộ code block Bài 8 và bỏ acceptance note. Log `.validation/p46-production-build.log`; bằng chứng tổng `.validation/p46-release-final.json` giữ fingerprint của source/metadata trong suốt lượt kiểm. Suite P46 **5/5** gồm metadata, chín MDX/35 excerpt, snapshot gates, nội dung khoa học và render cả chín route/complete source/308 redirect. Mô hình và alias chốt lại **18/18**; TypeScript, lint, architecture và Git hygiene current đều qua.

Tự probe localhost đã phân biệt đúng EACCES với server tắt. Probe có quyền phù hợp từng nhận HTTP 200 tại hostname localhost; lần chuẩn bị Playwright sau đó bị **ECONNREFUSED ở cả ::1 và 127.0.0.1**. Không khởi động/restart server. Suite desktop đã được viết cho chín mode, input pointer/keyboard, DPR, reset/seed/order/speed, reduced motion, URL/progress/theme, nhưng chưa chạy được trên server hiện tại.

Công cụ Computer Use hết thời gian chờ cấp quyền cho cửa sổ C++ trước khi kiểm input. Hai lượt viewer có thời hạn đã tự thoát; agent không xem việc mở được executable là đã kiểm các phím. Sau đó người dùng đã xác nhận trực tiếp project đạt yêu cầu; không lặp câu hỏi xin kiểm native nữa.

Các phạm vi phải phân biệt:

1. Kiểm desktop của người dùng là căn cứ nghiệm thu thủ công; không suy rằng agent đã click từng checkbox hoặc suite Playwright đã chạy. Các ca browser vẫn giữ để hồi quy khi có server/CI phù hợp.
2. Các suite mô hình Canvas toàn repository đã qua **973/973** trong khoảng 43,5 giây. Bảy suite tooling/source/progress liên quan qua **62/62** trong khoảng 29,3 giây; đây không phải tuyên bố chạy mọi suite `test:tooling` hoặc mọi browser test.
3. TypeScript, ESLint phần thay đổi, format toàn repository, registry/checkpoint checks, architecture và Git hygiene đã qua. Chỉ định dạng cơ học bảng Markdown ở hồ sơ P45 để khớp Prettier, không sửa nội dung/hành vi hoặc giáo trình P45.
4. Runner chốt đã hoàn thành thành công, fingerprint đầu/cuối giống nhau và ZIP vẫn khớp digest đã kiểm native. Không stage/commit/push phần hoàn thiện này nếu chưa có yêu cầu mới.
