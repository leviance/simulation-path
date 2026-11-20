# Project 53 — Scalar / Slice Workbench

Nguồn chuẩn: [Product Specification v4, Project 53](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không thay đặc tả để hợp thức hóa hiện trạng.

## Phạm vi và bản cũ

Theo yêu cầu mới, toàn bộ 54 file nguồn/bài học/metadata/Canvas/tests của bản trước đã được gỡ trước khi viết lại. Bản dự phòng của 55 file authored (gồm hồ sơ nghiệm thu cũ) nằm tại `.validation/p53-retired-20261117-full-rebuild/`; cũng có thể khôi phục từ Git. Kết quả nghiệm thu trước không áp dụng cho lần xây dựng này.

Bản mới là **Scalar / Slice Workbench**: một mẫu tổng hợp có vỏ, các lõi đặc và lỗ khoan; khối cắt mở 3D, ba ảnh XY/XZ/YZ và một probe chung. Mọi phép đo đọc scalar gốc, không đọc mesh hay màu ảnh.

- Bản cuối: 128³ = 2.097.152 Float32 / 8 MiB; có lựa chọn 64³.
- World box 160 × 192 × 224 mm, origin (-80,-96,-112), voxel centre sampling; không phải HU hoặc CT reconstruction.
- Tự viết storage, nearest/trilinear và slice renderer. Vỏ định hướng là scaffold CPU, iso 0.12/stride 2, không phải ray marching của Project 54.
- Chín bài theo thay đổi sử dụng được, không cố định sáu/bảy bài. Revision tăng lên 3 để không coi tiến độ cũ là đã học xong bài mới.
- Không stage, commit, push hoặc publish. Output và bản dự phòng nằm ngoài Git.

## Giáo trình và phân phối source

Chín bài đi từ cửa sổ và ảnh sphere đầu tiên tới storage 3D, ba hướng cắt, trilinear, display mapping, ngữ cảnh 3D, input liên kết, quét/cache và kiểm chứng. Mỗi bài có checkpoint chạy độc lập; bài cuối có source hoàn chỉnh của toàn ứng dụng.

- 38 đoạn C++ trong bài khớp chính xác snippet markers của đúng checkpoint. Không lấy thuật toán tương lai để giải thích một mốc trước đó.
- Challenge nêu sản phẩm và yêu cầu trước khi học; code có chú thích, thụt bốn dấu cách, không dùng `?:` để viết tắt.
- Bảy URL lesson cũ chuyển tới bài tương ứng; content revision 3 không coi tiến độ cũ là đã hoàn thành giáo trình mới.
- ZIP có README, CMake, starter, chín checkpoint, final và tests: **201 file / 248.743 byte**. Không chứa source-template của repository, binary, build output hoặc thư viện.
- Package digest: `8503374eeeb6b78d7aca2f7e92fdd3f5cb028de60162b35a6bf5e7284fda05e1`. Mọi member đã được so sánh từng byte với source hiện tại.

## Bằng chứng kiểm tra

Các bằng chứng dưới đây thuộc bản dựng lại, không kế thừa nghiệm thu của bản cũ.

| Hạng mục                        | Kết quả và giới hạn                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows C++                     | VS2022, SDL3 3.4.8: build starter, chín checkpoint, final và tests ở Debug/Release; CMake `--parallel 1`                                                            |
| CTest                           | Debug và Release qua; 340.581 checks/configuration, không phụ thuộc `assert` hoặc `NDEBUG`                                                                          |
| Fixture có đáp số biết trước    | x+10y+100z: indexing độc lập, tâm mẫu, half-cell 50.5, nearest tie 101, tám góc vật lý, cạnh, mặt và outside policy                                                 |
| Các invariant khác              | Đối xứng sphere/slice ở 64³ và 128³, histogram đủ N³, scalar không đổi khi đổi màu, camera round-trip, physical aspect và clipping                                  |
| Runtime C++                     | Audit 13 checks/0 failures; actual allocation 2.097.152 mẫu/8.388.608 byte; 22 app Debug/Release đều chạy ba frame hữu hạn                                          |
| Điều khiển SDL                  | 26 checks qua hàng đợi SDL và window/renderer thật: probe, camera, pick/letterbox, slider, sampler, display, cache, scan/blur, preset/reset và missed mouse release |
| ZIP sau giải nén                | Configure/build final/tests, CTest Debug/Release và chạy final thành công ngoài source tree của repository                                                          |
| Toán TypeScript và nội dung     | 15/15 ca: dữ liệu thật, oracle độc lập, orientation, display, mesh, hủy async job, snippet và checkpoint staging                                                    |
| Production/routes/browser       | Production build qua; 7/7 ca route/content và 7/7 ca Chrome qua, gồm màu nhãn light/dark, camera/pick, hủy job, scan/blur, DPR/resize, theme/progress và ZIP HTTP   |
| Tiến độ học                     | 5/5 ca migration qua; revision mới không xóa tiến độ của project khác                                                                                               |
| Kiểm bàn phím/chuột qua Windows | Chưa xác nhận bằng thao tác OS trực tiếp; công cụ Computer Use lỗi khởi tạo kernel và vẫn lỗi sau một lần reset. Không gọi các kiểm SDL ở trên là kiểm OS input     |

### Lỗi hồi quy đã sửa

Nếu một sự kiện thả chuột bị mất, drag có thể còn giữ. Ca kiểm đã tái hiện lỗi trước khi sửa; `SDL_EVENT_MOUSE_MOTION` nay hủy drag khi left-button mask không còn. Blur, reset, đổi dataset và kết thúc thao tác đều có đường nhả capture. Bài input giải thích guard này bằng source thật.

Ảnh Canvas còn giúp phát hiện `.prose strong` của bài viết ghi đè màu nhãn trong lab tối. Màu scene/XY/XZ/YZ nay được đặt rõ trong CSS module; kiểm browser đối chiếu computed color ở cả giao diện sáng và tối. Ảnh web chỉ ẩn sticky navigation trong lúc chụp để không che một lab cao hơn viewport; không thay CSS của sản phẩm để lấy ảnh đẹp hơn.

## Ảnh và cách tự kiểm tra

- Ảnh renderer C++ thật: `.validation/p53-final-specimen.png` (không phải ảnh AI hoặc Canvas thay thế).
- Ảnh Canvas thật đã kiểm trực quan: `.validation/p53-workbench-web.png`; nhãn sáng rõ, không có lỗi script trong bảy ca browser.
- Executable: `.validation/p53-rebuild-build/Release/project_53_final.exe`, SDL3.dll nằm cạnh file.
- Checklist chuột/phím và lệnh build: [README của project](../../examples/project-53-volume-slicer/README.md).
- Canvas chỉ là công cụ học bổ trợ, không thay ứng dụng C++. Vỏ tham chiếu là scaffold, không mở rộng phạm vi sang ray marching hoặc DICOM.

Mỗi lượt nặng dùng supervisor/guardian và hard deadline; CMake `--parallel 1`. Không chạy suite dài không có khả năng hủy độc lập.

TypeScript toàn repository và lint P53 đã qua trong đợt xây dựng này. Lượt lint scope lớn lặp lại sau kiểm browser chạm deadline 45 giây và bị watchdog dừng, không được tính là PASS; kiểm riêng hai tệp TypeScript mới sửa sau lượt lint trước đã qua. Kiểm kiến trúc và Git hygiene cuối cùng đều qua. Production build có cảnh báo thống kê thời gian plugin của Vinext, không phải lỗi build; không tuyên bố toàn site đã qua mọi suite ngoài phạm vi P53.
