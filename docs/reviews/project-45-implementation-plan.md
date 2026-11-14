# Project 45 — kế hoạch triển khai Atomic Playground

## Phạm vi và nguồn chuẩn

Nguồn chuẩn là mục Project 45 và các yêu cầu chung trong `docs/specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md`. Sản phẩm chính là ứng dụng C++20/SDL 3.4.8/OpenGL 4.3 với ít nhất 1.000.000 vị trí mẫu hợp lệ sinh trên GPU. Canvas chỉ giúp quan sát từng ý tưởng ở quy mô nhỏ; không dùng kết quả Canvas để công nhận mốc GPU.

Mỗi điểm biểu diễn một vị trí lấy mẫu trong mô hình hydrogen một electron, không phải một electron riêng lẻ. Cung cấp sẵn field đã chuẩn hóa cho 1s, 2s, bộ 2p thực và các dạng 3d/4f đại diện. Người học tự xây phần đo theo thể tích, bảng PDF/CDF, RNG, sampler, job GPU, cách vẽ, tương tác và kiểm chứng. Không mở rộng thành bài giải phương trình Schrödinger hoặc hệ nguyên tử nhiều electron.

Các công thức đầu vào được đối chiếu với [OpenStax — The Hydrogen Atom](https://openstax.org/books/university-physics-volume-3/pages/8-1-the-hydrogen-atom) và [DLMF — Spherical Harmonics](https://dlmf.nist.gov/14.30). Video/repository Atoms chỉ gợi ý trải nghiệm; chưa xác lập giấy phép nên không sao chép code hoặc assets từ đó.

## Chuỗi 11 bài và bằng chứng cần có

| Bài | Sản phẩm thêm vào                          | Phân biệt cần dạy rõ                                   | Bằng chứng                                         |
| --- | ------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------- |
| 01  | Field lattice nhìn được ngay, catalog thực | Lưới đọc field chưa phải mẫu xác suất                  | 2s có nút r=2; 2pz có mặt nút z=0                  |
| 02  | Bảng bán kính và góc                       | Trọng số thể tích khác chọn đều tọa độ                 | Khối lượng, đầu mút CDF, tail và độ phân giải      |
| 03  | CPU reference nhỏ, seed ổn định            | Xấp xỉ bảng khác công thức liên tục                    | CDF guard, nhiều seed, histogram độc lập           |
| 04  | Compute shader ghi SSBO                    | GPU sinh vị trí khác CPU upload                        | Layout 32 byte, ID guard, readback nhỏ             |
| 05  | Một triệu mẫu theo batch                   | Capacity khác accepted; requested khác cloud đang thấy | Counters, cancel, last-good, budget đỉnh           |
| 06  | Splat HDR, tone mapping, chú giải          | Độ sáng không phải xác suất tuyến tính                 | Giữ nguyên mẫu khi đổi cách hiển thị               |
| 07  | Camera, pan, zoom xuyên cloud, clip        | Đổi cách nhìn không đổi dữ liệu                        | ID/seed/N và mẫu số không đổi                      |
| 08  | Vùng đo, histogram, uncertainty            | Sai số lấy mẫu khác sai lệch bảng/tail                 | k/N, Wilson, oracle độc lập, vùng dời tâm          |
| 09  | Hai pane cùng thang                        | Auto-fit khác so kích thước                            | N và budget mỗi pane, thang a₀ chung               |
| 10  | Save/load cấu hình nhỏ và reset            | Tái lập điều kiện khác lưu toàn cloud                  | Validate trước áp dụng, lỗi file giữ last-good     |
| 11  | Sản phẩm hoàn chỉnh và phép đo hữu hạn     | Build thành công chưa đủ nghiệm thu                    | CPU/GPU/reference/controls/ZIP và báo cáo giới hạn |

Các bài mở bằng một trạng thái đã chạy được, câu hỏi quan sát và thí nghiệm nhỏ rồi mới sửa code. Mỗi bài cần chỉ đúng file, vị trí gọi và ý nghĩa của thay đổi; không để người học tự nối những hàm rời. Đoạn trích lấy từ source thật, có tên file, thụt bốn dấu cách và được hiển thị bằng One Dark. Các checkpoint chạy độc lập và checkpoint cuối chứa đủ sản phẩm.

## Mô hình lấy mẫu và giới hạn phải công khai

Đơn vị a₀=1. Với μ=cosθ, trọng số là `r²R²dr` và `Y²dμdφ`. CDF midpoint trên miền `r≤Rmax` được chuẩn hóa trong miền đó, lưu bằng float và nội suy ngẫu nhiên theo từng ô. Phải báo độ phân giải bảng, phần đuôi vật lý và sai lệch bảng/rounding; không viết rằng đây là phép lấy mẫu liên tục chính xác. RNG nhận seed, ID và chiều để chia batch không đổi bộ mẫu.

Sai cố ý `uniformRadius` và `uniformAngle` là sandbox hữu hạn, không phải orbital mới. Hai test field `uniform-volume` và `affine-mu` phục vụ oracle độc lập, không nằm trong catalog orbital vật lý của UI. Mặt cắt chỉ ẩn điểm; không chuẩn hóa phần còn thấy thành tổng xác suất một. Phép đo vùng dùng mẫu số toàn cloud accepted, không dùng số điểm visible.

## An toàn tích hợp và dữ liệu cũ

Ba metadata cũ được giữ nguyên byte trong `.validation/retired-project-45-atomic`. Metadata mới được soạn trong `examples/drafts/atomic-playground/course` cho đến lúc source, bài học, Canvas và catalog có thể chuyển cùng nhau. Không xóa lesson/source cũ trong công việc biên tập này. File sinh không đưa vào Git.

Mỗi candidate kiểm byte budget trước khi sinh và chỉ publish sau khi đủ mẫu hợp lệ. Cloud cũ phải giữ cả dữ liệu lẫn nhãn khi candidate bị cancel/lỗi. Tính budget cả active + candidate + comparison + tables + HDR, không chỉ kết quả cuối. Job có batch hữu hạn, poll fence không chờ vô hạn; benchmark là một lần đo hữu hạn, không chạy trong vòng lặp tương tác.

## Trạng thái bằng chứng

Giới hạn của pipeline test hiện tại: target `project_45_tests` mặc định include `final/include`, nên CTest kiểm đáp án đóng gói chứ không kiểm bài làm trong starter. Lesson 11 phải nói rõ khác biệt và hướng dẫn target riêng trỏ `starter/include` sau khi người học đã điền đủ API. Không dùng kết quả test final để công nhận thay đổi của người học. Chưa thay cơ chế CMake chung của toàn khóa học trong phạm vi biên tập này.

Tài liệu này là kế hoạch và nhật ký yêu cầu, không phải biên bản nghiệm thu. Trong nhánh biên tập bài học chưa chạy build, CTest, benchmark hay kiểm giao diện. Root sẽ bổ sung kết quả thực tế: Debug/Release, CPU tests độc lập, GPU thật ở N=1.000.000 và N lẻ, peak bytes, time riêng table/sample/render/probe, controls native/web, ZIP/source parity và kiểm toàn site. Không được gỡ acceptance note hoặc ghi “đã đạt” chỉ vì nội dung đã có đủ mục.
