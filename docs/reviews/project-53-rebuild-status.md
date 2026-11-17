# Project 53 — khối vật liệu cắt mở

Đối chiếu [Product Specification v4, Project 53](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không thay đổi hoặc hạ yêu cầu của đặc tả. Ngày rà soát: 17/11/2026.

## Phương án đã chốt

Người dùng đã chấp thuận bản tương tác **Khối vật liệu cắt mở**. Hai hướng trước đó — ba ảnh phẳng kèm hộp định hướng nhỏ và ba mặt phẳng trong phối cảnh — đã bị loại, không phải bản bàn giao.

Bản C++ và Canvas hiện cùng có khối bo góc, lõi xoắn và ống rỗng; chuyển nguyên khối/cắt mở một góc, orbit/zoom và ba ảnh XY/XZ/YZ liên kết. Camera độc lập với điểm đo. Bản cuối mặc định 128³ = 2.097.152 scalar double/16 MiB; 64³ là lựa chọn so sánh, không phải giảm ngầm sản phẩm cuối.

Ba ảnh 256² đọc mảng scalar đầy đủ. Vỏ xám là mesh tham chiếu isovalue 0.18/stride 3; zero padding chỉ thuộc bộ dựng mesh, không sửa volume. Các mặt cắt dùng lại raw scalar/RGBA của đúng ba ảnh. Không có ray marching, MIP, tích phân alpha hoặc tái tạo CT/HU.

## Giáo trình và source

- Bảy bài đi từ shell SDL và ảnh đầu tiên đến storage, ba hướng cắt, display mapping, trilinear, input rồi kiểm chứng.
- 26 đoạn C++ lấy theo marker của đúng checkpoint; mỗi bài có vấn đề, ý tưởng, các bước viết code, ghép chương trình, thử lỗi, tự kiểm và bài tập.
- Phân biệt phần người học tự viết (storage, sampler, slice renderer) với scaffold cung cấp cho vỏ phối cảnh. Có hướng dẫn nối scene texture/cache vào main, không để một lời gọi vẽ không rõ nguồn gốc.
- Trang tổng quan có thử thách trước lời giải. Cuối bài có source chạy được; bài cuối có toàn bộ file và ZIP độc lập CMake/SDL, không cần Node.js.
- C++ thụt bốn space, có comment và giữ biểu thức theo dòng tự nhiên; code block dùng One Dark.
- Bộ vẽ định hướng cũ không còn được dùng. Bản dự phòng orientation.hpp nằm trong .validation/p53-retired-layout; không đưa vào Git.

## Các lỗi đã khắc phục

1. Audit kiểm grid và số phần tử thực tế trước khi kết luận; empty/truncated/oversized storage không thể PASS chỉ nhờ fixture affine riêng.
2. Color mapping kiểm kích thước scalar buffer và giá trị hữu hạn trước khi ghi RGBA/chuyển số nguyên.
3. Đổi dataset C++ chuẩn bị volume/mesh/histogram mới rồi mới thay state; lỗi allocation/budget giữ dữ liệu trước và hiện thông báo.
4. Cache tách fill/histogram/mesh, scalar slice, RGBA và ảnh phối cảnh. Không fill hàng triệu voxel mỗi frame; Canvas chỉ cấp phát volume sau hydration.
5. Camera, probe và slider có loại drag riêng; blur/reset/reduced-motion hủy quét/capture. Quét hữu hạn theo thời gian, tới lát cuối thì dừng.
6. Wheel cập nhật camera bằng state updater thay vì ghi ref trong render. Dependencies của từng ảnh chỉ giữ tọa độ cắt tương ứng, không resample cả ba ảnh khi chỉ dời crosshair.

## Bằng chứng kiểm chứng

| Phạm vi | Kết quả | Bằng chứng local |
| --- | --- | --- |
| Toán, biên, storage, display, camera, clipping, mesh | 17 ca TypeScript qua; fixture biết trước, affine, đối xứng và allocation 64³/128³ | .validation/p53-source-evidence.json |
| Bài học/source | 26 marker khớp, 22 ca toán/tooling/snippet qua; toàn khóa source contract, TypeScript, architecture và Git hygiene qua | .validation/p53-source-evidence.json |
| Lint | ESLint nhóm Canvas/math/tests Project 53 không lỗi hoặc warning sau khi sửa ref/dependencies của React | Lệnh ESLint có deadline trong log chat |
| ZIP thật | 174 file bằng byte với source, digest 769552ba20e951bd7cf5fe0695925a7a8c58dae1f654b1a470f5ee0e5e1d9987 | .validation/p53-native-final-evidence.json |
| Windows/VS2022/SDL 3.4.8 | Starter + 7 checkpoint + final build Debug/Release không warning C++; CTest cả hai qua; chạy hữu hạn mọi target | .validation/p53-native-final-evidence.json |
| Vòng lặp SDL | --self-test: 45 kiểm, 0 lỗi ở cả Debug/Release, tự kết thúc sau 17 frame | .validation/p53-native-final-evidence.json |
| Cửa sổ C++ qua Computer Use | Quan sát ảnh thật; drag orbit không dời world point, slider XY đổi z, pick XY giữ z/đồng bộ ba view, phím Q/R và Esc hoạt động | Quan sát trực tiếp binary của ZIP; tiến trình thoát 0 |
| Canvas cô lập | React StrictMode, DPR 1/2, preset, pointer capture/release, camera/probe độc lập, audit, reduced-motion/blur và dispose qua | .validation/p53-canvas-evidence.json |
| Production | Build đủ năm môi trường; overview + 7 lesson render 200; 16 ca route/section/roadmap qua | .validation/p53-production-evidence.json, log lượt build trong chat |
| Web localhost | Hai ca Playwright về trilinear/gating/scalar/slider/scan/reset qua | .validation/p53-browser-live-evidence.json |
| Bàn giao web | Source final tải đúng file, clipboard giữ nội dung/thụt dòng (chuẩn hóa CRLF của Windows khi so), ZIP tải qua nút khớp byte, light/dark và 390px không tràn trang | .validation/p53-delivery-evidence.json |

Lần thử kết nối web đầu chọn IPv4 trong khi dev server có sẵn ở localhost; đã đổi cách kiểm kết nối và dùng lại đúng server ấy. Bản kiểm cuối không tắt tiến trình của người dùng. Sau chỉnh sửa React, build production được chạy lại từ nguồn cuối; mã C++ và ZIP không đổi.

CTest và sự kiện SDL tổng hợp không xác nhận driver/OS keyboard hay toàn bộ mouse capture trên mọi hệ thống. Các thao tác native được quan sát trực tiếp chỉ là nhóm ghi ở bảng; Ctrl+mũi tên được kiểm bằng SDL queue, chưa được xác nhận riêng qua công cụ phím Windows. Linux/macOS chưa nghiệm thu native. Không tuyên bố toàn bộ site đã qua mọi test chỉ từ các ca có phạm vi trên.

## Giới hạn vận hành và Git

Mỗi lượt nặng chạy riêng, CMake --parallel 1, có deadline và process-tree guardian. Binary smoke/self-test có điểm dừng; cửa sổ kiểm tay đã đóng bằng Esc. Dev server có sẵn được giữ nguyên.

Theo chỉ dẫn mới, có thể tự bật dev server hoặc chạy binary để kiểm thử; không cần hỏi lại cho các thao tác ấy. **Không stage, commit, push hoặc xuất bản** trong đợt này. ZIP, snapshot, source JSON, binary, build và bằng chứng .validation tiếp tục nằm ngoài Git. HEAD vẫn là 5fff6b5aac769a013345b9beadddb18a39b09899.
